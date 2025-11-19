/**
 * File Monitor Worker
 * Monitors file changes and notifies main thread for cache invalidation
 */

interface FileMonitorMessage {
  type: 'start' | 'stop';
  filePath?: string;
  interval?: number;
}

interface FileChangeNotification {
  type: 'file-changed';
  filePath: string;
  contentHash: string;
}

let monitorInterval: number | null = null;
let currentFilePath: string | null = null;
let lastContentHash: string | null = null;

/**
 * Handle incoming messages
 */
self.onmessage = async (event: MessageEvent) => {
  const message = event.data as FileMonitorMessage;

  switch (message.type) {
    case 'start':
      if (message.filePath) {
        await startMonitoring(message.filePath, message.interval || 1000);
      }
      break;

    case 'stop':
      stopMonitoring();
      break;

    default:
      console.error('[FileMonitorWorker] Unknown message type:', message.type);
  }
};

/**
 * Start monitoring a file
 */
async function startMonitoring(filePath: string, interval: number): Promise<void> {
  // Stop any existing monitoring
  stopMonitoring();

  currentFilePath = filePath;

  // Get initial content hash
  try {
    const content = await fetchFileContent(filePath);
    lastContentHash = await hashContent(content);
    console.log('[FileMonitorWorker] Started monitoring:', filePath);
  } catch (error) {
    console.error('[FileMonitorWorker] Failed to initialize monitoring:', error);
    return;
  }

  // Start polling
  monitorInterval = self.setInterval(async () => {
    if (!currentFilePath) return;

    try {
      const content = await fetchFileContent(currentFilePath);
      const newHash = await hashContent(content);

      if (newHash !== lastContentHash) {
        lastContentHash = newHash;

        // Notify main thread
        const notification: FileChangeNotification = {
          type: 'file-changed',
          filePath: currentFilePath,
          contentHash: newHash,
        };

        self.postMessage(notification);
        console.log('[FileMonitorWorker] File changed:', currentFilePath);
      }
    } catch (error) {
      console.error('[FileMonitorWorker] Error checking file:', error);
    }
  }, interval);
}

/**
 * Stop monitoring
 */
function stopMonitoring(): void {
  if (monitorInterval !== null) {
    clearInterval(monitorInterval);
    monitorInterval = null;
  }

  currentFilePath = null;
  lastContentHash = null;

  console.log('[FileMonitorWorker] Stopped monitoring');
}

/**
 * Fetch file content
 * Note: In a worker, we can't access the DOM, so we need to use fetch
 * For file:// URLs, this might not work directly. We'll need to pass content from main thread.
 */
async function fetchFileContent(_filePath: string): Promise<string> {
  // For file:// URLs, we can't fetch directly from a worker
  // The main thread will need to read the content and send it to us
  // For now, we'll just return a placeholder
  // In the integration phase, we'll need to adjust this approach
  
  throw new Error('File content must be provided by main thread');
}

/**
 * Generate SHA-256 hash of content
 */
async function hashContent(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

  return hashHex;
}

/**
 * Handle errors
 */
self.onerror = (event: string | Event) => {
  console.error('[FileMonitorWorker] Error:', event);
};

/**
 * Handle unhandled promise rejections
 */
self.onunhandledrejection = (event: PromiseRejectionEvent) => {
  console.error('[FileMonitorWorker] Unhandled promise rejection:', event.reason);
};

