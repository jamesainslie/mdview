/**
 * Worker Pool Manager
 * Manages a pool of web workers for parallel processing
 */

import type { WorkerTask, WorkerResponse } from '../types';
import { debug } from '../utils/debug-logger';

export interface WorkerPoolOptions {
  poolSize?: number; // Number of workers (default: navigator.hardwareConcurrency or 4)
  maxQueueSize?: number; // Max queued tasks (default: 100)
  workerScript?: string; // Path to worker script
}

interface PendingTask {
  task: WorkerTask;
  resolve: (value: unknown) => void;
  reject: (reason: Error) => void;
  priority: number;
}

export class WorkerPool {
  private workers: Worker[] = [];
  private taskQueue: PendingTask[] = [];
  private activeTasksPerWorker: Map<Worker, number> = new Map();
  private taskCallbacks: Map<string, PendingTask> = new Map();
  private poolSize: number;
  private maxQueueSize: number;
  private initialized = false;

  constructor(options: WorkerPoolOptions = {}) {
    this.poolSize = options.poolSize || navigator.hardwareConcurrency || 4;
    this.maxQueueSize = options.maxQueueSize || 100;

    debug.debug('WorkerPool', `Creating pool with ${this.poolSize} workers`);
  }

  /**
   * Initialize worker pool
   * Note: Workers don't work on file:// URLs due to Chrome security restrictions
   * The synchronous fallback is well-optimized with Phase 1 performance improvements
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Check if we're on a file:// URL - workers don't work there
    if (window.location.protocol === 'file:') {
      debug.warn('WorkerPool', 'Skipping workers on file:// URLs (Chrome restriction) - using optimized sync rendering');
      throw new Error('Workers not available on file:// URLs');
    }

    try {
      // Import worker module (works on http:// and https:// URLs)
      const RenderWorker = await import('./render-worker?worker');
      
      debug.debug('WorkerPool', `Creating pool with ${this.poolSize} workers`);
      
      for (let i = 0; i < this.poolSize; i++) {
        const worker = new RenderWorker.default();

        worker.addEventListener('message', this.handleWorkerMessage.bind(this));
        worker.addEventListener('error', this.handleWorkerError.bind(this));

        this.workers.push(worker);
        this.activeTasksPerWorker.set(worker, 0);

        debug.debug('WorkerPool', `Worker ${i + 1}/${this.poolSize} initialized`);
      }

      this.initialized = true;
      debug.info('WorkerPool', '✅ Worker pool ready!');
    } catch (error) {
      debug.error('WorkerPool', 'Failed to initialize worker pool:', error);
      throw error;
    }
  }

  /**
   * Execute a task in the worker pool
   */
  async execute<T = unknown>(task: WorkerTask): Promise<T> {
    if (!this.initialized) {
      await this.initialize();
    }

    return new Promise<T>((resolve, reject) => {
      // Check queue size limit
      if (this.taskQueue.length >= this.maxQueueSize) {
        reject(new Error('Worker pool task queue is full'));
        return;
      }

      const priority = task.priority || 0;
      const pendingTask: PendingTask = {
        task,
        resolve: resolve as (value: unknown) => void,
        reject,
        priority,
      };

      // Try to execute immediately if a worker is available
      const worker = this.getAvailableWorker();
      if (worker) {
        this.executeTask(worker, pendingTask);
      } else {
        // Queue the task
        this.enqueueTask(pendingTask);
      }
    });
  }

  /**
   * Handle worker message
   */
  private handleWorkerMessage(event: MessageEvent): void {
    const response = event.data as WorkerResponse;

    const pendingTask = this.taskCallbacks.get(response.id);
    if (!pendingTask) {
      debug.error('WorkerPool', 'Received response for unknown task:', response.id);
      return;
    }

    // Remove from callbacks
    this.taskCallbacks.delete(response.id);

    // Decrease active task count for this worker
    const worker = event.target as Worker;
    const currentCount = this.activeTasksPerWorker.get(worker) || 0;
    this.activeTasksPerWorker.set(worker, Math.max(0, currentCount - 1));

    // Resolve or reject the task
    if (response.error) {
      debug.error('WorkerPool', `Task ${response.id} failed:`, response.error);
      pendingTask.reject(new Error(response.error));
    } else {
      debug.debug('WorkerPool', `Task ${response.id} completed`);
      pendingTask.resolve(response.result);
    }

    // Process next queued task if available
    this.processQueue();
  }

  /**
   * Handle worker error
   */
  private handleWorkerError(event: ErrorEvent): void {
    debug.error('WorkerPool', 'Worker error:', event.message);

    // Find and reject any tasks assigned to this worker
    // Note: We don't currently track which worker has which task
    // In a production system, you'd want to track this more carefully and reject only affected tasks
  }

  /**
   * Get an available worker (least loaded)
   */
  private getAvailableWorker(): Worker | null {
    if (this.workers.length === 0) {
      return null;
    }

    // Find worker with fewest active tasks
    let minTasks = Infinity;
    let selectedWorker: Worker | null = null;

    for (const worker of this.workers) {
      const activeTasks = this.activeTasksPerWorker.get(worker) || 0;
      if (activeTasks < minTasks) {
        minTasks = activeTasks;
        selectedWorker = worker;
      }
    }

    // Return worker if it's not overloaded (max 3 tasks per worker)
    if (selectedWorker && minTasks < 3) {
      return selectedWorker;
    }

    return null;
  }

  /**
   * Execute a task on a specific worker
   */
  private executeTask(worker: Worker, pendingTask: PendingTask): void {
    // Increment active task count
    const currentCount = this.activeTasksPerWorker.get(worker) || 0;
    this.activeTasksPerWorker.set(worker, currentCount + 1);

    // Store callback
    this.taskCallbacks.set(pendingTask.task.id, pendingTask);

    // Send task to worker
    worker.postMessage(pendingTask.task);

    debug.debug('WorkerPool', `Dispatched task ${pendingTask.task.id} (type: ${pendingTask.task.type})`);
  }

  /**
   * Enqueue a task
   */
  private enqueueTask(pendingTask: PendingTask): void {
    // Insert task in priority order (higher priority first)
    let insertIndex = this.taskQueue.length;
    for (let i = 0; i < this.taskQueue.length; i++) {
      if (pendingTask.priority > this.taskQueue[i].priority) {
        insertIndex = i;
        break;
      }
    }

    this.taskQueue.splice(insertIndex, 0, pendingTask);
    debug.debug('WorkerPool', `Queued task ${pendingTask.task.id}, queue size: ${this.taskQueue.length}`);
  }

  /**
   * Process queued tasks
   */
  private processQueue(): void {
    while (this.taskQueue.length > 0) {
      const worker = this.getAvailableWorker();
      if (!worker) {
        break;
      }

      const pendingTask = this.taskQueue.shift();
      if (pendingTask) {
        this.executeTask(worker, pendingTask);
      }
    }
  }

  /**
   * Get pool statistics
   */
  getStats(): {
    poolSize: number;
    activeWorkers: number;
    queuedTasks: number;
    activeTasks: number;
  } {
    let activeTasks = 0;
    for (const count of this.activeTasksPerWorker.values()) {
      activeTasks += count;
    }

    return {
      poolSize: this.workers.length,
      activeWorkers: this.workers.filter((w) => (this.activeTasksPerWorker.get(w) || 0) > 0).length,
      queuedTasks: this.taskQueue.length,
      activeTasks,
    };
  }

  /**
   * Terminate all workers
   */
  terminate(): void {
    debug.info('WorkerPool', 'Terminating worker pool');

    // Reject all pending tasks
    for (const pendingTask of this.taskCallbacks.values()) {
      pendingTask.reject(new Error('Worker pool terminated'));
    }
    this.taskCallbacks.clear();

    // Reject all queued tasks
    for (const pendingTask of this.taskQueue) {
      pendingTask.reject(new Error('Worker pool terminated'));
    }
    this.taskQueue = [];

    // Terminate workers
    for (const worker of this.workers) {
      worker.terminate();
    }
    this.workers = [];
    this.activeTasksPerWorker.clear();
    this.initialized = false;

    debug.info('WorkerPool', 'Worker pool terminated');
  }
}

// Export singleton
export const workerPool = new WorkerPool();

