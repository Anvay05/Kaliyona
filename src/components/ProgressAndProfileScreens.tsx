import React, { useState, useEffect, useMemo } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';
import {
  Briefcase,
  Zap,
  Flame as LucideFlame,
  BookOpen,
  Bookmark,
  Star,
  ChevronRight,
  Check,
  Trophy,
  CalendarCheck,
  LogOut,
  Play,
  Volume2,
  Clock,
} from 'lucide-react';
import { resetOnboarding } from '@/lib/onboarding';
import { NotesDeckSection } from '@/components/profile/NotesDeckSection';
import { useWallet } from '@/lib/wallet/store';
import { STRINGS } from '@/lib/i18n';
import { motion, useReducedMotion } from 'motion/react';
import {
  Situation,
  playTactileTone,
  speakKannada,
} from '../data/kanglishData';
import {
  useProgress,
  ACHIEVEMENT_DEFS,
  getBoxIntervalMs,
} from '../store/progressStore';
import { COURSE_UNITS } from '../data/courseData';
import { Mascot, MASCOT_PLACEMENTS } from './Mascot';
import { AnimatedSwitch } from './ui/animated-switch';
import {
  getKaliyonaPrefs,
  setKaliyonaPrefs,
  KaliyonaPrefs,
} from '../lib/kaliyona-prefs';
import { StreakCard } from '@/components/practice/StreakCard';
import { Flame } from '@/components/practice/Flame';
import { getStreakStats, onStreakChange, type StreakStats } from '@/lib/streak';
import {
  ProfileCardBackdropDoodle,
  type ProfileCardBackdropVariant,
} from './UnitBackgroundDoodles';

function StreakStatTiles() {
  const reduce = useReducedMotion() ?? false;
  const [stats, setStats] = useState<StreakStats | null>(null);

  useEffect(() => {
    setStats(getStreakStats());
    return onStreakChange(() => setStats(getStreakStats()));
  }, []);

  if (!stats) {
    return (
      <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              backgroundColor: 'var(--progress-card)',
              boxShadow: 'var(--progress-card-shadow)',
            }}
            className="h-20 animate-pulse rounded-[22px] border border-[var(--progress-grid-track)] px-4 py-3.5"
          />
        ))}
      </div>
    );
  }

  const tiles: Array<{
    label: string;
    value: string;
    icon: React.ReactNode;
  }> = [
    {
      label: 'Active days',
      value: String(stats.totalActiveDays),
      icon: <Flame size={18} variant="violet" />,
    },
    {
      label: 'Best streak',
      value: String(stats.bestStreak),
      icon: <Trophy size={16} className="text-[var(--progress-primary)]" />,
    },
    {
      label: 'This week',
      value: `${stats.activeLast7}/7`,
      icon: <CalendarCheck size={16} className="text-[var(--progress-accent-teal)]" />,
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5">
      {tiles.map((t) => (
        <div
          key={t.label}
          style={{
            backgroundColor: 'var(--progress-card)',
            boxShadow: 'var(--progress-card-shadow)',
          }}
          className="relative overflow-hidden rounded-[22px] flex flex-col justify-between gap-2 p-3.5 sm:p-5 text-left"
        >
          <div className="relative z-10 flex items-center justify-between gap-1.5 w-full">
            <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-[var(--progress-text-muted)] leading-tight truncate">
              {t.label}
            </span>
            <span
              style={{ backgroundColor: 'var(--progress-icon-bg)' }}
              className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl text-[var(--progress-primary)]"
            >
              {t.icon}
            </span>
          </div>
          <div className="relative z-10 text-2xl sm:text-3xl font-extrabold leading-none tracking-tight text-[var(--progress-text-dark)] tabular-nums">
            <motion.span
              key={t.value}
              initial={reduce ? { opacity: 0 } : { y: 4, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="inline-block"
            >
              {t.value}
            </motion.span>
          </div>
        </div>
      ))}
    </div>
  );
}

function AchievementCardPattern({
  pattern,
  accentColor,
}: {
  pattern: string;
  accentColor: string;
}) {
  switch (pattern) {
    case 'rays':
      return (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none opacity-25"
          viewBox="0 0 160 160"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <g stroke={accentColor} strokeWidth="1.5" opacity="0.45">
            <line x1="80" y1="-10" x2="10" y2="170" />
            <line x1="80" y1="-10" x2="45" y2="170" />
            <line x1="80" y1="-10" x2="80" y2="170" />
            <line x1="80" y1="-10" x2="115" y2="170" />
            <line x1="80" y1="-10" x2="150" y2="170" />
          </g>
          <circle cx="80" cy="0" r="46" fill={accentColor} opacity="0.1" />
        </svg>
      );
    case 'dots':
      return (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none opacity-30"
          viewBox="0 0 120 120"
          aria-hidden="true"
        >
          <defs>
            <pattern id={`dots-${accentColor.replace('#', '')}`} width="18" height="18" patternUnits="userSpaceOnUse">
              <circle cx="4" cy="4" r="2" fill={accentColor} opacity="0.4" />
              <circle cx="13" cy="13" r="1.5" fill={accentColor} opacity="0.25" />
            </pattern>
          </defs>
          <rect width="120" height="120" fill={`url(#dots-${accentColor.replace('#', '')})`} />
        </svg>
      );
    case 'waves':
      return (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none opacity-25"
          viewBox="0 0 160 160"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d="M0 35 Q 40 15, 80 35 T 160 35"
            fill="none"
            stroke={accentColor}
            strokeWidth="2"
            opacity="0.4"
          />
          <path
            d="M0 80 Q 40 60, 80 80 T 160 80"
            fill="none"
            stroke={accentColor}
            strokeWidth="2"
            opacity="0.3"
          />
          <path
            d="M0 125 Q 40 105, 80 125 T 160 125"
            fill="none"
            stroke={accentColor}
            strokeWidth="2"
            opacity="0.35"
          />
        </svg>
      );
    case 'grid':
      return (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none opacity-25"
          viewBox="0 0 120 120"
          aria-hidden="true"
        >
          <defs>
            <pattern id={`grid-${accentColor.replace('#', '')}`} width="20" height="20" patternUnits="userSpaceOnUse">
              <path
                d="M 20 0 L 0 0 0 20"
                fill="none"
                stroke={accentColor}
                strokeWidth="1"
                opacity="0.4"
              />
            </pattern>
          </defs>
          <rect width="120" height="120" fill={`url(#grid-${accentColor.replace('#', '')})`} />
        </svg>
      );
    case 'diamonds':
      return (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none opacity-25"
          viewBox="0 0 120 120"
          aria-hidden="true"
        >
          <defs>
            <pattern id={`dia-${accentColor.replace('#', '')}`} width="24" height="24" patternUnits="userSpaceOnUse">
              <polygon
                points="12,2 22,12 12,22 2,12"
                fill="none"
                stroke={accentColor}
                strokeWidth="1.2"
                opacity="0.38"
              />
            </pattern>
          </defs>
          <rect width="120" height="120" fill={`url(#dia-${accentColor.replace('#', '')})`} />
        </svg>
      );
    case 'rings':
      return (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none opacity-25"
          viewBox="0 0 160 160"
          aria-hidden="true"
        >
          <circle cx="135" cy="25" r="24" fill="none" stroke={accentColor} strokeWidth="2" opacity="0.4" />
          <circle cx="135" cy="25" r="42" fill="none" stroke={accentColor} strokeWidth="1.5" opacity="0.28" />
          <circle cx="25" cy="135" r="32" fill="none" stroke={accentColor} strokeWidth="1.5" opacity="0.3" />
        </svg>
      );
    case 'stars':
      return (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none opacity-30"
          viewBox="0 0 160 160"
          aria-hidden="true"
        >
          <g fill={accentColor} opacity="0.42">
            <circle cx="24" cy="28" r="2.5" />
            <circle cx="136" cy="34" r="3" />
            <circle cx="128" cy="122" r="2" />
            <circle cx="30" cy="118" r="2.5" />
            <path d="M130 70 L132 76 L138 78 L132 80 L130 86 L128 80 L122 78 L128 76 Z" />
            <path d="M28 66 L29.5 70.5 L34 72 L29.5 73.5 L28 78 L26.5 73.5 L22 72 L26.5 70.5 Z" />
          </g>
        </svg>
      );
    case 'chevrons':
    default:
      return (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none opacity-25"
          viewBox="0 0 160 160"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d="M-10 45 L35 20 L80 45 L125 20 L170 45"
            fill="none"
            stroke={accentColor}
            strokeWidth="2"
            opacity="0.35"
          />
          <path
            d="M-10 105 L35 80 L80 105 L125 80 L170 105"
            fill="none"
            stroke={accentColor}
            strokeWidth="2"
            opacity="0.3"
          />
        </svg>
      );
  }
}

/**
 * Simple count-up animation hook on mount / target change.
 */
function useCountUp(target: number, durationMs = 550): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let rafId: number;
    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) {
        rafId = requestAnimationFrame(step);
      }
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [target, durationMs]);

  return value;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatDateKey(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// Ensure circular progress rings animate their stroke on first view ONCE only — not on every re-render
let hasAnimatedProgressRingOnce = false;
let hasAnimatedProfileRingOnce = false;

interface ProgressScreenProps {
  totalXp: number;
  lessonsCompleted: number;
  phrasesLearned: number;
  streak: number;
  situations: Situation[];
  onSelectSituation: (id: string) => void;
}

export const ProgressScreen: React.FC<ProgressScreenProps> = () => {
  const {
    xp,
    streak,
    xpLog,
    wordsLog,
    dailyGoal,
    words,
    totalLessonsCompletedCount,
    crownedUnitsCount,
    achievements,
    achievementDates,
  } = useProgress();

  const [timeframe, setTimeframe] = useState<'week' | 'month'>('week');
  const [streakChartMode, setStreakChartMode] = useState<'area' | 'bar'>('area');

  const wordsLearnedCount = Object.keys(words).length;
  const animatedLessons = useCountUp(totalLessonsCompletedCount);
  const animatedWords = useCountUp(wordsLearnedCount);
  const animatedStreak = useCountUp(streak);
  const animatedXp = useCountUp(xp);

  const [selectedContributionDay, setSelectedContributionDay] = useState<string | null>(null);
  const [playingPhraseKey, setPlayingPhraseKey] = useState<string | null>(null);

  const recentPhrases = useMemo(() => {
    const entries = Object.entries(words).map(([key, entry], index) => {
      const derivedTimestamp =
        typeof entry.lastPracticedAt === 'number'
          ? entry.lastPracticedAt
          : entry.box > 1
          ? entry.due - getBoxIntervalMs(entry.box) + index * 1000
          : entry.due - (20 - index) * 60 * 1000;

      return {
        key,
        kannada: entry.kannada || key,
        translit: entry.translit || key,
        meaning: entry.meaning || 'Kannada survival phrase',
        example: entry.example,
        box: entry.box,
        timestamp: derivedTimestamp,
      };
    });

    return entries.sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);
  }, [words]);

  const formatRelativePracticeTime = (timestamp: number, index: number): string => {
    const diffMs = Math.max(0, Date.now() - timestamp);
    const diffMins = Math.floor(diffMs / (60 * 1000));
    if (diffMins < 2) return index === 0 ? 'Just now' : `${index + 1}m ago`;
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    const d = new Date(timestamp);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  const handlePlayRecentPhrase = (phrase: {
    key: string;
    kannada: string;
    translit: string;
  }) => {
    playTactileTone('tap');
    setPlayingPhraseKey(phrase.key);
    speakKannada(phrase.translit, {
      script: phrase.kannada,
      itemId: `recent-timeline-${phrase.key}`,
      onStart: () => setPlayingPhraseKey(phrase.key),
      onEnd: () =>
        setPlayingPhraseKey((prev) => (prev === phrase.key ? null : prev)),
      onUnsupported: () =>
        setPlayingPhraseKey((prev) => (prev === phrase.key ? null : prev)),
    });
  };

  const lastSevenDaysData = useMemo(() => {
    const result: {
      dateKey: string;
      day: string;
      shortDate: string;
      xp: number;
      wordsLearned: number;
      intensity: 0 | 1 | 2 | 3 | 4;
      intensityLabel: string;
      active: boolean;
      isToday: boolean;
    }[] = [];

    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - i
      );
      const key = formatDateKey(d);
      const dayXp = xpLog[key] ?? 0;
      const dayWords =
        wordsLog?.[key] !== undefined
          ? wordsLog[key]
          : dayXp > 0
          ? Math.max(1, Math.round(dayXp / 5))
          : 0;

      const activityScore = dayWords * 4 + dayXp;
      let intensity: 0 | 1 | 2 | 3 | 4 = 0;
      let intensityLabel = 'No activity';
      if (activityScore <= 0) {
        intensity = 0;
        intensityLabel = 'No activity';
      } else if (activityScore < 20) {
        intensity = 1;
        intensityLabel = 'Light session';
      } else if (activityScore < 32) {
        intensity = 2;
        intensityLabel = 'Steady practice';
      } else if (activityScore < 48) {
        intensity = 3;
        intensityLabel = 'High consistency';
      } else {
        intensity = 4;
        intensityLabel = 'Peak mastery';
      }

      result.push({
        dateKey: key,
        day: DAY_LABELS[d.getDay()],
        shortDate: `${d.getMonth() + 1}/${d.getDate()}`,
        xp: dayXp,
        wordsLearned: dayWords,
        intensity,
        intensityLabel,
        active: dayXp > 0 || dayWords > 0,
        isToday: i === 0,
      });
    }
    return result;
  }, [xpLog, wordsLog]);

  const todayEntry = lastSevenDaysData[lastSevenDaysData.length - 1];
  const weeklyXpTotal = useMemo(
    () => lastSevenDaysData.reduce((sum, item) => sum + item.xp, 0),
    [lastSevenDaysData]
  );
  const activeStreakDaysThisWeek = useMemo(
    () => lastSevenDaysData.filter((item) => item.active).length,
    [lastSevenDaysData]
  );
  const peakDayXp = useMemo(
    () => Math.max(0, ...lastSevenDaysData.map((item) => item.xp)),
    [lastSevenDaysData]
  );
  const avgDailyXp = useMemo(
    () => Math.round(weeklyXpTotal / 7),
    [weeklyXpTotal]
  );
  const dailyGoalTarget = dailyGoal > 0 ? dailyGoal : 50;
  const weeklyWordsTotal = useMemo(
    () => lastSevenDaysData.reduce((sum, item) => sum + item.wordsLearned, 0),
    [lastSevenDaysData]
  );
  const activeConsistencyDays = useMemo(
    () => lastSevenDaysData.filter((item) => item.wordsLearned > 0).length,
    [lastSevenDaysData]
  );

  const focusedContributionDay = useMemo(() => {
    if (selectedContributionDay) {
      const found = lastSevenDaysData.find(
        (d) => d.dateKey === selectedContributionDay
      );
      if (found) return found;
    }
    return todayEntry;
  }, [selectedContributionDay, lastSevenDaysData, todayEntry]);

  const totalUnits = COURSE_UNITS.length || 30;
  const crownedClamped = Math.min(totalUnits, crownedUnitsCount);
  const remainingUnits = Math.max(0, totalUnits - crownedClamped);
  const crownedPct = Math.round((crownedClamped / totalUnits) * 100);

  const ringRadius = 58;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringDashOffset =
    ringCircumference - (crownedPct / 100) * ringCircumference;

  const [progressRingReady, setProgressRingReady] = useState<boolean>(
    () => hasAnimatedProgressRingOnce
  );

  useEffect(() => {
    if (hasAnimatedProgressRingOnce) {
      setProgressRingReady(true);
      return;
    }
    hasAnimatedProgressRingOnce = true;
    const rafId = requestAnimationFrame(() => {
      setProgressRingReady(true);
    });
    return () => cancelAnimationFrame(rafId);
  }, []);

  const displayedRingDashOffset = progressRingReady
    ? ringDashOffset
    : ringCircumference;

  const unlockedCount = achievements.length;

  return (
    <div
      data-progress-fitness-section="true"
      style={{ backgroundColor: 'var(--progress-bg)' }}
      className="relative overflow-hidden rounded-[28px] p-4 sm:p-6 md:p-7 space-y-5"
    >
      {/* Decorative soft blurred purple blob shapes (never intercept clicks) */}
      <div
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(circle, rgba(123, 97, 255, 0.24) 0%, rgba(123, 97, 255, 0) 70%)',
        }}
        className="pointer-events-none select-none absolute -top-28 -left-24 w-96 h-96 rounded-full blur-3xl z-0"
      />
      <div
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(circle, rgba(155, 140, 255, 0.22) 0%, rgba(56, 217, 208, 0.10) 55%, rgba(155, 140, 255, 0) 75%)',
        }}
        className="pointer-events-none select-none absolute -bottom-32 -right-24 w-[28rem] h-[28rem] rounded-full blur-3xl z-0"
      />

      <div className="relative z-10 space-y-5">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="mono-label text-[var(--progress-primary)]">
              LEARNING ANALYTICS · BENGALURU MASTERY
            </span>
            <h1
              className="font-display font-bold text-[var(--progress-text-dark)] mt-0.5"
              style={{ fontSize: 'var(--text-h2)' }}
            >
              Your Kaliyona Progress
            </h1>
          </div>

          <div
            style={{ backgroundColor: 'var(--progress-icon-bg)' }}
            className="flex items-center gap-1 p-1 rounded-full border border-[var(--progress-grid-track)]"
          >
            <button
              type="button"
              onClick={() => setTimeframe('week')}
              className={`min-h-[36px] px-4 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-colors touch-manipulation ${
                timeframe === 'week'
                  ? 'bg-[var(--progress-primary)] text-white shadow-2xs'
                  : 'text-[var(--progress-text-muted)] hover:text-[var(--progress-text-dark)]'
              }`}
            >
              Last 7 Days
            </button>
            <button
              type="button"
              onClick={() => setTimeframe('month')}
              className={`min-h-[36px] px-4 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-colors touch-manipulation ${
                timeframe === 'month'
                  ? 'bg-[var(--progress-primary)] text-white shadow-2xs'
                  : 'text-[var(--progress-text-muted)] hover:text-[var(--progress-text-dark)]'
              }`}
            >
              All Time
            </button>
          </div>
        </div>

        {/* HERO STREAK CARD (--progress-gradient) + 3-TILE STREAK STATS ROW */}
        <div
          style={{ '--card-delay': '0ms' } as React.CSSProperties}
          className="anim-card-fade-up space-y-3.5"
        >
          <StreakCard variant="progress" />
          <StreakStatTiles />
        </div>

        {/* 7-DAY STREAK & XP VISUALIZER (Recharts) — VIOLET FITNESS PALETTE */}
        <div
          style={
            {
              backgroundColor: 'var(--progress-card)',
              boxShadow: 'var(--progress-card-shadow)',
              '--card-delay': '45ms',
            } as React.CSSProperties
          }
          className="anim-card-fade-up rounded-[22px] p-4 sm:p-6 space-y-4"
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                style={{ backgroundColor: 'var(--progress-icon-bg)' }}
                className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 text-[var(--progress-primary)]"
              >
                <LucideFlame className="w-5 h-5 text-[var(--progress-primary)]" />
              </div>
              <div className="min-w-0">
                <span className="mono-label text-[var(--progress-text-muted)]">
                  7-DAY STREAK VISUALIZER · WEEKLY XP GAINED
                </span>
                <div className="flex flex-wrap items-baseline gap-2.5 mt-0.5">
                  <h2 className="font-display font-extrabold text-xl sm:text-2xl text-[var(--progress-text-dark)] tabular-nums">
                    {streak} Day Streak
                  </h2>
                  <span
                    style={{ backgroundColor: 'var(--progress-icon-bg)' }}
                    className="font-mono-accent text-[11px] sm:text-xs font-bold px-3 py-1 rounded-full text-[var(--progress-primary)]"
                  >
                    +{weeklyXpTotal} XP last 7 days
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <div
                style={{ backgroundColor: 'var(--progress-icon-bg)' }}
                className="px-3 py-1 rounded-full flex items-center gap-1"
              >
                <Zap className="w-3.5 h-3.5 text-[var(--progress-primary)] shrink-0" />
                <span className="font-mono-accent text-[11px] sm:text-xs text-[var(--progress-text-muted)]">
                  Peak:
                </span>
                <span className="font-mono-accent text-[11px] sm:text-xs font-bold text-[var(--progress-primary)] tabular-nums">
                  {peakDayXp} XP
                </span>
              </div>
              <div
                style={{ backgroundColor: 'var(--progress-icon-bg)' }}
                className="px-3 py-1 rounded-full flex items-center gap-1"
              >
                <span className="font-mono-accent text-[11px] sm:text-xs text-[var(--progress-text-muted)]">
                  Avg:
                </span>
                <span className="font-mono-accent text-[11px] sm:text-xs font-bold text-[var(--progress-primary-deep)] tabular-nums">
                  {avgDailyXp} XP/d
                </span>
              </div>
              <div
                style={{ backgroundColor: 'var(--progress-icon-bg)' }}
                className="px-3 py-1 rounded-full flex items-center gap-1"
              >
                <span className="font-mono-accent text-[11px] sm:text-xs text-[var(--progress-text-muted)]">
                  Active:
                </span>
                <span className="font-mono-accent text-[11px] sm:text-xs font-bold text-[var(--progress-accent-teal)] tabular-nums">
                  {activeStreakDaysThisWeek}/7d
                </span>
              </div>

              <div
                style={{ backgroundColor: 'var(--progress-icon-bg)' }}
                className="flex items-center gap-1 p-1 rounded-full ml-auto sm:ml-0"
              >
                <button
                  type="button"
                  onClick={() => setStreakChartMode('area')}
                  className={`px-3 py-1 rounded-full text-[10px] sm:text-[11px] font-mono-accent font-semibold cursor-pointer transition-colors touch-manipulation ${
                    streakChartMode === 'area'
                      ? 'bg-[var(--progress-primary)] text-white shadow-2xs'
                      : 'text-[var(--progress-text-muted)] hover:text-[var(--progress-text-dark)]'
                  }`}
                >
                  Curve
                </button>
                <button
                  type="button"
                  onClick={() => setStreakChartMode('bar')}
                  className={`px-3 py-1 rounded-full text-[10px] sm:text-[11px] font-mono-accent font-semibold cursor-pointer transition-colors touch-manipulation ${
                    streakChartMode === 'bar'
                      ? 'bg-[var(--progress-primary)] text-white shadow-2xs'
                      : 'text-[var(--progress-text-muted)] hover:text-[var(--progress-text-dark)]'
                  }`}
                >
                  Bars
                </button>
              </div>
            </div>
          </div>

          {/* Recharts 7-Day XP Gained Visualizer */}
          <div className="h-44 sm:h-48 w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              {streakChartMode === 'area' ? (
                <AreaChart
                  data={lastSevenDaysData}
                  margin={{ top: 10, right: 8, left: -22, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="streakXpVioletFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--progress-primary)" stopOpacity={0.38} />
                      <stop offset="65%" stopColor="var(--progress-primary-deep)" stopOpacity={0.14} />
                      <stop offset="95%" stopColor="var(--progress-bg)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    stroke="var(--progress-grid-track)"
                    strokeOpacity={0.85}
                    strokeDasharray="3 3"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="day"
                    interval={0}
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fill: 'var(--progress-text-muted)',
                      fontSize: 11,
                      fontFamily: 'var(--font-sans)',
                    }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                    tick={{
                      fill: 'var(--progress-text-muted)',
                      fontSize: 11,
                      fontFamily: 'var(--font-sans)',
                    }}
                  />
                  <ReferenceLine
                    y={dailyGoalTarget}
                    stroke="var(--progress-accent-teal)"
                    strokeDasharray="4 4"
                    strokeOpacity={0.85}
                    label={{
                      value: `Goal ${dailyGoalTarget} XP`,
                      position: 'insideTopRight',
                      fill: 'var(--progress-accent-teal)',
                      fontSize: 10,
                      fontFamily: 'var(--font-sans)',
                    }}
                  />
                  <Tooltip
                    cursor={{
                      stroke: 'var(--progress-primary)',
                      strokeWidth: 1.5,
                      strokeDasharray: '4 4',
                    }}
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const item = payload[0].payload as (typeof lastSevenDaysData)[number];
                      const goalMet = item.xp >= dailyGoalTarget;
                      return (
                        <div
                          style={{
                            backgroundColor: 'var(--progress-card)',
                            boxShadow: 'var(--progress-card-shadow)',
                          }}
                          className="rounded-2xl border border-[var(--progress-grid-track)] px-3.5 py-2.5 text-[var(--progress-text-dark)] font-mono-accent text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="font-bold">
                              {item.day} ({item.shortDate})
                              {item.isToday ? ' · Today' : ''}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                item.active
                                  ? 'bg-[var(--progress-icon-bg)] text-[var(--progress-primary)]'
                                  : 'bg-[var(--progress-bg)] text-[var(--progress-text-muted)]'
                              }`}
                            >
                              {item.active ? 'Streak Kept' : '0 XP'}
                            </span>
                          </div>
                          <div className="text-[var(--progress-primary)] font-bold text-sm">
                            +{item.xp} XP gained
                          </div>
                          <div className="text-[var(--progress-text-muted)] text-[11px] flex items-center justify-between gap-3">
                            <span>{item.wordsLearned} words practiced</span>
                            <span
                              className={
                                goalMet
                                  ? 'text-[var(--progress-accent-teal)] font-semibold'
                                  : ''
                              }
                            >
                              {goalMet
                                ? 'Daily goal met'
                                : `${Math.min(100, Math.round((item.xp / dailyGoalTarget) * 100))}% of goal`}
                            </span>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="xp"
                    stroke="var(--progress-primary)"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#streakXpVioletFill)"
                    activeDot={{
                      r: 6,
                      fill: 'var(--progress-primary)',
                      stroke: 'var(--progress-card)',
                      strokeWidth: 2,
                    }}
                    dot={(props: {
                      cx?: number;
                      cy?: number;
                      payload?: (typeof lastSevenDaysData)[number];
                    }) => {
                      const { cx, cy, payload } = props;
                      if (
                        typeof cx !== 'number' ||
                        typeof cy !== 'number' ||
                        !payload
                      ) {
                        return <svg key="empty" />;
                      }
                      return (
                        <circle
                          key={payload.dateKey}
                          cx={cx}
                          cy={cy}
                          r={payload.isToday ? 5.5 : payload.active ? 4.5 : 3}
                          fill={
                            payload.isToday
                              ? 'var(--progress-accent-teal)'
                              : payload.active
                              ? 'var(--progress-primary)'
                              : 'var(--progress-grid-track)'
                          }
                          stroke="var(--progress-card)"
                          strokeWidth={2}
                        />
                      );
                    }}
                  />
                </AreaChart>
              ) : (
                <BarChart
                  data={lastSevenDaysData}
                  margin={{ top: 10, right: 12, left: -18, bottom: 0 }}
                  barCategoryGap="24%"
                >
                  <defs>
                    <linearGradient id="streakXpBarActive" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--progress-primary)" stopOpacity={0.98} />
                      <stop offset="100%" stopColor="var(--progress-primary-deep)" stopOpacity={0.88} />
                    </linearGradient>
                    <linearGradient id="streakXpBarToday" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--progress-accent-teal)" stopOpacity={0.98} />
                      <stop offset="100%" stopColor="var(--progress-primary)" stopOpacity={0.9} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    stroke="var(--progress-grid-track)"
                    strokeOpacity={0.85}
                    strokeDasharray="3 3"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="day"
                    interval={0}
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fill: 'var(--progress-text-muted)',
                      fontSize: 11,
                      fontFamily: 'var(--font-sans)',
                    }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                    tick={{
                      fill: 'var(--progress-text-muted)',
                      fontSize: 11,
                      fontFamily: 'var(--font-sans)',
                    }}
                  />
                  <ReferenceLine
                    y={dailyGoalTarget}
                    stroke="var(--progress-accent-teal)"
                    strokeDasharray="4 4"
                    strokeOpacity={0.85}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(123, 97, 255, 0.08)' }}
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const item = payload[0].payload as (typeof lastSevenDaysData)[number];
                      return (
                        <div
                          style={{
                            backgroundColor: 'var(--progress-card)',
                            boxShadow: 'var(--progress-card-shadow)',
                          }}
                          className="rounded-2xl border border-[var(--progress-grid-track)] px-3.5 py-2.5 text-[var(--progress-text-dark)] font-mono-accent text-xs space-y-1"
                        >
                          <div className="font-bold">
                            {item.day} ({item.shortDate})
                            {item.isToday ? ' · Today' : ''}
                          </div>
                          <div className="text-[var(--progress-primary)] font-bold text-sm">
                            +{item.xp} XP gained
                          </div>
                          <div className="text-[var(--progress-text-muted)] text-[11px]">
                            {item.wordsLearned} words · {item.intensityLabel}
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="xp" radius={[12, 12, 6, 6]} maxBarSize={42}>
                    {lastSevenDaysData.map((entry) => (
                      <Cell
                        key={entry.dateKey}
                        fill={
                          entry.isToday
                            ? 'url(#streakXpBarToday)'
                            : entry.active
                            ? 'url(#streakXpBarActive)'
                            : 'var(--progress-grid-track)'
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>

          {/* Compact 7-Day Streak Day-by-Day Strip synced with XP */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2 pt-0.5">
            {lastSevenDaysData.map((d) => {
              const goalPct = Math.min(
                100,
                Math.round((d.xp / dailyGoalTarget) * 100)
              );
              const isGoalMet = d.xp >= dailyGoalTarget;
              return (
                <div
                  key={d.dateKey}
                  className={`px-1 py-1.5 sm:px-2.5 sm:py-2 rounded-2xl border flex flex-col items-center justify-between gap-1 transition-all min-w-0 ${
                    isGoalMet
                      ? d.isToday
                        ? 'bg-[var(--progress-bg)] border-[var(--progress-accent-teal)] shadow-2xs'
                        : 'bg-[var(--progress-card)] border-[var(--progress-grid-track)]'
                      : 'bg-[var(--progress-bg)]/70 border-[var(--progress-grid-track)] opacity-75'
                  }`}
                  title={`${d.dateKey}: ${d.xp}/${dailyGoalTarget} XP · ${
                    isGoalMet ? 'Daily goal achieved' : 'Goal not achieved'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row items-center sm:justify-between w-full gap-1">
                    <span
                      className={`font-mono-accent text-[9px] sm:text-[10px] font-bold leading-none tracking-tight ${
                        isGoalMet
                          ? 'text-[var(--progress-text-dark)]'
                          : 'text-[var(--progress-text-muted)]'
                      }`}
                    >
                      {d.day}
                    </span>
                    <div
                      className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full flex items-center justify-center shrink-0 transition-all ${
                        isGoalMet
                          ? d.isToday
                            ? 'bg-[var(--progress-accent-teal)] text-white'
                            : 'bg-[var(--progress-primary)] text-white'
                          : 'bg-[var(--progress-grid-track)] text-[var(--progress-text-muted)]'
                      }`}
                    >
                      {isGoalMet ? (
                        <Check className="w-2 h-2 sm:w-2.5 sm:h-2.5 stroke-[3]" />
                      ) : (
                        <span className="w-1 h-1 rounded-full bg-[var(--progress-text-muted)]" />
                      )}
                    </div>
                  </div>
                  <div className="w-full flex items-center justify-center sm:justify-between">
                    <span
                      className={`font-mono-accent text-[9px] sm:text-[10px] font-bold tabular-nums leading-none whitespace-nowrap ${
                        isGoalMet
                          ? 'text-[var(--progress-text-dark)]'
                          : 'text-[var(--progress-text-muted)]'
                      }`}
                    >
                      +{d.xp}
                      <span className="hidden sm:inline">xp</span>
                    </span>
                  </div>
                  <div className="w-full h-1 rounded-full bg-[var(--progress-grid-track)] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${goalPct}%`,
                        backgroundColor: isGoalMet
                          ? d.isToday
                            ? 'var(--progress-accent-teal)'
                            : 'var(--progress-primary)'
                          : 'var(--progress-text-muted)',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 7-DAY WORDS LEARNED BAR CHART + COMPACT CONTRIBUTION GRID */}
        <div
          style={
            {
              backgroundColor: 'var(--progress-card)',
              boxShadow: 'var(--progress-card-shadow)',
              '--card-delay': '90ms',
            } as React.CSSProperties
          }
          className="anim-card-fade-up rounded-[22px] p-4 sm:p-6 space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
            <div className="flex items-center gap-3">
              <div
                style={{ backgroundColor: 'var(--progress-icon-bg)' }}
                className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 text-[var(--progress-primary)]"
              >
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <span className="mono-label text-[var(--progress-text-muted)]">
                  7-DAY CONSISTENCY · WORDS LEARNED PER DAY
                </span>
                <div className="flex items-baseline gap-2.5 mt-0.5">
                  <span className="font-mono-accent font-extrabold text-2xl sm:text-3xl text-[var(--progress-text-dark)] tabular-nums">
                    {weeklyWordsTotal}
                  </span>
                  <span className="mono-label text-[var(--progress-text-muted)]">
                    WORDS THIS WEEK ({activeConsistencyDays}/7 DAYS ACTIVE)
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start">
              <span className="px-3.5 py-1.5 rounded-full bg-[var(--progress-primary)] text-white font-mono-accent text-xs font-bold shadow-2xs">
                +{todayEntry?.wordsLearned ?? 0} words today ({todayEntry?.day ?? 'Today'})
              </span>
            </div>
          </div>

          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={lastSevenDaysData}
                margin={{ top: 8, right: 10, left: -22, bottom: 0 }}
                barCategoryGap="24%"
              >
                <defs>
                  <linearGradient id="wordsBarGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--progress-primary)" stopOpacity={0.96} />
                    <stop offset="100%" stopColor="var(--progress-primary-deep)" stopOpacity={0.86} />
                  </linearGradient>
                  <linearGradient id="wordsBarTodayGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--progress-accent-teal)" stopOpacity={0.98} />
                    <stop offset="100%" stopColor="var(--progress-primary)" stopOpacity={0.9} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  stroke="var(--progress-grid-track)"
                  strokeOpacity={0.85}
                  strokeDasharray="3 3"
                  vertical={false}
                />
                <XAxis
                  dataKey="day"
                  interval={0}
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fill: 'var(--progress-text-muted)',
                    fontSize: 11,
                    fontFamily: 'var(--font-sans)',
                  }}
                />
                <YAxis
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fill: 'var(--progress-text-muted)',
                    fontSize: 11,
                    fontFamily: 'var(--font-sans)',
                  }}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(123, 97, 255, 0.08)', radius: 8 }}
                  formatter={(value) => {
                    const num = Number(value ?? 0);
                    return [
                      `${num} ${num === 1 ? 'word' : 'words'}`,
                      'Words Learned',
                    ];
                  }}
                  labelFormatter={(label, payload) => {
                    const item = payload?.[0]?.payload as
                      | { shortDate?: string; isToday?: boolean }
                      | undefined;
                    if (!item) return String(label);
                    return `${label} (${item.shortDate ?? ''})${
                      item.isToday ? ' · Today' : ''
                    }`;
                  }}
                  contentStyle={{
                    backgroundColor: 'var(--progress-card)',
                    borderRadius: '14px',
                    border: '1px solid var(--progress-grid-track)',
                    color: 'var(--progress-text-dark)',
                    fontFamily: 'var(--font-sans)',
                    fontSize: '12px',
                  }}
                />
                <Bar
                  dataKey="wordsLearned"
                  name="Words Learned"
                  radius={[12, 12, 6, 6]}
                  maxBarSize={40}
                >
                  {lastSevenDaysData.map((entry) => (
                    <Cell
                      key={`word-bar-${entry.dateKey}`}
                      fill={
                        entry.isToday
                          ? 'url(#wordsBarTodayGrad)'
                          : 'url(#wordsBarGrad)'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* COMPACT 7-DAY CONTRIBUTION INTENSITY STRIP */}
          <div className="pt-3 border-t border-[var(--progress-grid-track)] space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="mono-label text-[var(--progress-primary)]">
                  DAILY ACTIVITY INTENSITY GRID
                </span>
                <p className="text-xs text-[var(--progress-text-muted)]">
                  Tap any day pill to inspect words learned &amp; XP intensity
                </p>
              </div>

              <div
                className="flex items-center gap-1.5 self-start sm:self-auto"
                aria-label="Activity intensity legend from less to more"
              >
                <span className="font-mono-accent text-[10px] text-[var(--progress-text-muted)] mr-0.5">
                  Less
                </span>
                <span
                  className="w-3 h-3 rounded-[4px] border bg-[var(--progress-bg)] border-[var(--progress-grid-track)]"
                  title="Level 0: No activity"
                />
                <span
                  className="w-3 h-3 rounded-[4px] border bg-[var(--progress-icon-bg)] border-[var(--progress-grid-track)]"
                  title="Level 1: Light session"
                />
                <span
                  className="w-3 h-3 rounded-[4px] border bg-[var(--progress-primary)]/45 border-[var(--progress-primary)]/60"
                  title="Level 2: Steady practice"
                />
                <span
                  className="w-3 h-3 rounded-[4px] border bg-[var(--progress-primary)] border-[var(--progress-primary)]"
                  title="Level 3: High consistency"
                />
                <span
                  className="w-3 h-3 rounded-[4px] border bg-[var(--progress-primary-deep)] border-[var(--progress-primary-deep)]"
                  title="Level 4: Peak mastery"
                />
                <span className="font-mono-accent text-[10px] text-[var(--progress-text-muted)] ml-0.5">
                  More
                </span>
              </div>
            </div>

            <div
              className="grid grid-cols-7 gap-1 sm:gap-2"
              role="grid"
              aria-label="7-day learning contribution intensity grid"
            >
              {lastSevenDaysData.map((d) => {
                const isSelected =
                  focusedContributionDay?.dateKey === d.dateKey;
                const isGoalMet = d.xp >= dailyGoalTarget;
                const levelClasses = !isGoalMet
                  ? 'bg-[var(--progress-bg)] border-[var(--progress-grid-track)] text-[var(--progress-text-muted)] grayscale'
                  : d.intensity <= 1
                  ? 'bg-[var(--progress-icon-bg)] border-[var(--progress-grid-track)] text-[var(--progress-primary-deep)]'
                  : d.intensity === 2
                  ? 'bg-[var(--progress-primary)]/25 border-[var(--progress-primary)]/40 text-[var(--progress-text-dark)]'
                  : d.intensity === 3
                  ? 'bg-[var(--progress-primary)] border-[var(--progress-primary)] text-white'
                  : 'bg-[var(--progress-primary-deep)] border-[var(--progress-primary-deep)] text-white shadow-2xs';

                return (
                  <button
                    key={`contrib-${d.dateKey}`}
                    type="button"
                    role="gridcell"
                    onClick={() => setSelectedContributionDay(d.dateKey)}
                    onMouseEnter={() => setSelectedContributionDay(d.dateKey)}
                    title={`${d.day} (${d.shortDate}): ${d.wordsLearned} words, ${d.xp} XP — ${d.intensityLabel}`}
                    className={`group flex flex-col items-center justify-between gap-1 px-1 py-1.5 sm:px-2 sm:py-2 rounded-2xl border transition-all cursor-pointer focus:outline-none min-w-0 touch-manipulation ${
                      !isGoalMet
                        ? 'bg-[var(--progress-bg)]/60 border-[var(--progress-grid-track)] grayscale'
                        : isSelected
                        ? 'bg-[var(--progress-card)] border-[var(--progress-primary)] ring-2 ring-[var(--progress-primary)]/25'
                        : 'bg-[var(--progress-card)] border-[var(--progress-grid-track)] hover:border-[var(--progress-primary)]'
                    }`}
                  >
                    <div className="flex items-center justify-center sm:justify-between w-full gap-0.5 sm:px-0.5">
                      <span
                        className={`font-mono-accent text-[9px] sm:text-[10px] font-bold leading-none tracking-tight ${
                          isGoalMet
                            ? 'text-[var(--progress-text-dark)]'
                            : 'text-[var(--progress-text-muted)]'
                        }`}
                      >
                        {d.day}
                      </span>
                      <span
                        className={`font-mono-accent text-[9px] hidden sm:inline leading-none ${
                          isGoalMet
                            ? 'text-[var(--progress-text-muted)]'
                            : 'text-[var(--progress-text-muted)]/60'
                        }`}
                      >
                        {d.shortDate}
                      </span>
                      {d.isToday && (
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            isGoalMet
                              ? 'bg-[var(--progress-accent-pink)]'
                              : 'bg-[var(--progress-text-muted)]'
                          }`}
                          title="Today"
                        />
                      )}
                    </div>

                    <div
                      className={`w-full h-6 sm:h-7 rounded-lg border flex items-center justify-center gap-0.5 sm:gap-1 transition-transform group-hover:scale-[1.03] ${levelClasses}`}
                    >
                      <span className="font-mono-accent font-bold text-[10px] sm:text-xs leading-none tabular-nums">
                        {d.wordsLearned}
                      </span>
                      <span className="hidden sm:inline font-mono-accent text-[9px] opacity-85 leading-none">
                        wds
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {focusedContributionDay && (
              <div
                style={{ backgroundColor: 'var(--progress-bg)' }}
                className="px-3.5 py-2.5 rounded-2xl border border-[var(--progress-grid-track)] flex flex-wrap items-center justify-between gap-2 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-[3px] border shrink-0 ${
                      focusedContributionDay.xp < dailyGoalTarget
                        ? 'bg-[var(--progress-grid-track)] border-[var(--progress-text-muted)]'
                        : focusedContributionDay.intensity <= 1
                        ? 'bg-[var(--progress-icon-bg)] border-[var(--progress-primary)]'
                        : focusedContributionDay.intensity === 2
                        ? 'bg-[var(--progress-primary)]/50 border-[var(--progress-primary)]'
                        : focusedContributionDay.intensity === 3
                        ? 'bg-[var(--progress-primary)] border-[var(--progress-primary)]'
                        : 'bg-[var(--progress-primary-deep)] border-[var(--progress-primary-deep)]'
                    }`}
                  />
                  <span className="font-display font-semibold text-[var(--progress-text-dark)]">
                    {focusedContributionDay.day},{' '}
                    {focusedContributionDay.shortDate}
                    {focusedContributionDay.isToday ? ' (Today)' : ''}
                  </span>
                  <span className="text-[var(--progress-text-muted)]">·</span>
                  <span className="font-mono-accent text-[11px] font-semibold text-[var(--progress-primary)]">
                    {focusedContributionDay.xp >= dailyGoalTarget
                      ? focusedContributionDay.intensityLabel
                      : 'Goal Not Achieved (Locked / B&W)'}
                  </span>
                </div>

                <div className="flex items-center gap-3 font-mono-accent text-[11px]">
                  <span className="text-[var(--progress-text-dark)] font-semibold">
                    {focusedContributionDay.wordsLearned}{' '}
                    {focusedContributionDay.wordsLearned === 1
                      ? 'word'
                      : 'words'}{' '}
                    learned
                  </span>
                  <span className="text-[var(--progress-text-muted)]">·</span>
                  <span className="text-[var(--progress-primary)] font-bold">
                    +{focusedContributionDay.xp} / {dailyGoalTarget} XP
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-[var(--progress-grid-track)] flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--progress-text-muted)]">
            <span>
              Days where the daily XP goal ({dailyGoalTarget} XP) is not
              achieved remain in black &amp; white until unlocked.
            </span>
            <div className="flex items-center gap-4">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-[var(--progress-primary)]" />
                Goal Achieved
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-[var(--progress-grid-track)]" />
                Goal Not Achieved (B&amp;W)
              </span>
            </div>
          </div>
        </div>

        {/* Top Grid: XP Area Chart + Units Crowned Circular Progress Ring */}
        <div
          style={{ '--card-delay': '135ms' } as React.CSSProperties}
          className="anim-card-fade-up grid grid-cols-1 lg:grid-cols-12 gap-5"
        >
          <div
            style={{
              backgroundColor: 'var(--progress-card)',
              boxShadow: 'var(--progress-card-shadow)',
            }}
            className="lg:col-span-7 rounded-[22px] p-5 sm:p-6 space-y-3.5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  style={{ backgroundColor: 'var(--progress-icon-bg)' }}
                  className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 text-[var(--progress-primary)]"
                >
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <span className="mono-label text-[var(--progress-text-muted)]">
                    XP EARNED (LAST 7 DAYS)
                  </span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="font-mono-accent font-extrabold text-2xl sm:text-3xl text-[var(--progress-text-dark)] tabular-nums">
                      {animatedXp}
                    </span>
                    <span className="mono-label text-[var(--progress-primary)]">
                      XP TOTAL
                    </span>
                  </div>
                </div>
              </div>
              <span
                style={{ backgroundColor: 'var(--progress-icon-bg)' }}
                className="px-3.5 py-1.5 rounded-full text-[var(--progress-primary)] font-mono-accent text-xs font-bold"
              >
                +{todayEntry?.xp ?? 0} XP {todayEntry?.day ?? 'Today'}
              </span>
            </div>

            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={lastSevenDaysData}
                  margin={{ top: 8, right: 10, left: -22, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="xpVioletFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--progress-primary)" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="var(--progress-primary)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    stroke="var(--progress-grid-track)"
                    strokeOpacity={0.85}
                    strokeDasharray="3 3"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="day"
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fill: 'var(--progress-text-muted)',
                      fontSize: 12,
                      fontFamily: 'var(--font-sans)',
                    }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fill: 'var(--progress-text-muted)',
                      fontSize: 11,
                      fontFamily: 'var(--font-sans)',
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--progress-card)',
                      borderRadius: '14px',
                      border: '1px solid var(--progress-grid-track)',
                      color: 'var(--progress-text-dark)',
                      fontFamily: 'var(--font-sans)',
                      fontSize: '12px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="xp"
                    stroke="var(--progress-primary)"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#xpVioletFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Circular Progress Ring Card: Units Crowned vs Total with --progress-ring-gradient */}
          <div
            style={{
              backgroundColor: 'var(--progress-card)',
              boxShadow: 'var(--progress-card-shadow)',
            }}
            className="lg:col-span-5 rounded-[22px] p-5 sm:p-6 flex flex-col justify-between gap-4"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div
                  style={{ backgroundColor: 'var(--progress-icon-bg)' }}
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-[var(--progress-primary)]"
                >
                  <Trophy className="w-5 h-5" />
                </div>
                <h3 className="font-display font-bold text-lg text-[var(--progress-text-dark)]">
                  Units Crowned
                </h3>
              </div>
              <span
                style={{ backgroundColor: 'var(--progress-icon-bg)' }}
                className="mono-label px-3 py-1 rounded-full text-[var(--progress-primary)]"
              >
                {crownedClamped} / {totalUnits} UNITS
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-5 my-1">
              {/* Thick circular progress ring (~12px) with --progress-ring-gradient (#7B61FF -> #38D9D0) and rounded line caps */}
              <div className="relative w-40 h-40 shrink-0 flex items-center justify-center">
                <svg
                  className="w-40 h-40 -rotate-90 overflow-visible"
                  viewBox="0 0 160 160"
                  aria-label={`Units Crowned: ${crownedPct}%`}
                >
                  <defs>
                    <linearGradient
                      id="progressRingGradient"
                      x1="0%"
                      y1="0%"
                      x2="100%"
                      y2="100%"
                    >
                      <stop offset="0%" stopColor="var(--progress-primary)" />
                      <stop offset="100%" stopColor="var(--progress-accent-teal)" />
                    </linearGradient>
                  </defs>
                  <circle
                    cx="80"
                    cy="80"
                    r={ringRadius}
                    fill="none"
                    stroke="var(--progress-grid-track)"
                    strokeWidth="12"
                  />
                  <circle
                    cx="80"
                    cy="80"
                    r={ringRadius}
                    fill="none"
                    stroke="url(#progressRingGradient)"
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeDasharray={ringCircumference}
                    strokeDashoffset={displayedRingDashOffset}
                    className="anim-ring-stroke"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-3">
                  <span className="font-mono-accent font-extrabold text-3xl text-[var(--progress-text-dark)] tabular-nums leading-none">
                    {crownedPct}%
                  </span>
                  <span className="mono-label text-[var(--progress-text-muted)] !text-[9px] mt-1">
                    {crownedClamped} OF {totalUnits} CROWNED
                  </span>
                </div>
              </div>

              <div className="space-y-3 flex-1 w-full">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ background: 'var(--progress-ring-gradient)' }}
                    />
                    <span className="text-[var(--progress-text-muted)] font-medium">
                      Units Crowned
                    </span>
                  </div>
                  <span className="font-mono-accent font-bold text-[var(--progress-text-dark)] tabular-nums">
                    {crownedClamped} / {totalUnits}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: 'var(--progress-grid-track)' }}
                    />
                    <span className="text-[var(--progress-text-muted)] font-medium">
                      Remaining Units
                    </span>
                  </div>
                  <span className="font-mono-accent font-bold text-[var(--progress-text-dark)] tabular-nums">
                    {remainingUnits} / {totalUnits}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-[var(--progress-grid-track)] text-xs text-[var(--progress-text-muted)]">
              Complete all 5 lessons in any unit to earn a{' '}
              <strong className="text-[var(--progress-text-dark)]">Crown</strong>{' '}
              for that unit.
            </div>
          </div>
        </div>

        {/* STAT TRIO ROW: Lessons completed · Words learned · Streak */}
        <div
          style={{ '--card-delay': '160ms' } as React.CSSProperties}
          className="anim-card-fade-up grid grid-cols-1 sm:grid-cols-3 gap-3.5"
        >
          <div
            style={{
              backgroundColor: 'var(--progress-card)',
              boxShadow: 'var(--progress-card-shadow)',
            }}
            className="relative overflow-hidden rounded-[22px] p-5 flex items-center justify-between gap-3.5"
          >
            <div className="relative z-10 text-left">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--progress-text-muted)]">
                LESSONS COMPLETED
              </p>
              <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--progress-text-dark)] tabular-nums mt-1">
                {animatedLessons}
              </p>
            </div>
            <div
              style={{ backgroundColor: 'var(--progress-icon-bg)' }}
              className="relative z-10 w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 text-[var(--progress-primary)]"
            >
              <Briefcase className="w-5 h-5" />
            </div>
          </div>

          <div
            style={{
              backgroundColor: 'var(--progress-card)',
              boxShadow: 'var(--progress-card-shadow)',
            }}
            className="relative overflow-hidden rounded-[22px] p-5 flex items-center justify-between gap-3.5"
          >
            <div className="relative z-10 text-left">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--progress-text-muted)]">
                WORDS LEARNED
              </p>
              <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--progress-text-dark)] tabular-nums mt-1">
                {animatedWords}
              </p>
            </div>
            <div
              style={{ backgroundColor: 'var(--progress-icon-bg)' }}
              className="relative z-10 w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 text-[var(--progress-accent-teal)]"
            >
              <Zap className="w-5 h-5" />
            </div>
          </div>

          <div
            style={{
              backgroundColor: 'var(--progress-card)',
              boxShadow: 'var(--progress-card-shadow)',
            }}
            className="relative overflow-hidden rounded-[22px] p-5 flex items-center justify-between gap-3.5"
          >
            <div className="relative z-10 text-left">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--progress-text-muted)]">
                STREAK
              </p>
              <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--progress-primary)] tabular-nums mt-1">
                {animatedStreak} Days
              </p>
            </div>
            <div
              style={{ backgroundColor: 'var(--progress-icon-bg)' }}
              className="relative z-10 w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 text-[var(--progress-primary)]"
            >
              <LucideFlame className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* CHRONOLOGICAL 'RECENTLY LEARNED' TIMELINE (LAST 5 PRACTICED PHRASES + AUDIO PLAY) */}
        <div
          data-recently-learned-timeline="true"
          style={
            {
              backgroundColor: 'var(--progress-card)',
              boxShadow: 'var(--progress-card-shadow)',
              '--card-delay': '180ms',
            } as React.CSSProperties
          }
          className="anim-card-fade-up rounded-[22px] p-5 sm:p-6 space-y-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                style={{ backgroundColor: 'var(--progress-icon-bg)' }}
                className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 text-[var(--progress-primary)]"
              >
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <span className="mono-label text-[var(--progress-primary)]">
                  CHRONOLOGICAL LOG · LAST 5 PRACTICED PHRASES
                </span>
                <h2 className="font-display font-bold text-xl text-[var(--progress-text-dark)] mt-0.5">
                  Recently Learned
                </h2>
              </div>
            </div>

            <span
              style={{ backgroundColor: 'var(--progress-icon-bg)' }}
              className="px-3.5 py-1.5 rounded-full font-mono-accent text-xs font-bold text-[var(--progress-primary)] flex items-center gap-1.5"
            >
              <Volume2 className="w-3.5 h-3.5 text-[var(--progress-accent-teal)]" />
              TAP PLAY TO HEAR AUDIO
            </span>
          </div>

          {recentPhrases.length === 0 ? (
            <div
              style={{ backgroundColor: 'var(--progress-bg)' }}
              className="rounded-2xl p-6 text-center text-sm text-[var(--progress-text-muted)]"
            >
              Practice your first phrase to start your chronological timeline.
            </div>
          ) : (
            <ol
              className="relative space-y-3.5"
              aria-label="Recently learned phrases timeline"
            >
              {recentPhrases.map((phrase, idx) => {
                const isPlaying = playingPhraseKey === phrase.key;
                const isLatest = idx === 0;
                const isLastItem = idx === recentPhrases.length - 1;
                const relTime = formatRelativePracticeTime(phrase.timestamp, idx);

                return (
                  <li
                    key={phrase.key}
                    style={
                      {
                        '--stagger-delay': `${Math.min(idx * 45, 180)}ms`,
                      } as React.CSSProperties
                    }
                    className="anim-stagger-item relative flex items-stretch gap-3.5 sm:gap-4"
                  >
                    {/* Vertical timeline track + chronological node */}
                    <div className="relative flex flex-col items-center shrink-0 pt-1">
                      <div
                        style={
                          isPlaying || isLatest
                            ? { background: 'var(--progress-gradient)' }
                            : { backgroundColor: 'var(--progress-icon-bg)' }
                        }
                        className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center font-mono-accent text-xs font-extrabold transition-transform ${
                          isPlaying || isLatest
                            ? 'text-white shadow-xs scale-105'
                            : 'text-[var(--progress-primary)] border border-[var(--progress-grid-track)]'
                        }`}
                        title={`#${idx + 1} most recent`}
                      >
                        {idx + 1}
                      </div>
                      {!isLastItem && (
                        <div
                          style={{
                            backgroundColor: isLatest
                              ? 'var(--progress-primary)'
                              : 'var(--progress-grid-track)',
                          }}
                          className={`w-0.5 flex-1 my-1 rounded-full ${
                            isLatest ? 'opacity-45' : 'opacity-85'
                          }`}
                          aria-hidden="true"
                        />
                      )}
                    </div>

                    {/* Timeline card row */}
                    <div
                      style={{
                        backgroundColor: isPlaying
                          ? 'var(--progress-icon-bg)'
                          : 'var(--progress-bg)',
                      }}
                      className={`flex-1 min-w-0 rounded-[18px] border px-4 py-3.5 flex items-center justify-between gap-3 transition-all ${
                        isPlaying
                          ? 'border-[var(--progress-primary)] shadow-xs'
                          : 'border-[var(--progress-grid-track)] hover:border-[var(--progress-primary)]/50'
                      }`}
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-display font-extrabold text-base sm:text-lg text-[var(--progress-text-dark)] leading-snug">
                            {phrase.translit}
                          </span>
                          <span
                            style={{ backgroundColor: 'var(--progress-card)' }}
                            className="px-2.5 py-0.5 rounded-full text-xs font-semibold text-[var(--progress-primary-deep)] border border-[var(--progress-grid-track)]"
                          >
                            {phrase.kannada}
                          </span>
                          {isLatest && (
                            <span
                              style={{ backgroundColor: 'var(--progress-accent-teal)' }}
                              className="px-2 py-0.5 rounded-full font-mono-accent text-[10px] font-extrabold uppercase tracking-wider text-[#161129]"
                            >
                              LATEST
                            </span>
                          )}
                        </div>

                        <p className="text-xs sm:text-sm font-medium text-[var(--progress-text-muted)] truncate">
                          {phrase.meaning}
                        </p>

                        <div className="flex flex-wrap items-center gap-2 pt-0.5">
                          <span className="font-mono-accent text-[10px] font-semibold text-[var(--progress-primary)]">
                            {relTime}
                          </span>
                          <span className="text-[var(--progress-text-muted)] text-[10px]">
                            ·
                          </span>
                          <span className="font-mono-accent text-[10px] text-[var(--progress-text-muted)]">
                            SRS Box {phrase.box}/5
                          </span>
                        </div>
                      </div>

                      {/* Small pill/circle play button to hear audio */}
                      <button
                        type="button"
                        onClick={() => handlePlayRecentPhrase(phrase)}
                        aria-label={`Play audio for ${phrase.translit}`}
                        title={`Hear "${phrase.translit}" (${phrase.kannada})`}
                        style={
                          isPlaying
                            ? { background: 'var(--progress-gradient)' }
                            : { backgroundColor: 'var(--progress-card)' }
                        }
                        className={`shrink-0 h-10 px-3.5 rounded-full border flex items-center justify-center gap-1.5 font-mono-accent text-xs font-bold cursor-pointer transition-all touch-manipulation active:scale-95 ${
                          isPlaying
                            ? 'text-white border-transparent shadow-sm'
                            : 'text-[var(--progress-primary)] border-[var(--progress-grid-track)] hover:border-[var(--progress-primary)] hover:bg-[var(--progress-icon-bg)]'
                        }`}
                      >
                        {isPlaying ? (
                          <>
                            <Volume2 className="w-4 h-4 animate-pulse" />
                            <span className="hidden sm:inline">Playing</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span className="hidden sm:inline">Listen</span>
                          </>
                        )}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        {/* 16 ACHIEVEMENTS & STREET BADGES GRID — UNACHIEVED CARDS ARE BLACK & WHITE + LOCKED */}
        <div
          style={
            {
              backgroundColor: 'var(--progress-card)',
              boxShadow: 'var(--progress-card-shadow)',
              '--card-delay': '200ms',
            } as React.CSSProperties
          }
          className="anim-card-fade-up rounded-[22px] p-5 sm:p-6 space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="mono-label text-[var(--progress-primary)]">
                BENGALURU STREET CRED · 16 COLLECTIBLE BADGES
              </span>
              <h2 className="font-display font-bold text-xl text-[var(--progress-text-dark)] mt-0.5">
                Achievements &amp; Street Badges
              </h2>
              <p className="text-xs text-[var(--progress-text-muted)]">
                {unlockedCount} of {ACHIEVEMENT_DEFS.length} goals achieved —
                unachieved badges remain locked in black &amp; white until their
                goal is completed
              </p>
            </div>
            <span
              style={{ backgroundColor: 'var(--progress-icon-bg)' }}
              className="px-3.5 py-1.5 rounded-full font-mono-accent text-xs font-bold text-[var(--progress-primary)]"
            >
              {unlockedCount} / {ACHIEVEMENT_DEFS.length} UNLOCKED
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
            {(() => {
              let earnedIdx = 0;
              return ACHIEVEMENT_DEFS.map((badge, badgeIndex) => {
                const isUnlocked = achievements.includes(badge.id);
                const unlockDate = achievementDates[badge.id];
                const currentEarnedIdx = isUnlocked ? earnedIdx++ : -1;
                const showCornerMascot = isUnlocked && currentEarnedIdx < 2;
                const cornerPlacement =
                  currentEarnedIdx % 2 === 0
                    ? MASCOT_PLACEMENTS.progressEarnedSango
                    : MASCOT_PLACEMENTS.progressEarnedSuno;

                const isTealAccent = badgeIndex % 3 === 1;
                const unlockedAccent = isTealAccent
                  ? 'var(--progress-accent-teal)'
                  : 'var(--progress-primary)';

                return (
                  <div
                    key={badge.id}
                    data-achievement-tile={badge.id}
                    data-achievement-unlocked={isUnlocked ? 'true' : 'false'}
                    style={{
                      background: isUnlocked
                        ? 'linear-gradient(135deg, var(--progress-card) 0%, var(--progress-bg) 58%, var(--progress-icon-bg) 100%)'
                        : 'linear-gradient(135deg, #1E1833 0%, #262040 55%, #1A152C 100%)',
                      borderColor: isUnlocked
                        ? 'var(--progress-grid-track)'
                        : '#3B3358',
                      filter: isUnlocked ? 'none' : 'grayscale(100%)',
                    }}
                    className={`group relative overflow-hidden p-4 rounded-[22px] border text-left flex flex-col justify-between gap-3 transition-all duration-200 ${
                      isUnlocked
                        ? 'hover:-translate-y-0.5 shadow-[0_8px_20px_rgba(123,97,255,0.12)]'
                        : 'grayscale select-none opacity-85'
                    }`}
                  >
                    <AchievementCardPattern
                      pattern={badge.pattern}
                      accentColor={isUnlocked ? '#7B61FF' : '#8A86A8'}
                    />

                    {showCornerMascot && <Mascot {...cornerPlacement} />}

                    <div className="relative z-10 flex items-center justify-between gap-2">
                      <div
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-transform ${
                          isUnlocked
                            ? 'bg-[var(--progress-icon-bg)] group-hover:scale-105'
                            : 'bg-zinc-900 border border-zinc-700 grayscale'
                        }`}
                      >
                        <span
                          className={`text-xl leading-none select-none ${
                            isUnlocked
                              ? ''
                              : 'grayscale contrast-125 brightness-90 opacity-65'
                          }`}
                          style={
                            isUnlocked
                              ? undefined
                              : { filter: 'grayscale(100%)' }
                          }
                          aria-hidden="true"
                        >
                          {badge.emoji}
                        </span>
                      </div>

                      <span
                        className="px-2.5 py-0.5 rounded-full text-[9px] font-mono-accent font-extrabold uppercase tracking-wider border"
                        style={
                          isUnlocked
                            ? {
                                backgroundColor: unlockedAccent,
                                color: '#FFFFFF',
                                borderColor: unlockedAccent,
                              }
                            : {
                                backgroundColor: '#161129',
                                color: '#8A86A8',
                                borderColor: '#3B3358',
                              }
                        }
                      >
                        {isUnlocked
                          ? unlockDate
                            ? `✓ ${unlockDate}`
                            : '✓ UNLOCKED'
                          : '🔒 LOCKED'}
                      </span>
                    </div>

                    <div className="relative z-10 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <p
                          className={`font-display font-bold text-sm leading-tight ${
                            isUnlocked
                              ? 'text-[var(--progress-text-dark)]'
                              : 'text-zinc-200'
                          }`}
                        >
                          {badge.title}
                        </p>
                        {isUnlocked && (
                          <Star
                            className="w-3.5 h-3.5 shrink-0"
                            style={{
                              color: 'var(--progress-accent-pink)',
                              fill: 'var(--progress-accent-pink)',
                            }}
                          />
                        )}
                      </div>
                      <p
                        className="font-mono-accent text-[10px] font-bold uppercase tracking-wide"
                        style={{
                          color: isUnlocked
                            ? 'var(--progress-primary)'
                            : '#8A86A8',
                        }}
                      >
                        {badge.subtitle}
                      </p>
                      <p
                        className={`text-[11px] font-medium leading-snug ${
                          isUnlocked
                            ? 'text-[var(--progress-text-muted)]'
                            : 'text-zinc-400'
                        }`}
                      >
                        {badge.description}
                      </p>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      </div>
    </div>
  );
};

interface ProfileScreenProps {
  userName: string;
  userEmail: string;
  dailyGoalWords: number;
  streak: number;
  lessonsCompleted: number;
  phrasesLearned: number;
  savedPhraseIds: string[];
  onUpdateProfile: (name: string, email: string, goal: number) => void;
  onNavigateTab: (tab: string) => void;
  onResetDemo?: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  userName,
  userEmail,
  dailyGoalWords,
  streak,
  lessonsCompleted,
  savedPhraseIds,
  onUpdateProfile,
  onNavigateTab,
}) => {
  const { xp, words, todayXP } = useProgress();
  const wallet = useWallet();
  const [profileSubTab, setProfileSubTab] = useState<'overview' | 'notes'>('overview');
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState(userName);
  const [emailInput, setEmailInput] = useState(userEmail);
  const [goalInput, setGoalInput] = useState(dailyGoalWords);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [prefs, setPrefs] = useState<KaliyonaPrefs>(() => getKaliyonaPrefs());

  useEffect(() => {
    setPrefs(getKaliyonaPrefs());
  }, []);

  useEffect(() => {
    setNameInput(userName);
    setEmailInput(userEmail);
    setGoalInput(dailyGoalWords);
  }, [userName, userEmail, dailyGoalWords]);

  const handleTogglePref = (key: keyof KaliyonaPrefs, val: boolean) => {
    playTactileTone('tap');
    setPrefs((prev) => {
      const next = { ...prev, [key]: val };
      setKaliyonaPrefs(next);
      return next;
    });
  };

  const initials = useMemo(() => {
    const parts = (userName || 'Alex Johnson').trim().split(/\s+/);
    return parts
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() || '')
      .join('');
  }, [userName]);

  const explorerLevel = useMemo(() => Math.max(1, Math.floor(xp / 100) + 1), [xp]);
  const totalCurriculumUnits = COURSE_UNITS.length;
  const totalCurriculumLevels = useMemo(
    () => COURSE_UNITS.reduce((acc, u) => acc + u.levels.length, 0),
    []
  );

  const dailyGoalPct = Math.min(
    100,
    Math.round(((todayXP || 0) / Math.max(1, dailyGoalWords)) * 100)
  );
  const ringRadius = 28;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringDashOffset =
    ringCircumference - (dailyGoalPct / 100) * ringCircumference;

  const [profileRingReady, setProfileRingReady] = useState<boolean>(
    () => hasAnimatedProfileRingOnce
  );

  useEffect(() => {
    if (hasAnimatedProfileRingOnce) {
      setProfileRingReady(true);
      return;
    }
    hasAnimatedProfileRingOnce = true;
    const rafId = requestAnimationFrame(() => {
      setProfileRingReady(true);
    });
    return () => cancelAnimationFrame(rafId);
  }, []);

  const displayedProfileRingOffset = profileRingReady
    ? ringDashOffset
    : ringCircumference;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    playTactileTone('success');
    const cleanName = (nameInput || 'Alex Johnson').trim() || 'Alex Johnson';
    const cleanEmail = (emailInput || 'alex@bengaluru.in').trim() || 'alex@bengaluru.in';
    onUpdateProfile(cleanName, cleanEmail, goalInput);
    setEditing(false);
  };

  const INVITE_SHARE_URL = 'https://kaliyona.vercel.app';

  const handleShareInvite = () => {
    playTactileTone('success');
    try {
      navigator.clipboard?.writeText(INVITE_SHARE_URL);
    } catch {
      // ignore clipboard restriction
    }
    try {
      if (
        typeof navigator !== 'undefined' &&
        typeof navigator.share === 'function'
      ) {
        void navigator
          .share({
            title: 'Kaliyona — Learn Kannada the Bengaluru Way',
            text: 'Practice survival Kanglish with me on Kaliyona!',
            url: INVITE_SHARE_URL,
          })
          .catch(() => {});
      }
    } catch {
      // ignore share cancellation
    }
    setInviteCopied(true);
    setTimeout(() => setInviteCopied(false), 2200);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Sub-tab bar: [Profile | Notes 🗒️] */}
      <div
        role="tablist"
        aria-label="Profile sections"
        className="glass-soft !rounded-2xl inline-flex items-center p-1"
      >
        <button
          type="button"
          role="tab"
          aria-selected={profileSubTab === 'overview'}
          onClick={() => {
            playTactileTone('tap');
            setProfileSubTab('overview');
          }}
          className={`min-h-[44px] cursor-pointer rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition-colors touch-manipulation ${
            profileSubTab === 'overview'
              ? 'bg-primary text-white shadow-xs'
              : 'text-neutral-600 hover:text-neutral-900'
          }`}
        >
          {STRINGS.wallet.profileTabLabel}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={profileSubTab === 'notes'}
          onClick={() => {
            playTactileTone('tap');
            setProfileSubTab('notes');
          }}
          className={`min-h-[44px] inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition-colors touch-manipulation ${
            profileSubTab === 'notes'
              ? 'bg-primary text-white shadow-xs'
              : 'text-neutral-600 hover:text-neutral-900'
          }`}
        >
          <span>{STRINGS.wallet.tabLabel}</span>
          <span
            className={`rounded-full px-1.5 py-0.5 text-[10px] font-sans font-bold ${
              profileSubTab === 'notes'
                ? 'bg-white/20 text-white'
                : 'bg-primary/10 text-primary'
            }`}
          >
            {wallet.count}
          </span>
        </button>
      </div>

      {profileSubTab === 'notes' ? (
        <div key="notes" className="anim-screen-enter">
          <NotesDeckSection />
        </div>
      ) : (
        <div key="overview" className="anim-screen-enter space-y-6">
          {/* User Profile Card */}
          <div className="glass-strong relative overflow-hidden p-6 sm:p-8">
            <ProfileCardBackdropDoodle variant="hero" />
            <div className="relative z-10 space-y-6">
              <div className="flex flex-col sm:flex-row items-center gap-5">
                <div className="w-20 h-20 rounded-full bg-primary-fixed border-2 border-primary-fixed-dim flex items-center justify-center overflow-hidden shadow-md shrink-0 font-display font-extrabold text-2xl text-primary ring-4 ring-white/80">
                  {initials || 'AJ'}
                </div>

                <div className="text-center sm:text-left flex-1">
                  <span className="mono-label text-[var(--accent2)] inline-flex items-center gap-1.5 rounded-full bg-white/80 border border-indigo-200/70 px-3 py-1 shadow-2xs">
                    INDIRANAGAR EXPLORER · LEVEL {explorerLevel}
                  </span>
                  <h1 className="font-display font-bold text-2xl text-[var(--ink)] mt-1.5">
                    {userName}
                  </h1>
                  <p className="text-sm text-[var(--muted)]">{userEmail}</p>
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => {
                        playTactileTone('tap');
                        setEditing((e) => !e);
                      }}
                      className="btn-primary min-h-[44px] !py-2 !px-4 !text-xs touch-manipulation"
                    >
                      {editing ? 'Cancel Editing' : 'Edit Profile'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Inline Edit Form */}
              {editing && (
                <form
                  onSubmit={handleSave}
                  className="anim-panel-slide-up p-4 rounded-2xl bg-white/85 border border-indigo-200/80 space-y-4 shadow-xs"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="mono-label text-[var(--muted)] block mb-1">
                        YOUR NAME
                      </label>
                      <input
                        type="text"
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        className="w-full h-11 px-3 rounded-xl bg-[var(--surface)] border border-[var(--line)] text-sm text-[var(--ink)] touch-manipulation"
                      />
                    </div>
                    <div>
                      <label className="mono-label text-[var(--muted)] block mb-1">
                        EMAIL
                      </label>
                      <input
                        type="email"
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        className="w-full h-11 px-3 rounded-xl bg-[var(--surface)] border border-[var(--line)] text-sm text-[var(--ink)] touch-manipulation"
                      />
                    </div>
                    <div>
                      <label className="mono-label text-[var(--muted)] block mb-1">
                        DAILY XP GOAL
                      </label>
                      <select
                        value={goalInput}
                        onChange={(e) => setGoalInput(Number(e.target.value))}
                        className="w-full h-11 px-3 rounded-xl bg-[var(--surface)] border border-[var(--line)] text-sm text-[var(--ink)] touch-manipulation"
                      >
                        <option value={10}>10 XP / day</option>
                        <option value={20}>20 XP / day</option>
                        <option value={30}>30 XP / day</option>
                        <option value={50}>50 XP / day</option>
                      </select>
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="btn-success min-h-[44px] !py-2 !px-5 !text-xs touch-manipulation"
                  >
                    <Check className="w-4 h-4" /> Save Changes
                  </button>
                </form>
              )}

              {/* 4-Column Reference-Style Glass Stats Cards with pastel doodle backdrops */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="glass-soft relative overflow-hidden p-3.5 sm:p-4 text-left flex flex-col justify-between gap-2 border border-indigo-200/70">
                  <ProfileCardBackdropDoodle variant="stat-indigo" compact />
                  <div className="relative z-10 flex items-center justify-between gap-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-600">
                      UNITS
                    </p>
                    <span className="w-2.5 h-2.5 rounded-full bg-primary shrink-0 shadow-2xs" />
                  </div>
                  <p className="relative z-10 text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 tabular-nums leading-none">
                    {totalCurriculumUnits}
                  </p>
                </div>

                <div className="glass-soft relative overflow-hidden p-3.5 sm:p-4 text-left flex flex-col justify-between gap-2 border border-teal-200/70">
                  <ProfileCardBackdropDoodle variant="stat-teal" compact />
                  <div className="relative z-10 flex items-center justify-between gap-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-600">
                      LESSONS
                    </p>
                    <span className="w-2.5 h-2.5 rounded-full bg-[#0d9488] shrink-0 shadow-2xs" />
                  </div>
                  <p className="relative z-10 text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 tabular-nums leading-none">
                    {lessonsCompleted}
                  </p>
                </div>

                <div className="glass-soft relative overflow-hidden p-3.5 sm:p-4 text-left flex flex-col justify-between gap-2 border border-amber-200/70">
                  <ProfileCardBackdropDoodle variant="stat-amber" compact />
                  <div className="relative z-10 flex items-center justify-between gap-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-600">
                      WORDS
                    </p>
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0 shadow-2xs" />
                  </div>
                  <p className="relative z-10 text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 tabular-nums leading-none">
                    {Object.keys(words).length}
                  </p>
                </div>

                <div className="glass-tinted relative overflow-hidden p-3.5 sm:p-4 text-left flex flex-col justify-between gap-2 border border-rose-200/70">
                  <ProfileCardBackdropDoodle variant="stat-rose" compact />
                  <div className="relative z-10 flex items-center justify-between gap-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                      STREAK
                    </p>
                    <span className="w-2.5 h-2.5 rounded-full bg-primary shrink-0 shadow-2xs" />
                  </div>
                  <p className="relative z-10 text-2xl sm:text-3xl font-extrabold tracking-tight text-primary tabular-nums leading-none">
                    {streak}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Notes 🗒️ ("My Words") Word Wallet Section */}
          <NotesDeckSection />

          {/* PROFILE MASCOT CARDS: Daily Goal Ring Card + Invite/Share Card */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div
              data-profile-daily-goal-card="true"
              className="glass-strong relative p-5 flex items-center gap-4 overflow-hidden"
            >
              <ProfileCardBackdropDoodle variant="goal" />
              <Mascot {...MASCOT_PLACEMENTS.profileDailyGoalCorner} />
              <div className="relative z-10 w-16 h-16 shrink-0 flex items-center justify-center rounded-2xl bg-white/80 border border-amber-200/70 shadow-2xs">
                <svg className="w-14 h-14 -rotate-90" viewBox="0 0 68 68">
                  <circle
                    cx="34"
                    cy="34"
                    r={ringRadius}
                    fill="none"
                    stroke="var(--surface-warm)"
                    strokeWidth="6"
                  />
                  <circle
                    cx="34"
                    cy="34"
                    r={ringRadius}
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={ringCircumference}
                    strokeDashoffset={displayedProfileRingOffset}
                    className="anim-ring-stroke"
                  />
                </svg>
                <span className="absolute font-mono-accent font-bold text-xs text-[var(--ink)]">
                  {dailyGoalPct}%
                </span>
              </div>
              <div className="relative z-10 min-w-0 pr-8">
                <span className="mono-label text-[var(--accent)] !text-[10px] block">
                  DAILY GOAL RING
                </span>
                <p className="font-display font-bold text-base text-[var(--ink)] mt-0.5">
                  {todayXP} / {dailyGoalWords} XP Today
                </p>
                <p className="text-xs text-[var(--muted)] mt-0.5">
                  Keep your Bengaluru streak rolling!
                </p>
              </div>
            </div>

            <div
              data-profile-invite-card="true"
              className="glass-strong relative overflow-hidden p-5 flex items-center justify-between gap-4"
            >
              <ProfileCardBackdropDoodle variant="invite" />
              <div className="relative z-10 w-16 h-16 rounded-2xl bg-white/85 border border-rose-200/70 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                <Mascot {...MASCOT_PLACEMENTS.profileInviteCard} />
              </div>
              <div className="relative z-10 min-w-0 flex-1 space-y-2">
                <div>
                  <span className="mono-label text-[var(--accent2)] !text-[10px] block">
                    INVITE &amp; SHARE · KALIYONA.VERCEL.APP
                  </span>
                  <p className="font-display font-bold text-base text-[var(--ink)] leading-snug">
                    Share Kaliyona with friends
                  </p>
                  <p className="text-xs text-[var(--muted)]">
                    Invite friends at{' '}
                    <span className="font-mono-accent font-semibold text-primary">
                      kaliyona.vercel.app
                    </span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleShareInvite}
                  className="btn-primary min-h-[44px] !py-2 !px-3.5 !text-xs touch-manipulation"
                >
                  <span>
                    {inviteCopied
                      ? '✓ kaliyona.vercel.app Copied!'
                      : 'Share Invite Link'}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* PREFERENCES SECTION */}
          <div className="space-y-2">
            <span className="mono-label text-[var(--muted)] !text-[11px] block">
              PREFERENCES
            </span>
            <div className="glass-strong relative overflow-hidden divide-y divide-[var(--line)]">
              <ProfileCardBackdropDoodle variant="preferences" />
              {/* Row 1: Anna's voice */}
              <div
                onClick={() => handleTogglePref('voice', !prefs.voice)}
                className="relative z-10 min-h-[60px] px-4 py-3.5 flex items-center justify-between gap-4 cursor-pointer hover:bg-white/60 transition-colors touch-manipulation"
              >
                <div className="min-w-0 pr-2">
                  <p className="text-[15px] font-semibold text-neutral-900 leading-snug">
                    Anna&rsquo;s voice
                  </p>
                  <p className="text-[13px] text-neutral-600 leading-snug mt-0.5">
                    Replies play aloud automatically
                  </p>
                </div>
                <div onClick={(e) => e.stopPropagation()}>
                  <AnimatedSwitch
                    size="md"
                    checked={prefs.voice}
                    onCheckedChange={(val) => handleTogglePref('voice', val)}
                    aria-label="Anna's voice"
                  />
                </div>
              </div>

              {/* Row 2: Daily reminder */}
              <div
                onClick={() => handleTogglePref('reminder', !prefs.reminder)}
                className="relative z-10 min-h-[60px] px-4 py-3.5 flex items-center justify-between gap-4 cursor-pointer hover:bg-white/60 transition-colors touch-manipulation"
              >
                <div className="min-w-0 pr-2">
                  <p className="text-[15px] font-semibold text-neutral-900 leading-snug">
                    Daily reminder
                  </p>
                  <p className="text-[13px] text-neutral-600 leading-snug mt-0.5">
                    Practice nudge every evening
                  </p>
                </div>
                <div onClick={(e) => e.stopPropagation()}>
                  <AnimatedSwitch
                    size="md"
                    checked={prefs.reminder}
                    onCheckedChange={(val) => handleTogglePref('reminder', val)}
                    aria-label="Daily reminder"
                  />
                </div>
              </div>

              {/* Row 3: Practice tips */}
              <div
                onClick={() => handleTogglePref('tips', !prefs.tips)}
                className="relative z-10 min-h-[60px] px-4 py-3.5 flex items-center justify-between gap-4 cursor-pointer hover:bg-white/60 transition-colors touch-manipulation"
              >
                <div className="min-w-0 pr-2">
                  <p className="text-[15px] font-semibold text-neutral-900 leading-snug">
                    Practice tips
                  </p>
                  <p className="text-[13px] text-neutral-600 leading-snug mt-0.5">
                    Show mini-tips inside Anna&rsquo;s replies
                  </p>
                </div>
                <div onClick={(e) => e.stopPropagation()}>
                  <AnimatedSwitch
                    size="md"
                    checked={prefs.tips}
                    onCheckedChange={(val) => handleTogglePref('tips', val)}
                    aria-label="Practice tips"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Menu List */}
          <div className="glass-strong relative overflow-hidden divide-y divide-[var(--line)]">
            <ProfileCardBackdropDoodle variant="menu" />
            <button
              type="button"
              onClick={() => onNavigateTab('explore')}
              className="relative z-10 w-full min-h-[64px] p-4 sm:px-6 flex items-center justify-between hover:bg-white/60 transition-colors cursor-pointer text-left touch-manipulation"
            >
              <div className="flex items-center gap-3.5">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center border border-indigo-200/70 shadow-2xs"
                  style={{ backgroundColor: 'var(--tile-1)' }}
                >
                  <BookOpen className="w-5 h-5 text-[var(--accent)]" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-[var(--ink)]">
                    My Vocabulary &amp; Phrasebook
                  </p>
                  <p className="text-xs text-[var(--muted)]">
                    {savedPhraseIds.length} bookmarked Kanglish phrases
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[var(--muted)]" />
            </button>

            <button
              type="button"
              onClick={() => onNavigateTab('home')}
              className="relative z-10 w-full min-h-[64px] p-4 sm:px-6 flex items-center justify-between hover:bg-white/60 transition-colors cursor-pointer text-left touch-manipulation"
            >
              <div className="flex items-center gap-3.5">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center border border-amber-200/70 shadow-2xs"
                  style={{ backgroundColor: 'var(--tile-2)' }}
                >
                  <Bookmark className="w-5 h-5 text-[var(--accent2)]" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-[var(--ink)]">
                    Curriculum Path
                  </p>
                  <p className="text-xs text-[var(--muted)]">
                    {totalCurriculumUnits} Units · {totalCurriculumLevels} Levels
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[var(--muted)]" />
            </button>

            <button
              type="button"
              onClick={() => onNavigateTab('progress')}
              className="relative z-10 w-full min-h-[64px] p-4 sm:px-6 flex items-center justify-between hover:bg-white/60 transition-colors cursor-pointer text-left touch-manipulation"
            >
              <div className="flex items-center gap-3.5">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center border border-emerald-200/70 shadow-2xs"
                  style={{ backgroundColor: 'var(--tile-3)' }}
                >
                  <Star className="w-5 h-5 text-[var(--success)]" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-[var(--ink)]">
                    Achievements &amp; Badges
                  </p>
                  <p className="text-xs text-[var(--muted)]">
                    View your unlocked Bengaluru street badges
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[var(--muted)]" />
            </button>
          </div>

          {/* Log out */}
          <div className="mt-6 flex flex-col gap-2.5 border-t border-[var(--line)] pt-5">
            <button
              type="button"
              onClick={() => {
                playTactileTone('tap');
                if (!confirmLogout) {
                  setConfirmLogout(true);
                  return;
                }
                resetOnboarding();
              }}
              className="min-h-[48px] flex w-full items-center justify-between rounded-2xl border border-rose-200 bg-white px-4 py-3.5 text-left text-[13px] font-semibold text-rose-600 transition hover:bg-rose-50 cursor-pointer touch-manipulation"
            >
              <span className="flex items-center gap-2.5">
                <LogOut size={15} className="text-rose-500" />
                {confirmLogout ? 'Tap again to log out & replay onboarding' : 'Log out'}
              </span>
              <span className="text-[11px] font-normal text-rose-400">
                {confirmLogout ? 'Confirm' : 'Reset'}
              </span>
            </button>
          </div>

          {/* Profile About Card */}
          <div
            data-profile-about-card="true"
            style={{
              background: 'linear-gradient(135deg, #6c5ce7 0%, #5a4bd1 100%)',
            }}
            className="rounded-[24px] p-6 sm:p-7 text-center flex flex-col items-center justify-center gap-2.5 shadow-sm"
          >
            <img
              src="/assets/logo-full.webp"
              alt="Kaliyona"
              width={140}
              loading="lazy"
              draggable={false}
              className="w-[140px] h-auto object-contain mx-auto block select-none"
            />
            <p className="text-white/80 font-caption tracking-wide">
              Kannada, the Bengaluru way
            </p>
            <p className="text-white/60 font-mono-accent text-[11px] tracking-wider">
              VERSION 1.0.0 · BENGALURU EDITION
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
