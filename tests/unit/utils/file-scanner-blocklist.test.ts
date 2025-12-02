/**
 * Tests for FileScanner blocklist functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FileScanner } from '../../../src/utils/file-scanner';

describe('FileScanner Blocklist', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isSiteBlocked', () => {
    it('should return false for empty blocklist', () => {
      // Mock window.location
      Object.defineProperty(window, 'location', {
        value: {
          href: 'https://example.com/test.md',
          hostname: 'example.com',
          pathname: '/test.md',
        },
        writable: true,
      });

      expect(FileScanner.isSiteBlocked([])).toBe(false);
    });

    it('should return false for undefined blocklist', () => {
      Object.defineProperty(window, 'location', {
        value: {
          href: 'https://example.com/test.md',
          hostname: 'example.com',
          pathname: '/test.md',
        },
        writable: true,
      });

      // @ts-expect-error Testing undefined input
      expect(FileScanner.isSiteBlocked(undefined)).toBe(false);
    });

    it('should block exact domain match', () => {
      Object.defineProperty(window, 'location', {
        value: {
          href: 'https://github.com/user/repo/README.md',
          hostname: 'github.com',
          pathname: '/user/repo/README.md',
        },
        writable: true,
      });

      expect(FileScanner.isSiteBlocked(['github.com'])).toBe(true);
    });

    it('should not block non-matching domain', () => {
      Object.defineProperty(window, 'location', {
        value: {
          href: 'https://gitlab.com/user/repo/README.md',
          hostname: 'gitlab.com',
          pathname: '/user/repo/README.md',
        },
        writable: true,
      });

      expect(FileScanner.isSiteBlocked(['github.com'])).toBe(false);
    });

    it('should block wildcard subdomain pattern', () => {
      Object.defineProperty(window, 'location', {
        value: {
          href: 'https://raw.githubusercontent.com/user/repo/main/README.md',
          hostname: 'raw.githubusercontent.com',
          pathname: '/user/repo/main/README.md',
        },
        writable: true,
      });

      expect(FileScanner.isSiteBlocked(['*.githubusercontent.com'])).toBe(true);
    });

    it('should block base domain with wildcard pattern', () => {
      Object.defineProperty(window, 'location', {
        value: {
          href: 'https://githubusercontent.com/test.md',
          hostname: 'githubusercontent.com',
          pathname: '/test.md',
        },
        writable: true,
      });

      expect(FileScanner.isSiteBlocked(['*.githubusercontent.com'])).toBe(true);
    });

    it('should not block unrelated domain with wildcard pattern', () => {
      Object.defineProperty(window, 'location', {
        value: {
          href: 'https://example.com/test.md',
          hostname: 'example.com',
          pathname: '/test.md',
        },
        writable: true,
      });

      expect(FileScanner.isSiteBlocked(['*.githubusercontent.com'])).toBe(false);
    });

    it('should block domain with path pattern', () => {
      Object.defineProperty(window, 'location', {
        value: {
          href: 'https://github.com/user/repo/blob/main/README.md',
          hostname: 'github.com',
          pathname: '/user/repo/blob/main/README.md',
        },
        writable: true,
      });

      expect(FileScanner.isSiteBlocked(['github.com/*/blob/*'])).toBe(true);
    });

    it('should not block domain when path does not match', () => {
      Object.defineProperty(window, 'location', {
        value: {
          href: 'https://github.com/user/repo/raw/main/README.md',
          hostname: 'github.com',
          pathname: '/user/repo/raw/main/README.md',
        },
        writable: true,
      });

      expect(FileScanner.isSiteBlocked(['github.com/*/blob/*'])).toBe(false);
    });

    it('should block full URL pattern', () => {
      Object.defineProperty(window, 'location', {
        value: {
          href: 'https://raw.githubusercontent.com/user/repo/main/README.md',
          hostname: 'raw.githubusercontent.com',
          pathname: '/user/repo/main/README.md',
        },
        writable: true,
      });

      expect(FileScanner.isSiteBlocked(['https://raw.githubusercontent.com/*'])).toBe(true);
    });

    it('should handle multiple patterns in blocklist', () => {
      Object.defineProperty(window, 'location', {
        value: {
          href: 'https://gitlab.com/user/repo/README.md',
          hostname: 'gitlab.com',
          pathname: '/user/repo/README.md',
        },
        writable: true,
      });

      expect(FileScanner.isSiteBlocked(['github.com', 'gitlab.com', 'bitbucket.org'])).toBe(true);
    });

    it('should handle patterns with whitespace', () => {
      Object.defineProperty(window, 'location', {
        value: {
          href: 'https://github.com/test.md',
          hostname: 'github.com',
          pathname: '/test.md',
        },
        writable: true,
      });

      expect(FileScanner.isSiteBlocked(['  github.com  '])).toBe(true);
    });

    it('should ignore empty patterns', () => {
      Object.defineProperty(window, 'location', {
        value: {
          href: 'https://github.com/test.md',
          hostname: 'github.com',
          pathname: '/test.md',
        },
        writable: true,
      });

      expect(FileScanner.isSiteBlocked(['', '   ', 'github.com'])).toBe(true);
    });

    it('should be case-insensitive', () => {
      Object.defineProperty(window, 'location', {
        value: {
          href: 'https://GitHub.com/test.md',
          hostname: 'GitHub.com',
          pathname: '/test.md',
        },
        writable: true,
      });

      expect(FileScanner.isSiteBlocked(['github.com'])).toBe(true);
    });
  });

  describe('getCurrentSiteIdentifier', () => {
    it('should return hostname for http URLs', () => {
      Object.defineProperty(window, 'location', {
        value: {
          href: 'https://example.com/path/to/file.md',
          hostname: 'example.com',
          pathname: '/path/to/file.md',
        },
        writable: true,
      });

      expect(FileScanner.getCurrentSiteIdentifier()).toBe('example.com');
    });

    it('should return truncated path for local files', () => {
      Object.defineProperty(window, 'location', {
        value: {
          href: 'file:///Users/test/Documents/project/README.md',
          hostname: '',
          pathname: '/Users/test/Documents/project/README.md',
        },
        writable: true,
      });

      expect(FileScanner.getCurrentSiteIdentifier()).toBe('.../project/README.md');
    });

    it('should return full path for short local file paths', () => {
      Object.defineProperty(window, 'location', {
        value: {
          href: 'file:///test/README.md',
          hostname: '',
          pathname: '/test/README.md',
        },
        writable: true,
      });

      expect(FileScanner.getCurrentSiteIdentifier()).toBe('/test/README.md');
    });
  });
});
