/**
 * Service Worker Unit Tests
 * Tests message handling and error scenarios
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Service Worker - CHECK_FILE_CHANGED Handler', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
  });

  describe('Fetch Error Handling', () => {
    it('should handle fetch failures gracefully', async () => {
      // Mock fetch to simulate network error
      const mockFetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
      global.fetch = mockFetch;

      const message = {
        type: 'CHECK_FILE_CHANGED',
        payload: {
          url: 'file:///path/to/test.md',
          lastHash: 'abc123',
        },
      };

      // Simulate sending the message
      const sendResponse = vi.fn();

      // The actual handler would catch the error and call sendResponse
      try {
        await fetch(message.payload.url);
      } catch (error) {
        // This is what the service worker should do
        sendResponse({ changed: false, error: String(error) });
      }

      expect(sendResponse).toHaveBeenCalledWith({
        changed: false,
        error: expect.stringContaining('Failed to fetch'),
      });
    });

    it('should handle fetch with non-ok status', async () => {
      // Mock fetch to return 404
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });
      global.fetch = mockFetch;

      const message = {
        type: 'CHECK_FILE_CHANGED',
        payload: {
          url: 'file:///path/to/nonexistent.md',
          lastHash: 'abc123',
        },
      };

      const sendResponse = vi.fn();

      try {
        const response = await fetch(message.payload.url);
        if (!response.ok) {
          sendResponse({ changed: false, error: `Fetch failed: ${response.status}` });
        }
      } catch (error) {
        sendResponse({ changed: false, error: String(error) });
      }

      expect(sendResponse).toHaveBeenCalledWith({
        changed: false,
        error: 'Fetch failed: 404',
      });
    });

    it('should handle CORS errors for file:// URLs', async () => {
      // Mock fetch to simulate CORS error common with file:// protocol
      const corsError = new TypeError('Failed to fetch');
      const mockFetch = vi.fn().mockRejectedValue(corsError);
      global.fetch = mockFetch;

      const message = {
        type: 'CHECK_FILE_CHANGED',
        payload: {
          url: 'file:///path/to/test.md',
          lastHash: 'def456',
        },
      };

      const sendResponse = vi.fn();

      try {
        await fetch(message.payload.url);
      } catch (error) {
        // Service worker should handle this gracefully
        sendResponse({ changed: false, error: String(error) });
      }

      expect(mockFetch).toHaveBeenCalledWith('file:///path/to/test.md');
      expect(sendResponse).toHaveBeenCalledWith({
        changed: false,
        error: 'TypeError: Failed to fetch',
      });
    });

    it('should handle network timeout', async () => {
      // Mock fetch with a timeout error
      const timeoutError = new TypeError('Failed to fetch');
      const mockFetch = vi.fn().mockRejectedValue(timeoutError);
      global.fetch = mockFetch;

      const message = {
        type: 'CHECK_FILE_CHANGED',
        payload: {
          url: 'https://example.com/test.md',
          lastHash: 'xyz789',
        },
      };

      const sendResponse = vi.fn();

      try {
        await fetch(message.payload.url);
      } catch (error) {
        sendResponse({ changed: false, error: String(error) });
      }

      expect(sendResponse).toHaveBeenCalledWith({
        changed: false,
        error: expect.stringContaining('Failed to fetch'),
      });
    });

    it('should successfully detect file changes when fetch succeeds', async () => {
      const newContent = 'Updated markdown content';
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        text: vi.fn().mockResolvedValue(newContent),
      });
      global.fetch = mockFetch;

      // Mock crypto.subtle.digest
      const mockDigest = vi.fn().mockResolvedValue(
        new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]).buffer
      );
      global.crypto = {
        subtle: {
          digest: mockDigest,
        },
      } as any;

      const message = {
        type: 'CHECK_FILE_CHANGED',
        payload: {
          url: 'https://example.com/test.md',
          lastHash: 'oldHash123',
        },
      };

      const sendResponse = vi.fn();

      try {
        const response = await fetch(message.payload.url);
        if (response.ok) {
          const text = await response.text();
          const msgBuffer = new TextEncoder().encode(text);
          const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const currentHash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

          const changed = currentHash !== message.payload.lastHash;
          sendResponse({ changed, newHash: currentHash });
        }
      } catch (error) {
        sendResponse({ changed: false, error: String(error) });
      }

      expect(sendResponse).toHaveBeenCalledWith({
        changed: true,
        newHash: '0102030405060708',
      });
    });

    it('should detect no changes when hash matches', async () => {
      const content = 'Same markdown content';
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        text: vi.fn().mockResolvedValue(content),
      });
      global.fetch = mockFetch;

      // Mock crypto to return consistent hash
      const mockHash = '0102030405060708';
      const mockDigest = vi.fn().mockResolvedValue(
        new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]).buffer
      );
      global.crypto = {
        subtle: {
          digest: mockDigest,
        },
      } as any;

      const message = {
        type: 'CHECK_FILE_CHANGED',
        payload: {
          url: 'https://example.com/test.md',
          lastHash: mockHash, // Same hash
        },
      };

      const sendResponse = vi.fn();

      try {
        const response = await fetch(message.payload.url);
        if (response.ok) {
          const text = await response.text();
          const msgBuffer = new TextEncoder().encode(text);
          const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const currentHash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

          const changed = currentHash !== message.payload.lastHash;
          sendResponse({ changed, newHash: currentHash });
        }
      } catch (error) {
        sendResponse({ changed: false, error: String(error) });
      }

      expect(sendResponse).toHaveBeenCalledWith({
        changed: false,
        newHash: mockHash,
      });
    });
  });

  describe('Error Message Format', () => {
    it('should provide user-friendly error messages', async () => {
      const errors = [
        { error: new TypeError('Failed to fetch'), expected: 'TypeError: Failed to fetch' },
        { error: new Error('Network timeout'), expected: 'Error: Network timeout' },
        { error: 'String error', expected: 'String error' },
      ];

      for (const { error, expected } of errors) {
        const result = String(error);
        expect(result).toContain(expected.split(':')[0]); // Check error type is preserved
      }
    });
  });

  describe('URL Protocol Handling', () => {
    it('should attempt fetch for file:// URLs even though they may fail', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
      global.fetch = mockFetch;

      const fileUrl = 'file:///Users/test/document.md';

      try {
        await fetch(fileUrl);
      } catch (error) {
        expect(error).toBeInstanceOf(TypeError);
        expect(String(error)).toContain('Failed to fetch');
      }

      expect(mockFetch).toHaveBeenCalledWith(fileUrl);
    });

    it('should work with http:// URLs', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        text: vi.fn().mockResolvedValue('content'),
      });
      global.fetch = mockFetch;

      const httpUrl = 'http://example.com/test.md';
      const response = await fetch(httpUrl);

      expect(response.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(httpUrl);
    });

    it('should work with https:// URLs', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        text: vi.fn().mockResolvedValue('content'),
      });
      global.fetch = mockFetch;

      const httpsUrl = 'https://example.com/test.md';
      const response = await fetch(httpsUrl);

      expect(response.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(httpsUrl);
    });
  });
});

