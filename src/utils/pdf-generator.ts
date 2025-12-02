/**
 * PDF Generator
 * Handles PDF export via browser print with SVG-to-image conversion
 */

import type { PDFGeneratorOptions, ProgressCallback, ExportProgress } from '../types';
import { debug } from './debug-logger';

export class PDFGenerator {
  private originalSvgs: Map<Element, { element: SVGElement; parent: Element; html: string }> =
    new Map();
  private printStyleElement: HTMLStyleElement | null = null;
  private replacedImages: Element[] = [];

  constructor() {
    debug.info('PDFGenerator', 'PDF Generator initialized');
  }

  /**
   * Prepare document for print and trigger print dialog
   *
   * Progress mapping:
   * - 5–25%  : Collecting diagrams / DOM state
   * - 30–80% : Converting SVG diagrams to images
   * - 85–95% : Applying print styles and opening dialog
   */
  async print(
    container: HTMLElement,
    options: PDFGeneratorOptions = {},
    onProgress?: ProgressCallback,
    signal?: AbortSignal
  ): Promise<void> {
    debug.info('PDFGenerator', 'Starting print process');

    try {
      this.ensureNotAborted(signal);
      this.reportProgress(onProgress, 'collecting', 5, 'Preparing document for print...');

      // Ensure all Mermaid diagrams are rendered before conversion
      this.reportProgress(onProgress, 'collecting', 15, 'Rendering diagrams...');
      try {
        const { mermaidRenderer } = await import('../renderers/mermaid-renderer');
        // Bypass lazy loading: render every diagram in the container now
        await mermaidRenderer.renderAllImmediate(container);
      } catch (error) {
        debug.warn('PDFGenerator', 'Could not force-render Mermaid diagrams:', error);
      }

      // Quick sanity check on diagram state
      await this.waitForMermaidDiagrams(container);
      this.ensureNotAborted(signal);
      this.reportProgress(onProgress, 'collecting', 25, 'Diagrams ready for conversion');

      // Prepare for print
      if (options.convertSvgsToImages !== false) {
        await this.prepareSvgsForPrint(container, options, onProgress, signal);
      }

      this.ensureNotAborted(signal);

      this.reportProgress(onProgress, 'generating', 85, 'Applying print styles...');
      this.addPrintClass();
      this.injectPrintStyles(options);

      // Small delay to ensure styles are applied
      await new Promise((resolve) => setTimeout(resolve, 100));

      this.ensureNotAborted(signal);

      // Trigger print
      this.reportProgress(onProgress, 'generating', 90, 'Opening print dialog...');
      debug.info('PDFGenerator', 'Opening print dialog');
      window.print();

      // Wait for dialog to close
      await this.waitForPrintDialog();

      this.reportProgress(onProgress, 'generating', 100, 'Print dialog closed');
      debug.info('PDFGenerator', 'Print dialog closed');
    } catch (error) {
      debug.error('PDFGenerator', 'Print failed:', error);
      throw error;
    } finally {
      // Restore state
      this.restoreSvgs();
      this.removePrintClass();
      this.removePrintStyles();
      debug.info('PDFGenerator', 'State restored after print');
    }
  }

  /**
   * Check for Mermaid diagrams - warn if any are still pending
   */
  private async waitForMermaidDiagrams(container: HTMLElement): Promise<void> {
    // Get diagram counts
    const readyCount = container.querySelectorAll('.mermaid-container.mermaid-ready').length;
    const pendingCount = container.querySelectorAll('.mermaid-container.mermaid-pending').length;

    if (readyCount === 0 && pendingCount === 0) {
      debug.info('PDFGenerator', 'No Mermaid diagrams in document');
      return;
    }

    debug.info('PDFGenerator', `Diagrams: ${readyCount} ready, ${pendingCount} pending`);

    if (pendingCount > 0) {
      debug.warn(
        'PDFGenerator',
        `${pendingCount} diagram(s) not yet rendered. Scroll through document first to render all diagrams.`
      );
    }

    // Small delay to ensure DOM is stable
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  /**
   * Convert SVGs to images for print compatibility
   * Scales diagrams based on target page size to avoid squashing.
   */
  private prepareSvgsForPrint(
    container: HTMLElement,
    options: PDFGeneratorOptions,
    onProgress?: ProgressCallback,
    signal?: AbortSignal
  ): Promise<void> {
    debug.info('PDFGenerator', 'Preparing SVGs for print');

    const svgs = container.querySelectorAll('.mermaid-container svg');
    debug.info('PDFGenerator', `Found ${svgs.length} SVGs to convert`);

    if (svgs.length === 0) {
      return;
    }

    const total = svgs.length;

    const paperSize = options.paperSize ?? 'A4';
    const margins = options.margins ?? '2cm';
    const orientation = options.orientation ?? 'portrait';
    const { width: maxContentWidth, height: maxContentHeight } = this.getPrintableContentBox(
      paperSize,
      margins,
      orientation
    );

    this.reportProgress(
      onProgress,
      'converting',
      30,
      total === 1 ? 'Converting diagram for print...' : 'Converting diagrams for print...'
    );

    let index = 0;

    for (const svg of svgs) {
      this.ensureNotAborted(signal);

      const svgElement = svg as SVGElement;
      const parent = svg.parentElement;

      if (!parent) {
        debug.warn('PDFGenerator', 'SVG has no parent, skipping');
        continue;
      }

      // Store original SVG and its parent
      this.originalSvgs.set(svg, {
        element: svgElement,
        parent: parent,
        html: svg.outerHTML,
      });

      // First, get the SVG's natural dimensions
      const svgRect = svgElement.getBoundingClientRect();
      const naturalWidth = svgRect.width || 800;
      const naturalHeight = svgRect.height || 600;

      // Compute the target dimensions to fit within one page
      // Reserve 40px for borders, margins, and padding around the diagram
      const reservedSpace = 40;
      const availableWidth = maxContentWidth - reservedSpace;
      const availableHeight = maxContentHeight - reservedSpace;
      
      const scaleToWidth = availableWidth / naturalWidth;
      const scaleToHeight = availableHeight / naturalHeight;
      const scaleFactor = Math.min(1, scaleToWidth, scaleToHeight);

      // Target dimensions in CSS pixels
      const targetWidth = Math.round(naturalWidth * scaleFactor);
      const targetHeight = Math.round(naturalHeight * scaleFactor);

      debug.info(
        'PDFGenerator',
        `Diagram ${index}: natural=${naturalWidth.toFixed(0)}x${naturalHeight.toFixed(0)}, ` +
          `maxContent=${maxContentWidth.toFixed(0)}x${maxContentHeight.toFixed(0)}, ` +
          `scale=${scaleFactor.toFixed(3)}, target=${targetWidth}x${targetHeight}`
      );

      // For PDF export we prefer the browser's high‑quality, theme‑aware SVG
      // rendering rather than the wasm-based PNGs used for DOCX. Here we
      // simply clone and scale the SVG element itself so that labels and
      // styling match what you see in the MDView page.
      const scaledSvg = svgElement.cloneNode(true) as SVGElement;
      scaledSvg.setAttribute('width', String(targetWidth));
      scaledSvg.setAttribute('height', String(targetHeight));
      scaledSvg.style.cssText = `
        display: block !important;
        width: ${targetWidth}px !important;
        height: ${targetHeight}px !important;
        max-width: ${maxContentWidth}px !important;
        max-height: ${maxContentHeight}px !important;
        margin: 8pt auto !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      `;
      const replacement = scaledSvg as unknown as HTMLElement;

      debug.info('PDFGenerator', `Scaled SVG directly for print: ${targetWidth}x${targetHeight}`);

      // Replace original SVG
      parent.replaceChild(replacement, svg);
      this.replacedImages.push(replacement);

      index += 1;

      // Progress update
      const fraction = index / total;
      const progress = 35 + Math.round(fraction * 45);
      const message =
        total === 1
          ? 'Prepared diagram for print'
          : `Preparing diagrams for print (${index}/${total})...`;
      this.reportProgress(onProgress, 'converting', Math.min(progress, 80), message);
    }

    debug.info('PDFGenerator', `Prepared ${this.replacedImages.length} SVGs for print (scaled SVGs)`);
  }

  /**
   * Restore original SVGs after print
   */
  private restoreSvgs(): void {
    debug.info('PDFGenerator', 'Restoring original SVGs');

    this.originalSvgs.forEach((data) => {
      try {
        // Find the img element that replaced this SVG
        const img = this.replacedImages.find((el) => el.parentElement === data.parent);

        if (img && data.parent) {
          // Create a new SVG element from the stored HTML
          const temp = document.createElement('div');
          temp.innerHTML = data.html;
          const restoredSvg = temp.firstElementChild;

          if (restoredSvg) {
            data.parent.replaceChild(restoredSvg, img);
            debug.debug('PDFGenerator', 'Restored SVG');
          }
        }
      } catch (error) {
        debug.error('PDFGenerator', 'Failed to restore SVG:', error);
      }
    });

    // Clear tracking
    this.originalSvgs.clear();
    this.replacedImages = [];

    debug.info('PDFGenerator', 'SVG restoration complete');
  }

  /**
   * Add print class to body
   */
  private addPrintClass(): void {
    document.body.classList.add('mdview-printing');
    debug.debug('PDFGenerator', 'Added print class');
  }

  /**
   * Remove print class from body
   */
  private removePrintClass(): void {
    document.body.classList.remove('mdview-printing');
    debug.debug('PDFGenerator', 'Removed print class');
  }

  /**
   * Inject dynamic print styles
   */
  private injectPrintStyles(options: PDFGeneratorOptions): void {
    if (this.printStyleElement) {
      this.removePrintStyles();
    }

    const { paperSize = 'A4', orientation = 'portrait', margins = '2cm' } = options;

    const styles = `
      @media print {
        @page {
          size: ${paperSize} ${orientation};
          margin: ${margins};
        }
      }
    `;

    this.printStyleElement = document.createElement('style');
    this.printStyleElement.id = 'mdview-dynamic-print-styles';
    this.printStyleElement.textContent = styles;
    document.head.appendChild(this.printStyleElement);

    debug.debug(
      'PDFGenerator',
      `Injected print styles: ${paperSize} ${orientation}, margins: ${margins}`
    );
  }

  /**
   * Remove dynamic print styles
   */
  private removePrintStyles(): void {
    if (this.printStyleElement) {
      this.printStyleElement.remove();
      this.printStyleElement = null;
      debug.debug('PDFGenerator', 'Removed print styles');
    }
  }

  /**
   * Wait for print dialog to close (with short timeout)
   */
  private waitForPrintDialog(): Promise<void> {
    return new Promise((resolve) => {
      // The afterprint event fires when the dialog closes
      const handler = () => {
        window.removeEventListener('afterprint', handler);
        setTimeout(resolve, 50);
      };

      window.addEventListener('afterprint', handler);

      // Very short fallback - print dialog should open immediately
      // If it doesn't fire within 2 seconds, just continue
      setTimeout(() => {
        window.removeEventListener('afterprint', handler);
        resolve();
      }, 2000);
    });
  }

  /**
   * Standard paper sizes in inches (width x height in portrait)
   */
  private static readonly PAPER_SIZES: Record<string, { width: number; height: number }> = {
    // ISO A-series (mm converted to inches)
    A0: { width: 33.11, height: 46.81 }, // 841 x 1189 mm
    A1: { width: 23.39, height: 33.11 }, // 594 x 841 mm
    A3: { width: 11.69, height: 16.54 }, // 297 x 420 mm
    A4: { width: 8.27, height: 11.69 }, // 210 x 297 mm
    A5: { width: 5.83, height: 8.27 }, // 148 x 210 mm
    A6: { width: 4.13, height: 5.83 }, // 105 x 148 mm
    // North American sizes
    Letter: { width: 8.5, height: 11.0 }, // 8.5 x 11 in
    Legal: { width: 8.5, height: 14.0 }, // 8.5 x 14 in
    Tabloid: { width: 11.0, height: 17.0 }, // 11 x 17 in
    Executive: { width: 7.25, height: 10.5 }, // 7.25 x 10.5 in
  };

  /**
   * Helper: compute printable content box (width/height) in CSS pixels
   */
  private getPrintableContentBox(
    paperSize: string,
    margins: string,
    orientation: 'portrait' | 'landscape'
  ): { width: number; height: number } {
    const dpi = 96; // CSS pixels per inch

    // Get paper dimensions, default to A4 if unknown
    const paper = PDFGenerator.PAPER_SIZES[paperSize] || PDFGenerator.PAPER_SIZES.A4;
    let pageWidthInches = paper.width;
    let pageHeightInches = paper.height;

    // Swap for landscape
    if (orientation === 'landscape') {
      [pageWidthInches, pageHeightInches] = [pageHeightInches, pageWidthInches];
    }

    // Parse margin value; assume symmetric margins on all sides
    let marginPx = (2 / 2.54) * dpi; // Default 2cm in px
    const match = margins.match(/([\d.]+)\s*(cm|mm|in|px)/i);

    if (match) {
      const value = parseFloat(match[1]);
      const unit = match[2].toLowerCase();

      if (!Number.isNaN(value)) {
        switch (unit) {
          case 'cm':
            marginPx = (value / 2.54) * dpi;
            break;
          case 'mm':
            marginPx = (value / 25.4) * dpi;
            break;
          case 'in':
            marginPx = value * dpi;
            break;
          case 'px':
            marginPx = value;
            break;
        }
      }
    }

    const totalMarginX = marginPx * 2;
    const totalMarginY = marginPx * 2;

    const pageWidthPx = pageWidthInches * dpi;
    const pageHeightPx = pageHeightInches * dpi;

    const contentWidth = pageWidthPx - totalMarginX;
    const contentHeight = pageHeightPx - totalMarginY;

    // Guard against negative or very small values
    return {
      width: Math.max(200, contentWidth),
      height: Math.max(200, contentHeight),
    };
  }

  /**
   * Helper: report progress if a callback is provided
   */
  private reportProgress(
    onProgress: ProgressCallback | undefined,
    stage: ExportProgress['stage'],
    progress: number,
    message: string
  ): void {
    if (!onProgress) return;
    onProgress({ stage, progress, message });
  }

  /**
   * Helper: throw if an abort signal has been triggered
   */
  private ensureNotAborted(signal?: AbortSignal): void {
    if (signal?.aborted) {
      throw new DOMException('Export aborted', 'AbortError');
    }
  }
}
