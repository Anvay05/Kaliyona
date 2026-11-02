'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const KEYFRAMES = `
@keyframes ng-node-drift { 0%, 100% { transform: translateY(0) } 50% { transform: translateY(-3px) } }
@keyframes ng-edge-flow { to { stroke-dashoffset: -24 } }
@keyframes ng-ripple { from { transform: scale(0.2); opacity: 0.9 } to { transform: scale(1); opacity: 0 } }
`;

export type NeuralGridVariant = 'lattice' | 'constellation';
const WIDTH = 1000;
const DEFAULT_RATIO = 0.4;

interface Node { id: number; nx: number; ny: number }

// deterministic in [0,1), rounded to 6dp so SSR/client markup matches
function seeded(index: number) {
  const value = Math.sin(index * 127.1 + 311.7) * 43758.5453;
  return Math.round((value - Math.floor(value)) * 1e6) / 1e6;
}

function buildNodes(variant: NeuralGridVariant): Node[] {
  if (variant === 'constellation') {
    return Array.from({ length: 42 }, (_, i) => ({
      id: i,
      nx: 0.02 + seeded(i) * 0.96,
      ny: 0.06 + seeded(i + 500) * 0.88,
    }));
  }
  const columns = 10;
  const rows = 6;
  return Array.from({ length: columns * rows }, (_, i) => {
    const col = i % columns;
    const row = Math.floor(i / columns);
    return {
      id: i,
      nx: (col + 0.5) / columns + (seeded(i) - 0.5) * 0.03,
      ny: (row + 0.5) / rows + (seeded(i + 900) - 0.5) * 0.035,
    };
  });
}

function buildEdges(nodes: Node[], height: number, maxDistance: number) {
  const edges: { from: number; to: number }[] = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dx = (nodes[i].nx - nodes[j].nx) * WIDTH;
      const dy = (nodes[i].ny - nodes[j].ny) * height;
      if (Math.hypot(dx, dy) <= maxDistance) edges.push({ from: i, to: j });
    }
  }
  return edges;
}

function Lattice({
  nodes,
  edges,
  height,
  bright,
  isDark,
}: {
  nodes: Node[];
  edges: { from: number; to: number }[];
  height: number;
  bright: boolean;
  isDark: boolean;
}) {
  const strokeColor = bright
    ? isDark
      ? 'rgba(139,124,246,0.75)'
      : 'rgba(109,88,246,0.55)'
    : isDark
    ? 'rgba(139,124,246,0.22)'
    : 'rgba(109,88,246,0.10)';
  const fillColor = bright
    ? isDark
      ? '#8b7cf6'
      : '#6d58f6'
    : isDark
    ? 'rgba(139,124,246,0.45)'
    : 'rgba(109,88,246,0.28)';

  return (
    <svg aria-hidden viewBox={`0 0 ${WIDTH} ${height}`} preserveAspectRatio="none" className="h-full w-full">
      <g stroke={strokeColor} strokeWidth={bright ? 1 : 0.7}>
        {edges.map((e, i) => (
          <line
            key={i}
            x1={nodes[e.from].nx * WIDTH} y1={nodes[e.from].ny * height}
            x2={nodes[e.to].nx * WIDTH} y2={nodes[e.to].ny * height}
            strokeDasharray={bright ? '3 5' : undefined}
            className={bright ? 'animate-[ng-edge-flow_1.6s_linear_infinite] motion-reduce:animate-none' : undefined}
          />
        ))}
      </g>
      <g fill={fillColor}>
        {nodes.map((n, i) => (
          <circle
            key={n.id}
            cx={n.nx * WIDTH} cy={n.ny * height}
            r={bright ? 2.4 : 1.5}
            className="animate-[ng-node-drift_5s_ease-in-out_infinite] motion-reduce:animate-none"
            style={{ animationDelay: `${(i % 11) * 180}ms` }}
          />
        ))}
      </g>
    </svg>
  );
}

export function NeuralGridBg({
  variant = 'constellation',
  radius = 150,
  className = '',
}: {
  variant?: NeuralGridVariant;
  radius?: number;
  className?: string;
}) {
  const stage = useRef<HTMLDivElement>(null);
  const lit = useRef<HTMLDivElement>(null);
  const ripple = useRef<HTMLDivElement>(null);
  const frame = useRef<number | null>(null);
  const [ratio, setRatio] = useState(DEFAULT_RATIO);
  const [isDark, setIsDark] = useState<boolean>(() =>
    typeof document !== 'undefined' &&
    document.documentElement.classList.contains('dark')
  );

  useEffect(() => {
    if (typeof document === 'undefined') return;
    setIsDark(document.documentElement.classList.contains('dark'));
    const obs = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const el = stage.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const obs = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect;
      if (!box || box.width === 0) return;
      setRatio(Math.round((box.height / box.width) * 50) / 50);
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const height = WIDTH * ratio;
  const nodes = useMemo(() => buildNodes(variant), [variant]);
  const edges = useMemo(
    () => buildEdges(nodes, height, variant === 'constellation' ? 150 : 120),
    [height, nodes, variant],
  );

  const onPointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const clientX = event.clientX;
    const clientY = event.clientY;
    if (frame.current !== null) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      const box = stage.current?.getBoundingClientRect();
      const layer = lit.current;
      if (!box || !layer) return;
      const mask = `radial-gradient(${radius}px circle at ${clientX - box.left}px ${clientY - box.top}px, #000 0%, rgba(0,0,0,0.5) 50%, transparent 78%)`;
      layer.style.opacity = '1';
      layer.style.webkitMaskImage = mask;
      layer.style.maskImage = mask;
    });
  }, [radius]);

  const onPointerLeave = useCallback(() => {
    if (lit.current) lit.current.style.opacity = '0';
  }, []);

  // touch ripple: flash the lit layer at the tap point, then fade
  const onPointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const box = stage.current?.getBoundingClientRect();
    const layer = lit.current;
    const rip = ripple.current;
    if (!box || !layer) return;
    const x = event.clientX - box.left;
    const y = event.clientY - box.top;
    const mask = `radial-gradient(${radius * 1.4}px circle at ${x}px ${y}px, #000 0%, rgba(0,0,0,0.5) 50%, transparent 78%)`;
    layer.style.webkitMaskImage = mask;
    layer.style.maskImage = mask;
    layer.style.opacity = '1';
    if (rip) {
      rip.style.left = `${x}px`;
      rip.style.top = `${y}px`;
      rip.style.animation = 'none';
      void rip.offsetWidth; // restart animation
      rip.style.animation = 'ng-ripple 0.7s ease-out forwards';
    }
    window.setTimeout(() => { if (lit.current) lit.current.style.opacity = '0'; }, 650);
  }, [radius]);

  return (
    <div
      ref={stage}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      onPointerDown={onPointerDown}
      aria-hidden
      className={`pointer-events-auto absolute inset-0 isolate overflow-hidden rounded-2xl ${className}`}
      style={{
        background: isDark
          ? 'linear-gradient(135deg, #13111c 0%, #11131f 45%, #17141d 100%)'
          : 'linear-gradient(135deg, #f6f4ff 0%, #f4f7ff 45%, #fdf7ee 100%)',
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />
      {/* Crisp orthogonal architectural grid layer (minor 24px + major 96px + intersection dots) */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          backgroundImage: isDark
            ? `
              linear-gradient(to right, rgba(139, 124, 246, 0.16) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(139, 124, 246, 0.16) 1px, transparent 1px),
              linear-gradient(to right, rgba(139, 124, 246, 0.28) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(139, 124, 246, 0.28) 1px, transparent 1px),
              radial-gradient(circle at 24px 24px, rgba(139, 124, 246, 0.42) 1.5px, transparent 2px)
            `
            : `
              linear-gradient(to right, rgba(108, 92, 231, 0.13) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(108, 92, 231, 0.13) 1px, transparent 1px),
              linear-gradient(to right, rgba(108, 92, 231, 0.24) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(108, 92, 231, 0.24) 1px, transparent 1px),
              radial-gradient(circle at 24px 24px, rgba(108, 92, 231, 0.35) 1.5px, transparent 2px)
            `,
          backgroundSize: '24px 24px, 24px 24px, 96px 96px, 96px 96px, 48px 48px',
        }}
      />
      {/* dim base lattice */}
      <div className="absolute inset-0 -z-10 opacity-80">
        <Lattice nodes={nodes} edges={edges} height={height} bright={false} isDark={isDark} />
      </div>
      {/* bright cursor-follow lattice */}
      <div
        ref={lit}
        className="absolute inset-0 -z-10 opacity-0 transition-opacity duration-300 ease-out motion-reduce:transition-none"
      >
        <Lattice nodes={nodes} edges={edges} height={height} bright isDark={isDark} />
      </div>
      {/* subtle center glow so text stays crisp without hiding the grid */}
      <div
        className={`pointer-events-none absolute inset-0 -z-10 ${
          isDark
            ? 'bg-[radial-gradient(80%_70%_at_50%_50%,rgba(20,20,28,0.35)_0%,transparent_80%)]'
            : 'bg-[radial-gradient(80%_70%_at_50%_50%,rgba(255,255,255,0.42)_0%,transparent_80%)]'
        }`}
      />
      {/* tap ripple ring */}
      <div
        ref={ripple}
        className="absolute -z-10 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary/50 opacity-0"
      />
    </div>
  );
}
