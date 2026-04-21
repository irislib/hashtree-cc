import {
  createHtreeRuntime,
  type HtreeRuntimeMediaUrlOptions,
  type HtreeRuntimeWorkerConfigOptions,
} from '@hashtree/worker';
import { settingsStore } from './settings';

type ImmutableMediaUrlOptions = Omit<HtreeRuntimeMediaUrlOptions, 'clientScoped'>;

const htreeRuntime = createHtreeRuntime({
  appId: 'hashtree-cc',
  relays: () => settingsStore.getState().network.relays,
  blossomServers: () => settingsStore.getState().network.blossomServers,
});

export function getHtreeRuntime() {
  return htreeRuntime;
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
  return htreeRuntime.urls.media(
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
