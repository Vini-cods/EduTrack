import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  DEFAULT_POMODORO_CONFIG as config,
  normalizePomodoroConfig,
  nextPhase,
  phaseDurationSeconds,
  createPomodoroTimer,
  remainingTimerMilliseconds,
  pausePomodoroTimer,
  resumePomodoroTimer,
  restorePomodoroTimer,
  loadPomodoroConfig,
  savePomodoroConfig,
  loadPomodoroTimer,
  savePomodoroTimer,
  clearPomodoroTimer,
  confirmSessionMutation,
  formatClock,
  formatDuration,
} from '../src/lib/pomodoro.ts';

test('configuração rejeita dados inválidos e limita durações sem perder preferências válidas', () => {
  assert.deepEqual(normalizePomodoroConfig(null), config);
  assert.deepEqual(normalizePomodoroConfig({
    focusMinutes: Infinity,
    shortBreakMinutes: 'cinco',
    longBreakMinutes: -2,
    cyclesUntilLongBreak: 0,
  }), config);
  assert.deepEqual(normalizePomodoroConfig({ focusMinutes: 300, shortBreakMinutes: 7.8, cyclesUntilLongBreak: 99 }), {
    ...config, focusMinutes: 180, shortBreakMinutes: 7, cyclesUntilLongBreak: 12,
  });
});

test('pausa longa só acontece após o número configurado de focos', () => {
  assert.equal(nextPhase('focus', 1, config), 'short_break');
  assert.equal(nextPhase('focus', 4, config), 'long_break');
  assert.equal(nextPhase('focus', 0, config), 'short_break');
  assert.equal(nextPhase('long_break', 4, config), 'focus');
  assert.equal(nextPhase('short_break', 1, config), 'focus');
  assert.equal(phaseDurationSeconds('focus', config), 1500);
});

test('deadline acompanha o tempo real mesmo sem callbacks intermediários', () => {
  const timer = createPomodoroTimer(12, 'focus', 0, config, 1000);
  assert.equal(remainingTimerMilliseconds(timer, 1000 + 60_000), 24 * 60_000);
  assert.equal(remainingTimerMilliseconds(timer, 1000 + 90 * 60_000), 0);
});

test('pausar e retomar preserva frações de segundo e exclui o tempo pausado', () => {
  const timer = createPomodoroTimer(12, 'focus', 0, config, 1000);
  const paused = pausePomodoroTimer(timer, 1750);
  assert.equal(paused.remainingMs, 1_499_250);
  assert.equal(remainingTimerMilliseconds(paused, 99_000), 1_499_250);
  const resumed = resumePomodoroTimer(paused, 99_000);
  assert.equal(remainingTimerMilliseconds(resumed, 99_750), 1_498_500);
  assert.equal(resumed.manuallyPaused, false);
});

test('recarregar preserva fase, ciclos e andamento da pausa automática', () => {
  const timer = createPomodoroTimer(12, 'long_break', 4, config, 1000);
  const restored = restorePomodoroTimer(JSON.parse(JSON.stringify(timer)), 12, 'pausada', config, 61_000);
  assert.equal(restored.phase, 'long_break');
  assert.equal(restored.cyclesCompleted, 4);
  assert.equal(restored.manuallyPaused, false);
  assert.equal(remainingTimerMilliseconds(restored, 61_000), 14 * 60_000);
});

test('recarregar preserva pausa manual, inclusive durante uma pausa Pomodoro', () => {
  const timer = pausePomodoroTimer(createPomodoroTimer(12, 'short_break', 2, config, 1000), 61_000);
  const restored = restorePomodoroTimer(timer, 12, 'pausada', config, 3_600_000);
  assert.equal(restored.manuallyPaused, true);
  assert.equal(remainingTimerMilliseconds(restored, 3_600_000), 4 * 60_000);
});

test('snapshot de outra sessão ou inválido nunca recupera ciclos de outro usuário', () => {
  const other = createPomodoroTimer(99, 'long_break', 20, config, 1000);
  const restored = restorePomodoroTimer(other, 12, 'em_andamento', config, 10_000);
  assert.equal(restored.sessionId, 12);
  assert.equal(restored.phase, 'focus');
  assert.equal(restored.cyclesCompleted, 0);
  assert.equal(restorePomodoroTimer({ ...other, sessionId: 12, remainingMs: NaN }, 12, 'pausada', config, 10_000).manuallyPaused, true);
  const inconsistent = { ...other, sessionId: 12, phase: 'focus', deadline: null, manuallyPaused: false };
  const fresh = restorePomodoroTimer(inconsistent, 12, 'em_andamento', config, 10_000);
  assert.equal(fresh.cyclesCompleted, 0);
  assert.equal(remainingTimerMilliseconds(fresh, 70_000), 24 * 60_000);
});

test('estado confirmado pelo servidor prevalece sobre snapshot incompatível', () => {
  const breakTimer = createPomodoroTimer(12, 'short_break', 2, config, 1000);
  const running = restorePomodoroTimer(breakTimer, 12, 'em_andamento', config, 61_000);
  assert.equal(running.phase, 'focus');
  assert.equal(running.cyclesCompleted, 2);
  const focus = createPomodoroTimer(12, 'focus', 2, config, 1000);
  const paused = restorePomodoroTimer(focus, 12, 'pausada', config, 61_000);
  assert.equal(paused.manuallyPaused, true);
  assert.equal(paused.remainingMs, 24 * 60_000);
});

test('storage indisponível e JSON corrompido têm fallback funcional', () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  try {
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('indisponível'); } });
    assert.deepEqual(loadPomodoroConfig(), config);
    assert.doesNotThrow(() => savePomodoroConfig(config));
    assert.doesNotThrow(() => savePomodoroTimer(createPomodoroTimer(12, 'focus', 0, config, 1000)));
    assert.doesNotThrow(clearPomodoroTimer);
    assert.equal(loadPomodoroTimer(12, 'pausada', config, 1000).manuallyPaused, true);
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => '{invalid' } });
    assert.deepEqual(loadPomodoroConfig(), config);
    assert.equal(loadPomodoroTimer(12, 'em_andamento', config, 1000).phase, 'focus');
  } finally {
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous);
    else delete globalThis.localStorage;
  }
});

test('resposta perdida de pause/stop é confirmada sem repetir a mutação', async () => {
  for (const status of ['pausada', 'concluida']) {
    let mutations = 0;
    const result = await confirmSessionMutation(12, status, async () => {
      mutations += 1;
      throw new Error('resposta perdida');
    }, async () => ({ id: 12, status }));
    assert.equal(result.status, status);
    assert.equal(mutations, 1);
  }
});

test('falha real de finalização permanece falha e permite preservar sessão local', async () => {
  const original = new Error('offline');
  for (const recovered of [null, { id: 99, status: 'concluida' }, { id: 12, status: 'em_andamento' }]) {
    await assert.rejects(confirmSessionMutation(12, 'concluida', async () => { throw original; }, async () => recovered),
      (error) => error === original);
  }
  await assert.rejects(confirmSessionMutation(12, 'concluida', async () => { throw original; }, async () => { throw new Error('offline também'); }),
    (error) => error === original);
});

test('formatação evita tempos negativos e valores não finitos', () => {
  assert.equal(formatClock(3661), '1:01:01');
  assert.equal(formatClock(-10), '00:00');
  assert.equal(formatClock(NaN), '00:00');
  assert.equal(formatDuration(Infinity), '0s');
  assert.equal(formatDuration(4800), '1h 20min');
});
