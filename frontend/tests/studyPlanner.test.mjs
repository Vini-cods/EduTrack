import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { buildStudyBlock, conflictingEvents, filterStudyGoals, formatStudyDuration, isStudyGoal, studyBlockPastDeadline, studyWeekSummary, upcomingStudyBlocks } from '../src/lib/studyPlanner.ts';
import { taskFormPayload, taskFormSchema } from '../src/lib/taskForm.ts';

const now = new Date('2026-10-14T12:00:00');
const goal = (id, overrides = {}) => ({ id, title: 'Revisar árvores', subject_id: 1, subject_name: 'Estruturas de Dados', status: 'pendente', priority: 'media', estimated_hours: 2, due_date: '2026-10-16', ...overrides });
const block = (id, overrides = {}) => ({ id, title: 'Bloco', task_id: 1, subject_id: 1, category: 'estudo', start_datetime: '2026-10-15T19:00:00', end_datetime: '2026-10-15T20:00:00', ...overrides });

function plannerInTimezone(timezone, source) {
  const moduleUrl = new URL('../src/lib/studyPlanner.ts', import.meta.url).href;
  const output = execFileSync(process.execPath, ['--experimental-strip-types', '--input-type=module', '-e', `
    import { buildStudyBlock, conflictingEvents, studyWeekSummary } from ${JSON.stringify(moduleUrl)};
    process.stdout.write(JSON.stringify((() => { ${source} })()));
  `], { encoding: 'utf8', env: { ...process.env, TZ: timezone }, stdio: ['ignore', 'pipe', 'pipe'] });
  return JSON.parse(output);
}

function buildBlockInTimezone(timezone, date, time, minutes, summaryAt, extraEvents = []) {
  return plannerInTimezone(timezone, `
    try {
      const payload = buildStudyBlock({ id: 1, title: 'Revisar árvores', subject_id: 1 }, ${JSON.stringify(date)}, ${JSON.stringify(time)}, ${minutes});
      const summary = ${JSON.stringify(summaryAt) ?? 'undefined'} ? studyWeekSummary([], [payload, ...${JSON.stringify(extraEvents)}], [], new Date(${JSON.stringify(summaryAt) ?? 'undefined'})) : undefined;
      return { ...payload, summary };
    } catch (cause) { return { error: cause.message }; }
  `);
}

test('objetivos exigem estimativa positiva e finita', () => {
  for (const estimated_hours of [null, undefined, 0, -1, Infinity, NaN]) assert.equal(isStudyGoal(goal(1, { estimated_hours })), false);
  assert.equal(isStudyGoal(goal(1, { estimated_hours: 0.25 })), true);
});

test('próximos blocos preservam múltiplas ocorrências e excluem passado e outras categorias', () => {
  const events = [block(2, { start_datetime: '2026-10-16T19:00:00', end_datetime: '2026-10-16T20:00:00' }), block(1),
    block(3, { start_datetime: '2026-10-13T19:00:00', end_datetime: '2026-10-13T20:00:00' }), block(4, { category: 'prova' }),
    block(5, { start_datetime: '2026-10-14T11:30:00', end_datetime: '2026-10-14T12:30:00' })];
  assert.deepEqual(upcomingStudyBlocks(events, now).map((event) => event.id), [5, 1, 2]);
});

test('eventos passados e provas não fazem objetivo aparecer como agendado', () => {
  const events = [block(1, { start_datetime: '2026-10-13T19:00:00', end_datetime: '2026-10-13T20:00:00' }), block(2, { category: 'prova' }), block(3, { task_id: 2 })];
  assert.deepEqual(filterStudyGoals([goal(1), goal(2), goal(3, { status: 'concluida' })], events, 'unscheduled', '', 'priority', now).map((task) => task.id), [1]);
});

test('filtros respeitam dia local, disciplina, conclusão e semana segunda-domingo', () => {
  const tasks = [goal(1, { due_date: '2026-10-13' }), goal(2, { due_date: '2026-10-14' }), goal(3, { due_date: '2026-10-18', subject_id: 2 }),
    goal(4, { due_date: '2026-10-19' }), goal(5, { due_date: null }), goal(6, { status: 'concluida', due_date: '2026-10-12' })];
  assert.deepEqual(filterStudyGoals(tasks, [], 'overdue', '', 'deadline', now).map((task) => task.id), [1]);
  assert.deepEqual(filterStudyGoals(tasks, [], 'week', '', 'deadline', now).map((task) => task.id), [1, 2, 3]);
  assert.deepEqual(filterStudyGoals(tasks, [], 'all', '2', 'priority', now).map((task) => task.id), [3]);
  assert.deepEqual(filterStudyGoals(tasks, [], 'completed', '', 'priority', now).map((task) => task.id), [6]);
});

test('ordenação por prioridade usa prazo como desempate e mantém tarefas sem prazo no fim', () => {
  const tasks = [goal(1, { due_date: null }), goal(2), goal(3, { priority: 'urgente', due_date: '2026-10-18' })];
  assert.deepEqual(filterStudyGoals(tasks, [], 'active', '', 'priority', now).map((task) => task.id), [3, 2, 1]);
  assert.deepEqual(filterStudyGoals(tasks, [], 'active', '', 'deadline', now).map((task) => task.id), [2, 3, 1]);
});

test('resumo mantém estimativa, agenda e execução distintas e recorta blocos na fronteira semanal', () => {
  const events = [block(1), block(2, { start_datetime: '2026-10-11T23:30:00', end_datetime: '2026-10-12T00:30:00' }),
    block(3, { start_datetime: '2026-10-18T23:30:00', end_datetime: '2026-10-19T01:00:00' }), block(4, { category: 'aula' })];
  const sessions = [{ status: 'concluida', started_at: '2026-10-14T18:00:00', elapsed_seconds: 1500 },
    { status: 'em_andamento', started_at: '2026-10-14T18:00:00Z', elapsed_seconds: 700 },
    { status: 'concluida', started_at: '2026-10-10T18:00:00Z', elapsed_seconds: 3000 }];
  assert.deepEqual(studyWeekSummary([goal(1), goal(2, { status: 'concluida' })], events, sessions, now),
    { count: 1, estimatedSeconds: 7200, scheduledSeconds: 7200, studiedSeconds: 1500 });
});

test('blocos podem atravessar meia-noite sem alterar estimativa ou status do objetivo', () => {
  const task = goal(1);
  const payload = buildStudyBlock(task, '2026-10-14', '23:30', 90);
  assert.equal(payload.end_datetime, '2026-10-15T01:00');
  assert.equal(payload.task_id, 1);
  assert.equal(task.estimated_hours, 2);
  assert.equal(task.status, 'pendente');
  assert.throws(() => buildStudyBlock(task, '', '19:00', 60));
  assert.throws(() => buildStudyBlock(task, '2026-10-14', '19:00', 0));
  assert.throws(() => buildStudyBlock(task, '2026-10-14', '19:00', Infinity));
});

test('fim do horário de verão não transforma um bloco de 60 minutos em intervalo zero', () => {
  const payload = buildBlockInTimezone('America/New_York', '2026-11-01', '01:30', 60);
  assert.equal(payload.start_datetime, '2026-11-01T01:30');
  assert.equal(payload.end_datetime, '2026-11-01T02:30');
});

test('início do horário de verão preserva a duração civil solicitada', () => {
  const payload = buildBlockInTimezone('America/New_York', '2026-03-08', '00:30', 180);
  assert.equal(payload.start_datetime, '2026-03-08T00:30');
  assert.equal(payload.end_datetime, '2026-03-08T03:30');
});

test('aritmética civil mantém horários comuns e a virada de ano sem enviar offset', () => {
  const normal = buildBlockInTimezone('America/Sao_Paulo', '2026-10-30', '19:00', 90);
  assert.equal(normal.start_datetime, '2026-10-30T19:00');
  assert.equal(normal.end_datetime, '2026-10-30T20:30');
  const overnight = buildBlockInTimezone('America/New_York', '2026-12-31', '23:30', 90);
  assert.equal(overnight.start_datetime, '2026-12-31T23:30');
  assert.equal(overnight.end_datetime, '2027-01-01T01:00');
});

test('resumo semanal soma a duração civil na mudança de horário de verão', () => {
  const fall = buildBlockInTimezone('America/New_York', '2026-11-01', '01:30', 60, '2026-11-01T12:00');
  assert.equal(fall.summary.scheduledSeconds, 3600);
  const spring = buildBlockInTimezone('America/New_York', '2026-03-08', '00:30', 180, '2026-03-08T12:00');
  assert.equal(spring.summary.scheduledSeconds, 10800);
});

test('recorte semanal da agenda mantém meia-noite civil após mudança de fuso', () => {
  const extraEvents = [block(2, { start_datetime: '2026-11-01T23:30:00', end_datetime: '2026-11-02T01:00:00' }),
    block(3, { start_datetime: '2026-10-25T23:30:00', end_datetime: '2026-10-26T00:30:00' })];
  const result = buildBlockInTimezone('America/New_York', '2026-11-01', '01:30', 60, '2026-11-01T12:00', extraEvents);
  assert.equal(result.summary.scheduledSeconds, 7200);
});

test('blocos rejeitam início ou fim local inexistente em vez de deslocar o horário', () => {
  const invalidStart = buildBlockInTimezone('America/New_York', '2026-03-08', '02:30', 60);
  assert.match(invalidStart.error, /início ou fim não existe no fuso local/);
  const invalidEnd = buildBlockInTimezone('America/New_York', '2026-03-08', '01:30', 60);
  assert.match(invalidEnd.error, /início ou fim não existe no fuso local/);
});

test('blocos rejeitam datas normalizadas, anos fora da API e durações fracionadas', () => {
  for (const date of ['2026-02-29', '2026-04-31', '0000-01-01', '10000-01-01']) {
    assert.throws(() => buildStudyBlock(goal(1), date, '19:00', 60), undefined, date);
  }
  for (const time of ['24:00', '25:00', '19:00Z', '19:00:30']) {
    assert.throws(() => buildStudyBlock(goal(1), '2026-10-14', time, 60), undefined, time);
  }
  assert.throws(() => buildStudyBlock(goal(1), '2026-10-14', '19:00', 5.5));
  assert.throws(() => buildStudyBlock(goal(1), '9999-12-31', '23:55', 5));
});

test('blocos preservam anos 1 a 99 e calendário bissexto sem o ajuste do construtor Date', () => {
  const early = buildBlockInTimezone('UTC', '0001-01-01', '19:00', 5);
  assert.equal(early.start_datetime, '0001-01-01T19:00');
  assert.equal(early.end_datetime, '0001-01-01T19:05');
  const leap = buildBlockInTimezone('UTC', '0096-02-29', '23:55', 5);
  assert.equal(leap.end_datetime, '0096-03-01T00:00');
});

test('resumo aceita offsets e Z na hora civil exibida, preservando segundos do calendário', () => {
  const events = [block(1, { start_datetime: '2026-11-01T01:30:00-04:00', end_datetime: '2026-11-01T02:30:00-05:00' }),
    block(2, { start_datetime: '2026-11-02T04:30:00Z', end_datetime: '2026-11-02T05:30:00Z' }),
    block(3, { start_datetime: '2026-10-27T19:00:30.500', end_datetime: '2026-10-27T19:01:00.750' })];
  const result = plannerInTimezone('America/New_York', `return studyWeekSummary([], ${JSON.stringify(events)}, [], new Date('2026-11-01T12:00'));`);
  assert.equal(result.scheduledSeconds, 5430.25);
});

test('recorte civil começa à meia-noite mesmo quando o domingo perde sua meia-noite local', () => {
  const events = [block(1, { start_datetime: '2018-10-29T00:00', end_datetime: '2018-10-29T00:30' }),
    block(2, { start_datetime: '2018-11-04T23:30', end_datetime: '2018-11-05T00:30' })];
  const result = plannerInTimezone('America/Sao_Paulo', `return ${JSON.stringify(events)}.map(event => studyWeekSummary([], [event], [], new Date('2018-11-04T12:00')).scheduledSeconds);`);
  assert.deepEqual(result, [1800, 1800]);
});

test('execução mantém instantes UTC e fronteiras locais da semana na mudança de horário', () => {
  const sessions = [
    { status: 'concluida', started_at: '2026-10-26T03:59:00Z', elapsed_seconds: 999 },
    { status: 'concluida', started_at: '2026-10-26T04:00:00Z', elapsed_seconds: 1200 },
    { status: 'concluida', started_at: '2026-11-02T04:30:00Z', elapsed_seconds: 1800 },
    { status: 'concluida', started_at: '2026-11-02T05:00:00Z', elapsed_seconds: 400 },
    { status: 'concluida', started_at: '2026-11-01T18:00:00', elapsed_seconds: 600 },
    { status: 'concluida', started_at: '2026-11-01T19:00:00-05:00', elapsed_seconds: 900 },
    { status: 'em_andamento', started_at: '2026-11-01T18:00:00Z', elapsed_seconds: 500 },
  ];
  const result = plannerInTimezone('America/New_York', `return studyWeekSummary([], [], ${JSON.stringify(sessions)}, new Date('2026-11-01T12:00'));`);
  assert.equal(result.studiedSeconds, 4500);
});

test('conflitos na hora repetida usam o intervalo civil exibido, com adjacência e pontos', () => {
  const events = [block(1, { start_datetime: '2026-11-01T01:00:00-05:00', end_datetime: '2026-11-01T01:15:00-05:00' }),
    block(2, { start_datetime: '2026-11-01T01:45:00-04:00', end_datetime: '2026-11-01T02:00:00-05:00' }),
    block(3, { start_datetime: '2026-11-01T02:30', end_datetime: '2026-11-01T03:30' }),
    block(4, { start_datetime: '2026-11-01T01:30', end_datetime: null }),
    block(5, { start_datetime: '2026-11-01T02:30', end_datetime: null })];
  const result = plannerInTimezone('America/New_York', `return conflictingEvents(${JSON.stringify(events)}, '2026-11-01T01:30', '2026-11-01T02:30').map(event => event.id);`);
  assert.deepEqual(result, [2, 4]);
});

test('conflitos detectam contenção e eventos pontuais sem marcar blocos adjacentes', () => {
  const events = [block(1), block(2, { start_datetime: '2026-10-15T18:00:00', end_datetime: '2026-10-15T19:00:00' }),
    block(3, { start_datetime: '2026-10-15T20:00:00', end_datetime: '2026-10-15T21:00:00' }),
    block(4, { start_datetime: '2026-10-15T19:30:00', end_datetime: null })];
  assert.deepEqual(conflictingEvents(events, '2026-10-15T19:00', '2026-10-15T20:00').map((event) => event.id), [1, 4]);
});

test('durações legíveis não usam casas decimais de horas', () => {
  assert.equal(formatStudyDuration(0), '0min');
  assert.equal(formatStudyDuration(5400), '1h 30min');
  assert.equal(formatStudyDuration(7200), '2h');
});

test('formulário de objetivo exige estimativa e disciplina sem restringir edição de tarefas comuns', () => {
  const values = { title: '  Revisar árvores  ', description: '', subject_id: '1', due_date: '', priority: 'media', status: 'pendente', estimated_hours: '' };
  assert.equal(taskFormSchema(true).safeParse(values).success, false);
  assert.equal(taskFormSchema(false).safeParse(values).success, true);
  assert.equal(taskFormSchema(true).safeParse({ ...values, estimated_hours: '1.5', title: '  ' }).success, false);
  assert.equal(taskFormSchema(true).safeParse({ ...values, estimated_hours: '1.5', subject_id: '' }).success, false);
  for (const estimated_hours of ['0', '-1', 'Infinity', 'NaN']) assert.equal(taskFormSchema(true).safeParse({ ...values, estimated_hours }).success, false);
  const parsed = taskFormSchema(true).parse({ ...values, estimated_hours: '1.5' });
  assert.equal(parsed.title, 'Revisar árvores');
  assert.equal(taskFormPayload(parsed).estimated_hours, 1.5);
  assert.equal(taskFormPayload(parsed).due_date, null);
});

test('aviso de prazo usa fim do bloco, inclusive ao atravessar meia-noite', () => {
  assert.equal(studyBlockPastDeadline('2026-10-14', '2026-10-15T00:30'), true);
  assert.equal(studyBlockPastDeadline('2026-10-14', '2026-10-15T00:00'), false);
  assert.equal(studyBlockPastDeadline('2026-10-14', '2026-10-14T23:30'), false);
  assert.equal(studyBlockPastDeadline(null, '2026-10-15T00:30'), false);
});
