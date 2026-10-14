import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeThemePreference, resolveTheme, readThemePreference } from '../src/lib/theme.ts';

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
