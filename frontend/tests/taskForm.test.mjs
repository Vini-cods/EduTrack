import test from 'node:test';
import assert from 'node:assert/strict';
import { taskFormPayload, taskFormSchema } from '../src/lib/taskForm.ts';

const base = {
  title: 'Revisar algoritmos', description: '', subject_id: '1', due_date: '',
  priority: 'media', status: 'pendente', estimated_hours: '',
};

test('título de tarefa aceita o limite Unicode da API nos dois modos do formulário', () => {
  for (const studyGoal of [false, true]) {
    const schema = taskFormSchema(studyGoal);
    const estimated_hours = studyGoal ? '1' : '';
    for (const title of ['x'.repeat(255), '📚'.repeat(255), `${'x'.repeat(254)}📚`]) {
      const result = schema.safeParse({ ...base, title, estimated_hours });
      assert.equal(result.success, true, `${studyGoal}: ${title.length} unidades UTF-16`);
      assert.equal(taskFormPayload(result.data).title, title);
    }
    for (const title of ['x'.repeat(256), '📚'.repeat(256)]) {
      const result = schema.safeParse({ ...base, title, estimated_hours });
      assert.equal(result.success, false);
      assert.equal(result.error.issues[0].message, 'Use até 255 caracteres.');
    }
  }
});

test('título de tarefa remove White_Space Unicode antes de validar e enviar', () => {
  const schema = taskFormSchema();
  for (const title of ['', ' \t\n', '\u0085', '\u00a0\u0085']) {
    const result = schema.safeParse({ ...base, title });
    assert.equal(result.success, false, JSON.stringify(title));
    assert.equal(result.error.issues[0].message, 'Informe um título.');
  }
  const title = ` \u0085${'📚'.repeat(255)}\u0085\n`;
  const result = schema.safeParse({ ...base, title });
  assert.equal(result.success, true);
  assert.equal(result.data.title, '📚'.repeat(255));
  assert.equal(taskFormPayload({ ...base, title }).title, '📚'.repeat(255));
});

test('FEFF é preservado no título e participa do limite como na API', () => {
  const schema = taskFormSchema();
  const title = ' \ufeffRevisar\ufeff\n';
  const result = schema.safeParse({ ...base, title });
  assert.equal(result.success, true);
  assert.equal(result.data.title, '\ufeffRevisar\ufeff');
  assert.equal(taskFormPayload({ ...base, title }).title, '\ufeffRevisar\ufeff');
  assert.equal(schema.safeParse({ ...base, title: '\ufeff' }).success, true);
  assert.equal(schema.safeParse({ ...base, title: `\ufeff${'x'.repeat(255)}` }).success, false);
});

test('payload mantém os demais campos e a estimativa obrigatória do Planner', () => {
  assert.deepEqual(taskFormPayload({ ...base, title: '  Revisar  ', description: '  Resumo  ', due_date: '2026-11-05', estimated_hours: '1.5' }), {
    title: 'Revisar', description: 'Resumo', subject_id: 1, due_date: '2026-11-05',
    priority: 'media', status: 'pendente', estimated_hours: 1.5,
  });
  assert.equal(taskFormSchema().safeParse(base).success, true);
  assert.equal(taskFormSchema(true).safeParse(base).success, false);
});
