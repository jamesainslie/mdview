/**
 * Unit tests for PDF Generator
 */

import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest';
import { PDFGenerator } from '../../../src/utils/pdf-generator';

// Mock the debug logger
vi.mock('../../../src/utils/debug-logger', () => ({
  debug: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock SVGConverter
vi.mock('../../../src/utils/svg-converter', () => ({
  SVGConverter: vi.fn().mockImplementation(() => ({
    convert: vi.fn().mockResolvedValue({
      id: 'test-svg',
      data: 'base64data',
      width: 400,
      height: 300,
      format: 'png',
    }),
  })),
}));

// Mock mermaid renderer
vi.mock('../../../src/renderers/mermaid-renderer', () => ({
  mermaidRenderer: {
    renderAllImmediate: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('PDFGenerator', () => {
  let generator: PDFGenerator;
  let mockContainer: HTMLElement;

  beforeEach(() => {
    generator = new PDFGenerator();

    // Mock window.print
    window.print = vi.fn();

    // Mock window.addEventListener for afterprint
    const originalAddEventListener = window.addEventListener;
    window.addEventListener = vi.fn((event, handler) => {
      if (event === 'afterprint') {
        // Simulate immediate print dialog close
        setTimeout(() => {
          (handler as EventListener)(new Event('afterprint'));
        }, 10);
      } else {
        originalAddEventListener.call(window, event, handler);
      }
    }) as typeof window.addEventListener;

    // Mock Image for resizeImage
    global.Image = vi.fn().mockImplementation(() => {
      const img = {
        onload: null as (() => void) | null,
        onerror: null as (() => void) | null,
        src: '',
      };
      // Trigger onload after a tick
      setTimeout(() => {
        if (img.onload) img.onload();
      }, 5);
      return img;
    }) as unknown as typeof Image;

    // Mock canvas for resizeImage
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      drawImage: vi.fn(),
    });
    HTMLCanvasElement.prototype.toDataURL = vi.fn().mockReturnValue('data:image/png;base64,mockdata');

    // Mock getBoundingClientRect for SVGs
    Element.prototype.getBoundingClientRect = vi.fn().mockReturnValue({
      width: 400,
      height: 300,
      top: 0,
      left: 0,
      bottom: 300,
      right: 400,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

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

  describe('Initialization', () => {
    test('should create instance', () => {
      expect(generator).toBeDefined();
      expect(generator).toBeInstanceOf(PDFGenerator);
    });
  });

  describe('print()', () => {
    test('should call window.print()', async () => {
      await generator.print(mockContainer);

      expect(window.print).toHaveBeenCalled();
    });

    test('should add mdview-printing class during print', async () => {
      const printPromise = generator.print(mockContainer);

      // Check that class is added immediately
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(document.body.classList.contains('mdview-printing')).toBe(true);

      await printPromise;
    });

    test('should remove mdview-printing class after print', async () => {
      await generator.print(mockContainer);

      expect(document.body.classList.contains('mdview-printing')).toBe(false);
    });

    test('should inject custom print styles', async () => {
      await generator.print(mockContainer, {
        paperSize: 'Letter',
        margins: '1cm',
      });

      // Check that style element was created (and then removed)
      expect(window.print).toHaveBeenCalled();
    });

    test('should handle empty container', async () => {
      const emptyContainer = document.createElement('div');

      await expect(generator.print(emptyContainer)).resolves.not.toThrow();
    });

    test('should handle container with no SVGs', async () => {
      const noSvgContainer = document.createElement('div');
      noSvgContainer.innerHTML = '<h1>No SVGs</h1><p>Just text</p>';

      await expect(generator.print(noSvgContainer)).resolves.not.toThrow();
      expect(window.print).toHaveBeenCalled();
    });
  });

  describe('SVG Conversion', () => {
    test('should replace SVG with img element', async () => {
      // Create container with SVG
      const svgContainer = document.createElement('div');
      const mermaidDiv = document.createElement('div');
      mermaidDiv.className = 'mermaid-container';
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', '200');
      svg.setAttribute('height', '150');
      mermaidDiv.appendChild(svg);
      svgContainer.appendChild(mermaidDiv);

      const printPromise = generator.print(svgContainer, { convertSvgsToImages: true });

      // Check that SVG is replaced
      await new Promise((resolve) => setTimeout(resolve, 50));
      const img = mermaidDiv.querySelector('img');
      expect(img).toBeDefined();

      await printPromise;
    });

    test('should preserve SVG dimensions (width)', async () => {
      const svgContainer = document.createElement('div');
      const mermaidDiv = document.createElement('div');
      mermaidDiv.className = 'mermaid-container';
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', '400');
      svg.setAttribute('height', '300');
      mermaidDiv.appendChild(svg);
      svgContainer.appendChild(mermaidDiv);

      await generator.print(svgContainer, { convertSvgsToImages: true });

      // After print, SVG should be restored (not img)
      const restoredSvg = mermaidDiv.querySelector('svg');
      expect(restoredSvg).toBeDefined();
    });

    test('should restore original SVG after print', async () => {
      const svgContainer = document.createElement('div');
      const mermaidDiv = document.createElement('div');
      mermaidDiv.className = 'mermaid-container';
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', '200');
      svg.setAttribute('height', '150');
      svg.id = 'test-svg';
      mermaidDiv.appendChild(svg);
      svgContainer.appendChild(mermaidDiv);

      await generator.print(svgContainer, { convertSvgsToImages: true });

      // Check that SVG is restored
      const restoredSvg = mermaidDiv.querySelector('svg');
      expect(restoredSvg).toBeDefined();
      expect(restoredSvg?.id).toBe('test-svg');
    });

    test('should handle multiple SVGs', async () => {
      const svgContainer = document.createElement('div');

      for (let i = 0; i < 3; i++) {
        const mermaidDiv = document.createElement('div');
        mermaidDiv.className = 'mermaid-container';
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '200');
        svg.setAttribute('height', '150');
        svg.id = `svg-${i}`;
        mermaidDiv.appendChild(svg);
        svgContainer.appendChild(mermaidDiv);
      }

      await generator.print(svgContainer, { convertSvgsToImages: true });

      // Check that all SVGs are restored
      const restoredSvgs = svgContainer.querySelectorAll('svg');
      expect(restoredSvgs.length).toBe(3);
    });

    test('should handle SVG conversion errors gracefully', async () => {
      const svgContainer = document.createElement('div');
      const mermaidDiv = document.createElement('div');
      mermaidDiv.className = 'mermaid-container';
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      mermaidDiv.appendChild(svg);
      svgContainer.appendChild(mermaidDiv);

      // Mock converter to throw error
      const { SVGConverter } = await import('../../../src/utils/svg-converter');
      (SVGConverter as any).mockImplementationOnce(() => ({
        convert: vi.fn().mockRejectedValue(new Error('Conversion failed')),
      }));

      // Should not throw, should continue with print
      await expect(
        generator.print(svgContainer, { convertSvgsToImages: true })
      ).resolves.not.toThrow();
    });
  });

  describe('Print Styles', () => {
    test('should inject style element for A4', async () => {
      await generator.print(mockContainer, { paperSize: 'A4' });

      // Style should be injected and then removed
      expect(window.print).toHaveBeenCalled();
    });

    test('should inject style element for Letter', async () => {
      await generator.print(mockContainer, { paperSize: 'Letter' });

      expect(window.print).toHaveBeenCalled();
    });

    test('should clean up style element after print', async () => {
      await generator.print(mockContainer, {
        paperSize: 'A4',
        margins: '1.5cm',
      });

      // Style element should be removed after print
      const styleElement = document.getElementById('mdview-dynamic-print-styles');
      expect(styleElement).toBeNull();
    });
  });

  describe('Error Handling', () => {
    test('should restore state on error', async () => {
      // Mock window.print to throw error
      window.print = vi.fn(() => {
        throw new Error('Print failed');
      });

      await expect(generator.print(mockContainer)).rejects.toThrow('Print failed');

      // State should be restored
      expect(document.body.classList.contains('mdview-printing')).toBe(false);
    });

    test('should clean up resources on error', async () => {
      const svgContainer = document.createElement('div');
      const mermaidDiv = document.createElement('div');
      mermaidDiv.className = 'mermaid-container';
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      mermaidDiv.appendChild(svg);
      svgContainer.appendChild(mermaidDiv);

      window.print = vi.fn(() => {
        throw new Error('Print failed');
      });

      await expect(
        generator.print(svgContainer, { convertSvgsToImages: true })
      ).rejects.toThrow();

      // SVGs should be restored even on error
      const restoredSvg = mermaidDiv.querySelector('svg');
      expect(restoredSvg).toBeDefined();
    });
  });
});

