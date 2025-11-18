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
    // Check if this is a markdown file (before logging, since we need state for debug mode)
    if (!FileScanner.isMarkdownFile()) {
      return;
    }

    try {
      // Get initial state from background FIRST (sets debug mode)
      await this.loadState();

      // Now we can log with proper debug mode
      debug.log('MDView', 'Content script initializing...');
      debug.log('MDView', 'Markdown file detected:', FileScanner.getFilePath());

      // Read file content
      const content = await FileScanner.readFileContent();
      debug.log('MDView', 'File content loaded:', FileScanner.formatFileSize(FileScanner.getFileSize(content)));

      // Check file size
      if (!FileScanner.validateFileSize(content)) {
        this.showLargeFileWarning(FileScanner.getFileSize(content));
        return;
      }

      // Clear existing content (preserve head to keep injected CSS)
      document.body.innerHTML = '';

      // Add meta tags
      this.setupDocument();

      // Create container
      const container = document.createElement('div');
      container.id = 'mdview-container';
      container.className = 'mdview-content';
      document.body.appendChild(container);

      // Show loading state
      container.innerHTML = '<div class="mdview-loading">Rendering markdown...</div>';

      // Set up auto-reload if enabled
      // TEMPORARILY DISABLED - causing infinite loop
      // if (this.state?.preferences.autoReload) {
      //   this.setupAutoReload();
      // }

      // Listen for messages from background
      this.setupMessageListener();

      // Import render pipeline dynamically
      const { renderPipeline } = await import('../core/render-pipeline');

      // Create a loading indicator element
      const loadingDiv = document.createElement('div');
      loadingDiv.className = 'mdview-loading';
      loadingDiv.textContent = 'Rendering markdown...';
      container.appendChild(loadingDiv);

      // Force a reflow to ensure loading indicator is visible
      void container.offsetHeight;

      // Set up progress callback
      const cleanup = renderPipeline.onProgress((progress) => {
        loadingDiv.textContent = `${progress.message} (${Math.round(progress.progress)}%)`;
      });

      // Render the markdown
      await renderPipeline.render({
        container,
        markdown: content,
        progressive: FileScanner.getFileSize(content) > 500000, // Use progressive for files > 500KB
      });

      // Clean up progress callback and remove loading indicator
      cleanup();
      loadingDiv.remove();

      debug.log('MDView', 'Content script initialized successfully');
    } catch (error) {
      debug.error('MDView', 'Initialization error:', error);
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

  // TEMPORARILY DISABLED - causing infinite loop
  // TODO: Fix auto-reload to prevent infinite loops
  // private setupAutoReload(): void { ... }

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

