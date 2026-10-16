import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCommandSearchIndex, matchesCommandQuery, normalizeSearchText, searchCommandIndex, SEARCH_RESULTS_PER_KIND } from '../src/lib/commandSearch.ts';

const subject = { id: 1, name: 'Cálculo', description: 'Limites e derivadas', professor: 'Márcia' };
const task = { id: 2, title: 'Lista de revisão', description: 'Funções e continuidade', subject_id: 1, subject_name: 'Cálculo', status: 'pendente' };
const note = { id: 3, title: 'Dúvidas da aula', content: 'Integração por partes\ncom aplicações', tags: ['revisão', 'álgebra'], subject_id: 1, task_id: null, subject_name: 'Cálculo' };
const material = { id: 4, title: 'Livro de exercícios', description: 'Referência sobre integração', url: 'https://exemplo.org/curso', subject_id: 1, subject_name: 'Cálculo' };
const data = { subjects: [subject], tasks: [task], notes: [note], materials: [material] };
const find = query => searchCommandIndex(buildCommandSearchIndex(data), query);

test('search ignores case/accents and accepts all query terms across different fields', () => {
  assert.equal(normalizeSearchText('  CÁLCULO\n Aplicações  '), 'calculo aplicacoes');
  assert.deepEqual(find('CALCULO partes').map(item => item.id), ['note-3']);
  assert.deepEqual(find('continuidade revisao').map(item => item.id), ['task-2']);
  assert.deepEqual(find('referencia INTEGRACAO').map(item => item.id), ['material-4']);
  assert.equal(find('calculo inexistente').length, 0);
});

test('notes are searchable by full content and hashtags without treating academic grades as notes', () => {
  assert.deepEqual(find('#ALGEBRA').map(item => item.id), ['note-3']);
  assert.deepEqual(find('aplicacoes').map(item => item.id), ['note-3']);
  assert.equal(find('nota final').length, 0);
  const long = { ...note, content: 'a'.repeat(99000) + ' termo-no-final' };
  const index = buildCommandSearchIndex({ ...data, notes: [long] });
  assert.equal(searchCommandIndex(index, 'termo-no-final')[0].id, 'note-3');
});

test('subject professor and material URL are useful search fields', () => {
  assert.deepEqual(find('marcia').map(item => item.id), ['subject-1']);
  assert.deepEqual(find('exemplo.org').map(item => item.id), ['material-4']);
});

test('results deep link to each existing entity and retain academic context', () => {
  const all = find('calculo');
  assert.deepEqual(all.map(item => item.path), ['/subjects/1', '/tasks?highlight=2', '/notes?highlight=3', '/materials?highlight=4']);
  assert.equal(all.find(item => item.kind === 'note').hint, 'Cálculo');
  assert.match(all.find(item => item.kind === 'note').description, /#revisão/);
});

test('missing joined names fall back to subject/task context and free notes stay findable', () => {
  const index = buildCommandSearchIndex({
    ...data,
    notes: [
      { ...note, subject_name: null },
      { ...note, id: 5, subject_id: null, subject_name: null, task_id: 2 },
      { ...note, id: 6, subject_id: null, subject_name: null },
    ],
  });
  assert.deepEqual(searchCommandIndex(index, 'duvidas').map(item => item.hint), ['Cálculo', 'Lista de revisão', 'Nota livre']);
});

test('one entity appears once even if an API snapshot contains duplicate IDs', () => {
  const index = buildCommandSearchIndex({ ...data, notes: [note, note], materials: [material, material] });
  assert.deepEqual(searchCommandIndex(index, 'integracao').map(item => item.id), ['note-3', 'material-4']);
});

test('title matches rank above content matches, with five results per type and stable groups', () => {
  const notes = Array.from({ length: 12 }, (_, i) => ({ ...note, id: i + 10, title: 'Registro ' + i, content: 'revisão', tags: [] }));
  notes.push({ ...note, id: 99, title: 'Revisão', content: '', tags: [] });
  const materials = Array.from({ length: 12 }, (_, i) => ({ ...material, id: i + 20, title: 'Revisão ' + i }));
  const index = buildCommandSearchIndex({ ...data, notes, materials });
  const results = searchCommandIndex(index, 'revisao');
  assert.equal(results.filter(item => item.kind === 'note').length, SEARCH_RESULTS_PER_KIND);
  assert.equal(results.filter(item => item.kind === 'material').length, SEARCH_RESULTS_PER_KIND);
  assert.equal(results.find(item => item.kind === 'note').id, 'note-99');
  assert.deepEqual(results.map(item => item.kind), ['task', ...Array(5).fill('note'), ...Array(5).fill('material')]);
  assert.equal(notes[0].id, 10);
});

test('empty or hashtag-only query does not expose all saved content', () => {
  assert.deepEqual(find('  '), []);
  assert.deepEqual(find('#'), []);
  assert.equal(matchesCommandQuery('Ir para o Dashboard', 'DASHBOARD'), true);
  assert.equal(matchesCommandQuery('Abrir calendário', 'abrir calendario'), true);
  assert.equal(matchesCommandQuery('Abrir calendário', 'notas'), false);
});

test('excerpts collapse whitespace, preserve plain text and bound visible content', () => {
  const index = buildCommandSearchIndex({ ...data, notes: [{ ...note, content: '<script>texto</script>\n' + 'detalhe '.repeat(100), tags: [] }] });
  const result = searchCommandIndex(index, '<script>')[0];
  assert.ok(result.description.length <= 111);
  assert.match(result.description, /^<script>texto<\/script> detalhe/);
  assert.ok(result.description.endsWith('…'));
});
