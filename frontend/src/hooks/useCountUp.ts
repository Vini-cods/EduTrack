import { useEffect, useRef, useState } from 'react';

/**
 * Anima um número contando do valor atual até `value`.
 *
 * Por que não uma lib de animação para isso? Contagem de número é uma
 * interpolação simples (easing + requestAnimationFrame resolve bem),
 * então uma lib como Anime.js seria peso extra sem necessidade real aqui.
 *
 * Respeita `prefers-reduced-motion`: quando ativo, define o valor final
 * imediatamente, sem animar.
 */
export function useCountUp(value: number, durationMs = 700): number {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) {
      setDisplay(value);
      fromRef.current = value;
      return;
    }

    const from = fromRef.current;
    const to = value;
    if (from === to) return;

    const start = performance.now();
    const easeOutQuint = (t: number) => 1 - Math.pow(1 - t, 5);

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / durationMs, 1);
      const eased = easeOutQuint(progress);
      const current = from + (to - from) * eased;
      setDisplay(Math.round(current));

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
      }
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, durationMs]);

  return display;
}
