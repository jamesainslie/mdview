/**
 * Render Pipeline
 * Multi-stage pipeline for rendering markdown with progressive enhancement
 */

import { MarkdownConverter } from './markdown-converter';
import { domPurifier } from '../utils/dom-purifier';
import type { ConversionResult } from '../types';
import { debug } from '../utils/debug-logger';

export interface RenderOptions {
  container: HTMLElement;
  markdown: string;
  theme?: string;
  progressive?: boolean;
  chunkSize?: number;
}

export interface RenderProgress {
  stage: 'parsing' | 'sanitizing' | 'transforming' | 'enhancing' | 'theming' | 'complete';
  progress: number; // 0-100
  message: string;
}

export type ProgressCallback = (progress: RenderProgress) => void;

export class RenderPipeline {
  private converter: MarkdownConverter;
  private progressCallbacks: Set<ProgressCallback> = new Set();
  private cancelRequested = false;

  constructor() {
    this.converter = new MarkdownConverter();
  }

  /**
   * Main render function
   */
  async render(options: RenderOptions): Promise<void> {
    this.cancelRequested = false;
    const { container, markdown } = options;

    try {
      // Stage 1: Parse markdown to HTML
      this.notifyProgress({
        stage: 'parsing',
        progress: 10,
        message: 'Parsing markdown...',
      });

      const result = await this.converter.convert(markdown);

      if (this.cancelRequested) return;

      // Stage 2: Sanitize HTML
      this.notifyProgress({
        stage: 'sanitizing',
        progress: 30,
        message: 'Sanitizing content...',
      });

      const sanitized = await this.sanitizeContent(result);

      if (this.cancelRequested) return;

      // Stage 3: Transform (process special blocks)
      this.notifyProgress({
        stage: 'transforming',
        progress: 50,
        message: 'Processing content...',
      });

      const transformed = await this.transformContent(sanitized, result);

      if (this.cancelRequested) return;

      // Stage 4: Insert into DOM
      container.innerHTML = transformed;

      // Stage 5: Enhance (add interactive features)
      this.notifyProgress({
        stage: 'enhancing',
        progress: 70,
        message: 'Adding interactive features...',
      });

      debug.log('RenderPipeline', 'Enhancing content...');
      await this.enhanceContent(container, result);
      debug.log('RenderPipeline', 'Content enhanced');

      if (this.cancelRequested) return;

      // Stage 6: Apply theme
      this.notifyProgress({
        stage: 'theming',
        progress: 90,
        message: 'Applying theme...',
      });

      debug.log('RenderPipeline', 'Applying theme...');
      await this.applyTheming(container);
      debug.log('RenderPipeline', 'Theme applied successfully');

      // Complete
      this.notifyProgress({
        stage: 'complete',
        progress: 100,
        message: 'Rendering complete',
      });
      debug.log('RenderPipeline', 'Rendering complete');
    } catch (error) {
      debug.error('RenderPipeline', 'Render error:', error);
      this.showError(container, error);
      throw error;
    }
  }

  /**
   * Progressive rendering for large files
   */
  async renderIncremental(options: RenderOptions): Promise<void> {
    const { container, markdown, chunkSize = 50000 } = options;

    // Split markdown into chunks
    const chunks = this.chunkMarkdown(markdown, chunkSize);

    for (let i = 0; i < chunks.length; i++) {
      if (this.cancelRequested) break;

      const chunk = chunks[i];
      const progress = ((i + 1) / chunks.length) * 100;

      this.notifyProgress({
        stage: 'parsing',
        progress,
        message: `Rendering chunk ${i + 1} of ${chunks.length}...`,
      });

      // Render chunk
      const chunkContainer = document.createElement('div');
      chunkContainer.className = 'mdview-chunk';
      
      await this.render({
        container: chunkContainer,
        markdown: chunk,
        progressive: false,
      });

      container.appendChild(chunkContainer);

      // Yield to browser for responsiveness
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  /**
   * Cancel rendering
   */
  cancelRender(): void {
    this.cancelRequested = true;
  }

  /**
   * Subscribe to progress updates
   */
  onProgress(callback: ProgressCallback): () => void {
    this.progressCallbacks.add(callback);
    return () => {
      this.progressCallbacks.delete(callback);
    };
  }

  /**
   * Stage 2: Sanitize content
   */
  private async sanitizeContent(result: ConversionResult): Promise<string> {
    // Use DOMPurify to sanitize
    return domPurifier.sanitize(result.html);
  }

  /**
   * Stage 3: Transform content (process special blocks)
   */
  private async transformContent(html: string, result: ConversionResult): Promise<string> {
    let transformed = html;

    // Add language badges to code blocks
    transformed = this.addCodeBlockFeatures(transformed, result);

    // Add lazy loading to images
    transformed = this.addImageLazyLoading(transformed);

    // Add table enhancements
    transformed = this.enhanceTables(transformed);

    return transformed;
  }

  /**
   * Stage 5: Enhance content with interactive features
   */
  private async enhanceContent(container: HTMLElement, _result: ConversionResult): Promise<void> {
    debug.log('RenderPipeline', 'Adding copy buttons...');
    this.addCopyButtons(container);

    debug.log('RenderPipeline', 'Setting up image lazy loading...');
    this.setupImageLazyLoading(container);

    debug.log('RenderPipeline', 'Marking Mermaid blocks...');
    this.markMermaidBlocks(container);

    debug.log('RenderPipeline', 'Setting up heading anchors...');
    this.setupHeadingAnchors(container);

    debug.log('RenderPipeline', 'Applying syntax highlighting...');
    await this.applySyntaxHighlighting(container);
    debug.log('RenderPipeline', 'Syntax highlighting complete');
  }

  /**
   * Apply syntax highlighting to code blocks
   */
  private async applySyntaxHighlighting(container: HTMLElement): Promise<void> {
    try {
      const { syntaxHighlighter } = await import('../renderers/syntax-highlighter');
      syntaxHighlighter.highlightVisible(container);
    } catch (error) {
      debug.error('RenderPipeline', 'Syntax highlighting error:', error);
    }
  }

  /**
   * Stage 6: Apply theming
   */
  private async applyTheming(container: HTMLElement): Promise<void> {
    // Theme will be applied by theme engine
    // This is a placeholder for theme-specific transformations
    container.classList.add('mdview-rendered');
  }

  /**
   * Add features to code blocks
   */
  private addCodeBlockFeatures(html: string, _result: ConversionResult): string {
    // This will be enhanced by syntax highlighter
    // For now, just add data attributes
    return html.replace(
      /<pre><code class="language-(\w+)">([\s\S]*?)<\/code><\/pre>/g,
      (_match, lang, code) => {
        return `<div class="code-block-wrapper" data-language="${lang}">
          <div class="code-block-header">
            <span class="code-language-badge">${lang}</span>
          </div>
          <pre><code class="language-${lang}">${code}</code></pre>
        </div>`;
      }
    );
  }

  /**
   * Add lazy loading to images
   */
  private addImageLazyLoading(html: string): string {
    return html.replace(/<img /g, '<img loading="lazy" ');
  }

  /**
   * Enhance tables
   */
  private enhanceTables(html: string): string {
    return html.replace(/<table>/g, '<div class="table-wrapper"><table>').replace(/<\/table>/g, '</table></div>');
  }

  /**
   * Add copy buttons to code blocks
   */
  private addCopyButtons(container: HTMLElement): void {
    const codeBlocks = container.querySelectorAll('.code-block-wrapper');
    
    codeBlocks.forEach((wrapper) => {
      const copyButton = document.createElement('button');
      copyButton.className = 'code-copy-button';
      copyButton.textContent = 'Copy';
      copyButton.setAttribute('aria-label', 'Copy code to clipboard');

      copyButton.addEventListener('click', async () => {
        const code = wrapper.querySelector('code');
        if (code) {
          try {
            await navigator.clipboard.writeText(code.textContent || '');
            copyButton.textContent = '✓ Copied';
            setTimeout(() => {
              copyButton.textContent = 'Copy';
            }, 2000);
          } catch (error) {
            debug.error('RenderPipeline', 'Failed to copy:', error);
            copyButton.textContent = '✗ Failed';
            setTimeout(() => {
              copyButton.textContent = 'Copy';
            }, 2000);
          }
        }
      });

      const header = wrapper.querySelector('.code-block-header');
      if (header) {
        header.appendChild(copyButton);
      }
    });
  }

  /**
   * Set up lazy loading for images
   */
  private setupImageLazyLoading(container: HTMLElement): void {
    const images = container.querySelectorAll('img[loading="lazy"]');
    
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const img = entry.target as HTMLImageElement;
              img.classList.add('loaded');
              imageObserver.unobserve(img);
            }
          });
        },
        { rootMargin: '50px' }
      );

      images.forEach((img) => imageObserver.observe(img));
    }
  }

  /**
   * Mark Mermaid blocks for rendering
   */
  private markMermaidBlocks(container: HTMLElement): void {
    const mermaidBlocks = container.querySelectorAll('.mermaid-container');
    mermaidBlocks.forEach((block) => {
      block.classList.add('mermaid-pending');
    });

    // Initialize Mermaid renderer
    this.renderMermaidDiagrams(container).catch((error) => {
      debug.error('RenderPipeline', 'Mermaid rendering catch error:', error);
    });
  }

  /**
   * Render Mermaid diagrams
   */
  private async renderMermaidDiagrams(container: HTMLElement): Promise<void> {
    try {
      const { mermaidRenderer } = await import('../renderers/mermaid-renderer');
      await mermaidRenderer.renderAll(container);
    } catch (error) {
      debug.error('RenderPipeline', 'Mermaid rendering error:', error);
    }
  }

  /**
   * Setup heading anchors
   */
  private setupHeadingAnchors(container: HTMLElement): void {
    const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
    
    headings.forEach((heading) => {
      if (heading.id) {
        heading.classList.add('heading-with-anchor');
      }
    });
  }

  /**
   * Chunk markdown for progressive rendering
   */
  private chunkMarkdown(markdown: string, chunkSize: number): string[] {
    const chunks: string[] = [];
    const lines = markdown.split('\n');
    let currentChunk: string[] = [];
    let currentSize = 0;

    for (const line of lines) {
      currentChunk.push(line);
      currentSize += line.length;

      // Check if we should create a new chunk
      // Only break at block boundaries (empty lines)
      if (currentSize >= chunkSize && line.trim() === '') {
        chunks.push(currentChunk.join('\n'));
        currentChunk = [];
        currentSize = 0;
      }
    }

    // Add remaining content
    if (currentChunk.length > 0) {
      chunks.push(currentChunk.join('\n'));
    }

    return chunks.length > 0 ? chunks : [markdown];
  }

  /**
   * Notify progress callbacks
   */
  private notifyProgress(progress: RenderProgress): void {
    this.progressCallbacks.forEach((callback) => {
      try {
        callback(progress);
      } catch (error) {
        debug.error('RenderPipeline', 'Progress callback error:', error);
      }
    });
  }

  /**
   * Show error in container
   */
  private showError(container: HTMLElement, error: unknown): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    container.innerHTML = `
      <div class="mdview-error" role="alert">
        <h2>⚠️ Rendering Error</h2>
        <p>Failed to render markdown content.</p>
        <details>
          <summary>Technical Details</summary>
          <pre>${this.escapeHtml(errorMessage)}</pre>
        </details>
      </div>
    `;
  }

  /**
   * Escape HTML
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Export singleton
export const renderPipeline = new RenderPipeline();

