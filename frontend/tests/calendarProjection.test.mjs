import test from 'node:test';
import assert from 'node:assert/strict';
import { calendarItemKey, projectCalendarItems } from '../src/lib/calendarProjection.ts';

const start = new Date('2026-10-12T00:00:00');
const end = new Date('2026-10-18T23:59:59');
const task = (id, overrides = {}) => ({ id, title: 'Entrega de algoritmos', subject_id: 1, subject_name: 'Algoritmos',
  status: 'pendente', priority: 'media', due_date: '2026-10-15', created_at: '2026-10-01T12:00:00', updated_at: '2026-10-01T12:00:00', ...overrides });
const event = (id, overrides = {}) => ({ id, title: 'Revisão', task_id: 1, subject_id: 1, category: 'estudo',
  start_datetime: '2026-10-15T19:00:00', end_datetime: '2026-10-15T20:00:00', ...overrides });

test('prazos são projetados uma única vez, sem inventar um horário de atividade', () => {
  const original = task(1);
  const items = projectCalendarItems([], [original, original], start, end);
  assert.equal(items.length, 1);
  assert.equal(items[0].source, 'task');
  assert.equal(items[0].all_day, true);
  assert.equal(items[0].start_datetime, '2026-10-15T00:00:00');
  assert.equal(new Date(items[0].start_datetime).getDate(), 15);
  assert.equal(items[0].end_datetime, null);
  assert.equal(items[0].task_id, original.id);
  assert.equal(original.due_date, '2026-10-15');
  assert.equal('source' in original, false);
});

test('range inclui limites locais e ignora tarefas sem data ou com data inválida', () => {
  const tasks = [task(1, { due_date: '2026-10-12' }), task(2, { due_date: '2026-10-18' }),
    task(3, { due_date: '2026-10-11' }), task(4, { due_date: '2026-10-19' }), task(5, { due_date: null }),
    task(6, { due_date: '2026-02-30' }), task(7, { due_date: 'inválida' }), task(8, { due_date: '2026-10-15T12:00' })];
  assert.deepEqual(projectCalendarItems([], tasks, start, end).map((item) => item.task_id), [1, 2]);
});

test('blocos de estudo legítimos e ocorrências recorrentes com mesmo título permanecem', () => {
  const events = [event(1), event(1), event(2), event(3, { start_datetime: '2026-10-16T19:00:00', recurrence_group_id: 'serie' })];
  const items = projectCalendarItems(events, [task(1)], start, end);
  assert.equal(items.length, 4);
  assert.deepEqual(items.filter((item) => item.source !== 'task').map((item) => item.id), [1, 2, 3]);
});

test('somente entrega/prova vinculada na mesma data substitui representação do prazo', () => {
  const events = [event(1, { category: 'trabalho' }), event(2, { task_id: 2, category: 'prova' }),
    event(3, { task_id: 3 }), event(4, { task_id: 4, category: 'trabalho', start_datetime: '2026-10-14T19:00:00' }),
    event(5, { task_id: null, category: 'trabalho', title: 'Entrega de algoritmos' })];
  const items = projectCalendarItems(events, [1, 2, 3, 4, 5].map((id) => task(id)), start, end);
  assert.deepEqual(items.filter((item) => item.source === 'task').map((item) => item.task_id), [3, 4, 5]);
});

test('editar prazo, concluir e excluir refletem os dados atuais sem registros órfãos', () => {
  const original = task(1);
  const initial = projectCalendarItems([], [original], start, end);
  const updated = projectCalendarItems(initial, [task(1, { due_date: '2026-10-17', status: 'concluida' })], start, end);
  assert.equal(updated.length, 1);
  assert.equal(updated[0].start_datetime, '2026-10-17T00:00:00');
  assert.equal(updated[0].task_status, 'concluida');
  assert.deepEqual(projectCalendarItems(updated, [], start, end), []);
});

test('identidades de evento e tarefa continuam distintas', () => {
  const items = projectCalendarItems([event(1)], [task(1)], start, end);
  assert.equal(new Set(items.map(calendarItemKey)).size, 2);
});
