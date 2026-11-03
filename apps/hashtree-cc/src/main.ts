import 'virtual:uno.css';
import App from './App.svelte';
import { mount } from 'svelte';
import { initWorkerClient } from './lib/workerClient';
import { initP2P } from './lib/p2p';
import { initServiceWorker } from './lib/swInit';
import { ensureHashtreeStreamingReady } from './lib/workerStreaming';

function logBackgroundServiceError(label: string, error: unknown): void {
  const message = error instanceof Error ? error : new Error(String(error));
  console.error(`[${label}]`, message);
}

async function initBackgroundServices(): Promise<void> {
  void initServiceWorker()
    .then(() => ensureHashtreeStreamingReady())
    .catch((error) => {
      logBackgroundServiceError('service-worker', error);
    });
  await Promise.all([initP2P(), initWorkerClient()]);
}

void initBackgroundServices().catch((error) => {
  logBackgroundServiceError('background-services', error);
});

const app = mount(App, {
  target: document.getElementById('app')!,
});

export default app;
