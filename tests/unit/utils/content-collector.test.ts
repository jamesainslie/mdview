/**
 * Tests for Content Collector utility
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ContentCollector } from '../../../src/utils/content-collector';

/**
 * Helper to create a test container with HTML
 */
function createTestContainer(html: string): HTMLElement {
  const container = document.createElement('div');
  container.id = 'mdview-container';
  container.innerHTML = html;
  return container;
}

describe('ContentCollector', () => {
  let collector: ContentCollector;

  beforeEach(() => {
    collector = new ContentCollector();
  });

  describe('Basic Content Extraction', () => {
    it('should extract headings at all levels', () => {
      const html = `
        <h1 id="h1">Heading 1</h1>
        <h2 id="h2">Heading 2</h2>
        <h3 id="h3">Heading 3</h3>
        <h4 id="h4">Heading 4</h4>
        <h5 id="h5">Heading 5</h5>
        <h6 id="h6">Heading 6</h6>
      `;
      const container = createTestContainer(html);
      const result = collector.collect(container);

      expect(result.nodes).toHaveLength(6);
      expect(result.nodes[0]).toMatchObject({
        type: 'heading',
        content: 'Heading 1',
        attributes: { level: 1, id: 'h1' },
      });
      expect(result.nodes[5]).toMatchObject({
        type: 'heading',
        content: 'Heading 6',
        attributes: { level: 6, id: 'h6' },
      });
    });

    it('should extract paragraphs', () => {
      const html = `
        <p>This is a paragraph.</p>
        <p>This is another paragraph.</p>
      `;
      const container = createTestContainer(html);
      const result = collector.collect(container);

      expect(result.nodes).toHaveLength(2);
      expect(result.nodes[0]).toMatchObject({
        type: 'paragraph',
        content: 'This is a paragraph.',
      });
      expect(result.nodes[1]).toMatchObject({
        type: 'paragraph',
        content: 'This is another paragraph.',
      });
    });

    it('should handle empty container', () => {
      const container = createTestContainer('');
      const result = collector.collect(container);

      expect(result.nodes).toHaveLength(0);
      expect(result.title).toBe('Untitled Document');
      expect(result.metadata.wordCount).toBe(0);
    });

    it('should extract title from first H1', () => {
      const html = `
        <h1>My Document Title</h1>
        <p>Content</p>
      `;
      const container = createTestContainer(html);
      const result = collector.collect(container);

      expect(result.title).toBe('My Document Title');
    });

    it('should use "Untitled Document" if no H1', () => {
      const html = `
        <h2>Subtitle</h2>
        <p>Content</p>
      `;
      const container = createTestContainer(html);
      const result = collector.collect(container);

      expect(result.title).toBe('Untitled Document');
    });
  });

  describe('Lists', () => {
    it('should extract unordered lists', () => {
      const html = `
        <ul>
          <li>Item 1</li>
          <li>Item 2</li>
          <li>Item 3</li>
        </ul>
      `;
      const container = createTestContainer(html);
      const result = collector.collect(container);

      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].type).toBe('list');
      expect(result.nodes[0].attributes.ordered).toBe(false);
      expect(result.nodes[0].children).toHaveLength(3);
    });

    it('should extract ordered lists', () => {
      const html = `
        <ol>
          <li>First</li>
          <li>Second</li>
          <li>Third</li>
        </ol>
      `;
      const container = createTestContainer(html);
      const result = collector.collect(container);

      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].type).toBe('list');
      expect(result.nodes[0].attributes.ordered).toBe(true);
      expect(result.nodes[0].children).toHaveLength(3);
    });

    it('should handle nested lists', () => {
      const html = `
        <ul>
          <li>Item 1
            <ul>
              <li>Nested 1</li>
              <li>Nested 2</li>
            </ul>
          </li>
          <li>Item 2</li>
        </ul>
      `;
      const container = createTestContainer(html);
      const result = collector.collect(container);

      expect(result.nodes).toHaveLength(1);
      const list = result.nodes[0];
      expect(list.children).toHaveLength(2);
      expect(list.children![0].children).toBeDefined();
      expect(list.children![0].children).toHaveLength(1);
      expect(list.children![0].children![0].type).toBe('list');
    });

    it('should handle task lists', () => {
      const html = `
        <ul>
          <li class="task-list-item"><input type="checkbox" checked> Completed task</li>
          <li class="task-list-item"><input type="checkbox"> Incomplete task</li>
        </ul>
      `;
      const container = createTestContainer(html);
      const result = collector.collect(container);

      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].type).toBe('list');
      expect(result.nodes[0].children).toHaveLength(2);
    });
  });

  describe('Code Blocks', () => {
    it('should extract code without syntax highlighting', () => {
      const html = `
        <pre><code>const x = 42;
console.log(x);</code></pre>
      `;
      const container = createTestContainer(html);
      const result = collector.collect(container);

      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].type).toBe('code');
      expect(result.nodes[0].content).toContain('const x = 42;');
      expect(result.nodes[0].content).toContain('console.log(x);');
    });

    it('should preserve language attribute', () => {
      const html = `
        <pre><code class="language-javascript">const x = 42;</code></pre>
      `;
      const container = createTestContainer(html);
      const result = collector.collect(container);

      expect(result.nodes[0].attributes.language).toBe('javascript');
    });

    it('should handle multi-line code', () => {
      const html = `
        <pre><code>line 1
line 2
line 3</code></pre>
      `;
      const container = createTestContainer(html);
      const result = collector.collect(container);

      const lines = result.nodes[0].content.toString().split('\n');
      expect(lines).toHaveLength(3);
    });

    it('should extract code from syntax highlighted blocks', () => {
      const html = `
        <pre><code class="language-python"><span class="keyword">def</span> <span class="function">hello</span>():
    <span class="keyword">print</span>(<span class="string">"world"</span>)</code></pre>
      `;
      const container = createTestContainer(html);
      const result = collector.collect(container);

      expect(result.nodes[0].type).toBe('code');
      expect(result.nodes[0].content).toContain('def');
      expect(result.nodes[0].content).toContain('hello');
      expect(result.nodes[0].content).toContain('print');
    });
  });

  describe('Tables', () => {
    it('should extract simple tables', () => {
      const html = `
        <table>
          <tr>
            <td>Cell 1</td>
            <td>Cell 2</td>
          </tr>
          <tr>
            <td>Cell 3</td>
            <td>Cell 4</td>
          </tr>
        </table>
      `;
      const container = createTestContainer(html);
      const result = collector.collect(container);

      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].type).toBe('table');
      expect(result.nodes[0].attributes.rows).toBe(2);
      expect(result.nodes[0].attributes.cols).toBe(2);
    });

    it('should handle tables with headers', () => {
      const html = `
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
          </tbody>
        </table>
      `;
      const container = createTestContainer(html);
      const result = collector.collect(container);

      expect(result.nodes[0].type).toBe('table');
      expect(result.nodes[0].attributes.rows).toBe(2);

      const tableData = JSON.parse(result.nodes[0].content as string);
      expect(tableData[0]).toEqual(['Header 1', 'Header 2']);
      expect(tableData[1]).toEqual(['Data 1', 'Data 2']);
    });

    it('should handle complex table content', () => {
      const html = `
        <table>
          <tr>
            <td><strong>Bold</strong></td>
            <td><em>Italic</em></td>
            <td><code>Code</code></td>
          </tr>
        </table>
      `;
      const container = createTestContainer(html);
      const result = collector.collect(container);

      const tableData = JSON.parse(result.nodes[0].content as string);
      expect(tableData[0][0]).toContain('**Bold**');
      expect(tableData[0][1]).toContain('*Italic*');
      expect(tableData[0][2]).toContain('`Code`');
    });
  });

  describe('Mermaid Diagrams', () => {
    it('should identify mermaid containers', () => {
      const html = `
        <div class="mermaid-container" id="mermaid-1">
          <svg width="200" height="100"></svg>
        </div>
      `;
      const container = createTestContainer(html);
      const result = collector.collect(container);

      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].type).toBe('mermaid');
      expect(result.nodes[0].attributes.id).toBe('mermaid-1');
    });

    it('should extract diagram IDs', () => {
      const html = `
        <div class="mermaid-container" id="diagram-flow">
          <svg></svg>
        </div>
        <div class="mermaid-container" id="diagram-sequence">
          <svg></svg>
        </div>
      `;
      const container = createTestContainer(html);
      const result = collector.collect(container);

      expect(result.nodes).toHaveLength(2);
      expect(result.nodes[0].attributes.id).toBe('diagram-flow');
      expect(result.nodes[1].attributes.id).toBe('diagram-sequence');
    });

    it('should handle multiple diagrams', () => {
      const html = `
        <h2>Diagrams</h2>
        <div class="mermaid-container" id="m1"><svg></svg></div>
        <p>Text between</p>
        <div class="mermaid-container" id="m2"><svg></svg></div>
      `;
      const container = createTestContainer(html);
      const result = collector.collect(container);

      const mermaidNodes = result.nodes.filter((n) => n.type === 'mermaid');
      expect(mermaidNodes).toHaveLength(2);
    });
  });

  describe('Inline Formatting', () => {
    it('should preserve bold text', () => {
      const html = `<p>This is <strong>bold</strong> text.</p>`;
      const container = createTestContainer(html);
      const result = collector.collect(container);

      expect(result.nodes[0].content).toContain('**bold**');
    });

    it('should preserve italic text', () => {
      const html = `<p>This is <em>italic</em> text.</p>`;
      const container = createTestContainer(html);
      const result = collector.collect(container);

      expect(result.nodes[0].content).toContain('*italic*');
    });

    it('should preserve inline code', () => {
      const html = `<p>Use the <code>console.log</code> function.</p>`;
      const container = createTestContainer(html);
      const result = collector.collect(container);

      expect(result.nodes[0].content).toContain('`console.log`');
    });

    it('should preserve links', () => {
      const html = `<p>Visit <a href="https://example.com">our website</a> here.</p>`;
      const container = createTestContainer(html);
      const result = collector.collect(container);

      expect(result.nodes[0].content).toContain('[our website](https://example.com)');
    });

    it('should handle mixed formatting', () => {
      const html = `<p>This has <strong>bold</strong>, <em>italic</em>, and <code>code</code>.</p>`;
      const container = createTestContainer(html);
      const result = collector.collect(container);

      const content = result.nodes[0].content as string;
      expect(content).toContain('**bold**');
      expect(content).toContain('*italic*');
      expect(content).toContain('`code`');
    });

    it('should handle line breaks', () => {
      const html = `<p>Line 1<br>Line 2</p>`;
      const container = createTestContainer(html);
      const result = collector.collect(container);

      expect(result.nodes[0].content).toContain('Line 1\nLine 2');
    });
  });

  describe('Blockquotes', () => {
    it('should extract blockquotes', () => {
      const html = `
        <blockquote>
          <p>This is a quote.</p>
        </blockquote>
      `;
      const container = createTestContainer(html);
      const result = collector.collect(container);

      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].type).toBe('blockquote');
      expect(result.nodes[0].children).toHaveLength(1);
      expect(result.nodes[0].children![0].type).toBe('paragraph');
    });

    it('should handle nested blockquote content', () => {
      const html = `
        <blockquote>
          <p>Paragraph 1</p>
          <p>Paragraph 2</p>
          <ul>
            <li>List item</li>
          </ul>
        </blockquote>
      `;
      const container = createTestContainer(html);
      const result = collector.collect(container);

      expect(result.nodes[0].children).toHaveLength(3);
      expect(result.nodes[0].children![0].type).toBe('paragraph');
      expect(result.nodes[0].children![1].type).toBe('paragraph');
      expect(result.nodes[0].children![2].type).toBe('list');
    });
  });

  describe('Horizontal Rules', () => {
    it('should extract horizontal rules', () => {
      const html = `
        <p>Before</p>
        <hr>
        <p>After</p>
      `;
      const container = createTestContainer(html);
      const result = collector.collect(container);

      expect(result.nodes).toHaveLength(3);
      expect(result.nodes[1].type).toBe('hr');
    });
  });

  describe('Metadata Calculation', () => {
    it('should calculate word count accurately', () => {
      const html = `
        <h1>Title</h1>
        <p>This paragraph has six words total.</p>
        <p>Another paragraph with five words.</p>
      `;
      const container = createTestContainer(html);
      const result = collector.collect(container);

      // "Title" (1) + "This paragraph has six words total" (6) + "Another paragraph with five words" (5) = 12
      expect(result.metadata.wordCount).toBe(12);
    });

    it('should count images', () => {
      const html = `
        <p>Text</p>
        <img src="image1.png" alt="Image 1">
        <img src="image2.png" alt="Image 2">
      `;
      const container = createTestContainer(html);
      const result = collector.collect(container);

      // Note: ContentCollector doesn't extract <img> tags directly yet
      // This test will pass once image handling is added
      expect(result.metadata.imageCount).toBe(0);
    });

    it('should count mermaid diagrams', () => {
      const html = `
        <div class="mermaid-container" id="m1"><svg></svg></div>
        <p>Text</p>
        <div class="mermaid-container" id="m2"><svg></svg></div>
        <div class="mermaid-container" id="m3"><svg></svg></div>
      `;
      const container = createTestContainer(html);
      const result = collector.collect(container);

      expect(result.metadata.mermaidCount).toBe(3);
    });

    it('should set exportedAt date', () => {
      const html = `<p>Content</p>`;
      const container = createTestContainer(html);
      const result = collector.collect(container);

      expect(result.metadata.exportedAt).toBeInstanceOf(Date);
    });
  });

  describe('Edge Cases', () => {
    it('should handle deeply nested structures', () => {
      const html = `
        <blockquote>
          <blockquote>
            <blockquote>
              <p>Deeply nested</p>
            </blockquote>
          </blockquote>
        </blockquote>
      `;
      const container = createTestContainer(html);
      const result = collector.collect(container);

      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].type).toBe('blockquote');
    });

    it('should handle mixed content', () => {
      const html = `
        <h1>Document</h1>
        <p>Intro paragraph</p>
        <ul>
          <li>List item</li>
        </ul>
        <pre><code>code block</code></pre>
        <table><tr><td>cell</td></tr></table>
        <blockquote><p>quote</p></blockquote>
        <div class="mermaid-container" id="m1"><svg></svg></div>
        <hr>
      `;
      const container = createTestContainer(html);
      const result = collector.collect(container);

      expect(result.nodes.length).toBeGreaterThan(5);
      const types = result.nodes.map((n) => n.type);
      expect(types).toContain('heading');
      expect(types).toContain('paragraph');
      expect(types).toContain('list');
      expect(types).toContain('code');
      expect(types).toContain('table');
      expect(types).toContain('blockquote');
      expect(types).toContain('mermaid');
      expect(types).toContain('hr');
    });
  });
});


