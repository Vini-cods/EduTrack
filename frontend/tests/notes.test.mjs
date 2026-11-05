import test from 'node:test';
import assert from 'node:assert/strict';
import { parseNoteTags, validateNoteInput, noteExcerpt } from '../src/lib/notes.ts';

const base = { title: 'Revisão', content: '', tags: [], subject_id: null, task_id: null, study_session_id: null };

test('tags normalize whitespace/case and omit duplicates without losing accents', () => {
  assert.deepEqual(parseNoteTags(' Revisão, prova, REVISÃO, , dúvidas '), ['revisão', 'prova', 'dúvidas']);
});

test('note validates API limits and accepts an empty body for a titled draft', () => {
  assert.equal(validateNoteInput(base), null);
  assert.ok(validateNoteInput({ ...base, title: '  ' }));
  assert.ok(validateNoteInput({ ...base, title: 'x'.repeat(256) }));
  assert.equal(validateNoteInput({ ...base, content: 'x'.repeat(100000) }), null);
  assert.ok(validateNoteInput({ ...base, content: 'x'.repeat(100001) }));
  assert.ok(validateNoteInput({ ...base, tags: Array.from({ length: 11 }, (_, i) => String(i)) }));
  assert.ok(validateNoteInput({ ...base, tags: ['x'.repeat(33)] }));
});

test('excerpt collapses line breaks without interpreting markup', () => {
  assert.equal(noteExcerpt('  Conceito\n\n importante  '), 'Conceito importante');
  assert.equal(noteExcerpt('<script>texto</script>'), '<script>texto</script>');
  assert.equal(noteExcerpt('Um conteúdo extenso', 10), 'Um conteúd…');
});

test('excerpt accepts supplementary Unicode characters at the exact limit', () => {
  const listExcerpt = 'a'.repeat(99) + '😀';
  assert.equal(noteExcerpt(listExcerpt, 100), listExcerpt);
  assert.equal(noteExcerpt('😀'.repeat(140)), '😀'.repeat(140));
});

test('excerpt truncates after a complete Unicode code point', () => {
  assert.equal(noteExcerpt('a'.repeat(99) + '😀b', 100), 'a'.repeat(99) + '😀…');
  assert.equal(noteExcerpt('😀'.repeat(101), 100), '😀'.repeat(100) + '…');
});

test('Unicode excerpt retains whitespace normalization and ellipsis boundaries', () => {
  assert.equal(noteExcerpt('  \n😀\ttexto  extra\r\n ', 7), '😀 texto…');
  assert.equal(noteExcerpt('😀 texto', 2), '😀…');
  assert.equal(noteExcerpt('😀 texto', 0), '…');
  assert.equal(noteExcerpt('  \n\t ', 0), '');
});
