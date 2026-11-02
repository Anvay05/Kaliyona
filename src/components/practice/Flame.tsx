'use client';

import { useId } from 'react';
import { motion, useReducedMotion } from 'motion/react';

// Lucide 'flame' silhouette, filled with a fire gradient
const FLAME_PATH =
  'M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z';

export function Flame({
  size = 28,
  animated = true,
  variant = 'fire',
  className = '',
}: {
  size?: number;
  animated?: boolean;
  variant?: 'fire' | 'violet';
  className?: string;
}) {
  const reduce = useReducedMotion() ?? false;
  const rawId = useId();
  const id = `flame-${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const alive = animated && !reduce;
  const isViolet = variant === 'violet';

  const body = (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className="block shrink-0 drop-shadow-xs">
      <defs>
        {isViolet ? (
          <linearGradient id={`${id}-fire`} x1="12" y1="2" x2="12" y2="22" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="var(--progress-accent-teal, #38D9D0)" />
            <stop offset="0.55" stopColor="var(--progress-primary, #7B61FF)" />
            <stop offset="1" stopColor="var(--progress-primary-deep, #5B3DF5)" />
          </linearGradient>
        ) : (
          <linearGradient id={`${id}-fire`} x1="12" y1="2" x2="12" y2="22" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#fbbf24" />
            <stop offset="0.55" stopColor="#fb923c" />
            <stop offset="1" stopColor="#ea580c" />
          </linearGradient>
        )}
      </defs>
      <path d={FLAME_PATH} fill={`url(#${id}-fire)`} />
      {/* inner core, scaled down toward the base */}
      <g transform="translate(12 15.5) scale(0.5) translate(-12 -15.5)">
        <path
          d={FLAME_PATH}
          fill={isViolet ? 'var(--progress-icon-bg, #EDE9FE)' : '#fef3c7'}
          opacity="0.9"
        />
      </g>
    </svg>
  );

  if (!alive) return <span className={`relative inline-flex items-center justify-center shrink-0 ${className}`}>{body}</span>;

  return (
    <span className={`relative inline-flex ${className}`}>
      {/* glow */}
      <motion.span
        aria-hidden
        className={`absolute -inset-1.5 rounded-full blur-md ${
          isViolet ? 'bg-[var(--progress-primary)]/35' : 'bg-orange-400/40'
        }`}
        animate={{ opacity: [0.45, 0.8, 0.55, 0.75, 0.45], scale: [1, 1.12, 0.96, 1.08, 1] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.span
        className="relative inline-flex"
        style={{ transformOrigin: '50% 88%' }}
        animate={{
          rotate: [-2, 1.6, -1, 2, -2],
          scaleY: [1, 1.08, 0.95, 1.05, 1],
          scaleX: [1, 0.96, 1.04, 0.97, 1],
        }}
        transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
      >
        {body}
      </motion.span>
    </span>
  );
}
