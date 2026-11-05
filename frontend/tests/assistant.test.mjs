import test from 'node:test';
import assert from 'node:assert/strict';
import { assistantHistory, assistantSourcePath, assistantErrorMessage } from '../src/lib/assistant.ts';

test('assistant history preserves complete Unicode code points at the content limit', () => {
  const content = 'a'.repeat(3999) + '🎓' + 'restante';
  const [entry] = assistantHistory([{ role: 'user', content, sources: [{ id: 7 }] }]);
  assert.equal(Array.from(entry.content).length, 4000);
  assert.equal(entry.content.isWellFormed(), true);
  assert.equal(entry.content, 'a'.repeat(3999) + '🎓');
  assert.deepEqual(Object.keys(entry), ['role', 'content']);
});

test('assistant forwards only bounded recent roles/content, without source metadata', () => {
  const messages = Array.from({ length: 18 }, (_, index) => ({
    role: index % 2 ? 'assistant' : 'user', content: `${index}:` + 'a'.repeat(5000), sources: [{ id: 999 }],
  }));
  const history = assistantHistory(messages);
  assert.equal(history.length, 10);
  assert.equal(history[0].content.startsWith('8:'), true);
  assert.equal(history[9].content.length, 4000);
  assert.deepEqual(Object.keys(history[0]), ['role', 'content']);
  assert.equal(messages.length, 18);
  assert.equal(messages[0].content.length > 4000, true);
});

test('assistant sources only link to existing internal modules and valid identifiers', () => {
  assert.equal(assistantSourcePath({ kind: 'task', id: 25 }), '/tasks?highlight=25');
  assert.equal(assistantSourcePath({ kind: 'subject', id: 3 }), '/subjects/3');
  assert.equal(assistantSourcePath({ kind: 'event', id: 1 }), '/calendar');
  assert.equal(assistantSourcePath({ kind: 'session', id: 1 }), '/study');
  for (const id of [-1, 0, 1.5, Infinity, NaN, 'https://evil.example']) {
    assert.equal(assistantSourcePath({ kind: 'task', id }), null);
  }
  assert.equal(assistantSourcePath({ kind: 'https://evil.example', id: 1 }), null);
});

test('assistant errors distinguish expired sessions, capacity, configuration and timeout', () => {
  assert.match(assistantErrorMessage(401), /sessão expirou/);
  assert.match(assistantErrorMessage(422), /Reformule/);
  assert.match(assistantErrorMessage(429), /muitas solicitações/);
  assert.match(assistantErrorMessage(503), /configuração/);
  assert.match(assistantErrorMessage(504), /demorou/);
  assert.match(assistantErrorMessage(502), /conexão/);
});
