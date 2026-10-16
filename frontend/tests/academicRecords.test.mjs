import test from 'node:test';
import assert from 'node:assert/strict';
import { createAssessmentDraft, formatGradeNumber, parseAssessmentDraft, syllabusFieldError } from '../src/lib/academicRecords.ts';

const base = { name: 'Prova', score: '', max_score: '10', weight: '1', task_id: '' };

test('blank score is pending and zero remains an actual grade', () => {
  assert.deepEqual(parseAssessmentDraft(base, []), { ok: true, payload: { name: 'Prova', score: null, max_score: 10, weight: 1, task_id: null } });
  assert.equal(parseAssessmentDraft({ ...base, score: '0' }, []).payload.score, 0);
  assert.equal(parseAssessmentDraft({ ...base, score: '  ' }, []).payload.score, null);
  assert.equal(createAssessmentDraft({ score: 0, max_score: 10, weight: 1, task_id: null, name: 'Prova' }).score, '0');
});

test('decimal comma is accepted without changing grading scale or weight', () => {
  assert.deepEqual(parseAssessmentDraft({ ...base, name: ' Prova final ', score: '7,5', max_score: '20', weight: '2,5', task_id: '9' }, [9]).payload,
    { name: 'Prova final', score: 7.5, max_score: 20, weight: 2.5, task_id: 9 });
});

test('score cannot be negative, nonfinite, malformed or exceed its maximum', () => {
  for (const score of ['-1', '10.1', 'NaN', 'Infinity', '1e999', '1,2,3', '0x10']) {
    const result = parseAssessmentDraft({ ...base, score }, []);
    assert.equal(result.ok, false, score);
    assert.ok(result.errors.score, score);
  }
});

test('maximum and weight accept positive boundaries and reject missing or nonfinite values', () => {
  assert.equal(parseAssessmentDraft({ ...base, max_score: '10000', weight: '1000' }, []).ok, true);
  assert.equal(parseAssessmentDraft({ ...base, max_score: '0.5', weight: '0.01' }, []).ok, true);
  for (const max_score of ['', '0', '-1', '10000.1', 'Infinity', '1e999']) assert.ok(parseAssessmentDraft({ ...base, max_score }, []).errors.max_score);
  for (const weight of ['', '0', '-1', '1000.1', 'NaN', '1e999']) assert.ok(parseAssessmentDraft({ ...base, weight }, []).errors.weight);
});

test('assessment context only accepts a task belonging to the available subject', () => {
  for (const task_id of ['0', '-1', '1.5', '8', 'Infinity']) assert.ok(parseAssessmentDraft({ ...base, task_id }, [9]).errors.task_id);
  assert.equal(parseAssessmentDraft({ ...base, task_id: '9' }, [9]).payload.task_id, 9);
  assert.ok(parseAssessmentDraft({ ...base, name: '  ' }, []).errors.name);
  assert.ok(parseAssessmentDraft({ ...base, name: 'x'.repeat(256) }, []).errors.name);
  assert.equal(parseAssessmentDraft({ ...base, name: '😀'.repeat(255) }, []).ok, true);
});

test('syllabus accepts empty fields and the full Unicode text limit', () => {
  assert.equal(syllabusFieldError(''), null);
  assert.equal(syllabusFieldError('😀'.repeat(20000)), null);
  assert.ok(syllabusFieldError('x'.repeat(20001)));
});

test('small positive weights remain distinguishable from zero when formatted', () => {
  assert.equal(formatGradeNumber(0), '0');
  assert.equal(formatGradeNumber(0.001), '0,001');
  assert.notEqual(formatGradeNumber(0.0000001), '0');
});
