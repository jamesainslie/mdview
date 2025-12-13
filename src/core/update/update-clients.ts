import type { UpdateCheckResult, UpdateClient, UpdateTestScenario } from '../../types';
import { debug } from '../../utils/debug-logger';

export class ChromeUpdateClient implements UpdateClient {
  requestUpdateCheck(): Promise<UpdateCheckResult> {
    return new Promise((resolve, reject) => {
      try {
        debug.debug('ChromeUpdateClient', 'requestUpdateCheck called');
        chrome.runtime.requestUpdateCheck((status) => {
          const err = chrome.runtime.lastError;
          if (err) {
            debug.error('ChromeUpdateClient', 'requestUpdateCheck failed:', err.message);
            reject(new Error(err.message));
            return;
          }

          // status is: "throttled" | "no_update" | "update_available"
          debug.info('ChromeUpdateClient', 'requestUpdateCheck completed:', status);
          resolve(status as UpdateCheckResult);
        });
      } catch (error) {
        debug.error('ChromeUpdateClient', 'requestUpdateCheck threw:', error);
        reject(error);
      }
    });
  }

  onUpdateAvailable(cb: () => void): () => void {
    debug.debug('ChromeUpdateClient', 'Registering onUpdateAvailable listener');
    const handler = () => {
      debug.info('ChromeUpdateClient', 'onUpdateAvailable fired');
      cb();
    };
    chrome.runtime.onUpdateAvailable.addListener(handler);
    return () => chrome.runtime.onUpdateAvailable.removeListener(handler);
  }

  reload(): void {
    debug.info('ChromeUpdateClient', 'Reloading extension');
    chrome.runtime.reload();
  }
}

/**
 * Deterministic update client for E2E tests.
 *
 * Behavior is controlled via chrome.storage.local keys:
 * - mdview_test_update_scenario: "no_update" | "update_available" | "throttled" | "error"
 * - mdview_test_reload_called_at: number
 */
export class TestUpdateClient implements UpdateClient {
  private listeners: Set<() => void> = new Set();

  async requestUpdateCheck(): Promise<UpdateCheckResult> {
    debug.debug('TestUpdateClient', 'requestUpdateCheck called');
    const storage = (await chrome.storage.local.get('mdview_test_update_scenario')) as {
      mdview_test_update_scenario?: UpdateTestScenario;
    };

    const scenario = storage.mdview_test_update_scenario ?? 'no_update';
    debug.info('TestUpdateClient', 'Using scenario:', scenario);

    if (scenario === 'error') {
      debug.error('TestUpdateClient', 'Simulated update check failure');
      throw new Error('Simulated update check failure');
    }

    if (scenario === 'update_available') {
      // In production, onUpdateAvailable fires when the update is downloaded.
      // In tests we simulate that event immediately after the check.
      queueMicrotask(() => {
        debug.debug('TestUpdateClient', 'Simulating onUpdateAvailable listeners');
        this.listeners.forEach((l) => l());
      });
    }

    return scenario;
  }

  onUpdateAvailable(cb: () => void): () => void {
    debug.debug('TestUpdateClient', 'Registering onUpdateAvailable listener');
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  reload(): void {
    debug.info('TestUpdateClient', 'Recording reload instead of reloading');
    void chrome.storage.local
      .set({ mdview_test_reload_called_at: Date.now() })
      .catch((error: unknown) =>
        debug.error('TestUpdateClient', 'Failed to record reload:', error)
      );
  }
}
