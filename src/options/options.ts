/**
 * Options Page Script
 * Manages settings page UI and interactions
 */

import type { AppState, ThemeName, LogLevel } from '../types';

class OptionsManager {
  private state: AppState | null = null;
  private hasChanges = false;

  async initialize(): Promise<void> {
    console.log('[Options] Initializing...');

    // Load state
    await this.loadState();

    // Update UI with current state
    this.updateUI();

    // Setup event listeners
    this.setupEventListeners();

    // Setup navigation
    this.setupNavigation();

    console.log('[Options] Initialized');
  }

  private async loadState(): Promise<void> {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_STATE' });
      this.state = response.state;
      console.log('[Options] State loaded:', this.state);
    } catch (error) {
      console.error('[Options] Failed to load state:', error);
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

    // Editor
    // Use defaults for now (these would come from state in real implementation)
    this.setValue('font-size', '16');
    this.setValue('line-height', '1.5');
    this.setValue('max-width', '980');

    // Code Blocks
    this.setValue('syntax-theme', preferences.syntaxTheme);
    this.setValue('code-line-numbers', preferences.lineNumbers);

    // Diagrams
    // Use defaults
    this.setValue('diagram-zoom', '100');
    this.setValue('diagram-animations', true);
    this.setValue('diagram-timeout', '5');

    // Performance
    this.setValue('auto-reload', preferences.autoReload);
    this.setValue('reload-debounce', '300');
    this.setValue('lazy-threshold', '500');

    // Advanced
    this.setValue('sync-tabs', preferences.syncTabs);
    this.setValue('log-level', preferences.logLevel || 'error');
  }

  private setValue(id: string, value: string | boolean | number): void {
    const element = document.getElementById(id) as
      | HTMLInputElement
      | HTMLSelectElement
      | null;
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
        this.saveSettings();
      });
    }

    // Clear cache
    const btnClearCache = document.getElementById('btn-clear-cache');
    if (btnClearCache) {
      btnClearCache.addEventListener('click', () => {
        this.clearCache();
      });
    }

    // Reset defaults
    const btnResetDefaults = document.getElementById('btn-reset-defaults');
    if (btnResetDefaults) {
      btnResetDefaults.addEventListener('click', () => {
        this.resetDefaults();
      });
    }

    // Export settings
    const btnExport = document.getElementById('btn-export-settings');
    if (btnExport) {
      btnExport.addEventListener('click', () => {
        this.exportSettings();
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
          this.importSettings(fileInput.files[0]);
        }
      });
    }

    // Auto-save on change (optional)
    // Commented out for now, requires user confirmation
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
        syntaxTheme: this.getSelectValue('syntax-theme'),
        lineNumbers: this.getCheckboxValue('code-line-numbers'),
        autoReload: this.getCheckboxValue('auto-reload'),
        syncTabs: this.getCheckboxValue('sync-tabs'),
        logLevel: this.getSelectValue('log-level') as LogLevel,
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

      console.log('[Options] Settings saved:', preferences);
    } catch (error) {
      console.error('[Options] Failed to save settings:', error);
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

  private updateSaveButton(): void {
    const btnSave = document.getElementById('btn-save') as HTMLButtonElement;
    if (btnSave) {
      btnSave.disabled = !this.hasChanges;
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
      this.showSaveStatus('Cache cleared successfully', false);
      console.log('[Options] Cache cleared');
    } catch (error) {
      console.error('[Options] Failed to clear cache:', error);
      this.showSaveStatus('Failed to clear cache', true);
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
        syncTabs: false,
        logLevel: 'error',
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

      console.log('[Options] Settings reset to defaults');
    } catch (error) {
      console.error('[Options] Failed to reset settings:', error);
      this.showSaveStatus('Failed to reset settings', true);
    }
  }

  private async exportSettings(): Promise<void> {
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
      console.log('[Options] Settings exported');
    } catch (error) {
      console.error('[Options] Failed to export settings:', error);
      this.showSaveStatus('Failed to export settings', true);
    }
  }

  private async importSettings(file: File): Promise<void> {
    try {
      const text = await file.text();
      const settings = JSON.parse(text);

      // Validate settings
      if (!settings.preferences) {
        throw new Error('Invalid settings file');
      }

      // Apply settings
      await chrome.runtime.sendMessage({
        type: 'UPDATE_PREFERENCES',
        payload: { preferences: settings.preferences },
      });

      // Update UI
      if (this.state) {
        this.state.preferences = settings.preferences;
        this.updateUI();
      }

      this.hasChanges = false;
      this.updateSaveButton();
      this.showSaveStatus('Settings imported successfully', false);

      console.log('[Options] Settings imported');
    } catch (error) {
      console.error('[Options] Failed to import settings:', error);
      this.showSaveStatus('Failed to import settings', true);
    }
  }
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    const options = new OptionsManager();
    options.initialize().catch(console.error);
  });
} else {
  const options = new OptionsManager();
  options.initialize().catch(console.error);
}

