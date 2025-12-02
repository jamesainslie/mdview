/**
 * Export Controller
 * Orchestrates the document export process
 */

import type { ExportOptions, ExportProgress, ProgressCallback, ExportFormat } from '../types';
import { ContentCollector } from '../utils/content-collector';
import { SVGConverter } from '../utils/svg-converter';
import { debug } from '../utils/debug-logger';

/**
 * Controls the export process from content collection to file download
 */
export class ExportController {
  /**
   * Export the rendered markdown to the specified format
   */
  async export(
    container: HTMLElement,
    options: ExportOptions,
    onProgress?: ProgressCallback
  ): Promise<void> {
    const report = (stage: ExportProgress['stage'], progress: number, message: string) => {
      onProgress?.({ stage, progress, message });
    };

    try {
      // Stage 0: Ensure all Mermaid diagrams are rendered (0-5%)
      const mermaidContainers = container.querySelectorAll('.mermaid-container');
      if (mermaidContainers.length > 0) {
        report('collecting', 2, 'Rendering diagrams...');
        try {
          const { mermaidRenderer } = await import('../renderers/mermaid-renderer');
          await mermaidRenderer.renderAllImmediate(container);
        } catch (error) {
          debug.warn('ExportController', 'Could not force-render Mermaid diagrams before export:', error);
        }
      }

      // Stage 1: Collect content (5-20%)
      report('collecting', 5, 'Analyzing document structure...');
      const collector = new ContentCollector();
      const content = collector.collect(container);
      report('collecting', 20, `Found ${content.nodes.length} elements`);

      debug.info(
        'ExportController',
        `Collected content: ${content.nodes.length} nodes, ${content.metadata.wordCount} words`
      );

      // Stage 2: Convert SVGs (20-50%)
      report('converting', 25, 'Converting diagrams...');
      const converter = new SVGConverter();
      const svgs = Array.from(container.querySelectorAll('.mermaid-container svg')) as SVGElement[];

      const images = await converter.convertAll(svgs);
      report('converting', 50, `Converted ${images.size} diagrams`);

      debug.info('ExportController', `Converted ${images.size} SVG diagrams`);

      // Stage 3: Generate document (50-90%)
      if (options.format === 'docx') {
        report('generating', 55, 'Generating Word document...');

        // Dynamic import to avoid loading docx unless needed
        const { DOCXGenerator } = await import('../utils/docx-generator');
        const generator = new DOCXGenerator();

        const blob = await generator.generate(content, images, {
          title: options.filename || content.title,
        });

        report('generating', 90, 'Document ready');

        // Stage 4: Download (90-100%)
        report('downloading', 95, 'Preparing download...');
        const filename = this.sanitizeFilename(options.filename || content.title);
        await this.downloadBlob(blob, `${filename}.docx`);
        report('downloading', 100, 'Download complete');

        debug.info('ExportController', `Export complete: ${filename}.docx`);
      } else {
        throw new Error(`Unsupported export format: ${options.format}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      debug.error('ExportController', 'Export failed:', error);
      throw new Error(`Export failed: ${message}`);
    }
  }


  /**
   * Get list of supported export formats
   */
  getSupportedFormats(): ExportFormat[] {
    return ['docx', 'pdf'];
  }

  /**
   * Download a blob as a file
   */
  private async downloadBlob(blob: Blob, filename: string): Promise<void> {
    const url = URL.createObjectURL(blob);

    try {
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // Wait a moment for download to start
      await new Promise((resolve) => setTimeout(resolve, 100));
    } finally {
      // Clean up the blob URL
      URL.revokeObjectURL(url);
    }
  }

  /**
   * Sanitize a filename by removing invalid characters
   */
  private sanitizeFilename(name: string): string {
    return (
      name
        .replace(/[<>:"/\\|?*]/g, '') // Remove invalid chars
        .replace(/\s+/g, '-') // Replace spaces with dashes
        .replace(/-+/g, '-') // Collapse multiple dashes
        .replace(/^-|-$/g, '') // Remove leading/trailing dashes
        .slice(0, 200) || 'document'
    ); // Limit length with fallback
  }
}

