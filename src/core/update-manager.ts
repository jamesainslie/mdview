import { debug } from '../utils/debug-logger';
import type { UpdateClient, UpdateState, UpdateStatus } from '../types';

const UPDATE_STATE_STORAGE_KEY = 'updateState';
const DEFAULT_COOLDOWN_MS = 30 * 60 * 1000;

export interface UpdateManagerOptions {
  cooldownMs?: number;
}

/**
 * UpdateManager
 *
 * Owns the extension update state machine and persistence. It is designed
 * to run in the MV3 service worker.
 */
export class UpdateManager {
  private state: UpdateState = { status: 'unknown' };
  private readonly client: UpdateClient;
  private readonly cooldownMs: number;

  constructor(client: UpdateClient, options: UpdateManagerOptions = {}) {
    this.client = client;
    this.cooldownMs = options.cooldownMs ?? DEFAULT_COOLDOWN_MS;

    this.client.onUpdateAvailable(() => {
      void this.setState({
        status: 'update_available',
        lastResultAt: Date.now(),
        lastError: undefined,
      });
    });
  }

  async initialize(): Promise<void> {
    try {
      const stored = (await chrome.storage.local.get(UPDATE_STATE_STORAGE_KEY)) as {
        updateState?: UpdateState;
      };

      if (stored.updateState) {
        this.state = stored.updateState;
      } else {
        this.state = { status: 'idle' };
        await this.persist();
      }
    } catch (error) {
      debug.error('UpdateManager', 'Failed to initialize update state:', error);
      this.state = { status: 'error', lastError: String(error) };
    }
  }

  getState(): UpdateState {
    return { ...this.state };
  }

  /**
   * Ask Chrome to check for updates.
   *
   * This is rate-limited to reduce throttling and unnecessary calls.
   */
  async checkNow(): Promise<UpdateState> {
    const now = Date.now();
    const lastCheckedAt = this.state.lastCheckedAt ?? 0;

    if (this.state.status === 'checking') {
      return this.getState();
    }

    if (now - lastCheckedAt < this.cooldownMs) {
      // Return cached state if the last check is recent.
      return this.getState();
    }

    await this.setState({
      status: 'checking',
      lastCheckedAt: now,
      lastError: undefined,
    });

    try {
      const result = await this.client.requestUpdateCheck();
      const next: UpdateStatus = this.mapCheckResultToStatus(result);

      await this.setState({
        status: next,
        lastResultAt: Date.now(),
        lastError: undefined,
      });
    } catch (error) {
      await this.setState({
        status: 'error',
        lastResultAt: Date.now(),
        lastError: String(error),
      });
    }

    return this.getState();
  }

  /**
   * Apply an update if one is available (downloaded) by reloading the extension.
   * In test mode, the injected client may make this a no-op that records state.
   */
  applyNow(): { ok: boolean; error?: string } {
    if (this.state.status !== 'update_available') {
      return { ok: false, error: 'No update is available to apply' };
    }

    try {
      this.client.reload();
      return { ok: true };
    } catch (error) {
      return { ok: false, error: String(error) };
    }
  }

  private mapCheckResultToStatus(
    result: 'no_update' | 'update_available' | 'throttled'
  ): UpdateStatus {
    switch (result) {
      case 'no_update':
        return 'no_update';
      case 'update_available':
        return 'update_available';
      case 'throttled':
        return 'throttled';
      default: {
        const exhaustiveCheck: never = result;
        return exhaustiveCheck;
      }
    }
  }

  private async setState(next: UpdateState): Promise<void> {
    this.state = { ...this.state, ...next };
    await this.persist();
  }

  private async persist(): Promise<void> {
    await chrome.storage.local.set({ [UPDATE_STATE_STORAGE_KEY]: this.state });
  }
}
