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

    // Check if file:// protocol
    if (!url.startsWith('file://')) {
      return false;
    }

    // Check by extension
    if (this.hasMarkdownExtension(pathname)) {
      return true;
    }

    // Check by MIME type if available
    const contentType = document.contentType;
    if (contentType && this.MARKDOWN_MIME_TYPES.includes(contentType)) {
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
   * Read file content from the page
   * For file:// URLs, the content is in the DOM as plain text
   */
  static async readFileContent(): Promise<string> {
    // For file:// URLs, Chrome displays the content in a <pre> tag
    const pre = document.querySelector('pre');
    if (pre) {
      return pre.textContent || '';
    }

    // Fallback: try to get body text content
    return document.body.textContent || '';
  }

  /**
   * Monitor file changes using polling
   * Note: File System API has limited support for file:// URLs
   */
  static watchFile(callback: () => void, interval = 1000): () => void {
    let lastContent = '';
    let intervalId: number | null = null;
    let isInitialized = false;

    const checkForChanges = async () => {
      try {
        const currentContent = await this.readFileContent();
        
        // Skip the first check (initialization)
        if (!isInitialized) {
          lastContent = currentContent;
          isInitialized = true;
          return;
        }
        
        // Only trigger callback if content actually changed
        if (currentContent !== lastContent) {
          lastContent = currentContent;
          callback();
        }
      } catch (error) {
        console.error('Error checking file changes:', error);
      }
    };

    // Initialize immediately before starting interval
    this.readFileContent()
      .then((content) => {
        lastContent = content;
        isInitialized = true;
        // Start interval after initialization
        intervalId = window.setInterval(checkForChanges, interval);
      })
      .catch((error) => {
        console.error('Error initializing file watcher:', error);
        // Start interval anyway to allow recovery
        intervalId = window.setInterval(checkForChanges, interval);
      });

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

