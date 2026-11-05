import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import { MORGANA_RESTORE_EVENT, canCompanionWalk, clampCompanion, companionBounds, companionFits, companionManualBounds, companionRouteTip, companionSize, stepCompanion } from '../lib/morganaCompanion';
import type { CompanionViewport } from '../lib/morganaCompanion';

function readViewport(): CompanionViewport {
  const viewport = window.visualViewport;
  const content = document.querySelector('main')?.getBoundingClientRect();
  return {
    left: viewport?.offsetLeft ?? 0, top: viewport?.offsetTop ?? 0,
    width: viewport?.width ?? window.innerWidth, height: viewport?.height ?? window.innerHeight,
    contentLeft: content?.left ?? 0, contentTop: content?.top ?? 64,
  };
}

export function useMorganaCompanion(pathname: string, dialogOpen: boolean) {
  const [viewport, setViewport] = useState(readViewport);
  const size = companionSize(viewport);
  const bounds = companionBounds(viewport, size);
  const manualBounds = companionManualBounds(viewport, size);
  const [position, setPosition] = useState(() => ({ x: bounds.maxX, y: bounds.maxY }));
  const positionRef = useRef(position);
  positionRef.current = position;
  const [hidden, setHidden] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [focused, setFocused] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [documentHidden, setDocumentHidden] = useState(document.hidden);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [editing, setEditing] = useState(false);
  const [walking, setWalking] = useState(false);
  const [direction, setDirection] = useState<-1 | 1>(-1);
  const [tip, setTip] = useState('');
  const directionRef = useRef<-1 | 1>(-1);
  const drag = useRef<{ id: number; x: number; y: number; startX: number; startY: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const visited = useRef(new Set<string>());
  const lastTipAt = useRef(-Infinity);
  const focusMode = pathname === '/study/focus';
  const fits = companionFits(viewport, size);
  const visible = !hidden && fits;
  const allowed = canCompanionWalk({ hidden: !visible, dialogOpen, interacting: hovering || focused, dragging, documentHidden, reducedMotion, focusMode, editing, userPaused, manuallyPositioned: position.y < bounds.minY || position.y > bounds.maxY });

  useEffect(() => {
    const resize = () => setViewport(readViewport());
    const visibility = () => setDocumentHidden(document.hidden);
    const checkEditing = () => setEditing(document.activeElement instanceof HTMLElement && document.activeElement.matches('input, textarea, select, [contenteditable="true"]'));
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const changeMotion = () => setReducedMotion(motion.matches);
    const restore = () => { setHidden(false); setHovering(false); setFocused(false); setDragging(false); drag.current = null; setPosition(current => clampCompanion(current, companionManualBounds(readViewport(), companionSize(readViewport())))); };
    window.addEventListener('resize', resize);
    window.visualViewport?.addEventListener('resize', resize);
    window.visualViewport?.addEventListener('scroll', resize);
    document.addEventListener('visibilitychange', visibility);
    document.addEventListener('focusin', checkEditing);
    document.addEventListener('focusout', checkEditing);
    window.addEventListener(MORGANA_RESTORE_EVENT, restore);
    motion.addEventListener('change', changeMotion);
    const content = document.querySelector('main');
    const observer = new ResizeObserver(resize);
    if (content) observer.observe(content);
    resize();
    checkEditing();
    return () => {
      window.removeEventListener('resize', resize);
      window.visualViewport?.removeEventListener('resize', resize);
      window.visualViewport?.removeEventListener('scroll', resize);
      document.removeEventListener('visibilitychange', visibility);
      document.removeEventListener('focusin', checkEditing);
      document.removeEventListener('focusout', checkEditing);
      window.removeEventListener(MORGANA_RESTORE_EVENT, restore);
      motion.removeEventListener('change', changeMotion);
      observer.disconnect();
    };
  }, []);

  useEffect(() => { if (fits) setPosition(current => clampCompanion(current, manualBounds)); }, [fits, manualBounds.minX, manualBounds.maxX, manualBounds.minY, manualBounds.maxY]);

  useEffect(() => {
    if (dialogOpen) { setHovering(false); setFocused(false); setDragging(false); drag.current = null; }
  }, [dialogOpen]);

  useEffect(() => {
    setWalking(false);
    if (!allowed || bounds.maxX - bounds.minX < 20) return;
    let nextStart = performance.now() + 8000;
    let until = 0;
    let lastTick = performance.now();
    const timer = setInterval(() => {
      const now = performance.now();
      const elapsed = Math.min(160, now - lastTick);
      lastTick = now;
      if (now < nextStart) return;
      if (!until) { until = now + 10000; setWalking(true); }
      if (now >= until) { until = 0; nextStart = now + 26000; setWalking(false); return; }
      const step = stepCompanion(positionRef.current, directionRef.current, elapsed * .018, bounds);
      positionRef.current = step.point;
      directionRef.current = step.direction;
      setDirection(step.direction);
      setPosition(step.point);
    }, 100);
    return () => clearInterval(timer);
  }, [allowed, bounds.minX, bounds.maxX, bounds.minY, bounds.maxY]);

  useEffect(() => {
    setTip('');
    const route = pathname.split('/').filter(Boolean)[0] ?? 'dashboard';
    if (!visible || viewport.height < 500 || dialogOpen || documentHidden || focusMode || editing || userPaused || visited.current.has(route)) return;
    let dismiss: ReturnType<typeof setTimeout> | undefined;
    const timer = setTimeout(() => {
      visited.current.add(route);
      lastTipAt.current = Date.now();
      setTip(companionRouteTip(pathname));
      dismiss = setTimeout(() => setTip(''), 7500);
    }, Math.max(6500, 90000 - (Date.now() - lastTipAt.current)));
    return () => { clearTimeout(timer); clearTimeout(dismiss); };
  }, [pathname, visible, viewport.height, dialogOpen, documentHidden, focusMode, editing, userPaused]);

  const onPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0 || drag.current) return;
    suppressClick.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, startX: position.x, startY: position.y, moved: false };
  };
  const onPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const current = drag.current;
    if (!current || event.pointerId !== current.id) return;
    const dx = event.clientX - current.x;
    const dy = event.clientY - current.y;
    if (!current.moved && Math.hypot(dx, dy) < 5) return;
    current.moved = true;
    setDragging(true);
    setTip('');
    setPosition(clampCompanion({ x: current.startX + dx, y: current.startY + dy }, manualBounds));
    if (dx) { directionRef.current = dx < 0 ? -1 : 1; setDirection(directionRef.current); }
  };
  const onPointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    if (!drag.current || event.pointerId !== drag.current.id) return;
    suppressClick.current = event.type === 'pointercancel' || event.type === 'lostpointercapture' ? false : drag.current.moved;
    drag.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const moves: Record<string, { x: number; y: number }> = { ArrowLeft: { x: -24, y: 0 }, ArrowRight: { x: 24, y: 0 }, ArrowUp: { x: 0, y: -24 }, ArrowDown: { x: 0, y: 24 } };
    const move = moves[event.key];
    if (!move && event.key !== 'Home') return;
    event.preventDefault();
    setPosition(current => event.key === 'Home' ? { x: bounds.maxX, y: bounds.maxY } : clampCompanion({ x: current.x + move.x, y: current.y + move.y }, manualBounds));
    if (move?.x) { directionRef.current = move.x < 0 ? -1 : 1; setDirection(directionRef.current); }
    setTip('');
  };

  return {
    position, size, visible, walking, direction, dragging, userPaused, tip,
    tipWidth: Math.min(260, viewport.width - 24),
    tipBelow: position.y - viewport.top < 167,
    tipLeft: Math.max(viewport.left + 12, Math.min(viewport.left + viewport.width - Math.min(260, viewport.width - 24) - 12, position.x + size / 2 - Math.min(260, viewport.width - 24) / 2)) - position.x,
    dismissTip: () => setTip(''), togglePaused: () => setUserPaused(value => !value),
    hide: () => { setHidden(true); setTip(''); setFocused(false); setHovering(false); setDragging(false); drag.current = null; },
    setHovering, setFocused, onPointerDown, onPointerMove, onPointerUp, onKeyDown,
    allowClick: () => { const allowedClick = !suppressClick.current; suppressClick.current = false; return allowedClick; },
  };
}
