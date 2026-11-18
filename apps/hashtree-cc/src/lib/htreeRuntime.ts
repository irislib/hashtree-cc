import {
  createHtreeRuntime,
  type HtreeRuntimeMediaUrlOptions,
  type HtreeRuntimeWorkerConfigOptions,
} from '@hashtree/worker';
import { settingsStore } from './settings';

type ImmutableMediaUrlOptions = Omit<HtreeRuntimeMediaUrlOptions, 'clientScoped'>;

const appId = 'hashtree-cc';
const htreeRuntime = createHtreeRuntime({
  appId,
  relays: () => settingsStore.getState().network.relays,
  blossomServers: () => settingsStore.getState().network.blossomServers,
});

// Private shares can exist only in browser storage. Keep their URLs and media
// port registration on the page's own service worker, including bridge origins.
const browserMediaRuntime = createHtreeRuntime({ appId, windowLike: {} });

export function getMediaRuntime() {
  return typeof navigator !== 'undefined' && 'serviceWorker' in navigator
    ? browserMediaRuntime
    : htreeRuntime;
}

export function getRuntimeWorkerConfig(
  options: HtreeRuntimeWorkerConfigOptions = {},
) {
  return htreeRuntime.getWorkerConfig(options);
}

export function getRuntimeBlossomServers() {
  return htreeRuntime.endpoints.blossomServers;
}

export function buildImmutableMediaUrl(
  nhash: string,
  path: string,
  options: ImmutableMediaUrlOptions = {},
): string {
  return getMediaRuntime().urls.media(
    {
      kind: 'immutable',
      nhash,
      path,
    },
    {
      ...options,
      clientScoped: true,
    },
  );
}
