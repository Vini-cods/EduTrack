import type { MaterialWithSubject, Subject, TaskWithSubject } from '../types';
import type { Note } from '../types/notes';
import type { NoteSearchItem } from '../api/notes';
import { noteExcerpt } from './notes.ts';

export type SearchKind = 'subject' | 'task' | 'note' | 'material';

export interface CommandSearchResult {
  id: string;
  kind: SearchKind;
  label: string;
  hint: string;
  description: string;
  path: string;
}

export interface CommandSearchEntry extends CommandSearchResult {
  searchText: string;
  searchTitle: string;
  searchTags: string;
}

export interface CommandSearchData {
  subjects: readonly Subject[];
  tasks: readonly TaskWithSubject[];
  notes: readonly Note[];
  materials: readonly MaterialWithSubject[];
}

export const MAX_SEARCH_QUERY_LENGTH = 200;
export const SEARCH_RESULTS_PER_KIND = 5;

/** Server results are already matched/ranked across full bodies; never re-filter excerpts. */
export function noteSearchResults(notes: readonly NoteSearchItem[]): CommandSearchResult[] {
  return notes.map(note => ({ id: 'note-' + note.id, kind: 'note', label: note.title, hint: note.subject_name || 'Nota livre',
    description: excerpt([note.tags.map(tag => '#' + tag).join(' '), note.excerpt].filter(Boolean).join(' · ')), path: '/notes?highlight=' + note.id }));
}

export function materialSearchResults(materials: readonly MaterialWithSubject[]): CommandSearchResult[] {
  return materials.map(material => ({ id: 'material-' + material.id, kind: 'material', label: material.title, hint: material.subject_name || 'Material',
    description: excerpt(material.description || material.url || ''), path: '/materials?highlight=' + material.id }));
}

export function normalizeSearchText(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').replace(/\s+/g, ' ').trim();
}

function queryTokens(query: string): string[] {
  return normalizeSearchText(query.slice(0, MAX_SEARCH_QUERY_LENGTH)).split(' ').map(token => token.replace(/^#/, '')).filter(Boolean);
}

export function matchesCommandQuery(text: string, query: string): boolean {
  const normalized = normalizeSearchText(text);
  return queryTokens(query).every(token => normalized.includes(token));
}

function excerpt(value: string, limit = 110): string {
  return noteExcerpt(value, limit);
}

/** Normalize content only when the API snapshot changes, rather than on each keystroke. */
export function buildCommandSearchIndex(data: CommandSearchData): CommandSearchEntry[] {
  const entries = new Map<string, CommandSearchEntry>();
  const subjectNames = new Map(data.subjects.map(subject => [subject.id, subject.name]));
  const taskNames = new Map(data.tasks.map(task => [task.id, task.title]));
  const add = (result: CommandSearchResult, content: string, tags = '') => {
    if (entries.has(result.id)) return;
    entries.set(result.id, {
      ...result,
      searchTitle: normalizeSearchText(result.label),
      searchTags: normalizeSearchText(tags),
      searchText: normalizeSearchText([result.label, result.hint, content, tags].join(' ')),
    });
  };
  for (const subject of data.subjects) {
    add({ id: 'subject-' + subject.id, kind: 'subject', label: subject.name, hint: 'Disciplina', description: excerpt(subject.description || subject.professor || ''), path: '/subjects/' + subject.id }, [subject.description, subject.professor].filter(Boolean).join(' '));
  }
  for (const task of data.tasks) {
    const subject = task.subject_name || subjectNames.get(task.subject_id) || 'Tarefa';
    add({ id: 'task-' + task.id, kind: 'task', label: task.title, hint: subject, description: excerpt(task.description || ''), path: '/tasks?highlight=' + task.id }, task.description || '');
  }
  for (const note of data.notes) {
    const subject = note.subject_name || (note.subject_id ? subjectNames.get(note.subject_id) : undefined);
    const context = subject || (note.task_id ? taskNames.get(note.task_id) : undefined) || 'Nota livre';
    const tags = note.tags.map(tag => '#' + tag).join(' ');
    add({ id: 'note-' + note.id, kind: 'note', label: note.title, hint: context, description: excerpt([tags, note.content].filter(Boolean).join(' · ')), path: '/notes?highlight=' + note.id }, note.content, note.tags.join(' '));
  }
  for (const material of data.materials) {
    const subject = material.subject_name || subjectNames.get(material.subject_id) || 'Material';
    add({ id: 'material-' + material.id, kind: 'material', label: material.title, hint: subject, description: excerpt(material.description || material.url || ''), path: '/materials?highlight=' + material.id }, [material.description, material.url].filter(Boolean).join(' '));
  }
  return [...entries.values()];
}

/** Keep groups predictable and prioritize title/tag matches within each group. */
export function searchCommandIndex(index: readonly CommandSearchEntry[], query: string): CommandSearchResult[] {
  const tokens = queryTokens(query);
  if (tokens.length === 0) return [];
  const result: CommandSearchResult[] = [];
  for (const kind of ['subject', 'task', 'note', 'material'] as const) {
    const matches = index.filter(entry => entry.kind === kind && tokens.every(token => entry.searchText.includes(token)));
    const relevance = (entry: CommandSearchEntry) => {
      if (entry.searchTitle === tokens.join(' ')) return 0;
      if (tokens.every(token => entry.searchTitle.includes(token))) return 1;
      if (tokens.every(token => entry.searchTags.includes(token))) return 2;
      if (tokens.some(token => entry.searchTitle.includes(token))) return 3;
      return 4;
    };
    matches.sort((left, right) => relevance(left) - relevance(right));
    result.push(...matches.slice(0, SEARCH_RESULTS_PER_KIND));
  }
  return result;
}
