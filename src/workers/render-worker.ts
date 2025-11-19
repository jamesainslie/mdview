/**
 * Render Worker
 * Generic web worker that handles markdown parsing, syntax highlighting, and mermaid rendering
 */

import type { WorkerTask, WorkerResponse } from '../types';

// Import task handlers
import { handleParseTask } from './tasks/parse-task';
import { handleHighlightTask } from './tasks/highlight-task';
import { handleMermaidTask } from './tasks/mermaid-task';

/**
 * Handle incoming messages
 */
self.onmessage = async (event: MessageEvent) => {
  const task = event.data as WorkerTask;

  try {
    let result: unknown;

    // Route to appropriate task handler
    switch (task.type) {
      case 'parse':
        result = await handleParseTask(task.payload);
        break;

      case 'highlight':
        result = await handleHighlightTask(task.payload);
        break;

      case 'mermaid':
        result = await handleMermaidTask(task.payload);
        break;

      default:
        throw new Error(`Unknown task type: ${task.type}`);
    }

    // Send success response
    const response: WorkerResponse = {
      id: task.id,
      result,
    };

    self.postMessage(response);
  } catch (error) {
    // Send error response
    const response: WorkerResponse = {
      id: task.id,
      error: error instanceof Error ? error.message : String(error),
    };

    self.postMessage(response);
  }
};

/**
 * Handle errors
 */
self.onerror = (event: string | Event) => {
  console.error('[RenderWorker] Error:', event);
};

/**
 * Handle unhandled promise rejections
 */
self.onunhandledrejection = (event: PromiseRejectionEvent) => {
  console.error('[RenderWorker] Unhandled promise rejection:', event.reason);
};

