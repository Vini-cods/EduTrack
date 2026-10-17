import { useEffect, useId, useRef } from 'react';

const leftCubes = [[45, 335, 2.2], [185, 390, 2.5], [310, 345, 1.1], [245, 220, 1.25], [80, 160, .8], [180, 80, .55]];
const rightCubes = [[325, 335, 2.1], [170, 320, 1.5], [245, 165, .85], [50, 400, 1.7], [345, 95, .55]];
const nodes = [[60, 220], [170, 150], [275, 195], [350, 130], [110, 450], [240, 410], [300, 540], [1210, 300], [1310, 370], [1270, 485], [1110, 510], [1010, 730], [1080, 800], [1130, 680]];
const stars = [[35, 100], [195, 62], [380, 280], [280, 370], [90, 720], [400, 680], [550, 100], [690, 160], [840, 60], [1010, 120], [1170, 195], [1360, 70], [1360, 250], [1160, 370], [1100, 600], [970, 875], [750, 810], [500, 850], [920, 370], [540, 520], [810, 650], [340, 90], [1250, 860], [1410, 440]];

function Cube({ x, y, scale, index }: { x: number; y: number; scale: number; index: number }) {
  return <g transform={'translate(' + x + ' ' + y + ') scale(' + scale + ')'}>
    <g className="auth-backdrop-cube" style={{ animationDelay: -(index * 1.3) + 's' }}>
      <polygon className="auth-backdrop-cube-top" points="0,-34 32,-17 0,0 -32,-17" />
      <polygon className="auth-backdrop-cube-left" points="-32,-17 0,0 0,38 -32,21" />
      <polygon className="auth-backdrop-cube-right" points="0,0 32,-17 32,21 0,38" />
    </g>
  </g>;
}

/** Decorative SVG only. Pointer motion runs on demand and never changes the form. */
export function AuthBackdrop() {
  const root = useRef<HTMLDivElement>(null);
  const patternId = useId();

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
    let frame = 0;
    let x = 0;
    let y = 0;
    const reset = () => {
      cancelAnimationFrame(frame); frame = 0;
      root.current?.style.removeProperty('--auth-shift-x');
      root.current?.style.removeProperty('--auth-shift-y');
    };
    const move = (event: PointerEvent) => {
      if (reduced.matches || !fine.matches) return;
      x = (event.clientX / window.innerWidth - .5) * 12;
      y = (event.clientY / window.innerHeight - .5) * 10;
      if (!frame) frame = requestAnimationFrame(() => {
        root.current?.style.setProperty('--auth-shift-x', x + 'px');
        root.current?.style.setProperty('--auth-shift-y', y + 'px');
        frame = 0;
      });
    };
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('blur', reset);
    reduced.addEventListener('change', reset);
    fine.addEventListener('change', reset);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('blur', reset);
      reduced.removeEventListener('change', reset);
      fine.removeEventListener('change', reset);
      cancelAnimationFrame(frame);
    };
  }, []);

  return <div ref={root} className="auth-backdrop" aria-hidden="true">
    <svg className="auth-backdrop-scene" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" focusable="false">
      <defs><pattern id={patternId} width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r="1.8" /></pattern></defs>
      <g className="auth-backdrop-matrix" fill={'url(#' + patternId + ')'}>
        <rect x="520" y="0" width="225" height="100" /><rect x="0" y="300" width="145" height="165" /><rect x="1305" y="175" width="135" height="155" />
      </g>
      <g className="auth-backdrop-stars">{stars.map(([x, y], index) => <circle key={index} cx={x} cy={y} r={index % 3 === 0 ? 2 : 1.2} />)}</g>
      <g className="auth-backdrop-network">
        <path d="M60 220 170 150 275 195 350 130 M110 450 240 410 300 540 M1210 300 1310 370 1270 485 1110 510 M1010 730 1080 800 1130 680" />
        {nodes.map(([x, y], index) => <circle key={index} cx={x} cy={y} r={index % 4 === 0 ? 3 : 2} />)}
      </g>
      <Cube x={1240} y={105} scale={.7} index={11} />
    </svg>
    <svg className="auth-backdrop-corner auth-backdrop-corner-left" viewBox="0 0 380 400" focusable="false">
      {leftCubes.map(([x, y, scale], index) => <Cube key={index} x={x} y={y} scale={scale} index={index} />)}
    </svg>
    <svg className="auth-backdrop-corner auth-backdrop-corner-right" viewBox="0 0 380 400" focusable="false">
      {rightCubes.map(([x, y, scale], index) => <Cube key={index} x={x} y={y} scale={scale} index={index + 6} />)}
    </svg>
  </div>;
}
