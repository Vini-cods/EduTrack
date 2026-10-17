import { useEffect, useRef } from 'react';
import './AuthNetwork.css';

type Particle = { x: number; y: number; vx: number; vy: number; radius: number };

function createParticle(width: number, height: number): Particle {
  const angle = Math.random() * Math.PI * 2;
  const speed = 8 + Math.random() * 4;
  return {
    x: Math.random() * width,
    y: Math.random() * height,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    radius: 1.2 + Math.random() * .6,
  };
}

/** A decorative network: independent particles connect only while close together. */
export function AuthNetwork() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const particles: Particle[] = [];
    let width = 0;
    let height = 0;
    let distance = 180;
    let color = getComputedStyle(canvas).color;
    let frame = 0;
    let lastPaint = 0;
    let disposed = false;

    const draw = () => {
      context.clearRect(0, 0, width, height);
      context.strokeStyle = color;
      context.fillStyle = color;
      context.lineWidth = .8;
      for (let i = 0; i < particles.length; i++) {
        const a = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j];
          const separation = Math.hypot(a.x - b.x, a.y - b.y);
          if (separation >= distance) continue;
          context.globalAlpha = (1 - separation / distance) * .38;
          context.beginPath();
          context.moveTo(a.x, a.y);
          context.lineTo(b.x, b.y);
          context.stroke();
        }
        context.globalAlpha = .72;
        context.beginPath();
        context.arc(a.x, a.y, a.radius, 0, Math.PI * 2);
        context.fill();
      }
      context.globalAlpha = 1;
    };

    const resize = () => {
      const nextWidth = canvas.clientWidth;
      const nextHeight = canvas.clientHeight;
      if (!nextWidth || !nextHeight) return;
      for (const particle of particles) {
        particle.x *= nextWidth / width;
        particle.y *= nextHeight / height;
      }
      width = nextWidth;
      height = nextHeight;
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      const count = width < 640 ? 18 : Math.min(36, Math.max(24, Math.round(width * height / 32000)));
      particles.length = Math.min(particles.length, count);
      while (particles.length < count) particles.push(createParticle(width, height));
      distance = width < 640 ? 150 : Math.min(200, Math.max(170, width * .16));
      draw();
    };

    const animate = (time: number) => {
      frame = 0;
      if (disposed || document.hidden || reduced.matches) return;
      if (!lastPaint || time - lastPaint >= 1000 / 30) {
        const delta = lastPaint ? Math.min((time - lastPaint) / 1000, .05) : 0;
        lastPaint = time;
        for (const particle of particles) {
          particle.x += particle.vx * delta;
          particle.y += particle.vy * delta;
          if (particle.x < 0 || particle.x > width) particle.vx *= -1;
          if (particle.y < 0 || particle.y > height) particle.vy *= -1;
          particle.x = Math.max(0, Math.min(width, particle.x));
          particle.y = Math.max(0, Math.min(height, particle.y));
        }
        draw();
      }
      frame = requestAnimationFrame(animate);
    };

    const syncMotion = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      lastPaint = 0;
      draw();
      if (!document.hidden && !reduced.matches) frame = requestAnimationFrame(animate);
    };

    const resizeObserver = new ResizeObserver(resize);
    const themeObserver = new MutationObserver(() => {
      color = getComputedStyle(canvas).color;
      draw();
    });
    resize();
    resizeObserver.observe(canvas);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    reduced.addEventListener('change', syncMotion);
    document.addEventListener('visibilitychange', syncMotion);
    window.addEventListener('resize', resize);
    syncMotion();

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      themeObserver.disconnect();
      reduced.removeEventListener('change', syncMotion);
      document.removeEventListener('visibilitychange', syncMotion);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={ref} className="auth-network" aria-hidden="true" />;
}
