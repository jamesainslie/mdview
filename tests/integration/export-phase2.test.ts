/**
 * Integration tests for Phase 2: DOCX Export
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { ExportController } from '../../src/core/export-controller';
import { ContentCollector } from '../../src/utils/content-collector';
import { SVGConverter } from '../../src/utils/svg-converter';
import type { ExportProgress } from '../../src/types';

describe('Phase 2 Integration: DOCX Export', () => {
  let controller: ExportController;

  beforeEach(() => {
    controller = new ExportController();

    // Mock URL methods
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = vi.fn();

    // Mock canvas API for SVG conversion tests
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
      fillStyle: '',
      fillRect: vi.fn(),
      drawImage: vi.fn(),
    })) as any;

    HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/png;base64,mockBase64Data');

    // Mock Image to immediately trigger onload
    const OriginalImage = global.Image;
    global.Image = class extends OriginalImage {
      constructor() {
        super();
        // Trigger onload asynchronously
        setTimeout(() => {
          if (this.onload) {
            this.onload(new Event('load'));
          }
        }, 0);
      }
    } as any;

    // Mock Image.decode to resolve immediately
    if (typeof Image !== 'undefined') {
      Image.prototype.decode = vi.fn().mockResolvedValue(undefined);
    }
  });

  // Helper to create test container
  function createTestContainer(html: string): HTMLElement {
    const container = document.createElement('div');
    container.id = 'mdview-container';
    container.innerHTML = html;
    return container;
  }

  test('should export simple markdown to DOCX', async () => {
    const container = createTestContainer(`
      <h1>Test Document</h1>
      <p>This is a <strong>bold</strong> paragraph.</p>
      <p>This is an <em>italic</em> paragraph.</p>
    `);

    const progressUpdates: ExportProgress[] = [];

    await controller.export(container, { format: 'docx' }, (progress) =>
      progressUpdates.push(progress)
    );

    // Verify progress was reported
    expect(progressUpdates.length).toBeGreaterThan(0);
    expect(progressUpdates[progressUpdates.length - 1].progress).toBe(100);

    // Verify all stages were completed
    const stages = progressUpdates.map((p) => p.stage);
    expect(stages).toContain('collecting');
    expect(stages).toContain('converting');
    expect(stages).toContain('generating');
    expect(stages).toContain('downloading');
  });

  test('should export document with mermaid diagrams', async () => {
    // Create a simple SVG
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('id', 'mermaid-1');
    svg.setAttribute('width', '200');
    svg.setAttribute('height', '100');
    svg.setAttribute('viewBox', '0 0 200 100');

    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('width', '200');
    rect.setAttribute('height', '100');
    rect.setAttribute('fill', 'blue');
    svg.appendChild(rect);

    const container = createTestContainer(`
      <h1>Document with Diagram</h1>
      <div class="mermaid-container" id="mermaid-1"></div>
    `);

    // Add the SVG to the mermaid container
    const mermaidContainer = container.querySelector('.mermaid-container');
    mermaidContainer?.appendChild(svg);

    const progressUpdates: ExportProgress[] = [];

    await controller.export(container, { format: 'docx' }, (progress) =>
      progressUpdates.push(progress)
    );

    expect(progressUpdates.length).toBeGreaterThan(0);
    expect(progressUpdates[progressUpdates.length - 1].progress).toBe(100);

    // Verify SVG conversion stage was completed
    const convertingUpdates = progressUpdates.filter((p) => p.stage === 'converting');
    expect(convertingUpdates.length).toBeGreaterThan(0);
  });

  test('should export document with code blocks', async () => {
    const container = createTestContainer(`
      <h1>Code Examples</h1>
      <p>Here is some code:</p>
      <pre><code class="language-javascript">function test() {
  return true;
}</code></pre>
      <p>And some Python:</p>
      <pre><code class="language-python">def hello():
    print("Hello, world!")</code></pre>
    `);

    const progressUpdates: ExportProgress[] = [];

    await controller.export(container, { format: 'docx' }, (progress) =>
      progressUpdates.push(progress)
    );

    expect(progressUpdates.length).toBeGreaterThan(0);
    expect(progressUpdates[progressUpdates.length - 1].progress).toBe(100);
  });

  test('should export document with tables', async () => {
    const container = createTestContainer(`
      <h1>Table Example</h1>
      <table>
        <thead>
          <tr>
            <th>Header 1</th>
            <th>Header 2</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Data 1</td>
            <td>Data 2</td>
          </tr>
          <tr>
            <td>Data 3</td>
            <td>Data 4</td>
          </tr>
        </tbody>
      </table>
    `);

    const progressUpdates: ExportProgress[] = [];

    await controller.export(container, { format: 'docx' }, (progress) =>
      progressUpdates.push(progress)
    );

    expect(progressUpdates.length).toBeGreaterThan(0);
    expect(progressUpdates[progressUpdates.length - 1].progress).toBe(100);
  });

  test('should handle large documents efficiently', async () => {
    // Create a large document
    let html = '<h1>Large Document</h1>';
    for (let i = 0; i < 100; i++) {
      html += `<h2>Section ${i + 1}</h2>`;
      html += `<p>This is paragraph ${i + 1} with some content. `;
      html += 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. ';
      html += 'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>';
    }

    const container = createTestContainer(html);

    const progressUpdates: ExportProgress[] = [];
    const startTime = Date.now();

    await controller.export(container, { format: 'docx' }, (progress) =>
      progressUpdates.push(progress)
    );

    const endTime = Date.now();
    const duration = endTime - startTime;

    expect(progressUpdates.length).toBeGreaterThan(0);
    expect(progressUpdates[progressUpdates.length - 1].progress).toBe(100);

    // Should complete in reasonable time (less than 10 seconds)
    expect(duration).toBeLessThan(10000);
  });

  test('should correctly collect content from complex document', async () => {
    const container = createTestContainer(`
      <h1>Main Title</h1>
      <p>Introduction paragraph with <strong>bold</strong> and <em>italic</em>.</p>
      
      <h2>Section 1</h2>
      <p>Some text with <code>inline code</code>.</p>
      <ul>
        <li>Item 1</li>
        <li>Item 2
          <ul>
            <li>Nested 1</li>
            <li>Nested 2</li>
          </ul>
        </li>
        <li>Item 3</li>
      </ul>
      
      <h2>Section 2</h2>
      <pre><code class="language-typescript">interface Test {
  name: string;
}</code></pre>
      
      <h2>Section 3</h2>
      <blockquote>
        <p>This is a quote.</p>
        <p>With multiple paragraphs.</p>
      </blockquote>
      
      <hr>
      
      <p>Final paragraph with a <a href="https://example.com">link</a>.</p>
    `);

    const collector = new ContentCollector();
    const content = collector.collect(container);

    // Verify content structure
    expect(content.title).toBe('Main Title');
    expect(content.nodes.length).toBeGreaterThan(0);

    // Verify different node types are present
    const nodeTypes = content.nodes.map((n) => n.type);
    expect(nodeTypes).toContain('heading');
    expect(nodeTypes).toContain('paragraph');
    expect(nodeTypes).toContain('list');
    expect(nodeTypes).toContain('code');
    expect(nodeTypes).toContain('blockquote');
    expect(nodeTypes).toContain('hr');

    // Now export the full document
    const progressUpdates: ExportProgress[] = [];

    await controller.export(container, { format: 'docx' }, (progress) =>
      progressUpdates.push(progress)
    );

    expect(progressUpdates.length).toBeGreaterThan(0);
    expect(progressUpdates[progressUpdates.length - 1].progress).toBe(100);
  });

  test('should convert multiple SVGs in batch', async () => {
    // Create multiple SVGs
    const container = createTestContainer(`
      <h1>Multiple Diagrams</h1>
      <p>First diagram:</p>
      <div class="mermaid-container" id="mermaid-1"></div>
      <p>Second diagram:</p>
      <div class="mermaid-container" id="mermaid-2"></div>
      <p>Third diagram:</p>
      <div class="mermaid-container" id="mermaid-3"></div>
    `);

    // Add SVGs to containers
    for (let i = 1; i <= 3; i++) {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('id', `mermaid-${i}`);
      svg.setAttribute('width', '200');
      svg.setAttribute('height', '100');
      svg.setAttribute('viewBox', '0 0 200 100');

      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('width', '200');
      rect.setAttribute('height', '100');
      rect.setAttribute('fill', i === 1 ? 'red' : i === 2 ? 'green' : 'blue');
      svg.appendChild(rect);

      const mermaidContainer = container.querySelector(`#mermaid-${i}`);
      mermaidContainer?.appendChild(svg);
    }

    const converter = new SVGConverter();
    const svgs = Array.from(container.querySelectorAll('.mermaid-container svg')) as SVGElement[];

    expect(svgs.length).toBe(3);

    const images = await converter.convertAll(svgs);

    expect(images.size).toBe(3);
    expect(images.has('mermaid-1')).toBe(true);
    expect(images.has('mermaid-2')).toBe(true);
    expect(images.has('mermaid-3')).toBe(true);

    // Now export with all diagrams
    const progressUpdates: ExportProgress[] = [];

    await controller.export(container, { format: 'docx' }, (progress) =>
      progressUpdates.push(progress)
    );

    expect(progressUpdates.length).toBeGreaterThan(0);
    expect(progressUpdates[progressUpdates.length - 1].progress).toBe(100);
  });

  test('should handle empty document gracefully', async () => {
    const container = createTestContainer('');

    const progressUpdates: ExportProgress[] = [];

    await controller.export(container, { format: 'docx' }, (progress) =>
      progressUpdates.push(progress)
    );

    expect(progressUpdates.length).toBeGreaterThan(0);
    expect(progressUpdates[progressUpdates.length - 1].progress).toBe(100);
  });

  test('should use custom filename when provided', async () => {
    const container = createTestContainer('<h1>Test</h1>');

    const anchors: HTMLAnchorElement[] = [];
    const originalCreateElement = document.createElement.bind(document);

    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const element = originalCreateElement(tagName);
      if (tagName === 'a') {
        anchors.push(element as HTMLAnchorElement);
        vi.spyOn(element, 'click').mockImplementation(() => {});
      }
      return element;
    });

    await controller.export(container, {
      format: 'docx',
      filename: 'my-custom-export',
    });

    expect(anchors.length).toBeGreaterThan(0);
    expect(anchors[0].download).toBe('my-custom-export.docx');
  });

  test('should complete full workflow from collection to download', async () => {
    const container = createTestContainer(`
      <h1>Complete Workflow Test</h1>
      <p>This tests the entire export pipeline:</p>
      <ol>
        <li>Content collection</li>
        <li>SVG conversion</li>
        <li>DOCX generation</li>
        <li>File download</li>
      </ol>
      <pre><code class="language-javascript">console.log("Test");</code></pre>
    `);

    const progressUpdates: ExportProgress[] = [];
    const stageMessages: string[] = [];

    await controller.export(container, { format: 'docx' }, (progress) => {
      progressUpdates.push(progress);
      stageMessages.push(progress.message);
    });

    // Verify all stages completed
    expect(progressUpdates.length).toBeGreaterThan(0);
    expect(progressUpdates[progressUpdates.length - 1].progress).toBe(100);

    // Verify stage messages contain expected text
    const allMessages = stageMessages.join(' ');
    expect(allMessages).toContain('Analyzing');
    expect(allMessages).toContain('Converting');
    expect(allMessages).toContain('Generating');
    expect(allMessages).toContain('download');
  });
});

