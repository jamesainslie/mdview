/**
 * Debug Logger
 * Centralized logging utility that respects debug mode preference
 */

class DebugLogger {
  private static instance: DebugLogger;
  private debugEnabled = false;

  private constructor() {
    // Initialize from storage
    this.loadDebugState();
  }

  static getInstance(): DebugLogger {
    if (!DebugLogger.instance) {
      DebugLogger.instance = new DebugLogger();
    }
    return DebugLogger.instance;
  }

  private async loadDebugState(): Promise<void> {
    try {
      const result = await chrome.storage.sync.get('preferences');
      this.debugEnabled = result.preferences?.debug ?? false;
    } catch {
      // If we can't access chrome.storage, default to false
      this.debugEnabled = false;
    }
  }

  setDebugMode(enabled: boolean): void {
    this.debugEnabled = enabled;
  }

  log(context: string, ...args: any[]): void {
    if (this.debugEnabled) {
      console.log(`[${context}]`, ...args);
    }
  }

  warn(context: string, ...args: any[]): void {
    if (this.debugEnabled) {
      console.warn(`[${context}]`, ...args);
    }
  }

  error(context: string, ...args: any[]): void {
    // Always log errors regardless of debug mode
    console.error(`[${context}]`, ...args);
  }

  group(context: string, label: string): void {
    if (this.debugEnabled) {
      console.group(`[${context}] ${label}`);
    }
  }

  groupEnd(): void {
    if (this.debugEnabled) {
      console.groupEnd();
    }
  }

  table(context: string, data: any): void {
    if (this.debugEnabled) {
      console.log(`[${context}]`);
      console.table(data);
    }
  }

  time(context: string, label: string): void {
    if (this.debugEnabled) {
      console.time(`[${context}] ${label}`);
    }
  }

  timeEnd(context: string, label: string): void {
    if (this.debugEnabled) {
      console.timeEnd(`[${context}] ${label}`);
    }
  }
}

// Export singleton instance
export const debugLogger = DebugLogger.getInstance();

// Export convenience functions
export const debug = {
  log: (context: string, ...args: any[]) => debugLogger.log(context, ...args),
  warn: (context: string, ...args: any[]) => debugLogger.warn(context, ...args),
  error: (context: string, ...args: any[]) => debugLogger.error(context, ...args),
  group: (context: string, label: string) => debugLogger.group(context, label),
  groupEnd: () => debugLogger.groupEnd(),
  table: (context: string, data: any) => debugLogger.table(context, data),
  time: (context: string, label: string) => debugLogger.time(context, label),
  timeEnd: (context: string, label: string) => debugLogger.timeEnd(context, label),
  setDebugMode: (enabled: boolean) => debugLogger.setDebugMode(enabled),
};

