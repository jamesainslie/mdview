/**
 * Integration tests for Export Phase 1
 * Tests ContentCollector and SVGConverter working together
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ContentCollector } from '../../src/utils/content-collector';
import { SVGConverter } from '../../src/utils/svg-converter';

/**
 * Helper to create a comprehensive test container with various content types
 */
function createComprehensiveContainer(): HTMLElement {
  const container = document.createElement('div');
  container.id = 'mdview-container';

  // Add headings
  const h1 = document.createElement('h1');
  h1.id = 'main-title';
  h1.textContent = 'Test Document';
  container.appendChild(h1);

  // Add paragraph with formatting
  const p = document.createElement('p');
  p.innerHTML = 'This is a <strong>bold</strong> paragraph with <em>italic</em> text.';
  container.appendChild(p);

  // Add list
  const ul = document.createElement('ul');
  const li1 = document.createElement('li');
  li1.textContent = 'First item';
  const li2 = document.createElement('li');
  li2.textContent = 'Second item';
  ul.appendChild(li1);
  ul.appendChild(li2);
  container.appendChild(ul);

  // Add code block
  const pre = document.createElement('pre');
  const code = document.createElement('code');
  code.className = 'language-javascript';
  code.textContent = 'const x = 42;';
  pre.appendChild(code);
  container.appendChild(pre);

  return container;
}

/**
 * Helper to create container with mermaid diagrams
 */
function createContainerWithMermaid(): HTMLElement {
  const container = document.createElement('div');
  container.id = 'mdview-container';

  // Add heading
  const h1 = document.createElement('h1');
  h1.textContent = 'Document with Diagrams';
  container.appendChild(h1);

  // Add paragraph
  const p = document.createElement('p');
  p.textContent = 'This document contains mermaid diagrams.';
  container.appendChild(p);

  // Add first mermaid diagram
  const mermaid1 = document.createElement('div');
  mermaid1.className = 'mermaid-container mermaid-ready';
  mermaid1.id = 'mermaid-diagram-1';

  const svg1 = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg1.id = 'svg-1';
  svg1.setAttribute('width', '200');
  svg1.setAttribute('height', '150');
  svg1.setAttribute('viewBox', '0 0 200 150');

  const rect1 = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  rect1.setAttribute('width', '200');
  rect1.setAttribute('height', '150');
  rect1.setAttribute('fill', 'blue');
  svg1.appendChild(rect1);

  const rendered1 = document.createElement('div');
  rendered1.className = 'mermaid-rendered';
  rendered1.appendChild(svg1);
  mermaid1.appendChild(rendered1);

  container.appendChild(mermaid1);

  // Add second heading
  const h2 = document.createElement('h2');
  h2.textContent = 'Another Section';
  container.appendChild(h2);

  // Add second mermaid diagram
  const mermaid2 = document.createElement('div');
  mermaid2.className = 'mermaid-container mermaid-ready';
  mermaid2.id = 'mermaid-diagram-2';

  const svg2 = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg2.id = 'svg-2';
  svg2.setAttribute('width', '300');
  svg2.setAttribute('height', '200');
  svg2.setAttribute('viewBox', '0 0 300 200');

  const circle2 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  circle2.setAttribute('cx', '150');
  circle2.setAttribute('cy', '100');
  circle2.setAttribute('r', '50');
  circle2.setAttribute('fill', 'green');
  svg2.appendChild(circle2);

  const rendered2 = document.createElement('div');
  rendered2.className = 'mermaid-rendered';
  rendered2.appendChild(svg2);
  mermaid2.appendChild(rendered2);

  container.appendChild(mermaid2);

  return container;
}

describe('Phase 1 Integration', () => {
  beforeEach(() => {
    // Mock canvas API
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
      fillStyle: '',
      fillRect: vi.fn(),
      drawImage: vi.fn(),
    })) as any;

    HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/png;base64,mockBase64Data');

    // Mock URL methods
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = vi.fn();

    // Mock Image to immediately trigger onload
    const OriginalImage = global.Image;
    global.Image = class extends OriginalImage {
      constructor() {
        super();
        setTimeout(() => {
          if (this.onload) {
            this.onload(new Event('load'));
          }
        }, 0);
      }
    } as any;

    Image.prototype.decode = vi.fn().mockResolvedValue(undefined);
  });

  describe('Content Collection and SVG Conversion', () => {
    it('should collect content and convert SVGs together', async () => {
      // 1. Create container with content including mermaid
      const container = createContainerWithMermaid();

      // 2. Collect content
      const collector = new ContentCollector();
      const content = collector.collect(container);

      // 3. Verify collected content
      expect(content.title).toBe('Document with Diagrams');
      expect(content.nodes.length).toBeGreaterThan(0);
      expect(content.metadata.mermaidCount).toBe(2);

      // 4. Find SVGs in container
      const svgs = container.querySelectorAll('.mermaid-container svg');
      expect(svgs.length).toBe(2);

      // 5. Convert SVGs
      const converter = new SVGConverter();
      const images = await converter.convertAll(Array.from(svgs) as SVGElement[]);

      // 6. Verify conversion results
      // SVGConverter prefers the mermaid container ID over the SVG's own ID
      expect(images.size).toBe(2);
      expect(images.has('mermaid-diagram-1')).toBe(true);
      expect(images.has('mermaid-diagram-2')).toBe(true);

      // 7. Verify image data (no scaling for SVG format)
      const image1 = images.get('mermaid-diagram-1');
      const image2 = images.get('mermaid-diagram-2');

      expect(image1).toBeDefined();
      expect(image1?.data).toBeTruthy();
      expect(image1?.format).toBe('svg');
      expect(image1?.width).toBe(200); // No scaling for SVG
      expect(image1?.height).toBe(150);

      expect(image2).toBeDefined();
      expect(image2?.data).toBeTruthy();
      expect(image2?.format).toBe('svg');
      expect(image2?.width).toBe(300); // No scaling for SVG
      expect(image2?.height).toBe(200);
    });

    it('should handle content without mermaid diagrams', async () => {
      const container = createComprehensiveContainer();

      const collector = new ContentCollector();
      const content = collector.collect(container);

      expect(content.title).toBe('Test Document');
      expect(content.metadata.mermaidCount).toBe(0);
      expect(content.metadata.wordCount).toBeGreaterThan(0);

      // Try to convert SVGs (should be empty)
      const svgs = container.querySelectorAll('.mermaid-container svg');
      expect(svgs.length).toBe(0);

      const converter = new SVGConverter();
      const images = await converter.convertAll(Array.from(svgs) as SVGElement[]);

      expect(images.size).toBe(0);
    });

    it('should match mermaid content nodes with converted images', async () => {
      const container = createContainerWithMermaid();

      // Collect content
      const collector = new ContentCollector();
      const content = collector.collect(container);

      // Find mermaid nodes
      const mermaidNodes = content.nodes.filter((node) => node.type === 'mermaid');
      expect(mermaidNodes.length).toBe(2);

      // Convert SVGs
      const svgs = container.querySelectorAll('.mermaid-container svg');
      const converter = new SVGConverter();
      const images = await converter.convertAll(Array.from(svgs) as SVGElement[]);

      // Verify we can match nodes to images
      mermaidNodes.forEach((node) => {
        const svgId = node.attributes.id;
        // The SVG inside the mermaid container has its own ID
        // In real usage, we'd need to match container ID to SVG ID
        expect(svgId).toBeTruthy();
      });

      expect(images.size).toBeGreaterThan(0);
    });
  });

  describe('Mixed Content Scenarios', () => {
    it('should handle document with all content types and diagrams', async () => {
      const container = document.createElement('div');
      container.id = 'mdview-container';

      // Title
      const h1 = document.createElement('h1');
      h1.textContent = 'Complete Document';
      container.appendChild(h1);

      // Intro
      const intro = document.createElement('p');
      intro.textContent = 'Introduction paragraph.';
      container.appendChild(intro);

      // List
      const ul = document.createElement('ul');
      const li = document.createElement('li');
      li.textContent = 'List item';
      ul.appendChild(li);
      container.appendChild(ul);

      // Code
      const pre = document.createElement('pre');
      const code = document.createElement('code');
      code.textContent = 'console.log("test");';
      pre.appendChild(code);
      container.appendChild(pre);

      // Table
      const table = document.createElement('table');
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.textContent = 'Cell';
      tr.appendChild(td);
      table.appendChild(tr);
      container.appendChild(table);

      // Blockquote
      const blockquote = document.createElement('blockquote');
      const quote = document.createElement('p');
      quote.textContent = 'Quote';
      blockquote.appendChild(quote);
      container.appendChild(blockquote);

      // Mermaid
      const mermaid = document.createElement('div');
      mermaid.className = 'mermaid-container';
      mermaid.id = 'diagram-1';
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.id = 'svg-complete';
      svg.setAttribute('width', '100');
      svg.setAttribute('height', '100');
      mermaid.appendChild(svg);
      container.appendChild(mermaid);

      // HR
      const hr = document.createElement('hr');
      container.appendChild(hr);

      // Collect
      const collector = new ContentCollector();
      const content = collector.collect(container);

      expect(content.nodes.length).toBe(8); // All elements
      expect(content.metadata.mermaidCount).toBe(1);

      // Convert
      const svgs = container.querySelectorAll('.mermaid-container svg');
      const converter = new SVGConverter();
      const images = await converter.convertAll(Array.from(svgs) as SVGElement[]);

      expect(images.size).toBe(1);
      // SVGConverter prefers the mermaid container ID over the SVG's own ID
      expect(images.has('diagram-1')).toBe(true);
    });

    it('should handle multiple diagrams of different sizes', async () => {
      const container = document.createElement('div');
      container.id = 'mdview-container';

      const sizes = [
        [100, 100],
        [200, 150],
        [400, 300],
        [800, 600],
      ];

      sizes.forEach(([width, height], index) => {
        const mermaid = document.createElement('div');
        mermaid.className = 'mermaid-container';
        mermaid.id = `diagram-${index}`;

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.id = `svg-${index}`;
        svg.setAttribute('width', width.toString());
        svg.setAttribute('height', height.toString());

        mermaid.appendChild(svg);
        container.appendChild(mermaid);
      });

      // Collect
      const collector = new ContentCollector();
      const content = collector.collect(container);

      expect(content.metadata.mermaidCount).toBe(4);

      // Convert
      const svgs = container.querySelectorAll('.mermaid-container svg');
      const converter = new SVGConverter();
      const images = await converter.convertAll(Array.from(svgs) as SVGElement[]);

      expect(images.size).toBe(4);

      // Verify each image has correct dimensions (no scaling for SVG)
      // SVGConverter prefers the mermaid container ID over the SVG's own ID
      sizes.forEach(([width, height], index) => {
        const image = images.get(`diagram-${index}`);
        expect(image).toBeDefined();
        expect(image?.width).toBe(width); // No scaling for SVG
        expect(image?.height).toBe(height);
      });
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle large documents efficiently', async () => {
      const container = document.createElement('div');
      container.id = 'mdview-container';

      // Add 100 paragraphs
      for (let i = 0; i < 100; i++) {
        const p = document.createElement('p');
        p.textContent = `Paragraph ${i + 1} with some content.`;
        container.appendChild(p);
      }

      // Add 10 diagrams
      for (let i = 0; i < 10; i++) {
        const mermaid = document.createElement('div');
        mermaid.className = 'mermaid-container';
        mermaid.id = `diagram-${i}`;

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.id = `svg-${i}`;
        svg.setAttribute('width', '150');
        svg.setAttribute('height', '150');

        mermaid.appendChild(svg);
        container.appendChild(mermaid);
      }

      const startTime = Date.now();

      // Collect
      const collector = new ContentCollector();
      const content = collector.collect(container);

      expect(content.nodes.length).toBe(110);
      expect(content.metadata.mermaidCount).toBe(10);

      // Convert
      const svgs = container.querySelectorAll('.mermaid-container svg');
      const converter = new SVGConverter();
      const images = await converter.convertAll(Array.from(svgs) as SVGElement[]);

      expect(images.size).toBe(10);

      const duration = Date.now() - startTime;

      // Should complete in reasonable time (< 5 seconds)
      expect(duration).toBeLessThan(5000);
    });

    it('should handle empty mermaid containers', async () => {
      const container = document.createElement('div');
      container.id = 'mdview-container';

      // Mermaid container without SVG
      const mermaid = document.createElement('div');
      mermaid.className = 'mermaid-container';
      mermaid.id = 'empty-diagram';
      container.appendChild(mermaid);

      const collector = new ContentCollector();
      const content = collector.collect(container);

      expect(content.metadata.mermaidCount).toBe(1);

      // Try to convert (should handle gracefully)
      const svgs = container.querySelectorAll('.mermaid-container svg');
      expect(svgs.length).toBe(0);

      const converter = new SVGConverter();
      const images = await converter.convertAll(Array.from(svgs) as SVGElement[]);

      expect(images.size).toBe(0);
    });
  });

  describe('Data Integrity', () => {
    it('should preserve all metadata through the pipeline', async () => {
      const container = createContainerWithMermaid();

      const collector = new ContentCollector();
      const content = collector.collect(container);

      // Verify metadata
      expect(content.title).toBe('Document with Diagrams');
      expect(content.metadata.wordCount).toBeGreaterThan(0);
      expect(content.metadata.mermaidCount).toBe(2);
      expect(content.metadata.exportedAt).toBeInstanceOf(Date);

      // Convert SVGs
      const svgs = container.querySelectorAll('.mermaid-container svg');
      const converter = new SVGConverter();
      const images = await converter.convertAll(Array.from(svgs) as SVGElement[]);

      // Verify all mermaid nodes have corresponding images
      const mermaidNodes = content.nodes.filter((n) => n.type === 'mermaid');
      expect(mermaidNodes.length).toBe(content.metadata.mermaidCount);
      expect(images.size).toBe(svgs.length);
    });

    it('should maintain content order', async () => {
      const container = createContainerWithMermaid();

      const collector = new ContentCollector();
      const content = collector.collect(container);

      // Verify order: heading, paragraph, mermaid, heading, mermaid
      expect(content.nodes[0].type).toBe('heading');
      expect(content.nodes[1].type).toBe('paragraph');
      expect(content.nodes[2].type).toBe('mermaid');
      expect(content.nodes[3].type).toBe('heading');
      expect(content.nodes[4].type).toBe('mermaid');
    });
  });
});


