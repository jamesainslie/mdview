import type { UpdateClient, UpdateState, UpdateStatus } from '../types';
import { debug } from '../utils/debug-logger';

const UPDATE_STATE_STORAGE_KEY = 'updateState';
const DEFAULT_COOLDOWN_MS = 30 * 60 * 1000;

export interface UpdateManagerOptions {
  cooldownMs?: number;
}

export interface UpdateCheckOptions {
  force?: boolean;
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
      debug.info('UpdateManager', 'Update available event received');
      void this.setState({
        status: 'update_available',
        lastResultAt: Date.now(),
        lastError: undefined,
      });
    });

    debug.debug('UpdateManager', 'Constructed', { cooldownMs: this.cooldownMs });
  }

  async initialize(): Promise<void> {
    debug.info('UpdateManager', 'Initializing update state');
    try {
      const stored = (await chrome.storage.local.get(UPDATE_STATE_STORAGE_KEY)) as {
        updateState?: UpdateState;
      };

      if (stored.updateState) {
        this.state = stored.updateState;
        debug.debug('UpdateManager', 'Loaded persisted update state', this.state);
      } else {
        this.state = { status: 'idle' };
        debug.debug('UpdateManager', 'No persisted update state found, defaulting to idle');
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
  async checkNow(options: UpdateCheckOptions = {}): Promise<UpdateState> {
    const now = Date.now();
    const lastCheckedAt = this.state.lastCheckedAt ?? 0;
    const force = options.force === true;

    if (this.state.status === 'checking') {
      debug.debug('UpdateManager', 'Check requested while already checking');
      return this.getState();
    }

    if (!force && now - lastCheckedAt < this.cooldownMs) {
      // Return cached state if the last check is recent.
      debug.info('UpdateManager', 'Check suppressed by cooldown', {
        lastCheckedAt,
        cooldownMs: this.cooldownMs,
        ageMs: now - lastCheckedAt,
      });
      return this.getState();
    }

    if (force && now - lastCheckedAt < this.cooldownMs) {
      debug.info('UpdateManager', 'Bypassing cooldown due to manual check', {
        lastCheckedAt,
        cooldownMs: this.cooldownMs,
        ageMs: now - lastCheckedAt,
      });
    }

    await this.setState({
      status: 'checking',
      lastCheckedAt: now,
      lastError: undefined,
    });

    try {
      debug.info('UpdateManager', 'Requesting update check');
      const result = await this.client.requestUpdateCheck();
      const next: UpdateStatus = this.mapCheckResultToStatus(result);

      await this.setState({
        status: next,
        lastResultAt: Date.now(),
        lastError: undefined,
      });

      if (next === 'throttled') {
        debug.warn('UpdateManager', 'Update check throttled');
      } else if (next === 'update_available') {
        debug.info('UpdateManager', 'Update reported as available');
      } else {
        debug.info('UpdateManager', 'Update check completed', { status: next });
      }
    } catch (error) {
      debug.error('UpdateManager', 'Update check failed:', error);
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
      debug.warn('UpdateManager', 'Apply requested but no update is available', {
        status: this.state.status,
      });
      return { ok: false, error: 'No update is available to apply' };
    }

    try {
      debug.info('UpdateManager', 'Applying update via runtime reload');
      this.client.reload();
      return { ok: true };
    } catch (error) {
      debug.error('UpdateManager', 'Failed to apply update:', error);
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
    const prev = this.state;
    this.state = { ...this.state, ...next };
    debug.debug('UpdateManager', 'State transition', { from: prev, to: this.state });
    await this.persist();
  }

  private async persist(): Promise<void> {
    try {
      await chrome.storage.local.set({ [UPDATE_STATE_STORAGE_KEY]: this.state });
    } catch (error) {
      debug.error('UpdateManager', 'Failed to persist update state:', error);
      throw error;
    }
  }
}
