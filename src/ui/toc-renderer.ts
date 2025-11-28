/**
 * TOC Renderer
 * Generates and manages a floating Table of Contents overlay
 */

import type { HeadingInfo } from '../types';
import { debug } from '../utils/debug-logger';

interface TocOptions {
  maxDepth?: number; // Max heading level to show (1-6)
  autoCollapse?: boolean; // Auto-collapse nested sections
  position?: 'left' | 'right'; // Position of TOC
}

interface TocNode {
  heading: HeadingInfo;
  children: TocNode[];
  element?: HTMLElement;
  isExpanded?: boolean;
}

export class TocRenderer {
  private container: HTMLElement | null = null;
  private toggleButton: HTMLElement | null = null;
  private headings: HeadingInfo[] = [];
  private options: TocOptions;
  private activeHeadingId: string | null = null;
  private scrollListener: (() => void) | null = null;

  constructor(options: TocOptions = {}) {
    this.options = {
      maxDepth: options.maxDepth || 6,
      autoCollapse: options.autoCollapse !== undefined ? options.autoCollapse : false,
      position: options.position || 'left',
    };
  }

  /**
   * Render the TOC overlay
   */
  render(headings: HeadingInfo[]): HTMLElement {
    debug.info('TOC', `Rendering TOC with ${headings.length} headings`);

    this.headings = headings.filter((h) => h.level <= (this.options.maxDepth || 6));

    // Create container
    this.container = document.createElement('div');
    this.container.id = 'mdview-toc';
    this.container.className = `mdview-toc-overlay position-${this.options.position || 'left'}`;

    // Create header
    const header = document.createElement('div');
    header.className = 'mdview-toc-header';
    header.innerHTML = `
      <span class="mdview-toc-title">Contents</span>
      <button class="mdview-toc-close" aria-label="Close table of contents">×</button>
    `;
    this.container.appendChild(header);

    // Create scrollable content area
    const content = document.createElement('div');
    content.className = 'mdview-toc-content';

    // Build tree structure
    const tree = this.buildTree(this.headings);
    const list = this.renderTree(tree);
    content.appendChild(list);

    this.container.appendChild(content);

    // Setup event listeners
    this.setupEventListeners();

    // Setup scroll spy
    this.setupScrollSpy();

    debug.info('TOC', 'TOC rendered successfully');

    return this.container;
  }

  /**
   * Create on-page toggle button (called separately to always show)
   */
  createToggleButton(): void {
    // Don't create if already exists
    if (this.toggleButton) return;

    this.toggleButton = document.createElement('button');
    this.toggleButton.className = `mdview-toc-toggle-btn position-${this.options.position || 'left'}`;
    this.toggleButton.setAttribute('aria-label', 'Toggle table of contents');
    this.toggleButton.setAttribute('title', 'Toggle Table of Contents');
    this.toggleButton.innerHTML = '☰';
    
    this.toggleButton.addEventListener('click', () => {
      this.toggle();
      // Update preferences when toggled
      const newState = this.container?.classList.contains('visible');
      document.dispatchEvent(new CustomEvent('mdview:toc:toggled', { 
        detail: { visible: newState } 
      }));
    });

    document.body.appendChild(this.toggleButton);
  }

  /**
   * Build a hierarchical tree from flat heading list
   */
  private buildTree(headings: HeadingInfo[]): TocNode[] {
    const root: TocNode[] = [];
    const stack: TocNode[] = [];

    for (const heading of headings) {
      const node: TocNode = {
        heading,
        children: [],
        isExpanded: !this.options.autoCollapse || heading.level <= 2,
      };

      // Find the parent node
      while (stack.length > 0) {
        const parent = stack[stack.length - 1];
        if (parent.heading.level < heading.level) {
          parent.children.push(node);
          break;
        }
        stack.pop();
      }

      // If no parent found, add to root
      if (stack.length === 0) {
        root.push(node);
      }

      stack.push(node);
    }

    return root;
  }

  /**
   * Render tree nodes as nested lists
   */
  private renderTree(nodes: TocNode[]): HTMLElement {
    const ul = document.createElement('ul');
    ul.className = 'mdview-toc-list';

    for (const node of nodes) {
      const li = document.createElement('li');
      li.className = `mdview-toc-item mdview-toc-level-${node.heading.level}`;
      li.dataset.headingId = node.heading.id;

      // Create link
      const link = document.createElement('a');
      link.href = `#${node.heading.id}`;
      link.className = 'mdview-toc-link';
      link.textContent = node.heading.text;
      link.dataset.headingId = node.heading.id;

      // Handle click
      link.addEventListener('click', (e) => {
        e.preventDefault();
        this.scrollToHeading(node.heading.id);
      });

      li.appendChild(link);
      node.element = li;

      // Add children if any
      if (node.children.length > 0) {
        li.classList.add('has-children');

        // Add expand/collapse toggle
        if (this.options.autoCollapse) {
          const toggle = document.createElement('button');
          toggle.className = 'mdview-toc-toggle';
          toggle.textContent = node.isExpanded ? '▼' : '▶';
          toggle.setAttribute('aria-label', 'Toggle section');

          toggle.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleNode(node);
          });

          li.insertBefore(toggle, link);
        }

        const childList = this.renderTree(node.children);
        if (!node.isExpanded) {
          childList.style.display = 'none';
        }
        li.appendChild(childList);
      }

      ul.appendChild(li);
    }

    return ul;
  }

  /**
   * Toggle expand/collapse state of a node
   */
  private toggleNode(node: TocNode): void {
    if (!node.element) return;

    node.isExpanded = !node.isExpanded;

    const toggle = node.element.querySelector('.mdview-toc-toggle');
    const childList = node.element.querySelector('ul');

    if (toggle) {
      toggle.textContent = node.isExpanded ? '▼' : '▶';
    }

    if (childList) {
      childList.style.display = node.isExpanded ? 'block' : 'none';
    }
  }

  /**
   * Scroll to a heading smoothly
   */
  private scrollToHeading(headingId: string): void {
    const target = document.getElementById(headingId);
    if (!target) {
      debug.warn('TOC', `Heading not found: ${headingId}`);
      return;
    }

    target.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // Update active state immediately
    this.setActiveHeading(headingId);
  }

  /**
   * Set up scroll spy to highlight current section
   */
  private setupScrollSpy(): void {
    const updateActiveHeading = () => {
      const scrollPosition = window.scrollY + 100; // Offset for better UX

      // Find the current heading
      let currentHeading: HeadingInfo | null = null;

      for (let i = this.headings.length - 1; i >= 0; i--) {
        const heading = this.headings[i];
        const element = document.getElementById(heading.id);

        if (element) {
          const offsetTop = element.getBoundingClientRect().top + window.scrollY;
          if (offsetTop <= scrollPosition) {
            currentHeading = heading;
            break;
          }
        }
      }

      if (currentHeading) {
        this.setActiveHeading(currentHeading.id);
      }
    };

    // Throttle scroll events for performance
    let ticking = false;
    this.scrollListener = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          updateActiveHeading();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', this.scrollListener, { passive: true });

    // Initial update
    updateActiveHeading();
  }

  /**
   * Set the active heading in the TOC
   */
  private setActiveHeading(headingId: string): void {
    if (this.activeHeadingId === headingId) return;

    // Remove previous active state
    if (this.activeHeadingId && this.container) {
      const prevActive = this.container.querySelector(
        `[data-heading-id="${this.activeHeadingId}"]`
      );
      if (prevActive) {
        prevActive.classList.remove('active');
      }
    }

    // Set new active state
    this.activeHeadingId = headingId;

    if (this.container) {
      const newActive = this.container.querySelector(`[data-heading-id="${headingId}"]`);
      if (newActive) {
        newActive.classList.add('active');

        // Scroll TOC to keep active item visible
        const tocContent = this.container.querySelector('.mdview-toc-content');
        if (tocContent && newActive instanceof HTMLElement) {
          const tocRect = tocContent.getBoundingClientRect();
          const itemRect = newActive.getBoundingClientRect();

          if (itemRect.top < tocRect.top || itemRect.bottom > tocRect.bottom) {
            newActive.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          }
        }
      }
    }
  }

  /**
   * Set up event listeners
   */
  private setupEventListeners(): void {
    if (!this.container) return;

    // Close button
    const closeButton = this.container.querySelector('.mdview-toc-close');
    if (closeButton) {
      closeButton.addEventListener('click', () => {
        this.hide();
      });
    }

    // Close on escape key
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.hide();
      }
    };
    document.addEventListener('keydown', handleEscape);
  }

  /**
   * Show the TOC
   */
  show(): void {
    if (this.container) {
      this.container.classList.add('visible');
      const position = this.options.position || 'left';
      document.body.classList.add(`toc-visible-${position}`);
      debug.info('TOC', 'TOC shown');
    }
  }

  /**
   * Hide the TOC
   */
  hide(): void {
    if (this.container) {
      this.container.classList.remove('visible');
      document.body.classList.remove('toc-visible-left', 'toc-visible-right');
      debug.info('TOC', 'TOC hidden');

      // Dispatch event for content script to update state
      document.dispatchEvent(new CustomEvent('mdview:toc:hidden'));
    }
  }

  /**
   * Toggle TOC visibility
   */
  toggle(): void {
    if (this.container?.classList.contains('visible')) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.scrollListener) {
      window.removeEventListener('scroll', this.scrollListener);
      this.scrollListener = null;
    }

    if (this.toggleButton) {
      this.toggleButton.remove();
      this.toggleButton = null;
    }

    if (this.container) {
      this.container.remove();
      this.container = null;
    }

    document.body.classList.remove('toc-visible-left', 'toc-visible-right');

    debug.info('TOC', 'TOC destroyed');
  }

  /**
   * Update TOC options
   */
  updateOptions(options: Partial<TocOptions>): void {
    this.options = { ...this.options, ...options };

    // Re-render if container exists
    if (this.container && this.headings.length > 0) {
      const wasVisible = this.container.classList.contains('visible');
      this.destroy();
      const newContainer = this.render(this.headings);
      document.body.appendChild(newContainer);
      // Recreate the toggle button
      this.createToggleButton();
      if (wasVisible) {
        this.show();
      }
    }
  }
}

