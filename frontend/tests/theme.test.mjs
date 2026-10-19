import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeThemePreference, resolveTheme, readThemePreference, readPendingTheme, rememberPendingTheme, confirmPendingTheme, readEntryTheme, rememberEntryTheme, clearEntryTheme } from '../src/lib/theme.ts';

test('invalid or missing stored themes follow system preference', () => {
  for (const value of [null, undefined, 'purple', '', 'system']) assert.equal(normalizeThemePreference(value), 'system');
  assert.equal(resolveTheme('system', true), 'dark');
  assert.equal(resolveTheme('system', false), 'light');
});

test('explicit theme overrides the device and storage failures remain usable', () => {
  assert.equal(resolveTheme('light', true), 'light');
  assert.equal(resolveTheme('dark', false), 'dark');
  assert.equal(readThemePreference(), 'system');
});

function withStorage(run) {
  const values = new Map();
  const original = globalThis.localStorage;
  globalThis.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  try { run(values); }
  finally { if (original === undefined) delete globalThis.localStorage; else globalThis.localStorage = original; }
}

test('pending entry themes are isolated by account and accept system preference', () => {
  withStorage(() => {
    assert.equal(readPendingTheme(1), undefined);
    rememberPendingTheme(1, 'light');
    rememberPendingTheme(2, 'dark');
    rememberPendingTheme(3, 'system');
    assert.equal(readPendingTheme(1), 'light');
    assert.equal(readPendingTheme(2), 'dark');
    assert.equal(readPendingTheme(3), 'system');
    assert.equal(readPendingTheme(4), undefined);
  });
});

test('confirmation removes only the matching owner intent and preserves a newer choice', () => {
  withStorage(() => {
    rememberPendingTheme(1, 'light');
    rememberPendingTheme(2, 'dark');
    confirmPendingTheme(1, 'dark');
    assert.equal(readPendingTheme(1), 'light');
    rememberPendingTheme(1, 'dark');
    confirmPendingTheme(1, 'light');
    assert.equal(readPendingTheme(1), 'dark');
    confirmPendingTheme(1, 'dark');
    assert.equal(readPendingTheme(1), undefined);
    assert.equal(readPendingTheme(2), 'dark');
    rememberPendingTheme(1, 'system');
    confirmPendingTheme(1, 'system');
    assert.equal(readPendingTheme(1), undefined);
  });
});

test('invalid pending storage cannot become a valid system intent', () => {
  withStorage((values) => {
    rememberPendingTheme(1, 'light');
    assert.equal(values.size, 1);
    const [key] = values.keys();
    for (const invalid of ['purple', '', 'null', '{}', '123', '"purple"']) {
      values.set(key, invalid);
      assert.equal(readPendingTheme(1), undefined);
    }
  });
});

test('blocked local storage leaves theme intent helpers usable', () => {
  const original = globalThis.localStorage;
  globalThis.localStorage = {
    getItem: () => { throw Error('blocked'); },
    setItem: () => { throw Error('blocked'); },
    removeItem: () => { throw Error('blocked'); },
  };
  try {
    assert.equal(readPendingTheme(1), undefined);
    assert.doesNotThrow(() => rememberPendingTheme(1, 'dark'));
    assert.doesNotThrow(() => confirmPendingTheme(1, 'dark'));
  } finally { if (original === undefined) delete globalThis.localStorage; else globalThis.localStorage = original; }
});

test('provisional entry choice survives a fresh storage reader before the account is known', () => {
  withStorage((values) => {
    assert.equal(readEntryTheme(), undefined);
    rememberEntryTheme('dark');
    assert.equal(readEntryTheme(), 'dark');
    globalThis.localStorage = {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
      removeItem: (key) => values.delete(key),
    };
    assert.equal(readEntryTheme(), 'dark');
    assert.equal(readPendingTheme(1), undefined);
    rememberEntryTheme('light');
    assert.equal(readEntryTheme(), 'light');
    rememberEntryTheme('system');
    assert.equal(readEntryTheme(), 'system');
  });
});

test('invalid provisional storage is ignored instead of interpreted as system', () => {
  withStorage((values) => {
    rememberEntryTheme('light');
    assert.equal(values.size, 1);
    const [key] = values.keys();
    for (const invalid of ['purple', '', 'null', '{}', '123', '"dark"']) {
      values.set(key, invalid);
      assert.equal(readEntryTheme(), undefined);
    }
  });
});

test('provisional clearing can match its color and cannot erase a newer choice', () => {
  withStorage(() => {
    rememberEntryTheme('light');
    clearEntryTheme('dark');
    assert.equal(readEntryTheme(), 'light');
    rememberEntryTheme('dark');
    clearEntryTheme('light');
    assert.equal(readEntryTheme(), 'dark');
    clearEntryTheme('dark');
    assert.equal(readEntryTheme(), undefined);
    rememberEntryTheme('system');
    clearEntryTheme('system');
    assert.equal(readEntryTheme(), undefined);
    rememberEntryTheme('light');
    clearEntryTheme();
    assert.equal(readEntryTheme(), undefined);
  });
});

test('failed owner persistence reports failure and preserves provisional entry intent', () => {
  withStorage((values) => {
    rememberEntryTheme('light');
    const [provisionalKey] = values.keys();
    globalThis.localStorage = {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => {
        if (key !== provisionalKey) throw Error('quota exceeded');
        values.set(key, value);
      },
      removeItem: (key) => values.delete(key),
    };
    assert.equal(rememberPendingTheme(9, readEntryTheme()), false);
    assert.equal(readPendingTheme(9), undefined);
    assert.equal(readEntryTheme(), 'light');

    globalThis.localStorage.setItem = (key, value) => values.set(key, value);
    assert.equal(rememberPendingTheme(9, readEntryTheme()), true);
    clearEntryTheme('light');
    assert.equal(readEntryTheme(), undefined);
    assert.equal(readPendingTheme(9), 'light');
  });
});

test('blocked storage cannot crash provisional entry helpers or report a successful transfer', () => {
  const original = globalThis.localStorage;
  globalThis.localStorage = {
    getItem: () => { throw Error('blocked'); },
    setItem: () => { throw Error('blocked'); },
    removeItem: () => { throw Error('blocked'); },
  };
  try {
    assert.equal(readEntryTheme(), undefined);
    assert.doesNotThrow(() => rememberEntryTheme('dark'));
    assert.doesNotThrow(() => clearEntryTheme('dark'));
    assert.doesNotThrow(() => clearEntryTheme());
    assert.equal(rememberPendingTheme(9, 'dark'), false);
  } finally { if (original === undefined) delete globalThis.localStorage; else globalThis.localStorage = original; }
});

test('failed provisional cleanup preserves its stored value for another attempt', () => {
  withStorage(() => {
    rememberEntryTheme('dark');
    globalThis.localStorage.removeItem = () => { throw Error('blocked'); };
    assert.doesNotThrow(() => clearEntryTheme('dark'));
    assert.equal(readEntryTheme(), 'dark');
  });
});
