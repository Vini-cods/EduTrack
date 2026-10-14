import test from 'node:test';
import assert from 'node:assert/strict';
import { analyticsRange, capacityStorageKey, formatMinutes, readDailyCapacity, shiftAnalyticsPeriod, validDailyCapacity } from '../src/lib/analytics.ts';
import { dashboardAgenda, dashboardDeadlines, dashboardPriorities } from '../src/lib/dashboard.ts';

test('períodos respeitam semanas segunda-domingo, ano e fevereiro bissexto', () => {
  assert.deepEqual(analyticsRange('week', new Date(2026, 9, 18, 23, 50)), { start: '2026-10-12', end: '2026-10-18' });
  assert.deepEqual(analyticsRange('week', new Date(2027, 0, 1)), { start: '2026-12-28', end: '2027-01-03' });
  assert.deepEqual(analyticsRange('month', new Date(2028, 1, 29)), { start: '2028-02-01', end: '2028-02-29' });
  assert.deepEqual(analyticsRange('month', shiftAnalyticsPeriod(new Date(2026, 0, 31), 'month', 1)), { start: '2026-02-01', end: '2026-02-28' });
});

test('capacidade é validada e isolada por usuário mesmo com dados locais corrompidos', () => {
  const originalStorage = globalThis.localStorage;
  const stored = new Map([[capacityStorageKey(1), '3.5'], [capacityStorageKey(2), 'NaN'], [capacityStorageKey(3), '0']]);
  globalThis.localStorage = { getItem: (key) => stored.get(key) ?? null };
  try {
    assert.equal(readDailyCapacity(1), 3.5);
    assert.equal(readDailyCapacity(2), 6);
    assert.equal(readDailyCapacity(3), 6);
    assert.equal(readDailyCapacity(undefined), 6);
    for (const value of [0, -1, Infinity, NaN, 24.1]) assert.equal(validDailyCapacity(value), false);
    for (const value of [0.5, 3.5, 24]) assert.equal(validDailyCapacity(value), true);
    globalThis.localStorage = { getItem() { throw new Error('Blocked storage'); } };
    assert.equal(readDailyCapacity(1), 6);
  } finally { if (originalStorage === undefined) delete globalThis.localStorage; else globalThis.localStorage = originalStorage; }
});

test('duração arredonda minutos de forma legível e rejeita valores inválidos', () => {
  assert.equal(formatMinutes(0), '0min');
  assert.equal(formatMinutes(25), '25min');
  assert.equal(formatMinutes(90), '1h 30min');
  assert.equal(formatMinutes(120), '2h');
  assert.equal(formatMinutes(Infinity), '0min');
  assert.equal(formatMinutes(-15), '0min');
});

const task = (id, overrides = {}) => ({ id, title: `Tarefa ${id}`, priority: 'media', status: 'pendente', due_date: null, ...overrides });
const event = (id, overrides = {}) => ({ id, title: 'Aula', category: 'aula', start_datetime: '2026-10-14T10:00:00', end_datetime: '2026-10-14T11:00:00', ...overrides });
const today = new Date(2026, 9, 14, 12);

test('dashboard prioriza atrasos e hoje sem repetir identidade nem alterar entrada', () => {
  const tasks = [task(1), task(2, { priority: 'urgente', due_date: '2026-11-10' }), task(3, { due_date: '2026-10-14' }), task(4, { due_date: '2026-10-13' }), task(5, { due_date: '2026-10-15' }), task(6, { due_date: '2026-10-10', status: 'concluida' }), task(3, { due_date: '2026-10-14' })];
  assert.deepEqual(dashboardPriorities(tasks, today).map(({ id }) => id), [4, 3, 2, 5, 1]);
  assert.equal(tasks.length, 7);
  assert.equal(tasks[0].id, 1);
});

test('agenda inclui evento em curso de véspera e preserva ocorrências legítimas', () => {
  const events = [event(1), event(1), event(2, { start_datetime: '2026-10-13T23:00:00', end_datetime: '2026-10-14T01:00:00' }), event(3, { start_datetime: '2026-10-13T22:00:00', end_datetime: '2026-10-14T00:00:00' }), event(-1, { source: 'task' }), event(4, { start_datetime: '2026-10-15T10:00:00', end_datetime: '2026-10-15T11:00:00' }), event(5)];
  assert.deepEqual(dashboardAgenda(events, today).map(({ id }) => id), [2, 1, 5]);
});

test('horizonte separa prazos de amanhã de agenda e tarefas concluídas', () => {
  const items = [event(-1, { source: 'task', task_status: 'pendente', start_datetime: '2026-10-15T00:00:00' }), event(-2, { source: 'task', task_status: 'concluida', start_datetime: '2026-10-16T00:00:00' }), event(1, { category: 'prova', start_datetime: '2026-10-16T08:00:00' }), event(2, { category: 'estudo', start_datetime: '2026-10-16T10:00:00' }), event(3, { category: 'prova', start_datetime: '2026-10-14T15:00:00' }), event(4, { category: 'prova', start_datetime: '2026-11-14T15:00:00' })];
  assert.deepEqual(dashboardDeadlines(items, today).map(({ id }) => id), [-1, 1]);
});
