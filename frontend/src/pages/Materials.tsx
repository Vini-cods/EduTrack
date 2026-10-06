import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Plus, ExternalLink, Pencil, Trash2, FolderOpen } from 'lucide-react';
import apiClient from '../api/client';
import type { MaterialWithSubject, MaterialCategory, MaterialStatus, Subject } from '../types';
import { SectionHeader } from '../components/ui/SectionHeader';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Tabs } from '../components/ui/Tabs';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { StatCardSkeleton } from '../components/ui/Skeleton';
import { CATEGORY_META, MATERIAL_CATEGORIES, STATUS_META, MATERIAL_STATUSES } from '../lib/materials';

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
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<MaterialWithSubject | null>(null);

  const loadMaterials = () => {
    apiClient.get('/materials/').then((res) => setMaterials(res.data)).catch(console.error);
  };

  useEffect(() => {
    loadMaterials();
    apiClient.get('/subjects/').then((res) => setSubjects(res.data)).catch(console.error);
  }, []);

  useEffect(() => {
    const subjectIdParam = searchParams.get('subject_id');
    if (subjectIdParam) setSubjectFilter(subjectIdParam);
    if (searchParams.get('new') === '1') {
      setEditing(null);
      setModalOpen(true);
    }
    if (subjectIdParam || searchParams.get('new') === '1') {
      setSearchParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onDelete = async (id: number) => {
    if (!window.confirm('Excluir este material?')) return;
    try {
      await apiClient.delete(`/materials/${id}`);
      toast.success('Material excluído.');
      loadMaterials();
    } catch {
      toast.error('Não foi possível excluir.');
    }
  };

  const onChangeStatus = async (id: number, status: MaterialStatus) => {
    setMaterials((prev) => prev?.map((m) => (m.id === id ? { ...m, status } : m)) ?? null);
    try {
      await apiClient.patch(`/materials/${id}/status`, { status });
    } catch {
      toast.error('Não foi possível atualizar o status.');
      loadMaterials();
    }
  };

  const filtered = useMemo(() => {
    let list = materials ?? [];
    if (statusTab !== 'todos') list = list.filter((m) => m.status === statusTab);
    if (subjectFilter !== 'todas') list = list.filter((m) => String(m.subject_id) === subjectFilter);
    if (categoryFilter !== 'todas') list = list.filter((m) => m.category === categoryFilter);
    return list;
  }, [materials, statusTab, subjectFilter, categoryFilter]);

  const counts = useMemo(() => {
    const list = materials ?? [];
    return {
      todos: list.length,
      para_estudar: list.filter((m) => m.status === 'para_estudar').length,
      estudando: list.filter((m) => m.status === 'estudando').length,
      concluido: list.filter((m) => m.status === 'concluido').length,
    };
  }, [materials]);

  const loading = materials === null;
  const isUnfiltered = statusTab === 'todos' && subjectFilter === 'todas' && categoryFilter === 'todas';

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <SectionHeader
        title="Materiais"
        description="PDFs, links, vídeos e outros recursos organizados por disciplina."
        action={
          <Button
            icon={<Plus size={16} />}
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            Novo material
          </Button>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3 mt-6 mb-6">
        <Tabs
          value={statusTab}
          onChange={(k) => setStatusTab(k as StatusTab)}
          tabs={[
            { key: 'todos', label: 'Todos', count: counts.todos },
            { key: 'para_estudar', label: 'Para estudar', count: counts.para_estudar },
            { key: 'estudando', label: 'Estudando', count: counts.estudando },
            { key: 'concluido', label: 'Concluído', count: counts.concluido },
          ]}
        />
        <div className="flex items-center gap-2">
          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="text-sm border border-border rounded-lg px-2.5 py-1.5 bg-surface text-graphite cursor-pointer"
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
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-sm border border-border rounded-lg px-2.5 py-1.5 bg-surface text-graphite cursor-pointer"
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

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
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
              isUnfiltered
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((material, index) => {
            const meta = CATEGORY_META[material.category];
            const Icon = meta.icon;
            return (
              <Card
                key={material.id}
                className="animate-fade-in-up flex flex-col"
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
                      onClick={() => {
                        setEditing(material);
                        setModalOpen(true);
                      }}
                      className="text-muted hover:text-ink transition-colors cursor-pointer"
                      aria-label="Editar"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => onDelete(material.id)}
                      className="text-muted hover:text-danger transition-colors cursor-pointer"
                      aria-label="Excluir"
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

      <MaterialModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        subjects={subjects}
        material={editing}
        defaultSubjectId={subjectFilter !== 'todas' ? subjectFilter : ''}
        onSaved={() => {
          setModalOpen(false);
          loadMaterials();
        }}
      />
    </div>
  );
};

const MaterialModal: React.FC<{
  open: boolean;
  onClose: () => void;
  subjects: Subject[];
  material: MaterialWithSubject | null;
  defaultSubjectId: string;
  onSaved: () => void;
}> = ({ open, onClose, subjects, material, defaultSubjectId, onSaved }) => {
  const isEditing = !!material;
  const { register, handleSubmit, reset } = useForm<MaterialFormValues>();
  const [saving, setSaving] = useState(false);

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
    setSaving(true);
    const payload = {
      title: values.title,
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
      setSaving(false);
    }
  });

  return (
    <Modal open={open} onClose={onClose} ariaLabel={isEditing ? 'Editar material' : 'Novo material'} panelClassName="max-w-lg">
      <form onSubmit={onSubmit} className="p-6">
        <h2 className="font-serif text-xl font-semibold text-ink mb-5">{isEditing ? 'Editar material' : 'Novo material'}</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-graphite mb-1.5">Título</label>
            <input
              {...register('title', { required: true })}
              placeholder="Ex.: Slides da aula 3"
              className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-surface text-ink placeholder:text-muted outline-none focus:border-crimson focus:ring-4 focus:ring-crimson/10 transition-colors"
            />
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
        </div>
        <div className="flex justify-end gap-2.5 mt-6 pt-5 border-t border-border">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving}>
            {isEditing ? 'Salvar' : 'Adicionar'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
