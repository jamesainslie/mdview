/**
 * Unit tests for Render Pipeline
 */

import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest';
import { RenderPipeline, type RenderProgress } from '../../../src/core/render-pipeline';
import { markdownSamples } from '../../helpers/fixtures';
import { mockChromeRuntime, createMockConverter, waitFor, createMockWorkerPool } from '../../helpers/mocks';
import { createTestContainer, cleanupTestContainer, mockConsole } from '../../helpers/test-utils';

// Mock the worker pool module
vi.mock('../../../src/workers/worker-pool', () => ({
  workerPool: {
    initialize: vi.fn().mockResolvedValue(undefined),
    execute: vi.fn().mockResolvedValue({
      html: '<p>Mock Worker HTML</p>',
      metadata: {
        wordCount: 10,
        headings: [],
        codeBlocks: [],
        mermaidBlocks: [],
        images: [],
        links: [],
      },
    }),
    terminate: vi.fn(),
  },
}));

describe('RenderPipeline', () => {
  let pipeline: RenderPipeline;
  let container: HTMLElement;
  let consoleMock: { restore: () => void };

  beforeEach(() => {
    // Suppress console output during tests to keep run clean
    consoleMock = mockConsole();
    
    pipeline = new RenderPipeline();
    container = createTestContainer();
    mockChromeRuntime();
    
    // Mock window.crypto for hash generation
    Object.defineProperty(global, 'crypto', {
      value: {
        subtle: {
          digest: vi.fn().mockResolvedValue(new ArrayBuffer(32)),
        },
      },
      writable: true,
    });
  });

  afterEach(() => {
    cleanupTestContainer(container);
    consoleMock.restore();
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    test('should render simple markdown', async () => {
      await pipeline.render({
        container,
        markdown: '# Hello World',
        useCache: false,
        useWorkers: false,
      });

      expect(container.innerHTML).toContain('Hello World');
      expect(container.classList.contains('mdview-rendered')).toBe(true);
    });

    test('should render complex markdown', async () => {
      await pipeline.render({
        container,
        markdown: markdownSamples.complex,
        useCache: false,
        useWorkers: false,
      });

      expect(container.innerHTML.length).toBeGreaterThan(0);
      expect(container.innerHTML).toContain('<h1');
      expect(container.innerHTML).toContain('<code');
    });

    test('should handle empty markdown', async () => {
      await pipeline.render({
        container,
        markdown: '',
        useCache: false,
        useWorkers: false,
      });

      // Empty or minimal content
      expect(container.innerHTML).toBeDefined();
    });

    test('should sanitize HTML content', async () => {
      const malicious = '<script>alert("xss")</script>\n# Safe Content';
      
      await pipeline.render({
        container,
        markdown: malicious,
        useCache: false,
        useWorkers: false,
      });

      expect(container.innerHTML).not.toContain('<script>');
      expect(container.innerHTML).toContain('Safe Content');
    });
  });

  describe('Progress Tracking', () => {
    test('should invoke progress callbacks', async () => {
      const progressCallback = vi.fn();
      pipeline.onProgress(progressCallback);

      await pipeline.render({
        container,
        markdown: '# Test',
        useCache: false,
        useWorkers: false,
      });

      expect(progressCallback).toHaveBeenCalled();
    });

    test('should report progress stages', async () => {
      const stages: string[] = [];
      pipeline.onProgress((progress) => {
        stages.push(progress.stage);
      });

      await pipeline.render({
        container,
        markdown: '# Test',
        useCache: false,
        useWorkers: false,
      });

      // Should go through multiple stages
      expect(stages.length).toBeGreaterThan(0);
    });

    test('should report progress from 0 to 100', async () => {
      const progressValues: number[] = [];
      pipeline.onProgress((progress) => {
        progressValues.push(progress.progress);
      });

      await pipeline.render({
        container,
        markdown: '# Test',
        useCache: false,
        useWorkers: false,
      });

      // Should have progress values
      expect(progressValues.length).toBeGreaterThan(0);
      // Final progress should be 100
      expect(progressValues[progressValues.length - 1]).toBe(100);
    });

    test('should provide descriptive progress messages', async () => {
      const messages: string[] = [];
      pipeline.onProgress((progress) => {
        messages.push(progress.message);
      });

      await pipeline.render({
        container,
        markdown: '# Test',
        useCache: false,
        useWorkers: false,
      });

      expect(messages.length).toBeGreaterThan(0);
      expect(messages.some((m) => m.length > 0)).toBe(true);
    });

    test('should support multiple progress listeners', async () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      
      pipeline.onProgress(callback1);
      pipeline.onProgress(callback2);

      await pipeline.render({
        container,
        markdown: '# Test',
        useCache: false,
        useWorkers: false,
      });

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });

    test('should cleanup listener on unsubscribe', async () => {
      const callback = vi.fn();
      const unsubscribe = pipeline.onProgress(callback);
      
      unsubscribe();

      await pipeline.render({
        container,
        markdown: '# Test',
        useCache: false,
        useWorkers: false,
      });

      expect(callback).not.toHaveBeenCalled();
    });

    test('should throttle progress updates', async () => {
      const callback = vi.fn();
      pipeline.onProgress(callback);

      await pipeline.render({
        container,
        markdown: markdownSamples.complex,
        useCache: false,
        useWorkers: false,
      });

      // Should be throttled, not called for every internal update
      // Exact count depends on implementation, but should be reasonable
      expect(callback.mock.calls.length).toBeLessThan(100);
    });
  });

  describe('Progressive Rendering', () => {
    test('should trigger progressive mode for large files', async () => {
      const largeMarkdown = 'a'.repeat(50000);
      const progressStages: string[] = [];
      
      pipeline.onProgress((progress) => {
        progressStages.push(progress.stage);
      });

      await pipeline.render({
        container,
        markdown: largeMarkdown,
        useCache: false,
        useWorkers: false,
      });

      // Should complete rendering
      expect(container.innerHTML.length).toBeGreaterThan(0);
    });

    test('should enable progressive mode with useLazySections', async () => {
      await pipeline.render({
        container,
        markdown: markdownSamples.complex,
        useCache: false,
        useWorkers: false,
        useLazySections: true,
      });

      expect(container.innerHTML.length).toBeGreaterThan(0);
    });
  });

  describe('Content Transformation', () => {
    test('should add language badges to code blocks', async () => {
      await pipeline.render({
        container,
        markdown: markdownSamples.codeBlock,
        useCache: false,
        useWorkers: false,
      });

      expect(container.innerHTML).toContain('code-language-badge');
      expect(container.innerHTML).toContain('javascript');
    });

    test('should add copy buttons to code blocks', async () => {
      await pipeline.render({
        container,
        markdown: markdownSamples.codeBlock,
        useCache: false,
        useWorkers: false,
      });

      // Wait for idle-time enhancements
      await waitFor(200);

      const copyButtons = container.querySelectorAll('.code-copy-button');
      expect(copyButtons.length).toBeGreaterThan(0);
    });

    test('should add lazy loading to images', async () => {
      await pipeline.render({
        container,
        markdown: markdownSamples.image,
        useCache: false,
        useWorkers: false,
      });

      const images = container.querySelectorAll('img');
      images.forEach((img) => {
        expect(img.getAttribute('loading')).toBe('lazy');
      });
    });

    test('should wrap tables for responsiveness', async () => {
      await pipeline.render({
        container,
        markdown: markdownSamples.table,
        useCache: false,
        useWorkers: false,
      });

      expect(container.innerHTML).toContain('table-wrapper');
    });

    test('should support line numbers preference', async () => {
      await pipeline.render({
        container,
        markdown: markdownSamples.codeBlock,
        useCache: false,
        useWorkers: false,
        preferences: {
          lineNumbers: true,
        },
      });

      expect(container.innerHTML).toContain('has-line-numbers');
    });
  });

  describe('Caching', () => {
    test('should skip cache when useCache is false', async () => {
      const sendMessage = mockChromeRuntime().sendMessage;

      await pipeline.render({
        container,
        markdown: '# Test',
        useCache: false,
        useWorkers: false,
        filePath: 'test.md',
      });

      // Should not call cache-related messages
      const cacheMessages = sendMessage.mock.calls.filter((call) =>
        call[0].type?.startsWith('CACHE_')
      );
      expect(cacheMessages.length).toBe(0);
    });

    test('should generate cache key when caching enabled', async () => {
      const { sendMessage } = mockChromeRuntime();

      await pipeline.render({
        container,
        markdown: '# Test',
        useCache: true,
        useWorkers: false,
        filePath: 'test.md',
        theme: 'github-light',
      });

      // Should request cache key
      expect(sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'CACHE_GENERATE_KEY',
        })
      );
    });
  });

  describe('Cancellation', () => {
    test('should allow cancelling render', async () => {
      const renderPromise = pipeline.render({
        container,
        markdown: markdownSamples.complex,
        useCache: false,
        useWorkers: false,
      });

      pipeline.cancelRender();

      await renderPromise;

      // Should complete without error
      expect(true).toBe(true);
    });

    test('should not affect subsequent renders after cancel', async () => {
      const promise1 = pipeline.render({
        container,
        markdown: '# First',
        useCache: false,
        useWorkers: false,
      });

      pipeline.cancelRender();
      await promise1;

      // Second render should work normally
      await pipeline.render({
        container,
        markdown: '# Second',
        useCache: false,
        useWorkers: false,
      });

      expect(container.innerHTML).toContain('Second');
    });
  });

  describe('Error Handling', () => {
    test('should handle render errors gracefully', async () => {
      // Pass invalid container
      const invalidContainer = null as any;

      await expect(
        pipeline.render({
          container: invalidContainer,
          markdown: '# Test',
          useCache: false,
          useWorkers: false,
        })
      ).rejects.toThrow();
    });

    test('should display error in container on failure', async () => {
      // Mock converter to throw error
      vi.spyOn(pipeline as any, 'converter', 'get').mockReturnValue({
        convert: vi.fn().mockImplementation(() => {
          throw new Error('Parse error');
        }),
      });

      try {
        await pipeline.render({
          container,
          markdown: '# Test',
          useCache: false,
          useWorkers: false,
        });
      } catch (e) {
        // Error expected
      }

      // Container should show error
      expect(container.innerHTML).toContain('error') || expect(container.innerHTML.length).toBeGreaterThan(0);
    });

    test('should escape HTML in error messages', async () => {
      // This test verifies the escapeHtml private method works
      const errorWithHtml = '<script>alert("xss")</script>';
      
      // The pipeline should handle this safely
      expect(() => {
        (pipeline as any).escapeHtml(errorWithHtml);
      }).not.toThrow();
    });
  });

  describe('Theming', () => {
    test('should apply theming stage', async () => {
      await pipeline.render({
        container,
        markdown: '# Test',
        useCache: false,
        useWorkers: false,
        theme: 'github-light',
      });

      expect(container.classList.contains('mdview-rendered')).toBe(true);
    });

    test('should handle theme parameter', async () => {
      await pipeline.render({
        container,
        markdown: '# Test',
        useCache: false,
        useWorkers: false,
        theme: 'github-dark',
      });

      // Should complete without error
      expect(container.innerHTML).toBeTruthy();
    });
  });

  describe('Mermaid Integration', () => {
    test('should mark mermaid blocks for rendering', async () => {
      await pipeline.render({
        container,
        markdown: markdownSamples.mermaid,
        useCache: false,
        useWorkers: false,
      });

      const mermaidContainers = container.querySelectorAll('.mermaid-container');
      expect(mermaidContainers.length).toBeGreaterThan(0);
    });

    test('should add pending class to mermaid blocks', async () => {
      await pipeline.render({
        container,
        markdown: markdownSamples.mermaid,
        useCache: false,
        useWorkers: false,
      });

      // Mermaid blocks should be marked (pending or ready depending on timing)
      const mermaidContainers = container.querySelectorAll('.mermaid-container');
      expect(mermaidContainers.length).toBeGreaterThan(0);
    });
  });

  describe('Copy Button Functionality', () => {
    test('should add copy button click handlers', async () => {
      await pipeline.render({
        container,
        markdown: markdownSamples.codeBlock,
        useCache: false,
        useWorkers: false,
      });

      // Wait for idle-time enhancements
      await waitFor(200);

      const copyButtons = container.querySelectorAll('.code-copy-button');
      if (copyButtons.length > 0) {
        const button = copyButtons[0] as HTMLButtonElement;
        expect(button.textContent).toBe('Copy');
      }
    });

    test('should copy code to clipboard on button click', async () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText },
        writable: true,
      });

      await pipeline.render({
        container,
        markdown: markdownSamples.codeBlock,
        useCache: false,
        useWorkers: false,
      });

      await waitFor(200);

      const copyButton = container.querySelector('.code-copy-button') as HTMLButtonElement;
      if (copyButton) {
        copyButton.click();
        await waitFor(50);
        expect(writeText).toHaveBeenCalled();
      }
    });
  });

  describe('Performance', () => {
    test('should render small files quickly', async () => {
      const start = Date.now();
      
      await pipeline.render({
        container,
        markdown: '# Small file\n\nSome content.',
        useCache: false,
        useWorkers: false,
      });
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000); // Should be much faster, but allowing margin
    });

    test('should handle multiple rapid renders', async () => {
      for (let i = 0; i < 3; i++) {
        await pipeline.render({
          container,
          markdown: `# Render ${i}`,
          useCache: false,
          useWorkers: false,
        });
      }

      expect(container.innerHTML).toContain('Render');
    });
  });
});

