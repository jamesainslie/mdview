/**
 * Export UI Component
 * Provides a user interface for exporting markdown to various formats
 */

import type {
  ExportUIOptions,
  ExportUIState,
  ExportFormat,
  ExportProgress,
  PaperSize,
} from '../types';
import { debug } from '../utils/debug-logger';
import { ExportController } from '../core/export-controller';

export class ExportUI {
  private button: HTMLElement | null = null;
  private menu: HTMLElement | null = null;
  private progressOverlay: HTMLElement | null = null;
  private toast: HTMLElement | null = null;
  private options: ExportUIOptions;
  private state: ExportUIState;
  private boundHandlers: Map<string, EventListener>;
  private exportController: ExportController;
  private toastTimeout: number | null = null;
  private abortController: AbortController | null = null;

  constructor(options?: ExportUIOptions) {
    this.options = {
      position: options?.position || 'left',
      formats: options?.formats || ['docx', 'pdf'],
      defaultPageSize: options?.defaultPageSize || 'A4',
    };

    this.state = {
      isMenuOpen: false,
      isExporting: false,
      currentProgress: null,
      lastError: null,
    };

    this.boundHandlers = new Map();
    this.exportController = new ExportController();

    // Load preferences asynchronously
    void this.loadPreferences();

    debug.info('ExportUI', 'Export UI initialized');
  }

  /**
   * Create the export button
   */
  createExportButton(): HTMLElement {
    this.button = document.createElement('button');
    this.button.className = `mdview-export-btn position-${this.options.position}`;
    this.button.setAttribute('aria-label', 'Export document');
    this.button.setAttribute('aria-haspopup', 'menu');
    this.button.setAttribute('aria-expanded', 'false');
    this.button.setAttribute('title', 'Export Document');

    // Download icon (SVG for crisp rendering)
    this.button.innerHTML = `
      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
        <path d="M12 16l-6-6h4V4h4v6h4l-6 6z"/>
        <path d="M20 18H4v2h16v-2z"/>
      </svg>
    `;

    const clickHandler = () => this.toggleMenu();
    this.button.addEventListener('click', clickHandler);
    this.boundHandlers.set('button-click', clickHandler);

    debug.info('ExportUI', 'Export button created');
    return this.button;
  }

  /**
   * Create the export menu
   */
  private createMenu(): HTMLElement {
    this.menu = document.createElement('div');
    this.menu.className = `mdview-export-menu position-${this.options.position}`;
    this.menu.setAttribute('role', 'menu');
    this.menu.setAttribute('aria-label', 'Export options');

    // Menu header
    const header = document.createElement('div');
    header.className = 'mdview-export-menu-header';
    header.innerHTML = `
      <span>Export Document</span>
      <button class="mdview-export-menu-close" aria-label="Close">×</button>
    `;
    this.menu.appendChild(header);

    // Format section
    const formatSection = document.createElement('div');
    formatSection.className = 'mdview-export-menu-section';

    const formatLabel = document.createElement('span');
    formatLabel.className = 'mdview-export-menu-label';
    formatLabel.textContent = 'FORMAT';
    formatSection.appendChild(formatLabel);

    // DOCX option
    if (this.options.formats?.includes('docx')) {
      const docxButton = this.createFormatButton('docx', 'W', 'Word Document', '.docx');
      formatSection.appendChild(docxButton);
    }

    // PDF option
    if (this.options.formats?.includes('pdf')) {
      const pdfButton = this.createFormatButton('pdf', 'P', 'PDF / Print', 'Browser print dialog');
      formatSection.appendChild(pdfButton);
    }

    this.menu.appendChild(formatSection);

    // Divider
    const divider = document.createElement('div');
    divider.className = 'mdview-export-menu-divider';
    this.menu.appendChild(divider);

    // Options section
    const optionsSection = document.createElement('div');
    optionsSection.className = 'mdview-export-menu-section';

    const optionsLabel = document.createElement('span');
    optionsLabel.className = 'mdview-export-menu-label';
    optionsLabel.textContent = 'OPTIONS';
    optionsSection.appendChild(optionsLabel);

    // Table of Contents checkbox
    const tocOption = document.createElement('label');
    tocOption.className = 'mdview-export-option';
    tocOption.innerHTML = `
      <input type="checkbox" id="export-toc" checked />
      <span>Include Table of Contents</span>
    `;
    optionsSection.appendChild(tocOption);

    // Page size select
    const pageSizeOption = document.createElement('div');
    pageSizeOption.className = 'mdview-export-option';
    const defaultSize = this.options.defaultPageSize || 'A4';
    pageSizeOption.innerHTML = `
      <label for="export-page-size">Page Size:</label>
      <select id="export-page-size">
        <optgroup label="ISO A-Series">
          <option value="A0" ${defaultSize === 'A0' ? 'selected' : ''}>A0</option>
          <option value="A1" ${defaultSize === 'A1' ? 'selected' : ''}>A1</option>
          <option value="A3" ${defaultSize === 'A3' ? 'selected' : ''}>A3</option>
          <option value="A4" ${defaultSize === 'A4' ? 'selected' : ''}>A4</option>
          <option value="A5" ${defaultSize === 'A5' ? 'selected' : ''}>A5</option>
          <option value="A6" ${defaultSize === 'A6' ? 'selected' : ''}>A6</option>
        </optgroup>
        <optgroup label="North American">
          <option value="Letter" ${defaultSize === 'Letter' ? 'selected' : ''}>Letter</option>
          <option value="Legal" ${defaultSize === 'Legal' ? 'selected' : ''}>Legal</option>
          <option value="Tabloid" ${defaultSize === 'Tabloid' ? 'selected' : ''}>Tabloid</option>
          <option value="Executive" ${defaultSize === 'Executive' ? 'selected' : ''}>Executive</option>
        </optgroup>
      </select>
    `;
    optionsSection.appendChild(pageSizeOption);

    this.menu.appendChild(optionsSection);

    // Setup event listeners
    this.setupMenuListeners();

    debug.info('ExportUI', 'Export menu created');
    return this.menu;
  }

  /**
   * Create a format button
   */
  private createFormatButton(
    format: ExportFormat,
    icon: string,
    title: string,
    description: string
  ): HTMLElement {
    const button = document.createElement('button');
    button.className = 'mdview-export-menu-item';
    button.setAttribute('role', 'menuitem');
    button.setAttribute('data-format', format);

    const iconSpan = document.createElement('span');
    iconSpan.className = 'mdview-export-menu-item-icon';
    iconSpan.textContent = icon;

    const contentSpan = document.createElement('span');
    contentSpan.className = 'mdview-export-menu-item-content';

    const titleSpan = document.createElement('span');
    titleSpan.className = 'mdview-export-menu-item-title';
    titleSpan.textContent = title;

    const descSpan = document.createElement('span');
    descSpan.className = 'mdview-export-menu-item-desc';
    descSpan.textContent = description;

    contentSpan.appendChild(titleSpan);
    contentSpan.appendChild(descSpan);

    button.appendChild(iconSpan);
    button.appendChild(contentSpan);

    const clickHandler = () => this.handleExport(format);
    button.addEventListener('click', clickHandler);
    this.boundHandlers.set(`format-${format}`, clickHandler);

    return button;
  }

  /**
   * Setup menu event listeners
   */
  private setupMenuListeners(): void {
    if (!this.menu) return;

    // Close button
    const closeButton = this.menu.querySelector('.mdview-export-menu-close');
    if (closeButton) {
      const closeHandler = () => this.hideMenu();
      closeButton.addEventListener('click', closeHandler);
      this.boundHandlers.set('menu-close', closeHandler as EventListener);
    }

    // Click outside to close
    const clickOutsideHandler = (e: MouseEvent) => this.handleClickOutside(e);
    document.addEventListener('click', clickOutsideHandler);
    this.boundHandlers.set('click-outside', clickOutsideHandler as EventListener);

    // Keyboard navigation
    const keyDownHandler = (e: KeyboardEvent) => this.handleKeyDown(e);
    document.addEventListener('keydown', keyDownHandler);
    this.boundHandlers.set('keydown', keyDownHandler as EventListener);
  }

  /**
   * Handle click outside menu
   */
  private handleClickOutside(e: MouseEvent): void {
    if (!this.state.isMenuOpen) return;

    const target = e.target as Node;
    if (
      this.menu &&
      !this.menu.contains(target) &&
      this.button &&
      !this.button.contains(target)
    ) {
      this.hideMenu();
    }
  }

  /**
   * Handle keyboard navigation
   */
  private handleKeyDown(e: KeyboardEvent): void {
    if (!this.state.isMenuOpen) return;

    if (e.key === 'Escape') {
      this.hideMenu();
      this.button?.focus();
      return;
    }

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      this.navigateMenu(e.key === 'ArrowDown' ? 1 : -1);
    }

    if (e.key === 'Enter') {
      const focusedElement = document.activeElement;
      if (focusedElement instanceof HTMLElement) {
        focusedElement.click();
      }
    }
  }

  /**
   * Navigate menu with arrow keys
   */
  private navigateMenu(direction: 1 | -1): void {
    if (!this.menu) return;

    const items = Array.from(
      this.menu.querySelectorAll('.mdview-export-menu-item')
    ) as HTMLElement[];

    if (items.length === 0) return;

    const currentIndex = items.indexOf(document.activeElement as HTMLElement);
    let nextIndex: number;

    if (currentIndex === -1) {
      nextIndex = direction === 1 ? 0 : items.length - 1;
    } else {
      nextIndex = (currentIndex + direction + items.length) % items.length;
    }

    items[nextIndex].focus();
  }

  /**
   * Show the menu
   */
  showMenu(): void {
    if (!this.menu) {
      this.createMenu();
      document.body.appendChild(this.menu!);
    }

    this.state.isMenuOpen = true;
    this.menu?.classList.add('visible');

    if (this.button) {
      this.button.classList.add('menu-open');
      this.button.setAttribute('aria-expanded', 'true');
    }

    // Focus first menu item
    const firstItem = this.menu?.querySelector('.mdview-export-menu-item') as HTMLElement;
    setTimeout(() => firstItem?.focus(), 100);

    debug.info('ExportUI', 'Menu shown');
  }

  /**
   * Hide the menu
   */
  hideMenu(): void {
    this.state.isMenuOpen = false;
    this.menu?.classList.remove('visible');

    if (this.button) {
      this.button.classList.remove('menu-open');
      this.button.setAttribute('aria-expanded', 'false');
    }

    debug.info('ExportUI', 'Menu hidden');
  }

  /**
   * Toggle menu visibility
   */
  toggleMenu(): void {
    if (this.state.isMenuOpen) {
      this.hideMenu();
    } else {
      this.showMenu();
    }
  }

  /**
   * Handle export action
   */
  private async handleExport(format: ExportFormat): Promise<void> {
    debug.info('ExportUI', `Starting export: ${format}`);

    this.hideMenu();

    // Get options from UI
    const tocCheckbox = document.getElementById('export-toc') as HTMLInputElement;
    const pageSizeSelect = document.getElementById('export-page-size') as HTMLSelectElement;

    // For PDF, use PDFGenerator
    if (format === 'pdf') {
      try {
        this.state.isExporting = true;
        this.button?.classList.add('exporting');

        // Create abort controller so Cancel button can stop long-running work
        this.abortController = new AbortController();

        this.showProgress({
          stage: 'collecting',
          progress: 5,
          message: 'Preparing document for print...',
        });

        const container = document.getElementById('mdview-container');
        if (!container) {
          throw new Error('Content container not found');
        }

        const { PDFGenerator } = await import('../utils/pdf-generator');
        const generator = new PDFGenerator();

        await generator.print(
          container,
          {
            paperSize: (pageSizeSelect?.value as PaperSize) || this.options.defaultPageSize,
            convertSvgsToImages: true,
          },
          (progress: ExportProgress) => {
            this.updateProgress(progress);
          },
          this.abortController.signal
        );

        this.hideProgress();
        this.showSuccess('Print dialog opened');
      } catch (error) {
        debug.error('ExportUI', 'Print failed:', error);
        this.hideProgress();
        if (error instanceof DOMException && error.name === 'AbortError') {
          this.showError(new Error('PDF export cancelled'));
        } else {
          this.showError(error instanceof Error ? error : new Error('Print failed'));
        }
      } finally {
        this.state.isExporting = false;
        this.button?.classList.remove('exporting');
        this.abortController = null;
      }
      return;
    }

    // Generate filename from template
    const { FilenameGenerator } = await import('../utils/filename-generator');
    const filename = FilenameGenerator.generate({
      title: document.title || 'document',
      extension: '', // Extension will be added by ExportController
      template: this.options.filenameTemplate || '{title}',
    }).replace(/\.(docx|pdf)$/, ''); // Remove extension as it will be added by the controller

    const options = {
      format,
      filename,
      includeTableOfContents: tocCheckbox?.checked !== false,
      pageSize: (pageSizeSelect?.value as PaperSize) || this.options.defaultPageSize,
    };

    // Start export
    this.state.isExporting = true;
    this.button?.classList.add('exporting');

    // Create abort controller for cancellation
    this.abortController = new AbortController();

    try {
      // Get the container to export
      const container = document.getElementById('mdview-container');
      if (!container) {
        throw new Error('Content container not found');
      }

      // Show progress overlay
      this.showProgress({
        stage: 'collecting',
        progress: 0,
        message: 'Collecting content...',
      });

      // Perform export with progress callback
      await this.exportController.export(container, options, (progress: ExportProgress) => {
        this.updateProgress(progress);
      });

      // Success
      this.hideProgress();
      this.showSuccess(`Document exported successfully`);

      debug.info('ExportUI', 'Export completed successfully');
    } catch (error) {
      debug.error('ExportUI', 'Export failed:', error);
      this.hideProgress();
      this.showError(error instanceof Error ? error : new Error('Export failed'));
      this.state.lastError = error instanceof Error ? error : new Error('Export failed');
    } finally {
      this.state.isExporting = false;
      this.button?.classList.remove('exporting');
      this.abortController = null;
    }
  }

  /**
   * Create progress overlay
   */
  private createProgressOverlay(): HTMLElement {
    this.progressOverlay = document.createElement('div');
    this.progressOverlay.className = 'mdview-export-progress-overlay';

    const container = document.createElement('div');
    container.className = 'mdview-export-progress-container';

    const progressBar = document.createElement('div');
    progressBar.className = 'mdview-export-progress-bar';

    const progressFill = document.createElement('div');
    progressFill.className = 'mdview-export-progress-fill';
    progressFill.style.width = '0%';
    progressBar.appendChild(progressFill);

    const progressText = document.createElement('div');
    progressText.className = 'mdview-export-progress-text';
    progressText.textContent = 'Starting export...';

    const cancelButton = document.createElement('button');
    cancelButton.className = 'mdview-export-progress-cancel';
    cancelButton.textContent = 'Cancel';

    const cancelHandler = () => {
      if (this.abortController) {
        this.abortController.abort();
        this.hideProgress();
        this.showError(new Error('Export cancelled'));
      }
    };
    cancelButton.addEventListener('click', cancelHandler);
    this.boundHandlers.set('progress-cancel', cancelHandler);

    container.appendChild(progressBar);
    container.appendChild(progressText);
    container.appendChild(cancelButton);

    this.progressOverlay.appendChild(container);

    return this.progressOverlay;
  }

  /**
   * Show progress overlay
   */
  showProgress(progress: ExportProgress): void {
    if (!this.progressOverlay) {
      this.createProgressOverlay();
      document.body.appendChild(this.progressOverlay!);
    }

    this.state.currentProgress = progress;
    this.progressOverlay?.classList.add('visible');
    this.updateProgress(progress);

    debug.info('ExportUI', `Progress: ${progress.stage} - ${progress.progress}%`);
  }

  /**
   * Update progress display
   */
  private updateProgress(progress: ExportProgress): void {
    if (!this.progressOverlay) return;

    const fill = this.progressOverlay.querySelector(
      '.mdview-export-progress-fill'
    ) as HTMLElement;
    const text = this.progressOverlay.querySelector(
      '.mdview-export-progress-text'
    ) as HTMLElement;

    if (fill) {
      fill.style.width = `${progress.progress}%`;
    }

    if (text) {
      text.textContent = progress.message;
    }

    this.state.currentProgress = progress;
  }

  /**
   * Hide progress overlay
   */
  hideProgress(): void {
    this.progressOverlay?.classList.remove('visible');
    this.state.currentProgress = null;

    debug.info('ExportUI', 'Progress hidden');
  }

  /**
   * Create toast notification
   */
  private createToast(type: 'success' | 'error', message: string): HTMLElement {
    this.toast = document.createElement('div');
    this.toast.className = `mdview-export-toast ${type}`;
    this.toast.textContent = message;

    return this.toast;
  }

  /**
   * Show success toast
   */
  showSuccess(filename: string): void {
    this.createToast('success', filename);
    document.body.appendChild(this.toast!);

    // Show with animation
    setTimeout(() => {
      this.toast?.classList.add('visible');
    }, 10);

    // Auto-dismiss after 3 seconds
    this.toastTimeout = window.setTimeout(() => {
      this.hideToast();
    }, 3000);

    debug.info('ExportUI', 'Success toast shown');
  }

  /**
   * Show error toast
   */
  showError(error: Error): void {
    this.createToast('error', error.message || 'Export failed');
    document.body.appendChild(this.toast!);

    // Show with animation
    setTimeout(() => {
      this.toast?.classList.add('visible');
    }, 10);

    // Auto-dismiss after 5 seconds (longer for errors)
    this.toastTimeout = window.setTimeout(() => {
      this.hideToast();
    }, 5000);

    debug.error('ExportUI', 'Error toast shown:', error);
  }

  /**
   * Hide toast notification
   */
  private hideToast(): void {
    this.toast?.classList.remove('visible');

    setTimeout(() => {
      this.toast?.remove();
      this.toast = null;
    }, 300);

    if (this.toastTimeout !== null) {
      window.clearTimeout(this.toastTimeout);
      this.toastTimeout = null;
    }
  }

  /**
   * Load export preferences from storage
   */
  private async loadPreferences(): Promise<void> {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_STATE' });
      const state = response?.state as any;

      if (state?.preferences) {
        const { exportDefaultFormat, exportDefaultPageSize, exportIncludeToc, exportFilenameTemplate } =
          state.preferences;

        // Update options with saved preferences
        if (exportDefaultFormat) {
          this.options.defaultFormat = exportDefaultFormat;
        }
        if (exportDefaultPageSize) {
          this.options.defaultPageSize = exportDefaultPageSize;
        }
        if (exportIncludeToc !== undefined) {
          this.options.includeTableOfContents = exportIncludeToc;
        }
        if (exportFilenameTemplate) {
          this.options.filenameTemplate = exportFilenameTemplate;
        }

        debug.info('ExportUI', 'Loaded export preferences:', {
          format: this.options.defaultFormat,
          pageSize: this.options.defaultPageSize,
        });
      }
    } catch (error) {
      debug.warn('ExportUI', 'Failed to load export preferences:', error);
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    // Remove event listeners
    this.boundHandlers.forEach((handler, key) => {
      if (key === 'button-click' && this.button) {
        this.button.removeEventListener('click', handler);
      } else if (key === 'click-outside') {
        document.removeEventListener('click', handler);
      } else if (key === 'keydown') {
        document.removeEventListener('keydown', handler);
      }
    });
    this.boundHandlers.clear();

    // Remove elements
    this.button?.remove();
    this.menu?.remove();
    this.progressOverlay?.remove();
    this.toast?.remove();

    // Clear timeouts
    if (this.toastTimeout !== null) {
      window.clearTimeout(this.toastTimeout);
    }

    // Abort any ongoing export
    if (this.abortController) {
      this.abortController.abort();
    }

    // Reset state
    this.button = null;
    this.menu = null;
    this.progressOverlay = null;
    this.toast = null;
    this.toastTimeout = null;
    this.abortController = null;

    debug.info('ExportUI', 'Export UI destroyed');
  }
}

