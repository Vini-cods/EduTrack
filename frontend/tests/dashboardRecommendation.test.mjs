import test from 'node:test';
import assert from 'node:assert/strict';
import { dashboardRecommendation } from '../src/lib/dashboardRecommendation.ts';

const now = new Date(2026, 9, 17, 12);
const task = (id, extra = {}) => ({ id, title: `Tarefa ${id}`, priority: 'media', status: 'pendente', due_date: null, ...extra });
const event = (id, extra = {}) => ({ id, title: `Evento ${id}`, category: 'aula', start_datetime: '2026-10-17T12:10:00', end_datetime: '2026-10-17T13:00:00', ...extra });

test('compromisso em andamento precede tarefa atrasada, com prova antes de estudo sobreposto', () => {
  const result = dashboardRecommendation([task(1, { due_date: '2026-10-16' })], [event(1, { category: 'estudo', start_datetime: '2026-10-17T11:00:00' }), event(2, { category: 'prova', start_datetime: '2026-10-17T11:30:00' })], now);
  assert.equal(result.kind, 'event'); assert.equal(result.phase, 'ongoing'); assert.equal(result.event.id, 2);
});

test('prepara compromisso nos próximos 30 minutos e ignora horários já encerrados', () => {
  const result = dashboardRecommendation([task(1)], [event(1, { start_datetime: '2026-10-17T10:00:00', end_datetime: '2026-10-17T12:00:00' }), event(2, { start_datetime: '2026-10-17T12:30:00' })], now);
  assert.equal(result.kind, 'event'); assert.equal(result.phase, 'next'); assert.equal(result.event.id, 2); assert.equal(result.minutesUntil, 30);
});

test('fora da janela imediata respeita prioridades existentes e explica atraso', () => {
  const tasks = [task(1, { priority: 'urgente' }), task(2, { due_date: '2026-10-16' }), task(3, { due_date: '2026-10-17', status: 'concluida' })];
  const result = dashboardRecommendation(tasks, [event(1, { start_datetime: '2026-10-17T14:00:00', end_datetime: '2026-10-17T15:00:00' })], now);
  assert.equal(result.kind, 'task'); assert.equal(result.task.id, 2); assert.equal(result.reason, 'overdue'); assert.equal(result.nextEvent.id, 1);
  assert.equal(tasks[0].id, 1);
});

test('evento sem término só é sugerido quando ainda não passou; projeções de prazo não são compromissos', () => {
  const result = dashboardRecommendation([task(1, { due_date: '2026-10-17' })], [event(-1, { source: 'task' }), event(2, { start_datetime: '2026-10-17T11:00:00', end_datetime: null })], now);
  assert.equal(result.kind, 'task'); assert.equal(result.reason, 'today');
});

test('sem tarefas recomenda o próximo evento do dia ou planejamento, nunca uma tarefa concluída', () => {
  const completed = [task(1, { status: 'concluida' })];
  assert.equal(dashboardRecommendation(completed, [event(1, { start_datetime: '2026-10-17T19:00:00', end_datetime: null })], now).kind, 'event');
  assert.equal(dashboardRecommendation(completed, [event(2, { start_datetime: '2026-10-18T12:00:00', end_datetime: null })], now).kind, 'plan');
});

test('mantém compromissos que atravessam meia-noite e reavalia o relógio ao terminar', () => {
  const overnight = event(1, { start_datetime: '2026-10-16T23:00:00', end_datetime: '2026-10-17T01:00:00' });
  assert.equal(dashboardRecommendation([], [overnight], new Date(2026, 9, 17, 0, 30)).kind, 'event');
  assert.equal(dashboardRecommendation([], [overnight], new Date(2026, 9, 17, 1)).kind, 'plan');
});
