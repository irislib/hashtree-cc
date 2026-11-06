import assert from 'node:assert/strict';
import test from 'node:test';

let index = 0;
async function settings(stored, readFailure = false) {
  const writes = [];
  globalThis.window = { localStorage: {
    getItem() { if (readFailure) throw new Error('unavailable'); return stored; },
    setItem(key, value) { writes.push({ key, value }); },
  } };
  const module = await import(`../src/lib/settings.ts?case=${index++}`);
  return { ...module, writes };
}
test.afterEach(() => { delete globalThis.window; });

test('fresh defaults include Ditto while incidental settings changes preserve selected relays', async () => {
  const { settingsStore, DEFAULT_SETTINGS } = await settings(null);
  assert.equal(settingsStore.getState().network.relays[0], 'wss://relay.ditto.pub');
  settingsStore.setShowBandwidthIndicator(true);
  assert.deepEqual(settingsStore.getState().network.relays, DEFAULT_SETTINGS.network.relays);
});
for (const relays of [[], ['ws://127.0.0.1:1234'], ['wss://custom.example'], ['wss://relay.primal.net']]) {
  test(`saved relay policy stays exact: ${JSON.stringify(relays)}`, async () => {
    const { settingsStore, writes } = await settings(JSON.stringify({ network: { relays } }));
    assert.deepEqual(settingsStore.getState().network.relays, relays);
    settingsStore.setShowBandwidthIndicator(true);
    assert.deepEqual(JSON.parse(writes[0].value).network.relays, relays);
  });
}
for (const stored of ['', 'broken', 'null', '{}', '{"network":{"relays":[42]}}']) {
  test(`unreadable or missing saved relay policy stays disabled: ${stored}`, async () => {
    const { settingsStore } = await settings(stored);
    assert.deepEqual(settingsStore.getState().network.relays, []);
  });
}
test('storage read failure does not select public relays', async () => {
  const { settingsStore } = await settings(null, true);
  assert.deepEqual(settingsStore.getState().network.relays, []);
});
