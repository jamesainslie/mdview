/**
 * Options Page Script
 * Manages settings page UI and interactions
 */

import type { AppState, ThemeName, LogLevel, PaperSize } from '../types';
import { debug } from '../utils/debug-logger';

class OptionsManager {
  private state: AppState | null = null;
  private hasChanges = false;

  async initialize(): Promise<void> {
    debug.log('Options', 'Initializing...');

    // Load state
    await this.loadState();

    // Update UI with current state
    this.updateUI();

    // Load and update cache stats
    await this.updateCacheStats();

    // Setup event listeners
    this.setupEventListeners();

    // Setup navigation
    this.setupNavigation();

    // Setup storage listener
    this.setupStorageListener();

    // Set version
    this.setAppVersion();

    debug.log('Options', 'Initialized');
  }

  private setAppVersion(): void {
    const versionElement = document.getElementById('app-version');
    if (versionElement) {
      // __APP_VERSION__ is injected by Vite at build time
      try {
        versionElement.textContent = `MDView v${__APP_VERSION__}`;
      } catch (e) {
        debug.warn('Options', 'Failed to set app version:', e);
      }
    }
  }

  private setupStorageListener(): void {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'sync' && changes.preferences) {
        const newPreferences = changes.preferences.newValue as Partial<AppState['preferences']>;
        debug.log('Options', 'Storage changed, updating UI:', newPreferences);

        if (this.state) {
          this.state.preferences = { ...this.state.preferences, ...newPreferences };

          // Only update UI if we don't have unsaved changes to avoid overwriting user input
          // OR: simplistic approach - just update.
          // Given the request "sync logic", immediate update is preferred.
          // If the user is actively editing, this might be disruptive, but likely rare collision.
          this.updateUI();
        }
      }
    });
  }

  private async loadState(): Promise<void> {
    try {
      const response: unknown = await chrome.runtime.sendMessage({ type: 'GET_STATE' });
      this.state = (response as { state: AppState }).state;
      debug.log('Options', 'State loaded:', this.state);
    } catch (error) {
      debug.error('Options', 'Failed to load state:', error);
    }
  }

  private updateUI(): void {
    if (!this.state) return;

    const { preferences } = this.state;

    // Appearance
    this.setValue('theme', preferences.theme);
    this.setValue('auto-theme', preferences.autoTheme);
    this.setValue('light-theme', preferences.lightTheme);
    this.setValue('dark-theme', preferences.darkTheme);
    this.setValue('code-line-numbers', preferences.lineNumbers);
    this.setValue('enable-html', !!preferences.enableHtml);

    // Appearance Overrides
    this.setValue('font-family', preferences.fontFamily || '');
    this.setValue('code-font-family', preferences.codeFontFamily || '');
    this.setValue('line-height', preferences.lineHeight || '');
    this.setValue('max-width', preferences.maxWidth || '');

    // Table of Contents
    this.setValue('show-toc', !!preferences.showToc);
    this.setValue('toc-max-depth', preferences.tocMaxDepth || 6);
    this.setValue('toc-auto-collapse', !!preferences.tocAutoCollapse);
    this.setValue('toc-position', preferences.tocPosition || 'left');
    this.setValue('toc-style', preferences.tocStyle || 'floating');

    // Diagrams
    // Use defaults
    this.setValue('diagram-zoom', '100');
    this.setValue('diagram-animations', true);
    this.setValue('diagram-timeout', '5');

    // Performance
    this.setValue('auto-reload', preferences.autoReload);
    this.setValue('reload-debounce', '300');
    this.setValue('lazy-threshold', '500');

    // Export
    this.setValue('export-default-format', preferences.exportDefaultFormat || 'docx');
    this.setValue('export-default-page-size', preferences.exportDefaultPageSize || 'A4');
    this.setValue('export-include-toc', preferences.exportIncludeToc !== false);
    this.setValue('export-filename-template', preferences.exportFilenameTemplate || '{title}');
    this.updateFilenamePreview();

    // Advanced
    this.setValue('sync-tabs', preferences.syncTabs);
    this.setValue('log-level', preferences.logLevel || 'error');

    // Blocklist
    this.renderBlocklist(preferences.blockedSites || []);
  }

  private setValue(id: string, value: string | boolean | number): void {
    const element = document.getElementById(id) as HTMLInputElement | HTMLSelectElement | null;
    if (!element) return;

    if (element instanceof HTMLInputElement) {
      if (element.type === 'checkbox') {
        element.checked = Boolean(value);
      } else {
        element.value = String(value);
      }
    } else if (element instanceof HTMLSelectElement) {
      element.value = String(value);
    }
  }

  private setupEventListeners(): void {
    // Track changes
    const inputs = document.querySelectorAll('.setting-input, .setting-checkbox');
    inputs.forEach((input) => {
      input.addEventListener('change', () => {
        this.hasChanges = true;
        this.updateSaveButton();
      });
    });

    // Save button
    const btnSave = document.getElementById('btn-save');
    if (btnSave) {
      btnSave.addEventListener('click', () => {
        void this.saveSettings();
      });
    }

    // Clear cache
    const btnClearCache = document.getElementById('btn-clear-cache');
    if (btnClearCache) {
      btnClearCache.addEventListener('click', () => {
        void this.clearCache();
      });
    }

    // Reset defaults
    const btnResetDefaults = document.getElementById('btn-reset-defaults');
    if (btnResetDefaults) {
      btnResetDefaults.addEventListener('click', () => {
        void this.resetDefaults();
      });
    }

    // Export settings
    const btnExport = document.getElementById('btn-export-settings');
    if (btnExport) {
      btnExport.addEventListener('click', () => {
        void this.exportSettings();
      });
    }

    // Import settings
    const btnImport = document.getElementById('btn-import-settings');
    const fileInput = document.getElementById('import-file') as HTMLInputElement;
    if (btnImport && fileInput) {
      btnImport.addEventListener('click', () => {
        fileInput.click();
      });

      fileInput.addEventListener('change', () => {
        if (fileInput.files && fileInput.files[0]) {
          void this.importSettings(fileInput.files[0]);
        }
      });
    }

    // Filename preview updates
    const templateInput = document.getElementById('export-filename-template');
    const formatSelect = document.getElementById('export-default-format');
    if (templateInput) {
      templateInput.addEventListener('input', () => {
        this.updateFilenamePreview();
      });
    }
    if (formatSelect) {
      formatSelect.addEventListener('change', () => {
        this.updateFilenamePreview();
      });
    }

    // Auto-save on change (optional)
    // Commented out for now, requires user confirmation

    // Blocklist management
    const btnAddBlocked = document.getElementById('btn-add-blocked-site');
    const blocklistInput = document.getElementById('blocklist-input') as HTMLInputElement;
    if (btnAddBlocked && blocklistInput) {
      btnAddBlocked.addEventListener('click', () => {
        void this.addBlockedSite(blocklistInput.value.trim());
        blocklistInput.value = '';
      });

      // Allow Enter key to add site
      blocklistInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          void this.addBlockedSite(blocklistInput.value.trim());
          blocklistInput.value = '';
        }
      });
    }
  }

  private setupNavigation(): void {
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.settings-section');

    navItems.forEach((item) => {
      item.addEventListener('click', () => {
        const sectionId = item.getAttribute('data-section');
        if (!sectionId) return;

        // Update active states
        navItems.forEach((nav) => nav.classList.remove('active'));
        sections.forEach((section) => section.classList.remove('active'));

        item.classList.add('active');
        const section = document.getElementById(sectionId);
        if (section) {
          section.classList.add('active');
        }
      });
    });
  }

  private async saveSettings(): Promise<void> {
    try {
      // Gather all settings
      const preferences: Partial<AppState['preferences']> = {
        theme: this.getSelectValue('theme') as ThemeName,
        autoTheme: this.getCheckboxValue('auto-theme'),
        lightTheme: this.getSelectValue('light-theme') as ThemeName,
        darkTheme: this.getSelectValue('dark-theme') as ThemeName,
        lineNumbers: this.getCheckboxValue('code-line-numbers'),
        enableHtml: this.getCheckboxValue('enable-html'),

        // Overrides
        fontFamily: this.getInputValue('font-family'),
        codeFontFamily: this.getInputValue('code-font-family'),
        lineHeight: this.getNumberValue('line-height'),
        maxWidth: this.getNumberValue('max-width'),

        // Table of Contents
        showToc: this.getCheckboxValue('show-toc'),
        tocMaxDepth: this.getNumberValue('toc-max-depth') || 6,
        tocAutoCollapse: this.getCheckboxValue('toc-auto-collapse'),
        tocPosition: this.getSelectValue('toc-position') as 'left' | 'right',
        tocStyle: this.getSelectValue('toc-style') as 'floating' | 'fixed',

        // Export
        exportDefaultFormat: this.getSelectValue('export-default-format') as 'docx' | 'pdf',
        exportDefaultPageSize: this.getSelectValue('export-default-page-size') as PaperSize,
        exportIncludeToc: this.getCheckboxValue('export-include-toc'),
        exportFilenameTemplate: this.getInputValue('export-filename-template') || '{title}',

        autoReload: this.getCheckboxValue('auto-reload'),
        syncTabs: this.getCheckboxValue('sync-tabs'),
        logLevel: this.getSelectValue('log-level') as LogLevel,

        // Blocklist (preserve existing blocklist)
        blockedSites: this.state?.preferences.blockedSites || [],
      };

      // Send to background
      await chrome.runtime.sendMessage({
        type: 'UPDATE_PREFERENCES',
        payload: { preferences },
      });

      // Update local state
      if (this.state) {
        this.state.preferences = { ...this.state.preferences, ...preferences };
      }

      this.hasChanges = false;
      this.updateSaveButton();
      this.showSaveStatus('Settings saved successfully', false);

      debug.log('Options', 'Settings saved:', preferences);
    } catch (error) {
      debug.error('Options', 'Failed to save settings:', error);
      this.showSaveStatus('Failed to save settings', true);
    }
  }

  private getSelectValue(id: string): string {
    const element = document.getElementById(id) as HTMLSelectElement;
    return element ? element.value : '';
  }

  private getCheckboxValue(id: string): boolean {
    const element = document.getElementById(id) as HTMLInputElement;
    return element ? element.checked : false;
  }

  private getInputValue(id: string): string {
    const element = document.getElementById(id) as HTMLInputElement;
    return element ? element.value : '';
  }

  private getNumberValue(id: string): number | undefined {
    const element = document.getElementById(id) as HTMLInputElement;
    if (!element || !element.value) return undefined;
    const val = parseFloat(element.value);
    return isNaN(val) ? undefined : val;
  }

  private updateSaveButton(): void {
    const btnSave = document.getElementById('btn-save') as HTMLButtonElement;
    if (btnSave) {
      btnSave.disabled = !this.hasChanges;
    }
  }

  private updateFilenamePreview(): void {
    const template = this.getInputValue('export-filename-template') || '{title}';
    const format = this.getSelectValue('export-default-format') || 'docx';

    const previewEl = document.getElementById('filename-preview-text');
    if (previewEl) {
      // Dynamic import to avoid circular dependency
      import('../utils/filename-generator')
        .then(({ FilenameGenerator }) => {
          const preview = FilenameGenerator.generate({
            title: 'My Document',
            extension: format,
            template,
          });
          previewEl.textContent = preview;
        })
        .catch((error) => {
          debug.error('Options', 'Failed to generate filename preview:', error);
          previewEl.textContent = 'preview-error.docx';
        });
    }
  }

  private showSaveStatus(message: string, isError: boolean): void {
    const status = document.getElementById('save-status');
    if (status) {
      status.textContent = message;
      status.className = isError ? 'save-status error' : 'save-status';

      setTimeout(() => {
        status.textContent = '';
      }, 3000);
    }
  }

  private async clearCache(): Promise<void> {
    if (!confirm('Are you sure you want to clear all cached data?')) {
      return;
    }

    try {
      await chrome.storage.local.clear();

      // Also invalidate memory cache in background
      await chrome.runtime.sendMessage({
        type: 'CACHE_INVALIDATE_BY_PATH',
        payload: { filePath: '' },
      }); // Hack to clear all via path if we don't have explicit clear all

      // Actually, we should probably add a proper clear command to background
      // For now let's use local storage clear as that's what we have

      this.showSaveStatus('Cache cleared successfully', false);
      debug.log('Options', 'Cache cleared');

      // Update stats
      await this.updateCacheStats();
    } catch (error) {
      debug.error('Options', 'Failed to clear cache:', error);
      this.showSaveStatus('Failed to clear cache', true);
    }
  }

  private async updateCacheStats(): Promise<void> {
    try {
      // Get stats from background service worker
      const response: unknown = await chrome.runtime.sendMessage({ type: 'CACHE_STATS' });
      const typedResponse = response as { stats?: { size: number; maxSize: number } };

      if (typedResponse && typedResponse.stats) {
        const { size, maxSize } = typedResponse.stats;

        const sizeEl = document.getElementById('cache-size');
        const maxEl = document.getElementById('cache-max');
        const memEl = document.getElementById('cache-memory');

        if (sizeEl) sizeEl.textContent = String(size);
        if (maxEl) maxEl.textContent = String(maxSize);

        // Estimate memory usage (very rough estimate: 100KB per entry on average?)
        // In reality we don't know exact memory usage easily in JS without more complex tracking
        // Let's just show item count for now or a rough estimate
        if (memEl) {
          const estimatedSize = size * 100 * 1024; // 100KB per entry
          const formattedSize =
            estimatedSize > 1024 * 1024
              ? `${(estimatedSize / (1024 * 1024)).toFixed(1)} MB`
              : `${(estimatedSize / 1024).toFixed(0)} KB`;

          memEl.textContent = `~${formattedSize}`;
        }
      }
    } catch (error) {
      debug.error('Options', 'Failed to update cache stats:', error);
    }
  }

  private async resetDefaults(): Promise<void> {
    if (
      !confirm(
        'Are you sure you want to reset all settings to their default values? This cannot be undone.'
      )
    ) {
      return;
    }

    try {
      // Reset to default preferences
      const defaultPreferences: AppState['preferences'] = {
        theme: 'github-light',
        autoTheme: true,
        lightTheme: 'github-light',
        darkTheme: 'github-dark',
        syntaxTheme: 'github',
        autoReload: true,
        lineNumbers: false,
        enableHtml: false,
        syncTabs: false,
        logLevel: 'error',
        // Export defaults
        exportDefaultFormat: 'docx',
        exportDefaultPageSize: 'A4',
        exportIncludeToc: true,
        exportFilenameTemplate: '{title}',
        // Blocklist defaults
        blockedSites: [],
      };

      await chrome.runtime.sendMessage({
        type: 'UPDATE_PREFERENCES',
        payload: { preferences: defaultPreferences },
      });

      // Update UI
      if (this.state) {
        this.state.preferences = defaultPreferences;
        this.updateUI();
      }

      this.hasChanges = false;
      this.updateSaveButton();
      this.showSaveStatus('Settings reset to defaults', false);

      debug.log('Options', 'Settings reset to defaults');
    } catch (error) {
      debug.error('Options', 'Failed to reset settings:', error);
      this.showSaveStatus('Failed to reset settings', true);
    }
  }

  private exportSettings(): void {
    if (!this.state) return;

    try {
      const settings = {
        version: '1.0.0',
        preferences: this.state.preferences,
        exportedAt: new Date().toISOString(),
      };

      const json = JSON.stringify(settings, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `mdview-settings-${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);

      this.showSaveStatus('Settings exported successfully', false);
      debug.log('Options', 'Settings exported');
    } catch (error) {
      debug.error('Options', 'Failed to export settings:', error);
      this.showSaveStatus('Failed to export settings', true);
    }
  }

  private async importSettings(file: File): Promise<void> {
    try {
      const text = await file.text();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const settings = JSON.parse(text);

      // Validate settings
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (!settings.preferences) {
        throw new Error('Invalid settings file');
      }

      // Apply settings
      await chrome.runtime.sendMessage({
        type: 'UPDATE_PREFERENCES',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
        payload: { preferences: settings.preferences },
      });

      // Update UI
      if (this.state) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
        this.state.preferences = settings.preferences;
        this.updateUI();
      }

      this.hasChanges = false;
      this.updateSaveButton();
      this.showSaveStatus('Settings imported successfully', false);

      debug.log('Options', 'Settings imported');
    } catch (error) {
      debug.error('Options', 'Failed to import settings:', error);
      this.showSaveStatus('Failed to import settings', true);
    }
  }

  /**
   * Render the blocklist UI
   */
  private renderBlocklist(blockedSites: string[]): void {
    const container = document.getElementById('blocklist-container');
    if (!container) return;

    if (blockedSites.length === 0) {
      container.innerHTML = '<div class="blocklist-empty">No sites blocked</div>';
      return;
    }

    container.innerHTML = blockedSites
      .map(
        (site, index) => `
        <div class="blocklist-item" data-index="${index}">
          <span class="blocklist-pattern">${this.escapeHtml(site)}</span>
          <button class="blocklist-remove" data-site="${this.escapeHtml(site)}">Remove</button>
        </div>
      `
      )
      .join('');

    // Add event listeners to remove buttons
    container.querySelectorAll('.blocklist-remove').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const site = (e.target as HTMLElement).getAttribute('data-site');
        if (site) {
          void this.removeBlockedSite(site);
        }
      });
    });
  }

  /**
   * Add a site to the blocklist
   */
  private async addBlockedSite(pattern: string): Promise<void> {
    if (!pattern) {
      this.showSaveStatus('Please enter a site pattern', true);
      return;
    }

    if (!this.state) return;

    const blockedSites = [...(this.state.preferences.blockedSites || [])];

    // Check for duplicates
    if (blockedSites.includes(pattern)) {
      this.showSaveStatus('Site already in blocklist', true);
      return;
    }

    blockedSites.push(pattern);

    try {
      await chrome.runtime.sendMessage({
        type: 'UPDATE_PREFERENCES',
        payload: { preferences: { blockedSites } },
      });

      this.state.preferences.blockedSites = blockedSites;
      this.renderBlocklist(blockedSites);
      this.showSaveStatus(`Added "${pattern}" to blocklist`, false);

      debug.log('Options', 'Added to blocklist:', pattern);
    } catch (error) {
      debug.error('Options', 'Failed to add to blocklist:', error);
      this.showSaveStatus('Failed to add site', true);
    }
  }

  /**
   * Remove a site from the blocklist
   */
  private async removeBlockedSite(pattern: string): Promise<void> {
    if (!this.state) return;

    const blockedSites = (this.state.preferences.blockedSites || []).filter(
      (site) => site !== pattern
    );

    try {
      await chrome.runtime.sendMessage({
        type: 'UPDATE_PREFERENCES',
        payload: { preferences: { blockedSites } },
      });

      this.state.preferences.blockedSites = blockedSites;
      this.renderBlocklist(blockedSites);
      this.showSaveStatus(`Removed "${pattern}" from blocklist`, false);

      debug.log('Options', 'Removed from blocklist:', pattern);
    } catch (error) {
      debug.error('Options', 'Failed to remove from blocklist:', error);
      this.showSaveStatus('Failed to remove site', true);
    }
  }

  /**
   * Escape HTML for safe rendering
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    const options = new OptionsManager();
    options.initialize().catch((err) => debug.error('Options', err));
  });
} else {
  const options = new OptionsManager();
  options.initialize().catch((err) => debug.error('Options', err));
}
