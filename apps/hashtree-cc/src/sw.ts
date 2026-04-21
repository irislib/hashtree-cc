/**
 * hashtree-cc Service Worker
 *
 * Handles /htree/{nhash}/{filename} requests by streaming bytes from the
 * hashtree worker via a registered MessagePort.
 */

/// <reference lib="webworker" />
import { getRawHtreePath, parseImmutableHtreePath } from '@hashtree/worker/htree-path';
import { precacheAndRoute } from 'workbox-precaching';
import { createInactivityTimer, type InactivityTimer } from './lib/inactivityTimeout';

declare let self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<unknown>;
};

const isTestMode = !!import.meta.env.VITE_TEST_MODE;
const PORT_TIMEOUT_MS = 60_000;
const PORT_WAIT_TIMEOUT_MS = 5_000;
const PORT_RETRY_WAIT_TIMEOUT_MS = 3_000;
const PORT_WAIT_INTERVAL_MS = 50;

if (!isTestMode) {
  precacheAndRoute(self.__WB_MANIFEST);
}

if (isTestMode) {
  self.addEventListener('install', (event) => {
    event.waitUntil(self.skipWaiting());
  });

  self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
      await self.clients.claim();
    })());
  });
}

interface HtreeFileRequest {
  type: 'hashtree-file';
  requestId: string;
  nhash: string;
  path: string;
  start: number;
  end?: number;
  rangeHeader?: string | null;
  sizeHint?: number;
  mimeType: string;
  download?: boolean;
  head?: boolean;
}

interface WorkerHeadersMessage {
  type: 'headers';
  requestId: string;
  status?: number;
  headers?: Record<string, string>;
}

interface WorkerChunkMessage {
  type: 'chunk';
  requestId: string;
  data: Uint8Array;
}

interface WorkerDoneMessage {
  type: 'done';
  requestId: string;
}

interface WorkerErrorMessage {
  type: 'error';
  requestId: string;
  message?: string;
}

type WorkerMessage = WorkerHeadersMessage | WorkerChunkMessage | WorkerDoneMessage | WorkerErrorMessage;

interface PendingRequest {
  resolve: (response: Response) => void;
  reject: (error: Error) => void;
  timeout: InactivityTimer;
  head: boolean;
  trackedDownload: boolean;
  writer?: WritableStreamDefaultWriter<Uint8Array>;
}

const workerPorts = new Map<string, MessagePort>();
const workerPortsByClientKey = new Map<string, MessagePort>();
const reconnectRequestDeadlines = new Map<string, number>();
let defaultWorkerPort: MessagePort | null = null;
let activeDownloadCount = 0;

const pendingRequests = new Map<string, PendingRequest>();
let requestCounter = 0;

async function broadcastTransferActivity(): Promise<void> {
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const client of clients) {
    client.postMessage({
      type: 'TRANSFER_ACTIVITY',
      activeDownloads: activeDownloadCount,
    });
  }
}

function guessMimeType(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    ico: 'image/x-icon',
    bmp: 'image/bmp',
    avif: 'image/avif',
    mp4: 'video/mp4',
    webm: 'video/webm',
    ogg: 'video/ogg',
    mov: 'video/quicktime',
    avi: 'video/x-msvideo',
    mkv: 'video/x-matroska',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    flac: 'audio/flac',
    m4a: 'audio/mp4',
    aac: 'audio/aac',
    opus: 'audio/opus',
    pdf: 'application/pdf',
    txt: 'text/plain',
    md: 'text/markdown',
    json: 'application/json',
    html: 'text/html',
    css: 'text/css',
    js: 'application/javascript',
  };
  return map[ext] || 'application/octet-stream';
}

function normalizeMimeType(value: string | null | undefined): string | null {
  const trimmed = `${value ?? ''}`.trim().toLowerCase();
  if (!trimmed || trimmed === 'application/octet-stream') {
    return null;
  }
  if (trimmed === 'audio/mp3') {
    return 'audio/mpeg';
  }
  if (trimmed === 'audio/x-wav') {
    return 'audio/wav';
  }
  return trimmed;
}

function parsePositiveInteger(value: string | null): number | undefined {
  const parsed = Number.parseInt(`${value ?? ''}`.trim(), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function addCORSHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Cross-Origin-Resource-Policy', 'cross-origin');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function getPort(clientId?: string | null, clientKey?: string | null): MessagePort | null {
  if (clientKey && workerPortsByClientKey.has(clientKey)) {
    return workerPortsByClientKey.get(clientKey) || null;
  }
  if (clientId && workerPorts.has(clientId)) {
    return workerPorts.get(clientId) || null;
  }
  return defaultWorkerPort;
}

function dropWorkerPortRegistration(
  port: MessagePort,
  clientId?: string | null,
  clientKey?: string | null,
): void {
  if (clientKey && workerPortsByClientKey.get(clientKey) === port) {
    workerPortsByClientKey.delete(clientKey);
  }
  if (clientId && workerPorts.get(clientId) === port) {
    workerPorts.delete(clientId);
  }
  if (defaultWorkerPort === port) {
    defaultWorkerPort = null;
  }
}

function waitForWorkerPort(
  lookup: () => MessagePort | null,
  timeoutMs: number = PORT_WAIT_TIMEOUT_MS,
): Promise<MessagePort | null> {
  const deadline = Date.now() + timeoutMs;
  return new Promise<MessagePort | null>((resolve) => {
    const poll = () => {
      const port = lookup();
      if (port) {
        resolve(port);
        return;
      }
      if (Date.now() >= deadline) {
        resolve(null);
        return;
      }
      setTimeout(poll, PORT_WAIT_INTERVAL_MS);
    };
    poll();
  });
}

async function requestWorkerPortReconnect(
  clientId?: string | null,
  clientKey?: string | null,
): Promise<void> {
  const reconnectKey = `${clientId ?? ''}:${clientKey ?? ''}`;
  const now = Date.now();
  const nextAllowedAt = reconnectRequestDeadlines.get(reconnectKey) ?? 0;
  if (nextAllowedAt > now) {
    return;
  }
  reconnectRequestDeadlines.set(reconnectKey, now + 1_000);

  const matchedClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  const targetClient = clientId
    ? matchedClients.find((candidate) => candidate.id === clientId) ?? null
    : null;
  const recipients = targetClient ? [targetClient] : matchedClients;

  await Promise.all(recipients.map(async (recipient) => {
    try {
      recipient.postMessage({
        type: 'REQUEST_WORKER_PORT_RECONNECT',
        clientKey,
      });
    } catch {
      // Ignore reconnect notification failures.
    }
  }));
}

function clearPending(requestId: string): PendingRequest | undefined {
  const pending = pendingRequests.get(requestId);
  if (!pending) return undefined;
  pending.timeout.clear();
  pendingRequests.delete(requestId);
  if (pending.trackedDownload && activeDownloadCount > 0) {
    activeDownloadCount -= 1;
    void broadcastTransferActivity();
  }
  return pending;
}

function handleWorkerMessage(event: MessageEvent<WorkerMessage>): void {
  const message = event.data;
  const pending = pendingRequests.get(message.requestId);
  if (!pending) return;

  switch (message.type) {
    case 'headers': {
      pending.timeout.touch();
      const headers = new Headers(message.headers || {});
      headers.set('Access-Control-Allow-Origin', '*');
      headers.set('Cross-Origin-Resource-Policy', 'cross-origin');

      if (pending.head) {
        clearPending(message.requestId);
        pending.resolve(new Response(null, {
          status: message.status || 200,
          headers,
        }));
        return;
      }

      const { readable, writable } = new TransformStream<Uint8Array>();
      pending.writer = writable.getWriter();
      pending.resolve(new Response(readable, {
        status: message.status || 200,
        headers,
      }));
      return;
    }

    case 'chunk': {
      if (!pending.writer) return;
      pending.timeout.touch();
      pending.writer.write(new Uint8Array(message.data)).catch(() => {});
      return;
    }

    case 'done': {
      const finished = clearPending(message.requestId);
      finished?.writer?.close().catch(() => {});
      return;
    }

    case 'error': {
      const failed = clearPending(message.requestId);
      failed?.writer?.abort(message.message || 'Worker stream error').catch(() => {});
      failed?.reject(new Error(message.message || 'Worker stream error'));
      return;
    }
  }
}

function serveViaWorker(request: HtreeFileRequest, port: MessagePort): Promise<Response> {
  return new Promise<Response>((resolve, reject) => {
    const trackedDownload = !!request.download && !request.head;
    if (trackedDownload) {
      activeDownloadCount += 1;
      void broadcastTransferActivity();
    }

    const timeout = createInactivityTimer(PORT_TIMEOUT_MS, () => {
      const timedOut = clearPending(request.requestId);
      if (!timedOut) return;
      timedOut.writer?.abort('Timeout waiting for worker response').catch(() => {});
      timedOut.reject(new Error('Timeout waiting for worker response'));
    });

    pendingRequests.set(request.requestId, {
      resolve,
      reject,
      timeout,
      head: !!request.head,
      trackedDownload,
    });

    port.postMessage(request);
  });
}

self.addEventListener('message', (event: ExtendableMessageEvent) => {
  if (event.data?.type === 'SKIP_WAITING') {
    void self.skipWaiting();
    return;
  }

  if (event.data?.type === 'GET_TRANSFER_ACTIVITY') {
    const source = event.source as Client | null;
    const requestId = event.data?.requestId as string | undefined;
    if (requestId && source?.postMessage) {
      source.postMessage({
        type: 'TRANSFER_ACTIVITY',
        requestId,
        activeDownloads: activeDownloadCount,
      });
    }
    return;
  }

  if (event.data?.type === 'PING_WORKER_PORT') {
    const source = event.source as Client | null;
    const requestId = event.data?.requestId as string | undefined;
    const clientId = source?.id ?? event.data?.clientId;
    const clientKey = event.data?.clientKey as string | undefined;
    const hasPort = !!(getPort(clientId, clientKey));
    if (requestId && source?.postMessage) {
      source.postMessage({ type: 'WORKER_PORT_PONG', requestId, ok: hasPort });
    }
    return;
  }

  if (event.data?.type === 'REGISTER_WORKER_PORT') {
    const port = (event.data?.port as MessagePort | undefined) ?? event.ports?.[0];
    if (!port) return;

    const source = event.source as Client | null;
    const clientId = source?.id ?? event.data?.clientId;
    const clientKey = event.data?.clientKey as string | undefined;

    if (clientId) {
      workerPorts.set(clientId, port);
    } else {
      defaultWorkerPort = port;
    }
    if (clientKey) {
      workerPortsByClientKey.set(clientKey, port);
    }

    port.onmessage = handleWorkerMessage;
    port.start?.();

    const requestId = event.data?.requestId as string | undefined;
    if (requestId && source?.postMessage) {
      source.postMessage({ type: 'WORKER_PORT_READY', requestId });
    }
  }
});

async function createNhashResponse(
  nhash: string,
  filePath: string,
  request: Request,
  clientId?: string | null
): Promise<Response> {
  const url = new URL(request.url);
  const clientKey = url.searchParams.get('htree_c');
  const rangeHeader = request.headers.get('Range');
  const rangeMatch = rangeHeader ? /bytes=(\d+)-(\d+)?/i.exec(rangeHeader) : null;
  const mimeType = normalizeMimeType(url.searchParams.get('htree_t')) ?? guessMimeType(filePath);
  const sizeHint = parsePositiveInteger(url.searchParams.get('htree_s'));
  const buildMessage = (): HtreeFileRequest => ({
    type: 'hashtree-file',
    requestId: `file_${++requestCounter}`,
    nhash,
    path: filePath,
    start: rangeMatch ? Number(rangeMatch[1]) : 0,
    end: rangeMatch && rangeMatch[2] ? Number(rangeMatch[2]) : undefined,
    rangeHeader,
    sizeHint,
    mimeType,
    download: url.searchParams.get('download') === '1',
    head: request.method === 'HEAD',
  });

  let port = getPort(clientId, clientKey);
  if (!port) {
    void requestWorkerPortReconnect(clientId, clientKey);
    port = await waitForWorkerPort(() => getPort(clientId, clientKey));
    if (!port) {
      return new Response('Worker port not available', { status: 503 });
    }
  }

  try {
    return await serveViaWorker(buildMessage(), port);
  } catch (error) {
    dropWorkerPortRegistration(port, clientId, clientKey);
    void requestWorkerPortReconnect(clientId, clientKey);

    const retryPort = await waitForWorkerPort(
      () => getPort(clientId, clientKey),
      PORT_RETRY_WAIT_TIMEOUT_MS,
    );
    if (!retryPort) {
      const message = error instanceof Error ? error.message : 'Streaming failed';
      return new Response(message, { status: 500 });
    }

    try {
      return await serveViaWorker(buildMessage(), retryPort);
    } catch (retryError) {
      const message = retryError instanceof Error ? retryError.message : 'Streaming failed';
      return new Response(message, { status: 500 });
    }
  }
}

self.addEventListener('fetch', (event: FetchEvent) => {
  if (event.request.method !== 'GET' && event.request.method !== 'HEAD') return;

  const url = new URL(event.request.url);
  const rawPath = getRawHtreePath(url);
  if (!rawPath.startsWith('/htree/')) return;

  const immutablePath = parseImmutableHtreePath(rawPath);
  if (immutablePath) {
    const { nhash, filePath } = immutablePath;
    event.respondWith(
      createNhashResponse(nhash, filePath || 'file', event.request, event.clientId).then(addCORSHeaders)
    );
    return;
  }

  const parts = rawPath.slice(1).split('/');
  if (parts.length >= 3 && parts[1].startsWith('npub1')) {
    event.respondWith(new Response('npub routes are not available in hashtree-cc', { status: 501 }));
    return;
  }
});

self.addEventListener('install', () => {
  // Don't force-activate updates during active sessions.
  // Waiting SWs are activated by the app when it is safe.
});

self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(self.clients.claim());
});
