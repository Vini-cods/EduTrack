import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Plus, ExternalLink, Pencil, Trash2, FolderOpen } from 'lucide-react';
import apiClient from '../api/client';
import { materialsApi } from '../api/materials';
import { Pagination } from '../components/ui/Pagination';
import type { Material, MaterialWithSubject, MaterialCategory, MaterialStatus, Subject } from '../types';
import { SectionHeader } from '../components/ui/SectionHeader';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Tabs } from '../components/ui/Tabs';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { StatCardSkeleton } from '../components/ui/Skeleton';
import { CATEGORY_META, MATERIAL_CATEGORIES, STATUS_META, MATERIAL_STATUSES, normalizeMaterialTitle, validateMaterialTitle } from '../lib/materials';

type StatusTab = 'todos' | MaterialStatus;

interface MaterialFormValues {
  title: string;
  subject_id: string;
  category: MaterialCategory;
  url: string;
  description: string;
}

export const Materials: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [materials, setMaterials] = useState<MaterialWithSubject[] | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [statusTab, setStatusTab] = useState<StatusTab>('todos');
  const [subjectFilter, setSubjectFilter] = useState('todas');
  const [categoryFilter, setCategoryFilter] = useState('todas');
  const [query, setQuery] = useState('');
  const [pagination, setPagination] = useState({ scope: '', index: 0 });
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<MaterialWithSubject | null>(null);
  const [highlightedId, setHighlightedId] = useState<number | null>(null);
  const scope = [query, subjectFilter, categoryFilter, statusTab, highlightedId].join('|');
  const page = pagination.scope === scope ? pagination.index : 0;
  const setPage = (index: number) => setPagination({ scope, index });
  const activeScope = useRef(scope);
  activeScope.current = scope;
  useEffect(() => { setPagination({ scope, index: 0 }); }, [scope]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [subjectsLoading, setSubjectsLoading] = useState(true);
  const [subjectsError, setSubjectsError] = useState('');
  const [subjectsRevision, setSubjectsRevision] = useState(0);
  const [busyIds, setBusyIds] = useState<Set<number>>(new Set());
  const materialRequest = useRef<AbortController | null>(null);
  const mutationLocks = useRef(new Set<number>());
  const mounted = useRef(false);
  const materialListRef = useRef<HTMLDivElement>(null);

  const loadMaterials = useCallback(async () => {
    if (activeScope.current !== scope) return;
    materialRequest.current?.abort();
    const controller = new AbortController();
    materialRequest.current = controller;
    setLoading(true);
    setLoadError('');
    try {
      const response = await materialsApi.page({ q: query || undefined, subject_id: subjectFilter === 'todas' ? undefined : subjectFilter,
        category: categoryFilter === 'todas' ? undefined : categoryFilter as MaterialCategory,
        status: statusTab === 'todos' ? undefined : statusTab, material_id: highlightedId ?? undefined, offset: page * 20 }, controller.signal);
      if (!controller.signal.aborted && activeScope.current === scope) {
        if (page > 0 && response.items.length === 0) { setPagination({ scope, index: Math.max(0, Math.ceil(response.total / 20) - 1) }); return; }
        setMaterials(response.items); setTotal(response.total); setCounts(response.status_counts);
      }
    } catch {
      if (!controller.signal.aborted) setLoadError('Não foi possível carregar os materiais. Tente novamente.');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [query, subjectFilter, categoryFilter, statusTab, highlightedId, page, scope]);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; materialRequest.current?.abort(); };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void loadMaterials(), query ? 250 : 0);
    return () => { clearTimeout(timer); materialRequest.current?.abort(); };
  }, [loadMaterials, query]);

  useEffect(() => {
    const controller = new AbortController();
    setSubjectsLoading(true);
    setSubjectsError('');
    apiClient.get<Subject[]>('/subjects/', { signal: controller.signal, timeout: 15_000 })
      .then(response => { if (!controller.signal.aborted) setSubjects(response.data); })
      .catch(() => { if (!controller.signal.aborted) setSubjectsError('Não foi possível carregar as disciplinas para os filtros e o formulário.'); })
      .finally(() => { if (!controller.signal.aborted) setSubjectsLoading(false); });
    return () => controller.abort();
  }, [subjectsRevision]);

  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    const subjectIdParam = searchParams.get('subject_id');
    if (subjectIdParam) { setSubjectFilter(subjectIdParam); next.delete('subject_id'); }
    if (searchParams.get('new') === '1') {
      setEditing(null);
      setModalOpen(true);
      next.delete('new');
    }
    const id = Number(searchParams.get('highlight'));
    if (Number.isSafeInteger(id) && id > 0) {
      setHighlightedId(id);
      setStatusTab('todos');
      setSubjectFilter('todas');
      setCategoryFilter('todas');
    }
    if (next.toString() !== searchParams.toString()) setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const onDelete = async (id: number) => {
    if (mutationLocks.current.has(id)) return;
    if (!window.confirm('Excluir este material?')) return;
    mutationLocks.current.add(id);
    setBusyIds(new Set(mutationLocks.current));
    materialRequest.current?.abort();
    setLoading(false);
    try {
      await apiClient.delete(`/materials/${id}`);
      if (mounted.current) {
        setMaterials(previous => previous?.filter(material => material.id !== id) ?? null);
        void loadMaterials();
        toast.success('Material excluído.');
      }
    } catch {
      if (mounted.current) toast.error('Não foi possível excluir. O material foi mantido.');
    } finally {
      mutationLocks.current.delete(id);
      if (mounted.current) setBusyIds(new Set(mutationLocks.current));
    }
  };

  const onChangeStatus = async (id: number, status: MaterialStatus) => {
    if (mutationLocks.current.has(id)) return;
    mutationLocks.current.add(id);
    setBusyIds(new Set(mutationLocks.current));
    materialRequest.current?.abort();
    setLoading(false);
    try {
      const response = await apiClient.patch<Material>(`/materials/${id}/status`, { status });
      if (mounted.current) {
        setMaterials(previous => previous?.map(material => material.id === id ? { ...material, ...response.data } : material) ?? null);
        void loadMaterials();
        toast.success('Status atualizado.');
      }
    } catch {
      if (mounted.current) toast.error('Não foi possível atualizar. O status anterior foi mantido.');
    } finally {
      mutationLocks.current.delete(id);
      if (mounted.current) setBusyIds(new Set(mutationLocks.current));
    }
  };

  const filtered = materials ?? [];

  useEffect(() => {
    const id = Number(searchParams.get('highlight'));
    if (loading || !Number.isSafeInteger(id) || id <= 0) return;
    const target = materialListRef.current?.querySelector<HTMLElement>(`[data-material-id="${id}"]`);
    if (!target) return;
    target.focus({ preventScroll: true });
    target.scrollIntoView({ block: 'nearest', behavior: 'instant' });
    const next = new URLSearchParams(searchParams); next.delete('highlight');
    setSearchParams(next, { replace: true });
  }, [loading, filtered, searchParams, setSearchParams]);

  const isUnfiltered = !query && highlightedId === null && statusTab === 'todos' && subjectFilter === 'todas' && categoryFilter === 'todas';

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto" aria-busy={loading}>
      <SectionHeader
        title="Materiais"
        description="PDFs, links, vídeos e outros recursos organizados por disciplina."
        action={
          <Button
            icon={<Plus size={16} />}
            disabled={subjectsLoading || subjects.length === 0 || busyIds.size > 0}
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            Novo material
          </Button>
        }
      />

      {loadError && <div role="alert" className="mt-5 border border-danger/30 bg-danger-soft rounded-md p-4 text-sm text-ink flex flex-wrap items-center gap-3"><p className="flex-1 min-w-48">{loadError}{materials !== null && ' Os materiais já carregados continuam disponíveis.'}</p><Button variant="outline" size="sm" loading={loading} disabled={busyIds.size > 0} onClick={() => void loadMaterials()}>Tentar novamente</Button></div>}
      {subjectsError && <div role="alert" className="mt-5 border border-warning/30 bg-warning-soft rounded-md p-4 text-sm text-ink flex flex-wrap items-center gap-3"><p className="flex-1 min-w-48">{subjectsError}</p><Button variant="outline" size="sm" loading={subjectsLoading} onClick={() => setSubjectsRevision(value => value + 1)}>Recarregar disciplinas</Button></div>}
      {!subjectsLoading && !subjectsError && subjects.length === 0 && <p className="mt-5 text-sm text-graphite">Os materiais pertencem a uma disciplina. <Link to="/subjects?new=1" className="text-crimson underline">Cadastre sua primeira disciplina</Link> para começar.</p>}
      {loading && materials !== null && <p role="status" className="mt-4 text-sm text-muted">Atualizando materiais…</p>}
      {!loading && materials !== null && highlightedId !== null && !materials.some(material => material.id === highlightedId) && <p role="status" className="mt-4 text-sm text-graphite">O material solicitado não está disponível. Ele pode ter sido excluído.</p>}

      <div className="mt-6 flex flex-wrap gap-3 items-center"><label className="flex-1 max-w-lg"><span className="sr-only">Buscar materiais</span><input type="search" maxLength={200} value={query} onChange={event => { setQuery(event.target.value); setHighlightedId(null); }} placeholder="Buscar por título, descrição, link ou disciplina…" className="w-full min-h-11 px-3 border border-border rounded-md bg-surface text-ink text-sm" /></label>{highlightedId !== null && <Button variant="outline" onClick={() => setHighlightedId(null)}>Ver todos os materiais</Button>}</div>

      <div className="flex flex-wrap items-center justify-between gap-3 mt-6 mb-6">
        <Tabs
          value={statusTab}
          onChange={(k) => { setStatusTab(k as StatusTab); setHighlightedId(null); }}
          tabs={[
            { key: 'todos', label: 'Todos', count: counts.todos ?? 0 },
            { key: 'para_estudar', label: 'Para estudar', count: counts.para_estudar ?? 0 },
            { key: 'estudando', label: 'Estudando', count: counts.estudando ?? 0 },
            { key: 'concluido', label: 'Concluído', count: counts.concluido ?? 0 },
          ]}
        />
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <select
            value={subjectFilter}
            onChange={(e) => { setSubjectFilter(e.target.value); setHighlightedId(null); }}
            aria-label="Filtrar materiais por disciplina"
            disabled={subjectsLoading}
            className="max-w-full min-h-11 text-sm border border-border rounded-lg px-2.5 py-1.5 bg-surface text-graphite cursor-pointer"
          >
            <option value="todas">Todas as disciplinas</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setHighlightedId(null); }}
            aria-label="Filtrar materiais por tipo"
            className="max-w-full min-h-11 text-sm border border-border rounded-lg px-2.5 py-1.5 bg-surface text-graphite cursor-pointer"
          >
            <option value="todas">Todos os tipos</option>
            {MATERIAL_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_META[c].label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && materials === null ? (
        <div aria-label="Carregando materiais" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      ) : materials === null ? null : filtered.length === 0 ? (
        <Card padding="lg">
          <EmptyState
            icon={FolderOpen}
            title="Nenhum material encontrado"
            description={
              isUnfiltered
                ? 'Adicione PDFs, links, vídeos ou anotações para organizar seus recursos de estudo por disciplina.'
                : 'Nenhum material corresponde a esses filtros.'
            }
            action={
              isUnfiltered && subjects.length > 0 && !subjectsLoading
                ? {
                    label: 'Novo material',
                    icon: <Plus size={15} />,
                    onClick: () => {
                      setEditing(null);
                      setModalOpen(true);
                    },
                  }
                : undefined
            }
          />
        </Card>
      ) : (
        <div ref={materialListRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((material, index) => {
            const meta = CATEGORY_META[material.category];
            const Icon = meta.icon;
            return (
              <Card
                key={material.id}
                data-material-id={material.id}
                tabIndex={-1}
                aria-label={material.title}
                className={`animate-fade-in-up flex flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson ${highlightedId === material.id ? 'border-crimson' : ''}`}
                style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-navy-soft flex items-center justify-center shrink-0">
                      <Icon size={16} className="text-navy" />
                    </div>
                    <span className="text-xs text-muted">{meta.label}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      disabled={busyIds.has(material.id) || loading || busyIds.size > 0}
                      onClick={() => {
                        setEditing(material);
                        setModalOpen(true);
                      }}
                      className="min-h-11 min-w-11 inline-flex items-center justify-center text-muted hover:text-ink transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-wait"
                      aria-label={`Editar ${material.title}`}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      disabled={busyIds.has(material.id) || loading}
                      onClick={() => onDelete(material.id)}
                      className="min-h-11 min-w-11 inline-flex items-center justify-center text-muted hover:text-danger transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-wait"
                      aria-label={`Excluir ${material.title}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <h3 className="font-serif text-base font-semibold text-ink mb-1 line-clamp-2">{material.title}</h3>
                <Badge tone="neutral" size="sm" className="self-start mb-2">
                  {material.subject_name}
                </Badge>
                {material.description && (
                  <p className="text-sm text-graphite line-clamp-2 mb-3">{material.description}</p>
                )}

                <div className="mt-auto pt-3 flex items-center justify-between gap-2">
                  <select
                    value={material.status}
                    disabled={busyIds.has(material.id) || loading}
                    aria-label={`Status de ${material.title}`}
                    onChange={(e) => onChangeStatus(material.id, e.target.value as MaterialStatus)}
                    className="text-xs border border-border rounded-md px-2 py-1.5 bg-surface text-graphite cursor-pointer focus:outline-none focus:ring-2 focus:ring-crimson/20"
                  >
                    {MATERIAL_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_META[s].label}
                      </option>
                    ))}
                  </select>
                  {material.url && (
                    <a
                      href={material.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-crimson hover:text-crimson-dark inline-flex items-center gap-1"
                    >
                      Abrir <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {!loadError && <Pagination page={page} total={total} pageSize={20} loading={loading} onPage={setPage} />}

      <MaterialModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        subjects={subjects}
        subjectsLoading={subjectsLoading}
        subjectsError={subjectsError}
        onRetrySubjects={() => setSubjectsRevision(value => value + 1)}
        material={editing}
        defaultSubjectId={subjectFilter !== 'todas' ? subjectFilter : ''}
        onSaved={() => {
          setModalOpen(false);
          void loadMaterials();
        }}
      />
    </div>
  );
};

const MaterialModal: React.FC<{
  open: boolean;
  onClose: () => void;
  subjects: Subject[];
  subjectsLoading: boolean;
  subjectsError: string;
  onRetrySubjects: () => void;
  material: MaterialWithSubject | null;
  defaultSubjectId: string;
  onSaved: () => void;
}> = ({ open, onClose, subjects, subjectsLoading, subjectsError, onRetrySubjects, material, defaultSubjectId, onSaved }) => {
  const isEditing = !!material;
  const { register, handleSubmit, reset, formState: { errors } } = useForm<MaterialFormValues>();
  const [saving, setSaving] = useState(false);
  const savingLock = useRef(false);

  useEffect(() => {
    if (!open) return;
    if (material) {
      reset({
        title: material.title,
        subject_id: String(material.subject_id),
        category: material.category,
        url: material.url || '',
        description: material.description || '',
      });
    } else {
      reset({ title: '', subject_id: defaultSubjectId, category: 'link', url: '', description: '' });
    }
  }, [open, material, defaultSubjectId, reset]);

  const onSubmit = handleSubmit(async (values) => {
    if (savingLock.current || subjectsLoading || subjects.length === 0) return;
    savingLock.current = true;
    setSaving(true);
    const payload = {
      title: normalizeMaterialTitle(values.title),
      subject_id: Number(values.subject_id),
      category: values.category,
      url: values.url || null,
      description: values.description || null,
    };
    try {
      if (isEditing) {
        await apiClient.put(`/materials/${material!.id}`, payload);
        toast.success('Material atualizado.');
      } else {
        await apiClient.post('/materials/', payload);
        toast.success('Material adicionado.');
      }
      onSaved();
    } catch {
      toast.error('Não foi possível salvar o material.');
    } finally {
      savingLock.current = false;
      setSaving(false);
    }
  });

  return (
    <Modal open={open} onClose={() => { if (!savingLock.current) onClose(); }} ariaLabel={isEditing ? 'Editar material' : 'Novo material'} panelClassName="max-w-lg">
      <form onSubmit={onSubmit} className="p-6">
        <h2 className="font-serif text-xl font-semibold text-ink mb-5">{isEditing ? 'Editar material' : 'Novo material'}</h2>
        {subjectsLoading && <p role="status" className="mb-4 text-sm text-muted">Carregando disciplinas…</p>}
        {subjectsError && <div role="alert" className="mb-4 text-sm text-danger space-y-2"><p>{subjectsError}</p><Button type="button" variant="outline" size="sm" onClick={onRetrySubjects}>Tentar novamente</Button></div>}
        {!subjectsLoading && !subjectsError && subjects.length === 0 && <p className="mb-4 text-sm text-graphite">Cadastre uma disciplina antes de adicionar materiais.</p>}
        <fieldset disabled={saving} className="space-y-4">
          <div>
            <label htmlFor="material-title" className="block text-sm font-medium text-graphite mb-1.5">Título</label>
            <input
              id="material-title"
              {...register('title', { validate: value => validateMaterialTitle(value) || true })}
              aria-invalid={errors.title ? true : undefined}
              aria-describedby={errors.title ? 'material-title-error' : undefined}
              placeholder="Ex.: Slides da aula 3"
              className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-surface text-ink placeholder:text-muted outline-none focus:border-crimson focus:ring-4 focus:ring-crimson/10 transition-colors"
            />
            {errors.title && <p id="material-title-error" role="alert" className="mt-1.5 text-sm text-danger">{errors.title.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-graphite mb-1.5">Disciplina</label>
              <select
                {...register('subject_id', { required: true })}
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-surface text-ink text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-crimson/20"
              >
                <option value="" disabled>
                  Selecione...
                </option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-graphite mb-1.5">Tipo</label>
              <select
                {...register('category')}
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-surface text-ink text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-crimson/20"
              >
                {MATERIAL_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_META[c].label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-graphite mb-1.5">Link (opcional)</label>
            <input
              {...register('url')}
              type="url"
              placeholder="https://..."
              className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-surface text-ink placeholder:text-muted outline-none focus:border-crimson focus:ring-4 focus:ring-crimson/10 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-graphite mb-1.5">Notas (opcional)</label>
            <textarea
              {...register('description')}
              rows={3}
              placeholder="Contexto, resumo ou anotações sobre este material"
              className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-surface text-ink placeholder:text-muted outline-none focus:border-crimson focus:ring-4 focus:ring-crimson/10 transition-colors resize-none"
            />
          </div>
        </fieldset>
        <div className="flex justify-end gap-2.5 mt-6 pt-5 border-t border-border">
          <Button type="button" variant="ghost" disabled={saving} onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving} disabled={subjectsLoading || subjects.length === 0}>
            {isEditing ? 'Salvar' : 'Adicionar'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
