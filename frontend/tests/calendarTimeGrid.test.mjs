import test from 'node:test';
import assert from 'node:assert/strict';
import { eventsOnDay, HOUR_HEIGHT, isOutsideTimeGrid, layoutDayEvents } from '../src/lib/calendar.ts';

const day = new Date('2026-10-14T12:00:00');
const event = (id, start, end) => ({ id, title: 'Revisão', category: 'estudo', start_datetime: start, end_datetime: end });

test('evento atravessando meia-noite ocupa ambos os dias com fim exclusivo', () => {
  const overnight = event(1, '2026-10-13T23:30:00', '2026-10-14T01:00:00');
  const midnightEnd = event(2, '2026-10-13T23:30:00', '2026-10-14T00:00:00');
  const tomorrow = event(3, '2026-10-15T00:00:00', '2026-10-15T01:00:00');
  assert.deepEqual(eventsOnDay([overnight, midnightEnd, tomorrow], day).map((item) => item.id), [1]);
  assert.deepEqual(eventsOnDay([overnight, midnightEnd], new Date('2026-10-13T12:00:00')).map((item) => item.id), [1, 2]);
});

test('eventos pontuais e prazos sem horário pertencem apenas à sua data local', () => {
  const point = event(1, '2026-10-14T00:00:00', null);
  const deadline = { ...event(-1, '2026-10-14T00:00:00', null), source: 'task', all_day: true };
  assert.equal(eventsOnDay([point, deadline], day).length, 2);
  assert.equal(eventsOnDay([point, deadline], new Date('2026-10-15T00:00:00')).length, 0);
  assert.equal(layoutDayEvents([deadline], day).length, 0);
});

test('layout recorta evento multidiário na grade do dia sem mudar os dados originais', () => {
  const span = event(1, '2026-10-13T23:30:00', '2026-10-15T01:00:00');
  const positioned = layoutDayEvents([span], day);
  assert.equal(positioned.length, 1);
  assert.equal(positioned[0].top, 0);
  assert.equal(positioned[0].height, 18 * HOUR_HEIGHT);
  assert.equal(span.start_datetime, '2026-10-13T23:30:00');
  assert.equal(span.end_datetime, '2026-10-15T01:00:00');
});

test('altura até meia-noite usa duração real, sem virar bloco de altura mínima', () => {
  const late = event(1, '2026-10-14T22:00:00', '2026-10-15T00:00:00');
  const positioned = layoutDayEvents([late], day);
  assert.equal(positioned[0].top, 16 * HOUR_HEIGHT);
  assert.equal(positioned[0].height, 2 * HOUR_HEIGHT);
});

test('eventos anteriores às 6h continuam acessíveis em faixa própria, sem horário inventado', () => {
  const early = event(1, '2026-10-14T01:00:00', '2026-10-14T02:00:00');
  const point = event(2, '2026-10-14T05:30:00', null);
  const crossing = event(3, '2026-10-14T05:00:00', '2026-10-14T07:00:00');
  assert.equal(isOutsideTimeGrid(early, day), true);
  assert.equal(isOutsideTimeGrid(point, day), true);
  assert.equal(isOutsideTimeGrid(crossing, day), false);
  assert.deepEqual(layoutDayEvents([early, point, crossing], day).map((item) => item.event.id), [3]);
  assert.equal(layoutDayEvents([crossing], day)[0].top, 0);
  assert.equal(layoutDayEvents([crossing], day)[0].height, HOUR_HEIGHT);
});
