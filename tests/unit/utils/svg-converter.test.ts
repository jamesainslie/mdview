/**
 * Tests for SVG Converter utility
 *
 * The SVGConverter now extracts SVG elements as vector images (format: 'svg')
 * for embedding in DOCX via the forked docx library with SVG support.
 * No rasterization occurs; dimensions are preserved as-is from the source SVG.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SVGConverter } from '../../../src/utils/svg-converter';

/**
 * Helper to create a mock SVG element
 */
function createMockSVG(id: string, width: number, height: number): SVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.id = id;
  svg.setAttribute('width', width.toString());
  svg.setAttribute('height', height.toString());
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

  // Add a simple shape for visibility
  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  rect.setAttribute('width', width.toString());
  rect.setAttribute('height', height.toString());
  rect.setAttribute('fill', 'blue');
  svg.appendChild(rect);

  return svg as unknown as SVGElement;
}

/**
 * Helper to create SVG with only viewBox (no width/height)
 */
function createSVGWithViewBox(id: string, viewBox: string): SVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.id = id;
  svg.setAttribute('viewBox', viewBox);

  const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  circle.setAttribute('cx', '50');
  circle.setAttribute('cy', '50');
  circle.setAttribute('r', '40');
  circle.setAttribute('fill', 'red');
  svg.appendChild(circle);

  return svg as unknown as SVGElement;
}

describe('SVGConverter', () => {
  let converter: SVGConverter;

  beforeEach(() => {
    converter = new SVGConverter();
  });

  describe('Basic Conversion', () => {
    it('should extract SVG as vector image', async () => {
      const svg = createMockSVG('test-svg', 200, 100);
      const result = await converter.convert(svg);

      expect(result.id).toBe('test-svg');
      expect(result.format).toBe('svg');
      expect(result.data).toBeTruthy();
      expect(result.data).not.toContain('data:');
      // SVG extraction preserves original dimensions (no scaling)
      expect(result.width).toBe(200);
      expect(result.height).toBe(100);
    });

    it('should always output SVG format regardless of options', async () => {
      const svg = createMockSVG('test-format', 150, 150);

      // Even if png or jpeg is requested, we now output svg
      const result = await converter.convert(svg, { format: 'png' });
      expect(result.format).toBe('svg');

      const result2 = await converter.convert(svg, { format: 'jpeg' });
      expect(result2.format).toBe('svg');
    });

    it('should preserve original dimensions (no scaling applied)', async () => {
      const svg = createMockSVG('test-scale', 100, 100);

      // Scale option is ignored for SVG output
      const result1x = await converter.convert(svg, { scale: 1 });
      expect(result1x.width).toBe(100);
      expect(result1x.height).toBe(100);

      const result3x = await converter.convert(svg, { scale: 3 });
      expect(result3x.width).toBe(100);
      expect(result3x.height).toBe(100);
    });
  });

  describe('Dimension Handling', () => {
    it('should extract dimensions from width/height attributes', async () => {
      const svg = createMockSVG('test-attrs', 300, 200);
      const result = await converter.convert(svg);

      expect(result.width).toBe(300);
      expect(result.height).toBe(200);
    });

    it('should extract dimensions from viewBox', async () => {
      const svg = createSVGWithViewBox('test-viewbox', '0 0 400 300');
      const result = await converter.convert(svg);

      expect(result.width).toBe(400);
      expect(result.height).toBe(300);
    });

    it('should handle viewBox with different offsets', async () => {
      const svg = createSVGWithViewBox('test-offset', '10 20 100 150');
      const result = await converter.convert(svg);

      expect(result.width).toBe(100);
      expect(result.height).toBe(150);
    });

    it('should handle SVGs without dimensions', async () => {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.id = 'test-no-dims';
      // No width, height, or viewBox

      const result = await converter.convert(svg as unknown as SVGElement);

      // Should use defaults (800x600)
      expect(result.width).toBe(800);
      expect(result.height).toBe(600);
    });

    it('should handle fractional dimensions', async () => {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.id = 'test-fractional';
      svg.setAttribute('width', '123.45');
      svg.setAttribute('height', '67.89');

      const result = await converter.convert(svg as unknown as SVGElement);

      expect(result.width).toBeCloseTo(123.45, 1);
      expect(result.height).toBeCloseTo(67.89, 1);
    });
  });

  describe('Batch Conversion', () => {
    it('should convert multiple SVGs', async () => {
      const svgs = [
        createMockSVG('svg1', 100, 100),
        createMockSVG('svg2', 150, 150),
        createMockSVG('svg3', 200, 200),
      ];

      const results = await converter.convertAll(svgs);

      expect(results.size).toBe(3);
      expect(results.has('svg1')).toBe(true);
      expect(results.has('svg2')).toBe(true);
      expect(results.has('svg3')).toBe(true);
    });

    it('should return map with correct IDs', async () => {
      const svgs = [createMockSVG('diagram-1', 100, 100), createMockSVG('diagram-2', 100, 100)];

      const results = await converter.convertAll(svgs);

      const image1 = results.get('diagram-1');
      const image2 = results.get('diagram-2');

      expect(image1).toBeDefined();
      expect(image2).toBeDefined();
      expect(image1?.id).toBe('diagram-1');
      expect(image2?.id).toBe('diagram-2');
    });

    it('should handle empty array', async () => {
      const results = await converter.convertAll([]);

      expect(results.size).toBe(0);
    });

    it('should continue on individual failures', async () => {
      const goodSvg = createMockSVG('good', 100, 100);

      // Create an SVG that might have issues
      const badSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      badSvg.id = 'bad';

      const results = await converter.convertAll([
        goodSvg,
        badSvg as unknown as SVGElement,
        createMockSVG('good2', 100, 100),
      ]);

      // Should have all of them (SVG extraction is robust)
      expect(results.has('good')).toBe(true);
      expect(results.has('good2')).toBe(true);
      expect(results.has('bad')).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle SVGs without ID', async () => {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', '100');
      svg.setAttribute('height', '100');

      const result = await converter.convert(svg as unknown as SVGElement);

      // Should generate an ID
      expect(result.id).toMatch(/^svg-\d+$/);
    });
  });

  describe('Output Format', () => {
    it('should return base64-encoded SVG', async () => {
      const svg = createMockSVG('base64-test', 100, 100);
      const result = await converter.convert(svg);

      // Should not start with "data:"
      expect(result.data).not.toMatch(/^data:/);

      // Should be valid base64
      expect(result.data).toMatch(/^[A-Za-z0-9+/]+=*$/);

      // Decode and verify it's SVG XML
      const decoded = atob(result.data);
      expect(decoded).toContain('<svg');
      expect(decoded).toContain('xmlns="http://www.w3.org/2000/svg"');
    });

    it('should include correct dimensions', async () => {
      const svg = createMockSVG('dims-test', 200, 150);
      const result = await converter.convert(svg);

      expect(result.width).toBe(200);
      expect(result.height).toBe(150);
    });

    it('should always include svg format in result', async () => {
      const svg = createMockSVG('format-test', 100, 100);

      const result = await converter.convert(svg);
      expect(result.format).toBe('svg');
    });

    it('should include xmlns attributes in output', async () => {
      const svg = createMockSVG('xmlns-test', 100, 100);
      const result = await converter.convert(svg);

      const decoded = atob(result.data);
      expect(decoded).toContain('xmlns="http://www.w3.org/2000/svg"');
      expect(decoded).toContain('xmlns:xlink="http://www.w3.org/1999/xlink"');
    });
  });

  describe('Real-world Scenarios', () => {
    it('should handle mermaid-style SVG', async () => {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.id = 'mermaid-diagram-1';
      svg.setAttribute('viewBox', '0 0 800 600');
      svg.setAttribute('class', 'mermaid-svg');

      // Add some mermaid-like content
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', '10');
      rect.setAttribute('y', '10');
      rect.setAttribute('width', '100');
      rect.setAttribute('height', '50');
      rect.setAttribute('fill', '#3498db');
      g.appendChild(rect);
      svg.appendChild(g);

      const result = await converter.convert(svg as unknown as SVGElement);

      expect(result.id).toBe('mermaid-diagram-1');
      expect(result.format).toBe('svg');
      // SVG extraction preserves original dimensions
      expect(result.width).toBe(800);
      expect(result.height).toBe(600);
    });

    it('should handle complex nested SVG structures', async () => {
      const svg = createMockSVG('complex', 300, 200);

      // Add nested groups
      const g1 = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      const g2 = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', '150');
      circle.setAttribute('cy', '100');
      circle.setAttribute('r', '50');
      g2.appendChild(circle);
      g1.appendChild(g2);
      svg.appendChild(g1);

      const result = await converter.convert(svg);

      expect(result).toBeDefined();
      expect(result.data).toBeTruthy();
      expect(result.format).toBe('svg');

      // Verify the nested structure is preserved
      const decoded = atob(result.data);
      expect(decoded).toContain('<circle');
      expect(decoded).toContain('<g>');
    });

    it('should use mermaid container ID when available', async () => {
      // Create a mermaid container with the SVG inside
      const container = document.createElement('div');
      container.id = 'mermaid-container-123';
      container.className = 'mermaid-container';

      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.id = 'internal-svg-id';
      svg.setAttribute('width', '100');
      svg.setAttribute('height', '100');
      container.appendChild(svg);
      document.body.appendChild(container);

      try {
        const result = await converter.convert(svg as unknown as SVGElement);
        // Should prefer the container ID
        expect(result.id).toBe('mermaid-container-123');
      } finally {
        document.body.removeChild(container);
      }
    });
  });
});
