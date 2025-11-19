/**
 * Cache Manager
 * In-memory cache with SHA-256 hash-based keys for rendered markdown content
 */

import type { CachedResult, CacheEntry, ThemeName } from '../types';
import { debug } from '../utils/debug-logger';

export interface CacheOptions {
  maxSize?: number; // Max cache entries (default: 50)
  maxAge?: number; // Max age in ms (default: 1 hour)
}

export class CacheManager {
  private cache: Map<string, CacheEntry> = new Map();
  private fileHashes: Map<string, string> = new Map();
  private maxSize: number;
  private maxAge: number;

  constructor(options: CacheOptions = {}) {
    this.maxSize = options.maxSize || 50;
    this.maxAge = options.maxAge || 3600000; // 1 hour
    debug.log('CacheManager', 'Initialized with max size:', this.maxSize);
  }

  /**
   * Generate cache key from file path, content, theme, and preferences
   */
  async generateKey(
    filePath: string,
    content: string,
    theme: ThemeName,
    preferences: Record<string, unknown>
  ): Promise<string> {
    // Create stable string from inputs
    const input = JSON.stringify({
      path: filePath,
      content,
      theme,
      prefs: preferences,
    });

    // Generate SHA-256 hash
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

    return hashHex;
  }

  /**
   * Generate content hash for file monitoring
   */
  async generateContentHash(content: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

    return hashHex;
  }

  /**
   * Get cached result by key
   */
  async get(key: string): Promise<CachedResult | null> {
    const entry = this.cache.get(key);

    if (!entry) {
      debug.info('CacheManager', 'Cache miss for key:', key.substring(0, 8));
      return null;
    }

    // Check if expired
    const age = Date.now() - entry.result.timestamp;
    if (age > this.maxAge) {
      debug.info('CacheManager', 'Cache expired for key:', key.substring(0, 8));
      this.cache.delete(key);
      return null;
    }

    // Update last accessed time
    entry.lastAccessed = Date.now();
    debug.info('CacheManager', 'Cache hit for key:', key.substring(0, 8));

    return entry.result;
  }

  /**
   * Set cached result
   */
  async set(
    key: string,
    result: CachedResult,
    filePath: string,
    contentHash: string,
    theme: ThemeName
  ): Promise<void> {
    // Evict old entries if cache is full
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    const entry: CacheEntry = {
      result,
      filePath,
      contentHash,
      theme,
      lastAccessed: Date.now(),
    };

    this.cache.set(key, entry);
    this.fileHashes.set(filePath, contentHash);

    debug.info('CacheManager', `Cached result for key: ${key.substring(0, 8)}, size: ${this.cache.size}/${this.maxSize}`);
  }

  /**
   * Invalidate cache entry by key
   */
  invalidate(key: string): void {
    const entry = this.cache.get(key);
    if (entry) {
      this.cache.delete(key);
      // Remove file hash if this was the last entry for this file
      const hasOtherEntries = Array.from(this.cache.values()).some(
        (e) => e.filePath === entry.filePath
      );
      if (!hasOtherEntries) {
        this.fileHashes.delete(entry.filePath);
      }
      debug.info('CacheManager', 'Invalidated cache key:', key.substring(0, 8));
    }
  }

  /**
   * Invalidate all cache entries for a file path
   */
  invalidateByPath(filePath: string): void {
    let invalidated = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (entry.filePath === filePath) {
        this.cache.delete(key);
        invalidated++;
      }
    }
    this.fileHashes.delete(filePath);
    debug.info('CacheManager', `Invalidated ${invalidated} entries for path:`, filePath);
  }

  /**
   * Check if file content has changed
   */
  async hasFileChanged(filePath: string, currentContent: string): Promise<boolean> {
    const storedHash = this.fileHashes.get(filePath);
    if (!storedHash) {
      return true; // No hash stored, consider it changed
    }

    const currentHash = await this.generateContentHash(currentContent);
    return currentHash !== storedHash;
  }

  /**
   * Get file hash
   */
  getFileHash(filePath: string): string | undefined {
    return this.fileHashes.get(filePath);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.fileHashes.clear();
    debug.info('CacheManager', `Cleared ${size} cache entries`);
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    oldestEntry: number | null;
  } {
    let oldestTimestamp: number | null = null;

    for (const entry of this.cache.values()) {
      if (oldestTimestamp === null || entry.result.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.result.timestamp;
      }
    }

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: 0, // Would need to track hits/misses for real hit rate
      oldestEntry: oldestTimestamp,
    };
  }

  /**
   * Evict least recently accessed entry
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.invalidate(oldestKey);
      debug.info('CacheManager', 'Evicted oldest entry:', oldestKey.substring(0, 8));
    }
  }

}

// Export singleton
export const cacheManager = new CacheManager();

