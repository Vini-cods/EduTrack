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
