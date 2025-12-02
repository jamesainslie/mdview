/**
 * SVG Converter
 * Extracts SVG elements as vector images for document embedding.
 *
 * This implementation serializes SVG elements directly to XML strings,
 * avoiding rasterization entirely. The forked docx library (jamesainslie/docx)
 * supports embedding SVG images natively via mimeType: 'image/svg+xml'.
 *
 * Important: Mermaid diagrams use <foreignObject> elements for text labels
 * in many diagram types. Word does not support <foreignObject>, so we
 * convert these to native SVG <text> elements before export.
 */

import type { SVGConversionOptions, ConvertedImage } from '../types';
import { debug } from './debug-logger';

/**
 * Converts SVG elements to embeddable image formats (now SVG-native)
 */
export class SVGConverter {
  /**
   * Convert a single SVG element to an embeddable image.
   * Returns the SVG as a base64-encoded string with format 'svg'.
   */
  convert(svg: SVGElement, _options: SVGConversionOptions = {}): ConvertedImage {
    // Prefer the Mermaid container ID so that it matches ContentCollector's
    // mermaid node IDs (e.g. "mermaid-xyz"), falling back to the SVG ID.
    const container = svg.closest<HTMLElement>('.mermaid-container');
    const id = container?.id || svg.id || `svg-${Date.now()}`;

    debug.info('SVGConverter', `Extracting SVG ${id} as vector image`);

    // Get SVG dimensions
    const { width, height } = this.getSVGDimensions(svg);

    debug.debug('SVGConverter', `Dimensions: ${width}x${height}`);

    // Clone and normalize the SVG for export
    const exportSvg = this.prepareSvgForExport(svg, width, height);

    // Convert foreignObject elements to native SVG text (for Word compatibility)
    this.convertForeignObjectsToText(exportSvg);

    // Serialize to string
    let svgMarkup = new XMLSerializer().serializeToString(exportSvg);

    // Post-process SVG string for Word compatibility
    svgMarkup = this.fixSvgForWordCompatibility(svgMarkup);

    // Base64 encode the SVG XML
    const base64Data = this.stringToBase64(svgMarkup);

    debug.info('SVGConverter', `Successfully extracted SVG ${id} (${width}x${height})`);

    return {
      id,
      data: base64Data,
      width,
      height,
      format: 'svg',
    };
  }

  /**
   * Prepare SVG for export: clone, set explicit dimensions, ensure namespace,
   * and inline computed styles for Word compatibility.
   */
  private prepareSvgForExport(svg: SVGElement, width: number, height: number): SVGElement {
    const clone = svg.cloneNode(true) as SVGElement;

    // Set explicit dimensions
    clone.setAttribute('width', String(width));
    clone.setAttribute('height', String(height));

    // Ensure xmlns attributes are present (required for standalone SVG)
    if (!clone.getAttribute('xmlns')) {
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    }
    if (!clone.getAttribute('xmlns:xlink')) {
      clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
    }

    // Inline computed styles for all elements (Word doesn't process CSS well)
    this.inlineAllStyles(svg, clone);

    return clone;
  }

  /**
   * Inline computed styles from the original SVG to the clone.
   * This ensures all styling survives when embedded in Word.
   */
  private inlineAllStyles(originalSvg: SVGElement, cloneSvg: SVGElement): void {
    // Get all elements that could have visual styles
    const selectors = [
      'path',
      'line',
      'polyline',
      'polygon',
      'rect',
      'circle',
      'ellipse',
      'text',
      'tspan',
      'g',
    ];

    for (const selector of selectors) {
      const originalElements = Array.from(originalSvg.querySelectorAll(selector));
      const cloneElements = Array.from(cloneSvg.querySelectorAll(selector));

      if (originalElements.length !== cloneElements.length) {
        debug.debug(
          'SVGConverter',
          `Element count mismatch for "${selector}": ${originalElements.length} vs ${cloneElements.length}`
        );
        continue;
      }

      originalElements.forEach((originalEl, index) => {
        const cloneEl = cloneElements[index] as SVGElement;
        if (!cloneEl) return;

        this.inlineSingleElementStyles(originalEl as SVGElement, cloneEl);
      });
    }

    // Also process elements inside defs (markers, etc.)
    this.inlineDefsStyles(originalSvg, cloneSvg);

    debug.info('SVGConverter', 'Inlined all computed styles for Word compatibility');
  }

  /**
   * Inline all relevant computed styles for a single element.
   */
  private inlineSingleElementStyles(original: SVGElement, clone: SVGElement): void {
    try {
      const computed = window.getComputedStyle(original);

      // Common properties for all elements
      const fill = computed.fill;
      if (fill && fill !== 'none' && !fill.startsWith('url(')) {
        clone.setAttribute('fill', fill);
      } else if (!clone.hasAttribute('fill') && original.tagName.toLowerCase() !== 'g') {
        // Preserve 'none' explicitly if that's what it should be
        const originalFill = original.getAttribute('fill');
        if (originalFill) {
          clone.setAttribute('fill', originalFill);
        }
      }

      const stroke = computed.stroke;
      if (stroke && stroke !== 'none') {
        clone.setAttribute('stroke', stroke);
      }

      const strokeWidth = computed.strokeWidth;
      if (strokeWidth && strokeWidth !== '0' && strokeWidth !== '0px') {
        clone.setAttribute('stroke-width', strokeWidth);
      }

      // Stroke dash array (for dashed lines)
      // Important: stroke-dasharray:0 causes lines to disappear in Word
      // Convert "0" to "none" for compatibility
      const strokeDasharray = computed.strokeDasharray;
      if (strokeDasharray && strokeDasharray !== 'none') {
        // Fix: stroke-dasharray of "0" should be "none" for Word compatibility
        const fixedDasharray = strokeDasharray === '0' || strokeDasharray === '0px' ? 'none' : strokeDasharray;
        if (fixedDasharray !== 'none') {
          clone.setAttribute('stroke-dasharray', fixedDasharray);
        }
      }

      // Stroke line cap and join
      const strokeLinecap = computed.strokeLinecap;
      if (strokeLinecap && strokeLinecap !== 'butt') {
        clone.setAttribute('stroke-linecap', strokeLinecap);
      }

      const strokeLinejoin = computed.strokeLinejoin;
      if (strokeLinejoin && strokeLinejoin !== 'miter') {
        clone.setAttribute('stroke-linejoin', strokeLinejoin);
      }

      // Opacity
      const opacity = computed.opacity;
      if (opacity && opacity !== '1') {
        clone.setAttribute('opacity', opacity);
      }

      // Text-specific properties
      const tagName = original.tagName.toLowerCase();
      if (tagName === 'text' || tagName === 'tspan') {
        const fontSize = computed.fontSize;
        if (fontSize) {
          clone.setAttribute('font-size', fontSize);
        }

        const fontFamily = computed.fontFamily;
        if (fontFamily) {
          clone.setAttribute('font-family', fontFamily.replace(/["']/g, ''));
        }

        const fontWeight = computed.fontWeight;
        if (fontWeight && fontWeight !== 'normal' && fontWeight !== '400') {
          clone.setAttribute('font-weight', fontWeight);
        }

        const textAnchor = computed.textAnchor;
        if (textAnchor && textAnchor !== 'start') {
          clone.setAttribute('text-anchor', textAnchor);
        }

        const dominantBaseline = computed.dominantBaseline;
        if (dominantBaseline && dominantBaseline !== 'auto') {
          clone.setAttribute('dominant-baseline', dominantBaseline);
        }
      }

      // Preserve marker references (these are URL references, not computed styles)
      const markerEnd = original.getAttribute('marker-end');
      if (markerEnd) {
        clone.setAttribute('marker-end', markerEnd);
      }

      const markerStart = original.getAttribute('marker-start');
      if (markerStart) {
        clone.setAttribute('marker-start', markerStart);
      }

      const markerMid = original.getAttribute('marker-mid');
      if (markerMid) {
        clone.setAttribute('marker-mid', markerMid);
      }
    } catch (error) {
      // getComputedStyle can fail for detached elements
      debug.debug('SVGConverter', `Could not get computed style for element`);
    }
  }

  /**
   * Inline styles for elements inside defs (markers, gradients, etc.)
   */
  private inlineDefsStyles(originalSvg: SVGElement, cloneSvg: SVGElement): void {
    const originalDefs = originalSvg.querySelector('defs');
    const cloneDefs = cloneSvg.querySelector('defs');

    if (!originalDefs || !cloneDefs) return;

    // Process all shape elements inside defs
    const selectors = ['path', 'polygon', 'circle', 'rect', 'line', 'polyline'];

    for (const selector of selectors) {
      const originalElements = Array.from(originalDefs.querySelectorAll(selector));
      const cloneElements = Array.from(cloneDefs.querySelectorAll(selector));

      if (originalElements.length !== cloneElements.length) continue;

      originalElements.forEach((originalEl, index) => {
        const cloneEl = cloneElements[index] as SVGElement;
        if (!cloneEl) return;

        // For defs elements, we need to be more aggressive about inlining
        // since they might not be in the document flow
        try {
          const computed = window.getComputedStyle(originalEl);

          const fill = computed.fill;
          if (fill && fill !== 'none') {
            cloneEl.setAttribute('fill', fill);
          }

          const stroke = computed.stroke;
          if (stroke && stroke !== 'none') {
            cloneEl.setAttribute('stroke', stroke);
          }
        } catch {
          // If we can't get computed styles, copy the original attributes
          const fill = (originalEl as SVGElement).getAttribute('fill');
          if (fill) cloneEl.setAttribute('fill', fill);

          const stroke = (originalEl as SVGElement).getAttribute('stroke');
          if (stroke) cloneEl.setAttribute('stroke', stroke);
        }
      });
    }

    debug.debug('SVGConverter', 'Processed defs elements');
  }

  /**
   * Fix SVG string for Word compatibility issues.
   * - stroke-dasharray:0 causes lines to disappear in Word
   * - Some style attributes need adjustment
   */
  private fixSvgForWordCompatibility(svgMarkup: string): string {
    // Fix stroke-dasharray:0 which causes lines to disappear in Word
    // This can appear in style attributes or as standalone attributes
    let fixed = svgMarkup;

    // Fix in style attributes: stroke-dasharray:0; or stroke-dasharray: 0;
    fixed = fixed.replace(/stroke-dasharray:\s*0\s*;/g, 'stroke-dasharray:none;');
    fixed = fixed.replace(/stroke-dasharray:\s*0px\s*;/g, 'stroke-dasharray:none;');

    // Fix as standalone attribute: stroke-dasharray="0"
    fixed = fixed.replace(/stroke-dasharray="0"/g, 'stroke-dasharray="none"');
    fixed = fixed.replace(/stroke-dasharray="0px"/g, 'stroke-dasharray="none"');

    // Remove any stroke-dasharray="none" as it's the default
    // (This reduces file size and avoids potential issues)
    fixed = fixed.replace(/\s*stroke-dasharray="none"/g, '');

    debug.debug('SVGConverter', 'Applied Word compatibility fixes to SVG');

    return fixed;
  }

  /**
   * Convert foreignObject elements to native SVG text elements.
   * Word does not support foreignObject, which Mermaid uses for HTML labels.
   * This extracts the text content and creates SVG text elements instead.
   */
  private convertForeignObjectsToText(svg: SVGElement): void {
    const foreignObjects = svg.querySelectorAll('foreignObject');
    const existingTextElements = svg.querySelectorAll('text');
    let convertedCount = 0;

    debug.info(
      'SVGConverter',
      `SVG analysis: ${foreignObjects.length} foreignObjects, ${existingTextElements.length} existing text elements`
    );

    // Log sample of existing text elements
    if (existingTextElements.length > 0) {
      const samples = Array.from(existingTextElements).slice(0, 3);
      samples.forEach((text, i) => {
        debug.debug(
          'SVGConverter',
          `Existing text[${i}]: "${text.textContent?.substring(0, 50)}"`
        );
      });
    }

    foreignObjects.forEach((fo) => {
      try {
        // Get position and dimensions from foreignObject
        const x = parseFloat(fo.getAttribute('x') || '0');
        const y = parseFloat(fo.getAttribute('y') || '0');
        const foWidth = parseFloat(fo.getAttribute('width') || '100');
        const foHeight = parseFloat(fo.getAttribute('height') || '20');

        // Extract text content from the HTML inside foreignObject
        const textContent = this.extractTextFromHtml(fo);

        if (!textContent.trim()) {
          // No text content, just remove the foreignObject
          fo.parentNode?.removeChild(fo);
          return;
        }

        // Create SVG text element
        const textElement = document.createElementNS('http://www.w3.org/2000/svg', 'text');

        // Position text in the center of where foreignObject was
        // Add half height to y because SVG text is positioned by baseline
        textElement.setAttribute('x', String(x + foWidth / 2));
        textElement.setAttribute('y', String(y + foHeight / 2));
        textElement.setAttribute('text-anchor', 'middle');
        textElement.setAttribute('dominant-baseline', 'middle');

        // Extract and apply styles from the HTML content
        const styles = this.extractStylesFromForeignObject(fo);
        if (styles.fontSize) {
          textElement.setAttribute('font-size', styles.fontSize);
        } else {
          textElement.setAttribute('font-size', '14px');
        }
        if (styles.fontFamily) {
          textElement.setAttribute('font-family', styles.fontFamily);
        } else {
          textElement.setAttribute('font-family', 'sans-serif');
        }
        if (styles.fill) {
          textElement.setAttribute('fill', styles.fill);
        } else {
          textElement.setAttribute('fill', '#333');
        }
        if (styles.fontWeight) {
          textElement.setAttribute('font-weight', styles.fontWeight);
        }

        // Handle multi-line text by creating tspan elements
        const lines = textContent.split('\n').filter((line) => line.trim());
        if (lines.length === 1) {
          textElement.textContent = lines[0].trim();
        } else {
          // Multi-line text: use tspan elements
          const lineHeight = parseFloat(styles.fontSize || '14') * 1.2;
          const startY = y + foHeight / 2 - ((lines.length - 1) * lineHeight) / 2;

          lines.forEach((line, index) => {
            const tspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
            tspan.setAttribute('x', String(x + foWidth / 2));
            tspan.setAttribute('dy', index === 0 ? '0' : String(lineHeight));
            tspan.textContent = line.trim();
            textElement.appendChild(tspan);
          });

          // Adjust the y position for multi-line
          textElement.setAttribute('y', String(startY));
        }

        // Replace foreignObject with text element
        const parent = fo.parentNode;
        if (parent) {
          parent.insertBefore(textElement, fo);
          parent.removeChild(fo);
          convertedCount++;
        }
      } catch (error) {
        debug.warn('SVGConverter', `Failed to convert foreignObject to text:`, error);
        // Remove the problematic foreignObject anyway
        fo.parentNode?.removeChild(fo);
      }
    });

    if (convertedCount > 0) {
      debug.info('SVGConverter', `Converted ${convertedCount} foreignObject elements to SVG text`);
    }
  }

  /**
   * Extract plain text content from HTML inside foreignObject.
   */
  private extractTextFromHtml(fo: Element): string {
    // Get all text content, preserving some structure
    const html = fo.innerHTML;

    // Create a temporary element to parse the HTML
    const temp = document.createElement('div');
    temp.innerHTML = html;

    // Extract text, converting <br> and block elements to newlines
    const extractText = (node: Node): string => {
      if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent || '';
      }

      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as Element;
        const tagName = el.tagName.toLowerCase();

        // Block elements and br create line breaks
        const isBlock = ['div', 'p', 'br', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(
          tagName
        );
        const prefix = isBlock && el.previousSibling ? '\n' : '';

        let text = prefix;
        el.childNodes.forEach((child) => {
          text += extractText(child);
        });

        return text;
      }

      return '';
    };

    return extractText(temp).trim();
  }

  /**
   * Extract CSS styles from the HTML content inside foreignObject.
   */
  private extractStylesFromForeignObject(
    fo: Element
  ): { fontSize?: string; fontFamily?: string; fill?: string; fontWeight?: string } {
    const styles: { fontSize?: string; fontFamily?: string; fill?: string; fontWeight?: string } =
      {};

    // Look for styled elements inside the foreignObject
    const styledElements = fo.querySelectorAll('[style], span, div, p');

    for (const el of styledElements) {
      const htmlEl = el as HTMLElement;
      const computedStyle = htmlEl.style;

      // Try to get font-size
      if (!styles.fontSize && computedStyle.fontSize) {
        styles.fontSize = computedStyle.fontSize;
      }

      // Try to get font-family
      if (!styles.fontFamily && computedStyle.fontFamily) {
        styles.fontFamily = computedStyle.fontFamily;
      }

      // Try to get color (becomes fill in SVG)
      if (!styles.fill && computedStyle.color) {
        styles.fill = computedStyle.color;
      }

      // Try to get font-weight
      if (!styles.fontWeight && computedStyle.fontWeight) {
        styles.fontWeight = computedStyle.fontWeight;
      }
    }

    // Also check the foreignObject itself for transform styles
    const foStyle = (fo as HTMLElement).getAttribute('style');
    if (foStyle) {
      const fontSizeMatch = foStyle.match(/font-size:\s*([^;]+)/i);
      if (fontSizeMatch && !styles.fontSize) {
        styles.fontSize = fontSizeMatch[1].trim();
      }
    }

    return styles;
  }

  /**
   * Convert a string to base64.
   */
  private stringToBase64(str: string): string {
    // Handle Unicode characters by encoding to UTF-8 first
    const bytes = new TextEncoder().encode(str);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Convert multiple SVGs in batch
   */
  convertAll(svgs: SVGElement[]): Map<string, ConvertedImage> {
    debug.info('SVGConverter', `Extracting ${svgs.length} SVGs`);

    const results = new Map<string, ConvertedImage>();

    for (const svg of svgs) {
      try {
        const image = this.convert(svg);
        results.set(image.id, image);
      } catch (error) {
        debug.error('SVGConverter', `Failed to extract SVG ${svg.id}:`, error);
        // Continue with other SVGs
      }
    }

    debug.info('SVGConverter', `Successfully extracted ${results.size}/${svgs.length} SVGs`);

    return results;
  }

  /**
   * Extract dimensions from SVG element
   */
  private getSVGDimensions(svg: SVGElement): { width: number; height: number } {
    // Try width/height attributes first
    const widthAttr = svg.getAttribute('width');
    const heightAttr = svg.getAttribute('height');

    if (widthAttr && heightAttr) {
      const width = parseFloat(widthAttr);
      const height = parseFloat(heightAttr);
      if (!isNaN(width) && !isNaN(height)) {
        return { width, height };
      }
    }

    // Try viewBox
    const viewBox = svg.getAttribute('viewBox');
    if (viewBox) {
      const parts = viewBox.split(/\s+|,/);
      if (parts.length === 4) {
        const width = parseFloat(parts[2]);
        const height = parseFloat(parts[3]);
        if (!isNaN(width) && !isNaN(height)) {
          return { width, height };
        }
      }
    }

    // Try getBoundingClientRect as fallback
    const rect = svg.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      return { width: rect.width, height: rect.height };
    }

    // Default dimensions
    debug.warn('SVGConverter', 'Could not determine SVG dimensions, using defaults');
    return { width: 800, height: 600 };
  }
}
