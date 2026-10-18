import test from 'node:test';
import assert from 'node:assert/strict';
import { analyticsCsv, consistencyCalendar, csvCell, csvRows, reportDateKey, studyIntensity } from '../src/lib/advancedAnalytics.ts';

test('calendário mantém ordem cronológica e alinha domingo na última coluna sem alterar entrada', () => {
  const days = [{ date: '2026-10-19', studied_minutes: 30 }, { date: '2026-10-18', studied_minutes: 25 }];
  const cells = consistencyCalendar(days);
  assert.equal(cells.length, 8);
  assert.deepEqual(cells.slice(0, 6), Array(6).fill(null));
  assert.equal(cells[6].date, '2026-10-18');
  assert.equal(cells[7].date, '2026-10-19');
  assert.equal(days[0].date, '2026-10-19');
  assert.deepEqual(consistencyCalendar([]), []);
  assert.equal(consistencyCalendar([{ date: '2026-10-12' }])[0].date, '2026-10-12');
});

test('o corte de dias futuros usa o fuso do relatório e atravessa a virada do ano', () => {
  assert.equal(reportDateKey('2027-01-01T01:30:00Z', 'America/Sao_Paulo'), '2026-12-31');
  assert.equal(reportDateKey('2027-01-01T01:30:00Z', 'Asia/Tokyo'), '2027-01-01');
});

test('intensidade distingue zero, pequenas sessões e limite superior relativo', () => {
  assert.equal(studyIntensity(0, 60), 0);
  assert.equal(studyIntensity(5, 60), 1);
  assert.equal(studyIntensity(30, 60), 2);
  assert.equal(studyIntensity(60, 60), 4);
  assert.equal(studyIntensity(90, 60), 4);
  assert.equal(studyIntensity(20, 0), 0);
});

test('CSV preserva acentos, delimitadores, aspas e quebras de linha com BOM UTF-8', () => {
  assert.equal(csvCell('Cálculo; "I"\nIntegral'), '"Cálculo; ""I""\nIntegral"');
  assert.equal(csvCell(null), '""');
  assert.equal(csvRows([['Disciplina', 'Tempo'], ['Álgebra', 25]]), '\uFEFF"Disciplina";"Tempo"\r\n"Álgebra";"25"\r\n');
});

test('CSV neutraliza fórmulas em nomes controlados pelo usuário e preserva números negativos', () => {
  for (const formula of ['=1+1', '+SUM(A1:A2)', '-1+2', '@SUM(A1)', ' \t=HYPERLINK("x")', '\r=1']) assert.ok(csvCell(formula).startsWith('"\''), formula);
  assert.equal(csvCell(-25), '"-25"');
  assert.equal(csvCell('Engenharia de Software'), '"Engenharia de Software"');
});

const report = {
  period: { start_date: '2026-10-12', end_date: '2026-10-18', timezone: 'America/Sao_Paulo' },
  daily: [{ date: '2026-10-12', studied_minutes: 50, planned_study_minutes: 60, scheduled_minutes: 120, unallocated_task_minutes: 15, total_load_minutes: 135, capacity_minutes: 360, load_percent: 37.5, tasks_due: 2, tasks_completed: 1 }],
  subjects: [{ subject_name: '=1+1', studied_minutes: 50, planned_study_minutes: 60, scheduled_minutes: 120, unallocated_task_minutes: 15, total_load_minutes: 135, tasks_due: 2, tasks_completed: 1, completion_rate: 50 }],
};

test('exportação usa apenas os dados e o intervalo selecionados, incluindo fuso e valores absolutos', () => {
  const daily = analyticsCsv(report, 'daily');
  assert.ok(daily.includes('"2026-10-12";"America/Sao_Paulo";"50";"60";"120";"15";"135";"360";"37.5";"2";"1"'));
  assert.equal(daily.split('\r\n').length, 3);
  const subjects = analyticsCsv(report, 'subjects');
  assert.ok(subjects.includes('"2026-10-12";"2026-10-18";"America/Sao_Paulo";"\'=1+1"'));
  assert.equal(subjects.split('\r\n').length, 3);
});

test('comparação exportada mantém base zero sem inventar percentual, e API antiga exporta só cabeçalho', () => {
  const comparison = { available: true, elapsed_days: 2, current_start_date: '2026-10-12', current_end_date: '2026-10-13', previous_start_date: '2026-10-05', previous_end_date: '2026-10-06', current_studied_minutes: 50, previous_studied_minutes: 0, delta_minutes: 50, change_percent: null };
  const csv = analyticsCsv({ ...report, comparison }, 'comparison');
  assert.ok(csv.includes('"Atual";"2026-10-12";"2026-10-13";"America/Sao_Paulo";"2";"50";"50";""'));
  assert.ok(csv.includes('"Anterior equivalente";"2026-10-05";"2026-10-06";"America/Sao_Paulo";"2";"0";"";""'));
  assert.equal(analyticsCsv(report, 'comparison').split('\r\n').length, 2);
  assert.equal(analyticsCsv({ ...report, comparison: { ...comparison, available: false } }, 'comparison').split('\r\n').length, 2);
});
