import type { UpdateCheckResult, UpdateClient, UpdateTestScenario } from '../../types';
import { debug } from '../../utils/debug-logger';

export class ChromeUpdateClient implements UpdateClient {
  requestUpdateCheck(): Promise<UpdateCheckResult> {
    return new Promise((resolve, reject) => {
      try {
        chrome.runtime.requestUpdateCheck((status) => {
          const err = chrome.runtime.lastError;
          if (err) {
            reject(new Error(err.message));
            return;
          }

          // status is: "throttled" | "no_update" | "update_available"
          resolve(status as UpdateCheckResult);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  onUpdateAvailable(cb: () => void): () => void {
    const handler = () => cb();
    chrome.runtime.onUpdateAvailable.addListener(handler);
    return () => chrome.runtime.onUpdateAvailable.removeListener(handler);
  }

  reload(): void {
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
    const storage = (await chrome.storage.local.get('mdview_test_update_scenario')) as {
      mdview_test_update_scenario?: UpdateTestScenario;
    };

    const scenario = storage.mdview_test_update_scenario ?? 'no_update';

    if (scenario === 'error') {
      throw new Error('Simulated update check failure');
    }

    if (scenario === 'update_available') {
      // In production, onUpdateAvailable fires when the update is downloaded.
      // In tests we simulate that event immediately after the check.
      queueMicrotask(() => {
        this.listeners.forEach((l) => l());
      });
    }

    return scenario;
  }

  onUpdateAvailable(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  reload(): void {
    void chrome.storage.local
      .set({ mdview_test_reload_called_at: Date.now() })
      .catch((error: unknown) =>
        debug.error('TestUpdateClient', 'Failed to record reload:', error)
      );
  }
}
