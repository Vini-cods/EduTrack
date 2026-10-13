import test from 'node:test';
import assert from 'node:assert/strict';
import { buildStudyBlock, conflictingEvents, filterStudyGoals, formatStudyDuration, isStudyGoal, studyBlockPastDeadline, studyWeekSummary, upcomingStudyBlocks } from '../src/lib/studyPlanner.ts';
import { taskFormPayload, taskFormSchema } from '../src/lib/taskForm.ts';

const now = new Date('2026-10-14T12:00:00');
const goal = (id, overrides = {}) => ({ id, title: 'Revisar árvores', subject_id: 1, subject_name: 'Estruturas de Dados', status: 'pendente', priority: 'media', estimated_hours: 2, due_date: '2026-10-16', ...overrides });
const block = (id, overrides = {}) => ({ id, title: 'Bloco', task_id: 1, subject_id: 1, category: 'estudo', start_datetime: '2026-10-15T19:00:00', end_datetime: '2026-10-15T20:00:00', ...overrides });

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
