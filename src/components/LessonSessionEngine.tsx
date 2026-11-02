import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Volume2,
  Heart,
  Check,
  ArrowRight,
  Turtle,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import {
  COURSE_UNITS,
  getAllCoursePhrases,
  Unit,
  Level,
  Lesson,
  Exercise,
} from '../data/courseData';
import {
  getLesson as getCurriculumLesson,
  resolveLessonId,
} from '../data/curriculum';
import {
  buildExercise,
  GeneratedExercise,
  GeneratedQuestion,
} from '../lib/exerciseBuilder';
import { speakKanglishPhrase, playTactileTone } from '../data/kanglishData';
import {
  speakKannada,
  cancelKannadaSpeech,
  abortActiveRecognition,
  useSpeakingState,
} from '../utils/speechUtils';
import { useProgress } from '../store/progressStore';
import {
  Mascot,
  MASCOT_PLACEMENTS,
  getLessonCardMascotPlacement,
} from './Mascot';
import { ConfettiCelebration } from './ConfettiCelebration';
import { VocabPreview } from './VocabPreview';

export interface LessonSessionEngineProps {
  unitId?: string;
  levelId?: string;
  lessonIndex?: number;
  lessonId?: string;
  initialAttempt?: number;
  userId?: string;
  onExit: () => void;
  onLessonCompleted?: (lessonId: string, earnedXp: number) => void;
}

function extractFirstSyllable(text: string): string {
  if (!text) return '';
  const firstWord = text.trim().split(/\s+/)[0] || '';
  const match = firstWord.match(/^[^aeiou]*[aeiou]+(?:[kgtdpbcsjnymlrwvzh])?/i);
  return match ? match[0] : firstWord.slice(0, Math.min(3, firstWord.length));
}

/**
 * Legacy-compatible export retained for callers that import prepareSessionExercises,
 * now backed by deterministic buildExercise rather than random sampling.
 */
export function prepareSessionExercises(
  rawExercises: Exercise[],
  _expandedPool?: Exercise[],
  requestedRoundSize?: number
): Exercise[] {
  if (!rawExercises || rawExercises.length === 0) return [];
  const limit = requestedRoundSize ?? rawExercises.length;
  return rawExercises.slice(0, limit);
}

const CONFETTI_COLORS = [
  '#4F8CFF',
  '#22D3EE',
  '#34D399',
  '#FF9F2E',
  '#F5C518',
  '#EDF2FC',
];

export const LessonSessionEngine: React.FC<LessonSessionEngineProps> = ({
  unitId = 'u1',
  levelId = 'u1_l1',
  lessonIndex = 0,
  lessonId: explicitLessonId,
  initialAttempt = 1,
  userId = 'guest',
  onExit,
  onLessonCompleted,
}) => {
  const {
    hearts,
    streak,
    completeLesson,
    loseHeart,
    addXP,
    refillHearts,
    seeWord,
  } = useProgress();

  const { isSpeaking } = useSpeakingState();

  // Resolve unit, level, lesson from courseData & canonical curriculum lesson
  const resolved = useMemo(() => {
    const fallbackUnit: Unit = {
      id: 'u1',
      phase: 1,
      title: 'Self Introduction',
      subtitle: 'PHASE 1 · FOUNDATION (A1)',
      emoji: '',
      icon: '',
      colorKey: 'blue',
      lessons: [
        {
          id: 'u1_l1',
          title: 'Warm Greetings & Courtesy',
          type: 'normal',
          exercises: [],
        },
      ],
      levels: [
        {
          id: 'u1_l1',
          levelNumber: 1,
          name: 'GREETINGS',
          lessons: [
            {
              id: 'u1_l1',
              title: 'Warm Greetings & Courtesy',
              type: 'normal',
              exercises: [],
            },
          ],
        },
      ],
    };

    if (explicitLessonId) {
      const canonicalId = resolveLessonId(explicitLessonId);
      const currLesson = getCurriculumLesson(canonicalId);
      const matchedUnit =
        COURSE_UNITS.find((u) =>
          u.levels.some((lv) => lv.lessons.some((ls) => ls.id === canonicalId))
        ) ||
        COURSE_UNITS[0] ||
        fallbackUnit;
      const matchedLevel =
        matchedUnit.levels.find((lv) =>
          lv.lessons.some((ls) => ls.id === canonicalId)
        ) || matchedUnit.levels[0];
      const matchedLesson: Lesson = matchedLevel.lessons.find(
        (ls) => ls.id === canonicalId
      ) || {
        id: currLesson.id,
        title: currLesson.title,
        type: 'normal',
        exercises: [],
      };
      return {
        unit: matchedUnit,
        level: matchedLevel,
        lesson: { ...matchedLesson, title: currLesson.title, id: currLesson.id },
        canonicalLessonId: currLesson.id,
        curriculumLesson: currLesson,
      };
    }

    const unit: Unit =
      COURSE_UNITS.find((u) => u.id === unitId) ||
      COURSE_UNITS[0] ||
      fallbackUnit;
    const level: Level =
      unit.levels.find((l) => l.id === levelId) ||
      unit.levels[Number(levelId.replace(/\D/g, '')) - 1] ||
      unit.levels[0];
    const safeIdx = Math.max(
      0,
      Math.min(level.lessons.length - 1, Number(lessonIndex) || 0)
    );
    const rawLesson: Lesson = level.lessons[safeIdx] || level.lessons[0];
    const canonicalLessonId = resolveLessonId(rawLesson.id);
    const curriculumLesson = getCurriculumLesson(canonicalLessonId);

    return {
      unit,
      level,
      lesson: {
        ...rawLesson,
        title: curriculumLesson.title || rawLesson.title,
      },
      canonicalLessonId,
      curriculumLesson,
    };
  }, [unitId, levelId, lessonIndex, explicitLessonId]);

  const { unit, level, lesson, canonicalLessonId, curriculumLesson } = resolved;

  // Attempt counter (1-indexed; increments on retry to rotate order & qTypes deterministically)
  const [attemptNumber, setAttemptNumber] = useState<number>(() =>
    Math.max(1, Math.floor(initialAttempt || 1))
  );

  // Build deterministic, validated exercise for (userId, canonicalLessonId, attemptNumber)
  const generatedExercise: GeneratedExercise = useMemo(
    () => buildExercise(canonicalLessonId, attemptNumber, userId),
    [canonicalLessonId, attemptNumber, userId]
  );

  const questions = generatedExercise.questions;

  // Session state starts on 'preview' before Question 1 of every attempt (including retries)
  const [sessionState, setSessionState] = useState<
    'preview' | 'active' | 'out_of_hearts' | 'celebration'
  >('preview');

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  // Progress bar state — NEVER regresses
  const [progressUnits, setProgressUnits] = useState<number>(0.4);

  // Accuracy & XP tracking
  const [totalChecks, setTotalChecks] = useState(0);
  const [correctChecks, setCorrectChecks] = useState(0);
  const [earnedXpSoFar, setEarnedXpSoFar] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [isHintRevealed, setIsHintRevealed] = useState(false);

  // Single source of truth feedback state + synchronous idempotency guard
  const [feedback, setFeedback] = useState<{
    correct: boolean;
    localSay: string;
    kannada: string;
    meaning: string;
    correctOptionLabel: string;
  } | null>(null);
  const feedbackShownRef = useRef<boolean>(false);

  // Guard ref so completeLesson is strictly called ONCE per lesson session
  const hasCompletedRef = useRef<boolean>(false);

  // 3-correct-in-a-row combo tracker
  const consecutiveCorrectRef = useRef<number>(0);
  const comboFiredInStreakRef = useRef<boolean>(false);
  const [showComboSango, setShowComboSango] = useState<boolean>(false);
  const comboTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ctaBarRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollContainerRef.current?.scrollTo({ top: 0 });
  }, [currentIndex, sessionState]);

  useEffect(() => {
    const el = ctaBarRef.current;
    if (!el || typeof window === 'undefined') return;

    const updateCtaBarHeight = () => {
      const h = Math.round(el.getBoundingClientRect().height);
      if (h > 0) {
        document.documentElement.style.setProperty('--cta-bar-h', `${h}px`);
      }
    };

    updateCtaBarHeight();

    const ro =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(updateCtaBarHeight)
        : null;
    ro?.observe(el);
    window.addEventListener('resize', updateCtaBarHeight);

    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', updateCtaBarHeight);
    };
  }, [sessionState, feedback]);

  const currentQ: GeneratedQuestion | undefined =
    questions[currentIndex] || questions[0];

  const cleanupExerciseSpeechState = () => {
    abortActiveRecognition();
    cancelKannadaSpeech();
  };

  useEffect(() => {
    return () => {
      if (comboTimerRef.current) {
        clearTimeout(comboTimerRef.current);
      }
      abortActiveRecognition();
      cancelKannadaSpeech();
    };
  }, []);

  // Reset to vocabulary preview when switching lessons
  useEffect(() => {
    hasCompletedRef.current = false;
    feedbackShownRef.current = false;
    consecutiveCorrectRef.current = 0;
    comboFiredInStreakRef.current = false;
    setShowComboSango(false);
    setSessionState('preview');
    setCurrentIndex(0);
    setSelectedOption(null);
    setFeedback(null);
  }, [canonicalLessonId]);

  // Sync URL with /exercise/:lessonId/preview while on VocabPreview
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (sessionState === 'preview') {
      const previewPath = `/exercise/${encodeURIComponent(
        canonicalLessonId
      )}/preview`;
      try {
        if (window.location.pathname !== previewPath) {
          window.history.replaceState({}, '', previewPath);
        }
      } catch {
        // Ignore history restriction in sandboxed environments
      }
    }
  }, [sessionState, canonicalLessonId]);

  // Reset per-question state when currentIndex or attemptNumber changes in active mode
  useEffect(() => {
    if (sessionState !== 'active' || !currentQ) return;
    cleanupExerciseSpeechState();
    feedbackShownRef.current = false;
    setFeedback(null);
    setSelectedOption(null);
    setIsHintRevealed(false);

    seeWord(currentQ.wordId, {
      kannada: currentQ.kannada,
      translit: currentQ.transliteration,
      meaning: currentQ.english,
      unitId: unit.id,
      example: `${currentQ.transliteration} — "${currentQ.english}" (${curriculumLesson.title})`,
    });

    if (currentQ.qType === 'audio_to_word') {
      const timer = setTimeout(() => {
        speakKannada(currentQ.audioText || currentQ.kannada, {
          fallbackTranslit: currentQ.transliteration,
        });
      }, 180);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionState, currentIndex, currentQ?.id]);

  // Calculate non-regressing progress percentage
  const progressPercent = useMemo(() => {
    if (sessionState === 'celebration') return 100;
    const denom = Math.max(questions.length, 4);
    const rawPct = Math.round((progressUnits / denom) * 100);
    return Math.min(96, Math.max(8, rawPct));
  }, [progressUnits, questions.length, sessionState]);

  const accuracyPct =
    totalChecks > 0 ? Math.round((correctChecks / totalChecks) * 100) : 100;

  const isFinalCourseCapstone = lesson.id === 'u30_l5';
  const requiresEightyPercentGate =
    lesson.id === 'u18_l5' ||
    lesson.id === 'u25_l5' ||
    lesson.id === 'u30_l5' ||
    Boolean(lesson.note && /80%\s*or\s*more/i.test(lesson.note));
  const passedEightyPercentGate =
    !requiresEightyPercentGate || accuracyPct >= 80;
  const nextPhaseNumber = unit.phase + 1;
  const totalWordsLearnedCount = useMemo(
    () => getAllCoursePhrases().length,
    []
  );

  const commitLessonCompletionOnce = (finalAccuracy: number) => {
    if (requiresEightyPercentGate && finalAccuracy < 80) return;
    if (hasCompletedRef.current) return;
    hasCompletedRef.current = true;
    completeLesson(unit.id, level.id, lesson.id, 10, finalAccuracy);
    if (onLessonCompleted) {
      onLessonCompleted(lesson.id, 10);
    }
  };

  const handleStartFromPreview = () => {
    cleanupExerciseSpeechState();
    feedbackShownRef.current = false;
    setFeedback(null);
    setSelectedOption(null);
    setCurrentIndex(0);
    setSessionState('active');
  };

  const handleRetryLesson = () => {
    cleanupExerciseSpeechState();
    playTactileTone('tap');
    hasCompletedRef.current = false;
    setAttemptNumber((a) => a + 1);
    setCurrentIndex(0);
    setProgressUnits(0.4);
    setTotalChecks(0);
    setCorrectChecks(0);
    setEarnedXpSoFar(0);
    setHintsUsed(0);
    setIsHintRevealed(false);
    consecutiveCorrectRef.current = 0;
    comboFiredInStreakRef.current = false;
    if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
    setShowComboSango(false);
    feedbackShownRef.current = false;
    setFeedback(null);
    setSelectedOption(null);
    // B1: Vocabulary preview is shown before Question 1 of every attempt, including retries
    setSessionState('preview');
  };

  const handleCheck = () => {
    if (feedbackShownRef.current || feedback !== null || !currentQ) return;
    if (!selectedOption) return;

    const isCorrect = selectedOption === currentQ.correctOption;
    feedbackShownRef.current = true;
    setTotalChecks((t) => t + 1);

    if (isCorrect) {
      playTactileTone('success');
      speakKannada(currentQ.audioText || currentQ.kannada, {
        fallbackTranslit: currentQ.transliteration,
      });
      setCorrectChecks((c) => c + 1);
      const earnedXp = isHintRevealed ? 2 : 4;
      setEarnedXpSoFar((x) => Math.min(10, x + earnedXp));
      setProgressUnits((p) => p + 1);

      const nextStreak = consecutiveCorrectRef.current + 1;
      consecutiveCorrectRef.current = nextStreak;
      if (nextStreak >= 3 && !comboFiredInStreakRef.current) {
        comboFiredInStreakRef.current = true;
        setShowComboSango(true);
        if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
        comboTimerRef.current = setTimeout(() => {
          setShowComboSango(false);
        }, 1200);
      }

      setFeedback({
        correct: true,
        localSay: currentQ.transliteration,
        kannada: currentQ.kannada,
        meaning: currentQ.english,
        correctOptionLabel: currentQ.correctOption,
      });
    } else {
      consecutiveCorrectRef.current = 0;
      comboFiredInStreakRef.current = false;
      if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
      setShowComboSango(false);

      playTactileTone('error');
      loseHeart();
      setProgressUnits((p) => p + 0.3);
      setFeedback({
        correct: false,
        localSay: currentQ.transliteration,
        kannada: currentQ.kannada,
        meaning: currentQ.english,
        correctOptionLabel: currentQ.correctOption,
      });
    }
  };

  const handleContinueAfterFeedback = () => {
    if (!feedbackShownRef.current && feedback === null) return;
    feedbackShownRef.current = false;
    setFeedback(null);
    cleanupExerciseSpeechState();
    playTactileTone('tap');

    if (hearts <= 0) {
      if (earnedXpSoFar > 0) {
        addXP(earnedXpSoFar);
      }
      setSessionState('out_of_hearts');
      return;
    }

    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((idx) => idx + 1);
    } else {
      if (!requiresEightyPercentGate || accuracyPct >= 80) {
        playTactileTone('success');
        commitLessonCompletionOnce(accuracyPct);
      } else {
        playTactileTone('error');
      }
      setSessionState('celebration');
    }
  };

  const canCheck = Boolean(selectedOption);

  // =========================================================================
  // 0. VOCABULARY PREVIEW CARD SCREEN (shown before Question 1 of every attempt)
  // =========================================================================
  if (sessionState === 'preview') {
    return (
      <VocabPreview
        lessonId={canonicalLessonId}
        attemptNumber={attemptNumber}
        onStartExercise={handleStartFromPreview}
        onExit={() => {
          cleanupExerciseSpeechState();
          onExit();
        }}
      />
    );
  }

  // =========================================================================
  // 1. OUT OF HEARTS END SCREEN (keeps progress already earned)
  // =========================================================================
  if (sessionState === 'out_of_hearts') {
    return (
      <div className="fixed inset-0 z-30 bg-[var(--bg)]/95 backdrop-blur-md flex items-center justify-center px-4 pt-5 mobile-shell-content overflow-y-auto">
        <div className="max-w-md w-full card-lift p-7 text-center space-y-6 my-auto">
          <div
            className="w-20 h-20 rounded-full mx-auto flex items-center justify-center border border-[var(--error)]"
            style={{ backgroundColor: 'var(--error-soft)' }}
          >
            <Heart className="w-9 h-9 text-[var(--error)] fill-[var(--error)]" />
          </div>

          <div className="space-y-2">
            <span className="mono-label text-[var(--error)]">
              HEARTS DEPLETED
            </span>
            <h2 className="font-display font-bold text-2xl text-[var(--ink)]">
              Out of hearts — come back tomorrow
            </h2>
            <p className="text-sm text-[var(--muted)]">
              Never worry, Macha! Your <strong>+{earnedXpSoFar} XP</strong>{' '}
              progress already earned in this session is safely kept.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[var(--surface-warm)] border border-[var(--line)] flex items-center justify-around">
            <div>
              <p className="mono-label text-[var(--muted)] !text-[10px]">
                XP KEPT
              </p>
              <p className="font-sans font-bold text-lg text-[var(--accent2)] mt-0.5">
                +{earnedXpSoFar} XP
              </p>
            </div>
            <div className="h-8 w-[1px] bg-[var(--line)]" />
            <div>
              <p className="mono-label text-[var(--muted)] !text-[10px]">
                ACCURACY
              </p>
              <p className="font-sans font-bold text-lg text-[var(--ink)] mt-0.5">
                {accuracyPct}%
              </p>
            </div>
          </div>

          <div className="space-y-2.5 pt-1">
            <button
              onClick={() => {
                playTactileTone('tap');
                refillHearts();
                onExit();
              }}
              className="btn-primary w-full"
            >
              <span>Back to Curriculum Path</span>
            </button>
            <button
              onClick={() => {
                playTactileTone('success');
                refillHearts();
                handleRetryLesson();
              }}
              className="w-full py-2.5 rounded-xl bg-[var(--surface-warm)] border border-[var(--line)] text-xs font-sans text-[var(--accent2)] hover:border-[var(--accent2)] cursor-pointer"
            >
              Refill 5 Hearts &amp; Retry Attempt #{attemptNumber + 1}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 2. LESSON COMPLETE CELEBRATION / BOSS GATE SCREEN
  // =========================================================================
  const isPerfectLesson = totalChecks > 0 && correctChecks === totalChecks;

  if (sessionState === 'celebration') {
    if (requiresEightyPercentGate && !passedEightyPercentGate) {
      return (
        <div className="fixed inset-0 z-30 bg-[var(--bg)]/95 backdrop-blur-md flex items-center justify-center px-4 pt-5 mobile-shell-content overflow-y-auto">
          <div className="max-w-md w-full card-lift rounded-[28px] p-7 sm:p-8 text-center space-y-6 shadow-2xl border border-[var(--amber)]/50 my-auto">
            <div className="w-28 h-28 rounded-3xl bg-[var(--amber-soft)] border border-[var(--amber)] mx-auto flex items-center justify-center shadow-inner overflow-hidden">
              <Mascot {...MASCOT_PLACEMENTS.feedbackWrong} size={96} />
            </div>

            <div className="space-y-2">
              <span className="mono-label text-[var(--amber)] flex items-center justify-center gap-1.5">
                80% GATE REQUIRED · {unit.title}
              </span>
              <h2 className="font-display font-bold text-2xl sm:text-3xl text-[var(--ink)]">
                Almost there, Macha! ({accuracyPct}%)
              </h2>
              <div className="p-3.5 rounded-2xl bg-[var(--surface-warm)] border border-[var(--line)] text-left">
                <p className="mono-label text-[var(--amber)] !text-[10px] mb-1">
                  ANNA SAYS
                </p>
                <p className="text-xs sm:text-sm text-[var(--ink)] leading-relaxed">
                  {isFinalCourseCapstone ? (
                    <>
                      &ldquo;Swalpa practice beku! You hit{' '}
                      <strong>{accuracyPct}%</strong>, but you need{' '}
                      <strong>80% or more</strong> on The Full Bengaluru Day to
                      complete the course and earn your{' '}
                      <strong>Bengaluru Ready</strong> badge. Let&rsquo;s run
                      the day again!&rdquo;
                    </>
                  ) : (
                    <>
                      &ldquo;Swalpa practice beku! You hit{' '}
                      <strong>{accuracyPct}%</strong>, but you need{' '}
                      <strong>80% or more</strong> on this Boss Checkpoint to
                      unlock Phase {nextPhaseNumber}. Take a breath and
                      let&rsquo;s run it again!&rdquo;
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 bg-[var(--surface-warm)] border border-[var(--line)] rounded-2xl p-4">
              <div>
                <p className="mono-label text-[var(--muted)] !text-[10px]">
                  YOUR SCORE
                </p>
                <p className="font-sans font-bold text-lg sm:text-xl text-[var(--amber)] mt-0.5">
                  {accuracyPct}%
                </p>
              </div>
              <div className="border-l border-[var(--line)]">
                <p className="mono-label text-[var(--muted)] !text-[10px]">
                  PASS TARGET
                </p>
                <p className="font-sans font-bold text-lg sm:text-xl text-[var(--green)] mt-0.5">
                  80%+
                </p>
              </div>
            </div>

            <div className="space-y-2.5 pt-1">
              <button
                onClick={handleRetryLesson}
                className="btn-primary w-full"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Retry Boss Checkpoint</span>
              </button>
              <button
                onClick={() => {
                  cleanupExerciseSpeechState();
                  playTactileTone('tap');
                  onExit();
                }}
                className="w-full py-2.5 rounded-xl bg-[var(--surface-warm)] border border-[var(--line)] text-xs font-sans text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
              >
                Back to Curriculum Path
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (isFinalCourseCapstone) {
      return (
        <div className="fixed inset-0 z-30 bg-[var(--bg)]/95 backdrop-blur-md flex items-center justify-center px-4 pt-5 mobile-shell-content overflow-y-auto">
          <div className="max-w-lg w-full signature-gradient rounded-[28px] p-7 sm:p-8 text-white text-center space-y-6 shadow-2xl relative overflow-hidden my-auto border border-[var(--amber)]/50">
            <ConfettiCelebration
              active={true}
              intensity="epic"
              colors={CONFETTI_COLORS}
            />

            <div className="relative z-10 flex items-center justify-center gap-3">
              <div className="w-28 h-28 rounded-3xl bg-white/20 border-2 border-[var(--amber)] flex items-center justify-center shadow-inner overflow-hidden">
                <Mascot
                  {...(isPerfectLesson
                    ? MASCOT_PLACEMENTS.completionPerfectHero
                    : MASCOT_PLACEMENTS.completionNormalHero)}
                />
              </div>
            </div>
            <Mascot {...MASCOT_PLACEMENTS.completionSangoCorner} />

            <div className="relative z-10 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#0A1022]/60 border border-[var(--amber)] text-[var(--amber)] font-sans font-bold text-xs tracking-wider uppercase shadow-md">
              <Sparkles className="w-3.5 h-3.5" />
              <span>BENGALURU READY</span>
            </div>

            <div className="relative z-10 space-y-2">
              <span className="mono-label text-white/85 block">
                150 LESSONS · 30 UNITS · 5 PHASES (A1 → B1)
              </span>
              <h2 className="font-display font-bold text-3xl sm:text-4xl">
                Course Complete!
              </h2>
              <p className="text-sm text-white/95 leading-relaxed max-w-md mx-auto">
                Anna salutes you! You passed{' '}
                <strong>The Full Bengaluru Day</strong> with{' '}
                <strong>{accuracyPct}% accuracy</strong> and mastered{' '}
                <strong>{totalWordsLearnedCount} Kanglish words &amp; phrases</strong>.
                Kannada sulabha!
              </p>
            </div>

            <div className="relative z-10 grid grid-cols-3 gap-2.5 bg-[#0A1022]/40 border border-white/20 rounded-2xl p-4">
              <div>
                <p className="mono-label text-white/75 !text-[10px]">
                  CURRICULUM
                </p>
                <p className="font-sans font-bold text-base sm:text-lg mt-0.5">
                  150 Lessons
                </p>
              </div>
              <div className="border-x border-white/15">
                <p className="mono-label text-white/75 !text-[10px]">
                  WORDS LEARNED
                </p>
                <p className="font-sans font-bold text-base sm:text-lg mt-0.5">
                  {totalWordsLearnedCount}
                </p>
              </div>
              <div>
                <p className="mono-label text-white/75 !text-[10px]">
                  ACCURACY
                </p>
                <p className="font-sans font-bold text-base sm:text-lg mt-0.5">
                  {accuracyPct}% · {streak}d
                </p>
              </div>
            </div>

            <div className="relative z-10 pt-1 space-y-2">
              <button
                onClick={() => {
                  cleanupExerciseSpeechState();
                  playTactileTone('success');
                  commitLessonCompletionOnce(accuracyPct);
                  onExit();
                }}
                className="btn-primary w-full !bg-[#0A1022] !text-white hover:brightness-110"
              >
                <span>Claim &ldquo;Bengaluru Ready&rdquo; Badge</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleRetryLesson}
                className="w-full py-2.5 rounded-xl bg-white/15 border border-white/25 text-xs font-sans text-white hover:bg-white/25 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Practice Again (Attempt #{attemptNumber + 1})</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="fixed inset-0 z-30 bg-[var(--bg)]/95 backdrop-blur-md flex items-center justify-center px-4 pt-5 mobile-shell-content overflow-y-auto">
        <div className="max-w-md w-full signature-gradient rounded-[28px] p-7 sm:p-8 text-white text-center space-y-6 shadow-2xl relative overflow-hidden my-auto">
          <ConfettiCelebration
            active={true}
            intensity={
              isPerfectLesson || requiresEightyPercentGate ? 'epic' : 'normal'
            }
            colors={CONFETTI_COLORS}
          />

          <div className="relative z-10 w-28 h-28 rounded-3xl bg-white/20 mx-auto flex items-center justify-center shadow-inner overflow-hidden">
            <Mascot
              {...(isPerfectLesson
                ? MASCOT_PLACEMENTS.completionPerfectHero
                : MASCOT_PLACEMENTS.completionNormalHero)}
            />
          </div>
          <Mascot {...MASCOT_PLACEMENTS.completionSangoCorner} />

          <div className="relative z-10 space-y-1.5">
            <span className="mono-label text-white/85 flex items-center justify-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              LEVEL {curriculumLesson.level} · LESSON {curriculumLesson.order}
            </span>
            <h2 className="font-display font-bold text-3xl sm:text-4xl">
              {requiresEightyPercentGate
                ? `Phase ${unit.phase} Cleared!`
                : 'Great work!'}
            </h2>
            <p className="text-sm text-white/90">
              {requiresEightyPercentGate ? (
                <>
                  Anna salutes you! <strong>{accuracyPct}% accuracy</strong>{' '}
                  (&ge;80% gate passed) — Phase {nextPhaseNumber} is now unlocked.
                </>
              ) : (
                <>
                  You mastered <strong>{curriculumLesson.title}</strong> like a
                  true Bengaluru local.
                </>
              )}
            </p>
          </div>

          <div className="relative z-10 grid grid-cols-4 gap-2 bg-[#0A1022]/35 border border-white/20 rounded-2xl p-3 text-center">
            <div>
              <p className="mono-label text-white/75 !text-[9px]">XP EARNED</p>
              <p className="font-sans font-bold text-base sm:text-lg mt-0.5">
                +{earnedXpSoFar || 10} XP
              </p>
            </div>
            <div className="border-l border-white/15">
              <p className="mono-label text-white/75 !text-[9px]">ACCURACY</p>
              <p className="font-sans font-bold text-base sm:text-lg mt-0.5">
                {accuracyPct}%
              </p>
            </div>
            <div className="border-l border-white/15">
              <p className="mono-label text-white/75 !text-[9px]">HINTS</p>
              <p className="font-sans font-bold text-base sm:text-lg mt-0.5">
                {hintsUsed}
              </p>
            </div>
            <div className="border-l border-white/15">
              <p className="mono-label text-white/75 !text-[9px]">STREAK</p>
              <p className="font-sans font-bold text-base sm:text-lg mt-0.5">
                {streak}
              </p>
            </div>
          </div>

          <div className="relative z-10 pt-1 space-y-2">
            <button
              onClick={() => {
                cleanupExerciseSpeechState();
                playTactileTone('success');
                commitLessonCompletionOnce(accuracyPct);
                onExit();
              }}
              className="btn-primary w-full !bg-[#0A1022] !text-white hover:brightness-110"
            >
              <span>Continue</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              data-testid="retry-attempt-btn"
              onClick={handleRetryLesson}
              className="w-full py-2.5 rounded-xl bg-white/15 border border-white/25 text-xs font-sans text-white hover:bg-white/25 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Practice Again (Attempt #{attemptNumber + 1})</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 3. ACTIVE LESSON EXERCISE ENGINE (Deterministic Curriculum Questions)
  // =========================================================================
  const isGateCheckQuestion =
    questions.length > 1 && currentIndex === questions.length - 1;
  const mappedMascotType =
    currentQ?.qType === 'audio_to_word' ? 'listen' : 'mcq';
  const cardMascotSpec = getLessonCardMascotPlacement({
    exerciseType: mappedMascotType,
    isGateCheck: isGateCheckQuestion,
  });

  return (
    <div className="fixed inset-0 z-30 bg-[var(--bg)] flex flex-col overflow-hidden">
      {/* Main Centered Scrollable Viewport (strictly above the CTA bar) */}
      <div
        ref={scrollContainerRef}
        className="flex-1 min-h-0 w-full overflow-y-auto"
      >
        <div className="w-full max-w-2xl mx-auto px-4 sm:px-6 pt-5 space-y-6 cta-screen-scroll-content">
        {/* TOP BAR: close (✕) left, animated progress bar center, retry & hearts right */}
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => {
              cleanupExerciseSpeechState();
              playTactileTone('tap');
              onExit();
            }}
            className="w-10 h-10 rounded-xl bg-[var(--surface)] border border-[var(--line)] flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer shrink-0"
            aria-label="Close lesson"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Animated Progress Bar Center */}
          <div className="flex-1 h-3 rounded-full bg-[var(--surface-warm)] overflow-hidden p-0.5 border border-[var(--line)]">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${progressPercent}%`,
                background:
                  'linear-gradient(90deg, var(--accent) 0%, var(--accent2) 100%)',
              }}
            />
          </div>

          {/* Retry Attempt Button (increments attemptNumber & shows VocabPreview) */}
          <button
            type="button"
            onClick={handleRetryLesson}
            title={`Restart as Attempt #${attemptNumber + 1}`}
            className="px-2.5 py-1.5 rounded-full bg-[var(--surface)] border border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] font-sans text-xs flex items-center gap-1 cursor-pointer shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>#{attemptNumber}</span>
          </button>

          {/* Hearts Right */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--surface)] border border-[var(--line)] shrink-0">
            <Heart className="w-4 h-4 text-[var(--error)] fill-[var(--error)]" />
            <span className="font-sans text-xs font-bold text-[var(--error)]">
              {hearts}
            </span>
          </div>
        </div>

        {/* Exercise Card Surface */}
        {currentQ && (
          <div
            data-question-role={currentQ.qType}
            data-question-word-id={currentQ.wordId}
            data-question-index={currentIndex + 1}
            className={`card-lift relative p-5 sm:p-7 space-y-6 ${
              isGateCheckQuestion ? 'pb-8' : ''
            }`}
          >
            {!showComboSango && (
              <Mascot
                key={`q-mascot-${currentQ.id}`}
                {...cardMascotSpec}
              />
            )}

            {/* Header Metadata */}
            <div className="space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pr-11 sm:pr-12">
                <h2 className="font-display font-semibold text-xl sm:text-2xl text-[var(--ink)]">
                  {currentQ.prompt}
                </h2>

                {!isHintRevealed && (
                  <button
                    type="button"
                    disabled={feedback !== null}
                    onClick={() => {
                      if (feedback !== null) return;
                      playTactileTone('tap');
                      setIsHintRevealed(true);
                      setHintsUsed((h) => h + 1);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--surface-warm)] border border-[var(--line)] hover:border-[var(--amber)] font-sans text-xs font-medium text-[var(--muted)] hover:text-[var(--ink)] transition-colors cursor-pointer shrink-0 self-start sm:self-auto"
                    title="Reveal hint: first syllable + part of speech"
                  >
                    <span>Hint</span>
                  </button>
                )}
              </div>

              {isHintRevealed && (
                <div className="p-3.5 rounded-2xl bg-[var(--amber-soft)] border border-[var(--amber)] text-xs flex items-start gap-2.5 text-[var(--ink)]">
                  <div className="space-y-0.5">
                    <p className="font-sans font-semibold text-[var(--amber)] text-[11px]">
                      HINT (No heart lost · Halved question XP)
                    </p>
                    <p className="text-xs font-medium">
                      Transliteration starts with:{' '}
                      <strong className="font-sans font-semibold text-[var(--accent2)]">
                        &ldquo;{extractFirstSyllable(currentQ.transliteration)}
                        &hellip;&rdquo;
                      </strong>{' '}
                      <span className="ml-2 text-[var(--muted)]">
                        · Part of speech: {currentQ.word.partOfSpeech}
                      </span>
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* ============================================================= */}
            {/* QTYPE 1: english_to_kannada (Weight 1)                        */}
            {/* ============================================================= */}
            {currentQ.qType === 'english_to_kannada' && (
              <div className="space-y-5">
                <div className="p-5 rounded-2xl bg-[var(--surface-warm)] border border-[var(--line)] flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="font-sans text-xs font-semibold uppercase tracking-[0.04em] text-[var(--muted)] block">
                      ENGLISH MEANING
                    </span>
                    <p className="text-2xl sm:text-3xl font-semibold text-[var(--ink)] leading-snug">
                      &ldquo;{currentQ.english}&rdquo;
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================= */}
            {/* QTYPE 2: kannada_to_english (Weight 2)                        */}
            {/* ============================================================= */}
            {currentQ.qType === 'kannada_to_english' && (
              <div className="space-y-5">
                <div className="p-5 rounded-2xl bg-[var(--surface-warm)] border border-[var(--line)] flex items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <p
                      lang="kn"
                      className="text-2xl sm:text-3xl font-bold text-[var(--ink)] leading-snug"
                    >
                      {currentQ.kannada}
                    </p>
                    <p className="font-sans text-sm sm:text-base font-medium text-[var(--accent2)]">
                      {currentQ.transliteration}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={isSpeaking}
                      onClick={() =>
                        speakKanglishPhrase(
                          currentQ.transliteration,
                          currentQ.audioText || currentQ.kannada,
                          false
                        )
                      }
                      className={`w-12 h-12 rounded-2xl bg-[var(--accent)] text-white flex items-center justify-center shadow-sm hover:brightness-110 cursor-pointer disabled:opacity-80 ${
                        isSpeaking ? 'tts-speaking-ring' : ''
                      }`}
                      aria-label="Play audio"
                    >
                      <Volume2 className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      disabled={isSpeaking}
                      onClick={() =>
                        speakKanglishPhrase(
                          currentQ.transliteration,
                          currentQ.audioText || currentQ.kannada,
                          true
                        )
                      }
                      className="w-11 h-11 rounded-2xl bg-[var(--surface)] border border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] flex items-center justify-center cursor-pointer disabled:opacity-60"
                      aria-label="Play slow audio"
                    >
                      <Turtle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================= */}
            {/* QTYPE 3: audio_to_word (Weight 3)                             */}
            {/* ============================================================= */}
            {currentQ.qType === 'audio_to_word' && (
              <div className="py-4 flex flex-col items-center justify-center gap-3">
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    disabled={isSpeaking}
                    onClick={() =>
                      speakKanglishPhrase(
                        currentQ.transliteration,
                        currentQ.audioText || currentQ.kannada,
                        false
                      )
                    }
                    style={{
                      boxShadow: '0 0 36px rgba(79, 140, 255, 0.35)',
                    }}
                    className={`w-24 h-24 rounded-full bg-[var(--accent)] text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-transform cursor-pointer disabled:opacity-80 ${
                      isSpeaking ? 'tts-speaking-ring' : ''
                    }`}
                    aria-label="Play audio"
                  >
                    <Volume2 className="w-10 h-10" />
                  </button>
                  <button
                    type="button"
                    disabled={isSpeaking}
                    onClick={() =>
                      speakKanglishPhrase(
                        currentQ.transliteration,
                        currentQ.audioText || currentQ.kannada,
                        true
                      )
                    }
                    className="w-14 h-14 rounded-full bg-[var(--surface-warm)] border border-[var(--line)] text-[var(--accent2)] flex items-center justify-center hover:border-[var(--accent2)] cursor-pointer disabled:opacity-60"
                    aria-label="Play slow audio"
                    title="Listen slowly"
                  >
                    <Turtle className="w-6 h-6" />
                  </button>
                </div>
                <span className="font-sans text-xs font-semibold uppercase tracking-[0.04em] text-[var(--muted)]">
                  {isSpeaking
                    ? 'SPEAKING KANNADA...'
                    : 'TAP TO LISTEN · KANNADA PRONUNCIATION'}
                </span>
              </div>
            )}

            {/* ============================================================= */}
            {/* QTYPE 4: fill_blank (Weight 4)                                */}
            {/* ============================================================= */}
            {currentQ.qType === 'fill_blank' && (
              <div className="p-5 rounded-2xl bg-[var(--surface-warm)] border border-[var(--line)] flex items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <span className="font-sans text-xs font-semibold uppercase tracking-[0.04em] text-[var(--muted)] block">
                    COMPLETE THE KANNADA SENTENCE
                  </span>
                  <p
                    lang="kn"
                    className="text-xl sm:text-2xl font-bold text-[var(--ink)] leading-snug"
                  >
                    {currentQ.exampleSentence?.blankedKannada || '_____'}
                  </p>
                  <p className="text-sm text-[var(--accent2)] font-medium">
                    &ldquo;
                    {currentQ.exampleSentence?.english || currentQ.english}
                    &rdquo;
                  </p>
                </div>

                <button
                  type="button"
                  disabled={isSpeaking}
                  onClick={() =>
                    speakKannada(
                      currentQ.exampleSentence?.kannada || currentQ.kannada,
                      {
                        fallbackTranslit: currentQ.transliteration,
                      }
                    )
                  }
                  className={`w-12 h-12 rounded-2xl bg-[var(--accent)] text-white flex items-center justify-center shrink-0 hover:brightness-110 cursor-pointer disabled:opacity-80 ${
                    isSpeaking ? 'tts-speaking-ring' : ''
                  }`}
                  aria-label="Listen sentence"
                >
                  <Volume2 className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* ============================================================= */}
            {/* 4 DETERMINISTIC UNIQUE OPTIONS (shared across all 4 QTypes)   */}
            {/* ============================================================= */}
            <div
              data-testid="question-options-grid"
              className="grid grid-cols-1 sm:grid-cols-2 gap-3.5"
            >
              {currentQ.optionDetails.map((opt) => {
                const isSelected = selectedOption === opt.label;
                return (
                  <button
                    key={opt.wordId}
                    type="button"
                    data-option-word-id={opt.wordId}
                    onClick={() => {
                      if (feedback !== null) return;
                      playTactileTone('tap');
                      setSelectedOption(opt.label);
                      if (currentQ.qType !== 'kannada_to_english') {
                        speakKannada(opt.kannada, {
                          fallbackTranslit: opt.transliteration,
                        });
                      }
                    }}
                    style={
                      isSelected
                        ? {
                            backgroundColor: 'var(--accent-soft)',
                            borderColor: 'var(--accent)',
                            borderWidth: '2px',
                          }
                        : {
                            backgroundColor: 'var(--surface)',
                            borderColor: 'var(--line)',
                            borderWidth: '1px',
                          }
                    }
                    className="p-4 rounded-2xl text-left transition-all cursor-pointer hover:border-[var(--accent)]"
                  >
                    <p className="font-semibold text-base text-[var(--ink)]">
                      {opt.label}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        )}
        </div>
      </div>

      {/* =================================================================== */}
      {/* DOCKED BOTTOM BAR: CHECK ANSWER / FEEDBACK DRAWER                   */}
      {/* =================================================================== */}
      <div
        ref={ctaBarRef}
        className="sticky-cta-bar w-full px-4 sm:px-6 pt-2.5 border-t border-[var(--line)]/50"
      >
        <div className="max-w-2xl mx-auto">
          {feedback === null ? (
            <button
              type="button"
              disabled={!canCheck}
              onClick={handleCheck}
              className="btn-primary w-full disabled:opacity-45 disabled:pointer-events-none"
            >
              <span>Check Answer</span>
            </button>
          ) : (
            <div
              style={{
                backgroundColor: feedback.correct
                  ? 'var(--success-soft)'
                  : 'var(--error-soft)',
                borderColor: feedback.correct
                  ? 'var(--success)'
                  : 'var(--error)',
              }}
              className="p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-[var(--surface)]/80 border border-[var(--line)] flex items-center justify-center shrink-0 overflow-hidden">
                  <Mascot
                    {...(feedback.correct
                      ? MASCOT_PLACEMENTS.feedbackCorrect
                      : MASCOT_PLACEMENTS.feedbackWrong)}
                  />
                </div>
                {showComboSango && feedback.correct && (
                  <div className="w-12 h-12 rounded-2xl bg-[var(--surface)]/80 border border-[var(--amber)] flex items-center justify-center shrink-0 overflow-hidden">
                    <Mascot {...MASCOT_PLACEMENTS.feedbackComboPop} />
                  </div>
                )}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      style={{
                        color: feedback.correct
                          ? 'var(--success)'
                          : 'var(--error)',
                      }}
                      className="font-sans font-bold text-xs uppercase tracking-wider"
                    >
                      {feedback.correct
                        ? 'SARI! CORRECT'
                        : 'SWALPA MISS · KEEP GOING'}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-[var(--ink)]">
                    {feedback.kannada} ({feedback.localSay}) — &ldquo;
                    {feedback.meaning}&rdquo;
                  </p>
                  {!feedback.correct && (
                    <p className="text-xs text-[var(--muted)]">
                      Correct answer:{' '}
                      <strong className="text-[var(--ink)]">
                        {feedback.correctOptionLabel}
                      </strong>
                    </p>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={handleContinueAfterFeedback}
                className="btn-primary sm:w-auto px-6 shrink-0"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
