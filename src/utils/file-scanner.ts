import { debug } from './debug-logger';

/**
 * File Scanner Utility
 * Detects and validates markdown files by extension and MIME type
 */

export class FileScanner {
  private static readonly MARKDOWN_EXTENSIONS = ['.md', '.markdown'];
  private static readonly MARKDOWN_MIME_TYPES = ['text/markdown', 'text/x-markdown'];

  /**
   * Check if the current site is in the blocklist.
   * Supports various pattern formats:
   * - Domain only: "github.com" (blocks all pages on github.com)
   * - Wildcard subdomain: "*.github.com" (blocks subdomains)
   * - Path pattern: "github.com/star/blob/star" (blocks specific paths)
   * - Full URL pattern: "https://raw.githubusercontent.com/star"
   *
   * Note: Use "star" in docs above to avoid JSDoc parsing issues with asterisks.
   * Actual patterns use * as wildcard.
   */
  static isSiteBlocked(blocklist: string[]): boolean {
    if (!blocklist || blocklist.length === 0) {
      return false;
    }

    const url = window.location.href;
    const hostname = window.location.hostname;
    const pathname = window.location.pathname;

    for (const pattern of blocklist) {
      if (this.matchesPattern(pattern, url, hostname, pathname)) {
        debug.info('FileScanner', `Site blocked by pattern: ${pattern}`);
        return true;
      }
    }

    return false;
  }

  /**
   * Match a URL against a blocklist pattern.
   * Pattern formats:
   * - "example.com" - matches hostname exactly
   * - "*.example.com" - matches any subdomain of example.com
   * - "example.com/path/*" - matches hostname + path pattern
   * - "https://example.com/*" - matches full URL pattern
   */
  private static matchesPattern(
    pattern: string,
    url: string,
    hostname: string,
    pathname: string
  ): boolean {
    // Normalize pattern (trim whitespace)
    pattern = pattern.trim().toLowerCase();

    if (!pattern) {
      return false;
    }

    // Full URL pattern (starts with http:// or https://)
    if (pattern.startsWith('http://') || pattern.startsWith('https://')) {
      return this.matchesGlobPattern(pattern, url.toLowerCase());
    }

    // Check if pattern includes a path
    const slashIndex = pattern.indexOf('/');
    if (slashIndex > 0) {
      // Pattern has path component: "example.com/path/*"
      const patternHost = pattern.substring(0, slashIndex);
      const patternPath = pattern.substring(slashIndex);

      if (!this.matchesHostPattern(patternHost, hostname.toLowerCase())) {
        return false;
      }

      return this.matchesGlobPattern(patternPath, pathname.toLowerCase());
    }

    // Domain-only pattern
    return this.matchesHostPattern(pattern, hostname.toLowerCase());
  }

  /**
   * Match hostname against a host pattern.
   * Supports wildcard subdomain: "*.example.com"
   */
  private static matchesHostPattern(pattern: string, hostname: string): boolean {
    // Exact match
    if (pattern === hostname) {
      return true;
    }

    // Wildcard subdomain: "*.example.com"
    if (pattern.startsWith('*.')) {
      const baseDomain = pattern.substring(2); // Remove "*."
      // Match the base domain itself or any subdomain
      return hostname === baseDomain || hostname.endsWith('.' + baseDomain);
    }

    return false;
  }

  /**
   * Match a string against a glob pattern with * wildcards.
   * * matches any sequence of characters (including empty).
   */
  private static matchesGlobPattern(pattern: string, str: string): boolean {
    // Convert glob pattern to regex
    // Escape regex special chars except *, then convert * to .*
    const regexPattern = pattern
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&') // Escape special chars
      .replace(/\*/g, '.*'); // Convert * to .*

    const regex = new RegExp('^' + regexPattern + '$');
    return regex.test(str);
  }

  /**
   * Get the current site identifier for display (hostname or file path).
   */
  static getCurrentSiteIdentifier(): string {
    const url = window.location.href;

    if (url.startsWith('file://')) {
      // For local files, show a truncated path
      const path = window.location.pathname;
      const parts = path.split('/');
      if (parts.length > 3) {
        return '.../' + parts.slice(-2).join('/');
      }
      return path;
    }

    // For web, show hostname
    return window.location.hostname;
  }

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
          // Debug: Log error details for troubleshooting
          debug.debug('FileScanner', '=== Error Analysis ===');
          debug.debug('FileScanner', 'Error type:', typeof error);
          debug.debug('FileScanner', 'Error instanceof Error:', error instanceof Error);
          debug.debug('FileScanner', 'Error toString():', String(error));
          debug.debug(
            'FileScanner',
            'Error message:',
            error instanceof Error ? error.message : 'N/A'
          );
          debug.debug('FileScanner', 'Error name:', error instanceof Error ? error.name : 'N/A');

          // Improved error handling with case-insensitive check
          const errorStr = String(error).toLowerCase();
          const errorMessage = error instanceof Error ? error.message.toLowerCase() : '';

          debug.debug('FileScanner', 'errorStr (lowercase):', errorStr);
          debug.debug('FileScanner', 'errorMessage (lowercase):', errorMessage);

          const check1 = errorStr.includes('context invalidated');
          const check2 = errorStr.includes('extension context');
          const check3 = errorMessage.includes('context invalidated');

          debug.debug('FileScanner', 'Check results:');
          debug.debug('FileScanner', '  - errorStr.includes("context invalidated"):', check1);
          debug.debug('FileScanner', '  - errorStr.includes("extension context"):', check2);
          debug.debug('FileScanner', '  - errorMessage.includes("context invalidated"):', check3);

          const isContextInvalid = check1 || check2 || check3;
          debug.debug('FileScanner', 'isContextInvalid:', isContextInvalid);
          debug.debug('FileScanner', '=== End Error Analysis ===');

          // Handle extension context invalidation (e.g. after extension update/reload)
          if (isContextInvalid) {
            debug.warn('FileScanner', 'Extension context invalidated. Stopping file watcher.');
            if (intervalId !== null) {
              clearInterval(intervalId);
              intervalId = null;
            }
            return;
          }

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
