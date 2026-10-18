import test from 'node:test';
import assert from 'node:assert/strict';
import { PreferencesSync, defaultUserPreferences, mergePreferences, readCachedPreferences, cachePreferences } from '../src/lib/userPreferences.ts';

function deferred() {
  let resolve, reject;
  const promise = new Promise((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}

test('hydration never writes browser defaults and controls cannot overwrite pending server read', async () => {
  const read = deferred();
  let writes = 0;
  const sync = new PreferencesSync(defaultUserPreferences(), { read: () => read.promise, patch: async () => { writes++; } }, () => {});
  const loading = sync.load();
  assert.equal(await sync.update({ theme: 'light' }), false);
  read.resolve({ ...defaultUserPreferences(), theme: 'dark', daily_capacity_hours: 2 });
  await loading;
  assert.equal(sync.state.value.theme, 'dark');
  assert.equal(sync.state.value.daily_capacity_hours, 2);
  assert.equal(sync.state.ready, true);
  assert.equal(writes, 0);
});

test('rapid partial changes are serialized and a response cannot erase a queued choice', async () => {
  const first = deferred();
  const calls = [];
  let server = defaultUserPreferences();
  const sync = new PreferencesSync(server, {
    read: async () => server,
    patch: async (patch) => {
      calls.push(patch);
      if (calls.length === 1) await first.promise;
      server = mergePreferences(server, patch);
      return server;
    },
  }, () => {});
  await sync.load();
  const saved = sync.update({ pomodoro: { focusMinutes: 35 } });
  void sync.update({ pomodoro: { shortBreakMinutes: 8 } });
  void sync.update({ pomodoro: { focusMinutes: 50 }, theme: 'dark' });
  assert.equal(calls.length, 1);
  first.resolve();
  assert.equal(await saved, true);
  assert.equal(calls.length, 2);
  assert.deepEqual(sync.state.value.pomodoro, { focusMinutes: 50, shortBreakMinutes: 8, longBreakMinutes: 15, cyclesUntilLongBreak: 4 });
  assert.equal(sync.state.value.theme, 'dark');
});

test('failed save remains visibly unsynced and retry saves only intended fields', async () => {
  let online = false;
  let server = defaultUserPreferences();
  const patches = [];
  const sync = new PreferencesSync(server, { read: async () => server, patch: async (patch) => {
    patches.push(patch);
    if (!online) throw Error('offline');
    server = mergePreferences(server, patch);
    return server;
  } }, () => {});
  await sync.load();
  assert.equal(await sync.update({ daily_capacity_hours: 4 }), false);
  assert.equal(sync.state.error, true);
  assert.equal(sync.state.saving, false);
  online = true;
  await sync.retry();
  assert.equal(sync.state.error, false);
  assert.equal(server.daily_capacity_hours, 4);
  assert.deepEqual(patches, [{ daily_capacity_hours: 4 }, { daily_capacity_hours: 4 }]);
});

test('logout cancels pending IO and ignores old account responses', async () => {
  const old = deferred();
  const notifications = [];
  let signal;
  const sync = new PreferencesSync(defaultUserPreferences(), {
    read: (value) => { signal = value; return old.promise; }, patch: async () => defaultUserPreferences(),
  }, (state) => notifications.push(state));
  const loading = sync.load();
  sync.dispose();
  old.resolve({ ...defaultUserPreferences(), theme: 'dark' });
  await loading;
  assert.equal(signal.aborted, true);
  assert.equal(sync.state.ready, false);
  assert.equal(notifications.length, 1);
  assert.equal(await sync.update({ theme: 'light' }), false);
});

test('cache is isolated by owner and cannot import global theme or timer state', () => {
  const storage = new Map([['edutrack:theme', 'dark'], ['edutrack:pomodoro-config', '{"focusMinutes":80}']]);
  const original = globalThis.localStorage;
  globalThis.localStorage = { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) };
  try {
    cachePreferences(1, { ...defaultUserPreferences(), theme: 'dark', daily_capacity_hours: 2 });
    assert.equal(readCachedPreferences(1).theme, 'dark');
    assert.equal(readCachedPreferences(2).theme, 'system');
    assert.equal(readCachedPreferences(2).pomodoro.focusMinutes, 25);
    storage.set('edutrack:preferences:2', '{"daily_capacity_hours":100,"pomodoro":{"focusMinutes":-1},"theme":"purple"}');
    assert.deepEqual(readCachedPreferences(2), defaultUserPreferences());
  } finally { if (original === undefined) delete globalThis.localStorage; else globalThis.localStorage = original; }
});
