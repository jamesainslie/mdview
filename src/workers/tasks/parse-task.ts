/**
 * Parse Task
 * Handles markdown parsing in worker context
 */

import MarkdownIt from 'markdown-it';
import markdownItAttrs from 'markdown-it-attrs';
import markdownItAnchor from 'markdown-it-anchor';
import markdownItTaskLists from 'markdown-it-task-lists';
import * as emojiPlugin from 'markdown-it-emoji';
import type {
  ParseTaskPayload,
  ParseTaskResult,
  HeadingInfo,
  CodeBlockInfo,
  MermaidBlockInfo,
  ImageInfo,
  LinkInfo,
} from '../../types';

/**
 * Handle markdown parsing task
 */
export function handleParseTask(payload: unknown): ParseTaskResult {
  const { markdown, options } = payload as ParseTaskPayload;

  // Metadata collection
  const metadata = {
    wordCount: 0,
    headings: [] as HeadingInfo[],
    codeBlocks: [] as CodeBlockInfo[],
    mermaidBlocks: [] as MermaidBlockInfo[],
    images: [] as ImageInfo[],
    links: [] as LinkInfo[],
  };

  // Initialize markdown-it
  const md = new MarkdownIt({
    html: false,
    breaks: options?.breaks ?? true,
    linkify: options?.linkify ?? true,
    typographer: options?.typographer ?? true,
  });

  // Configure plugins
  md.use(markdownItAttrs, {
    leftDelimiter: '{',
    rightDelimiter: '}',
    allowedAttributes: ['id', 'class', 'style'],
  });

  md.use(markdownItAnchor, {
    permalink: markdownItAnchor.permalink.headerLink({
      safariReaderFix: true,
    }),
    slugify: (s: string) =>
      s
        .toLowerCase()
        .trim()
        .replace(/[\s\W-]+/g, '-')
        .replace(/^-+|-+$/g, ''),
  });

  md.use(markdownItTaskLists, {
    enabled: true,
    label: true,
    labelAfter: true,
  });

  const emojiPluginToUse = (emojiPlugin as { full?: typeof emojiPlugin }).full || emojiPlugin;
  md.use(emojiPluginToUse);

  // Add custom fence renderer for code blocks and mermaid
  const defaultFenceRenderer =
    md.renderer.rules.fence ||
    function (tokens, idx, opts, _env, self) {
      return self.renderToken(tokens, idx, opts);
    };

  md.renderer.rules.fence = (tokens, idx, opts, env, self) => {
    const token = tokens[idx];
    const info = token.info ? token.info.trim() : '';
    const langName = info.split(/\s+/g)[0];

    // Handle Mermaid diagrams
    if (langName === 'mermaid' || langName === 'mmd') {
      const code = token.content.trim();
      const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;

      metadata.mermaidBlocks.push({
        code,
        line: token.map ? token.map[0] : 0,
      });

      // Return container with data attribute for code
      return `<div class="mermaid-container" id="${id}" data-mermaid-code="${escapeHtml(code)}">
        <div class="mermaid-loading">Rendering diagram...</div>
      </div>\n`;
    }

    // Handle regular code blocks
    if (langName) {
      metadata.codeBlocks.push({
        language: langName,
        code: token.content,
        line: token.map ? token.map[0] : 0,
        lines: token.content.split('\n').length,
      });
    }

    return defaultFenceRenderer(tokens, idx, opts, env, self);
  };

  // Add heading renderer for metadata
  const defaultHeadingOpenRenderer =
    md.renderer.rules.heading_open ||
    function (tokens, idx, opts, _env, self) {
      return self.renderToken(tokens, idx, opts);
    };

  md.renderer.rules.heading_open = (tokens, idx, opts, env, self) => {
    const token = tokens[idx];
    const level = parseInt(token.tag.substr(1));
    const nextToken = tokens[idx + 1];
    const text = nextToken && nextToken.type === 'inline' ? nextToken.content : '';

    const id = text
      .toLowerCase()
      .trim()
      .replace(/[\s\W-]+/g, '-')
      .replace(/^-+|-+$/g, '');

    metadata.headings.push({
      level,
      text,
      id,
      line: token.map ? token.map[0] : 0,
    });

    return defaultHeadingOpenRenderer(tokens, idx, opts, env, self);
  };

  // Add image renderer for metadata
  const defaultImageRenderer =
    md.renderer.rules.image ||
    function (tokens, idx, opts, _env, self) {
      return self.renderToken(tokens, idx, opts);
    };

  md.renderer.rules.image = (tokens, idx, opts, env, self) => {
    const token = tokens[idx];
    const srcIndex = token.attrIndex('src');
    const attrs = token.attrs || [];
    const src = srcIndex >= 0 ? attrs[srcIndex][1] : '';
    const alt = token.content;
    const titleIndex = token.attrIndex('title');
    const title = titleIndex >= 0 ? attrs[titleIndex][1] : undefined;

    metadata.images.push({
      src,
      alt,
      title,
      line: token.map ? token.map[0] : 0,
    });

    return defaultImageRenderer(tokens, idx, opts, env, self);
  };

  // Add link renderer for metadata
  const defaultLinkOpenRenderer =
    md.renderer.rules.link_open ||
    function (tokens, idx, opts, _env, self) {
      return self.renderToken(tokens, idx, opts);
    };

  md.renderer.rules.link_open = (tokens, idx, opts, env, self) => {
    const token = tokens[idx];
    const hrefIndex = token.attrIndex('href');
    const attrs = token.attrs || [];
    const href = hrefIndex >= 0 ? attrs[hrefIndex][1] : '';
    const nextToken = tokens[idx + 1];
    const text = nextToken && nextToken.type === 'inline' ? nextToken.content : '';

    metadata.links.push({
      href,
      text,
      line: token.map ? token.map[0] : 0,
    });

    return defaultLinkOpenRenderer(tokens, idx, opts, env, self);
  };

  // Calculate word count
  metadata.wordCount = markdown.trim().split(/\s+/).length;

  // Parse markdown
  const html = md.render(markdown);

  return {
    html,
    metadata,
  };
}

/**
 * Escape HTML for safe attribute values
 */
function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}
