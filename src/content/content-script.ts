/**
 * Content Script
 * Injected into markdown files to handle rendering
 */

import './content.css';
import { FileScanner } from '../utils/file-scanner';
import type { AppState } from '../types';
import { debug } from '../utils/debug-logger';

// Fix Vite's dynamic import base path for Chrome extensions
// Override import.meta to use chrome-extension:// base URL
try {
  // Get the extension's base URL
  const extensionBaseUrl = chrome.runtime.getURL('/');

  // Patch the URL constructor for Vite's module resolution
  const OriginalURL = window.URL;
  // @ts-expect-error - TS doesn't like extending URL with different signature
  window.URL = class extends OriginalURL {
    constructor(url: string | URL, base?: string | URL) {
      // Convert file:// base URLs to chrome-extension:// URLs
      if (base && typeof base === 'string' && base.startsWith('file://')) {
        // Use extension base URL instead
        super(url, extensionBaseUrl);
      } else {
        super(url, base);
      }
    }
  };
  // Preserve static methods
  Object.assign(window.URL, OriginalURL);
} catch (error) {
  debug.warn('MDView', 'Failed to patch URL constructor:', error);
}

class MDViewContentScript {
  private autoReloadCleanup: (() => void) | null = null;
  private state: AppState | null = null;

  async initialize(): Promise<void> {
    // Prevent running in iframes (used for file watching)
    if (window.self !== window.top) {
      return;
    }

    const initStartTime = Date.now();

    // Check if this is a markdown file (before logging, since we need state for debug mode)
    const isMarkdown = FileScanner.isMarkdownFile();
    if (!isMarkdown) {
      // Can't debug.log here as debug mode isn't loaded yet
      console.log('[MDView] Not a markdown file, skipping initialization');
      return;
    }

    try {
      // Get initial state from background FIRST (sets debug mode)
      await this.loadState();

      // Now we can log with proper debug mode
      debug.info('MDView', '=== INITIALIZATION STARTED ===');
      debug.debug('MDView', `URL: ${window.location.href}`);
      debug.debug('MDView', `Document ready state: ${document.readyState}`);
      debug.debug('MDView', `Debug mode enabled: ${this.state?.preferences.debug}`);
      debug.debug('MDView', `Auto-reload enabled: ${this.state?.preferences.autoReload}`);
      debug.info('MDView', 'Content script initializing...');
      debug.info('MDView', 'Markdown file detected:', FileScanner.getFilePath());

      // Read file content
      debug.debug('MDView', 'Reading file content...');
      const content = FileScanner.readFileContent();
      const fileSize = FileScanner.getFileSize(content);
      const initialHash = await FileScanner.generateHash(content);
      debug.info(
        'MDView',
        `File content loaded: ${FileScanner.formatFileSize(fileSize)} (${fileSize} bytes)`
      );

      // Check file size
      if (!FileScanner.validateFileSize(content)) {
        debug.warn('MDView', 'File too large, showing warning');
        this.showLargeFileWarning(fileSize);
        return;
      }

      // Clear existing content (preserve head to keep injected CSS)
      debug.debug('MDView', 'Clearing document body...');
      document.body.innerHTML = '';
      debug.debug('MDView', 'Document body cleared');

      // Add meta tags
      debug.debug('MDView', 'Setting up document meta tags...');
      this.setupDocument();
      debug.debug('MDView', 'Document meta tags configured');

      // Create a loading indicator OUTSIDE the container (so it won't be cleared by render pipeline)
      debug.debug('MDView', 'Creating loading indicator...');
      const loadingDiv = document.createElement('div');
      loadingDiv.id = 'mdview-loading-overlay';
      loadingDiv.className = 'mdview-loading';
      loadingDiv.textContent = 'Rendering markdown...';
      document.body.appendChild(loadingDiv);
      debug.debug('MDView', 'Loading indicator created and appended to body');

      // Create subtle progress indicator (top right corner)
      const progressIndicator = document.createElement('div');
      progressIndicator.id = 'mdview-progress-indicator';
      progressIndicator.innerHTML = `
        <div class="progress-text">Rendering... 0%</div>
        <div class="progress-bar-container">
          <div class="progress-bar-fill" style="width: 0%"></div>
        </div>
      `;
      document.body.appendChild(progressIndicator);
      debug.debug('MDView', 'Progress indicator created');

      // Force a reflow to ensure loading indicator is painted
      void loadingDiv.offsetHeight;
      debug.debug('MDView', 'Reflow forced, ensuring paint...');
      // Use requestAnimationFrame for faster, non-blocking paint guarantee
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      debug.debug('MDView', 'Loading indicator painted');

      // Create container
      debug.debug('MDView', 'Creating render container...');
      const container = document.createElement('div');
      container.id = 'mdview-container';
      container.className = 'mdview-content';
      document.body.appendChild(container);
      debug.debug('MDView', 'Container created and appended to body');

      // Track when loading started
      const loadingStartTime = Date.now();
      debug.info('MDView', `Loading started at: ${loadingStartTime}`);

      // Listen for messages from background
      debug.debug('MDView', 'Setting up message listener...');
      this.setupMessageListener();

      // Import render pipeline dynamically
      debug.debug('MDView', 'Importing render pipeline...');
      const { renderPipeline } = await import('../core/render-pipeline');
      debug.info('MDView', 'Render pipeline imported successfully');

      // Set up progress callback
      debug.debug('MDView', 'Setting up progress callback...');
      const cleanup = renderPipeline.onProgress((progress) => {
        const percentage = Math.round(progress.progress);

        // Update subtle progress indicator
        const progressText = progressIndicator.querySelector('.progress-text');
        const progressBarFill = progressIndicator.querySelector(
          '.progress-bar-fill'
        ) as HTMLElement;

        if (progressText) {
          progressText.textContent = `${percentage}%`;
        }
        if (progressBarFill) {
          progressBarFill.style.width = `${percentage}%`;
        }

        debug.debug('MDView', `Progress: ${percentage}% - ${progress.message}`);

        // Hide loading overlay as soon as skeleton is rendered (progress > 5%)
        // This lets users start reading immediately!
        if (progress.progress > 5 && loadingDiv.style.display !== 'none') {
          loadingDiv.style.display = 'none';
          debug.info('MDView', 'Loading overlay hidden - content visible');
        }

        // Mark progress indicator as complete when done
        if (progress.progress >= 100) {
          progressIndicator.classList.add('complete');
          // Remove after fade out
          setTimeout(() => progressIndicator.remove(), 1000);
        }
      });
      debug.debug('MDView', 'Progress callback registered');

      // Apply initial theme BEFORE starting render to avoid flash
      debug.debug('MDView', 'Applying initial theme...');
      const startTime = Date.now();
      await this.applyInitialTheme();
      debug.info('MDView', `Initial theme applied in ${Date.now() - startTime}ms`);

      // Render the markdown with cache and worker support
      const isProgressive = fileSize > 500000;
      const filePath = FileScanner.getFilePath();
      const theme = this.state?.preferences.theme || 'github-light';
      const preferences = this.state?.preferences || {};

      debug.info(
        'MDView',
        `Starting render with theme: ${theme} and preferences:`,
        JSON.stringify(preferences)
      );
      debug.info(
        'MDView',
        `Starting render - file size: ${fileSize} bytes, progressive: ${isProgressive}`
      );
      debug.info('MDView', `Using cache and workers for file: ${filePath}`);

      await renderPipeline.render({
        container,
        markdown: content,
        progressive: isProgressive,
        filePath,
        theme,
        preferences,
        useCache: true,
        useWorkers: true,
      });

      const renderTime = Date.now() - loadingStartTime;
      debug.info('MDView', `Rendering completed in ${renderTime}ms`);

      // Clean up progress callback and remove loading indicator
      debug.debug('MDView', 'Cleaning up progress callback and removing loading indicator...');
      cleanup();
      loadingDiv.remove();
      debug.debug('MDView', 'Loading indicator removed');

      // Set up auto-reload if enabled (after initial render completes)
      if (this.state?.preferences.autoReload) {
        debug.info('MDView', 'Auto-reload is enabled, setting up file watcher...');
        this.setupAutoReload(initialHash);
      } else {
        debug.info('MDView', 'Auto-reload is disabled');
      }

      const totalTime = Date.now() - initStartTime;
      debug.info('MDView', `=== INITIALIZATION COMPLETED SUCCESSFULLY in ${totalTime}ms ===`);
    } catch (error) {
      debug.error('MDView', 'Initialization error:', error);

      // Ensure loading overlay and progress indicator are removed even on error
      const loadingOverlay = document.getElementById('mdview-loading-overlay');
      if (loadingOverlay) {
        loadingOverlay.remove();
        debug.debug('MDView', 'Loading overlay removed after error');
      }

      const progressIndicator = document.getElementById('mdview-progress-indicator');
      if (progressIndicator) {
        progressIndicator.remove();
        debug.debug('MDView', 'Progress indicator removed after error');
      }

      this.showError('Failed to initialize MDView', error);
    }
  }

  private async loadState(): Promise<void> {
    try {
      const response: unknown = await chrome.runtime.sendMessage({ type: 'GET_STATE' });
      const typedResponse = response as { state: AppState };
      this.state = typedResponse.state;
      debug.debug('MDView', 'State loaded:', this.state);
      // Update debug mode based on loaded state
      if (this.state) {
        if (this.state.preferences.logLevel) {
          debug.setLogLevel(this.state.preferences.logLevel);
        } else if (this.state.preferences.debug) {
          debug.setDebugMode(this.state.preferences.debug);
        }
      }
    } catch (error) {
      debug.error('MDView', 'Failed to load state:', error);
      // Use default state
      this.state = {
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
          debug: false,
        },
        document: {
          path: FileScanner.getFilePath(),
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
    }
  }

  private setupDocument(): void {
    // Add viewport meta
    const viewport = document.createElement('meta');
    viewport.name = 'viewport';
    viewport.content = 'width=device-width, initial-scale=1.0';
    document.head.appendChild(viewport);

    // Add charset
    const charset = document.createElement('meta');
    charset.setAttribute('charset', 'UTF-8');
    document.head.appendChild(charset);

    // Add title
    const title = document.createElement('title');
    const fileName = FileScanner.getFilePath().split('/').pop() || 'Markdown File';
    title.textContent = fileName;
    document.head.appendChild(title);
  }

  private setupAutoReload(initialHash: string): void {
    debug.debug('MDView', 'Setting up auto-reload...');

    // Prevent reload loops: don't allow reloads for first 2 seconds after page load
    const pageLoadTime = Date.now();
    const MIN_TIME_BEFORE_RELOAD = 2000; // 2 seconds

    // Track reload attempts to prevent loops
    const RELOAD_LIMIT = 3;
    const reloadKey = 'mdview-reload-count';
    const reloadTimeKey = 'mdview-last-reload';

    // Check if we're in a reload loop
    const lastReloadTime = parseInt(sessionStorage.getItem(reloadTimeKey) || '0');
    const reloadCount = parseInt(sessionStorage.getItem(reloadKey) || '0');
    const timeSinceLastReload = Date.now() - lastReloadTime;

    // If we've reloaded too many times in quick succession, disable auto-reload
    if (reloadCount >= RELOAD_LIMIT && timeSinceLastReload < 5000) {
      debug.warn(
        'MDView',
        `⚠️ Auto-reload disabled: detected ${reloadCount} reloads in 5 seconds (reload loop protection)`
      );
      sessionStorage.removeItem(reloadKey);
      sessionStorage.removeItem(reloadTimeKey);
      return;
    }

    // Reset counter if it's been a while
    if (timeSinceLastReload > 10000) {
      sessionStorage.setItem(reloadKey, '0');
    }

    // Use a debounced file watcher to prevent rapid reloads
    let reloadTimeout: number | null = null;

    const debouncedReload = () => {
      // Don't reload too soon after page load
      const timeSincePageLoad = Date.now() - pageLoadTime;
      if (timeSincePageLoad < MIN_TIME_BEFORE_RELOAD) {
        debug.debug(
          'MDView',
          `Ignoring file change (page loaded ${timeSincePageLoad}ms ago, need ${MIN_TIME_BEFORE_RELOAD}ms)`
        );
        return;
      }

      if (reloadTimeout) {
        clearTimeout(reloadTimeout);
      }

      reloadTimeout = window.setTimeout(() => {
        // Update reload tracking
        const currentCount = parseInt(sessionStorage.getItem(reloadKey) || '0');
        sessionStorage.setItem(reloadKey, (currentCount + 1).toString());
        sessionStorage.setItem(reloadTimeKey, Date.now().toString());

        debug.info('MDView', 'File changed, reloading...');
        window.location.reload();
      }, 500); // 500ms debounce (increased from 300ms)
    };

    // Delay starting the file watcher to let page fully stabilize
    // This prevents false positives during scroll restoration, etc.
    window.setTimeout(() => {
      this.autoReloadCleanup = FileScanner.watchFile(initialHash, debouncedReload, 1000);
      debug.info('MDView', 'Auto-reload file watcher started');
    }, 1000); // Wait 1 second before starting to watch

    debug.info('MDView', 'Auto-reload enabled (watcher will start in 1s)');
  }

  /**
   * Apply initial theme based on user preferences
   */
  private async applyInitialTheme(): Promise<void> {
    try {
      if (!this.state) return;

      const themeName = this.state.preferences.theme;
      debug.info('MDView', `Loading theme: ${themeName}`);

      const { themeEngine } = await import('../core/theme-engine');
      await themeEngine.applyTheme(themeName);

      debug.info('MDView', 'Theme applied successfully');
    } catch (error) {
      debug.error('MDView', 'Failed to apply initial theme:', error);
    }
  }

  private setupMessageListener(): void {
    chrome.runtime.onMessage.addListener(
      (message: { type: string; payload?: unknown }, _sender, sendResponse) => {
        debug.info('MDView', 'Content script received message:', message.type);

        switch (message.type) {
          case 'APPLY_THEME': {
            const payload = message.payload as { theme: string };
            this.handleApplyTheme(payload.theme)
              .then(() => sendResponse({ success: true }))
              .catch((error) => sendResponse({ success: false, error: String(error) }));
            return true; // Keep channel open for async response
          }

          case 'PREFERENCES_UPDATED': {
            const payload = message.payload as { preferences: Partial<AppState['preferences']> };
            this.handlePreferencesUpdate(payload.preferences)
              .then(() => sendResponse({ success: true }))
              .catch((error) => sendResponse({ success: false, error: String(error) }));
            return true; // Keep channel open for async response
          }

          case 'RELOAD_CONTENT':
            window.location.reload();
            break;

          default:
            debug.warn('MDView', 'Unknown message type:', message.type);
        }

        return true;
      }
    );
  }

  /**
   * Handle theme application message
   */
  private async handleApplyTheme(themeName: string): Promise<void> {
    try {
      debug.info('MDView', `[ContentScript] Received request to apply theme: ${themeName}`);
      const { themeEngine } = await import('../core/theme-engine');
      debug.debug('MDView', `[ContentScript] Theme engine imported, calling applyTheme`);
      await themeEngine.applyTheme(themeName as import('../types').ThemeName);
      debug.info('MDView', '[ContentScript] Theme applied successfully via engine');
    } catch (error) {
      debug.error('MDView', '[ContentScript] Failed to apply theme:', error);
      throw error;
    }
  }

  /**
   * Handle preferences update message
   */
  private async handlePreferencesUpdate(
    preferences: Partial<AppState['preferences']>
  ): Promise<void> {
    try {
      debug.info('MDView', 'Handling preferences update:', preferences);

      // Update debug mode if it changed
      if (preferences.logLevel !== undefined) {
        debug.setLogLevel(preferences.logLevel);
      } else if (preferences.debug !== undefined) {
        debug.setDebugMode(preferences.debug);
      }

      // Update theme if it changed
      if (preferences.theme && this.state) {
        const oldTheme = this.state.preferences.theme;
        if (preferences.theme !== oldTheme) {
          await this.handleApplyTheme(preferences.theme);
        }
      }

      // Check for structural changes that require re-render
      let needsReload = false;
      debug.info(
        'MDView',
        `[ContentScript] Updating preferences. Old lineNumbers: ${this.state?.preferences.lineNumbers}, New lineNumbers: ${preferences.lineNumbers}`
      );

      if (
        preferences.lineNumbers !== undefined &&
        this.state &&
        preferences.lineNumbers !== this.state.preferences.lineNumbers
      ) {
        debug.info('MDView', 'Line numbers preference changed, reloading page to re-render...');
        needsReload = true;
      }

      // Update state
      if (this.state) {
        this.state.preferences = { ...this.state.preferences, ...preferences };
      }

      if (needsReload) {
        debug.info('MDView', '[ContentScript] Triggering reload for structural change');
        window.location.reload();
        return;
      }

      debug.info('MDView', 'Preferences updated successfully');
    } catch (error) {
      debug.error('MDView', 'Failed to update preferences:', error);
      throw error;
    }
  }

  private showLargeFileWarning(size: number): void {
    document.body.innerHTML = `
      <div style="max-width: 600px; margin: 100px auto; padding: 20px; font-family: sans-serif;">
        <h1>⚠️ Large File Detected</h1>
        <p>This file is <strong>${FileScanner.formatFileSize(size)}</strong>, which may take a moment to render.</p>
        <p>For better performance with large files, consider splitting into smaller documents.</p>
        <button onclick="window.location.reload()" style="padding: 10px 20px; font-size: 16px; cursor: pointer;">
          Render Anyway
        </button>
        <button onclick="window.history.back()" style="padding: 10px 20px; font-size: 16px; cursor: pointer; margin-left: 10px;">
          Cancel
        </button>
      </div>
    `;
  }

  private showError(message: string, error: unknown): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    document.body.innerHTML = `
      <div style="max-width: 600px; margin: 100px auto; padding: 20px; font-family: sans-serif; color: #d32f2f;">
        <h1>⚠️ Error</h1>
        <p><strong>${this.escapeHtml(message)}</strong></p>
        <details>
          <summary>Technical Details</summary>
          <pre style="background: #f5f5f5; padding: 10px; overflow-x: auto;">${this.escapeHtml(errorMessage)}</pre>
        </details>
        <button onclick="window.location.reload()" style="padding: 10px 20px; font-size: 16px; cursor: pointer; margin-top: 20px;">
          Retry
        </button>
      </div>
    `;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  cleanup(): void {
    if (this.autoReloadCleanup) {
      this.autoReloadCleanup();
      this.autoReloadCleanup = null;
    }
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    const contentScript = new MDViewContentScript();
    contentScript.initialize().catch((error) => {
      debug.error('MDView', 'Initialization failed:', error);
    });
  });
} else {
  const contentScript = new MDViewContentScript();
  contentScript.initialize().catch((error) => {
    debug.error('MDView', 'Initialization failed:', error);
  });
}

debug.info('MDView', 'Content script loaded');
