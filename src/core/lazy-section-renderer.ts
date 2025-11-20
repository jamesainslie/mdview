/**
 * Lazy Section Renderer
 * Renders markdown sections on-demand as they become visible
 */

import type { MarkdownSection } from '../utils/section-splitter';
import type { MarkdownConverter } from './markdown-converter';
import { debug } from '../utils/debug-logger';

export interface LazySectionOptions {
  rootMargin?: string;
  threshold?: number;
}

export class LazySectionRenderer {
  private observer: IntersectionObserver | null = null;
  private pendingSections: Map<string, MarkdownSection> = new Map();
  private renderedSections: Set<string> = new Set();
  private converter: MarkdownConverter;
  private onRender?: (section: MarkdownSection, html: string) => void;

  constructor(converter: MarkdownConverter) {
    this.converter = converter;
  }

  /**
   * Initialize the lazy loading observer
   */
  initialize(options: LazySectionOptions = {}): void {
    const { rootMargin = '500px', threshold = 0.01 } = options;

    if (!('IntersectionObserver' in window)) {
      debug.warn(
        'LazySectionRenderer',
        'IntersectionObserver not supported, will render all immediately'
      );
      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const placeholder = entry.target as HTMLElement;
            const sectionId = placeholder.dataset.sectionId;

            if (sectionId && this.pendingSections.has(sectionId)) {
              void this.renderSection(sectionId, placeholder);
              this.observer?.unobserve(placeholder);
            }
          }
        });
      },
      {
        rootMargin,
        threshold,
      }
    );

    debug.info('LazySectionRenderer', `Lazy loading initialized (rootMargin: ${rootMargin})`);
  }

  /**
   * Create a placeholder for a lazy-loaded section
   */
  createPlaceholder(section: MarkdownSection): HTMLElement {
    const placeholder = document.createElement('div');
    placeholder.className = 'mdview-section-placeholder';
    placeholder.dataset.sectionId = section.id;
    placeholder.dataset.heading = section.heading || '';

    // Add visual placeholder content
    placeholder.innerHTML = `
      <div class="placeholder-content">
        ${section.heading ? `<h${section.level || 2}>${section.heading}</h${section.level || 2}>` : ''}
        <div class="placeholder-loading">Loading section...</div>
      </div>
    `;

    // Store section for lazy loading
    this.pendingSections.set(section.id, section);

    // Observe for lazy loading
    if (this.observer) {
      this.observer.observe(placeholder);
    } else {
      // No observer support, render immediately
      void this.renderSection(section.id, placeholder);
    }

    return placeholder;
  }

  /**
   * Render a section when it becomes visible
   */
  private renderSection(sectionId: string, placeholder: HTMLElement): void {
    const section = this.pendingSections.get(sectionId);
    if (!section || this.renderedSections.has(sectionId)) {
      return;
    }

    debug.debug('LazySectionRenderer', `Rendering section: ${section.heading || sectionId}`);

    try {
      // Convert markdown to HTML
      const result = this.converter.convert(section.markdown);
      const html = result.html;

      // Create section container
      const sectionContainer = document.createElement('div');
      sectionContainer.className = 'mdview-section';
      sectionContainer.dataset.sectionId = section.id;
      sectionContainer.innerHTML = html;

      // Replace placeholder with rendered content
      placeholder.replaceWith(sectionContainer);

      // Mark as rendered
      this.renderedSections.add(sectionId);
      this.pendingSections.delete(sectionId);

      // Notify callback if provided
      if (this.onRender) {
        this.onRender(section, html);
      }

      debug.debug('LazySectionRenderer', `Section rendered: ${section.heading || sectionId}`);
    } catch (error) {
      debug.error('LazySectionRenderer', `Failed to render section ${sectionId}:`, error);

      // Show error in placeholder
      placeholder.innerHTML = `
        <div class="mdview-section-error">
          <p>Failed to render section</p>
          <pre>${String(error)}</pre>
        </div>
      `;
    }
  }

  /**
   * Set callback for when a section is rendered
   */
  onSectionRender(callback: (section: MarkdownSection, html: string) => void): void {
    this.onRender = callback;
  }

  /**
   * Force render all pending sections
   */
  async renderAll(): Promise<void> {
    debug.info(
      'LazySectionRenderer',
      `Force rendering ${this.pendingSections.size} pending sections`
    );

    const promises: Promise<void>[] = [];

    for (const [sectionId] of this.pendingSections) {
      const placeholder = document.querySelector(`[data-section-id="${sectionId}"]`) as HTMLElement;
      if (placeholder) {
        promises.push(this.renderSection(sectionId, placeholder));
      }
    }

    await Promise.all(promises);
  }

  /**
   * Get rendering statistics
   */
  getStats() {
    return {
      pending: this.pendingSections.size,
      rendered: this.renderedSections.size,
      total: this.pendingSections.size + this.renderedSections.size,
    };
  }

  /**
   * Clean up observer
   */
  cleanup(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.pendingSections.clear();
    this.renderedSections.clear();
    debug.debug('LazySectionRenderer', 'Cleaned up');
  }
}
