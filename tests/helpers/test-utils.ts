/**
 * Testing utility functions
 */

import { expect } from 'vitest';

/**
 * Assert that HTML contains specific elements
 */
export function assertHtmlContains(html: string, selector: string, message?: string): void {
  const container = document.createElement('div');
  container.innerHTML = html;
  const element = container.querySelector(selector);
  expect(element, message || `Expected HTML to contain ${selector}`).not.toBeNull();
}

/**
 * Assert that HTML matches a pattern
 */
export function assertHtmlMatches(html: string, pattern: RegExp, message?: string): void {
  expect(html, message || `Expected HTML to match pattern`).toMatch(pattern);
}

/**
 * Count occurrences of a substring in HTML
 */
export function countOccurrences(html: string, substring: string): number {
  return (html.match(new RegExp(substring, 'g')) || []).length;
}

/**
 * Extract text content from HTML
 */
export function extractTextContent(html: string): string {
  const container = document.createElement('div');
  container.innerHTML = html;
  return container.textContent || '';
}

/**
 * Create a container element for testing
 */
export function createTestContainer(): HTMLElement {
  const container = document.createElement('div');
  container.id = 'test-container';
  document.body.appendChild(container);
  return container;
}

/**
 * Clean up test container
 */
export function cleanupTestContainer(container?: HTMLElement): void {
  if (container && container.parentNode) {
    container.parentNode.removeChild(container);
  } else {
    const existing = document.getElementById('test-container');
    if (existing && existing.parentNode) {
      existing.parentNode.removeChild(existing);
    }
  }
}

/**
 * Measure execution time of a function
 */
export async function measureTime<T>(fn: () => T | Promise<T>): Promise<{ result: T; duration: number }> {
  const start = performance.now();
  const result = await fn();
  const duration = performance.now() - start;
  return { result, duration };
}

/**
 * Assert that operation completes within time limit
 */
export async function assertWithinTime<T>(
  fn: () => T | Promise<T>,
  maxMs: number,
  message?: string
): Promise<T> {
  const { result, duration } = await measureTime(fn);
  expect(duration, message || `Expected operation to complete within ${maxMs}ms`).toBeLessThan(maxMs);
  return result;
}

/**
 * Generate random string
 */
export function randomString(length: number = 10): string {
  return Math.random().toString(36).substring(2, 2 + length);
}

/**
 * Simulate user interaction delay
 */
export function simulateDelay(ms: number = 100): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Get all text nodes from an element
 */
export function getTextNodes(element: HTMLElement): Text[] {
  const textNodes: Text[] = [];
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null);
  
  let node: Node | null;
  while ((node = walker.nextNode())) {
    textNodes.push(node as Text);
  }
  
  return textNodes;
}

/**
 * Assert CSS variable is set
 */
export function assertCSSVariable(element: HTMLElement, varName: string, expectedValue?: string): void {
  const style = getComputedStyle(element);
  const value = style.getPropertyValue(varName).trim();
  
  if (expectedValue !== undefined) {
    expect(value).toBe(expectedValue);
  } else {
    expect(value).not.toBe('');
  }
}

/**
 * Wait for condition to be true
 */
export async function waitForCondition(
  condition: () => boolean,
  timeoutMs: number = 5000,
  intervalMs: number = 100
): Promise<void> {
  const startTime = Date.now();
  
  while (!condition()) {
    if (Date.now() - startTime > timeoutMs) {
      throw new Error('Timeout waiting for condition');
    }
    await simulateDelay(intervalMs);
  }
}

/**
 * Mock console methods to suppress output during tests
 */
export function mockConsole() {
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;
  
  console.log = () => {};
  console.warn = () => {};
  console.error = () => {};
  
  return {
    restore: () => {
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;
    },
  };
}

