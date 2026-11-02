import React, { useState, useEffect } from 'react';
import { ANNA_ASSETS } from './AnnaMascot';
import { playAnnaMascotPing } from '../data/kanglishData';

// ============================================================================
// 1. CAST CONFIG (Single Source of Truth)
// ============================================================================
export const CAST = {
  anna: {
    party: '/mascots/anna-party.png',
    sleepy: '/mascots/anna-sleepy.png',
    wink: '/mascots/anna-wink.png',
    curious: '/mascots/anna-curious.png?v=2',
    stareyes: '/mascots/anna-stareyes.png',
  },
  suno: {
    wave: '/mascots/suno-wave.png',
    smile: '/mascots/suno-smile.png',
  },
  sango: {
    cheer: '/mascots/sango-cheer.png',
    peek: '/mascots/sango-peek.png',
  },
} as const;

export type MascotWho = keyof typeof CAST;
export type AnnaMoodKey = keyof typeof CAST.anna;
export type SunoMoodKey = keyof typeof CAST.suno;
export type SangoMoodKey = keyof typeof CAST.sango;
export type MascotMood<W extends MascotWho = MascotWho> =
  W extends 'anna'
    ? AnnaMoodKey
    : W extends 'suno'
    ? SunoMoodKey
    : W extends 'sango'
    ? SangoMoodKey
    : AnnaMoodKey | SunoMoodKey | SangoMoodKey;

// Preload all 9 mascot stickers once in browser environments
if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  Object.values(CAST).forEach((group) => {
    Object.values(group).forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  });
}

// ============================================================================
// 2. CENTRALIZED PLACEMENT MAP (All screen placements in one config)
// ============================================================================
export interface MascotPlacementSpec {
  who: MascotWho;
  mood: string;
  size: number;
  shrinkBelow360?: boolean;
  delayMs?: number;
  inline?: boolean;
  comboPop?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const MASCOT_PLACEMENTS = {
  // LESSON SCREEN — one tiny 40px corner mascot per question card (32px < 360px)
  lessonSpeakCard: {
    who: 'suno',
    mood: 'wave',
    size: 40,
    shrinkBelow360: true,
    className: 'top-2 right-2 z-20',
  },
  lessonMcqCard: {
    who: 'anna',
    mood: 'curious',
    size: 40,
    shrinkBelow360: true,
    className: 'top-2 right-2 z-20',
  },
  lessonGateCard: {
    who: 'sango',
    mood: 'peek',
    size: 40,
    shrinkBelow360: true,
    className: 'bottom-0 right-2 z-20 translate-y-[15%]',
  },

  // FEEDBACK BANNER
  feedbackCorrect: {
    who: 'anna',
    mood: 'wink',
    size: 48,
    inline: true,
  },
  feedbackWrong: {
    who: 'anna',
    mood: 'curious',
    size: 48,
    inline: true,
  },
  feedbackComboPop: {
    who: 'sango',
    mood: 'cheer',
    size: 48,
    comboPop: true,
    className: '-top-5 right-3 sm:right-44 z-30',
  },

  // COMPLETION SCREEN
  completionNormalHero: {
    who: 'anna',
    mood: 'party',
    size: 96,
    inline: true,
  },
  completionPerfectHero: {
    who: 'anna',
    mood: 'stareyes',
    size: 96,
    inline: true,
  },
  completionSangoCorner: {
    who: 'sango',
    mood: 'cheer',
    size: 64,
    delayMs: 300,
    className: 'bottom-4 left-4 z-20',
  },

  // HOME SCREEN
  homeStreakFlame: {
    who: 'sango',
    mood: 'cheer',
    size: 32,
    inline: true,
  },
  homeLockedGatePeek: {
    who: 'sango',
    mood: 'peek',
    size: 36,
    className: '-right-6 top-1/2 -translate-y-1/2 z-20',
  },

  // EXPLORE SCREEN
  exploreEmptyState: {
    who: 'suno',
    mood: 'wave',
    size: 120,
    inline: true,
  },

  // PRACTICE SCREEN
  practiceSpeakDeckBadge: {
    who: 'suno',
    mood: 'smile',
    size: 48,
    inline: true,
  },

  // PROGRESS SCREEN — earned achievement tiles alternate Sango (cheer) / Suno (smile) 28px corner accents
  progressEarnedSango: {
    who: 'sango',
    mood: 'cheer',
    size: 28,
    className: 'top-1.5 right-1.5 z-10',
  },
  progressEarnedSuno: {
    who: 'suno',
    mood: 'smile',
    size: 28,
    className: 'top-1.5 right-1.5 z-10',
  },

  // PROFILE SCREEN
  profileInviteCard: {
    who: 'suno',
    mood: 'wave',
    size: 64,
    inline: true,
  },
  profileDailyGoalCorner: {
    who: 'sango',
    mood: 'peek',
    size: 36,
    className: 'top-2.5 right-2.5 z-10',
  },

  // TALK TO ANNA MODAL
  talkToAnnaRecapHeader: {
    who: 'suno',
    mood: 'wave',
    size: 40,
    inline: true,
  },
} as const satisfies Record<string, MascotPlacementSpec>;

export type MascotPlacementKey = keyof typeof MASCOT_PLACEMENTS;

/**
 * Helper to resolve which lesson question card mascot placement applies.
 * - gate-check questions -> Sango (peek), bottom-right, translateY 15%
 * - speak / repeat cards -> Suno (wave), top-right 8px offset
 * - MCQ / match / fill cards -> Anna (curious), top-right 8px offset
 */
export function getLessonCardMascotPlacement(params: {
  exerciseType?: string;
  isGateCheck?: boolean;
}): MascotPlacementSpec {
  if (params.isGateCheck) {
    return MASCOT_PLACEMENTS.lessonGateCard;
  }
  if (params.exerciseType === 'speak') {
    return MASCOT_PLACEMENTS.lessonSpeakCard;
  }
  return MASCOT_PLACEMENTS.lessonMcqCard;
}

// ============================================================================
// 3. <Mascot /> COMPONENT
// ============================================================================
export interface MascotProps {
  who: MascotWho;
  mood: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  /** Entrance delay in ms (e.g., 300ms for Sango on completion screen) */
  delayMs?: number;
  /** Shrink from 40px to 32px below 360px viewport width (lesson question cards) */
  shrinkBelow360?: boolean;
  /** Spring pop 0.6->1 + fade out after 1.2s (3-in-a-row combo) */
  comboPop?: boolean;
  /** Use inline-block fixed box instead of absolute positioning when inside a dedicated flex slot */
  inline?: boolean;
}

function resolveCastAsset(who: MascotWho, mood: string): string {
  const group = CAST[who] as Record<string, string> | undefined;
  if (group && group[mood]) {
    return group[mood];
  }
  return CAST.anna.curious;
}

export const Mascot: React.FC<MascotProps> = ({
  who,
  mood,
  size = 40,
  className = '',
  style,
  delayMs = 0,
  shrinkBelow360 = false,
  comboPop = false,
  inline = false,
}) => {
  const primarySrc = resolveCastAsset(who, mood);

  // Fallback chain: requested asset -> anna-curious -> existing anna-avatar
  const fallbackChain = [
    primarySrc,
    CAST.anna.curious,
    ANNA_ASSETS.avatar,
    '/anna-avatar.webp',
  ];

  const [fallbackIndex, setFallbackIndex] = useState<number>(0);

  useEffect(() => {
    setFallbackIndex(0);
  }, [primarySrc]);

  // Play subtle Web Audio ping whenever an Anna mascot animation is triggered
  useEffect(() => {
    if (who !== 'anna') return;
    if (delayMs > 0) {
      const timer = window.setTimeout(() => {
        playAnnaMascotPing();
      }, delayMs);
      return () => window.clearTimeout(timer);
    }
    playAnnaMascotPing();
  }, [who, mood, comboPop, delayMs]);

  const currentSrc =
    fallbackChain[Math.min(fallbackIndex, fallbackChain.length - 1)];

  const handleImageError = () => {
    setFallbackIndex((prev) =>
      prev + 1 < fallbackChain.length ? prev + 1 : prev
    );
  };

  const animClass = comboPop ? 'mascot-combo-pop' : 'mascot-enter-once';
  const positionModeClass = inline ? 'inline-block shrink-0' : 'absolute';
  const responsiveSizeClass = shrinkBelow360
    ? 'max-[359px]:!w-8 max-[359px]:!h-8'
    : '';

  return (
    <span
      data-mascot={`${who}-${mood}`}
      aria-hidden="true"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        ...style,
      }}
      className={`${positionModeClass} pointer-events-none select-none ${responsiveSizeClass} ${className}`.trim()}
    >
      <img
        src={currentSrc}
        alt=""
        aria-hidden="true"
        draggable={false}
        onError={handleImageError}
        style={{
          animationDelay: delayMs > 0 ? `${delayMs}ms` : undefined,
        }}
        className={`w-full h-full object-contain pointer-events-none select-none block ${animClass}`}
      />
    </span>
  );
};

export default Mascot;
