import test from 'node:test';
import assert from 'node:assert/strict';
import { authEntryReducer, initialAuthEntry, introPlaybackTimeout } from '../src/lib/authEntry.ts';

test('restaurar uma sessão não cria uma introdução, e cada autenticação tem uma entrada nova', () => {
  assert.equal(initialAuthEntry.pendingId, null);
  const first = authEntryReducer(initialAuthEntry, { type: 'authenticated' });
  const second = authEntryReducer(first, { type: 'authenticated' });
  assert.notEqual(first.pendingId, second.pendingId);
  assert.equal(authEntryReducer(first, { type: 'complete', entryId: first.pendingId }).pendingId, null);
});

test('logout e novo login não podem ser liberados por evento tardio do vídeo anterior', () => {
  const first = authEntryReducer(initialAuthEntry, { type: 'authenticated' });
  const loggedOut = authEntryReducer(first, { type: 'clear' });
  assert.equal(loggedOut.pendingId, null);
  const next = authEntryReducer(loggedOut, { type: 'authenticated' });
  assert.equal(authEntryReducer(next, { type: 'complete', entryId: first.pendingId }), next);
  const finished = authEntryReducer(next, { type: 'complete', entryId: next.pendingId });
  assert.equal(authEntryReducer(finished, { type: 'complete', entryId: next.pendingId }), finished);
});

test('mídia sem duração válida ou longa demais sempre tem limite de segurança', () => {
  assert.equal(introPlaybackTimeout(Infinity), 30000);
  assert.equal(introPlaybackTimeout(NaN), 30000);
  assert.equal(introPlaybackTimeout(-2), 30000);
  assert.equal(introPlaybackTimeout(0.1), 8000);
  assert.equal(introPlaybackTimeout(12), 17000);
  assert.equal(introPlaybackTimeout(900), 60000);
});
