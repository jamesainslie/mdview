/**
 * Popup Script
 * Manages popup UI and interactions
 */

import type { AppState, ThemeName, LogLevel } from '../types';
import { debug } from '../utils/debug-logger';

class PopupManager {
  private state: AppState | null = null;
  private currentTabHostname: string | null = null;

  async initialize(): Promise<void> {
    debug.log('Popup', 'Initializing...');

    // Load state
    await this.loadState();

    // Get current tab info for site blocking
    await this.loadCurrentTabInfo();

    // Update UI with current state
    this.updateUI();

    // Setup event listeners
    this.setupEventListeners();

    // Setup storage listener
    this.setupStorageListener();

    // Set version
    this.setAppVersion();

    debug.log('Popup', 'Initialized');
  }

  private async loadCurrentTabInfo(): Promise<void> {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.url) {
        const url = new URL(tab.url);
        // Only show site blocking for http/https URLs
        if (url.protocol === 'http:' || url.protocol === 'https:') {
          this.currentTabHostname = url.hostname;
        } else if (url.protocol === 'file:') {
          // For local files, we could block by path pattern but it's less useful
          this.currentTabHostname = null;
        }
      }
    } catch (error) {
      debug.error('Popup', 'Failed to get current tab info:', error);
    }
  }

  private setAppVersion(): void {
    const versionElement = document.getElementById('app-version');
    if (versionElement) {
      // __APP_VERSION__ is injected by Vite at build time
      try {
        versionElement.textContent = `Version ${__APP_VERSION__}`;
      } catch (e) {
        // Fallback if define replacement fails (e.g. in some dev environments)
        debug.warn('Popup', 'Failed to set app version:', e);
      }
    }
  }

  private setupStorageListener(): void {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'sync' && changes.preferences) {
        const newPreferences = changes.preferences.newValue as Partial<AppState['preferences']>;
        debug.log('Popup', 'Storage changed, updating UI:', newPreferences);

        if (this.state) {
          this.state.preferences = { ...this.state.preferences, ...newPreferences };
          this.updateUI();
        }
      }
    });
  }

  private async loadState(): Promise<void> {
    try {
      const response: unknown = await chrome.runtime.sendMessage({ type: 'GET_STATE' });
      this.state = (response as { state: AppState }).state;
      debug.log('Popup', 'State loaded:', this.state);
    } catch (error) {
      debug.error('Popup', 'Failed to load state:', error);
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

    const enableHtml = document.getElementById('enable-html') as HTMLInputElement;
    if (enableHtml) {
      enableHtml.checked = !!preferences.enableHtml;
    }

    const useMaxWidth = document.getElementById('use-max-width') as HTMLInputElement;
    if (useMaxWidth) {
      useMaxWidth.checked = !!preferences.useMaxWidth;
    }

    const syncTabs = document.getElementById('sync-tabs') as HTMLInputElement;
    if (syncTabs) {
      syncTabs.checked = preferences.syncTabs;
    }

    const showToc = document.getElementById('show-toc') as HTMLInputElement;
    if (showToc) {
      showToc.checked = !!preferences.showToc;
    }

    // Update log level select
    const logLevelSelect = document.getElementById('log-level-select') as HTMLSelectElement;
    if (logLevelSelect) {
      logLevelSelect.value = preferences.logLevel || 'error';
    }

    // Update site blocking section
    this.updateSiteBlockingUI();
  }

  private updateSiteBlockingUI(): void {
    const toggleBtn = document.getElementById('btn-toggle-site-block');

    if (!toggleBtn) return;

    // Always keep the icon text (🚫), only change state and tooltip
    toggleBtn.textContent = '🚫';

    // For local files, disable the button
    if (!this.currentTabHostname) {
      toggleBtn.classList.add('disabled');
      (toggleBtn as HTMLButtonElement).disabled = true;
      toggleBtn.title = 'Site blocking is not available for local files';
      toggleBtn.setAttribute('aria-label', 'Site blocking is not available for local files');
      return;
    }

    (toggleBtn as HTMLButtonElement).disabled = false;
    toggleBtn.classList.remove('disabled');

    // Check if current site is blocked
    const blockedSites = this.state?.preferences.blockedSites || [];
    const isBlocked = this.isSiteInBlocklist(this.currentTabHostname, blockedSites);

    if (isBlocked) {
      toggleBtn.classList.add('blocked');
      const title = `Render ${this.currentTabHostname} with MDView`;
      toggleBtn.title = title;
      toggleBtn.setAttribute('aria-label', title);
    } else {
      toggleBtn.classList.remove('blocked');
      const title = `Don't render this site with MDView`;
      toggleBtn.title = title;
      toggleBtn.setAttribute('aria-label', title);
    }
  }

  private isSiteInBlocklist(hostname: string, blocklist: string[]): boolean {
    for (const pattern of blocklist) {
      // Exact match
      if (pattern === hostname) return true;
      // Wildcard subdomain match
      if (pattern.startsWith('*.')) {
        const baseDomain = pattern.substring(2);
        if (hostname === baseDomain || hostname.endsWith('.' + baseDomain)) {
          return true;
        }
      }
    }
    return false;
  }

  private setupEventListeners(): void {
    // Theme select
    const themeSelect = document.getElementById('theme-select');
    if (themeSelect) {
      themeSelect.addEventListener('change', (e) => {
        const target = e.target as HTMLSelectElement;
        void this.handleThemeChange(target.value as ThemeName);
      });
    }

    // Auto theme toggle
    const autoTheme = document.getElementById('auto-theme');
    if (autoTheme) {
      autoTheme.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        void this.handlePreferenceChange({ autoTheme: target.checked });
      });
    }

    // Auto reload toggle
    const autoReload = document.getElementById('auto-reload');
    if (autoReload) {
      autoReload.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        void this.handlePreferenceChange({ autoReload: target.checked });
      });
    }

    // Line numbers toggle
    const lineNumbers = document.getElementById('line-numbers');
    if (lineNumbers) {
      lineNumbers.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        debug.log('Popup', 'Line numbers toggle changed:', target.checked);
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        void (async () => {
          await this.handlePreferenceChange({ lineNumbers: target.checked });
          // Trigger reload to re-render with line numbers
          await chrome.tabs.reload();
        })();
      });
    }

    // Enable HTML toggle
    const enableHtml = document.getElementById('enable-html');
    if (enableHtml) {
      enableHtml.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        debug.log('Popup', 'Enable HTML toggle changed:', target.checked);
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        void (async () => {
          await this.handlePreferenceChange({ enableHtml: target.checked });
          // Trigger reload to re-render with HTML enabled/disabled
          await chrome.tabs.reload();
        })();
      });
    }

    // Use max width toggle
    const useMaxWidth = document.getElementById('use-max-width');
    if (useMaxWidth) {
      useMaxWidth.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        debug.log('Popup', 'Use max width toggle changed:', target.checked);
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        void (async () => {
          await this.handlePreferenceChange({ useMaxWidth: target.checked });
          // Trigger reload to re-render with new max width
          await chrome.tabs.reload();
        })();
      });
    }

    // Sync tabs toggle
    const syncTabs = document.getElementById('sync-tabs');
    if (syncTabs) {
      syncTabs.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        void this.handlePreferenceChange({ syncTabs: target.checked });
      });
    }

    // Show TOC toggle
    const showToc = document.getElementById('show-toc');
    if (showToc) {
      showToc.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        debug.log('Popup', 'Show TOC toggle changed:', target.checked);
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        void (async () => {
          await this.handlePreferenceChange({ showToc: target.checked });
          // Trigger reload to show/hide TOC
          await chrome.tabs.reload();
        })();
      });
    }

    // Log level select
    const logLevelSelect = document.getElementById('log-level-select');
    if (logLevelSelect) {
      logLevelSelect.addEventListener('change', (e) => {
        const target = e.target as HTMLSelectElement;
        void this.handlePreferenceChange({ logLevel: target.value as LogLevel });
      });
    }

    // Settings button
    const btnSettings = document.getElementById('btn-settings');
    if (btnSettings) {
      btnSettings.addEventListener('click', () => {
        void chrome.runtime.openOptionsPage();
      });
    }

    // Reload extension (reload current tab) button
    const btnReload = document.getElementById('btn-reload-extension');
    if (btnReload) {
      btnReload.addEventListener('click', () => {
        debug.log('Popup', 'Reload Extension button clicked - reloading active tab');
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        void (async () => {
          try {
            await chrome.tabs.reload();
          } catch (error) {
            debug.error('Popup', 'Failed to reload tab from Reload Extension button:', error);
          }
        })();
      });
    }

    // Help button
    const btnHelp = document.getElementById('btn-help');
    if (btnHelp) {
      btnHelp.addEventListener('click', () => {
        void chrome.tabs.create({
          url: 'https://github.com/jamesainslie/mdview#readme',
        });
      });
    }

    // Site block toggle button
    const btnToggleSiteBlock = document.getElementById('btn-toggle-site-block');
    if (btnToggleSiteBlock) {
      btnToggleSiteBlock.addEventListener('click', () => {
        void this.toggleCurrentSiteBlocked();
      });
    }
  }

  private async toggleCurrentSiteBlocked(): Promise<void> {
    if (!this.currentTabHostname || !this.state) return;

    const currentHost = this.currentTabHostname;
    const blockedSites = [...(this.state.preferences.blockedSites || [])];
    const isCurrentlyBlocked = this.isSiteInBlocklist(currentHost, blockedSites);

    let newBlockedSites: string[];
    if (isCurrentlyBlocked) {
      // Remove from blocklist (find exact match or wildcard that covers it)
      newBlockedSites = blockedSites.filter((pattern) => {
        if (pattern === currentHost) {
          return false;
        }

        if (pattern.startsWith('*.')) {
          const baseDomain = pattern.substring(2);
          // currentHost is guaranteed to be a non-empty string here because
          // we returned early when it was falsy. Use direct access so that
          // wildcard patterns like "*.example.com" match both the base
          // domain and its subdomains.
          if (currentHost === baseDomain || currentHost.endsWith(`.${baseDomain}`)) {
            return false;
          }
        }

        return true;
      });
    } else {
      // Add to blocklist
      newBlockedSites = [...blockedSites, this.currentTabHostname];
    }

    try {
      await chrome.runtime.sendMessage({
        type: 'UPDATE_PREFERENCES',
        payload: { preferences: { blockedSites: newBlockedSites } },
      });

      this.state.preferences.blockedSites = newBlockedSites;
      this.updateSiteBlockingUI();

      // Reload the tab to apply the change
      await chrome.tabs.reload();

      debug.log(
        'Popup',
        isCurrentlyBlocked ? 'Unblocked site:' : 'Blocked site:',
        this.currentTabHostname
      );
    } catch (error) {
      debug.error('Popup', 'Failed to toggle site block:', error);
    }
  }

  private async handleThemeChange(theme: ThemeName): Promise<void> {
    debug.log('Popup', 'handleThemeChange called with:', theme);
    try {
      debug.log('Popup', 'Sending APPLY_THEME message to background');
      await chrome.runtime.sendMessage({
        type: 'APPLY_THEME',
        payload: { theme },
      });

      // Update local state
      if (this.state) {
        this.state.preferences.theme = theme;
      }

      debug.log('Popup', 'Theme change message sent successfully:', theme);
    } catch (error) {
      debug.error('Popup', 'Failed to change theme:', error);
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

      debug.log('Popup', 'Preferences updated:', preferences);
    } catch (error) {
      debug.error('Popup', 'Failed to update preferences:', error);
    }
  }
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    const popup = new PopupManager();
    popup.initialize().catch((err) => debug.error('Popup', err));
  });
} else {
  const popup = new PopupManager();
  popup.initialize().catch((err) => debug.error('Popup', err));
}
