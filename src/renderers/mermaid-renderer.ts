/**
 * Mermaid Renderer
 * Renders and manages interactive Mermaid diagrams
 */

import mermaid from 'mermaid';
import Panzoom from 'panzoom';
import type { PanZoom } from 'panzoom';
import { debug } from '../utils/debug-logger';
import type { MermaidThemeConfig } from '../types';

export interface MermaidOptions {
  theme?: 'base' | 'dark' | 'default' | 'forest' | 'neutral';
  themeVariables?: Record<string, string>;
  maxTextSize?: number;
  maxEdges?: number;
}

export interface DiagramControls {
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  fitToView: () => void;
  maximize: () => void;
  exportSVG: () => void;
}

export class MermaidRenderer {
  private panzoomInstances: Map<string, PanZoom> = new Map();
  private renderQueue: string[] = [];
  private isRendering = false;
  private observer: IntersectionObserver | null = null;

  constructor() {
    this.initializeMermaid();
    this.setupIntersectionObserver();
  }

  /**
   * Initialize Mermaid with security settings
   */
  private initializeMermaid(): void {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      maxTextSize: 50000,
      maxEdges: 500,
      theme: 'base',
      flowchart: {
        htmlLabels: false,
        useMaxWidth: true,
      },
      sequence: {
        useMaxWidth: true,
      },
      gantt: {
        useMaxWidth: true,
      },
    });

    debug.info('MermaidRenderer', ' Initialized');
  }

  /**
   * Set up Intersection Observer for lazy loading
   */
  private setupIntersectionObserver(): void {
    if ('IntersectionObserver' in window) {
      this.observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const container = entry.target as HTMLElement;
              const id = container.id;
              if (id && container.classList.contains('mermaid-pending')) {
                this.renderDiagram(id).catch(debug.error);
              }
            }
          });
        },
        {
          rootMargin: '100px', // Pre-load when 100px away
          threshold: 0.01,
        }
      );
    }
  }

  /**
   * Update Mermaid theme and re-render diagrams
   */
  updateTheme(config: MermaidThemeConfig): void {
    debug.info('MermaidRenderer', `Updating theme to ${config.theme}`);

    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      maxTextSize: 50000,
      maxEdges: 500,
      theme: config.theme,
      themeVariables: config.themeVariables,
      flowchart: {
        htmlLabels: false,
        useMaxWidth: true,
      },
      sequence: {
        useMaxWidth: true,
      },
      gantt: {
        useMaxWidth: true,
      },
    });

    this.rerenderAll().catch((error) => {
      debug.error('MermaidRenderer', 'Failed to re-render diagrams:', error);
    });
  }

  /**
   * Re-render all initialized diagrams
   */
  private async rerenderAll(): Promise<void> {
    const diagrams = document.querySelectorAll('.mermaid-container');

    for (const container of Array.from(diagrams)) {
      const element = container as HTMLElement;
      const id = element.id;

      if (!id) continue;

      // Check if it was previously rendered or had an error
      if (
        element.classList.contains('mermaid-ready') ||
        element.classList.contains('mermaid-error')
      ) {
        // Clean up Panzoom
        const panzoom = this.panzoomInstances.get(id);
        if (panzoom) {
          panzoom.dispose();
          this.panzoomInstances.delete(id);
        }

        // Clean up keyboard listeners
        const elementWithCleanup = element as { __keyboardCleanup?: () => void };
        if (elementWithCleanup.__keyboardCleanup) {
          elementWithCleanup.__keyboardCleanup();
        }

        // Reset state
        element.classList.remove('mermaid-ready', 'mermaid-error');
        element.classList.add('mermaid-pending');
        element.innerHTML = ''; // Clear content

        // Re-render
        await this.renderDiagram(id);
      }
    }
  }

  /**
   * Render all Mermaid diagrams in a container
   */
  async renderAll(container: HTMLElement): Promise<void> {
    const diagrams = container.querySelectorAll('.mermaid-container.mermaid-pending');

    for (const diagram of Array.from(diagrams)) {
      const id = diagram.id;
      if (id) {
        // Use observer if available, otherwise render immediately
        if (this.observer) {
          this.observer.observe(diagram);
        } else {
          await this.renderDiagram(id);
        }
      }
    }
  }

  /**
   * Render a single Mermaid diagram
   */
  async renderDiagram(containerId: string): Promise<void> {
    const container = document.getElementById(containerId);
    if (!container) {
      debug.error('MermaidRenderer', `Container not found: ${containerId}`);
      return;
    }

    // Check if already rendered
    if (container.querySelector('.mermaid-rendered')) {
      return;
    }

    // Get mermaid code from global registry or data attribute (fallback for lazy sections)
    const windowWithRegistry = window as { __MDVIEW_MERMAID_CODE__?: Map<string, string> };
    const registry = windowWithRegistry.__MDVIEW_MERMAID_CODE__;
    let code = registry?.get(containerId)?.trim();

    // Fallback: Check if code was stored in data attribute (from previous render)
    if (!code) {
      code = container.getAttribute('data-mermaid-code') || '';
    }

    if (!code) {
      debug.error(
        'MermaidRenderer',
        `No code found in registry or data attribute for ${containerId}`
      );
      this.showError(container, 'No Mermaid code found');
      return;
    }

    debug.debug('MermaidRenderer', `Container ${containerId}: code exists, length: ${code.length}`);

    // Store code in the container as data attribute for potential re-renders
    container.setAttribute('data-mermaid-code', code);

    // Remove from registry now that we've stored it in DOM
    // (Keep it in registry too in case of re-renders before DOM update)
    // registry.delete(containerId); // Don't delete - keep for lazy sections

    // Add to queue if currently rendering
    if (this.isRendering) {
      if (!this.renderQueue.includes(containerId)) {
        this.renderQueue.push(containerId);
      }
      return;
    }

    this.isRendering = true;

    try {
      // Validate syntax
      const validation = await this.validateSyntax(code);
      if (!validation.valid) {
        this.showError(container, validation.error || 'Invalid Mermaid syntax');
        return;
      }

      // Generate unique ID for SVG
      const svgId = `mermaid-svg-${containerId}`;

      // Render with timeout
      const renderPromise = mermaid.render(svgId, code);
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Render timeout')), 5000);
      });

      const result = await Promise.race([renderPromise, timeoutPromise]);

      // Clear loading state
      container.innerHTML = '';

      // Create wrapper for diagram
      const wrapper = document.createElement('div');
      wrapper.className = 'mermaid-rendered';
      wrapper.innerHTML = result.svg;

      container.appendChild(wrapper);

      // Add controls
      this.addControls(container);

      // Initialize Panzoom
      const svg = wrapper.querySelector('svg');
      if (svg) {
        this.initializePanzoom(container, svg as SVGElement);
      }

      // Mark as rendered
      container.classList.remove('mermaid-pending');
      container.classList.add('mermaid-ready');

      // Unobserve if using IntersectionObserver
      if (this.observer) {
        this.observer.unobserve(container);
      }

      debug.info('MermaidRenderer', ` Rendered diagram: ${containerId}`);
    } catch (error) {
      debug.error('MermaidRenderer', `[MermaidRenderer] Error rendering ${containerId}:`, error);
      this.showError(container, error instanceof Error ? error.message : String(error));
    } finally {
      this.isRendering = false;

      // Process queue
      if (this.renderQueue.length > 0) {
        const nextId = this.renderQueue.shift();
        if (nextId) {
          this.renderDiagram(nextId).catch(debug.error);
        }
      }
    }
  }

  /**
   * Validate Mermaid syntax
   */
  private async validateSyntax(code: string): Promise<{ valid: boolean; error?: string }> {
    try {
      // Basic validation - check for empty or malformed code
      if (!code.trim()) {
        return { valid: false, error: 'Empty diagram code' };
      }

      // Check size limits
      if (code.length > 50000) {
        return { valid: false, error: 'Diagram code exceeds size limit (50,000 characters)' };
      }

      // Try to parse (Mermaid doesn't provide a separate parse method)
      await mermaid.parse(code);

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Parse error',
      };
    }
  }

  /**
   * Initialize Panzoom for a diagram
   */
  private initializePanzoom(container: HTMLElement, svg: SVGElement): void {
    debug.debug('MermaidRenderer', `initializePanzoom() called for container: ${container.id}`);

    const panzoomInstance = Panzoom(svg, {
      maxZoom: 10,
      minZoom: 0.1,
      smoothScroll: false,
      bounds: true,
      boundsPadding: 0.1,
    });

    debug.debug('MermaidRenderer', `  Panzoom instance created, storing with ID: ${container.id}`);

    // Store instance
    this.panzoomInstances.set(container.id, panzoomInstance);

    const initialTransform = panzoomInstance.getTransform();
    debug.debug(
      'MermaidRenderer',
      `  Initial transform: scale=${initialTransform.scale.toFixed(2)}, pos=(${initialTransform.x.toFixed(1)}, ${initialTransform.y.toFixed(1)})`
    );

    // Listen for transform changes to debug unexpected resets
    svg.addEventListener('panzoomchange', (() => {
      const transform = panzoomInstance.getTransform();
      debug.debug(
        'MermaidRenderer',
        `  Transform changed for ${container.id}: scale=${transform.scale.toFixed(2)}, pos=(${transform.x.toFixed(1)}, ${transform.y.toFixed(1)})`
      );
    }) as EventListener);

    // Add mouse wheel zoom
    svg.parentElement?.addEventListener('wheel', (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        // Manual zoom calculation
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const transform = panzoomInstance.getTransform();
        panzoomInstance.zoomTo(e.clientX, e.clientY, transform.scale * delta);
      }
    });

    // Add keyboard controls
    this.setupKeyboardControls(container, panzoomInstance);
  }

  /**
   * Setup keyboard controls for diagram
   */
  private setupKeyboardControls(
    container: HTMLElement,
    panzoom: PanZoom,
    maximizeCallback?: () => void
  ): void {
    const handler = (e: KeyboardEvent) => {
      // Only handle if container is focused or hovered
      if (!container.matches(':hover, :focus-within')) {
        return;
      }

      switch (e.key) {
        case '+':
        case '=':
          e.preventDefault();
          {
            const transform = panzoom.getTransform();
            panzoom.zoomTo(0, 0, transform.scale * 1.2);
          }
          break;
        case '-':
          e.preventDefault();
          {
            const transform = panzoom.getTransform();
            panzoom.zoomTo(0, 0, transform.scale * 0.8);
          }
          break;
        case '0':
          e.preventDefault();
          panzoom.moveTo(0, 0);
          panzoom.zoomAbs(0, 0, 1);
          break;
        case 'f':
          e.preventDefault();
          this.fitToView(container.id);
          break;
        case 'm':
          e.preventDefault();
          // If in maximized view (callback provided), close instead of maximize
          if (maximizeCallback) {
            maximizeCallback();
          } else {
            this.maximize(container.id);
          }
          break;
        case 'e':
          e.preventDefault();
          void this.exportSVG(container.id);
          break;
        case 'ArrowUp':
          if (e.shiftKey) {
            e.preventDefault();
            panzoom.moveTo(panzoom.getTransform().x, panzoom.getTransform().y - 50);
          }
          break;
        case 'ArrowDown':
          if (e.shiftKey) {
            e.preventDefault();
            panzoom.moveTo(panzoom.getTransform().x, panzoom.getTransform().y + 50);
          }
          break;
        case 'ArrowLeft':
          if (e.shiftKey) {
            e.preventDefault();
            panzoom.moveTo(panzoom.getTransform().x - 50, panzoom.getTransform().y);
          }
          break;
        case 'ArrowRight':
          if (e.shiftKey) {
            e.preventDefault();
            panzoom.moveTo(panzoom.getTransform().x + 50, panzoom.getTransform().y);
          }
          break;
      }
    };

    document.addEventListener('keydown', handler);

    // Store cleanup function
    const containerWithCleanup = container as { __keyboardCleanup?: () => void };
    containerWithCleanup.__keyboardCleanup = () => {
      document.removeEventListener('keydown', handler);
    };
  }

  /**
   * Add control buttons to diagram
   */
  private addControls(container: HTMLElement): void {
    const controls = document.createElement('div');
    controls.className = 'mermaid-controls';

    const buttons = [
      { label: '+', title: 'Zoom In (+)', action: () => this.zoomIn(container.id) },
      { label: '−', title: 'Zoom Out (-)', action: () => this.zoomOut(container.id) },
      { label: '⊡', title: 'Reset to 100% (0)', action: () => this.resetZoom(container.id) },
      { label: '⤢', title: 'Fit to View (F)', action: () => this.fitToView(container.id) },
      { label: '⛶', title: 'Maximize (M)', action: () => this.maximize(container.id) },
      { label: '↓', title: 'Export SVG (E)', action: () => this.exportSVG(container.id) },
    ];

    buttons.forEach(({ label, title, action }) => {
      const button = document.createElement('button');
      button.className = 'mermaid-control-button';
      button.textContent = label;
      button.title = title;
      button.setAttribute('aria-label', title);
      button.addEventListener('click', action);
      controls.appendChild(button);
    });

    container.appendChild(controls);
  }

  /**
   * Re-attach event listeners to cloned control buttons
   * (cloneNode doesn't copy event listeners)
   */
  private reattachControls(container: HTMLElement, closeMaximizeCallback?: () => void): void {
    const controls = container.querySelector('.mermaid-controls');
    if (!controls) return;

    const buttons = controls.querySelectorAll('.mermaid-control-button');

    // Define actions for each button (same order as addControls)
    const actions = [
      () => this.zoomIn(container.id),
      () => this.zoomOut(container.id),
      () => this.resetZoom(container.id),
      () => this.fitToView(container.id),
      closeMaximizeCallback ? closeMaximizeCallback : () => this.maximize(container.id), // In maximized view, this closes instead
      () => this.exportSVG(container.id),
    ];

    buttons.forEach((button, index) => {
      // Remove old listeners by cloning the button (clean slate)
      const newButton = button.cloneNode(true) as HTMLElement;
      button.parentNode?.replaceChild(newButton, button);

      // Attach new listener
      if (actions[index]) {
        newButton.addEventListener('click', actions[index]);
      }
    });
  }

  /**
   * Zoom in
   */
  zoomIn(containerId: string): void {
    const container = document.getElementById(containerId);
    const panzoom = this.panzoomInstances.get(containerId);
    if (panzoom && container) {
      const transform = panzoom.getTransform();
      const containerRect = container.getBoundingClientRect();
      // Zoom toward center of visible area
      const centerX = containerRect.width / 2;
      const centerY = containerRect.height / 2;
      panzoom.smoothZoomAbs(centerX, centerY, transform.scale * 1.2);
    }
  }

  /**
   * Zoom out
   */
  zoomOut(containerId: string): void {
    const container = document.getElementById(containerId);
    const panzoom = this.panzoomInstances.get(containerId);
    if (panzoom && container) {
      const transform = panzoom.getTransform();
      const containerRect = container.getBoundingClientRect();
      // Zoom toward center of visible area
      const centerX = containerRect.width / 2;
      const centerY = containerRect.height / 2;
      panzoom.smoothZoomAbs(centerX, centerY, transform.scale * 0.8);
    }
  }

  /**
   * Reset zoom to 1:1 scale and center
   */
  resetZoom(containerId: string): void {
    const container = document.getElementById(containerId);
    const panzoom = this.panzoomInstances.get(containerId);

    if (!container || !panzoom) return;

    const svg = container.querySelector('svg');
    if (!svg) return;

    // Reset to 1:1 scale and identity translation
    // The browser's SVG viewBox + width=100% handles the fitting naturally
    panzoom.zoomAbs(0, 0, 1);
    panzoom.moveTo(0, 0);

    debug.debug('MermaidRenderer', `Reset zoom for ${containerId}`);
  }

  /**
   * Fit diagram to view (centered)
   */
  fitToView(containerId: string): void {
    debug.debug('MermaidRenderer', `Fit to view for: ${containerId}`);
    // "Fit to view" in this context means resetting to the natural
    // layout where the diagram fits within the container (width=100%)
    this.resetZoom(containerId);
  }

  /**
   * Maximize diagram (fullscreen mode)
   */
  maximize(containerId: string): void {
    debug.debug('MermaidRenderer', `maximize() called for: ${containerId}`);

    const container = document.getElementById(containerId);
    if (!container) {
      debug.error('MermaidRenderer', `Container not found: ${containerId}`);
      return;
    }

    debug.debug('MermaidRenderer', `  Creating maximize overlay...`);

    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'mermaid-maximize-overlay';
    overlay.setAttribute('tabindex', '0');

    // Clone diagram
    const clone = container.cloneNode(true) as HTMLElement;

    // Give clone a unique ID for panzoom tracking
    const maximizedId = `${containerId}-maximized`;
    clone.id = maximizedId;
    clone.classList.add('maximized');

    debug.debug('MermaidRenderer', `  Cloned diagram with ID: ${maximizedId}`);

    // Make the clone expand to fill available space
    clone.style.width = '90vw';
    clone.style.height = '90vh';
    clone.style.maxWidth = '90vw';
    clone.style.maxHeight = '90vh';
    clone.style.display = 'flex';
    clone.style.alignItems = 'center';
    clone.style.justifyContent = 'center';

    debug.debug('MermaidRenderer', `  Appending to DOM...`);
    overlay.appendChild(clone);
    document.body.appendChild(overlay);

    const cleanup = () => {
      // Clean up panzoom instance
      const clonePanzoom = this.panzoomInstances.get(maximizedId);
      if (clonePanzoom) {
        clonePanzoom.dispose();
        this.panzoomInstances.delete(maximizedId);
      }

      // Clean up keyboard handlers
      const cloneWithCleanup = clone as { __keyboardCleanup?: () => void };
      if (cloneWithCleanup.__keyboardCleanup) {
        cloneWithCleanup.__keyboardCleanup();
      }

      // Remove overlay from DOM
      if (document.body.contains(overlay)) {
        document.body.removeChild(overlay);
      }
    };

    // Re-attach event listeners to cloned control buttons
    this.reattachControls(clone, cleanup);

    // Add close button
    const closeButton = document.createElement('button');
    closeButton.className = 'mermaid-close-button';
    closeButton.textContent = '✕';
    closeButton.title = 'Close (Esc)';
    closeButton.setAttribute('aria-label', 'Close maximize mode');
    closeButton.addEventListener('click', cleanup);
    overlay.appendChild(closeButton);

    // Re-initialize Panzoom for maximized instance
    const svg = clone.querySelector('svg');
    if (svg) {
      debug.debug('MermaidRenderer', `  Found SVG, initializing panzoom...`);

      const svgElement = svg as SVGElement;
      // Make SVG scale to fit
      svgElement.style.width = '100%';
      svgElement.style.height = '100%';
      svgElement.style.maxWidth = '100%';
      svgElement.style.maxHeight = '100%';

      this.initializePanzoom(clone, svgElement);
      debug.debug('MermaidRenderer', `  Panzoom initialized for ${maximizedId}`);

      // Re-setup keyboard controls for the cloned instance
      const clonePanzoom = this.panzoomInstances.get(maximizedId);
      if (clonePanzoom) {
        this.setupKeyboardControls(clone, clonePanzoom, cleanup);

        // Center logic: Identity transform + moveTo(0,0)
        // Since SVG is 100% width/height and preserves aspect ratio,
        // this will center the content in the 90vw/90vh container
        clonePanzoom.zoomAbs(0, 0, 1);
        clonePanzoom.moveTo(0, 0);

        debug.debug('MermaidRenderer', `  Maximized view centered`);
      }
    } else {
      debug.error('MermaidRenderer', `  No SVG found in cloned container!`);
    }

    // Add ESC key handler
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        cleanup();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);

    // Click outside to close
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        cleanup();
        document.removeEventListener('keydown', escHandler);
      }
    });

    // Focus overlay for accessibility
    overlay.focus();
  }

  /**
   * Export diagram as SVG
   */
  exportSVG(containerId: string): void {
    const container = document.getElementById(containerId);
    if (!container) return;

    const svg = container.querySelector('svg');
    if (!svg) {
      debug.error('MermaidRenderer', ' No SVG found for export');
      return;
    }

    try {
      // Clone and clean SVG
      const clone = svg.cloneNode(true) as SVGElement;

      // Remove Panzoom transformations
      clone.removeAttribute('style');
      clone.querySelectorAll('[style]').forEach((el) => {
        el.removeAttribute('style');
      });

      // Add XML declaration
      const serializer = new XMLSerializer();
      const svgString =
        '<?xml version="1.0" encoding="UTF-8"?>\n' + serializer.serializeToString(clone);

      // Create blob and download
      const blob = new Blob([svgString], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `mermaid-${containerId}.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);

      debug.info('MermaidRenderer', ` Exported SVG: ${containerId}`);

      // Show success notification
      this.showNotification(container, 'SVG exported successfully');
    } catch (error) {
      debug.error('MermaidRenderer', ' Export error:', error);
      this.showNotification(container, 'Export failed', true);
    }
  }

  /**
   * Show error in container
   */
  private showError(container: HTMLElement, message: string): void {
    const code = container.getAttribute('data-mermaid-code') || '';

    container.innerHTML = `
      <div class="mermaid-error" role="alert">
        <h4>Mermaid Diagram Error</h4>
        <p>${this.escapeHtml(message)}</p>
        <details>
          <summary>Diagram Code</summary>
          <pre><code>${this.escapeHtml(code)}</code></pre>
        </details>
        <p><a href="https://mermaid.js.org/intro/" target="_blank" rel="noopener noreferrer">View Mermaid Documentation</a></p>
        <button class="mermaid-copy-error">Copy Error</button>
      </div>
    `;

    // Add copy error button handler
    const copyButton = container.querySelector('.mermaid-copy-error');
    if (copyButton) {
      copyButton.addEventListener('click', () => {
        void (async () => {
          try {
            await navigator.clipboard.writeText(`${message}\n\n${code}`);
            (copyButton as HTMLElement).textContent = '✓ Copied';
          } catch (error) {
            debug.error('MermaidRenderer', 'Failed to copy error:', error);
          }
        })();
      });
    }

    container.classList.remove('mermaid-pending');
    container.classList.add('mermaid-error');
  }

  /**
   * Show notification toast
   */
  private showNotification(container: HTMLElement, message: string, isError = false): void {
    const toast = document.createElement('div');
    toast.className = `mermaid-notification ${isError ? 'error' : 'success'}`;
    toast.textContent = message;
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');

    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => {
        container.removeChild(toast);
      }, 300);
    }, 2000);
  }

  /**
   * Escape HTML
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    // Dispose all panzoom instances
    this.panzoomInstances.forEach((panzoom) => {
      panzoom.dispose();
    });
    this.panzoomInstances.clear();

    // Disconnect observer
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    debug.info('MermaidRenderer', ' Cleaned up');
  }
}

// Export singleton
export const mermaidRenderer = new MermaidRenderer();
