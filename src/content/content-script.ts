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
  // @ts-ignore
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
      debug.log('MDView', '=== INITIALIZATION STARTED ===');
      debug.log('MDView', `URL: ${window.location.href}`);
      debug.log('MDView', `Document ready state: ${document.readyState}`);
      debug.log('MDView', `Debug mode enabled: ${this.state?.preferences.debug}`);
      debug.log('MDView', `Auto-reload enabled: ${this.state?.preferences.autoReload}`);
      debug.log('MDView', 'Content script initializing...');
      debug.log('MDView', 'Markdown file detected:', FileScanner.getFilePath());

      // Read file content
      debug.log('MDView', 'Reading file content...');
      const content = await FileScanner.readFileContent();
      const fileSize = FileScanner.getFileSize(content);
      debug.log('MDView', `File content loaded: ${FileScanner.formatFileSize(fileSize)} (${fileSize} bytes)`);

      // Check file size
      if (!FileScanner.validateFileSize(content)) {
        debug.log('MDView', 'File too large, showing warning');
        this.showLargeFileWarning(fileSize);
        return;
      }

      // Clear existing content (preserve head to keep injected CSS)
      debug.log('MDView', 'Clearing document body...');
      document.body.innerHTML = '';
      debug.log('MDView', 'Document body cleared');

      // Add meta tags
      debug.log('MDView', 'Setting up document meta tags...');
      this.setupDocument();
      debug.log('MDView', 'Document meta tags configured');

      // Create a loading indicator OUTSIDE the container (so it won't be cleared by render pipeline)
      debug.log('MDView', 'Creating loading indicator...');
      const loadingDiv = document.createElement('div');
      loadingDiv.id = 'mdview-loading-overlay';
      loadingDiv.className = 'mdview-loading';
      loadingDiv.textContent = 'Rendering markdown...';
      document.body.appendChild(loadingDiv);
      debug.log('MDView', 'Loading indicator created and appended to body');

      // Force a reflow and small delay to ensure loading indicator is painted
      void loadingDiv.offsetHeight;
      debug.log('MDView', 'Reflow forced, waiting for paint...');
      await new Promise(resolve => setTimeout(resolve, 50)); // Give browser time to paint
      debug.log('MDView', 'Loading indicator should now be visible');

      // Create container
      debug.log('MDView', 'Creating render container...');
      const container = document.createElement('div');
      container.id = 'mdview-container';
      container.className = 'mdview-content';
      document.body.appendChild(container);
      debug.log('MDView', 'Container created and appended to body');

      // Track when loading started to ensure minimum display time
      const loadingStartTime = Date.now();
      const MIN_LOADING_TIME = 150; // Minimum 150ms to ensure visibility
      debug.log('MDView', `Loading started at: ${loadingStartTime}, minimum display time: ${MIN_LOADING_TIME}ms`);

      // Listen for messages from background
      debug.log('MDView', 'Setting up message listener...');
      this.setupMessageListener();

      // Import render pipeline dynamically
      debug.log('MDView', 'Importing render pipeline...');
      const { renderPipeline } = await import('../core/render-pipeline');
      debug.log('MDView', 'Render pipeline imported successfully');

      // Set up progress callback
      debug.log('MDView', 'Setting up progress callback...');
      const cleanup = renderPipeline.onProgress((progress) => {
        const progressText = `${progress.message} (${Math.round(progress.progress)}%)`;
        loadingDiv.textContent = progressText;
        debug.log('MDView', `Progress update: ${progressText}`);
      });
      debug.log('MDView', 'Progress callback registered');

      // Render the markdown
      const isProgressive = fileSize > 500000;
      debug.log('MDView', `Starting render - file size: ${fileSize} bytes, progressive: ${isProgressive}`);
      
      await renderPipeline.render({
        container,
        markdown: content,
        progressive: isProgressive,
      });
      
      const renderTime = Date.now() - loadingStartTime;
      debug.log('MDView', `Rendering completed in ${renderTime}ms`);

      // Ensure loading indicator is visible for minimum time
      const loadingElapsed = Date.now() - loadingStartTime;
      if (loadingElapsed < MIN_LOADING_TIME) {
        const waitTime = MIN_LOADING_TIME - loadingElapsed;
        debug.log('MDView', `Rendering finished too quickly (${loadingElapsed}ms), waiting additional ${waitTime}ms for minimum display time`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        debug.log('MDView', 'Minimum display time reached');
      } else {
        debug.log('MDView', `Rendering took ${loadingElapsed}ms, minimum time already exceeded`);
      }

      // Clean up progress callback and remove loading indicator
      debug.log('MDView', 'Cleaning up progress callback and removing loading indicator...');
      cleanup();
      loadingDiv.remove();
      debug.log('MDView', 'Loading indicator removed');

      // Set up auto-reload if enabled (after initial render completes)
      if (this.state?.preferences.autoReload) {
        debug.log('MDView', 'Auto-reload is enabled, setting up file watcher...');
        this.setupAutoReload();
      } else {
        debug.log('MDView', 'Auto-reload is disabled');
      }

      const totalTime = Date.now() - initStartTime;
      debug.log('MDView', `=== INITIALIZATION COMPLETED SUCCESSFULLY in ${totalTime}ms ===`);
    } catch (error) {
      debug.error('MDView', 'Initialization error:', error);
      
      // Ensure loading overlay is removed even on error
      const loadingOverlay = document.getElementById('mdview-loading-overlay');
      if (loadingOverlay) {
        loadingOverlay.remove();
        debug.log('MDView', 'Loading overlay removed after error');
      }
      
      this.showError('Failed to initialize MDView', error);
    }
  }

  private async loadState(): Promise<void> {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_STATE' });
      this.state = response.state;
      debug.log('MDView', 'State loaded:', this.state);
      // Update debug mode based on loaded state
      if (this.state) {
        debug.setDebugMode(this.state.preferences.debug);
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

  private setupAutoReload(): void {
    debug.log('MDView', 'Setting up auto-reload...');
    
    // Use a debounced file watcher to prevent rapid reloads
    let reloadTimeout: number | null = null;
    
    const debouncedReload = () => {
      if (reloadTimeout) {
        clearTimeout(reloadTimeout);
      }
      
      reloadTimeout = window.setTimeout(() => {
        debug.log('MDView', 'File changed, reloading...');
        window.location.reload();
      }, 300); // 300ms debounce
    };

    // Set up file watcher with cleanup
    this.autoReloadCleanup = FileScanner.watchFile(debouncedReload, 1000);
    
    debug.log('MDView', 'Auto-reload enabled');
  }

  private setupMessageListener(): void {
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      debug.log('MDView', 'Content script received message:', message.type);

      switch (message.type) {
        case 'APPLY_THEME':
          // TODO: Implement theme application
          debug.log('MDView', 'Apply theme:', message.payload.theme);
          sendResponse({ success: true });
          break;

        case 'PREFERENCES_UPDATED':
          // TODO: Handle preference updates
          debug.log('MDView', 'Preferences updated:', message.payload.preferences);
          // Update debug mode if it changed
          if (message.payload.preferences.debug !== undefined) {
            debug.setDebugMode(message.payload.preferences.debug);
          }
          sendResponse({ success: true });
          break;

        case 'RELOAD_CONTENT':
          window.location.reload();
          break;

        default:
          debug.warn('MDView', 'Unknown message type:', message.type);
      }

      return true;
    });
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

debug.log('MDView', 'Content script loaded');

