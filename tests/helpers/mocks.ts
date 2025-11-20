/**
 * Mock implementations for testing
 */

import { vi } from 'vitest';
import type { Theme, ConversionResult, CachedResult } from '../../src/types';
import { mockTheme } from './fixtures';

/**
 * Mock Chrome runtime for messaging
 */
export function mockChromeRuntime() {
  const sendMessage = vi.fn().mockImplementation((message: any) => {
    // Mock different message types
    switch (message.type) {
      case 'CACHE_GENERATE_KEY':
        return Promise.resolve({ key: 'mock-cache-key-123' });
      case 'CACHE_GET':
        return Promise.resolve({ result: null });
      case 'CACHE_SET':
        return Promise.resolve({ success: true });
      case 'GET_STATE':
        return Promise.resolve({
          preferences: {
            theme: 'github-light',
            autoReload: false,
            lineNumbers: false,
            syncTabs: false,
            logLevel: 'warn',
          },
        });
      default:
        return Promise.resolve({});
    }
  });

  global.chrome.runtime.sendMessage = sendMessage;
  return { sendMessage };
}

/**
 * Mock Chrome storage
 */
export function mockChromeStorage() {
  const storage = {
    sync: {
      get: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockResolvedValue(undefined),
    },
    local: {
      get: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockResolvedValue(undefined),
    },
  };

  global.chrome.storage = storage as any;
  return storage;
}

/**
 * Mock theme loader
 */
export function mockThemeLoader(theme: Theme = mockTheme) {
  return vi.fn().mockResolvedValue({ default: theme });
}

/**
 * Mock DOMPurify
 */
export function createMockDOMPurify() {
  return {
    sanitize: vi.fn((dirty: string) => {
      // Simple sanitization for testing - remove script tags
      return dirty.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    }),
    addHook: vi.fn(),
    removeHook: vi.fn(),
    removeAllHooks: vi.fn(),
  };
}

/**
 * Mock Worker Pool
 */
export function createMockWorkerPool() {
  return {
    initialize: vi.fn().mockResolvedValue(undefined),
    execute: vi.fn().mockImplementation(async (task: any) => {
      // Simulate worker execution
      if (task.type === 'parse') {
        return {
          html: '<p>Mock HTML</p>',
          metadata: {
            wordCount: 2,
            headings: [],
            codeBlocks: [],
            mermaidBlocks: [],
            images: [],
            links: [],
          },
        };
      }
      return {};
    }),
    terminate: vi.fn(),
  };
}

/**
 * Mock Markdown Converter
 */
export function createMockConverter() {
  return {
    convert: vi.fn().mockResolvedValue({
      html: '<p>Converted HTML</p>',
      metadata: {
        wordCount: 2,
        headings: [],
        codeBlocks: [],
        mermaidBlocks: [],
        images: [],
        links: [],
      },
      errors: [],
    } as ConversionResult),
    validateSyntax: vi.fn().mockReturnValue({
      valid: true,
      errors: [],
      warnings: [],
    }),
    getInstance: vi.fn(),
  };
}

/**
 * Mock Syntax Highlighter
 */
export function createMockSyntaxHighlighter() {
  return {
    highlight: vi.fn().mockReturnValue({
      html: '<span class="hljs-keyword">const</span>',
      language: 'javascript',
    }),
    highlightAll: vi.fn(),
    highlightVisible: vi.fn(),
    setTheme: vi.fn().mockResolvedValue(undefined),
    isLanguageSupported: vi.fn().mockReturnValue(true),
  };
}

/**
 * Mock Mermaid Renderer
 */
export function createMockMermaidRenderer() {
  return {
    render: vi.fn().mockResolvedValue('<svg>Mock SVG</svg>'),
    renderAll: vi.fn().mockResolvedValue(undefined),
    updateTheme: vi.fn(),
    cleanup: vi.fn(),
  };
}

/**
 * Create mock DOM element
 */
export function createMockElement(tag: string = 'div'): HTMLElement {
  const element = document.createElement(tag);
  return element;
}

/**
 * Mock IntersectionObserver
 */
export function createMockIntersectionObserver() {
  const observers: Array<{ element: Element; isIntersecting: boolean }> = [];
  
  class MockIntersectionObserver implements IntersectionObserver {
    callback: IntersectionObserverCallback;
    options?: IntersectionObserverInit;
    root = null;
    rootMargin = '';
    thresholds: ReadonlyArray<number> = [];

    constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
      this.callback = callback;
      this.options = options;
    }

    observe(target: Element) {
      observers.push({ element: target, isIntersecting: false });
    }

    unobserve(target: Element) {
      const index = observers.findIndex((o) => o.element === target);
      if (index >= 0) {
        observers.splice(index, 1);
      }
    }

    disconnect() {
      observers.length = 0;
    }

    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }

    // Helper to trigger intersection
    triggerIntersection(target: Element, isIntersecting: boolean) {
      const observer = observers.find((o) => o.element === target);
      if (observer) {
        observer.isIntersecting = isIntersecting;
        const entry = {
          target,
          isIntersecting,
          intersectionRatio: isIntersecting ? 1 : 0,
          boundingClientRect: target.getBoundingClientRect(),
          intersectionRect: target.getBoundingClientRect(),
          rootBounds: null,
          time: Date.now(),
        } as IntersectionObserverEntry;
        this.callback([entry], this);
      }
    }
  }

  return MockIntersectionObserver;
}

/**
 * Wait for async operations
 */
export function waitFor(ms: number = 0): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wait for next tick
 */
export function nextTick(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof queueMicrotask !== 'undefined') {
      queueMicrotask(resolve);
    } else {
      Promise.resolve().then(resolve);
    }
  });
}

/**
 * Create mock cached result
 */
export function createMockCachedResult(overrides?: Partial<CachedResult>): CachedResult {
  return {
    html: '<p>Cached HTML</p>',
    metadata: {
      wordCount: 2,
      headings: [],
      codeBlocks: [],
      mermaidBlocks: [],
      images: [],
      links: [],
    },
    highlightedBlocks: new Map(),
    mermaidSVGs: new Map(),
    timestamp: Date.now(),
    cacheKey: 'mock-cache-key',
    ...overrides,
  };
}

