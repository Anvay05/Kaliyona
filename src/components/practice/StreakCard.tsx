'use client';

import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Lock, X } from 'lucide-react';
import { Flame } from './Flame';
import { getStreakInfo, onStreakChange, type StreakInfo } from '@/lib/streak';

const ANNA_ROUTE = '/anna';

function openTalkToAnna() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('kaliyona:open-anna'));
  try {
    window.history.pushState({}, '', ANNA_ROUTE);
  } catch {
    // Ignore history restriction in sandboxed environments
  }
}

function SlotIcon({
  state,
  isProgress = false,
}: {
  state: StreakInfo['slots'][number]['state'];
  isProgress?: boolean;
}) {
  if (state === 'active') return <Flame size={22} variant={isProgress ? 'violet' : 'fire'} />;
  if (state === 'today-active') {
    return (
      <motion.span
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 420, damping: 18 }}
        className="inline-flex"
      >
        <Flame size={24} variant={isProgress ? 'violet' : 'fire'} />
      </motion.span>
    );
  }
  if (state === 'missed') {
    return (
      <span
        className={`flex h-7 w-7 items-center justify-center rounded-full ${
          isProgress ? 'bg-white/20' : 'bg-neutral-100'
        }`}
      >
        <X
          size={15}
          strokeWidth={2.5}
          className={isProgress ? 'text-white/70' : 'text-neutral-300'}
        />
      </span>
    );
  }
  if (state === 'today-pending') {
    return (
      <span
        className={`h-7 w-7 animate-pulse rounded-full border-2 ${
          isProgress
            ? 'border-[var(--progress-accent-teal)] bg-[var(--progress-accent-teal)]/25'
            : 'border-sky-400 bg-sky-100'
        }`}
      />
    );
  }
  // future
  return (
    <span
      className={`flex h-7 w-7 items-center justify-center rounded-full ${
        isProgress ? 'bg-white/15' : 'bg-neutral-100'
      }`}
    >
      <Lock
        size={13}
        className={isProgress ? 'text-white/65' : 'text-neutral-400'}
      />
    </span>
  );
}

export function StreakCard({
  variant = 'default',
}: {
  variant?: 'default' | 'progress';
} = {}) {
  const reduce = useReducedMotion() ?? false;
  const [info, setInfo] = useState<StreakInfo | null>(null);
  const isProgress = variant === 'progress';

  useEffect(() => {
    setInfo(getStreakInfo());
    return onStreakChange(() => setInfo(getStreakInfo()));
  }, []);

  if (!info) {
    return (
      <div
        className={
          isProgress
            ? 'h-44 animate-pulse rounded-[22px]'
            : 'glass-soft h-44 animate-pulse'
        }
        style={
          isProgress
            ? {
                background: 'var(--progress-gradient)',
                boxShadow: 'var(--progress-card-shadow)',
              }
            : undefined
        }
      />
    );
  }

  const empty = info.streak === 0;

  if (isProgress) {
    return (
      <motion.div
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
        animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
        style={{
          background: 'var(--progress-gradient)',
          boxShadow: 'var(--progress-card-shadow)',
        }}
        className="relative overflow-hidden flex w-full flex-col gap-3.5 rounded-[22px] px-5 py-5 text-white"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-white/15 blur-2xl"
        />
        {empty ? (
          <div className="relative z-10 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-xs">
                <Flame size={30} variant="violet" />
              </div>
              <div className="min-w-0">
                <span className="block text-[10px] font-semibold uppercase tracking-wider text-white/80">
                  DAILY FITNESS STREAK
                </span>
                <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
                  Let the fire begin!
                </h3>
                <p className="text-xs leading-snug text-white/85">
                  Chat with Anna today to light your first streak day.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={openTalkToAnna}
              className="shrink-0 cursor-pointer rounded-full bg-white px-4 py-2.5 text-xs font-bold text-[var(--progress-primary-deep)] transition-all hover:brightness-105 active:scale-95 shadow-xs"
            >
              Start now
            </button>
          </div>
        ) : (
          <>
            <div className="relative z-10 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-xs">
                  <Flame size={28} variant="violet" />
                </div>
                <div>
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-white/80">
                    ACTIVE LEARNING STREAK
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight tabular-nums">
                    {info.streak}-day streak!
                  </h3>
                  <p className="text-xs leading-tight text-white/85 mt-0.5">
                    Chat with <span className="font-bold text-white">Anna</span> or finish a goal to keep it lit
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={openTalkToAnna}
                className="shrink-0 cursor-pointer rounded-full bg-white px-4 py-2.5 text-xs font-bold text-[var(--progress-primary-deep)] transition-all hover:brightness-105 active:scale-95 shadow-xs"
              >
                Talk to Anna
              </button>
            </div>

            {/* Compact horizontal 6-day strip */}
            <div className="relative z-10 grid grid-cols-6 gap-1.5 rounded-2xl bg-white/15 backdrop-blur-xs px-3 py-2.5 border border-white/20">
              {info.slots.map((slot) => (
                <div key={slot.iso} className="flex flex-col items-center gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white/85">
                    {slot.label}
                  </span>
                  <span className="flex h-7 items-center justify-center">
                    <SlotIcon state={slot.state} isProgress />
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
      animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
      className="glass-tinted flex w-full flex-col gap-2.5 px-4 py-3.5"
    >
      {empty ? (
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Flame size={36} />
            <div className="min-w-0">
              <h3 className="text-base font-extrabold tracking-tight text-neutral-900">
                Let the fire begin!
              </h3>
              <p className="text-xs leading-snug text-neutral-500">
                Chat with Anna today to light your first flame.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={openTalkToAnna}
            className="shrink-0 cursor-pointer rounded-full bg-primary px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-primary/90 shadow-xs"
          >
            Start now
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Flame size={26} />
              <div>
                <h3 className="text-lg sm:text-xl font-extrabold tracking-tight text-neutral-900 leading-tight">
                  {info.streak}-day streak!
                </h3>
                <p className="text-[11px] leading-tight text-neutral-500">
                  Chat with <span className="font-semibold text-primary">Anna</span> or finish a goal to keep it lit
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={openTalkToAnna}
              className="shrink-0 cursor-pointer rounded-full bg-primary px-4 py-2.5 text-xs font-bold text-white transition-all hover:brightness-105 active:scale-95 shadow-xs"
            >
              Talk to Anna
            </button>
          </div>

          {/* Compact horizontal 6-day strip */}
          <div className="grid grid-cols-6 gap-1.5 rounded-xl bg-white/95 px-2.5 py-2 shadow-[0_1px_2px_rgba(0,0,0,0.03)] border border-indigo-100/80">
            {info.slots.map((slot) => (
              <div key={slot.iso} className="flex flex-col items-center gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                  {slot.label}
                </span>
                <span className="flex h-6 items-center justify-center">
                  <SlotIcon state={slot.state} />
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </motion.div>
  );
}
