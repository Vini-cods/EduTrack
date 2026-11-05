import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { shiftCalendarPeriod } from '../src/lib/calendar.ts';

const dateParts = (date) => [date.getFullYear(), date.getMonth() + 1, date.getDate()];

test('navegação mensal limita o dia ao fim do mês sem pular fevereiro', () => {
  assert.deepEqual(dateParts(shiftCalendarPeriod(new Date(2026, 0, 31, 12), 'month', 1)), [2026, 2, 28]);
  assert.deepEqual(dateParts(shiftCalendarPeriod(new Date(2026, 2, 31, 12), 'month', -1)), [2026, 2, 28]);
  assert.deepEqual(dateParts(shiftCalendarPeriod(new Date(2026, 4, 31, 12), 'month', 1)), [2026, 6, 30]);
});

test('fevereiro bissexto mantém o dia 29 e limita os dias seguintes', () => {
  assert.deepEqual(dateParts(shiftCalendarPeriod(new Date(2024, 0, 31, 12), 'month', 1)), [2024, 2, 29]);
  assert.deepEqual(dateParts(shiftCalendarPeriod(new Date(2024, 2, 29, 12), 'month', -1)), [2024, 2, 29]);
});

test('navegação mensal preserva dias existentes e atravessa a virada do ano', () => {
  assert.deepEqual(dateParts(shiftCalendarPeriod(new Date(2026, 0, 15, 12), 'month', 1)), [2026, 2, 15]);
  assert.deepEqual(dateParts(shiftCalendarPeriod(new Date(2026, 11, 31, 12), 'month', 1)), [2027, 1, 31]);
  assert.deepEqual(dateParts(shiftCalendarPeriod(new Date(2026, 0, 31, 12), 'month', -1)), [2025, 12, 31]);
});

test('navegação não altera a data de origem nem o horário local', () => {
  const anchor = new Date(2026, 0, 31, 13, 45, 20, 123);
  const original = anchor.getTime();
  const next = shiftCalendarPeriod(anchor, 'month', 1);
  assert.notEqual(next, anchor);
  assert.equal(anchor.getTime(), original);
  assert.deepEqual([next.getHours(), next.getMinutes(), next.getSeconds(), next.getMilliseconds()], [13, 45, 20, 123]);
});

test('dia intermediário com início de horário de verão não altera o horário do destino', () => {
  const moduleUrl = new URL('../src/lib/calendar.ts', import.meta.url).href;
  const output = execFileSync(process.execPath, ['--experimental-strip-types', '--input-type=module', '-e', `
    import { shiftCalendarPeriod } from ${JSON.stringify(moduleUrl)};
    const anchor = new Date(2023, 8, 15, 0, 30);
    const next = shiftCalendarPeriod(anchor, 'month', 1);
    process.stdout.write(JSON.stringify([next.getFullYear(), next.getMonth() + 1, next.getDate(), next.getHours(), next.getMinutes()]));
  `], { encoding: 'utf8', env: { ...process.env, TZ: 'America/Asuncion' }, stdio: ['ignore', 'pipe', 'pipe'] });
  assert.deepEqual(JSON.parse(output), [2023, 10, 15, 0, 30]);
});

test('visões semanal e diária continuam avançando por datas locais', () => {
  assert.deepEqual(dateParts(shiftCalendarPeriod(new Date(2026, 0, 31, 12), 'week', 1)), [2026, 2, 7]);
  assert.deepEqual(dateParts(shiftCalendarPeriod(new Date(2026, 0, 3, 12), 'week', -1)), [2025, 12, 27]);
  assert.deepEqual(dateParts(shiftCalendarPeriod(new Date(2026, 11, 31, 12), 'day', 1)), [2027, 1, 1]);
  assert.deepEqual(dateParts(shiftCalendarPeriod(new Date(2026, 0, 1, 12), 'day', -1)), [2025, 12, 31]);
});
