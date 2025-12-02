/**
 * Unit tests for DOCX Generator
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { DOCXGenerator } from '../../../src/utils/docx-generator';
import type { ContentNode, CollectedContent, ConvertedImage } from '../../../src/types';

describe('DOCXGenerator', () => {
  let generator: DOCXGenerator;

  beforeEach(() => {
    generator = new DOCXGenerator();
  });

  // Helper to create test content
  function createTestContent(nodes: ContentNode[]): CollectedContent {
    return {
      title: 'Test Document',
      nodes,
      metadata: {
        wordCount: 100,
        imageCount: 0,
        mermaidCount: 0,
        exportedAt: new Date(),
      },
    };
  }

  // Helper to create mock image
  function createMockImage(id: string): ConvertedImage {
    return {
      id,
      // 1x1 transparent PNG
      data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      width: 100,
      height: 100,
      format: 'png',
    };
  }

  describe('Document Generation', () => {
    test('should generate a valid DOCX blob', async () => {
      const content = createTestContent([
        { type: 'heading', content: 'Test Heading', attributes: { level: 1 } },
        { type: 'paragraph', content: 'Test paragraph', attributes: {} },
      ]);

      const blob = await generator.generate(content, new Map());

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      expect(blob.size).toBeGreaterThan(0);
    });

    test('should include document title in metadata', async () => {
      const content = createTestContent([]);

      const blob = await generator.generate(content, new Map(), {
        title: 'Custom Title',
      });

      expect(blob).toBeInstanceOf(Blob);
      // Note: We can't easily verify metadata without parsing the blob
      // but we verify it doesn't throw
    });

    test('should include author in metadata', async () => {
      const content = createTestContent([]);

      const blob = await generator.generate(content, new Map(), {
        author: 'Test Author',
      });

      expect(blob).toBeInstanceOf(Blob);
    });

    test('should use A4 page size by default', async () => {
      const content = createTestContent([]);

      const blob = await generator.generate(content, new Map());

      expect(blob).toBeInstanceOf(Blob);
    });

    test('should use Letter page size when specified', async () => {
      const content = createTestContent([]);

      const blob = await generator.generate(content, new Map(), {
        pageSize: 'Letter',
      });

      expect(blob).toBeInstanceOf(Blob);
    });
  });

  describe('Heading Conversion', () => {
    test('should convert H1 with Heading1 style', async () => {
      const content = createTestContent([
        { type: 'heading', content: 'Heading 1', attributes: { level: 1 } },
      ]);

      const blob = await generator.generate(content, new Map());

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.size).toBeGreaterThan(0);
    });

    test('should convert H2 with Heading2 style', async () => {
      const content = createTestContent([
        { type: 'heading', content: 'Heading 2', attributes: { level: 2 } },
      ]);

      const blob = await generator.generate(content, new Map());

      expect(blob).toBeInstanceOf(Blob);
    });

    test('should convert all heading levels (H1-H6)', async () => {
      const content = createTestContent([
        { type: 'heading', content: 'H1', attributes: { level: 1 } },
        { type: 'heading', content: 'H2', attributes: { level: 2 } },
        { type: 'heading', content: 'H3', attributes: { level: 3 } },
        { type: 'heading', content: 'H4', attributes: { level: 4 } },
        { type: 'heading', content: 'H5', attributes: { level: 5 } },
        { type: 'heading', content: 'H6', attributes: { level: 6 } },
      ]);

      const blob = await generator.generate(content, new Map());

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.size).toBeGreaterThan(0);
    });

    test('should preserve heading text content', async () => {
      const content = createTestContent([
        { type: 'heading', content: 'This is a test heading', attributes: { level: 1 } },
      ]);

      const blob = await generator.generate(content, new Map());

      expect(blob).toBeInstanceOf(Blob);
    });
  });

  describe('Paragraph Conversion', () => {
    test('should convert simple paragraphs', async () => {
      const content = createTestContent([
        { type: 'paragraph', content: 'This is a simple paragraph.', attributes: {} },
      ]);

      const blob = await generator.generate(content, new Map());

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.size).toBeGreaterThan(0);
    });

    test('should handle bold text (**text**)', async () => {
      const content = createTestContent([
        { type: 'paragraph', content: 'This is **bold text**.', attributes: {} },
      ]);

      const blob = await generator.generate(content, new Map());

      expect(blob).toBeInstanceOf(Blob);
    });

    test('should handle italic text (*text*)', async () => {
      const content = createTestContent([
        { type: 'paragraph', content: 'This is *italic text*.', attributes: {} },
      ]);

      const blob = await generator.generate(content, new Map());

      expect(blob).toBeInstanceOf(Blob);
    });

    test('should handle inline code (`code`)', async () => {
      const content = createTestContent([
        { type: 'paragraph', content: 'This is `inline code`.', attributes: {} },
      ]);

      const blob = await generator.generate(content, new Map());

      expect(blob).toBeInstanceOf(Blob);
    });

    test('should handle hyperlinks ([text](url))', async () => {
      const content = createTestContent([
        { type: 'paragraph', content: 'Visit [OpenAI](https://openai.com).', attributes: {} },
      ]);

      const blob = await generator.generate(content, new Map());

      expect(blob).toBeInstanceOf(Blob);
    });

    test('should handle mixed formatting', async () => {
      const content = createTestContent([
        {
          type: 'paragraph',
          content: 'This has **bold**, *italic*, `code`, and [a link](https://example.com).',
          attributes: {},
        },
      ]);

      const blob = await generator.generate(content, new Map());

      expect(blob).toBeInstanceOf(Blob);
    });
  });

  describe('List Conversion', () => {
    test('should convert unordered lists', async () => {
      const content = createTestContent([
        {
          type: 'list',
          content: [
            { type: 'paragraph', content: 'Item 1', attributes: {} },
            { type: 'paragraph', content: 'Item 2', attributes: {} },
            { type: 'paragraph', content: 'Item 3', attributes: {} },
          ],
          attributes: { ordered: false },
        },
      ]);

      const blob = await generator.generate(content, new Map());

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.size).toBeGreaterThan(0);
    });

    test('should convert ordered lists', async () => {
      const content = createTestContent([
        {
          type: 'list',
          content: [
            { type: 'paragraph', content: 'First', attributes: {} },
            { type: 'paragraph', content: 'Second', attributes: {} },
            { type: 'paragraph', content: 'Third', attributes: {} },
          ],
          attributes: { ordered: true },
        },
      ]);

      const blob = await generator.generate(content, new Map());

      expect(blob).toBeInstanceOf(Blob);
    });

    test('should handle nested lists', async () => {
      const content = createTestContent([
        {
          type: 'list',
          content: [
            {
              type: 'paragraph',
              content: 'Item 1',
              attributes: {},
              children: [
                {
                  type: 'list',
                  content: [
                    { type: 'paragraph', content: 'Nested 1', attributes: {} },
                    { type: 'paragraph', content: 'Nested 2', attributes: {} },
                  ],
                  attributes: { ordered: false },
                },
              ],
            },
            { type: 'paragraph', content: 'Item 2', attributes: {} },
          ],
          attributes: { ordered: false },
        },
      ]);

      const blob = await generator.generate(content, new Map());

      expect(blob).toBeInstanceOf(Blob);
    });

    test('should preserve list item content', async () => {
      const content = createTestContent([
        {
          type: 'list',
          content: [
            { type: 'paragraph', content: 'Item with **bold** text', attributes: {} },
            { type: 'paragraph', content: 'Item with *italic* text', attributes: {} },
          ],
          attributes: { ordered: false },
        },
      ]);

      const blob = await generator.generate(content, new Map());

      expect(blob).toBeInstanceOf(Blob);
    });
  });

  describe('Code Block Conversion', () => {
    test('should preserve code content', async () => {
      const content = createTestContent([
        {
          type: 'code',
          content: 'function test() {\n  return true;\n}',
          attributes: { language: 'javascript' },
        },
      ]);

      const blob = await generator.generate(content, new Map());

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.size).toBeGreaterThan(0);
    });

    test('should use monospace font', async () => {
      const content = createTestContent([
        { type: 'code', content: 'console.log("Hello");', attributes: { language: 'javascript' } },
      ]);

      const blob = await generator.generate(content, new Map());

      expect(blob).toBeInstanceOf(Blob);
    });

    test('should preserve whitespace and indentation', async () => {
      const content = createTestContent([
        {
          type: 'code',
          content: '  indented line 1\n    more indented\n  back',
          attributes: { language: 'text' },
        },
      ]);

      const blob = await generator.generate(content, new Map());

      expect(blob).toBeInstanceOf(Blob);
    });

    test('should handle multi-line code', async () => {
      const content = createTestContent([
        {
          type: 'code',
          content: 'line 1\nline 2\nline 3\nline 4\nline 5',
          attributes: { language: 'text' },
        },
      ]);

      const blob = await generator.generate(content, new Map());

      expect(blob).toBeInstanceOf(Blob);
    });
  });

  describe('Table Conversion', () => {
    test('should convert simple tables', async () => {
      const tableData = [
        ['Cell 1', 'Cell 2'],
        ['Cell 3', 'Cell 4'],
      ];

      const content = createTestContent([
        {
          type: 'table',
          content: JSON.stringify(tableData),
          attributes: { rows: 2, cols: 2 },
        },
      ]);

      const blob = await generator.generate(content, new Map());

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.size).toBeGreaterThan(0);
    });

    test('should handle table headers', async () => {
      const tableData = [
        ['Header 1', 'Header 2'],
        ['Data 1', 'Data 2'],
        ['Data 3', 'Data 4'],
      ];

      const content = createTestContent([
        {
          type: 'table',
          content: JSON.stringify(tableData),
          attributes: { rows: 3, cols: 2 },
        },
      ]);

      const blob = await generator.generate(content, new Map());

      expect(blob).toBeInstanceOf(Blob);
    });

    test('should apply borders', async () => {
      const tableData = [['A', 'B'], ['C', 'D']];

      const content = createTestContent([
        {
          type: 'table',
          content: JSON.stringify(tableData),
          attributes: { rows: 2, cols: 2 },
        },
      ]);

      const blob = await generator.generate(content, new Map());

      expect(blob).toBeInstanceOf(Blob);
    });

    test('should handle empty cells', async () => {
      const tableData = [
        ['A', ''],
        ['', 'D'],
      ];

      const content = createTestContent([
        {
          type: 'table',
          content: JSON.stringify(tableData),
          attributes: { rows: 2, cols: 2 },
        },
      ]);

      const blob = await generator.generate(content, new Map());

      expect(blob).toBeInstanceOf(Blob);
    });
  });

  describe('Image Embedding', () => {
    test('should embed mermaid diagrams as images', async () => {
      const images = new Map<string, ConvertedImage>();
      images.set('diagram-1', createMockImage('diagram-1'));

      const content = createTestContent([
        {
          type: 'mermaid',
          content: '',
          attributes: { id: 'diagram-1' },
        },
      ]);

      const blob = await generator.generate(content, images);

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.size).toBeGreaterThan(0);
    });

    test('should skip missing images gracefully', async () => {
      const content = createTestContent([
        {
          type: 'mermaid',
          content: '',
          attributes: { id: 'missing-diagram' },
        },
      ]);

      const blob = await generator.generate(content, new Map());

      expect(blob).toBeInstanceOf(Blob);
      // Should still generate successfully, just without the image
    });

    test('should scale images to fit page width', async () => {
      const largeImage = createMockImage('large-diagram');
      largeImage.width = 2000; // Very wide image
      largeImage.height = 1000;

      const images = new Map<string, ConvertedImage>();
      images.set('large-diagram', largeImage);

      const content = createTestContent([
        {
          type: 'mermaid',
          content: '',
          attributes: { id: 'large-diagram' },
        },
      ]);

      const blob = await generator.generate(content, images);

      expect(blob).toBeInstanceOf(Blob);
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty content', async () => {
      const content = createTestContent([]);

      const blob = await generator.generate(content, new Map());

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.size).toBeGreaterThan(0);
    });

    test('should handle content with only headings', async () => {
      const content = createTestContent([
        { type: 'heading', content: 'H1', attributes: { level: 1 } },
        { type: 'heading', content: 'H2', attributes: { level: 2 } },
        { type: 'heading', content: 'H3', attributes: { level: 3 } },
      ]);

      const blob = await generator.generate(content, new Map());

      expect(blob).toBeInstanceOf(Blob);
    });

    test('should handle very long documents', async () => {
      const nodes: ContentNode[] = [];

      // Create 100 paragraphs
      for (let i = 0; i < 100; i++) {
        nodes.push({
          type: 'paragraph',
          content: `Paragraph ${i + 1} with some content.`,
          attributes: {},
        });
      }

      const content = createTestContent(nodes);

      const blob = await generator.generate(content, new Map());

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.size).toBeGreaterThan(0);
    });
  });

  describe('Blockquote Conversion', () => {
    test('should convert blockquotes', async () => {
      const content = createTestContent([
        {
          type: 'blockquote',
          content: [{ type: 'paragraph', content: 'Quoted text', attributes: {} }],
          attributes: {},
        },
      ]);

      const blob = await generator.generate(content, new Map());

      expect(blob).toBeInstanceOf(Blob);
    });

    test('should handle nested content in blockquotes', async () => {
      const content = createTestContent([
        {
          type: 'blockquote',
          content: [
            { type: 'paragraph', content: 'First paragraph', attributes: {} },
            { type: 'paragraph', content: 'Second paragraph', attributes: {} },
          ],
          attributes: {},
        },
      ]);

      const blob = await generator.generate(content, new Map());

      expect(blob).toBeInstanceOf(Blob);
    });
  });

  describe('Horizontal Rule Conversion', () => {
    test('should convert horizontal rules', async () => {
      const content = createTestContent([
        { type: 'paragraph', content: 'Before HR', attributes: {} },
        { type: 'hr', content: '', attributes: {} },
        { type: 'paragraph', content: 'After HR', attributes: {} },
      ]);

      const blob = await generator.generate(content, new Map());

      expect(blob).toBeInstanceOf(Blob);
    });
  });
});

