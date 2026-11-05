import type { NoteInput } from '../types/notes';

export function parseNoteTags(value: string): string[] {
  return [...new Set(value.split(',').map(tag => tag.trim().toLocaleLowerCase('pt-BR')).filter(Boolean))];
}
export function validateNoteInput(note: NoteInput): string | null {
  if (!note.title.trim() || note.title.trim().length > 255) return 'Informe um título com até 255 caracteres.';
  if (note.content.length > 100_000) return 'O conteúdo deve ter até 100.000 caracteres.';
  if (note.tags.length > 10 || note.tags.some(tag => tag.length > 32)) return 'Use até 10 tags, com no máximo 32 caracteres cada.';
  return null;
}
export function noteExcerpt(content: string, limit = 140): string {
  const text = content.replace(/\s+/g, ' ').trim();
  const characters = Array.from(text);
  return characters.length > limit ? characters.slice(0, limit).join('').trimEnd() + '…' : text;
}
