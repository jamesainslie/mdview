#!/usr/bin/env tsx
/**
 * MDView CLI: Markdown → Mermaid (via mermaid-cli) → PNG → DOCX
 *
 * This helper:
 * - Parses a markdown file with markdown-it
 * - Extracts all ```mermaid code-fence blocks
 * - Replaces them with <div class="mermaid-container" id="..."></div> placeholders
 *   so that ContentCollector produces ContentNodes of type "mermaid"
 * - Uses @mermaid-js/mermaid-cli in Node to render each Mermaid block to a PNG
 * - Feeds the resulting images into DOCXGenerator, which already knows how to
 *   embed PNGs into the final DOCX document.
 *
 * This pipeline is entirely Node-side and does not depend on any browser canvas
 * or svg2png-wasm behaviour.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import MarkdownIt from 'markdown-it';
import sharp from 'sharp';
import { JSDOM } from 'jsdom';
import { run as mermaidCliRun } from '@mermaid-js/mermaid-cli';
import { ContentCollector } from '../src/utils/content-collector';
import { DOCXGenerator } from '../src/utils/docx-generator';
import type { ConvertedImage } from '../src/types';

interface MermaidSnippet {
  id: string;
  code: string;
}

/**
 * Minimal HTML entity decoder for code blocks that have been HTML-escaped
 */
function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/**
 * Render all Mermaid snippets to PNGs using @mermaid-js/mermaid-cli.
 * Returns a map of ConvertedImage entries keyed by diagram ID.
 */
async function renderMermaidWithCli(snippets: MermaidSnippet[]): Promise<Map<string, ConvertedImage>> {
  const tmpRoot = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'mdview-mermaid-'));

  const images = new Map<string, ConvertedImage>();

  try {
    for (const snippet of snippets) {
      const inputPath = path.join(tmpRoot, `${snippet.id}.mmd`);
      const outputPath = path.join(tmpRoot, `${snippet.id}.png`);

      await fs.promises.writeFile(inputPath, snippet.code, 'utf-8');

      // Use mermaid-cli to render this single diagram
      // The CLI is responsible for spinning up headless Chromium and producing PNG output.
      await mermaidCliRun(inputPath, outputPath);

      const pngBuffer = await fs.promises.readFile(outputPath);

      const metadata = await sharp(pngBuffer).metadata();
      const width = metadata.width ?? 800;
      const height = metadata.height ?? 600;

      images.set(snippet.id, {
        id: snippet.id,
        data: pngBuffer.toString('base64'),
        width,
        height,
        format: 'png',
      });
    }
  } finally {
    // Best-effort cleanup; ignore errors
    try {
      await fs.promises.rm(tmpRoot, { recursive: true, force: true });
    } catch {
      // Ignore
    }
  }

  return images;
}

async function main(): Promise<void> {
  const markdownPath = process.argv[2];
  const outputPathArg = process.argv[3];

  if (!markdownPath) {
    console.error('Usage: export-docx-mermaid-cli <input.md> [output.docx]');
    process.exit(1);
  }

  if (!fs.existsSync(markdownPath)) {
    console.error(`Error: File not found: ${markdownPath}`);
    process.exit(1);
  }

  const resolvedInput = path.resolve(markdownPath);
  const defaultOutput =
    (path.extname(resolvedInput)
      ? resolvedInput.slice(0, -path.extname(resolvedInput).length)
      : resolvedInput) + '.docx';
  const outputPath = outputPathArg ? path.resolve(outputPathArg) : defaultOutput;

  console.log(`\nReading markdown from: ${resolvedInput}`);
  const markdown = await fs.promises.readFile(resolvedInput, 'utf-8');
  console.log(`  Read ${markdown.length} characters`);

  console.log('\nConverting markdown to HTML...');
  const md = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: true,
  });
  const rawHtml = md.render(markdown);
  console.log(`  Generated ${rawHtml.length} characters of HTML`);

  // Extract Mermaid code blocks and replace them with placeholder divs that
  // ContentCollector will recognise as "mermaid" nodes.
  const mermaidSnippets: MermaidSnippet[] = [];
  let diagramIndex = 0;

  const htmlWithPlaceholders = rawHtml.replace(
    /<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g,
    (_match, code) => {
      const id = `mermaid-diagram-${diagramIndex++}`;
      const decoded = decodeHtmlEntities(code);
      mermaidSnippets.push({ id, code: decoded.trim() });
      return `<div class="mermaid-container" id="${id}"></div>`;
    }
  );

  console.log(`\nFound ${mermaidSnippets.length} Mermaid diagram(s)`);

  console.log('\nBuilding DOM for content collection...');
  const dom = new JSDOM(htmlWithPlaceholders);
  const { document, Node, HTMLElement } = dom.window;

  // Provide minimal globals required by ContentCollector
  (globalThis as any).window = dom.window;
  (globalThis as any).document = document;
  (globalThis as any).Node = Node;
  (globalThis as any).HTMLElement = HTMLElement;

  const container = document.createElement('div');
  container.id = 'mdview-container';
  container.innerHTML = htmlWithPlaceholders;

  console.log('Collecting structured content...');
  const collector = new ContentCollector();
  const content = collector.collect(container);

  console.log(`  Title: "${content.title}"`);
  console.log(`  Nodes: ${content.nodes.length}`);
  console.log(`  Word count: ${content.metadata.wordCount}`);
  console.log(`  Mermaid diagrams (metadata): ${content.metadata.mermaidCount}`);

  console.log('\nRendering Mermaid diagrams with mermaid-cli...');
  const images = await renderMermaidWithCli(mermaidSnippets);
  console.log(`  Rendered ${images.size}/${mermaidSnippets.length} diagram(s) to PNG`);

  console.log('\nGenerating DOCX document...');
  const generator = new DOCXGenerator();
  const blob = await generator.generate(content, images, {
    title: content.title,
    author: 'MDView CLI Export',
  });

  console.log(`  Generated DOCX blob (${blob.size} bytes)`);

  console.log(`\nWriting DOCX to: ${outputPath}`);
  const arrayBuffer = await blob.arrayBuffer();
  await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.promises.writeFile(outputPath, Buffer.from(arrayBuffer));

  const stats = await fs.promises.stat(outputPath);
  console.log(`  Saved ${(stats.size / 1024).toFixed(2)} KB`);
  console.log('\nExport complete.');
}

main().catch((error) => {
  console.error('\nExport failed:');
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});


