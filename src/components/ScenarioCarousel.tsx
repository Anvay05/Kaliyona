import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, Volume2, X } from 'lucide-react';
import type { ScenarioCard } from '../data/scenarios';
import { speakScript } from '../voice/anna-mouth';
import { playTactileTone } from '../data/kanglishData';

export interface ScenarioCarouselProps {
  cards: ScenarioCard[];
  autoPlay?: boolean;
  onStartScenario?: (card: ScenarioCard) => void;
}

const SPRING_TRANSITION = {
  type: 'spring' as const,
  bounce: 0.2,
  duration: 0.6,
};

const REDUCED_MOTION_TRANSITION = {
  type: 'tween' as const,
  duration: 0.15,
};

export const ScenarioCarousel: React.FC<ScenarioCarouselProps> = ({
  cards,
  autoPlay = false,
  onStartScenario,
}) => {
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [phrasesSheetCard, setPhrasesSheetCard] = useState<ScenarioCard | null>(
    null
  );
  const [speakingPhraseKey, setSpeakingPhraseKey] = useState<string | null>(
    null
  );
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(
    () =>
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  const sheetRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };
    mq.addEventListener?.('change', handleChange);
    return () => mq.removeEventListener?.('change', handleChange);
  }, []);

  // Optional autoPlay support (always disabled when autoPlay={false} or prefersReducedMotion)
  useEffect(() => {
    if (!autoPlay || prefersReducedMotion || cards.length === 0) return;
    const timer = window.setInterval(() => {
      setActiveCardId((prev) => {
        if (!prev) return cards[0].id;
        const idx = cards.findIndex((c) => c.id === prev);
        return cards[(idx + 1) % cards.length].id;
      });
    }, 4500);
    return () => window.clearInterval(timer);
  }, [autoPlay, prefersReducedMotion, cards]);

  // Focus Phrases sheet on open and listen for Escape key
  useEffect(() => {
    if (!phrasesSheetCard) return;

    const focusTimer = window.setTimeout(() => {
      sheetRef.current?.focus();
    }, 20);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setPhrasesSheetCard(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [phrasesSheetCard]);

  const activeCard = cards.find((c) => c.id === activeCardId) || null;
  const remainingCards = activeCard
    ? cards.filter((c) => c.id !== activeCard.id)
    : cards;

  const transition = prefersReducedMotion
    ? REDUCED_MOTION_TRANSITION
    : SPRING_TRANSITION;

  const handleToggleCard = useCallback((id: string) => {
    playTactileTone('tap');
    setActiveCardId((prev) => (prev === id ? null : id));
  }, []);

  const handleCollapse = useCallback(() => {
    playTactileTone('tap');
    setActiveCardId(null);
  }, []);

  const handleSpeakPhrase = useCallback((key: string, script: string) => {
    playTactileTone('tap');
    setSpeakingPhraseKey(key);
    void speakScript(script, {
      character: 'anna',
      itemId: key,
      onStart: () => setSpeakingPhraseKey(key),
      onEnd: () =>
        setSpeakingPhraseKey((cur) => (cur === key ? null : cur)),
      onUnsupported: () => setSpeakingPhraseKey(null),
    });
  }, []);

  return (
    <div className="relative w-full bg-transparent select-none">
      {/* Subtle click-away backdrop when a card is expanded */}
      <AnimatePresence>
        {activeCard && (
          <motion.div
            key="scenario-expanded-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={handleCollapse}
            aria-hidden="true"
            className="fixed inset-0 z-20 bg-black/5"
          />
        )}
      </AnimatePresence>

      <div className="relative z-30 flex flex-col gap-3.5">
        {/* EXPANDED HERO CARD ON TOP */}
        <AnimatePresence mode="popLayout">
          {activeCard && (
            <motion.div
              key={`expanded-${activeCard.id}`}
              layout={!prefersReducedMotion}
              layoutId={
                prefersReducedMotion
                  ? undefined
                  : `scenario-card-${activeCard.id}`
              }
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={transition}
              onClick={handleCollapse}
              style={{ backgroundColor: activeCard.color }}
              className="relative w-full rounded-[32px] p-5 sm:p-6 text-white shadow-lg cursor-pointer overflow-hidden"
            >
              {/* Top Row: Icon + Collapse indicator */}
              <div className="flex items-start justify-between gap-3">
                <motion.div
                  layout={!prefersReducedMotion}
                  layoutId={
                    prefersReducedMotion
                      ? undefined
                      : `scenario-icon-${activeCard.id}`
                  }
                  transition={transition}
                  className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0"
                >
                  <activeCard.icon
                    className="w-6 h-6 text-white"
                    aria-hidden="true"
                  />
                </motion.div>

                <span
                  aria-hidden="true"
                  className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white shrink-0"
                >
                  <X className="w-4 h-4" />
                </span>
              </div>

              {/* Title + Tagline */}
              <div className="mt-4 space-y-1">
                <motion.h3
                  layout={!prefersReducedMotion}
                  layoutId={
                    prefersReducedMotion
                      ? undefined
                      : `scenario-title-${activeCard.id}`
                  }
                  transition={transition}
                  className="font-display font-bold text-xl sm:text-2xl text-white leading-tight"
                >
                  {activeCard.title}
                </motion.h3>
                <motion.p
                  layout={!prefersReducedMotion}
                  layoutId={
                    prefersReducedMotion
                      ? undefined
                      : `scenario-tagline-${activeCard.id}`
                  }
                  transition={transition}
                  className="text-sm text-white/90 font-medium"
                >
                  {activeCard.tagline}
                </motion.p>
              </div>

              {/* Anna Opener Preview */}
              <div className="mt-4 rounded-2xl bg-black/15 px-4 py-3 space-y-1 border border-white/15">
                <p className="text-xs font-semibold text-white/80 uppercase tracking-wider">
                  Anna starts with:
                </p>
                <p className="text-sm sm:text-base font-bold text-white leading-snug">
                  {activeCard.annaOpener.script}
                </p>
                <p className="text-xs sm:text-sm font-medium text-white/95">
                  &ldquo;{activeCard.annaOpener.kanglish}&rdquo;
                </p>
                <p className="text-xs text-white/75">
                  {activeCard.annaOpener.english}
                </p>
              </div>

              {/* Expanded Card Action Buttons */}
              <div className="mt-5 flex items-center gap-3">
                <button
                  type="button"
                  aria-label={`Start ${activeCard.title} conversation with Anna`}
                  onClick={(e) => {
                    e.stopPropagation();
                    playTactileTone('tap');
                    onStartScenario?.(activeCard);
                  }}
                  className="flex-1 h-11 px-4 rounded-2xl bg-white text-[var(--ink)] font-display font-bold text-sm inline-flex items-center justify-center gap-1.5 shadow-sm hover:opacity-95 active:scale-[0.99] transition-all cursor-pointer"
                >
                  <span>Start ▶</span>
                </button>

                <button
                  type="button"
                  aria-label={`View key phrases for ${activeCard.title}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    playTactileTone('tap');
                    setPhrasesSheetCard(activeCard);
                  }}
                  className="flex-1 h-11 px-4 rounded-2xl bg-white/20 hover:bg-white/30 border border-white/30 text-white font-display font-bold text-sm inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <span>Phrases</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* MINI CARDS GRID: 2x2 when no card is active, 3-col below when one is expanded */}
        <motion.div
          layout={!prefersReducedMotion}
          transition={transition}
          className={
            activeCard
              ? 'grid grid-cols-3 gap-2.5 sm:gap-3'
              : 'grid grid-cols-2 gap-3 sm:gap-4'
          }
        >
          {remainingCards.map((card) => {
            const Icon = card.icon;
            const isCompact = Boolean(activeCard);

            return (
              <motion.div
                key={card.id}
                layout={!prefersReducedMotion}
                layoutId={
                  prefersReducedMotion ? undefined : `scenario-card-${card.id}`
                }
                transition={transition}
                role="button"
                tabIndex={0}
                aria-label={`Open ${card.title} scenario`}
                onClick={() => handleToggleCard(card.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleToggleCard(card.id);
                  }
                }}
                style={{ backgroundColor: card.color }}
                className={`relative rounded-[28px] text-white shadow-sm hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 cursor-pointer flex flex-col justify-between overflow-hidden ${
                  isCompact
                    ? 'p-3.5 sm:p-4 min-h-[118px]'
                    : 'p-4 sm:p-5 min-h-[148px]'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <motion.div
                    layout={!prefersReducedMotion}
                    layoutId={
                      prefersReducedMotion
                        ? undefined
                        : `scenario-icon-${card.id}`
                    }
                    transition={transition}
                    className={`rounded-2xl bg-white/20 flex items-center justify-center shrink-0 ${
                      isCompact ? 'w-9 h-9' : 'w-11 h-11'
                    }`}
                  >
                    <Icon
                      className={
                        isCompact ? 'w-4 h-4 text-white' : 'w-5 h-5 text-white'
                      }
                      aria-hidden="true"
                    />
                  </motion.div>

                  <span
                    aria-hidden="true"
                    className={`rounded-full bg-white/20 flex items-center justify-center text-white shrink-0 ${
                      isCompact ? 'w-6 h-6' : 'w-7 h-7'
                    }`}
                  >
                    <ChevronRight
                      className={isCompact ? 'w-3.5 h-3.5' : 'w-4 h-4'}
                      aria-hidden="true"
                    />
                  </span>
                </div>

                <div className="mt-3 space-y-0.5 text-left">
                  <motion.h3
                    layout={!prefersReducedMotion}
                    layoutId={
                      prefersReducedMotion
                        ? undefined
                        : `scenario-title-${card.id}`
                    }
                    transition={transition}
                    className={`font-display font-bold text-white leading-snug ${
                      isCompact
                        ? 'text-xs sm:text-sm line-clamp-1'
                        : 'text-base sm:text-lg'
                    }`}
                  >
                    {card.title}
                  </motion.h3>
                  <motion.p
                    layout={!prefersReducedMotion}
                    layoutId={
                      prefersReducedMotion
                        ? undefined
                        : `scenario-tagline-${card.id}`
                    }
                    transition={transition}
                    className={`text-white/90 font-medium leading-snug ${
                      isCompact
                        ? 'text-[11px] line-clamp-1'
                        : 'text-xs sm:text-sm'
                    }`}
                  >
                    {card.tagline}
                  </motion.p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      {/* PHRASES BOTTOM SHEET / MODAL */}
      <AnimatePresence>
        {phrasesSheetCard && (
          <motion.div
            key="phrases-sheet-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => setPhrasesSheetCard(null)}
            className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          >
            <motion.div
              ref={sheetRef}
              tabIndex={-1}
              role="dialog"
              aria-modal="true"
              aria-label={`${phrasesSheetCard.title} key phrases`}
              initial={
                prefersReducedMotion
                  ? { opacity: 0 }
                  : { opacity: 0, y: 36 }
              }
              animate={
                prefersReducedMotion
                  ? { opacity: 1 }
                  : { opacity: 1, y: 0 }
              }
              exit={
                prefersReducedMotion
                  ? { opacity: 0 }
                  : { opacity: 0, y: 24 }
              }
              transition={transition}
              onClick={(e) => e.stopPropagation()}
              className="glass-strong !rounded-t-[28px] sm:!rounded-[28px] w-full max-w-lg p-5 sm:p-6 space-y-4 focus:outline-none max-h-[85vh] overflow-y-auto"
            >
              {/* Sheet Header */}
              <div className="flex items-center justify-between gap-3 pb-3 border-b border-[var(--line)]">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    style={{ backgroundColor: phrasesSheetCard.color }}
                    className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shrink-0"
                  >
                    <phrasesSheetCard.icon
                      className="w-5 h-5"
                      aria-hidden="true"
                    />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-display font-bold text-lg text-[var(--ink)] truncate">
                      {phrasesSheetCard.title} · Key Phrases
                    </h3>
                    <p className="text-xs text-[var(--muted)] truncate">
                      {phrasesSheetCard.tagline}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setPhrasesSheetCard(null)}
                  aria-label="Close key phrases sheet"
                  className="w-9 h-9 rounded-full bg-[var(--surface-warm)] border border-[var(--line)] flex items-center justify-center text-[var(--ink)] hover:border-[var(--accent)] cursor-pointer shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Key Phrases List */}
              <div className="space-y-2.5">
                {phrasesSheetCard.keyPhrases.map((phrase, idx) => {
                  const phraseKey = `${phrasesSheetCard.id}-phrase-${idx}`;
                  const isSpeaking = speakingPhraseKey === phraseKey;

                  return (
                    <div
                      key={phraseKey}
                      className="p-3.5 sm:p-4 rounded-2xl bg-[var(--surface-warm)] border border-[var(--line)] flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <p className="font-display font-bold text-sm sm:text-base text-[var(--ink)] leading-snug">
                          {phrase.kanglish}
                        </p>
                        <p className="text-sm font-medium text-[var(--accent)] leading-snug">
                          {phrase.script}
                        </p>
                        <p className="text-xs text-[var(--muted)] leading-snug">
                          {phrase.english}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          handleSpeakPhrase(phraseKey, phrase.script)
                        }
                        aria-label={`Play audio for ${phrase.kanglish}`}
                        className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                          isSpeaking
                            ? 'bg-[var(--accent)] text-white border-[var(--accent)] animate-pulse'
                            : 'bg-[var(--surface)] border-[var(--line)] text-[var(--accent)] hover:border-[var(--accent)]'
                        }`}
                      >
                        <Volume2
                          className={`w-4 h-4 ${
                            isSpeaking ? 'fill-current' : ''
                          }`}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ScenarioCarousel;
