/**
 * Service Worker (Background Script)
 * Handles state management, message passing, and coordination between components
 */

import type { AppState } from '../types';

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
    debug: false,
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
          await stateManager.updatePreferences(preferences);
          sendResponse({ success: true });

          // Broadcast to all content scripts if syncTabs is enabled
          if (stateManager.getState().preferences.syncTabs) {
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
          }
          break;
        }

        case 'APPLY_THEME': {
          const { theme } = message.payload;
          await stateManager.updatePreferences({ theme });
          sendResponse({ success: true });

          // Broadcast to all tabs if syncTabs is enabled
          if (stateManager.getState().preferences.syncTabs) {
            const tabs = await chrome.tabs.query({});
            tabs.forEach((tab) => {
              if (tab.id) {
                chrome.tabs
                  .sendMessage(tab.id, {
                    type: 'APPLY_THEME',
                    payload: { theme },
                  })
                  .catch(() => {
                    /* Tab may not have content script */
                  });
              }
            });
          }
          break;
        }

        case 'REPORT_ERROR':
          console.error('[MDView] Error reported:', message.payload);
          sendResponse({ success: true });
          break;

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

