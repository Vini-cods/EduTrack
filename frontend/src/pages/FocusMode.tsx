/**
 * Focus Mode — EXECUÇÃO, não planejamento (ver nota em StudyPlanner.tsx).
 *
 * O relógio Pomodoro (foco/pausa, contagem de ciclos) é inteiramente do
 * cliente — não existe "fase" persistida no backend. O que o backend
 * rastreia é só se a sessão está `em_andamento` (contando tempo de estudo)
 * ou `pausada` (não contando), independente do motivo. Uma pausa de
 * Pomodoro e uma pausa manual usam exatamente o mesmo pause/resume do
 * StudySession — não há dois conceitos de pausa.
 *
 * Limitação assumida: se a página recarregar durante uma sessão ativa, o
 * tempo de estudo real (accumulated_seconds no servidor) continua correto,
 * mas a fase/ciclo do Pomodoro reinicia (não há como saber em qual fase
 * exata o usuário estava). O card "sessão retomada" deixa isso explícito.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Play, Pause, Square, Settings2, Target, History, Trash2 } from 'lucide-react';
import apiClient from '../api/client';
import type { Subject, TaskWithSubject, StudySessionWithContext } from '../types';
import { SectionHeader } from '../components/ui/SectionHeader';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';
import {
  DEFAULT_POMODORO_CONFIG,
  loadPomodoroConfig,
  savePomodoroConfig,
  nextPhase,
  phaseDurationSeconds,
  formatClock,
  formatDuration,
  PHASE_LABEL,
  type PomodoroConfig,
  type PomodoroPhase,
} from '../lib/pomodoro';

export const FocusMode: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<StudySessionWithContext | null>(null);
  const [history, setHistory] = useState<StudySessionWithContext[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [tasks, setTasks] = useState<TaskWithSubject[]>([]);

  const [config, setConfig] = useState<PomodoroConfig>(DEFAULT_POMODORO_CONFIG);
  const [showConfig, setShowConfig] = useState(false);

  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState('');

  const [phase, setPhase] = useState<PomodoroPhase>('focus');
  const [phaseRemaining, setPhaseRemaining] = useState(0);
  const [cyclesCompleted, setCyclesCompleted] = useState(0);
  const [manuallyPaused, setManuallyPaused] = useState(false);
  const [studySecondsBaseline, setStudySecondsBaseline] = useState(0);
  const [studySecondsLocal, setStudySecondsLocal] = useState(0);
  const [resumedNotice, setResumedNotice] = useState(false);
  const transitioningRef = useRef(false);

  const loadHistory = () => {
    apiClient.get('/study-sessions/').then((res) => setHistory(res.data)).catch(console.error);
  };

  useEffect(() => {
    const cfg = loadPomodoroConfig();
    setConfig(cfg);

    Promise.all([
      apiClient.get('/study-sessions/active'),
      apiClient.get('/subjects/'),
      apiClient.get('/tasks/'),
    ])
      .then(([activeRes, subjRes, tasksRes]) => {
        setSubjects(subjRes.data);
        setTasks(tasksRes.data);

        if (activeRes.data) {
          const active: StudySessionWithContext = activeRes.data;
          setSession(active);
          setPhase('focus');
          setPhaseRemaining(phaseDurationSeconds('focus', cfg));
          setStudySecondsBaseline(active.elapsed_seconds);
          setStudySecondsLocal(0);
          setManuallyPaused(active.status === 'pausada');
          setResumedNotice(true);
        } else {
          const taskIdParam = searchParams.get('task_id');
          const subjectIdParam = searchParams.get('subject_id');
          if (taskIdParam) {
            setSelectedTaskId(taskIdParam);
            const t = tasksRes.data.find((x: TaskWithSubject) => String(x.id) === taskIdParam);
            if (t) setSelectedSubjectId(String(t.subject_id));
          } else if (subjectIdParam) {
            setSelectedSubjectId(subjectIdParam);
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));

    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cronômetro: roda sempre que há sessão e não está manualmente pausado —
  // inclusive durante pausas automáticas de Pomodoro, que devem continuar
  // contando a própria pausa mesmo não contando como tempo de estudo.
  useEffect(() => {
    if (!session || manuallyPaused) return;
    const id = setInterval(() => {
      setPhaseRemaining((s) => Math.max(0, s - 1));
      if (phase === 'focus') setStudySecondsLocal((s) => s + 1);
    }, 1000);
    return () => clearInterval(id);
  }, [session, manuallyPaused, phase]);

  useEffect(() => {
    if (phaseRemaining !== 0 || !session || manuallyPaused || transitioningRef.current) return;
    transitioningRef.current = true;
    handlePhaseComplete().finally(() => {
      transitioningRef.current = false;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phaseRemaining]);

  const handlePhaseComplete = async () => {
    if (!session) return;
    if (phase === 'focus') {
      const newCycles = cyclesCompleted + 1;
      setCyclesCompleted(newCycles);
      try {
        await apiClient.patch(`/study-sessions/${session.id}/pause`);
      } catch {
        /* segue para a pausa mesmo assim — o relógio local já decidiu */
      }
      const next = nextPhase('focus', newCycles, config);
      setPhase(next);
      setPhaseRemaining(phaseDurationSeconds(next, config));
      toast(next === 'long_break' ? 'Ciclo completo — pausa longa!' : 'Hora de uma pausa curta.', { icon: '☕' });
    } else {
      try {
        await apiClient.patch(`/study-sessions/${session.id}/resume`);
      } catch {
        /* ... */
      }
      setPhase('focus');
      setPhaseRemaining(phaseDurationSeconds('focus', config));
      toast('De volta ao foco!', { icon: '🎯' });
    }
  };

  const handleStart = async () => {
    try {
      const res = await apiClient.post('/study-sessions/', {
        subject_id: selectedSubjectId ? Number(selectedSubjectId) : null,
        task_id: selectedTaskId ? Number(selectedTaskId) : null,
      });
      // O POST devolve StudySessionResponse (sem subject_name/task_title de
      // propósito — ver endpoint). Resolve os nomes a partir do que já está
      // carregado localmente, em vez de deixar em branco até o próximo reload.
      const subjectName = selectedSubjectId
        ? subjects.find((s) => String(s.id) === selectedSubjectId)?.name ?? null
        : null;
      const taskTitle = selectedTaskId ? tasks.find((t) => String(t.id) === selectedTaskId)?.title ?? null : null;
      setSession({ ...res.data, subject_name: subjectName, task_title: taskTitle });
      setPhase('focus');
      setPhaseRemaining(phaseDurationSeconds('focus', config));
      setCyclesCompleted(0);
      setManuallyPaused(false);
      setStudySecondsBaseline(0);
      setStudySecondsLocal(0);
      setResumedNotice(false);
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 409) {
        toast.error('Já existe uma sessão em andamento.');
      } else {
        toast.error('Não foi possível iniciar a sessão.');
      }
    }
  };

  const handleToggleManualPause = async () => {
    if (!session) return;
    try {
      if (manuallyPaused) {
        if (phase === 'focus') await apiClient.patch(`/study-sessions/${session.id}/resume`);
        setManuallyPaused(false);
      } else {
        if (phase === 'focus') await apiClient.patch(`/study-sessions/${session.id}/pause`);
        setManuallyPaused(true);
      }
    } catch {
      toast.error('Não foi possível atualizar a sessão.');
    }
  };

  const handleStop = async () => {
    if (!session) return;
    try {
      await apiClient.patch(`/study-sessions/${session.id}/stop`, { pomodoro_cycles_completed: cyclesCompleted });
      toast.success('Sessão finalizada.');
    } catch {
      toast.error('Não foi possível finalizar a sessão.');
    }
    setSession(null);
    setPhase('focus');
    setManuallyPaused(false);
    setCyclesCompleted(0);
    setResumedNotice(false);
    loadHistory();
  };

  const handleDeleteHistoryItem = async (id: number) => {
    if (!window.confirm('Remover esta sessão do histórico?')) return;
    try {
      await apiClient.delete(`/study-sessions/${id}`);
      loadHistory();
    } catch {
      toast.error('Não foi possível remover.');
    }
  };

  const updateConfigField = (field: keyof PomodoroConfig, value: number) => {
    const next = { ...config, [field]: Math.max(1, value) };
    setConfig(next);
    savePomodoroConfig(next);
  };

  const filteredTasks = useMemo(
    () =>
      selectedSubjectId
        ? tasks.filter((t) => String(t.subject_id) === selectedSubjectId && t.status !== 'concluida')
        : tasks.filter((t) => t.status !== 'concluida'),
    [tasks, selectedSubjectId]
  );

  const totalStudiedSeconds = studySecondsBaseline + studySecondsLocal;
  const cycleInCurrentSet = cyclesCompleted % config.cyclesUntilLongBreak || (cyclesCompleted > 0 ? config.cyclesUntilLongBreak : 0);

  if (loading) {
    return (
      <div className="p-6 lg:p-8 max-w-2xl mx-auto">
        <Skeleton className="h-9 w-48 mb-8" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto">
      <SectionHeader
        title="Focus Mode"
        description="Estudo com Pomodoro — o tempo real fica registrado no histórico."
        action={
          !session && (
            <button
              onClick={() => setShowConfig((v) => !v)}
              className="text-graphite hover:text-ink transition-colors cursor-pointer"
              aria-label="Configurar ciclos"
            >
              <Settings2 size={20} />
            </button>
          )
        }
      />

      {!session && showConfig && (
        <Card className="mt-6 animate-scale-in" padding="md">
          <h3 className="text-sm font-semibold text-graphite mb-3">Ciclos de Pomodoro</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(
              [
                ['focusMinutes', 'Foco (min)'],
                ['shortBreakMinutes', 'Pausa curta (min)'],
                ['longBreakMinutes', 'Pausa longa (min)'],
                ['cyclesUntilLongBreak', 'Ciclos p/ pausa longa'],
              ] as [keyof PomodoroConfig, string][]
            ).map(([field, label]) => (
              <div key={field}>
                <label className="text-xs text-graphite mb-1 block">{label}</label>
                <input
                  type="number"
                  min={1}
                  value={config[field]}
                  onChange={(e) => updateConfigField(field, Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-surface text-ink text-sm outline-none focus:border-crimson focus:ring-2 focus:ring-crimson/10"
                />
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="mt-6" padding="lg">
        {!session ? (
          <div>
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div>
                <label className="block text-sm font-medium text-graphite mb-1.5">Disciplina (opcional)</label>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => {
                    setSelectedSubjectId(e.target.value);
                    setSelectedTaskId('');
                  }}
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-surface text-ink text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-crimson/20"
                >
                  <option value="">Nenhuma</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-graphite mb-1.5">Tarefa (opcional)</label>
                <select
                  value={selectedTaskId}
                  onChange={(e) => setSelectedTaskId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-surface text-ink text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-crimson/20"
                >
                  <option value="">Nenhuma</option>
                  {filteredTasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <Button size="lg" className="w-full" icon={<Play size={18} />} onClick={handleStart}>
              Iniciar sessão de {config.focusMinutes} minutos
            </Button>
          </div>
        ) : (
          <div className="text-center">
            {resumedNotice && (
              <p className="text-xs text-muted mb-4">
                Sessão retomada — {formatDuration(studySecondsBaseline)} já estudados antes de recarregar a página.
              </p>
            )}

            <Badge tone={phase === 'focus' ? 'crimson' : 'success'} className="mb-4">
              {manuallyPaused ? 'Pausado' : PHASE_LABEL[phase]}
            </Badge>

            <p className="font-serif text-6xl font-semibold text-ink tabular-nums tracking-tight">
              {formatClock(phaseRemaining)}
            </p>

            {(session.subject_name || session.task_title) && (
              <p className="text-sm text-graphite mt-3">
                {session.task_title || session.subject_name}
                {session.task_title && session.subject_name ? ` · ${session.subject_name}` : ''}
              </p>
            )}

            <div className="flex items-center justify-center gap-4 mt-2 text-xs text-muted">
              <span>Ciclo {cycleInCurrentSet} de {config.cyclesUntilLongBreak}</span>
              <span>·</span>
              <span>{formatDuration(totalStudiedSeconds)} estudados</span>
            </div>

            <div className="flex items-center justify-center gap-3 mt-7">
              <Button
                variant="outline"
                size="lg"
                icon={manuallyPaused ? <Play size={18} /> : <Pause size={18} />}
                onClick={handleToggleManualPause}
              >
                {manuallyPaused ? 'Retomar' : 'Pausar'}
              </Button>
              <Button variant="danger" size="lg" icon={<Square size={16} />} onClick={handleStop}>
                Finalizar
              </Button>
            </div>
          </div>
        )}
      </Card>

      <div className="mt-8">
        <div className="flex items-center gap-2 mb-3">
          <History size={16} className="text-graphite" />
          <h2 className="text-sm font-semibold text-graphite">Histórico de sessões</h2>
        </div>
        {history.length === 0 ? (
          <Card padding="lg">
            <EmptyState icon={Target} title="Nenhuma sessão ainda" description="Suas sessões de foco concluídas aparecem aqui." />
          </Card>
        ) : (
          <Card padding="none">
            <div className="divide-y divide-border">
              {history.slice(0, 15).map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink truncate">
                      {s.task_title || s.subject_name || 'Sessão livre'}
                    </p>
                    <p className="text-xs text-muted">
                      {new Date(s.started_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                      {s.subject_name && s.task_title ? ` · ${s.subject_name}` : ''}
                      {s.pomodoro_cycles_completed > 0 ? ` · ${s.pomodoro_cycles_completed} ciclo(s)` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-medium text-ink tabular-nums">{formatDuration(s.elapsed_seconds)}</span>
                    {s.status !== 'concluida' && (
                      <Badge tone="warning" size="sm">
                        {s.status === 'pausada' ? 'Pausada' : 'Em andamento'}
                      </Badge>
                    )}
                    <button
                      onClick={() => handleDeleteHistoryItem(s.id)}
                      className="text-muted hover:text-danger transition-colors cursor-pointer"
                      aria-label="Remover"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      <button
        onClick={() => navigate('/study')}
        className="mt-6 text-sm text-graphite hover:text-ink font-medium transition-colors cursor-pointer"
      >
        ← Voltar ao Study Planner
      </button>
    </div>
  );
};
