/**
 * Skeleton Renderer
 * Renders document structure instantly (headings + placeholders)
 * Content is hydrated progressively afterwards
 */

import type { MarkdownSection } from './section-splitter';
import { debug } from './debug-logger';

export interface SkeletonSection {
  id: string;
  heading?: string;
  level?: number;
  estimatedHeight: number;
}

export class SkeletonRenderer {
  /**
   * Generate skeleton HTML from sections
   * This renders instantly (< 10ms) with just headings and placeholders
   */
  static generateSkeleton(sections: MarkdownSection[]): string {
    debug.log('SkeletonRenderer', `Generating skeleton for ${sections.length} sections`);

    const skeletonHtml = sections
      .map((section) => {
        // Estimate height based on content length
        // ~0.3px per character is a rough estimate
        const estimatedHeight = Math.max(100, Math.min(section.markdown.length * 0.3, 2000));

        return `
        <div 
          class="mdview-section mdview-section-skeleton" 
          id="${section.id}" 
          data-section-id="${section.id}"
          data-hydrated="false"
          style="min-height: ${estimatedHeight}px;"
        >
          ${
            section.heading
              ? `
            <h${section.level || 2} class="section-heading">
              ${this.escapeHtml(section.heading)}
            </h${section.level || 2}>
          `
              : ''
          }
          <div class="section-placeholder">
            <div class="placeholder-shimmer"></div>
          </div>
        </div>
      `;
      })
      .join('\n');

    debug.log('SkeletonRenderer', 'Skeleton generated');
    return skeletonHtml;
  }

  /**
   * Check if a section is hydrated
   */
  static isHydrated(sectionElement: HTMLElement): boolean {
    return sectionElement.dataset.hydrated === 'true';
  }

  /**
   * Mark a section as hydrated
   */
  static markHydrated(sectionElement: HTMLElement): void {
    sectionElement.dataset.hydrated = 'true';
    sectionElement.classList.remove('mdview-section-skeleton');
    sectionElement.classList.add('mdview-section-hydrated');

    // Remove skeleton min-height (let content determine height)
    sectionElement.style.minHeight = '';

    // Remove placeholder
    const placeholder = sectionElement.querySelector('.section-placeholder');
    if (placeholder) {
      placeholder.remove();
    }
  }

  /**
   * Get all unhydrated sections
   */
  static getUnhydratedSections(container: HTMLElement): HTMLElement[] {
    const sections = container.querySelectorAll('.mdview-section[data-hydrated="false"]');
    return Array.from(sections) as HTMLElement[];
  }

  /**
   * Escape HTML for safe rendering
   */
  private static escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
