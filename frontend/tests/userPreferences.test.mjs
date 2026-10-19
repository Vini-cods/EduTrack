import test from 'node:test';
import assert from 'node:assert/strict';
import { PreferencesSync, defaultUserPreferences, mergePreferences, readCachedPreferences, cachePreferences } from '../src/lib/userPreferences.ts';
import { readPendingTheme, rememberPendingTheme } from '../src/lib/theme.ts';

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

for (const [chosen, remote] of [['light', 'dark'], ['dark', 'light']]) {
  test(`entry choice ${chosen} replaces remote ${remote} without overwriting academic or timer preferences`, async () => {
    const patches = [];
    let server = {
      ...defaultUserPreferences(),
      theme: remote,
      daily_capacity_hours: 3,
      pomodoro: { focusMinutes: 50, shortBreakMinutes: 10, longBreakMinutes: 25, cyclesUntilLongBreak: 3 },
    };
    const originalSettings = { daily_capacity_hours: server.daily_capacity_hours, pomodoro: { ...server.pomodoro } };
    const sync = new PreferencesSync(defaultUserPreferences(), {
      read: async () => server,
      patch: async (patch) => {
        patches.push(patch);
        server = mergePreferences(server, patch);
        return server;
      },
    }, () => {}, chosen);

    assert.equal(sync.state.value.theme, chosen);
    await sync.load();
    assert.equal(sync.state.value.theme, chosen);
    assert.equal(sync.state.ready, true);
    assert.equal(sync.state.error, false);
    assert.deepEqual(patches, [{ theme: chosen }]);
    assert.equal(server.daily_capacity_hours, originalSettings.daily_capacity_hours);
    assert.deepEqual(server.pomodoro, originalSettings.pomodoro);
    assert.deepEqual(sync.state.value, server);
  });
}

test('entry theme already saved on the account requires no PATCH', async () => {
  let writes = 0;
  const server = { ...defaultUserPreferences(), theme: 'light', daily_capacity_hours: 2 };
  const sync = new PreferencesSync(defaultUserPreferences(), {
    read: async () => server,
    patch: async () => { writes++; return server; },
  }, () => {}, 'light');
  await sync.load();
  assert.deepEqual(sync.state.value, server);
  assert.equal(writes, 0);
});

test('failed GET retains entry choice and retry reconciles only its theme after reading the account', async () => {
  let online = false;
  const patches = [];
  let server = { ...defaultUserPreferences(), theme: 'dark', daily_capacity_hours: 4 };
  const sync = new PreferencesSync(defaultUserPreferences(), {
    read: async () => {
      if (!online) throw Error('offline');
      return server;
    },
    patch: async (patch) => {
      patches.push(patch);
      server = mergePreferences(server, patch);
      return server;
    },
  }, () => {}, 'light');
  await sync.load();
  assert.equal(sync.state.value.theme, 'light');
  assert.equal(sync.state.ready, false);
  assert.equal(sync.state.error, true);
  assert.deepEqual(patches, []);

  online = true;
  await sync.retry();
  assert.equal(sync.state.value.theme, 'light');
  assert.equal(sync.state.value.daily_capacity_hours, 4);
  assert.equal(sync.state.ready, true);
  assert.equal(sync.state.error, false);
  assert.deepEqual(patches, [{ theme: 'light' }]);
});

test('failed entry PATCH keeps the selected theme visible and retries only that field', async () => {
  let online = false;
  const patches = [];
  let server = {
    ...defaultUserPreferences(), theme: 'light', daily_capacity_hours: 3,
    pomodoro: { focusMinutes: 45, shortBreakMinutes: 7, longBreakMinutes: 20, cyclesUntilLongBreak: 3 },
  };
  const sync = new PreferencesSync(defaultUserPreferences(), {
    read: async () => server,
    patch: async (patch) => {
      patches.push(patch);
      if (!online) throw Error('offline');
      server = mergePreferences(server, patch);
      return server;
    },
  }, () => {}, 'dark');
  await sync.load();
  assert.equal(sync.state.value.theme, 'dark');
  assert.equal(sync.state.ready, true);
  assert.equal(sync.state.error, true);
  assert.equal(sync.state.saving, false);
  assert.equal(sync.state.value.daily_capacity_hours, 3);
  assert.equal(sync.state.value.pomodoro.focusMinutes, 45);
  assert.equal(server.theme, 'light');

  online = true;
  await sync.retry();
  assert.equal(sync.state.error, false);
  assert.equal(sync.state.value.theme, 'dark');
  assert.deepEqual(sync.state.value, server);
  assert.deepEqual(patches, [{ theme: 'dark' }, { theme: 'dark' }]);
});

test('a reload can resume an unsaved entry theme from the same owner without adopting the remote theme', async () => {
  const storage = new Map();
  const original = globalThis.localStorage;
  globalThis.localStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key),
  };
  try {
    rememberPendingTheme(7, 'light');
    let server = { ...defaultUserPreferences(), theme: 'dark', daily_capacity_hours: 2 };
    const first = new PreferencesSync(defaultUserPreferences(), {
      read: async () => server,
      patch: async () => { throw Error('offline'); },
    }, () => {}, readPendingTheme(7));
    await first.load();
    assert.equal(first.state.error, true);
    first.dispose();

    const patches = [];
    const reloaded = new PreferencesSync(readCachedPreferences(7), {
      read: async () => server,
      patch: async (patch) => {
        patches.push(patch);
        server = mergePreferences(server, patch);
        return server;
      },
    }, () => {}, readPendingTheme(7));
    assert.equal(reloaded.state.value.theme, 'light');
    await reloaded.load();
    assert.equal(reloaded.state.value.theme, 'light');
    assert.equal(reloaded.state.value.daily_capacity_hours, 2);
    assert.deepEqual(patches, [{ theme: 'light' }]);
    assert.equal(readPendingTheme(8), undefined);
  } finally { if (original === undefined) delete globalThis.localStorage; else globalThis.localStorage = original; }
});

test('logout during entry preference GET cannot trigger a late theme PATCH', async () => {
  const read = deferred();
  let writes = 0;
  const notifications = [];
  const sync = new PreferencesSync(defaultUserPreferences(), {
    read: () => read.promise,
    patch: async () => { writes++; return defaultUserPreferences(); },
  }, (state) => notifications.push(state), 'light');
  const loading = sync.load();
  sync.dispose();
  const countAtLogout = notifications.length;
  read.resolve({ ...defaultUserPreferences(), theme: 'dark' });
  await loading;
  assert.equal(writes, 0);
  assert.equal(notifications.length, countAtLogout);
  assert.equal(sync.state.ready, false);
  assert.equal(sync.state.value.theme, 'light');
});

test('logout during entry preference PATCH ignores its late confirmation', async () => {
  const patch = deferred();
  const started = deferred();
  const notifications = [];
  let signal;
  const sync = new PreferencesSync(defaultUserPreferences(), {
    read: async () => ({ ...defaultUserPreferences(), theme: 'dark' }),
    patch: (_value, requestSignal) => { signal = requestSignal; started.resolve(); return patch.promise; },
  }, (state) => notifications.push(state), 'light');
  const loading = sync.load();
  await started.promise;
  sync.dispose();
  const countAtLogout = notifications.length;
  const stateAtLogout = sync.state;
  patch.resolve({ ...defaultUserPreferences(), theme: 'light' });
  await loading;
  assert.equal(signal.aborted, true);
  assert.equal(notifications.length, countAtLogout);
  assert.equal(sync.state, stateAtLogout);
});

for (const entrySaveFails of [false, true]) {
  test(`authenticated theme changes supersede entry intent after ${entrySaveFails ? 'failed' : 'successful'} initial save`, async () => {
    let fail = entrySaveFails;
    let server = { ...defaultUserPreferences(), theme: 'dark', daily_capacity_hours: 3 };
    const patches = [];
    const sync = new PreferencesSync(defaultUserPreferences(), {
      read: async () => server,
      patch: async (patch) => {
        patches.push(patch);
        if (fail) throw Error('offline');
        server = mergePreferences(server, patch);
        return server;
      },
    }, () => {}, 'light');
    await sync.load();
    fail = true;
    assert.equal(await sync.update({ theme: 'dark' }), false);
    assert.equal(sync.state.value.theme, 'dark');
    fail = false;
    await sync.retry();
    await sync.retry();
    assert.equal(server.theme, 'dark');
    assert.equal(sync.state.value.theme, 'dark');
    assert.deepEqual(patches, [{ theme: 'light' }, { theme: 'dark' }, { theme: 'dark' }]);
  });
}
