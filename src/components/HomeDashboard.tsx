import React, { useState, useMemo } from 'react';
import { Target, X } from 'lucide-react';
import { Flame } from './practice/Flame';
import { Situation, playTactileTone } from '../data/kanglishData';
import {
  COURSE_UNITS,
  getCurrentActiveLesson,
  isLevelCompleted,
} from '../data/courseData';
import {
  speakKannada,
  getKannadaScriptForText,
  useSpeakingState,
} from '../utils/speechUtils';
import { useProgress } from '../store/progressStore';
import { CurriculumPath } from './CurriculumPath';
import { loadGoals, isDue, Goal } from '../lib/goals';
import { getKaliyonaPrefs } from '../lib/kaliyona-prefs';

interface HomeDashboardProps {
  userName: string;
  situations: Situation[];
  activeSituationId: string;
  streak: number;
  totalXp: number;
  phrasesLearned: number;
  dailyGoalWords: number;
  todayWordsLearned: number;
  completedCurriculumLessons: Record<string, boolean>;
  onCompleteCurriculumLesson: (
    unitId: string,
    levelId: string,
    lessonId: string,
    earnedXp: number
  ) => void;
  onOpenLessonRoute: (
    unitId: string,
    levelId: string,
    lessonIndex: number
  ) => void;
  onUpdateDailyGoal: (newGoal: number) => void;
  onStartLesson: (
    situationId: string,
    mode?: 'lesson' | 'speak' | 'flashcards'
  ) => void;
  onNavigateTab: (tab: string) => void;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  userName,
  streak,
  completedCurriculumLessons,
  onCompleteCurriculumLesson,
  onOpenLessonRoute,
  onNavigateTab,
}) => {
  const { completedLessonsMap, lastActiveUnitId } = useProgress();
  const { isSpeaking } = useSpeakingState();

  const firstName = userName?.trim().split(/\s+/)[0] || 'Alex';

  const allCompletedMap = useMemo(
    () => ({
      ...completedCurriculumLessons,
      ...completedLessonsMap,
    }),
    [completedCurriculumLessons, completedLessonsMap]
  );

  const activeInfo = useMemo(
    () =>
      getCurrentActiveLesson(COURSE_UNITS, allCompletedMap, lastActiveUnitId),
    [allCompletedMap, lastActiveUnitId]
  );

  const {
    unit: activeUnit,
    level: activeLevel,
    lesson: activeLesson,
    lessonIndex: activeLessonIndex,
  } = activeInfo;

  const unitIndex = useMemo(() => {
    const idx = COURSE_UNITS.findIndex((u) => u.id === activeUnit.id);
    return idx >= 0 ? idx : 0;
  }, [activeUnit.id]);

  const unitNumber = unitIndex + 1;
  const totalLessonsInUnit = Math.max(1, activeUnit.levels.length || 5);

  const completedCountInUnit = useMemo(
    () =>
      activeUnit.levels.filter((lvl) => isLevelCompleted(lvl, allCompletedMap))
        .length,
    [activeUnit.levels, allCompletedMap]
  );

  const currentLessonNum = useMemo(() => {
    return Math.min(
      totalLessonsInUnit,
      Math.max(1, activeLevel?.levelNumber || completedCountInUnit + 1)
    );
  }, [completedCountInUnit, totalLessonsInUnit, activeLevel]);

  const progressPct = useMemo(() => {
    if (completedCountInUnit >= totalLessonsInUnit) {
      return 100;
    }
    return Math.round((completedCountInUnit / totalLessonsInUnit) * 100);
  }, [completedCountInUnit, totalLessonsInUnit]);

  const featuredPhrase = useMemo(() => {
    const items = activeLesson?.items || [];
    const primaryItem =
      items.find((it) => it.frame) ||
      items[0] || {
        kn: 'Namaskāra, hēgiddīra?',
        en: 'Hello, how are you?',
      };

    const cleanKn = primaryItem.kn.replace(/___+/g, 'Bengaluru').trim();
    const formattedTranslit =
      cleanKn.charAt(0).toUpperCase() + cleanKn.slice(1);
    const scriptText =
      getKannadaScriptForText(cleanKn) || 'ನಮಸ್ಕಾರ, ಹೇಗಿದ್ದೀರಾ?';

    const firstWordRaw = cleanKn.split(/[\s,]+/)[0] || 'Namaskāra';
    const audioLabelWord =
      firstWordRaw.charAt(0).toUpperCase() +
      firstWordRaw.slice(1).replace(/[?!.]+$/, '') +
      '!';

    return {
      cardTitle: `Unit ${unitNumber}: ${activeLesson?.title || activeUnit.title}`,
      kannada: scriptText,
      translit: formattedTranslit,
      audioLabel: audioLabelWord,
      audioScript: scriptText,
    };
  }, [activeUnit, activeLesson, unitNumber]);

  const handleHearAutoAnna = () => {
    playTactileTone('tap');
    speakKannada(featuredPhrase.audioScript, {
      script: featuredPhrase.audioScript,
      fallbackTranslit: featuredPhrase.translit,
      itemId: `home-hero-${activeLesson?.id || 'u1'}`,
    });
  };

  const handleContinueLearning = () => {
    playTactileTone('tap');
    onOpenLessonRoute(activeUnit.id, activeLevel.id, activeLessonIndex);
  };

  const todayISO = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  const [isNudgeDismissed, setIsNudgeDismissed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      const now = new Date();
      const iso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      return Boolean(sessionStorage.getItem(`kaliyona_nudge_dismissed_${iso}`));
    } catch {
      return false;
    }
  });

  const dueGoals = useMemo(() => {
    if (isNudgeDismissed) return [];
    const prefs = getKaliyonaPrefs();
    if (!prefs.reminder) return [];
    const all = loadGoals();
    return all.filter(isDue);
  }, [isNudgeDismissed]);

  const handlePracticeDueGoal = (goal: Goal) => {
    playTactileTone('tap');
    try {
      if (goal.scenarioId) {
        sessionStorage.setItem('kaliyona_active_scenario', goal.scenarioId);
      }
    } catch {}
    if (onNavigateTab) {
      onNavigateTab('explore');
    }
  };

  const handleDismissNudge = (e: React.MouseEvent) => {
    e.stopPropagation();
    playTactileTone('tap');
    try {
      sessionStorage.setItem(`kaliyona_nudge_dismissed_${todayISO}`, '1');
    } catch {}
    setIsNudgeDismissed(true);
  };

  return (
    <div className="w-full max-w-lg mx-auto space-y-5 text-on-surface">
      {/* PRACTICE NUDGE BANNER (DUE GOALS WITH REMINDERS) */}
      {!isNudgeDismissed && dueGoals.length > 0 && (
        <div className="glass-tinted relative overflow-hidden p-4 flex items-start justify-between gap-3 text-neutral-900 transition-all">
          <div className="flex items-start gap-3 min-w-0 text-left">
            <div className="w-10 h-10 rounded-2xl bg-violet-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Target size={20} strokeWidth={2} />
            </div>
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-violet-700">
                  PRACTICE REMINDER
                </span>
                {dueGoals.length > 1 && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-200/70 text-violet-800">
                    +{dueGoals.length - 1} more due today
                  </span>
                )}
              </div>
              <p className="text-[15px] font-semibold text-neutral-900 leading-snug break-words">
                {dueGoals[0].title}
              </p>
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => handlePracticeDueGoal(dueGoals[0])}
                  className="min-h-[38px] inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 active:scale-95 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer touch-manipulation"
                >
                  <span>Practice now</span>
                  <span>→</span>
                </button>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDismissNudge}
            className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-violet-100 transition-colors cursor-pointer shrink-0 touch-manipulation"
            aria-label="Dismiss reminder"
          >
            <X size={15} strokeWidth={2.5} />
          </button>
        </div>
      )}

      {/* ================================================================= */}
      {/* §1 GREETING HERO CARD                                             */}
      {/* ================================================================= */}
      <div className="glass-strong relative overflow-hidden px-5 py-5 sm:px-6 sm:py-6 text-left">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[url('/assets/aistudio/Screenshot_2026-10-26_at_1.51.00_PM_3bd6827e.png')] bg-cover bg-right bg-no-repeat mix-blend-multiply opacity-90 [mask-image:linear-gradient(to_right,transparent_22%,black_62%)] [-webkit-mask-image:linear-gradient(to_right,transparent_22%,black_62%)]"
        />
        <div className="relative z-10 pr-28 sm:pr-40 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-primary whitespace-nowrap">
              NAMASKĀRA BENGALURU!
            </span>

            {/* Compact Home Streak Pill */}
            <button
              type="button"
              data-streak-card="true"
              onClick={() => onNavigateTab('progress')}
              className="glass-tinted !rounded-full inline-flex items-center gap-1.5 px-2.5 py-0.5 shrink-0 cursor-pointer transition-transform active:scale-95 touch-manipulation"
            >
              <Flame size={13} animated={false} />
              <span className="text-[11px] font-extrabold text-primary tabular-nums whitespace-nowrap">
                {streak}d streak
              </span>
            </button>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-950 tracking-tight leading-tight">
            Hello, {firstName}!
          </h1>

          <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-600">
            WHAT DO YOU WANT TO LEARN TODAY?
          </p>
        </div>
      </div>

      {/* ================================================================= */}
      {/* §2 PICK UP WHERE YOU LEFT OFF                                     */}
      {/* ================================================================= */}
      <div className="space-y-2 text-left">
        <div className="flex items-center justify-between gap-2 px-1">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-on-surface-variant truncate">
            PICK UP WHERE YOU LEFT OFF · {activeUnit.title.toUpperCase()}
          </span>
          <span className="text-xs font-extrabold text-primary shrink-0">
            Lesson {currentLessonNum} of {totalLessonsInUnit}
          </span>
        </div>

        <div className="glass-strong relative overflow-hidden p-5 sm:px-6 sm:py-5">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[url('/assets/aistudio/Screenshot_2026-10-26_at_1.50.41_PM_9927446e.png')] bg-cover bg-[position:right_15%] bg-no-repeat mix-blend-multiply opacity-90 [mask-image:linear-gradient(to_right,transparent_25%,black_65%)] [-webkit-mask-image:linear-gradient(to_right,transparent_25%,black_65%)]"
          />

          <div className="relative z-10 flex flex-col gap-3.5">
            {/* Card Header + Phrase Row */}
            <div className="pr-24 sm:pr-32 space-y-1 text-left">
              <div className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-primary">
                PHASE {activeUnit.phase} · LESSON {currentLessonNum} OF{' '}
                {totalLessonsInUnit}
              </div>

              <h2 className="text-lg sm:text-xl font-extrabold text-neutral-950 tracking-tight leading-snug">
                {featuredPhrase.cardTitle}
              </h2>

              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 pt-0.5">
                <span className="text-base sm:text-lg font-bold text-neutral-950 leading-snug">
                  {featuredPhrase.kannada}
                </span>
                <span className="text-xs sm:text-sm font-semibold text-neutral-600">
                  ({featuredPhrase.translit})
                </span>
              </div>
            </div>

            {/* Segmented Unit Progress */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] sm:text-xs">
                <span className="font-semibold text-neutral-600">
                  Unit Progress ({completedCountInUnit}/{totalLessonsInUnit} done)
                </span>
                <span className="font-extrabold text-primary tabular-nums">
                  {progressPct}%
                </span>
              </div>

              <div className="grid grid-cols-5 gap-1.5">
                {activeUnit.levels.map((lvl, idx) => {
                  const isDone = isLevelCompleted(lvl, allCompletedMap);
                  const isCurrentStep = !isDone && idx === completedCountInUnit;
                  return (
                    <div
                      key={lvl.id}
                      className={`h-2 rounded-full transition-all duration-300 ${
                        isDone
                          ? 'bg-primary'
                          : isCurrentStep
                          ? 'bg-primary/35 ring-1 ring-primary/40'
                          : 'bg-neutral-900/10'
                      }`}
                    />
                  );
                })}
              </div>
            </div>

            {/* Action Row: Audio Preview Pill + Compact Continue Learning Button */}
            <div className="w-full min-w-0 flex items-center justify-between gap-2 sm:gap-3">
              <button
                type="button"
                onClick={handleHearAutoAnna}
                aria-label={`Hear Auto Anna say ${featuredPhrase.audioLabel}`}
                className="h-10 min-w-0 flex-1 sm:flex-initial rounded-xl bg-white/90 hover:bg-white border border-neutral-200/90 px-2.5 sm:px-3 flex items-center gap-2 transition-all active:scale-[0.98] cursor-pointer text-left touch-manipulation shadow-2xs overflow-hidden"
              >
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                    isSpeaking
                      ? 'bg-primary text-on-primary'
                      : 'bg-primary-fixed text-primary'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">
                    volume_up
                  </span>
                </span>
                <div className="min-w-0 flex-1 pr-0.5 overflow-hidden">
                  <span className="text-[9px] font-semibold text-neutral-500 block leading-tight truncate">
                    Hear Anna
                  </span>
                  <span className="text-[11px] font-extrabold text-primary truncate block leading-tight">
                    &ldquo;{featuredPhrase.audioLabel}&rdquo;
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={handleContinueLearning}
                className="h-10 px-3 sm:px-4 rounded-xl bg-primary hover:bg-primary/95 text-white font-bold text-[11px] sm:text-xs uppercase tracking-wide sm:tracking-wider shadow-[0_3px_10px_rgba(83,65,205,0.28)] active:translate-y-[1px] active:shadow-none transition-all inline-flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer shrink-0 max-w-full whitespace-nowrap touch-manipulation"
              >
                <span className="material-symbols-outlined text-[16px] shrink-0">
                  play_arrow
                </span>
                <span>Continue Learning</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ================================================================= */}
      {/* §3 DUOLINGO-STYLE VERTICAL WINDING LESSON PATH                    */}
      {/* ================================================================= */}
      <CurriculumPath
        completedLessons={completedCurriculumLessons}
        onStartCurriculumLesson={(unit, level, _lesson, lessonIdx) => {
          onOpenLessonRoute(unit.id, level.id, lessonIdx);
        }}
        onQuickCompleteLesson={onCompleteCurriculumLesson}
      />
    </div>
  );
};
