'use client';

/**
 * GoalTaskList — animated task rows for My Goals.
 * Tick sequence: check draws → strike sweeps the label → row
 * nudge-flicks → settles and glides to the bottom. Untick reverses
 * the same road. prefers-reduced-motion collapses it all to instant.
 */

import { useState } from 'react';
import type { ComponentProps, CSSProperties, ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion, type Transition } from 'motion/react';
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/** App primary (violet). If tailwind primary differs, update this hex. */
export const GOAL_ACCENT = '#6C5CE7';

const EASE_OUT = [0.22, 1, 0.36, 1] as const;
const EASE_IN_OUT = [0.65, 0, 0.35, 1] as const;

const POP_SCALE = [1, 1.08, 1];
const FLICK = [0, 8, -2, 0];
const FLICK_TIMES = [0, 0.35, 0.7, 1];

const FILL: Transition = { duration: 0.24, ease: EASE_OUT };
const POP: Transition = { duration: 0.34, ease: EASE_OUT, times: [0, 0.4, 1] };
const TICK: Transition = { duration: 0.22, ease: EASE_OUT, delay: 0.06 };
const STRIKE: Transition = { duration: 0.38, ease: EASE_IN_OUT };
const NUDGE: Transition = { duration: 0.3, ease: EASE_OUT, times: FLICK_TIMES };
const REORDER: Transition = { type: 'spring', stiffness: 320, damping: 30 };
const INSTANT: Transition = { duration: 0 };

// dashes divide the circumference, so the ring closes without a seam
const RING_R = 11;
const RING_DASH = `1 ${(2 * Math.PI * RING_R) / 13 - 1}`;

// the strike rides on the text itself, so wrapped labels get a line per row
const STRIKE_STYLE: CSSProperties = {
  backgroundImage: 'linear-gradient(currentColor, currentColor)',
  backgroundRepeat: 'no-repeat',
  backgroundPosition: '0 52%',
  boxDecorationBreak: 'clone',
  WebkitBoxDecorationBreak: 'clone',
};

const SIZES = {
  sm: { row: 'gap-2.5 rounded-xl px-3 py-2', check: 'h-5 w-5', text: 'text-[13px] leading-5', line: '1.5px', list: 'gap-1.5' },
  md: { row: 'gap-3 rounded-[14px] px-3.5 py-2.5', check: 'h-6 w-6', text: 'text-[15px] leading-6', line: '2px', list: 'gap-2' },
  lg: { row: 'gap-3.5 rounded-2xl px-4 py-3', check: 'h-7 w-7', text: 'text-[17px] leading-7', line: '2.5px', list: 'gap-2.5' },
} as const;

export type TaskSize = keyof typeof SIZES;

const STAGE = {
  idle: 'idle', tick: 'tick', strike: 'strike', nudge: 'nudge',
  settled: 'settled', unstrike: 'unstrike', untick: 'untick',
} as const;
type Stage = (typeof STAGE)[keyof typeof STAGE];

const FILLED: Stage[] = ['tick', 'strike', 'nudge', 'settled', 'unstrike'];
const STRUCK: Stage[] = ['strike', 'nudge', 'settled'];

const ACCENT_VAR = '--task-accent';
const CARD =
  'bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_3px_10px_rgba(0,0,0,0.06)] hover:shadow-[0_1px_2px_rgba(0,0,0,0.05),0_6px_18px_rgba(0,0,0,0.09)] active:brightness-95';
const FOCUS = `outline-none focus-visible:ring-2 focus-visible:ring-[var(${ACCENT_VAR})] focus-visible:ring-offset-2`;

function useTiming() {
  const reduced = useReducedMotion() ?? false;
  return (transition: Transition) => (reduced ? INSTANT : transition);
}

function TaskCheck({ filled, size, onDrawn }: { filled: boolean; size: TaskSize; onDrawn: () => void }) {
  const timing = useTiming();
  return (
    <motion.svg
      viewBox="0 0 24 24"
      aria-hidden
      className={cn('mt-0.5 shrink-0 text-neutral-300', SIZES[size].check)}
      initial={false}
      animate={{ scale: filled ? POP_SCALE : 1 }}
      transition={filled ? timing(POP) : INSTANT}
    >
      <motion.circle cx="12" cy="12" r={RING_R} fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeDasharray={RING_DASH} initial={false}
        animate={{ opacity: filled ? 0 : 1 }} transition={timing(FILL)} />
      <motion.circle cx="12" cy="12" r="12" fill={`var(${ACCENT_VAR})`}
        style={{ transformBox: 'view-box', transformOrigin: '12px 12px' }} initial={false}
        animate={{ scale: filled ? 1 : 0 }} transition={timing(FILL)} />
      <motion.path d="M7.4 12.4 10.6 15.5 16.6 8.9" fill="none" stroke="white" strokeWidth="2.2"
        strokeLinecap="round" strokeLinejoin="round" initial={false}
        animate={{ pathLength: filled ? 1 : 0, opacity: filled ? 1 : 0 }}
        transition={timing(TICK)} onAnimationComplete={onDrawn} />
    </motion.svg>
  );
}

function TaskLabel({ label, struck, size, onStruck }: { label: string; struck: boolean; size: TaskSize; onStruck: () => void }) {
  const timing = useTiming();
  const { text, line } = SIZES[size];
  return (
    <motion.span
      style={STRIKE_STYLE}
      className={cn('block font-medium tracking-[-0.01em] transition-colors duration-300', text,
        struck ? 'text-neutral-400' : 'text-neutral-800')}
      initial={false}
      animate={{ backgroundSize: `${struck ? 100 : 0}% ${line}` }}
      transition={timing(STRIKE)}
      onAnimationComplete={onStruck}
    >
      {label}
    </motion.span>
  );
}

export type GoalTaskItemProps = Omit<ComponentProps<'button'>, 'onAnimationStart' | 'onDrag' | 'onDragStart' | 'onDragEnd'> & {
  label: string;
  checked?: boolean;
  size?: TaskSize;
  accent?: string;
  /** Rendered under the label, inside the same flex-1 column */
  meta?: ReactNode;
  onCheckedChange?: (checked: boolean) => void;
  onSettled?: () => void;
  onReverted?: () => void;
};

export function GoalTaskItem({
  label, checked = false, size = 'md', accent = GOAL_ACCENT, meta,
  onCheckedChange, onSettled, onReverted, className, onClick, style, ...props
}: GoalTaskItemProps) {
  const timing = useTiming();
  const done = checked;
  const [stage, setStage] = useState<Stage>(done ? STAGE.settled : STAGE.idle);
  const [was, setWas] = useState(done);

  // turn around in the same render the tick flips, so the row never paints stale
  if (was !== done) {
    setWas(done);
    setStage(done ? STAGE.tick : STAGE.unstrike);
  }

  const onDrawn = () => {
    if (stage === STAGE.tick) setStage(STAGE.strike);
    if (stage === STAGE.untick) { setStage(STAGE.idle); onReverted?.(); }
  };
  const onStruck = () => {
    if (stage === STAGE.strike) setStage(STAGE.nudge);
    if (stage === STAGE.unstrike) setStage(STAGE.untick);
  };
  const onFlicked = () => {
    if (stage !== STAGE.nudge) return;
    setStage(STAGE.settled);
    onSettled?.();
  };

  return (
    <motion.button
      type="button"
      role="checkbox"
      aria-checked={done}
      data-slot="goal-task-item"
      data-state={done ? 'checked' : 'unchecked'}
      style={{ [ACCENT_VAR]: accent, ...style } as CSSProperties}
      onClick={(event) => { onClick?.(event); onCheckedChange?.(!done); }}
      animate={{ x: stage === STAGE.nudge ? FLICK : 0 }}
      transition={stage === STAGE.nudge ? timing(NUDGE) : INSTANT}
      onAnimationComplete={onFlicked}
      className={cn(
        'flex w-full max-w-full cursor-pointer items-start text-left transition-[filter,box-shadow] duration-300',
        SIZES[size].row, CARD, FOCUS, className,
      )}
      {...props}
    >
      <TaskCheck filled={FILLED.includes(stage)} size={size} onDrawn={onDrawn} />
      <span className="min-w-0 flex-1">
        <TaskLabel label={label} struck={STRUCK.includes(stage)} size={size} onStruck={onStruck} />
        {meta}
      </span>
    </motion.button>
  );
}

export type GoalTask = { id: string; label: string; done?: boolean; meta?: ReactNode };

export type GoalTaskListProps = Omit<ComponentProps<'ul'>, 'onChange'> & {
  tasks: GoalTask[];
  size?: TaskSize;
  accent?: string;
  onTasksChange?: (tasks: GoalTask[]) => void;
  onDeleteTask?: (id: string) => void;
};

export function GoalTaskList({
  tasks, size = 'md', accent, onTasksChange, onDeleteTask, className, ...props
}: GoalTaskListProps) {
  const timing = useTiming();
  const [parked, setParked] = useState<string[]>(() => tasks.filter((t) => t.done).map((t) => t.id));
  const [announcement, setAnnouncement] = useState('');

  const toggle = (task: GoalTask, done: boolean) => {
    const next = tasks.map((item) => (item.id === task.id ? { ...item, done } : item));
    onTasksChange?.(next);
    setAnnouncement(`${task.label} ${done ? 'completed' : 'reopened'}`);
  };

  // a parked row that is no longer done, or gone, was changed from outside
  const finished = parked
    .map((id) => tasks.find((task) => task.id === id))
    .filter((task): task is GoalTask => task?.done === true);
  const open = tasks.filter((task) => !finished.includes(task));

  return (
    <ul data-slot="goal-task-list"
      className={cn('flex w-full max-w-full flex-col items-stretch', SIZES[size].list, className)}
      {...props}
    >
      <AnimatePresence initial={false}>
        {[...open, ...finished].map((task) => (
          <motion.li
            key={task.id}
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15 } }}
            transition={timing(REORDER)}
            className="relative max-w-full"
          >
            <GoalTaskItem
              label={task.label}
              checked={!!task.done}
              size={size}
              accent={accent}
              meta={task.meta}
              onCheckedChange={(done) => toggle(task, done)}
              onSettled={() => setParked((ids) => (ids.includes(task.id) ? ids : [...ids, task.id]))}
              onReverted={() => setParked((ids) => ids.filter((id) => id !== task.id))}
              className={onDeleteTask ? 'pr-11' : undefined}
            />
            {onDeleteTask && (
              <button
                type="button"
                aria-label={`Delete ${task.label}`}
                onClick={() => onDeleteTask(task.id)}
                className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-red-600"
              >
                <Trash2 size={15} />
              </button>
            )}
          </motion.li>
        ))}
      </AnimatePresence>
      <li role="status" aria-live="polite" className="sr-only">{announcement}</li>
    </ul>
  );
}
