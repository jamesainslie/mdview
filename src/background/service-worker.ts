/**
 * Service Worker (Background Script)
 * Handles state management, message passing, coordination, and cache management
 */

import type { AppState, ThemeName } from '../types';
import { CacheManager } from '../core/cache-manager';
import { debug } from '../utils/debug-logger';
import { UpdateManager } from '../core/update-manager';
import { ChromeUpdateClient, TestUpdateClient } from '../core/update/update-clients';

// Default state
const defaultState: AppState = {
  preferences: {
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
    showToc: false,
    tocMaxDepth: 6,
    tocAutoCollapse: false,
    tocPosition: 'left',
    blockedSites: [], // Sites where MDView should not render
  },
  document: {
    path: '',
    content: '',
    scrollPosition: 0,
    renderState: 'pending',
  },
  ui: {
    theme: null,
    maximizedDiagram: null,
    visibleDiagrams: new Set(),
    tocVisible: false,
  },
};

// Cache management (persists across page reloads)
const cacheManager = new CacheManager({ maxSize: 50, maxAge: 3600000 });

// State management
class StateManager {
  private state: AppState = defaultState;
  private listeners: Map<string, Set<(state: AppState) => void>> = new Map();

  async initialize(): Promise<void> {
    try {
      // Load preferences from Chrome Sync Storage
      const syncData = (await chrome.storage.sync.get('preferences')) as {
        preferences?: Partial<AppState['preferences']>;
      };
      if (syncData.preferences) {
        this.state.preferences = { ...this.state.preferences, ...syncData.preferences };
      }

      // Load UI state from Local Storage
      const localData = (await chrome.storage.local.get(['ui', 'document'])) as {
        ui?: Partial<AppState['ui']>;
        document?: Partial<AppState['document']>;
      };
      if (localData.ui) {
        this.state.ui = { ...this.state.ui, ...localData.ui };
      }
      if (localData.document) {
        this.state.document = { ...this.state.document, ...localData.document };
      }

      debug.log('MDView', 'State initialized:', this.state);
    } catch (error) {
      debug.error('MDView', 'Failed to initialize state:', error);
    }
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async getState(): Promise<AppState> {
    return { ...this.state };
  }

  async updateState(updates: Partial<AppState>): Promise<void> {
    this.state = { ...this.state, ...updates };
    await this.persistState();
    this.notifyListeners();
  }

  async updatePreferences(preferences: Partial<AppState['preferences']>): Promise<void> {
    this.state.preferences = { ...this.state.preferences, ...preferences };
    await chrome.storage.sync.set({ preferences: this.state.preferences });
    this.notifyListeners();
  }

  private async persistState(): Promise<void> {
    try {
      // Save preferences to Sync Storage
      await chrome.storage.sync.set({ preferences: this.state.preferences });

      // Save UI state to Local Storage
      await chrome.storage.local.set({
        ui: this.state.ui,
        document: this.state.document,
      });
    } catch (error) {
      debug.error('MDView', 'Failed to persist state:', error);
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach((listeners) => {
      listeners.forEach((listener) => listener(this.state));
    });
  }

  subscribe(path: string, listener: (state: AppState) => void): () => void {
    if (!this.listeners.has(path)) {
      this.listeners.set(path, new Set());
    }
    const pathListeners = this.listeners.get(path);
    if (pathListeners) {
      pathListeners.add(listener);
    }

    return () => {
      this.listeners.get(path)?.delete(listener);
    };
  }
}

const stateManager = new StateManager();

const isTesting = typeof __MDVIEW_TESTING__ !== 'undefined' && __MDVIEW_TESTING__ === true;
const updateClient = isTesting ? new TestUpdateClient() : new ChromeUpdateClient();
const updateManager = new UpdateManager(updateClient);

// Initialize immediately when service worker loads
const initializationPromise = Promise.all([
  stateManager.initialize(),
  updateManager.initialize(),
]).then(() => undefined);

// Initialize on install
chrome.runtime.onInstalled.addListener((details) => {
  debug.log('MDView', 'Extension installed/updated:', details.reason);
  void (async () => {
    await initializationPromise;

    if (details.reason === chrome.runtime.OnInstalledReason.INSTALL) {
      // First-time installation
      debug.log('MDView', 'First-time installation detected');
      // Could open a welcome page here
    }
  })();
});

// Initialize on startup
chrome.runtime.onStartup.addListener(() => {
  debug.log('MDView', 'Browser startup, initializing extension');
  void (async () => {
    await initializationPromise;
  })();
});

// Message handler
chrome.runtime.onMessage.addListener(
  (message: { type: string; payload?: unknown }, sender, sendResponse) => {
    debug.log('MDView', 'Received message:', message.type, 'from:', sender.tab?.id);

    void (async () => {
      try {
        // Wait for initialization to complete before processing messages
        await initializationPromise;

        switch (message.type) {
          case 'GET_STATE':
            sendResponse({ state: await stateManager.getState() });
            break;

          case 'UPDATE_GET_STATE':
            sendResponse({ updateState: updateManager.getState() });
            break;

          case 'UPDATE_CHECK':
            sendResponse({ updateState: await updateManager.checkNow() });
            break;

          case 'UPDATE_APPLY':
            sendResponse(updateManager.applyNow());
            break;

          case 'UPDATE_PREFERENCES': {
            const payload = message.payload as { preferences: Partial<AppState['preferences']> };
            const { preferences } = payload;
            debug.log('MDView-Background', 'Processing UPDATE_PREFERENCES:', preferences);

            await stateManager.updatePreferences(preferences);
            sendResponse({ success: true });

            // Always broadcast preference updates to tabs so they can react (e.g. line numbers)
            // This fixes the issue where toggles didn't work if syncTabs was false
            debug.log('MDView-Background', 'Broadcasting preferences update to tabs');
            const tabs = await chrome.tabs.query({});
            tabs.forEach((tab) => {
              if (tab.id) {
                const tabId = tab.id;
                void (async () => {
                  const state = await stateManager.getState();
                  return chrome.tabs.sendMessage(tabId, {
                    type: 'PREFERENCES_UPDATED',
                    payload: { preferences: state.preferences },
                  });
                })().catch(() => {
                  /* Tab may not have content script */
                });
              }
            });
            break;
          }

          case 'APPLY_THEME': {
            const payload = message.payload as { theme: ThemeName };
            const { theme } = payload;
            debug.log('MDView-Background', 'Processing APPLY_THEME:', theme);

            await stateManager.updatePreferences({ theme });
            debug.log('MDView-Background', 'Preferences updated');

            sendResponse({ success: true });

            // Broadcast to all tabs if syncTabs is enabled OR just to ensure current tab gets it
            // Note: The popup sends this, so we usually want to notify all tabs or at least the active one.
            // The current logic only broadcasts if syncTabs is true. This might be the bug if syncTabs is false.
            // Let's log the logic branch.
            // Always broadcast theme changes to all tabs to ensure proper theme application
            debug.log('MDView-Background', 'Broadcasting theme change to all tabs');
            const tabs = await chrome.tabs.query({});
            tabs.forEach((tab) => {
              if (tab.id) {
                debug.log('MDView-Background', 'Sending APPLY_THEME to tab:', tab.id);
                void chrome.tabs
                  .sendMessage(tab.id, {
                    type: 'APPLY_THEME',
                    payload: { theme },
                  })
                  .catch((err: Error) => {
                    // Tab may not have content script
                    debug.log(
                      'MDView-Background',
                      'Failed to send to tab (likely no content script):',
                      tab.id,
                      err.message
                    );
                  });
              }
            });
            break;
          }

          case 'CACHE_GENERATE_KEY': {
            const payload = message.payload as {
              filePath: string;
              content: string;
              theme: ThemeName;
              preferences: Record<string, unknown>;
            };
            const { filePath, content, theme, preferences } = payload;
            const key = await cacheManager.generateKey(filePath, content, theme, preferences);
            sendResponse({ key });
            break;
          }

          case 'CACHE_GET': {
            const payload = message.payload as { key: string };
            const { key } = payload;
            const result = cacheManager.get(key);
            sendResponse({ result });
            break;
          }

          case 'CACHE_SET': {
            const payload = message.payload as {
              key: string;
              result: import('../types').CachedResult;
              filePath: string;
              contentHash: string;
              theme: ThemeName;
            };
            const { key, result, filePath, contentHash, theme } = payload;
            cacheManager.set(key, result, filePath, contentHash, theme);
            sendResponse({ success: true });
            break;
          }

          case 'CACHE_INVALIDATE': {
            const payload = message.payload as { key: string };
            const { key } = payload;
            cacheManager.invalidate(key);
            sendResponse({ success: true });
            break;
          }

          case 'CACHE_INVALIDATE_BY_PATH': {
            const payload = message.payload as { filePath: string };
            const { filePath } = payload;
            cacheManager.invalidateByPath(filePath);
            sendResponse({ success: true });
            break;
          }

          case 'CACHE_STATS': {
            const stats = cacheManager.getStats();
            sendResponse({ stats });
            break;
          }

          case 'REPORT_ERROR':
            debug.error('MDView', 'Error reported:', message.payload);
            sendResponse({ success: true });
            break;

          case 'CHECK_FILE_CHANGED': {
            const payload = message.payload as { url: string; lastHash: string };
            const { url, lastHash } = payload;
            try {
              const response = await fetch(url);
              if (!response.ok) {
                sendResponse({ changed: false, error: `Fetch failed: ${response.status}` });
                break;
              }

              const text = await response.text();

              // Compute hash (simple djb2-like or similar since we don't have crypto.subtle here easily without async)
              // Wait, we can use crypto.subtle in service workers!
              const msgBuffer = new TextEncoder().encode(text);
              const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
              const hashArray = Array.from(new Uint8Array(hashBuffer));
              const currentHash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

              const changed = currentHash !== lastHash;
              sendResponse({ changed, newHash: currentHash });
            } catch (error) {
              debug.error('MDView-Background', 'File check failed:', error);
              sendResponse({ changed: false, error: String(error) });
            }
            break;
          }

          default:
            debug.warn('MDView', 'Unknown message type:', message.type);
            sendResponse({ error: 'Unknown message type' });
        }
      } catch (error) {
        debug.error('MDView', 'Error handling message:', error);
        sendResponse({ error: String(error) });
      }
    })();

    // Return true to indicate async response
    return true;
  }
);

// Export for debugging
if (typeof window !== 'undefined') {
  (window as { mdviewState?: StateManager; mdviewUpdates?: UpdateManager }).mdviewState =
    stateManager;
  (window as { mdviewState?: StateManager; mdviewUpdates?: UpdateManager }).mdviewUpdates =
    updateManager;
}

debug.log('MDView', 'Service worker initialized');
