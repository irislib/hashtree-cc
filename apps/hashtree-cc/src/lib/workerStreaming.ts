import { getMediaRuntime } from './htreeRuntime';
import { registerMediaPort } from './workerClient';

const DEFAULT_MEDIA_READY_ATTEMPTS = 3;
const DEFAULT_MEDIA_READY_DELAY_MS = 200;

export async function ensureHashtreeStreamingReady(): Promise<boolean> {
  return await getMediaRuntime().media.ensureReady({
    registerMediaPort,
    attempts: DEFAULT_MEDIA_READY_ATTEMPTS,
    delayMs: DEFAULT_MEDIA_READY_DELAY_MS,
  });
}
