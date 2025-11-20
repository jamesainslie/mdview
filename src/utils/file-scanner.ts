import { debug } from './debug-logger';

/**
 * File Scanner Utility
 * Detects and validates markdown files by extension and MIME type
 */

export class FileScanner {
  private static readonly MARKDOWN_EXTENSIONS = ['.md', '.markdown'];
  private static readonly MARKDOWN_MIME_TYPES = ['text/markdown', 'text/x-markdown'];

  /**
   * Check if the current page is a markdown file
   */
  static isMarkdownFile(): boolean {
    const url = window.location.href;
    const pathname = window.location.pathname;

    // Check protocol
    const isLocal = url.startsWith('file://');
    const isWeb = url.startsWith('http://') || url.startsWith('https://');

    if (!isLocal && !isWeb) {
      return false;
    }

    // Check by MIME type first if available (authoritative for web)
    const contentType = document.contentType;
    if (contentType && this.MARKDOWN_MIME_TYPES.includes(contentType)) {
      return true;
    }

    // For web, if content type is explicitly HTML, do not activate
    // (prevents rendering on GitHub UI pages which end in .md)
    if (isWeb && (contentType === 'text/html' || contentType === 'application/xhtml+xml')) {
      return false;
    }

    // Check by extension
    if (this.hasMarkdownExtension(pathname)) {
      return true;
    }

    return false;
  }

  /**
   * Check if a path has a markdown extension
   */
  static hasMarkdownExtension(path: string): boolean {
    const lowerPath = path.toLowerCase();
    return this.MARKDOWN_EXTENSIONS.some((ext) => lowerPath.endsWith(ext));
  }

  /**
   * Get the current file path
   */
  static getFilePath(): string {
    return window.location.pathname;
  }

  /**
   * Read file content from the page or source
   * For file:// URLs, the content is in the DOM as plain text initially.
   * After rendering (or for updates), we use a hidden iframe hack to read local files
   * because direct fetch() is blocked by CORS for file:// URLs.
   */
  static readFileContent(forceFetch = false): string {
    // For file:// URLs, Chrome displays the content in a <pre> tag
    // Initial load check
    if (!forceFetch) {
      const pre = document.querySelector('pre');
      if (pre) {
        return pre.textContent || '';
      }
      // If body is not cleared yet
      if (!document.getElementById('mdview-container')) {
        return document.body.textContent || '';
      }
    }

    // If we need to force fetch (watch mode) or if main DOM is overwritten,
    // we can't use fetch() due to CORS on file://.
    // This method is only called by watchFile which handles the iframe logic separately.
    // But if we need a one-off read... we can't easily do it without the iframe.

    // Fallback: if this is called unexpectedly with forceFetch outside of watchFile context,
    // we try to read whatever is in the DOM, which might be stale/rendered.
    // Ideally, watchFile should handle the source reading itself via iframe.
    return document.body.textContent || '';
  }

  /**
   * Generate hash for content comparison
   */
  static async generateHash(content: string): Promise<string> {
    const msgBuffer = new TextEncoder().encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Monitor file changes using polling via background script delegation
   * This avoids CORS issues with fetching file:// URLs from content scripts.
   */
  static watchFile(initialHash: string, callback: () => void, interval = 1000): () => void {
    let lastHash = initialHash;
    let intervalId: number | null = null;
    const fileUrl = window.location.href;

    debug.info('FileScanner', `Starting background-delegated file watcher for ${fileUrl}`);

    const checkForChanges = () => {
      void (async () => {
        try {
          debug.log('FileScanner', 'Checking for file changes via background...');

          const response: unknown = await chrome.runtime.sendMessage({
            type: 'CHECK_FILE_CHANGED',
            payload: {
              url: fileUrl,
              lastHash,
            },
          });
          const typedResponse = response as { error?: string; changed?: boolean; newHash?: string };

          if (typedResponse.error) {
            debug.warn('FileScanner', 'Background check error:', typedResponse.error);
            return;
          }

          if (typedResponse.changed) {
            debug.info('FileScanner', 'File change detected (hash mismatch)');
            if (typedResponse.newHash) {
              lastHash = typedResponse.newHash;
            }
            callback();
          } else {
            debug.log('FileScanner', 'No change detected');
          }
        } catch (error) {
          debug.error('FileScanner', 'Error communicating with background:', error);
        }
      })();
    };

    // Start polling
    intervalId = window.setInterval(checkForChanges, interval);

    // Return cleanup function
    return () => {
      if (intervalId !== null) {
        clearInterval(intervalId);
      }
    };
  }

  /**
   * Validate file size
   */
  static validateFileSize(content: string, maxSize = 10 * 1024 * 1024): boolean {
    const size = new Blob([content]).size;
    return size <= maxSize;
  }

  /**
   * Get file size in bytes
   */
  static getFileSize(content: string): number {
    return new Blob([content]).size;
  }

  /**
   * Format file size for display
   */
  static formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}
