/**
 * Service Worker (Background Script)
 * Handles state management, message passing, coordination, and cache management
 */

import type { AppState, ThemeName } from '../types';
import { CacheManager } from '../core/cache-manager';

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
    syncTabs: false,
    logLevel: 'error',
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
      const syncData = await chrome.storage.sync.get('preferences');
      if (syncData.preferences) {
        this.state.preferences = { ...this.state.preferences, ...syncData.preferences };
      }

      // Load UI state from Local Storage
      const localData = await chrome.storage.local.get(['ui', 'document']);
      if (localData.ui) {
        this.state.ui = { ...this.state.ui, ...localData.ui };
      }
      if (localData.document) {
        this.state.document = { ...this.state.document, ...localData.document };
      }

      console.log('[MDView] State initialized:', this.state);
    } catch (error) {
      console.error('[MDView] Failed to initialize state:', error);
    }
  }

  getState(): AppState {
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
      console.error('[MDView] Failed to persist state:', error);
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
    this.listeners.get(path)!.add(listener);

    return () => {
      this.listeners.get(path)?.delete(listener);
    };
  }
}

const stateManager = new StateManager();

// Initialize immediately when service worker loads
let initializationPromise = stateManager.initialize();

// Initialize on install
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[MDView] Extension installed/updated:', details.reason);
  await initializationPromise;

  if (details.reason === 'install') {
    // First-time installation
    console.log('[MDView] First-time installation detected');
    // Could open a welcome page here
  }
});

// Initialize on startup
chrome.runtime.onStartup.addListener(async () => {
  console.log('[MDView] Browser startup, initializing extension');
  await initializationPromise;
});

// Message handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[MDView] Received message:', message.type, 'from:', sender.tab?.id);

  (async () => {
    try {
      // Wait for initialization to complete before processing messages
      await initializationPromise;

      switch (message.type) {
        case 'GET_STATE':
          sendResponse({ state: stateManager.getState() });
          break;

        case 'UPDATE_PREFERENCES': {
          const { preferences } = message.payload;
          console.log('[MDView-Background] Processing UPDATE_PREFERENCES:', preferences);

          await stateManager.updatePreferences(preferences);
          sendResponse({ success: true });

          // Always broadcast preference updates to tabs so they can react (e.g. line numbers)
          // This fixes the issue where toggles didn't work if syncTabs was false
          console.log('[MDView-Background] Broadcasting preferences update to tabs');
          const tabs = await chrome.tabs.query({});
          tabs.forEach((tab) => {
            if (tab.id) {
              chrome.tabs
                .sendMessage(tab.id, {
                  type: 'PREFERENCES_UPDATED',
                  payload: { preferences: stateManager.getState().preferences },
                })
                .catch(() => {
                  /* Tab may not have content script */
                });
            }
          });
          break;
        }

        case 'APPLY_THEME': {
          const { theme } = message.payload;
          console.log('[MDView-Background] Processing APPLY_THEME:', theme);
          
          await stateManager.updatePreferences({ theme });
          console.log('[MDView-Background] Preferences updated');
          
          sendResponse({ success: true });

          // Broadcast to all tabs if syncTabs is enabled OR just to ensure current tab gets it
          // Note: The popup sends this, so we usually want to notify all tabs or at least the active one.
          // The current logic only broadcasts if syncTabs is true. This might be the bug if syncTabs is false.
          // Let's log the logic branch.
          const syncTabs = stateManager.getState().preferences.syncTabs;
          console.log('[MDView-Background] Sync tabs enabled:', syncTabs);

          if (true) { // FORCE BROADCAST FOR DEBUGGING - logic below might be too restrictive
            console.log('[MDView-Background] Broadcasting theme change to all tabs');
            const tabs = await chrome.tabs.query({});
            tabs.forEach((tab) => {
              if (tab.id) {
                console.log('[MDView-Background] Sending APPLY_THEME to tab:', tab.id);
                chrome.tabs
                  .sendMessage(tab.id, {
                    type: 'APPLY_THEME',
                    payload: { theme },
                  })
                  .catch((err) => {
                    // Tab may not have content script
                     console.log('[MDView-Background] Failed to send to tab (likely no content script):', tab.id, err.message);
                  });
              }
            });
          }
          break;
        }

        case 'CACHE_GENERATE_KEY': {
          const { filePath, content, theme, preferences } = message.payload;
          const key = await cacheManager.generateKey(filePath, content, theme as ThemeName, preferences);
          sendResponse({ key });
          break;
        }

        case 'CACHE_GET': {
          const { key } = message.payload;
          const result = await cacheManager.get(key);
          sendResponse({ result });
          break;
        }

        case 'CACHE_SET': {
          const { key, result, filePath, contentHash, theme } = message.payload;
          await cacheManager.set(key, result, filePath, contentHash, theme as ThemeName);
          sendResponse({ success: true });
          break;
        }

        case 'CACHE_INVALIDATE': {
          const { key } = message.payload;
          cacheManager.invalidate(key);
          sendResponse({ success: true });
          break;
        }

        case 'CACHE_INVALIDATE_BY_PATH': {
          const { filePath } = message.payload;
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
          console.error('[MDView] Error reported:', message.payload);
          sendResponse({ success: true });
          break;

        case 'CHECK_FILE_CHANGED': {
          const { url, lastHash } = message.payload;
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
             const currentHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
             
             const changed = currentHash !== lastHash;
             sendResponse({ changed, newHash: currentHash });
          } catch (error) {
             console.error('[MDView-Background] File check failed:', error);
             sendResponse({ changed: false, error: String(error) });
          }
          break;
        }

        default:
          console.warn('[MDView] Unknown message type:', message.type);
          sendResponse({ error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('[MDView] Error handling message:', error);
      sendResponse({ error: String(error) });
    }
  })();

  // Return true to indicate async response
  return true;
});

// Export for debugging
if (typeof window !== 'undefined') {
  (window as any).mdviewState = stateManager;
}

console.log('[MDView] Service worker initialized');

