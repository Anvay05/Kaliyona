'use client';

import { useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowLeft, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { OnboardingScene } from './OnboardingScene';
import { completeOnboarding, type OnboardingData } from '@/lib/onboarding';
import { playTactileTone } from '../../data/kanglishData';

const LEVELS = [
  { id: 'new', label: "I'm starting fresh", sub: 'No Kannada yet — perfect!' },
  { id: 'basics', label: 'I know a few words', sub: 'Swalpa swalpa...' },
  { id: 'conversations', label: 'I can hold conversations', sub: 'Polish my fluency' },
] as const;

const LEARNING_STYLES = [
  { id: 'voice', label: 'Speaking out loud with Anna', sub: 'Hands-free voice & pronunciation', emoji: '🎙️' },
  { id: 'flashcards', label: 'Visual flashcards & scratch cards', sub: 'Quick memory & daily streaks', emoji: '🃏' },
  { id: 'roleplay', label: 'Real-life street roleplays', sub: 'Waiter, ticket conductor & auto chats', emoji: '🎭' },
  { id: 'mixed', label: 'A mix of everything', sub: 'Best all-round Bengaluru fluency', emoji: '⚡' },
] as const;

const GOALS = [
  { id: 'order_food', label: 'Order food & coffee', emoji: '☕' },
  { id: 'autos_buses', label: 'Talk in autos & buses', emoji: '🛺' },
  { id: 'friends', label: 'Chat with Bengaluru friends', emoji: '💬' },
  { id: 'work', label: 'Use Kannada at work', emoji: '💼' },
  { id: 'travel', label: 'Travel across Karnataka', emoji: '🧭' },
] as const;

const MINUTES = [
  { id: '5', label: '5 min', sub: 'Light & easy' },
  { id: '10', label: '10 min', sub: 'Steady learner' },
  { id: '15', label: '15 min', sub: 'Serious mode' },
] as const;

const BUILD_STEPS = [
  'Saving your goal',
  'Tuning everyday Bengaluru phrases…',
  'Picking your first flashcards',
  'Waking Anna up',
  'Polishing your scratch cards',
];

type Draft = Omit<OnboardingData, 'completedAt'>;
// Step 0 = Hero
// Step 1 = Name
// Step 2 = Kannada Level
// Step 3 = Learning Style
// Step 4 = Daily Minutes
// Step 5 = First Goal
// Step 6 = Building plan
const QUESTION_COUNT = 5;
const TOTAL = QUESTION_COUNT + 2; // 7 total states (0..6)

export function OnboardingFlow({ onDone }: { onDone: () => void }) {
  const reduce = useReducedMotion() ?? false;
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>({
    name: '',
    level: 'new',
    learningStyle: 'mixed',
    goal: '',
    minutes: '5',
    location: 'Bengaluru, Karnataka',
  });
  const [buildIdx, setBuildIdx] = useState(0);

  const canContinue = useMemo(() => {
    if (step === 1) return draft.name.trim().length >= 2;
    if (step === 5) return draft.goal !== '';
    return true;
  }, [step, draft]);

  const next = () => {
    if (!canContinue) return;
    playTactileTone('tap');
    if (step === QUESTION_COUNT) {
      setStep(TOTAL - 1);
      let i = 0;
      const t = setInterval(() => {
        i++;
        setBuildIdx(i);
        playTactileTone('select');
        if (i >= BUILD_STEPS.length) {
          clearInterval(t);
          playTactileTone('celebrate');
          completeOnboarding({
            ...draft,
            name: draft.name.trim(),
            location: 'Bengaluru, Karnataka',
            completedAt: new Date().toISOString(),
          });
          setTimeout(onDone, 450);
        }
      }, 650);
      return;
    }
    setStep((s) => s + 1);
  };

  const slide = reduce
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -12 } };

  const isHero = step === 0;

  const dots = (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: QUESTION_COUNT }).map((_, i) => {
        const activeQuestionIdx = Math.max(0, Math.min(step - 1, QUESTION_COUNT - 1));
        const isCurrent = step > 0 && i === activeQuestionIdx;
        const isCompleted = step > 0 && i < activeQuestionIdx;
        return (
          <span
            key={i}
            className={`h-1.5 rounded-full transition-all ${
              isCurrent
                ? 'w-6 bg-primary'
                : isCompleted
                ? 'w-2.5 bg-primary/55'
                : 'w-1.5 bg-neutral-400/50'
            }`}
          />
        );
      })}
    </div>
  );

  const cta = (
    <button
      type="button"
      onClick={next}
      disabled={!canContinue}
      className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-primary py-4 text-[15px] font-bold text-white shadow-lg shadow-primary/25 transition hover:brightness-105 active:scale-[0.99] disabled:bg-neutral-200 disabled:text-neutral-400 disabled:shadow-none touch-manipulation"
    >
      {isHero
        ? 'Start my journey'
        : step === QUESTION_COUNT
        ? 'Build my Kannada plan'
        : 'Continue'}
      <ArrowRight size={16} />
    </button>
  );

  const back = step > 0 && step < TOTAL - 1 && (
    <button
      type="button"
      onClick={() => {
        playTactileTone('tap');
        setStep((s) => s - 1);
      }}
      className="flex cursor-pointer items-center justify-center gap-1.5 py-1 text-[13px] font-medium text-neutral-500 transition hover:text-neutral-800 touch-manipulation"
    >
      <ArrowLeft size={14} /> Back
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <OnboardingScene mode={isHero ? 'hero' : 'compact'} />

      {/* STEP 0 — full-bleed hero, glass panel pinned to bottom */}
      {isHero && (
        <div className="relative z-10 mx-auto flex h-full w-full max-w-md flex-col justify-end px-5 pb-8">
          <motion.div
            {...slide}
            transition={{ duration: 0.3 }}
            className="glass-strong p-6 sm:p-7"
          >
            <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary mb-3">
              <Sparkles size={12} />
              <span>Personalised Setup · 5 Steps</span>
            </div>
            <h1 className="text-[32px] font-extrabold leading-[1.1] tracking-tight text-neutral-900">
              Learn Kannada,
              <br />
              <span className="text-primary">the Bengaluru way</span>
            </h1>
            <p className="mt-2.5 text-[14px] leading-relaxed text-neutral-700">
              Scratch cards, real street phrases, and Anna — your voice buddy. Answer 5 quick questions to customize your journey.
            </p>
            <div className="mt-5 mb-4">{dots}</div>
            {cta}
          </motion.div>
        </div>
      )}

      {/* STEPS 1..6 — frosted glass bottom sheet over compact gradient header */}
      {!isHero && (
        <div className="relative z-10 flex h-full w-full flex-col justify-end sm:justify-center sm:px-4">
          <motion.div
            initial={reduce ? false : { y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            className="glass-strong mx-auto flex max-h-[84vh] w-full max-w-md flex-col overflow-y-auto !rounded-b-none sm:!rounded-b-[24px] px-6 pb-8 pt-6"
          >
            <div className="mb-4 flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-primary">
                {step <= QUESTION_COUNT
                  ? `Question ${step} of ${QUESTION_COUNT}`
                  : 'Ready to launch'}
              </span>
              {dots}
            </div>

            <AnimatePresence mode="wait">
              <motion.div key={step} {...slide} transition={{ duration: 0.22 }} className="flex flex-col">
                {step === 1 && (
                  <>
                    <h2 className="text-[24px] font-extrabold tracking-tight text-neutral-900">
                      What should we call you?
                    </h2>
                    <p className="mt-1 text-[13px] text-neutral-600">
                      Anna will greet you by name during practice sessions.
                    </p>
                    <input
                      autoFocus
                      value={draft.name}
                      onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                      onKeyDown={(e) => e.key === 'Enter' && next()}
                      placeholder="Your first name"
                      className="glass-soft mt-4 w-full px-4 py-3.5 text-[15px] font-medium text-neutral-900 placeholder:text-neutral-500 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </>
                )}

                {step === 2 && (
                  <>
                    <h2 className="text-[24px] font-extrabold tracking-tight text-neutral-900">
                      {draft.name.trim() || 'Hey'}, how much Kannada do you know?
                    </h2>
                    <div className="mt-4 flex flex-col gap-2.5">
                      {LEVELS.map((l) => (
                        <button
                          key={l.id}
                          type="button"
                          onClick={() => {
                            playTactileTone('select');
                            setDraft((d) => ({ ...d, level: l.id }));
                          }}
                          className={`cursor-pointer px-4 py-3.5 text-left transition touch-manipulation ${
                            draft.level === l.id
                              ? 'glass-tinted !border-primary ring-2 ring-primary/20'
                              : 'glass-soft glass-interactive'
                          }`}
                        >
                          <span className="block text-[14px] font-bold text-neutral-900">{l.label}</span>
                          <span className="block text-[12px] text-neutral-600">{l.sub}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {step === 3 && (
                  <>
                    <h2 className="text-[24px] font-extrabold tracking-tight text-neutral-900">
                      How do you like to practice?
                    </h2>
                    <div className="mt-4 flex flex-col gap-2">
                      {LEARNING_STYLES.map((style) => (
                        <button
                          key={style.id}
                          type="button"
                          onClick={() => {
                            playTactileTone('select');
                            setDraft((d) => ({ ...d, learningStyle: style.id }));
                          }}
                          className={`flex cursor-pointer items-center gap-3 px-4 py-3 text-left transition touch-manipulation ${
                            draft.learningStyle === style.id
                              ? 'glass-tinted !border-primary ring-2 ring-primary/20'
                              : 'glass-soft glass-interactive'
                          }`}
                        >
                          <span className="text-[20px] shrink-0">{style.emoji}</span>
                          <div className="min-w-0">
                            <span className="block text-[14px] font-bold text-neutral-900">
                              {style.label}
                            </span>
                            <span className="block text-[12px] text-neutral-600">
                              {style.sub}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {step === 4 && (
                  <>
                    <h2 className="text-[24px] font-extrabold tracking-tight text-neutral-900">
                      How much time daily?
                    </h2>
                    <div className="mt-4 grid grid-cols-3 gap-2.5">
                      {MINUTES.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            playTactileTone('select');
                            setDraft((d) => ({ ...d, minutes: m.id }));
                          }}
                          className={`cursor-pointer px-3 py-4 text-center transition touch-manipulation ${
                            draft.minutes === m.id
                              ? 'glass-tinted !border-primary ring-2 ring-primary/20'
                              : 'glass-soft glass-interactive'
                          }`}
                        >
                          <span className="block text-[18px] font-extrabold text-neutral-900 tabular-nums">{m.label}</span>
                          <span className="block text-[11px] font-medium text-neutral-600 mt-0.5">{m.sub}</span>
                        </button>
                      ))}
                    </div>
                    <p className="mt-3 text-[12px] font-medium text-neutral-600">This keeps your streak flame alive 🔥</p>
                  </>
                )}

                {step === 5 && (
                  <>
                    <h2 className="text-[24px] font-extrabold tracking-tight text-neutral-900">
                      What&apos;s your first goal?
                    </h2>
                    <div className="mt-4 flex flex-col gap-2">
                      {GOALS.map((g) => (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => {
                            playTactileTone('select');
                            setDraft((d) => ({ ...d, goal: g.id }));
                          }}
                          className={`flex cursor-pointer items-center gap-3 px-4 py-3 text-left transition touch-manipulation ${
                            draft.goal === g.id
                              ? 'glass-tinted !border-primary ring-2 ring-primary/20'
                              : 'glass-soft glass-interactive'
                          }`}
                        >
                          <span className="text-[18px]">{g.emoji}</span>
                          <span className="text-[14px] font-semibold text-neutral-900">{g.label}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {step === TOTAL - 1 && (
                  <>
                    <h2 className="text-[24px] font-extrabold tracking-tight text-neutral-900">
                      Building your plan…
                    </h2>
                    <div className="mt-4 flex flex-col gap-2.5">
                      {BUILD_STEPS.map((s, i) => (
                        <div
                          key={s}
                          className="glass-soft flex items-center gap-3 px-4 py-3"
                        >
                          {i < buildIdx ? (
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-white">
                              ✓
                            </span>
                          ) : i === buildIdx ? (
                            <Loader2 size={18} className="animate-spin text-primary" />
                          ) : (
                            <span className="h-5 w-5 rounded-full border border-neutral-300" />
                          )}
                          <span
                            className={`text-[13px] font-semibold ${
                              i <= buildIdx ? 'text-neutral-900' : 'text-neutral-500'
                            }`}
                          >
                            {s}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </motion.div>
            </AnimatePresence>

            {step < TOTAL - 1 && (
              <div className="mt-6 flex flex-col gap-3">
                {cta}
                {back}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}
