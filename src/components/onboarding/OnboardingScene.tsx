'use client';

import { motion, useReducedMotion } from 'motion/react';

const CHIPS: { word: string; top: string; left: string; delay: number }[] = [
  { word: 'ನಮಸ್ಕಾರ', top: '19%', left: '8%', delay: 0 },
  { word: 'ಸ್ವಲ್ಪ', top: '15%', left: '66%', delay: 0.9 },
  { word: 'ಬೆಂಗಳೂರು', top: '42%', left: '66%', delay: 1.8 },
];

export function OnboardingScene({ mode }: { mode: 'hero' | 'compact' }) {
  const reduce = useReducedMotion() ?? false;
  const hero = mode === 'hero';

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden bg-gradient-to-br from-[#ddd4ff] via-[#f1ecff] via-[54%] to-[#ffe6ce]"
    >
      {/* Large soft blurred decorative blobs with very slow drift (allowed on onboarding only) */}
      <motion.div
        aria-hidden
        className="absolute -left-24 -top-20 h-96 w-96 rounded-full bg-[#6c5ce7]/28 blur-3xl"
        animate={reduce ? undefined : { x: [0, 22, 0], y: [0, 14, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        aria-hidden
        className="absolute -right-24 top-1/4 h-96 w-96 rounded-full bg-[#9b8cff]/30 blur-3xl"
        animate={reduce ? undefined : { x: [0, -20, 0], y: [0, -16, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        aria-hidden
        className="absolute -bottom-24 left-1/4 h-96 w-96 rounded-full bg-[#ffcda3]/45 blur-3xl"
        animate={reduce ? undefined : { x: [0, 16, 0], y: [0, -12, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* top-left brand lockup */}
      <div className="glass-soft !rounded-full absolute left-5 top-5 flex items-center gap-2 px-3 py-1.5">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/90 p-1 shadow-2xs">
          <img
            src="/assets/logo-icon.webp"
            alt="Kaliyona logo"
            width={24}
            height={24}
            loading="eager"
            className="h-6 w-6 object-contain"
          />
        </span>
        <span className="text-[15px] font-extrabold tracking-tight text-neutral-900">
          Kaliyona
        </span>
      </div>

      {/* Anna avatar — centered hero object on step 0, compact header badge on steps 1–5 */}
      <motion.div
        className="absolute left-1/2 -translate-x-1/2"
        initial={false}
        animate={{ top: hero ? '22%' : '8%', scale: hero ? 1 : 0.62 }}
        transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 120, damping: 20 }}
      >
        <div className="relative">
          {/* soft halo — tinted primary/violet */}
          <div className="absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/65 blur-3xl" />
          <div className="absolute left-1/2 top-1/2 h-44 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/25 blur-2xl" />

          {/* avatar with frosted glass ring + bob */}
          <motion.div
            animate={reduce ? undefined : { y: [0, -7, 0] }}
            transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut' }}
            className="glass-strong !rounded-full relative h-32 w-32 overflow-hidden p-1.5 ring-4 ring-white/75"
          >
            <img
              src="/assets/logo-icon.webp"
              alt="Anna — your Kannada voice buddy"
              width={128}
              height={128}
              loading="eager"
              fetchPriority="high"
              className="h-full w-full rounded-full object-cover bg-white/90"
            />
          </motion.div>

          {/* tiny online dot */}
          <span className="absolute bottom-1.5 right-1.5 h-4 w-4 rounded-full border-2 border-white bg-emerald-500" />
        </div>
      </motion.div>

      {/* floating Kannada chips — hero only so they never crowd the sheet */}
      {hero &&
        CHIPS.map((c) => (
          <motion.span
            key={c.word}
            style={{ top: c.top, left: c.left }}
            animate={reduce ? undefined : { y: [0, -6, 0] }}
            transition={{ duration: 4.5, repeat: Infinity, delay: c.delay, ease: 'easeInOut' }}
            className="glass-soft !rounded-full absolute px-3.5 py-1.5 text-[13px] font-bold text-neutral-900"
          >
            {c.word}
          </motion.span>
        ))}
    </div>
  );
}
