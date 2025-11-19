/**
 * Debug Logger
 * Centralized logging utility that respects verbosity level preference
 */

import type { LogLevel } from '../types';

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  none: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
};

class DebugLogger {
  private static instance: DebugLogger;
  private logLevel: LogLevel = 'error'; // Default to error so we see failures

  private constructor() {
    // Initialize from storage
    void this.loadDebugState();
  }

  static getInstance(): DebugLogger {
    if (!DebugLogger.instance) {
      DebugLogger.instance = new DebugLogger();
    }
    return DebugLogger.instance;
  }

  private async loadDebugState(): Promise<void> {
    try {
      const result = (await chrome.storage.sync.get('preferences')) as {
        preferences?: { logLevel?: LogLevel; debug?: boolean };
      };
      if (result.preferences?.logLevel) {
        this.logLevel = result.preferences.logLevel;
      } else if (result.preferences?.debug) {
        // Migration: if debug was true, use debug level, otherwise use error (default)
        this.logLevel = 'debug';
      } else {
        this.logLevel = 'error';
      }
    } catch {
      // If we can't access chrome.storage, default to error
      this.logLevel = 'error';
    }
  }

  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  getLogLevel(): LogLevel {
    return this.logLevel;
  }

  private shouldLog(level: LogLevel): boolean {
    return LEVEL_PRIORITY[this.logLevel] >= LEVEL_PRIORITY[level];
  }

  log(context: string, ...args: unknown[]): void {
    if (this.shouldLog('debug')) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
      console.log(`[${context}]`, ...(args as any[]));
    }
  }

  debug(context: string, ...args: unknown[]): void {
    if (this.shouldLog('debug')) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
      console.debug(`[${context}]`, ...(args as any[]));
    }
  }

  info(context: string, ...args: unknown[]): void {
    if (this.shouldLog('info')) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
      console.info(`[${context}]`, ...(args as any[]));
    }
  }

  warn(context: string, ...args: unknown[]): void {
    if (this.shouldLog('warn')) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
      console.warn(`[${context}]`, ...(args as any[]));
    }
  }

  error(context: string, ...args: unknown[]): void {
    if (this.shouldLog('error')) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
      console.error(`[${context}]`, ...(args as any[]));
    }
  }

  group(context: string, label: string): void {
    if (this.shouldLog('debug')) {
      console.group(`[${context}] ${label}`);
    }
  }

  groupEnd(): void {
    if (this.shouldLog('debug')) {
      console.groupEnd();
    }
  }

  table(context: string, data: unknown): void {
    if (this.shouldLog('debug')) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      console.log(`[${context}]`);
      console.table(data);
    }
  }

  time(context: string, label: string): void {
    if (this.shouldLog('debug')) {
      console.time(`[${context}] ${label}`);
    }
  }

  timeEnd(context: string, label: string): void {
    if (this.shouldLog('debug')) {
      console.timeEnd(`[${context}] ${label}`);
    }
  }
}

// Export singleton instance
export const debugLogger = DebugLogger.getInstance();

  // Export convenience functions
export const debug = {
  log: (context: string, ...args: unknown[]) => debugLogger.log(context, ...args),
  debug: (context: string, ...args: unknown[]) => debugLogger.debug(context, ...args),
  info: (context: string, ...args: unknown[]) => debugLogger.info(context, ...args),
  warn: (context: string, ...args: unknown[]) => debugLogger.warn(context, ...args),
  error: (context: string, ...args: unknown[]) => debugLogger.error(context, ...args),
  group: (context: string, label: string) => debugLogger.group(context, label),
  groupEnd: () => debugLogger.groupEnd(),
  table: (context: string, data: unknown) => debugLogger.table(context, data),
  time: (context: string, label: string) => debugLogger.time(context, label),
  timeEnd: (context: string, label: string) => debugLogger.timeEnd(context, label),
  setLogLevel: (level: LogLevel) => debugLogger.setLogLevel(level),
  getLogLevel: () => debugLogger.getLogLevel(),
  // Compat
  setDebugMode: (enabled: boolean) => debugLogger.setLogLevel(enabled ? 'debug' : 'error'),
  isDebugEnabled: () => debugLogger.getLogLevel() === 'debug',
};

