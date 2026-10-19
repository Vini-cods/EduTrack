import test from 'node:test';
import assert from 'node:assert/strict';
import { authEntryReducer, initialAuthEntry, introPlaybackTimeout } from '../src/lib/authEntry.ts';

test('restaurar uma sessão não cria uma introdução, e cada autenticação tem uma entrada nova', () => {
  assert.equal(initialAuthEntry.pendingId, null);
  const first = authEntryReducer(initialAuthEntry, { type: 'authenticated', theme: 'light' });
  const second = authEntryReducer(first, { type: 'authenticated', theme: 'dark' });
  assert.notEqual(first.pendingId, second.pendingId);
  assert.equal(second.theme, 'dark');
  const completed = authEntryReducer(first, { type: 'complete', entryId: first.pendingId });
  assert.equal(completed.pendingId, null);
  assert.equal(completed.theme, 'light');
});

test('logout e novo login não podem ser liberados por evento tardio do vídeo anterior', () => {
  const first = authEntryReducer(initialAuthEntry, { type: 'authenticated', theme: 'light' });
  const loggedOut = authEntryReducer(first, { type: 'clear' });
  assert.equal(loggedOut.pendingId, null);
  assert.equal(loggedOut.theme, null);
  const next = authEntryReducer(loggedOut, { type: 'authenticated', theme: 'dark' });
  assert.equal(authEntryReducer(next, { type: 'complete', entryId: first.pendingId }), next);
  const finished = authEntryReducer(next, { type: 'complete', entryId: next.pendingId });
  assert.equal(authEntryReducer(finished, { type: 'complete', entryId: next.pendingId }), finished);
  assert.equal(authEntryReducer(finished, { type: 'clear' }).theme, null);
});

test('mídia sem duração válida ou longa demais sempre tem limite de segurança', () => {
  assert.equal(introPlaybackTimeout(Infinity), 30000);
  assert.equal(introPlaybackTimeout(NaN), 30000);
  assert.equal(introPlaybackTimeout(-2), 30000);
  assert.equal(introPlaybackTimeout(0.1), 8000);
  assert.equal(introPlaybackTimeout(12), 17000);
  assert.equal(introPlaybackTimeout(900), 60000);
});
