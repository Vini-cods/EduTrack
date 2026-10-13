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
 * A fase/ciclo é recuperada localmente por id de sessão. O servidor é a
 * fonte do tempo estudado e confirma pause/resume/stop antes de a UI avançar.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Play, Pause, Square, Settings2, Target, History, Trash2 } from 'lucide-react';
import apiClient from '../api/client';
import type { Subject, TaskWithSubject, StudySession, StudySessionWithContext } from '../types';
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
  normalizePomodoroConfig,
  POMODORO_LIMITS,
  createPomodoroTimer,
  loadPomodoroTimer,
  savePomodoroTimer,
  clearPomodoroTimer,
  remainingTimerMilliseconds,
  pausePomodoroTimer,
  resumePomodoroTimer,
  confirmSessionMutation,
  nextPhase,
  formatClock,
  formatDuration,
  PHASE_LABEL,
  type PomodoroConfig,
  type PomodoroTimer,
} from '../lib/pomodoro';

export const FocusMode: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<StudySessionWithContext | null>(null);
  const [history, setHistory] = useState<StudySessionWithContext[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [tasks, setTasks] = useState<TaskWithSubject[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState(false);
  const [pendingAction, setPendingAction] = useState<'start' | 'pause' | 'stop' | 'phase' | null>(null);
  const [phaseError, setPhaseError] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [config, setConfig] = useState<PomodoroConfig>(DEFAULT_POMODORO_CONFIG);
  const [showConfig, setShowConfig] = useState(false);

  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState('');

  const [timer, setTimer] = useState<PomodoroTimer | null>(null);
  const [now, setNow] = useState(Date.now);
  const [studySecondsBaseline, setStudySecondsBaseline] = useState(0);
  const [studySecondsLocal, setStudySecondsLocal] = useState(0);
  const [resumedNotice, setResumedNotice] = useState(false);
  const actionInFlightRef = useRef(false);
  const studyStartedAtRef = useRef<number | null>(null);
  const timerRef = useRef<PomodoroTimer | null>(null);

  const updateTimer = (next: PomodoroTimer | null) => {
    timerRef.current = next;
    setTimer(next);
    setNow(Date.now());
    if (next) savePomodoroTimer(next);
    else clearPomodoroTimer();
  };

  const applySession = (next: StudySessionWithContext) => {
    setSession(next);
    setStudySecondsBaseline(next.elapsed_seconds);
    setStudySecondsLocal(0);
    studyStartedAtRef.current = next.status === 'em_andamento' ? Date.now() : null;
  };

  const loadHistory = async (signal?: AbortSignal) => {
    setHistoryLoading(true);
    try {
      const res = await apiClient.get<StudySessionWithContext[]>('/study-sessions/', { signal });
      if (signal?.aborted) return;
      setHistory(res.data);
      setHistoryError(false);
    } catch {
      if (!signal?.aborted) setHistoryError(true);
    } finally {
      if (!signal?.aborted) setHistoryLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    const cfg = loadPomodoroConfig();
    setConfig(cfg);

    Promise.all([
      apiClient.get('/study-sessions/active', { signal: controller.signal }),
      apiClient.get('/subjects/', { signal: controller.signal }),
      apiClient.get('/tasks/', { signal: controller.signal }),
    ])
      .then(([activeRes, subjRes, tasksRes]) => {
        if (controller.signal.aborted) return;
        setSubjects(subjRes.data);
        setTasks(tasksRes.data);

        if (activeRes.data) {
          const active: StudySessionWithContext = activeRes.data;
          applySession(active);
          updateTimer(loadPomodoroTimer(active.id, active.status === 'pausada' ? 'pausada' : 'em_andamento', cfg, Date.now()));
          setResumedNotice(true);
        } else {
          const taskIdParam = searchParams.get('task_id');
          const subjectIdParam = searchParams.get('subject_id');
          if (taskIdParam) {
            const t = tasksRes.data.find((x: TaskWithSubject) => String(x.id) === taskIdParam);
            if (t && t.status !== 'concluida') {
              setSelectedTaskId(taskIdParam);
              setSelectedSubjectId(t.subject_id ? String(t.subject_id) : '');
            }
          } else if (subjectIdParam && subjRes.data.some((s: Subject) => String(s.id) === subjectIdParam)) {
            setSelectedSubjectId(subjectIdParam);
          }
        }
      })
      .catch(() => { if (!controller.signal.aborted) setLoadError(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });

    void loadHistory(controller.signal);
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const phase = timer?.phase ?? 'focus';
  const cyclesCompleted = timer?.cyclesCompleted ?? 0;
  const manuallyPaused = timer?.manuallyPaused ?? false;
  const phaseRemaining = timer ? Math.ceil(remainingTimerMilliseconds(timer, now) / 1000) : 0;

  // Deadline evita drift quando o navegador atrasa/suspende os callbacks.
  // O tempo estudado acompanha o estado confirmado pelo servidor.
  useEffect(() => {
    if (!session) return;
    const syncClock = () => {
      const timestamp = Date.now();
      setNow(timestamp);
      if (studyStartedAtRef.current !== null) {
        setStudySecondsLocal(Math.max(0, Math.floor((timestamp - studyStartedAtRef.current) / 1000)));
      }
    };
    const id = setInterval(syncClock, 1000);
    document.addEventListener('visibilitychange', syncClock);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', syncClock);
    };
  }, [session]);

  useEffect(() => {
    if (phaseRemaining !== 0 || !timer || !session || manuallyPaused || phaseError || actionInFlightRef.current) return;
    void handlePhaseComplete();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phaseRemaining, session, manuallyPaused, phaseError, pendingAction]);

  // Uma resposta pode se perder depois do servidor já ter confirmado a ação.
  // Reconcilia esse caso antes de exibir erro ou repetir a mutação.
  const requestSessionAction = async (action: 'pause' | 'resume' | 'stop'): Promise<StudySession> => {
    if (!session) throw new Error('Sessão indisponível');
    const current = timerRef.current;
    const cyclesToRecord = current
      ? current.cyclesCompleted + (current.phase === 'focus' && remainingTimerMilliseconds(current, Date.now()) === 0 ? 1 : 0)
      : 0;
    return confirmSessionMutation<StudySession>(
      session.id,
      action === 'stop' ? 'concluida' : action === 'pause' ? 'pausada' : 'em_andamento',
      async () => {
        const res = await apiClient.patch<StudySession>(`/study-sessions/${session.id}/${action}`,
          action === 'stop' ? { pomodoro_cycles_completed: cyclesToRecord } : undefined);
        return res.data;
      },
      async () => {
        if (action === 'stop') {
          const res = await apiClient.get<StudySessionWithContext[]>('/study-sessions/');
          return res.data.find((item) => item.id === session.id && item.status === 'concluida') ?? null;
        }
        const res = await apiClient.get<StudySessionWithContext | null>('/study-sessions/active');
        return res.data;
      },
    );
  };

  const handlePhaseComplete = async () => {
    if (!session || !timerRef.current || actionInFlightRef.current) return;
    actionInFlightRef.current = true;
    setPendingAction('phase');
    try {
      const current = timerRef.current;
      const updated = await requestSessionAction(current.phase === 'focus' ? 'pause' : 'resume');
      applySession({ ...session, ...updated });
      const newCycles = current.cyclesCompleted + (current.phase === 'focus' ? 1 : 0);
      const next = nextPhase(current.phase, newCycles, config);
      updateTimer(createPomodoroTimer(session.id, next, newCycles, config, Date.now()));
      setPhaseError(false);
      toast(next === 'focus' ? 'De volta ao foco!' : next === 'long_break' ? 'Ciclo completo — pausa longa!' : 'Hora de uma pausa curta.',
        { icon: next === 'focus' ? '🎯' : '☕' });
    } catch {
      setPhaseError(true);
      toast.error('Não foi possível sincronizar o ciclo. Tente novamente antes de continuar.');
    } finally {
      actionInFlightRef.current = false;
      setPendingAction(null);
    }
  };

  const handleStart = async () => {
    if (actionInFlightRef.current || loadError) return;
    actionInFlightRef.current = true;
    setPendingAction('start');
    try {
      const res = await apiClient.post('/study-sessions/', {
        subject_id: selectedSubjectId ? Number(selectedSubjectId) : null,
        task_id: selectedTaskId ? Number(selectedTaskId) : null,
      });
      // O POST devolve StudySessionResponse (sem subject_name/task_title de
      // propósito — ver endpoint). Resolve os nomes a partir do que já está
      // carregado localmente, em vez de deixar em branco até o próximo reload.
      const resolvedSubjectId = res.data.subject_id;
      const subjectName = resolvedSubjectId
        ? subjects.find((s) => s.id === resolvedSubjectId)?.name ?? null
        : null;
      const taskTitle = selectedTaskId ? tasks.find((t) => String(t.id) === selectedTaskId)?.title ?? null : null;
      applySession({ ...res.data, subject_name: subjectName, task_title: taskTitle });
      updateTimer(createPomodoroTimer(res.data.id, 'focus', 0, config, Date.now()));
      setPhaseError(false);
      setResumedNotice(false);
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      try {
        const active = await apiClient.get<StudySessionWithContext | null>('/study-sessions/active');
        if (active.data) {
          applySession(active.data);
          updateTimer(loadPomodoroTimer(active.data.id, active.data.status === 'pausada' ? 'pausada' : 'em_andamento', config, Date.now()));
          setResumedNotice(true);
          toast.success('Sessão ativa recuperada.');
          return;
        }
      } catch {
        toast.error('Não foi possível confirmar o início. Tente novamente para recuperar a sessão quando a conexão voltar.');
        return;
      }
      toast.error(status === 409 ? 'Não foi possível recuperar a sessão ativa. Tente novamente.' : 'Não foi possível iniciar a sessão.');
    } finally {
      actionInFlightRef.current = false;
      setPendingAction(null);
    }
  };

  const handleToggleManualPause = async () => {
    if (!session || !timerRef.current || actionInFlightRef.current || phaseError) return;
    actionInFlightRef.current = true;
    setPendingAction('pause');
    try {
      const current = timerRef.current;
      if (manuallyPaused) {
        if (phase === 'focus') applySession({ ...session, ...await requestSessionAction('resume') });
        updateTimer(resumePomodoroTimer(current, Date.now()));
      } else {
        if (phase === 'focus') applySession({ ...session, ...await requestSessionAction('pause') });
        updateTimer(pausePomodoroTimer(current, Date.now()));
      }
    } catch {
      toast.error('Não foi possível atualizar a sessão.');
    } finally {
      actionInFlightRef.current = false;
      setPendingAction(null);
    }
  };

  const handleStop = async () => {
    if (!session || actionInFlightRef.current) return;
    actionInFlightRef.current = true;
    setPendingAction('stop');
    try {
      await requestSessionAction('stop');
      toast.success('Sessão finalizada.');
      setSession(null);
      updateTimer(null);
      studyStartedAtRef.current = null;
      setPhaseError(false);
      setResumedNotice(false);
      void loadHistory();
    } catch {
      toast.error('Não foi possível finalizar a sessão.');
    } finally {
      actionInFlightRef.current = false;
      setPendingAction(null);
    }
  };

  const handleDeleteHistoryItem = async (id: number) => {
    if (deletingId !== null || id === session?.id) return;
    if (!window.confirm('Remover esta sessão do histórico?')) return;
    setDeletingId(id);
    try {
      await apiClient.delete(`/study-sessions/${id}`);
      setHistory((items) => items.filter((item) => item.id !== id));
      toast.success('Sessão removida do histórico.');
    } catch {
      toast.error('Não foi possível remover.');
    } finally {
      setDeletingId(null);
    }
  };

  const updateConfigField = (field: keyof PomodoroConfig, value: number) => {
    const next = normalizePomodoroConfig({ ...config, [field]: value });
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
              aria-expanded={showConfig}
              aria-controls="pomodoro-config"
            >
              <Settings2 size={20} />
            </button>
          )
        }
      />

      {!session && showConfig && (
        <Card className="mt-6 animate-scale-in motion-reduce:animate-none" padding="md">
          <div id="pomodoro-config">
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
                <label htmlFor={`pomodoro-${field}`} className="text-xs text-graphite mb-1 block">{label}</label>
                <input
                  id={`pomodoro-${field}`}
                  type="number"
                  min={1}
                  max={POMODORO_LIMITS[field]}
                  step={1}
                  value={config[field]}
                  onChange={(e) => updateConfigField(field, Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-surface text-ink text-sm outline-none focus:border-crimson focus:ring-2 focus:ring-crimson/10"
                />
              </div>
            ))}
          </div>
          </div>
        </Card>
      )}

      {loadError && (
        <Card className="mt-6" padding="md">
          <p role="alert" className="text-sm text-danger mb-3">Não foi possível carregar suas sessões e disciplinas.</p>
          <Button variant="outline" onClick={() => window.location.reload()}>Tentar novamente</Button>
        </Card>
      )}

      <Card className="mt-6" padding="lg">
        {!session ? (
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
              <div>
                <label htmlFor="focus-subject" className="block text-sm font-medium text-graphite mb-1.5">Disciplina (opcional)</label>
                <select
                  id="focus-subject"
                  disabled={pendingAction !== null || loadError}
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
                <label htmlFor="focus-task" className="block text-sm font-medium text-graphite mb-1.5">Tarefa (opcional)</label>
                <select
                  id="focus-task"
                  disabled={pendingAction !== null || loadError}
                  value={selectedTaskId}
                  onChange={(e) => {
                    setSelectedTaskId(e.target.value);
                    const task = tasks.find((item) => String(item.id) === e.target.value);
                    if (task) setSelectedSubjectId(task.subject_id ? String(task.subject_id) : '');
                  }}
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
            <Button size="lg" className="w-full" icon={<Play size={18} />} onClick={handleStart}
              loading={pendingAction === 'start'} disabled={loadError}>
              Iniciar sessão de {config.focusMinutes} minutos
            </Button>
          </div>
        ) : (
          <div className="text-center">
            {resumedNotice && (
              <p className="text-xs text-muted mb-4">
                Sessão recuperada — o tempo estudado permanece registrado.
              </p>
            )}

            <div aria-live="polite">
            <Badge tone={phase === 'focus' ? 'crimson' : 'success'} className="mb-4">
              {pendingAction === 'phase' ? 'Sincronizando ciclo…' : manuallyPaused ? 'Pausado' : PHASE_LABEL[phase]}
            </Badge>
            </div>

            <p role="timer" aria-label={`Tempo restante de ${PHASE_LABEL[phase].toLowerCase()}`} aria-live="off"
              className="font-serif text-6xl font-semibold text-ink tabular-nums tracking-tight">
              {formatClock(phaseRemaining)}
            </p>

            {(session.subject_name || session.task_title) && (
              <p className="text-sm text-graphite mt-3">
                {session.task_title || session.subject_name}
                {session.task_title && session.subject_name ? ` · ${session.subject_name}` : ''}
              </p>
            )}

            <div className="flex flex-wrap items-center justify-center gap-4 mt-2 text-xs text-muted">
              <span>{cyclesCompleted} {cyclesCompleted === 1 ? 'ciclo concluído' : 'ciclos concluídos'}</span>
              <span>·</span>
              <span>{formatDuration(totalStudiedSeconds)} estudados</span>
            </div>

            {phaseError && (
              <div className="mt-5">
                <p role="alert" className="text-sm text-danger mb-3">
                  {phase === 'focus'
                    ? 'O foco terminou, mas não foi possível confirmar a pausa. Tente sincronizar ou finalize a sessão.'
                    : 'A pausa terminou, mas não foi possível retomar o estudo. Tente sincronizar ou finalize a sessão.'}
                </p>
                <Button variant="outline" onClick={handlePhaseComplete} disabled={pendingAction !== null}>
                  Tentar sincronizar novamente
                </Button>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-3 mt-7" aria-busy={pendingAction !== null}>
              <Button
                variant="outline"
                size="lg"
                icon={manuallyPaused ? <Play size={18} /> : <Pause size={18} />}
                onClick={handleToggleManualPause}
                disabled={pendingAction !== null || phaseError}
                loading={pendingAction === 'pause'}
              >
                {manuallyPaused ? 'Retomar' : 'Pausar'}
              </Button>
              <Button variant="danger" size="lg" icon={<Square size={16} />} onClick={handleStop}
                disabled={pendingAction !== null} loading={pendingAction === 'stop'}>
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
        {historyError ? (
          <Card padding="md">
            <p role="alert" className="text-sm text-danger mb-3">Não foi possível carregar o histórico.</p>
            <Button variant="outline" onClick={() => void loadHistory()} loading={historyLoading}>Tentar novamente</Button>
          </Card>
        ) : historyLoading ? (
          <Skeleton className="h-24 w-full rounded-lg" />
        ) : history.length === 0 ? (
          <Card padding="lg">
            <EmptyState icon={Target} title="Nenhuma sessão ainda" description="Suas sessões de foco concluídas aparecem aqui." />
          </Card>
        ) : (
          <Card padding="none">
            <div className="divide-y divide-border">
              {history.slice(0, 15).map((s) => (
                <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
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
                      disabled={s.status !== 'concluida' || deletingId !== null}
                      className="p-2 text-muted hover:text-danger transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson/30 rounded"
                      aria-label={`Remover sessão ${s.task_title || s.subject_name || 'livre'} de ${new Date(s.started_at).toLocaleDateString('pt-BR')}`}
                      title={s.status !== 'concluida' ? 'Finalize a sessão antes de remover' : 'Remover sessão'}
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
