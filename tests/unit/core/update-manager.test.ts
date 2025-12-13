import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UpdateManager } from '../../../src/core/update-manager';
import type { UpdateClient, UpdateCheckResult, UpdateState } from '../../../src/types';

function createInMemoryChromeStorage() {
  const store = new Map<string, unknown>();

  const get = vi.fn((key: string) => {
    if (!store.has(key)) return {};
    return Promise.resolve({ [key]: store.get(key) });
  });

  const set = vi.fn((obj: Record<string, unknown>) => {
    Object.entries(obj).forEach(([k, v]) => store.set(k, v));
    return Promise.resolve();
  });

  const chromeLocal = chrome.storage.local as unknown as {
    get: (key: string) => Promise<Record<string, unknown>>;
    set: (obj: Record<string, unknown>) => Promise<void>;
  };
  chromeLocal.get = get as unknown as (key: string) => Promise<Record<string, unknown>>;
  chromeLocal.set = set as unknown as (obj: Record<string, unknown>) => Promise<void>;

  return { store, get, set };
}

function createMockUpdateClient(result: UpdateCheckResult = 'no_update') {
  const listeners = new Set<() => void>();

  const requestUpdateCheckMock = vi.fn(() => Promise.resolve(result));
  const reloadMock = vi.fn();

  const client: UpdateClient = {
    requestUpdateCheck: requestUpdateCheckMock,
    onUpdateAvailable: (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    reload: reloadMock,
  };

  return { client, listeners, requestUpdateCheckMock, reloadMock };
}

describe('UpdateManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with idle state when no stored value exists', async () => {
    const { client } = createMockUpdateClient('no_update');
    const storage = createInMemoryChromeStorage();

    const manager = new UpdateManager(client, { cooldownMs: 0 });
    await manager.initialize();

    expect(manager.getState().status).toBe('idle');
    expect(storage.set).toHaveBeenCalled();
  });

  it('loads stored update state if present', async () => {
    const { client } = createMockUpdateClient('no_update');
    const storage = createInMemoryChromeStorage();
    const stored: UpdateState = { status: 'no_update', lastCheckedAt: 123 };
    storage.store.set('updateState', stored);

    const manager = new UpdateManager(client, { cooldownMs: 0 });
    await manager.initialize();

    expect(manager.getState()).toEqual(stored);
  });

  it('checkNow transitions to no_update', async () => {
    const { client, requestUpdateCheckMock } = createMockUpdateClient('no_update');
    createInMemoryChromeStorage();

    const manager = new UpdateManager(client, { cooldownMs: 0 });
    await manager.initialize();

    const state = await manager.checkNow();
    expect(state.status).toBe('no_update');
    expect(requestUpdateCheckMock).toHaveBeenCalledTimes(1);
  });

  it('checkNow transitions to throttled', async () => {
    const { client } = createMockUpdateClient('throttled');
    createInMemoryChromeStorage();

    const manager = new UpdateManager(client, { cooldownMs: 0 });
    await manager.initialize();

    const state = await manager.checkNow();
    expect(state.status).toBe('throttled');
  });

  it('onUpdateAvailable sets status to update_available', async () => {
    const { client, listeners } = createMockUpdateClient('no_update');
    createInMemoryChromeStorage();

    const manager = new UpdateManager(client, { cooldownMs: 0 });
    await manager.initialize();

    listeners.forEach((l) => l());
    // state update is async and persisted
    await Promise.resolve();

    expect(manager.getState().status).toBe('update_available');
  });

  it('applyNow rejects unless update is available', async () => {
    const { client, reloadMock } = createMockUpdateClient('no_update');
    createInMemoryChromeStorage();

    const manager = new UpdateManager(client, { cooldownMs: 0 });
    await manager.initialize();

    const res = manager.applyNow();
    expect(res.ok).toBe(false);
    expect(res.error).toBeTruthy();
    expect(reloadMock).not.toHaveBeenCalled();
  });

  it('applyNow reloads when update is available', async () => {
    const { client, listeners, reloadMock } = createMockUpdateClient('no_update');
    createInMemoryChromeStorage();

    const manager = new UpdateManager(client, { cooldownMs: 0 });
    await manager.initialize();

    listeners.forEach((l) => l());
    await Promise.resolve();

    const res = manager.applyNow();
    expect(res.ok).toBe(true);
    expect(reloadMock).toHaveBeenCalledTimes(1);
  });
});
