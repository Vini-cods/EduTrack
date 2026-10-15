import test from 'node:test';
import assert from 'node:assert/strict';
import { buildClassSchedulePayload, classOccurrenceDates, duplicateClassDates, scheduleWeek, validateClassSchedule } from '../src/lib/classSchedule.ts';

const base = { subjectId: 1, days: [0, 2], startDate: '2026-10-12', endDate: '2026-10-21', startTime: '19:00', endTime: '20:40', location: '  Sala 12  ' };
test('grade semanal respeita segunda=0 e período inclusivo', () => {
  assert.deepEqual(classOccurrenceDates(base), ['2026-10-12', '2026-10-14', '2026-10-19', '2026-10-21']);
  const payload = buildClassSchedulePayload({ ...base, days: [2, 0, 2] }, 'Cálculo');
  assert.deepEqual(payload.recurrence.days_of_week, [0, 2]);
  assert.equal(payload.location, 'Sala 12');
  assert.equal(payload.start_datetime, '2026-10-12T19:00:00');
});
test('grade exige dias, datas reais e intervalo de horário positivo no mesmo dia', () => {
  for (const change of [{ days: [] }, { days: [7] }, { startDate: '2026-02-30' }, { endDate: '2026-10-11' }, { startTime: '24:00' }, { endTime: '19:00' }, { endTime: '00:30' }]) {
    assert.ok(validateClassSchedule({ ...base, ...change }));
  }
  assert.ok(validateClassSchedule({ ...base, days: [6], endDate: '2026-10-12' }));
});
test('grade rejeita limites em vez de truncar silenciosamente', () => {
  assert.ok(validateClassSchedule({ ...base, endDate: '2028-10-12' }));
  assert.ok(validateClassSchedule({ ...base, days: [0, 1, 2, 3, 4, 5, 6], endDate: '2027-10-12' }));
});
test('detecção de repetição compara disciplina+data+horário e ignora título diferente', () => {
  const event = { id: 1, category: 'aula', subject_id: 1, title: 'Outro título', start_datetime: '2026-10-12T19:00:00', end_datetime: '2026-10-12T20:40:00' };
  assert.deepEqual(duplicateClassDates(base, [event, { ...event, id: 2 }]), ['2026-10-12']);
  assert.deepEqual(duplicateClassDates(base, [{ ...event, category: 'estudo' }, { ...event, subject_id: 2 }, { ...event, end_datetime: '2026-10-12T20:30:00' }]), []);
});
test('semana inclui domingo e atravessa mês corretamente', () => {
  assert.deepEqual(scheduleWeek(new Date(2026, 10, 1)).map(d => d.getDate()), [26, 27, 28, 29, 30, 31, 1]);
});
