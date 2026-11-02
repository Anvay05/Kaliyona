'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
  Volume2,
  Mic,
  X,
  MessageSquare,
  Check,
  RotateCcw,
  Sparkles,
  Copy,
  Bookmark,
} from 'lucide-react';
import { speakKannada } from '@/lib/reader/tts';
import {
  scoreSpeechAttempt,
  startKannadaSpeechRecognition,
  type MicButtonState,
} from '@/src/utils/speechUtils';
import { playTactileTone } from '@/src/data/kanglishData';
import { markActiveToday } from '@/lib/streak';
import { useWallet } from '@/lib/wallet/store';
import { STRINGS } from '@/lib/i18n';

export interface SelectedWordItem {
  kn: string;
  translit?: string;
  en?: string;
  matched: boolean;
}

export interface WordTranslationPopoverProps {
  word: SelectedWordItem | null;
  onClose: () => void;
  onOpenRoleplayWithWord?: (word: {
    kn: string;
    translit: string;
    en: string;
  }) => void;
}

const CONFETTI_PARTICLES = [
  { dx: -28, dy: -34, color: '#6c5ce7', rotate: -25 },
  { dx: -14, dy: -42, color: '#10b981', rotate: 18 },
  { dx: 0, dy: -46, color: '#f59e0b', rotate: -12 },
  { dx: 15, dy: -40, color: '#06b6d4', rotate: 30 },
  { dx: 28, dy: -32, color: '#ec4899', rotate: -20 },
  { dx: -22, dy: -20, color: '#a855f7', rotate: 40 },
  { dx: 22, dy: -18, color: '#22c55e', rotate: -35 },
];

export const WordTranslationPopover: React.FC<WordTranslationPopoverProps> = ({
  word,
  onClose,
  onOpenRoleplayWithWord,
}) => {
  const reduce = useReducedMotion() ?? false;
  const wallet = useWallet();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [approxToast, setApproxToast] = useState(false);
  const [saveToast, setSaveToast] = useState(false);
  const [confettiBurstKey, setConfettiBurstKey] = useState(0);
  const [practiceMode, setPracticeMode] = useState(false);
  const [copied, setCopied] = useState(false);

  const isWordSaved = word ? wallet.isSaved(word.kn) : false;

  const handleSaveToNotes = () => {
    if (!word) return;
    playTactileTone('success');
    wallet.saveItem({
      kn: word.kn,
      translit: word.translit || word.kn,
      en: word.en || '',
      source: 'reader',
    });
    setSaveToast(true);
    if (!reduce) {
      setConfettiBurstKey((prev) => prev + 1);
    }
    if (saveToastTimerRef.current) clearTimeout(saveToastTimerRef.current);
    saveToastTimerRef.current = setTimeout(() => {
      setSaveToast(false);
    }, 2500);
  };

  const handleCopy = async () => {
    if (!word) return;
    playTactileTone('tap');
    const textToCopy = `${word.kn} (${word.translit || ''}) — ${word.en || ''}`;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(textToCopy);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // ignore
    }
  };

  // Mic matcher state (reusing existing scoreSpeechAttempt + startKannadaSpeechRecognition)
  const [micState, setMicState] = useState<MicButtonState>('idle');
  const [interimText, setInterimText] = useState('');
  const [heardText, setHeardText] = useState<string | null>(null);
  const [verdict, setVerdict] = useState<'idle' | 'pass' | 'close' | 'fail'>(
    'idle'
  );
  const [similarityPct, setSimilarityPct] = useState<number | null>(null);
  const [manualInput, setManualInput] = useState('');

  const recRef = useRef<{ stop: () => void; abort?: () => void } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setPracticeMode(false);
    setSaveToast(false);
    resetMatcherState();
  }, [word?.kn, word?.translit]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      if (saveToastTimerRef.current) clearTimeout(saveToastTimerRef.current);
      recRef.current?.abort?.();
    };
  }, []);

  const resetMatcherState = () => {
    recRef.current?.abort?.();
    recRef.current = null;
    setMicState('idle');
    setInterimText('');
    setHeardText(null);
    setVerdict('idle');
    setSimilarityPct(null);
    setManualInput('');
  };

  const handleSpeak = () => {
    if (!word) return;
    playTactileTone('tap');
    setIsSpeaking(true);
    speakKannada(word.kn, {
      fallbackTranslit: word.translit,
      onApproximatedOnce: () => {
        setApproxToast(true);
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        toastTimerRef.current = setTimeout(() => {
          setApproxToast(false);
        }, 2400);
      },
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false),
    });
  };

  const evaluateAttempt = (candidates: string[]) => {
    if (!word) return;
    const expectedTranslit = word.translit || word.kn;
    const expectedKn = word.kn;

    const scored = scoreSpeechAttempt(candidates, expectedTranslit, expectedKn);
    const pct = Math.round(scored.similarity * 100);
    setHeardText(scored.bestTranscript || candidates[0] || '');
    setSimilarityPct(pct);
    setInterimText('');
    setMicState('idle');

    if (scored.passed || scored.similarity >= 0.7) {
      setVerdict('pass');
      playTactileTone('success');
      markActiveToday();
    } else if (scored.similarity >= 0.45) {
      setVerdict('close');
      playTactileTone('tap');
    } else {
      setVerdict('fail');
      playTactileTone('error');
    }
  };

  const handleToggleMic = () => {
    if (!word) return;
    playTactileTone('tap');

    if (micState === 'listening') {
      recRef.current?.stop();
      recRef.current = null;
      setMicState('processing');
      return;
    }

    resetMatcherState();
    setMicState('requesting-permission');

    try {
      const rec = startKannadaSpeechRecognition({
        onInterimResult: (partial: string) => {
          setInterimText(partial);
          setMicState('listening');
        },
        onResult: (transcripts: string[]) => {
          evaluateAttempt(transcripts);
        },
        onNoSpeech: () => {
          setMicState('idle');
        },
        onNetworkError: () => {
          setMicState('idle');
        },
        onSupportStateChange: () => {
          // handled gracefully via fallback input
        },
        onStateChange: (nextState: MicButtonState) => {
          setMicState(nextState);
        },
      });
      recRef.current = rec;
    } catch {
      setMicState('idle');
    }
  };

  const handleManualCheck = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    evaluateAttempt([manualInput.trim()]);
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {word && (
        <>
          {/* Scrim */}
          <motion.div
            key="reader-popover-scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.15 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/50"
          />

          {/* Bottom Sheet Popover */}
          <motion.div
            key="reader-popover-sheet"
            role="dialog"
            aria-modal="true"
            aria-label={
              word.matched
                ? `${word.kn} — ${word.translit} — ${word.en}`
                : word.kn
            }
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 40 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 32 }}
            transition={
              reduce
                ? { duration: 0.1 }
                : { type: 'spring', stiffness: 400, damping: 32 }
            }
            className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-lg rounded-t-3xl border-t border-neutral-200 bg-white pb-[env(safe-area-inset-bottom,0px)] shadow-2xl"
          >
            <div className="p-5 pb-8">
              {/* Drag handle */}
              <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-neutral-200" />

              {/* Top close row */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {word.matched ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-primary">
                      <Sparkles size={12} />
                      <span>{STRINGS.popover.badgeMatched}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-600">
                      <span>{STRINGS.popover.badgeUnmatched}</span>
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close popover"
                  className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-neutral-100 text-neutral-600 transition-colors hover:bg-neutral-200"
                >
                  <X size={16} />
                </button>
              </div>

              {!word.matched ? (
                /* Unmatched OCR word state */
                <div className="mt-3 space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-3xl font-extrabold tracking-tight text-neutral-900">
                        {word.kn}
                      </p>
                      <p className="mt-1.5 text-sm font-medium text-neutral-600">
                        {STRINGS.popover.unmatchedSubtitle}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleSpeak}
                      aria-label={`Listen to ${word.kn}`}
                      className={`flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-2xl border transition-all ${
                        isSpeaking
                          ? 'border-primary bg-primary text-white shadow-md'
                          : 'border-neutral-200 bg-neutral-50 text-primary hover:bg-primary/10'
                      }`}
                    >
                      <Volume2 size={20} />
                    </button>
                  </div>
                </div>
              ) : !practiceMode ? (
                /* Matched word translation view */
                <div className="mt-3 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 space-y-1">
                      <p className="text-3xl sm:text-4xl font-extrabold tracking-tight text-neutral-900">
                        {word.kn}
                      </p>
                      <p className="font-sans text-base sm:text-lg font-bold text-primary">
                        {word.translit}
                      </p>
                      <p className="text-sm sm:text-base font-medium text-neutral-600">
                        {word.en}
                      </p>
                    </div>

                    {/* Actions cluster: Copy */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={handleCopy}
                        aria-label="Copy translation"
                        title="Copy translation"
                        className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-2xl border border-neutral-200 bg-neutral-50 text-neutral-700 hover:border-primary hover:text-primary transition-all active:scale-95"
                      >
                        {copied ? (
                          <Check size={16} className="text-emerald-500" />
                        ) : (
                          <Copy size={16} />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Primary Action Row: [🔊 Listen] + [🔖 Save to Notes / Saved ✓] + [Practice bolke] */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {/* [🔊 Listen] */}
                    <button
                      type="button"
                      onClick={handleSpeak}
                      className={`inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-2xl border px-3.5 py-2.5 text-xs sm:text-sm font-bold transition-all active:scale-[0.98] ${
                        isSpeaking
                          ? 'border-primary bg-primary text-white shadow-xs'
                          : 'border-neutral-200 bg-neutral-50 text-neutral-800 hover:border-primary hover:text-primary'
                      }`}
                    >
                      <Volume2 size={16} />
                      <span>{STRINGS.popover.listenButton}</span>
                    </button>

                    {/* [🔖 Save to Notes / Saved ✓] with confetti burst */}
                    <div className="relative inline-flex">
                      {!reduce && confettiBurstKey > 0 && (
                        <div
                          key={confettiBurstKey}
                          className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-visible"
                          aria-hidden="true"
                        >
                          {CONFETTI_PARTICLES.map((p, i) => (
                            <motion.span
                              key={i}
                              initial={{ opacity: 1, x: 0, y: 0, scale: 0.6, rotate: 0 }}
                              animate={{
                                opacity: 0,
                                x: p.dx,
                                y: p.dy,
                                scale: 1.15,
                                rotate: p.rotate,
                              }}
                              transition={{ duration: 0.55, ease: 'easeOut' }}
                              style={{ backgroundColor: p.color }}
                              className="absolute h-2 w-2 rounded-xs"
                            />
                          ))}
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={handleSaveToNotes}
                        className={`inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-2xl border px-3.5 py-2.5 text-xs sm:text-sm font-bold transition-all active:scale-[0.98] ${
                          isWordSaved
                            ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700'
                            : 'border-neutral-200 bg-neutral-50 text-neutral-800 hover:border-primary hover:text-primary'
                        }`}
                      >
                        {isWordSaved ? (
                          <>
                            <Check size={16} className="text-emerald-500" />
                            <span>{STRINGS.popover.savedButton}</span>
                          </>
                        ) : (
                          <>
                            <Bookmark size={16} />
                            <span>{STRINGS.popover.saveToNotesButton}</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* [Practice speaking] */}
                    <button
                      type="button"
                      onClick={() => {
                        playTactileTone('tap');
                        setPracticeMode(true);
                      }}
                      className="inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-xs transition-transform hover:opacity-95 active:scale-[0.98]"
                    >
                      <Mic size={16} />
                      <span>{STRINGS.popover.practiceButton}</span>
                    </button>

                    {onOpenRoleplayWithWord && word.translit && word.en && (
                      <button
                        type="button"
                        onClick={() =>
                          onOpenRoleplayWithWord({
                            kn: word.kn,
                            translit: word.translit!,
                            en: word.en!,
                          })
                        }
                        className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-2xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-neutral-800 transition-colors hover:bg-neutral-100"
                      >
                        <MessageSquare size={15} />
                        <span>{STRINGS.popover.useWithAnnaButton}</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                /* Inline Pronunciation Practice Panel */
                <div className="mt-3 space-y-4">
                  <div className="flex items-center justify-between gap-2 rounded-2xl border border-neutral-200 bg-neutral-50 p-3.5">
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                        {STRINGS.popover.sayOutLoud}
                      </span>
                      <div className="flex items-baseline gap-2 mt-0.5">
                        <span className="text-xl font-extrabold text-neutral-900">
                          &ldquo;{word.translit}&rdquo;
                        </span>
                        <span className="text-base font-semibold text-primary">
                          ({word.kn})
                        </span>
                      </div>
                      <p className="text-xs text-neutral-500">
                        {word.en}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleSpeak}
                      aria-label="Hear pronunciation"
                      className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-neutral-200 bg-white text-primary"
                    >
                      <Volume2 size={18} />
                    </button>
                  </div>

                  {/* Big Mic Button */}
                  <div className="flex flex-col items-center justify-center py-2 space-y-2.5">
                    <button
                      type="button"
                      onClick={handleToggleMic}
                      aria-label="Tap mic to speak"
                      className={`flex h-16 w-16 cursor-pointer items-center justify-center rounded-full text-white shadow-lg transition-transform active:scale-95 ${
                        verdict === 'pass'
                          ? 'bg-emerald-500'
                          : micState === 'listening'
                          ? 'bg-rose-500 ring-4 ring-rose-500/30 animate-pulse'
                          : 'bg-primary'
                      }`}
                    >
                      {verdict === 'pass' ? (
                        <Check size={30} />
                      ) : (
                        <Mic size={28} />
                      )}
                    </button>

                    <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                      {micState === 'requesting-permission'
                        ? STRINGS.popover.requestingMic
                        : micState === 'listening'
                        ? STRINGS.popover.listeningNow
                        : micState === 'processing'
                        ? STRINGS.popover.checkingSpeech
                        : verdict === 'pass'
                        ? STRINGS.popover.passVerdict(similarityPct ?? 100)
                        : verdict === 'close'
                        ? STRINGS.popover.closeVerdict(similarityPct ?? 60)
                        : verdict === 'fail'
                        ? STRINGS.popover.failVerdict(word.translit || word.kn)
                        : STRINGS.popover.tapMicPrompt}
                    </span>

                    {interimText && (
                      <span className="rounded-lg bg-neutral-100 px-3 py-1 font-sans text-xs text-neutral-700">
                        {interimText}
                      </span>
                    )}
                  </div>

                  {/* Verdict feedback banner */}
                  {verdict !== 'idle' && (
                    <div
                      className={`flex items-center justify-between gap-3 rounded-2xl border px-3.5 py-2.5 text-xs font-medium ${
                        verdict === 'pass'
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                          : verdict === 'close'
                          ? 'border-amber-300 bg-amber-50 text-amber-900'
                          : 'border-rose-300 bg-rose-50 text-rose-900'
                      }`}
                    >
                      <div>
                        <p className="font-bold">
                          {verdict === 'pass'
                            ? STRINGS.popover.passBanner
                            : verdict === 'close'
                            ? STRINGS.popover.closeBanner
                            : STRINGS.popover.expectedBanner(
                                word.translit || word.kn,
                                word.kn
                              )}
                        </p>
                        {heardText && (
                          <p className="opacity-80 mt-0.5">
                            Heard: &ldquo;{heardText}&rdquo;
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={resetMatcherState}
                        className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-xl border border-current/25 px-2.5 py-1.5 font-semibold"
                      >
                        <RotateCcw size={13} />
                        <span>Retry</span>
                      </button>
                    </div>
                  )}

                  {/* Quick fallback input if mic is blocked/noisy */}
                  <form
                    onSubmit={handleManualCheck}
                    className="flex items-center gap-2 pt-1"
                  >
                    <input
                      type="text"
                      value={manualInput}
                      onChange={(e) => setManualInput(e.target.value)}
                      placeholder={`Or type "${word.translit}" to test matcher…`}
                      className="h-9 flex-1 rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-xs text-neutral-900 outline-none focus:border-primary"
                    />
                    <button
                      type="submit"
                      className="h-9 cursor-pointer rounded-xl bg-neutral-200 px-3 text-xs font-semibold text-neutral-800 hover:bg-neutral-300"
                    >
                      Check
                    </button>
                  </form>

                  {/* Footer actions */}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        resetMatcherState();
                        setPracticeMode(false);
                      }}
                      className="cursor-pointer text-xs font-semibold text-neutral-500 hover:text-neutral-800"
                    >
                      {STRINGS.popover.backToWord}
                    </button>
                    {onOpenRoleplayWithWord && word.translit && word.en && (
                      <button
                        type="button"
                        onClick={() =>
                          onOpenRoleplayWithWord({
                            kn: word.kn,
                            translit: word.translit!,
                            en: word.en!,
                          })
                        }
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/20"
                      >
                        <MessageSquare size={13} />
                        <span>{STRINGS.popover.useWithAnnaButton}</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Save to Notes confirmation toast */}
              <AnimatePresence>
                {saveToast && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    transition={{ duration: reduce ? 0 : 0.15 }}
                    className="mt-3 rounded-xl bg-emerald-600 px-3 py-2 text-center text-xs font-bold text-white shadow-md"
                  >
                    {STRINGS.wallet.savedToast}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Tiny one-time "voice approximated" toast */}
              <AnimatePresence>
                {approxToast && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    className="mt-3 rounded-xl bg-neutral-900 px-3 py-1.5 text-center text-[11px] font-medium text-neutral-200"
                  >
                    {STRINGS.popover.voiceApproximatedToast}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
};
