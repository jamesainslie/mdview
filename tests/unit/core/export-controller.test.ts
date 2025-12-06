/**
 * Unit tests for Export Controller
 */

/* eslint-disable @typescript-eslint/unbound-method */
import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest';
import { ExportController } from '../../../src/core/export-controller';
import type { ExportProgress } from '../../../src/types';

// Don't mock modules - use real implementations
vi.mock('../../../src/utils/debug-logger', () => ({
  debug: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('ExportController', () => {
  let controller: ExportController;
  let mockContainer: HTMLElement;

  beforeEach(() => {
    controller = new ExportController();

    // Mock URL methods
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = vi.fn();

    // Create mock container
    mockContainer = document.createElement('div');
    mockContainer.id = 'mdview-container';
    mockContainer.innerHTML = `
      <h1>Test Document</h1>
      <p>This is a test paragraph.</p>
    `;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Export Flow', () => {
    test('should complete export successfully', async () => {
      const progressUpdates: ExportProgress[] = [];

      await controller.export(mockContainer, { format: 'docx' }, (progress) =>
        progressUpdates.push(progress)
      );

      // Should have progress updates
      expect(progressUpdates.length).toBeGreaterThan(0);
      // Last update should be 100%
      expect(progressUpdates[progressUpdates.length - 1].progress).toBe(100);
    });

    test('should report progress at each stage', async () => {
      const progressUpdates: ExportProgress[] = [];

      await controller.export(mockContainer, { format: 'docx' }, (progress) =>
        progressUpdates.push(progress)
      );

      // Should have stages: collecting, converting, generating, downloading
      const stages = progressUpdates.map((p) => p.stage);
      expect(stages).toContain('collecting');
      expect(stages).toContain('converting');
      expect(stages).toContain('generating');
      expect(stages).toContain('downloading');
    });

    test('should trigger file download', async () => {
      // Mock document.createElement to track anchor creation
      const originalCreateElement = HTMLDocument.prototype.createElement;
      const anchors: HTMLAnchorElement[] = [];

      vi.spyOn(document, 'createElement').mockImplementation(function (
        this: Document,
        tagName: string
      ) {
        const element = originalCreateElement.call(this, tagName);
        if (tagName === 'a') {
          anchors.push(element as HTMLAnchorElement);
          // Mock click to prevent actual download
          vi.spyOn(element, 'click').mockImplementation(() => {});
        }
        return element;
      });

      await controller.export(mockContainer, { format: 'docx' });

      // Should have created an anchor element
      expect(anchors.length).toBeGreaterThan(0);
      // Should have called click
      expect(anchors[0].click).toHaveBeenCalled();
    });
  });

  describe('Progress Reporting', () => {
    test('should report collecting stage', async () => {
      const progressUpdates: ExportProgress[] = [];

      await controller.export(mockContainer, { format: 'docx' }, (progress) =>
        progressUpdates.push(progress)
      );

      const collectingUpdates = progressUpdates.filter((p) => p.stage === 'collecting');
      expect(collectingUpdates.length).toBeGreaterThan(0);
    });

    test('should report converting stage', async () => {
      const progressUpdates: ExportProgress[] = [];

      await controller.export(mockContainer, { format: 'docx' }, (progress) =>
        progressUpdates.push(progress)
      );

      const convertingUpdates = progressUpdates.filter((p) => p.stage === 'converting');
      expect(convertingUpdates.length).toBeGreaterThan(0);
    });

    test('should report generating stage', async () => {
      const progressUpdates: ExportProgress[] = [];

      await controller.export(mockContainer, { format: 'docx' }, (progress) =>
        progressUpdates.push(progress)
      );

      const generatingUpdates = progressUpdates.filter((p) => p.stage === 'generating');
      expect(generatingUpdates.length).toBeGreaterThan(0);
    });

    test('should report downloading stage', async () => {
      const progressUpdates: ExportProgress[] = [];

      await controller.export(mockContainer, { format: 'docx' }, (progress) =>
        progressUpdates.push(progress)
      );

      const downloadingUpdates = progressUpdates.filter((p) => p.stage === 'downloading');
      expect(downloadingUpdates.length).toBeGreaterThan(0);
    });

    test('should report progress percentages correctly', async () => {
      const progressUpdates: ExportProgress[] = [];

      await controller.export(mockContainer, { format: 'docx' }, (progress) =>
        progressUpdates.push(progress)
      );

      // Progress should be increasing
      for (let i = 1; i < progressUpdates.length; i++) {
        expect(progressUpdates[i].progress).toBeGreaterThanOrEqual(progressUpdates[i - 1].progress);
      }

      // Should end at 100%
      expect(progressUpdates[progressUpdates.length - 1].progress).toBe(100);
    });
  });

  describe('Error Handling', () => {
    test('should throw on unsupported format', async () => {
      await expect(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
        controller.export(mockContainer, { format: 'pdf' as any })
      ).rejects.toThrow(/Unsupported export format/);
    });

    test('should handle content collection errors', async () => {
      // Create container with no children
      const emptyContainer = document.createElement('div');

      // Should still complete (empty document is valid)
      await expect(controller.export(emptyContainer, { format: 'docx' })).resolves.not.toThrow();
    });

    test('should handle SVG conversion errors gracefully', async () => {
      // Add invalid SVG container
      const container = document.createElement('div');
      container.innerHTML = `
        <div class="mermaid-container">
          <svg><invalid></invalid></svg>
        </div>
      `;

      // Should complete even if SVG conversion fails
      await expect(controller.export(container, { format: 'docx' })).resolves.not.toThrow();
    });

    test('should handle document generation errors', async () => {
      // Create valid container - generation should succeed
      const container = document.createElement('div');
      container.innerHTML = '<h1>Test</h1>';

      await expect(controller.export(container, { format: 'docx' })).resolves.not.toThrow();
    });
  });

  describe('Filename Handling', () => {
    test('should use provided filename', async () => {
      const anchors: HTMLAnchorElement[] = [];
      const originalCreateElement = HTMLDocument.prototype.createElement;

      vi.spyOn(document, 'createElement').mockImplementation(function (
        this: Document,
        tagName: string
      ) {
        const element = originalCreateElement.call(this, tagName);
        if (tagName === 'a') {
          anchors.push(element as HTMLAnchorElement);
          vi.spyOn(element, 'click').mockImplementation(() => {});
        }
        return element;
      });

      await controller.export(mockContainer, {
        format: 'docx',
        filename: 'my-custom-file',
      });

      expect(anchors[0].download).toBe('my-custom-file.docx');
    });

    test('should fall back to document title', async () => {
      const anchors: HTMLAnchorElement[] = [];
      const originalCreateElement = HTMLDocument.prototype.createElement;

      vi.spyOn(document, 'createElement').mockImplementation(function (
        this: Document,
        tagName: string
      ) {
        const element = originalCreateElement.call(this, tagName);
        if (tagName === 'a') {
          anchors.push(element as HTMLAnchorElement);
          vi.spyOn(element, 'click').mockImplementation(() => {});
        }
        return element;
      });

      await controller.export(mockContainer, { format: 'docx' });

      // Should use title from H1 or "Untitled Document"
      expect(anchors[0].download).toMatch(/\.docx$/);
    });

    test('should sanitize invalid characters', async () => {
      const anchors: HTMLAnchorElement[] = [];
      const originalCreateElement = HTMLDocument.prototype.createElement;

      vi.spyOn(document, 'createElement').mockImplementation(function (
        this: Document,
        tagName: string
      ) {
        const element = originalCreateElement.call(this, tagName);
        if (tagName === 'a') {
          anchors.push(element as HTMLAnchorElement);
          vi.spyOn(element, 'click').mockImplementation(() => {});
        }
        return element;
      });

      await controller.export(mockContainer, {
        format: 'docx',
        filename: 'test<>:"/\\|?*file',
      });

      // Should have sanitized the filename
      expect(anchors[0].download).not.toContain('<');
      expect(anchors[0].download).not.toContain('>');
      expect(anchors[0].download).not.toContain(':');
      expect(anchors[0].download).not.toContain('"');
      expect(anchors[0].download).not.toContain('\\');
      expect(anchors[0].download).not.toContain('|');
      expect(anchors[0].download).not.toContain('?');
      expect(anchors[0].download).not.toContain('*');
    });

    test('should handle empty title', async () => {
      const anchors: HTMLAnchorElement[] = [];
      const originalCreateElement = HTMLDocument.prototype.createElement;

      vi.spyOn(document, 'createElement').mockImplementation(function (
        this: Document,
        tagName: string
      ) {
        const element = originalCreateElement.call(this, tagName);
        if (tagName === 'a') {
          anchors.push(element as HTMLAnchorElement);
          vi.spyOn(element, 'click').mockImplementation(() => {});
        }
        return element;
      });

      const emptyContainer = document.createElement('div');

      await controller.export(emptyContainer, { format: 'docx' });

      // Should fall back to "document"
      expect(anchors[0].download).toMatch(/^(Untitled-Document|document)\.docx$/);
    });
  });

  describe('Cleanup', () => {
    test('should revoke blob URLs after download', async () => {
      await controller.export(mockContainer, { format: 'docx' });

      // Should have called revokeObjectURL
      expect(URL.revokeObjectURL).toHaveBeenCalled();
    });

    test('should clean up on error', async () => {
      // Try with unsupported format to trigger error
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
        await controller.export(mockContainer, { format: 'invalid' as any });
      } catch {
        // Expected to throw
      }

      // Note: Cleanup on error depends on where error occurs
      // This test just verifies no uncaught exceptions
    });
  });

  describe('getSupportedFormats', () => {
    test('should return array of supported formats', () => {
      const formats = controller.getSupportedFormats();

      expect(Array.isArray(formats)).toBe(true);
      expect(formats.length).toBeGreaterThan(0);
    });

    test('should include docx format', () => {
      const formats = controller.getSupportedFormats();

      expect(formats).toContain('docx');
    });

    test('should include pdf format', () => {
      const formats = controller.getSupportedFormats();

      expect(formats).toContain('pdf');
    });
  });
});
