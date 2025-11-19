/**
 * Popup Script
 * Manages popup UI and interactions
 */

import type { AppState, ThemeName } from '../types';

class PopupManager {
  private state: AppState | null = null;

  async initialize(): Promise<void> {
    console.log('[Popup] Initializing...');

    // Load state
    await this.loadState();

    // Update UI with current state
    this.updateUI();

    // Setup event listeners
    this.setupEventListeners();

    console.log('[Popup] Initialized');
  }

  private async loadState(): Promise<void> {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_STATE' });
      this.state = response.state;
      console.log('[Popup] State loaded:', this.state);
    } catch (error) {
      console.error('[Popup] Failed to load state:', error);
    }
  }

  private updateUI(): void {
    if (!this.state) return;

    const { preferences } = this.state;

    // Update theme select
    const themeSelect = document.getElementById('theme-select') as HTMLSelectElement;
    if (themeSelect) {
      themeSelect.value = preferences.theme;
    }

    // Update toggles
    const autoTheme = document.getElementById('auto-theme') as HTMLInputElement;
    if (autoTheme) {
      autoTheme.checked = preferences.autoTheme;
    }

    const autoReload = document.getElementById('auto-reload') as HTMLInputElement;
    if (autoReload) {
      autoReload.checked = preferences.autoReload;
    }

    const lineNumbers = document.getElementById('line-numbers') as HTMLInputElement;
    if (lineNumbers) {
      lineNumbers.checked = preferences.lineNumbers;
    }

    const syncTabs = document.getElementById('sync-tabs') as HTMLInputElement;
    if (syncTabs) {
      syncTabs.checked = preferences.syncTabs;
    }
  }

  private setupEventListeners(): void {
    // Theme select
    const themeSelect = document.getElementById('theme-select');
    if (themeSelect) {
      themeSelect.addEventListener('change', (e) => {
        const target = e.target as HTMLSelectElement;
        this.handleThemeChange(target.value as ThemeName);
      });
    }

    // Auto theme toggle
    const autoTheme = document.getElementById('auto-theme');
    if (autoTheme) {
      autoTheme.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        this.handlePreferenceChange({ autoTheme: target.checked });
      });
    }

    // Auto reload toggle
    const autoReload = document.getElementById('auto-reload');
    if (autoReload) {
      autoReload.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        this.handlePreferenceChange({ autoReload: target.checked });
      });
    }

    // Line numbers toggle
    const lineNumbers = document.getElementById('line-numbers');
    if (lineNumbers) {
      lineNumbers.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        console.log('[Popup] Line numbers toggle changed:', target.checked);
        this.handlePreferenceChange({ lineNumbers: target.checked });
      });
    }

    // Sync tabs toggle
    const syncTabs = document.getElementById('sync-tabs');
    if (syncTabs) {
      syncTabs.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        this.handlePreferenceChange({ syncTabs: target.checked });
      });
    }

    // Settings button
    const btnSettings = document.getElementById('btn-settings');
    if (btnSettings) {
      btnSettings.addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
      });
    }

    // Help button
    const btnHelp = document.getElementById('btn-help');
    if (btnHelp) {
      btnHelp.addEventListener('click', () => {
        chrome.tabs.create({
          url: 'https://github.com/jamesainslie/mdview#readme',
        });
      });
    }
  }

  private async handleThemeChange(theme: ThemeName): Promise<void> {
    console.log('[Popup] handleThemeChange called with:', theme);
    try {
      console.log('[Popup] Sending APPLY_THEME message to background');
      await chrome.runtime.sendMessage({
        type: 'APPLY_THEME',
        payload: { theme },
      });

      // Update local state
      if (this.state) {
        this.state.preferences.theme = theme;
      }

      console.log('[Popup] Theme change message sent successfully:', theme);
    } catch (error) {
      console.error('[Popup] Failed to change theme:', error);
    }
  }

  private async handlePreferenceChange(
    preferences: Partial<AppState['preferences']>
  ): Promise<void> {
    try {
      await chrome.runtime.sendMessage({
        type: 'UPDATE_PREFERENCES',
        payload: { preferences },
      });

      // Update local state
      if (this.state) {
        this.state.preferences = { ...this.state.preferences, ...preferences };
      }

      console.log('[Popup] Preferences updated:', preferences);
    } catch (error) {
      console.error('[Popup] Failed to update preferences:', error);
    }
  }
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    const popup = new PopupManager();
    popup.initialize().catch(console.error);
  });
} else {
  const popup = new PopupManager();
  popup.initialize().catch(console.error);
}


