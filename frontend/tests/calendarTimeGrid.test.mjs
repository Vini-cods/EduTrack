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

test('eventos curtos adjacentes não cobrem os retângulos uns dos outros', () => {
  const events = [event(1, '2026-10-14T10:00:00', '2026-10-14T10:05:00'),
    event(2, '2026-10-14T10:05:00', '2026-10-14T10:10:00')];
  const original = structuredClone(events);
  const [first, second] = layoutDayEvents(events, day);

  assert.ok(second.top < first.top + first.height, 'as alturas mínimas compartilham pixels');
  assert.notEqual(first.column, second.column, 'os botões precisam de colunas distintas');
  assert.equal(first.totalColumns, 2);
  assert.equal(second.totalColumns, 2);
  assert.deepEqual(events, original, 'o layout não altera os horários reais dos eventos');
});

test('colunas são reutilizadas após o fim visual e uma lacuna restaura a largura', () => {
  const positioned = layoutDayEvents([
    event(1, '2026-10-14T10:00:00', '2026-10-14T10:05:00'),
    event(2, '2026-10-14T10:05:00', '2026-10-14T10:10:00'),
    event(3, '2026-10-14T10:30:00', '2026-10-14T10:35:00'),
    event(4, '2026-10-14T11:00:00', '2026-10-14T11:05:00'),
  ], day);
  const [first, second, third, fourth] = positioned;

  assert.ok(third.top >= first.top + first.height);
  assert.ok(third.top < second.top + second.height);
  assert.equal(third.column, first.column);
  assert.notEqual(third.column, second.column);
  assert.deepEqual(positioned.map((item) => item.totalColumns), [2, 2, 2, 1]);
  assert.equal(fourth.column, 0);
});

test('eventos de meia hora exatamente adjacentes continuam usando largura integral', () => {
  const positioned = layoutDayEvents([
    event(1, '2026-10-14T10:00:00', '2026-10-14T10:30:00'),
    event(2, '2026-10-14T10:30:00', '2026-10-14T11:00:00'),
  ], day);

  assert.equal(positioned[0].top + positioned[0].height, positioned[1].top);
  assert.deepEqual(positioned.map((item) => [item.column, item.totalColumns]), [[0, 1], [0, 1]]);
});
