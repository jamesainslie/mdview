/**
 * Render Pipeline
 * Multi-stage pipeline for rendering markdown with progressive enhancement
 */

import { MarkdownConverter } from './markdown-converter';
import { domPurifier } from '../utils/dom-purifier';
import { workerPool } from '../workers/worker-pool';
import type { ConversionResult, ThemeName, CachedResult, ParseTaskPayload } from '../types';
import { debug } from '../utils/debug-logger';
import { splitIntoSections } from '../utils/section-splitter';
import { SkeletonRenderer } from '../utils/skeleton-renderer';

export interface RenderOptions {
  container: HTMLElement;
  markdown: string;
  theme?: string;
  progressive?: boolean;
  chunkSize?: number;
  filePath?: string;
  preferences?: Record<string, unknown>;
  useCache?: boolean;
  useWorkers?: boolean;
  useLazySections?: boolean; // New: Enable lazy section rendering
}

export interface RenderProgress {
  stage: 'parsing' | 'sanitizing' | 'transforming' | 'enhancing' | 'theming' | 'complete' | 'cached';
  progress: number; // 0-100
  message: string;
}

export type ProgressCallback = (progress: RenderProgress) => void;

export class RenderPipeline {
  private converter: MarkdownConverter;
  private progressCallbacks: Set<ProgressCallback> = new Set();
  private cancelRequested = false;
  private workersEnabled = true;
  private progressUpdateTimer: number | null = null;
  private lastProgressUpdate = 0;

  constructor() {
    this.converter = new MarkdownConverter();
    // Initialize workers in background
    this.initializeWorkers();
  }

  /**
   * Initialize worker pool
   * Note: Workers are disabled on file:// URLs due to Chrome security
   * The synchronous rendering path is optimized with Phase 1 improvements
   */
  private async initializeWorkers(): Promise<void> {
    try {
      await workerPool.initialize();
      this.workersEnabled = true;
      debug.info('RenderPipeline', '✅ Worker pool initialized');
    } catch (error) {
      // Workers unavailable (file:// URLs) - use optimized sync rendering
      if (window.location.protocol === 'file:') {
        debug.warn('RenderPipeline', 'Using optimized synchronous rendering (workers unavailable on file:// URLs)');
      } else {
        debug.error('RenderPipeline', 'Worker initialization failed, using sync fallback:', error);
      }
      this.workersEnabled = false;
    }
  }

  /**
   * Main render function with cache and worker support
   */
  async render(options: RenderOptions): Promise<void> {
    this.cancelRequested = false;
    const { 
      container, 
      markdown, 
      theme = 'github-light', 
      filePath = '',
      preferences = {},
      useCache = true,
      useWorkers = true,
      useLazySections = false, // Lazy sections disabled by default
    } = options;

    const shouldUseWorkers = useWorkers && this.workersEnabled;

    try {
      // Check cache if enabled (from service worker)
      if (useCache && filePath) {
        const cacheKey = await this.getCacheKey(filePath, markdown, theme as ThemeName, preferences);

        const cached = await this.getCachedResult(cacheKey);
        if (cached) {
          debug.info('RenderPipeline', 'Using cached result from service worker');
          this.notifyProgressThrottled({
            stage: 'cached',
            progress: 100,
            message: 'Loading from cache...',
          });
          
          await this.renderFromCache(container, cached);
          return;
        }
      }

      // Use progressive hydration for large files (> 30KB)
      if (useLazySections || markdown.length > 30000) {
        debug.info('RenderPipeline', 'Using progressive hydration for large document');
        await this.renderWithProgressiveHydration(options);
        return;
      }

      // Stage 1: Parse markdown to HTML (with worker if available)
      this.notifyProgressThrottled({
        stage: 'parsing',
        progress: 10,
        message: 'Parsing markdown...',
      });

      let result: ConversionResult;
      
      if (shouldUseWorkers) {
        try {
          const taskId = `parse-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          const payload: ParseTaskPayload = {
            markdown,
            options: {
              breaks: true,
              linkify: true,
              typographer: true,
            },
          };

          const workerResult = await workerPool.execute<{ html: string; metadata: ConversionResult['metadata'] }>({
            type: 'parse',
            id: taskId,
            payload,
            priority: 10,
          });

          result = {
            html: workerResult.html,
            metadata: workerResult.metadata,
            errors: [],
          };
          
          debug.debug('RenderPipeline', 'Parsed markdown in worker');
        } catch (error) {
          debug.error('RenderPipeline', 'Worker parsing failed, falling back to sync:', error);
          result = await this.converter.convert(markdown);
        }
      } else {
        result = await this.converter.convert(markdown);
      }

      if (this.cancelRequested) return;

      // Stage 2: Sanitize HTML (always on main thread for security)
      this.notifyProgressThrottled({
        stage: 'sanitizing',
        progress: 30,
        message: 'Sanitizing content...',
      });

      const sanitized = await this.sanitizeContent(result);

      if (this.cancelRequested) return;

      // Stage 3: Transform (process special blocks)
      this.notifyProgressThrottled({
        stage: 'transforming',
        progress: 50,
        message: 'Processing content...',
      });

      const transformed = await this.transformContent(sanitized, result, preferences);

      if (this.cancelRequested) return;

      // Stage 4: Insert into DOM
      const template = document.createElement('template');
      template.innerHTML = transformed;
      
      container.innerHTML = '';
      container.appendChild(template.content);

      // Stage 5: Enhance (add interactive features with parallel workers)
      this.notifyProgressThrottled({
        stage: 'enhancing',
        progress: 70,
        message: 'Adding interactive features...',
      });

      debug.debug('RenderPipeline', 'Enhancing content...');
      await this.enhanceContentWithWorkers(container, result, shouldUseWorkers);
      debug.debug('RenderPipeline', 'Content enhanced');

      if (this.cancelRequested) return;

      // Stage 6: Apply theme
      this.notifyProgressThrottled({
        stage: 'theming',
        progress: 90,
        message: 'Applying theme...',
      });

      debug.info('RenderPipeline', 'Applying theme...');
      await this.applyTheming(container);
      debug.info('RenderPipeline', 'Theme applied successfully');

      // Cache the result if enabled (to service worker)
      if (useCache && filePath) {
        try {
          const cacheKey = await this.getCacheKey(filePath, markdown, theme as ThemeName, preferences);

          const contentHash = await this.generateContentHash(markdown);

          const cachedResult: CachedResult = {
            html: container.innerHTML,
            metadata: result.metadata,
            highlightedBlocks: new Map(),
            mermaidSVGs: new Map(),
            timestamp: Date.now(),
            cacheKey,
          };

          await this.setCachedResult(cacheKey, cachedResult, filePath, contentHash, theme as ThemeName);
          debug.debug('RenderPipeline', 'Result cached in service worker');
        } catch (error) {
          debug.error('RenderPipeline', 'Failed to cache result:', error);
        }
      }

      // Complete
      this.notifyProgressThrottled({
        stage: 'complete',
        progress: 100,
        message: 'Rendering complete',
      });
      debug.info('RenderPipeline', 'Rendering complete');
    } catch (error) {
      debug.error('RenderPipeline', 'Render error:', error);
      this.showError(container, error);
      throw error;
    }
  }

  /**
   * Render from cached result
   */
  private async renderFromCache(container: HTMLElement, cached: CachedResult): Promise<void> {
    // Insert cached HTML
    container.innerHTML = cached.html;

    // Re-initialize interactive features
    await this.reinitializeInteractiveFeatures(container);

    this.notifyProgressThrottled({
      stage: 'complete',
      progress: 100,
      message: 'Loaded from cache',
    });
  }

  /**
   * Re-initialize interactive features for cached content
   */
  private async reinitializeInteractiveFeatures(container: HTMLElement): Promise<void> {
    // Re-add copy buttons
    this.addCopyButtons(container);

    // Re-setup image lazy loading
    this.setupImageLazyLoading(container);

    // Re-initialize Mermaid diagrams (they may need panzoom reinitialization)
    const mermaidContainers = container.querySelectorAll('.mermaid-container.mermaid-ready');
    if (mermaidContainers.length > 0) {
      try {
        // Mermaid diagrams should already have SVG from cache
        // Controls will be re-added automatically when mermaid module loads
        await import('../renderers/mermaid-renderer');
      } catch (error) {
        debug.error('RenderPipeline', 'Failed to reinitialize mermaid:', error);
      }
    }
  }

  /**
   * Enhance content with parallel worker processing
   * Optimized: Critical operations first, non-critical during idle time
   */
  private async enhanceContentWithWorkers(
    container: HTMLElement,
    _result: ConversionResult,
    useWorkers: boolean
  ): Promise<void> {
    // CRITICAL: Apply syntax highlighting to visible blocks first (lazy loaded)
    if (useWorkers) {
      debug.debug('RenderPipeline', 'Applying syntax highlighting with workers...');
      await this.applySyntaxHighlightingWithWorkers(container);
    } else {
      debug.debug('RenderPipeline', 'Applying syntax highlighting...');
      await this.applySyntaxHighlighting(container);
    }

    // CRITICAL: Mark Mermaid blocks (actual rendering happens lazily on intersection)
    debug.debug('RenderPipeline', 'Marking Mermaid blocks...');
    this.markMermaidBlocks(container);

    debug.debug('RenderPipeline', 'Syntax highlighting complete');

    // NON-CRITICAL: Schedule remaining enhancements during idle time
    // This improves perceived performance by not blocking the main render
    this.scheduleIdleEnhancements(container);
  }

  /**
   * Schedule non-critical enhancements during browser idle time
   */
  private scheduleIdleEnhancements(container: HTMLElement): void {
    const runEnhancements = () => {
      debug.debug('RenderPipeline', 'Running idle-time enhancements...');
      
      // Batch DOM operations for efficiency
      this.addCopyButtons(container);
      this.setupImageLazyLoading(container);
      this.setupHeadingAnchors(container);
      
      debug.debug('RenderPipeline', 'Idle-time enhancements complete');
    };

    // Use requestIdleCallback if available, otherwise setTimeout
    if ('requestIdleCallback' in window) {
      requestIdleCallback(runEnhancements, { timeout: 100 });
    } else {
      setTimeout(runEnhancements, 0);
    }
  }

  /**
   * Apply syntax highlighting using workers (parallel)
   * Optimized: Uses lazy loading for better perceived performance
   */
  private async applySyntaxHighlightingWithWorkers(container: HTMLElement): Promise<void> {
    // Even with workers available, use lazy loading for instant content display
    // Only visible code blocks are highlighted immediately, rest on scroll
    try {
      const { syntaxHighlighter } = await import('../renderers/syntax-highlighter');
      syntaxHighlighter.highlightVisible(container);
    } catch (error) {
      debug.error('RenderPipeline', 'Syntax highlighting error:', error);
    }
  }

  /**
   * Throttle progress updates to reduce reflows
   */
  private notifyProgressThrottled(progress: RenderProgress): void {
    const now = Date.now();
    const timeSinceLastUpdate = now - this.lastProgressUpdate;

    // Throttle to max once per 100ms (except for complete/cached stages)
    if (timeSinceLastUpdate < 100 && progress.stage !== 'complete' && progress.stage !== 'cached') {
      // Schedule update for later if not already scheduled
      if (!this.progressUpdateTimer) {
        this.progressUpdateTimer = window.setTimeout(() => {
          this.notifyProgress(progress);
          this.progressUpdateTimer = null;
          this.lastProgressUpdate = Date.now();
        }, 100 - timeSinceLastUpdate);
      }
      return;
    }

    this.notifyProgress(progress);
    this.lastProgressUpdate = now;
  }

  /**
   * Get cache key from service worker
   */
  private async getCacheKey(
    filePath: string,
    content: string,
    theme: ThemeName,
    preferences: Record<string, unknown>
  ): Promise<string> {
    const response = await chrome.runtime.sendMessage({
      type: 'CACHE_GENERATE_KEY',
      payload: { filePath, content, theme, preferences },
    });
    return response.key;
  }

  /**
   * Get cached result from service worker
   */
  private async getCachedResult(key: string): Promise<CachedResult | null> {
    const response = await chrome.runtime.sendMessage({
      type: 'CACHE_GET',
      payload: { key },
    });
    return response.result || null;
  }

  /**
   * Set cached result in service worker
   */
  private async setCachedResult(
    key: string,
    result: CachedResult,
    filePath: string,
    contentHash: string,
    theme: ThemeName
  ): Promise<void> {
    await chrome.runtime.sendMessage({
      type: 'CACHE_SET',
      payload: { key, result, filePath, contentHash, theme },
    });
  }

  /**
   * Generate content hash via service worker
   */
  private async generateContentHash(content: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
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

      // Yield to browser for responsiveness using RAF (faster than setTimeout)
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
  }

  /**
   * Render using progressive hydration (for large files)
   * PHASE 1: Instant skeleton (< 50ms) - structure with headings
   * PHASE 2: Progressive hydration - fill in content
   * PHASE 3: Enhancement - syntax highlighting, mermaid, etc.
   */
  private async renderWithProgressiveHydration(options: RenderOptions): Promise<void> {
    const { container, markdown, preferences = {} } = options;
    debug.debug('RenderPipeline', 'Starting progressive hydration with preferences:', JSON.stringify(preferences));

    // Split markdown into sections
    const sections = splitIntoSections(markdown);
    debug.info('RenderPipeline', `Progressive hydration: ${sections.length} sections`);

    // ===================================================================
    // PHASE 1: Instant Skeleton (< 50ms)
    // Render all headings + placeholders immediately
    // This makes scroll position naturally correct!
    // ===================================================================
    this.notifyProgressThrottled({
      stage: 'parsing',
      progress: 5,
      message: 'Rendering structure...',
    });

    const skeletonHtml = SkeletonRenderer.generateSkeleton(sections);
    container.innerHTML = skeletonHtml;

    debug.debug('RenderPipeline', 'Skeleton rendered (structure visible)');

    // At this point, the user sees the full document structure!
    // Headings are visible, scroll works naturally
    // No need for scroll restoration!
    
    // Notify that content is visible (remove loading overlay)
    this.notifyProgressThrottled({
      stage: 'parsing',
      progress: 10,
      message: 'Content visible - hydrating...',
    });

    // Apply theme immediately to skeleton
    await this.applyTheming(container);

    // ===================================================================
    // PHASE 2: Progressive Hydration
    // Fill in actual content for each section
    // ===================================================================
    debug.debug('RenderPipeline', 'Starting progressive hydration...');

    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      
      this.notifyProgressThrottled({
        stage: 'parsing',
        progress: 5 + ((i / sections.length) * 70),
        message: `Hydrating section ${i + 1}/${sections.length}...`,
      });

      try {
        // Find the skeleton section element
        const sectionElement = document.getElementById(section.id);
        if (!sectionElement || SkeletonRenderer.isHydrated(sectionElement)) {
          continue;
        }

        // Convert markdown to HTML
        const result = await this.converter.convert(section.markdown);
        const sanitized = await this.sanitizeContent(result);
        debug.debug('RenderPipeline', `Hydrating section ${i}: Transforming content with preferences`, JSON.stringify(preferences));
        const transformed = await this.transformContent(sanitized, result, preferences);

        // Replace skeleton content with actual content
        sectionElement.innerHTML = transformed;
        
        // Mark as hydrated
        SkeletonRenderer.markHydrated(sectionElement);

        // Yield to browser to keep UI responsive
        await new Promise((r) => requestAnimationFrame(r));
      } catch (error) {
        debug.error('RenderPipeline', `Failed to hydrate section ${section.id}:`, error);
      }
    }

    debug.info('RenderPipeline', 'Progressive hydration complete');

    // ===================================================================
    // PHASE 3: Enhancement
    // Add syntax highlighting, mermaid, copy buttons, etc.
    // ===================================================================
    this.notifyProgressThrottled({
      stage: 'enhancing',
      progress: 80,
      message: 'Enhancing content...',
    });

    await this.enhanceContentWithWorkers(container, { html: '', metadata: {} } as ConversionResult, false);

    this.notifyProgressThrottled({
      stage: 'complete',
      progress: 100,
      message: 'Rendering complete',
    });

    debug.info('RenderPipeline', 'Progressive hydration fully complete');
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
  private async transformContent(html: string, result: ConversionResult, preferences: Record<string, unknown> = {}): Promise<string> {
    debug.debug('RenderPipeline', 'Transforming content with preferences:', JSON.stringify(preferences));
    let transformed = html;

    // Add language badges and line numbers to code blocks
    transformed = this.addCodeBlockFeatures(transformed, result, preferences);

    // Add lazy loading to images
    transformed = this.addImageLazyLoading(transformed);

    // Add table enhancements
    transformed = this.enhanceTables(transformed);

    return transformed;
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
  private addCodeBlockFeatures(html: string, _result: ConversionResult, preferences: Record<string, unknown> = {}): string {
    const showLineNumbers = !!preferences.lineNumbers;
    debug.debug('RenderPipeline', `addCodeBlockFeatures: showLineNumbers = ${showLineNumbers}`);

    return html.replace(
      /<pre><code class="language-(\w+)">([\s\S]*?)<\/code><\/pre>/g,
      (_match, lang, code) => {
        let lineNumbersHtml = '';
        let wrapperClass = 'code-block-wrapper';
        let contentStart = '';
        let contentEnd = '';

        if (showLineNumbers) {
          debug.debug('RenderPipeline', 'Generating line numbers for code block');
          wrapperClass += ' has-line-numbers';
          // Count lines
          const lineCount = code.split('\n').length;
          // Generate line numbers column
          const numbers = Array.from({ length: lineCount }, (_, i) => `<span>${i + 1}</span>`).join('');
          lineNumbersHtml = `<div class="line-numbers-rows">${numbers}</div>`;
          contentStart = '<div class="code-block-content">';
          contentEnd = '</div>';
        }

        return `<div class="${wrapperClass}" data-language="${lang}">
          <div class="code-block-header">
            <span class="code-language-badge">${lang}</span>
          </div>
          ${contentStart}
            ${lineNumbersHtml}
            <pre><code class="language-${lang}">${code}</code></pre>
          ${contentEnd}
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

