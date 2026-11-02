'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Sparkles } from 'lucide-react';

const REVEAL_RATIO = 0.14;
const BRUSH = 68;
const MAX_STROKES_TO_REVEAL = 16;

// ----------------------------------------------------------------
// FOIL THEMES — each card gets ONE theme (seeded), not a rainbow
// ----------------------------------------------------------------
type Texture = 'stars' | 'confetti' | 'rays' | 'bubbles' | 'hearts' | 'waves';

interface FoilTheme {
  name: string;
  stops: [string, string];          // base gradient, 2 tones of one hue
  sheen: string;                    // diagonal highlight band
  ink: string;                      // etched doodle + texture color
  accentText: string;               // hint label color
  texture: Texture;
  doodles: string[];
}

const THEMES: FoilTheme[] = [
  {
    name: 'indigo',
    stops: ['#c7d2fe', '#a5b4fc'],
    sheen: 'rgba(255,255,255,0.55)',
    ink: 'rgba(67, 56, 202, 0.30)',
    accentText: 'text-indigo-600',
    texture: 'stars',
    doodles: ['ಬ', '★', '☕', '✦'],
  },
  {
    name: 'rose',
    stops: ['#fbcfe8', '#f9a8d4'],
    sheen: 'rgba(255,255,255,0.5)',
    ink: 'rgba(190, 24, 93, 0.26)',
    accentText: 'text-pink-600',
    texture: 'confetti',
    doodles: ['✿', '♥', 'ಬ', '★'],
  },
  {
    name: 'amber',
    stops: ['#fde68a', '#fcd34d'],
    sheen: 'rgba(255,255,255,0.55)',
    ink: 'rgba(180, 83, 9, 0.26)',
    accentText: 'text-amber-600',
    texture: 'rays',
    doodles: ['☀', 'ಬ', '☕', '🛺'],
  },
  {
    name: 'mint',
    stops: ['#a7f3d0', '#6ee7b7'],
    sheen: 'rgba(255,255,255,0.5)',
    ink: 'rgba(4, 120, 87, 0.26)',
    accentText: 'text-emerald-600',
    texture: 'bubbles',
    doodles: ['✿', 'ಬ', '○', '♪'],
  },
  {
    name: 'violet',
    stops: ['#ddd6fe', '#c4b5fd'],
    sheen: 'rgba(255,255,255,0.55)',
    ink: 'rgba(109, 40, 217, 0.28)',
    accentText: 'text-violet-600',
    texture: 'hearts',
    doodles: ['♥', '✦', 'ಬ', '★'],
  },
  {
    name: 'sky',
    stops: ['#bae6fd', '#7dd3fc'],
    sheen: 'rgba(255,255,255,0.5)',
    ink: 'rgba(3, 105, 161, 0.26)',
    accentText: 'text-sky-600',
    texture: 'waves',
    doodles: ['☁', 'ಬ', '🚌', '♪'],
  },
];

// deterministic theme pick from the seed (same card → same theme)
function themeFor(seed: string): FoilTheme {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return THEMES[Math.abs(hash) % THEMES.length];
}

// small seeded PRNG so textures don't jump on re-renders
function mulberry32(a: number) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Particle { x: number; y: number; vx: number; vy: number; life: number; hue: number; }

export interface ScratchCardProps {
  children: ReactNode;
  className?: string;
  ariaLabel: string;
  revealAnnouncement: string;
  onReveal?: () => void;
  /** stable per-card seed (e.g. phrase id) — picks theme + texture */
  seedKey?: string;
}

type StampedCanvas = HTMLCanvasElement & { __painted?: string };

export function ScratchCard({ children, className = '', ariaLabel, revealAnnouncement, onReveal, seedKey = 'default' }: ScratchCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const strokes = useRef(0);
  const revealedRef = useRef(false);
  const [revealed, setRevealed] = useState(false);
  const [started, setStarted] = useState(false);
  const [foilReady, setFoilReady] = useState(false);
  const particles = useRef<Particle[]>([]);
  const rafRef = useRef<number>(0);
  const fxCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const fxCanvasRef = useRef<HTMLCanvasElement>(null);

  const theme = themeFor(seedKey);

  // ---- Paint foil: solid base + gradient + TEXTURE + doodles (cached per canvas element) ----
  useEffect(() => {
    const canvas = canvasRef.current as StampedCanvas | null;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const paintFoil = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;

      const cacheKey = `${seedKey}:${w}x${h}`;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // FIX 1: Track paint state per canvas element + verify top-left pixel alpha > 0
      if (canvas.__painted === cacheKey && canvas.width > 0 && canvas.height > 0) {
        try {
          const alpha = ctx.getImageData(0, 0, 2, 2).data[3];
          if (alpha > 0) {
            setFoilReady(true);
            return;
          }
        } catch {
          // Proceed to full repaint if getImageData fails
        }
      }

      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // FIX 5: Resize safety — reset composite operation and alpha at start of every paint
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, w, h);

      // FIX 2: Fully opaque solid base coat before gradient
      ctx.fillStyle = theme.stops[1];
      ctx.fillRect(0, 0, w, h);

      const rand = mulberry32(seedKey.split('').reduce((a, c) => a + c.charCodeAt(0), 7));

      // base — two tones of the theme hue
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, theme.stops[0]);
      g.addColorStop(1, theme.stops[1]);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      // diagonal sheen band
      const band = ctx.createLinearGradient(0, 0, w, h * 0.7);
      band.addColorStop(0, 'rgba(255,255,255,0)');
      band.addColorStop(0.45, theme.sheen);
      band.addColorStop(0.55, theme.sheen);
      band.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = band;
      ctx.fillRect(0, 0, w, h);

      // ---- ETCHED GRID PATTERN ON FOIL ----
      ctx.save();
      ctx.strokeStyle = theme.ink;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.55;
      const gridStep = 24;
      ctx.beginPath();
      for (let gx = gridStep; gx < w; gx += gridStep) {
        ctx.moveTo(gx + 0.5, 0);
        ctx.lineTo(gx + 0.5, h);
      }
      for (let gy = gridStep; gy < h; gy += gridStep) {
        ctx.moveTo(0, gy + 0.5);
        ctx.lineTo(w, gy + 0.5);
      }
      ctx.stroke();

      // Subtle crosshair ticks at every 2nd grid intersection
      ctx.globalAlpha = 0.85;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      for (let gx = gridStep * 2; gx < w; gx += gridStep * 2) {
        for (let gy = gridStep * 2; gy < h; gy += gridStep * 2) {
          ctx.moveTo(gx - 3, gy);
          ctx.lineTo(gx + 3, gy);
          ctx.moveTo(gx, gy - 3);
          ctx.lineTo(gx, gy + 3);
        }
      }
      ctx.stroke();
      ctx.restore();

      // ---- TEXTURE per theme ----
      ctx.strokeStyle = theme.ink;
      ctx.fillStyle = theme.ink;
      if (theme.texture === 'stars') {
        // tiny 4-point sparkle field
        for (let i = 0; i < (w * h) / 900; i++) {
          const x = rand() * w, y = rand() * h, s = 2 + rand() * 3;
          ctx.beginPath();
          ctx.moveTo(x, y - s); ctx.lineTo(x + s * 0.35, y - s * 0.35);
          ctx.lineTo(x + s, y); ctx.lineTo(x + s * 0.35, y + s * 0.35);
          ctx.lineTo(x, y + s); ctx.lineTo(x - s * 0.35, y + s * 0.35);
          ctx.lineTo(x - s, y); ctx.lineTo(x - s * 0.35, y - s * 0.35);
          ctx.closePath(); ctx.fill();
        }
      } else if (theme.texture === 'confetti') {
        for (let i = 0; i < (w * h) / 700; i++) {
          const x = rand() * w, y = rand() * h, a = rand() * Math.PI;
          ctx.save(); ctx.translate(x, y); ctx.rotate(a);
          ctx.fillRect(-2.5, -1, 5, 2);
          ctx.restore();
        }
      } else if (theme.texture === 'rays') {
        // retro sunburst from top-left corner
        ctx.lineWidth = 2;
        for (let a = 0; a < Math.PI / 2; a += Math.PI / 18) {
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(a) * (w + h), Math.sin(a) * (w + h));
          ctx.stroke();
        }
      } else if (theme.texture === 'bubbles') {
        for (let i = 0; i < (w * h) / 1400; i++) {
          const x = rand() * w, y = rand() * h, r = 3 + rand() * 9;
          ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
        }
      } else if (theme.texture === 'hearts') {
        const heart = (x: number, y: number, s: number) => {
          ctx.beginPath();
          ctx.moveTo(x, y + s * 0.35);
          ctx.bezierCurveTo(x - s, y - s * 0.5, x - s * 0.4, y - s * 1.1, x, y - s * 0.4);
          ctx.bezierCurveTo(x + s * 0.4, y - s * 1.1, x + s, y - s * 0.5, x, y + s * 0.35);
          ctx.fill();
        };
        for (let i = 0; i < (w * h) / 1600; i++) heart(rand() * w, rand() * h, 5 + rand() * 4);
      } else if (theme.texture === 'waves') {
        ctx.lineWidth = 1.6;
        for (let y = 10; y < h; y += 22) {
          ctx.beginPath();
          for (let x = 0; x <= w; x += 6) {
            const yy = y + Math.sin(x / 14) * 4;
            if (x === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
          }
          ctx.stroke();
        }
      }

      // etched doodles — erase with the foil
      const cols = Math.max(2, Math.floor(w / 90));
      const rows = Math.max(2, Math.floor(h / 70));
      let n = 0;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const d = theme.doodles[n % theme.doodles.length];
          const x = (c + 0.5) * (w / cols) + (rand() - 0.5) * 22;
          const y = (r + 0.5) * (h / rows) + (rand() - 0.5) * 16;
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate((rand() - 0.5) * 0.7);
          ctx.font = `${d === 'ಬ' ? 26 : 20}px system-ui, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = theme.ink;
          ctx.fillText(d, 0, 0);
          ctx.restore();
          n++;
        }
      }

      // FIX 3: Switch to destination-out ONLY as the final statement of the paint block
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      canvas.__painted = cacheKey;
      setFoilReady(true);
    };

    paintFoil();

    if (typeof ResizeObserver === 'undefined') return;
    const obs = new ResizeObserver(() => {
      if (!revealedRef.current && !started) {
        paintFoil();
      }
    });
    obs.observe(container);
    return () => obs.disconnect();
  }, [seedKey, theme, started]);

  // ---- Sparkle FX loop ----
  useEffect(() => {
    const fx = fxCanvasRef.current;
    const container = containerRef.current;
    if (!fx || !container) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    fx.width = container.clientWidth * dpr;
    fx.height = container.clientHeight * dpr;
    fxCtxRef.current = fx.getContext('2d');
    fxCtxRef.current?.scale(dpr, dpr);

    const tick = () => {
      const ctx = fxCtxRef.current;
      if (ctx) {
        ctx.clearRect(0, 0, fx.width, fx.height);
        particles.current = particles.current.filter((p) => p.life > 0);
        for (const p of particles.current) {
          p.x += p.vx; p.y += p.vy; p.vy += 0.08; p.life -= 0.035;
          ctx.globalAlpha = Math.max(p.life, 0);
          ctx.fillStyle = `hsl(${p.hue} 85% 45%)`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 2.2 * Math.max(p.life, 0.2), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const reveal = useCallback(() => {
    if (revealedRef.current) return;
    revealedRef.current = true;
    setRevealed(true);
    onReveal?.();
  }, [onReveal]);

  const checkRatio = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let cleared = 0, total = 0;
    for (let i = 3; i < data.length; i += 4 * 16) {
      total++;
      if (data[i] < 128) cleared++;
    }
    if (cleared / total >= REVEAL_RATIO) reveal();
  }, [reveal]);

  const spawnSparkles = (x: number, y: number) => {
    // sparkle hue matches the theme's base color for a cohesive feel
    const baseHue: Record<string, number> = {
      indigo: 235, rose: 330, amber: 42, mint: 160, violet: 262, sky: 200,
    };
    const hue = (baseHue[theme.name] ?? 260) + (Math.random() * 30 - 15);
    for (let i = 0; i < 3; i++) {
      particles.current.push({
        x, y,
        vx: (Math.random() - 0.5) * 2.4,
        vy: -Math.random() * 1.8 - 0.4,
        life: 0.8 + Math.random() * 0.4,
        hue,
      });
    }
    if (particles.current.length > 90) particles.current.splice(0, particles.current.length - 90);
  };

  const scratchLine = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    ctx.lineWidth = BRUSH;
    ctx.beginPath();
    if (last.current) { ctx.moveTo(last.current.x, last.current.y); ctx.lineTo(x, y); }
    else { ctx.moveTo(x, y); ctx.lineTo(x + 0.1, y + 0.1); }
    ctx.stroke();
    last.current = { x, y };
    spawnSparkles(x, y);
    strokes.current++;
    if (strokes.current >= MAX_STROKES_TO_REVEAL) {
      reveal();
    } else if (strokes.current % 4 === 0) {
      checkRatio();
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative isolate overflow-hidden rounded-2xl border border-neutral-200 bg-white ${className}`}
    >
      {/* Built-in architectural grid background for the revealed scratch card */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-2xl"
      >
        <div
          className="absolute inset-0 opacity-75"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(108, 92, 231, 0.14) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(108, 92, 231, 0.14) 1px, transparent 1px),
              radial-gradient(circle at 24px 24px, rgba(108, 92, 231, 0.28) 1.25px, transparent 1.5px)
            `,
            backgroundSize: '24px 24px, 24px 24px, 48px 48px',
          }}
        />
      </div>

      {/* FIX 4: Defensive render guard + isolated stacking so children never sit above the foil */}
      <div className={`relative z-10 isolate ${foilReady ? '' : 'opacity-0'}`} aria-hidden={!foilReady}>
        {children}
      </div>
      <canvas
        ref={canvasRef}
        role="button"
        tabIndex={revealed ? -1 : 0}
        aria-label={ariaLabel}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setStarted(true); reveal(); }
        }}
        onPointerDown={(e) => {
          if (revealed || !e.isPrimary) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          drawing.current = true;
          last.current = null;
          setStarted(true);
          scratchLine(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => { if (drawing.current && !revealed) scratchLine(e.clientX, e.clientY); }}
        onPointerUp={() => { drawing.current = false; last.current = null; checkRatio(); }}
        onPointerCancel={() => { drawing.current = false; last.current = null; }}
        className={`absolute inset-0 z-20 h-full w-full cursor-crosshair outline-none transition-opacity duration-200 focus-visible:ring-2 focus-visible:ring-primary/40 ${
          revealed ? 'pointer-events-none opacity-0' : 'opacity-100'
        }`}
        style={{ touchAction: 'none' }}
      />
      <canvas
        ref={fxCanvasRef}
        aria-hidden
        className={`pointer-events-none absolute inset-0 z-20 h-full w-full transition-opacity duration-300 ${
          revealed ? 'opacity-0' : 'opacity-100'
        }`}
      />
      {!revealed && (
        <div
          className={`pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-1.5 transition-opacity duration-300 ${
            started ? 'opacity-0' : 'opacity-100'
          }`}
        >
          <Sparkles size={18} className={theme.accentText} />
          <span className={`text-[11px] font-semibold uppercase tracking-widest ${theme.accentText}`}>
            Scratch to reveal
          </span>
        </div>
      )}
      <span role="status" aria-live="polite" className="sr-only">
        {revealed ? revealAnnouncement : ''}
      </span>
    </div>
  );
}
