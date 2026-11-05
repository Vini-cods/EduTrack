export interface CompanionPoint { x: number; y: number }
export interface CompanionBounds { minX: number; maxX: number; minY: number; maxY: number }
export interface CompanionViewport { left: number; top: number; width: number; height: number; contentLeft: number; contentTop: number }
export interface CompanionPauses {
  hidden: boolean; dialogOpen: boolean; interacting: boolean; dragging: boolean;
  documentHidden: boolean; reducedMotion: boolean; focusMode: boolean; editing: boolean; userPaused: boolean; manuallyPositioned: boolean;
}

export const MORGANA_RESTORE_EVENT = 'edutrack:morgana:restore';

export function companionSize(viewport: Pick<CompanionViewport, 'width' | 'height'>): number {
  return Math.max(40, Math.min(viewport.width < 640 ? 72 : 92, Math.floor((viewport.height - (viewport.width < 640 ? 68 : 50)) / 1.3)));
}

export function companionFootprint(viewport: Pick<CompanionViewport, 'width'>, size: number) {
  return { width: Math.max(size, viewport.width < 640 ? 88 : 58), height: Math.ceil(size * 1.3) + (viewport.width < 640 ? 48 : 30) };
}

/** Explicit repositioning may use the whole content area below the topbar. */
export function companionManualBounds(viewport: CompanionViewport, size: number): CompanionBounds {
  const margin = 10;
  const { width, height } = companionFootprint(viewport, size);
  const maxX = Math.max(viewport.left + margin, viewport.left + viewport.width - width - margin);
  const minX = Math.min(maxX, Math.max(viewport.left + margin, viewport.contentLeft + margin));
  const maxY = Math.max(viewport.top + margin, viewport.top + viewport.height - height - margin);
  const minY = Math.min(maxY, Math.max(viewport.top + margin, viewport.contentTop + margin));
  return { minX, maxX, minY, maxY };
}

/** Automatic walking remains in a narrow lower strip without moving a manual placement. */
export function companionBounds(viewport: CompanionViewport, size: number): CompanionBounds {
  const bounds = companionManualBounds(viewport, size);
  return { ...bounds, minY: Math.max(bounds.minY, bounds.maxY - 64) };
}

export function companionFits(viewport: CompanionViewport, size: number): boolean {
  const footprint = companionFootprint(viewport, size);
  const availableWidth = viewport.left + viewport.width - Math.max(viewport.left, viewport.contentLeft);
  const availableHeight = viewport.top + viewport.height - Math.max(viewport.top, viewport.contentTop);
  return availableWidth >= footprint.width + 20 && availableHeight >= footprint.height + 20;
}

export function clampCompanion(point: CompanionPoint, bounds: CompanionBounds): CompanionPoint {
  return { x: Math.max(bounds.minX, Math.min(bounds.maxX, point.x)), y: Math.max(bounds.minY, Math.min(bounds.maxY, point.y)) };
}

export function canCompanionWalk(pauses: CompanionPauses): boolean {
  return !Object.values(pauses).some(Boolean);
}

export function stepCompanion(point: CompanionPoint, direction: -1 | 1, distance: number, bounds: CompanionBounds): { point: CompanionPoint; direction: -1 | 1 } {
  const next = clampCompanion({ x: point.x + direction * Math.max(0, distance), y: point.y }, bounds);
  const facing = next.x <= bounds.minX ? 1 : next.x >= bounds.maxX ? -1 : direction;
  return { point: next, direction: facing };
}

const routeTips: Record<string, string> = {
  dashboard: 'Uma tarefa importante e um bloco de foco já são um bom começo. Qual será a sua primeira missão?',
  tasks: 'Prazo, prioridade e tempo estimado ajudam a escolher o próximo passo. Preencha o que você já sabe.',
  calendar: 'Reserve tempo para estudar sem esquecer das aulas e dos intervalos. Um plano possível vale mais que uma agenda lotada.',
  study: 'Planejar e estudar são etapas diferentes. Registre uma sessão quando começar para acompanhar o tempo realizado.',
  subjects: 'Mantenha aulas, conteúdos e avaliações da disciplina organizados para preparar a próxima revisão.',
  materials: 'Um material fica mais útil quando você sabe para qual disciplina e próxima tarefa ele serve.',
  notes: 'Uma dúvida anotada hoje pode orientar a revisão de amanhã. Registre o contexto para encontrar depois.',
  insights: 'Compare períodos equivalentes e confira o histórico disponível. Poucos registros ainda não contam toda a sua rotina.',
  'academic-load': 'Estimativas e capacidade disponível são referências para ajustar o plano, não medidas do seu valor como estudante.',
  settings: 'Ajuste a capacidade semanal e o tempo de foco para a sua rotina real. Você pode mudar o plano depois.',
};

export function companionRouteTip(pathname: string): string {
  return routeTips[pathname.split('/').filter(Boolean)[0]] ?? 'Escolha uma próxima ação pequena e possível. Estou por aqui se quiser conversar sobre seus estudos.';
}
