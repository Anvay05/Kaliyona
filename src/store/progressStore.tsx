import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from 'react';
import {
  COURSE_UNITS,
  getAllCoursePhrases,
  computeLessonState,
  LessonNodeState,
} from '../data/courseData';
import { playTactileTone } from '../data/kanglishData';
import { markActiveToday } from '../lib/streak';

export const PROGRESS_STORAGE_KEY = 'kanglish-progress-v1';

export interface LevelProgress {
  lessonsDone: string[];
  crowned: boolean;
}

export interface UnitProgress {
  levels: Record<string, LevelProgress>;
}

export interface WordBoxEntry {
  box: 1 | 2 | 3 | 4 | 5;
  due: number;
  lastPracticedAt?: number;
  kannada?: string;
  translit?: string;
  meaning?: string;
  example?: string;
  unitId?: string;
}

export interface AchievementDef {
  id: string;
  emoji: string;
  title: string;
  subtitle?: string;
  description: string;
  tileTint: string;
  bgGradient: string;
  darkBgGradient: string;
  borderAccent: string;
  accentColor: string;
  pattern: 'rays' | 'dots' | 'waves' | 'grid' | 'diamonds' | 'rings' | 'stars' | 'chevrons';
}

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  {
    id: 'seven_day_streak',
    emoji: '🔥',
    title: '7 Day Streak',
    subtitle: 'WEEKLONG WARRIOR',
    description: 'Maintain a 7-day Kanglish learning streak',
    tileTint: '#FEF3C7',
    bgGradient: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 55%, #FDE68A 100%)',
    darkBgGradient: 'linear-gradient(135deg, #2A1C08 0%, #3B2506 55%, #451A03 100%)',
    borderAccent: '#F59E0B',
    accentColor: '#D97706',
    pattern: 'rays',
  },
  {
    id: 'kaapi_connoisseur',
    emoji: '☕',
    title: 'Kaapi Connoisseur',
    subtitle: 'FILTER COFFEE PRO',
    description: 'Start your Bengaluru morning with 8+ essential words',
    tileTint: '#FFEDD5',
    bgGradient: 'linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 55%, #FED7AA 100%)',
    darkBgGradient: 'linear-gradient(135deg, #2B160B 0%, #3D1D0D 55%, #431407 100%)',
    borderAccent: '#EA580C',
    accentColor: '#C2410C',
    pattern: 'waves',
  },
  {
    id: 'darshini_regular',
    emoji: '🥞',
    title: 'Darshini Regular',
    subtitle: 'MASALA DOSA CLUB',
    description: 'Earn 300+ XP practicing real-life Bengaluru phrases',
    tileTint: '#ECFDF5',
    bgGradient: 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 55%, #BBF7D0 100%)',
    darkBgGradient: 'linear-gradient(135deg, #082618 0%, #063622 55%, #064E3B 100%)',
    borderAccent: '#10B981',
    accentColor: '#059669',
    pattern: 'dots',
  },
  {
    id: 'first_ride',
    emoji: '🛺',
    title: 'First Auto Ride',
    subtitle: 'METER HAAKI ANNA',
    description: 'Complete Auto Ride Level 1 (u1-L1)',
    tileTint: '#E0F2FE',
    bgGradient: 'linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 55%, #BAE6FD 100%)',
    darkBgGradient: 'linear-gradient(135deg, #082032 0%, #0C2E47 55%, #075985 100%)',
    borderAccent: '#0284C7',
    accentColor: '#0369A1',
    pattern: 'chevrons',
  },
  {
    id: 'first_conversation',
    emoji: '💬',
    title: 'First Conversation',
    subtitle: 'ANNA DOST',
    description: 'Finish one full AI Roleplay session with Anna',
    tileTint: '#EDE9FE',
    bgGradient: 'linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 55%, #DDD6FE 100%)',
    darkBgGradient: 'linear-gradient(135deg, #1E1436 0%, #2A1B4E 55%, #3B0764 100%)',
    borderAccent: '#7C3AED',
    accentColor: '#6D28D9',
    pattern: 'rings',
  },
  {
    id: 'clear_speaker',
    emoji: '🎙️',
    title: 'Clear Speaker',
    subtitle: 'VOICE FLUENCY',
    description: 'Pass 10 spoken Kannada pronunciation exercises',
    tileTint: '#FCE7F3',
    bgGradient: 'linear-gradient(135deg, #FDF2F8 0%, #FCE7F3 55%, #FBCFE8 100%)',
    darkBgGradient: 'linear-gradient(135deg, #2D0F22 0%, #431331 55%, #500724 100%)',
    borderAccent: '#DB2777',
    accentColor: '#BE185D',
    pattern: 'waves',
  },
  {
    id: 'first_crown',
    emoji: '👑',
    title: 'First Crown',
    subtitle: 'ROYAL MASTERY',
    description: 'Complete all lessons in any level to earn a crown',
    tileTint: '#FEF9C3',
    bgGradient: 'linear-gradient(135deg, #FEFCE8 0%, #FEF08A 55%, #FDE047 100%)',
    darkBgGradient: 'linear-gradient(135deg, #282107 0%, #3F3208 55%, #713F12 100%)',
    borderAccent: '#CA8A04',
    accentColor: '#A16207',
    pattern: 'stars',
  },
  {
    id: 'metro_navigator',
    emoji: '🚇',
    title: 'Namma Metro Pro',
    subtitle: 'PURPLE & GREEN LINE',
    description: 'Complete 3+ curriculum lessons across the city path',
    tileTint: '#F3E8FF',
    bgGradient: 'linear-gradient(135deg, #FAF5FF 0%, #F3E8FF 55%, #E9D5FF 100%)',
    darkBgGradient: 'linear-gradient(135deg, #221035 0%, #32154F 55%, #4C1D95 100%)',
    borderAccent: '#9333EA',
    accentColor: '#7E22CE',
    pattern: 'grid',
  },
  {
    id: 'bargain_pro',
    emoji: '🛍️',
    title: 'Commercial St. Pro',
    subtitle: 'SWALPA KAMMI MAADI',
    description: 'Reach 500+ total XP in your learning journey',
    tileTint: '#CCFBF1',
    bgGradient: 'linear-gradient(135deg, #F0FDFA 0%, #CCFBF1 55%, #99F6E4 100%)',
    darkBgGradient: 'linear-gradient(135deg, #062825 0%, #0B3B36 55%, #115E59 100%)',
    borderAccent: '#0D9488',
    accentColor: '#0F766E',
    pattern: 'diamonds',
  },
  {
    id: 'fifty_words',
    emoji: '📚',
    title: '50 Words Club',
    subtitle: 'VOCABULARY VAULT',
    description: 'Unlock 50 Kannada words & phrases in your SRS deck',
    tileTint: '#E0E7FF',
    bgGradient: 'linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 55%, #C7D2FE 100%)',
    darkBgGradient: 'linear-gradient(135deg, #141936 0%, #1E2552 55%, #312E81 100%)',
    borderAccent: '#4F46E5',
    accentColor: '#4338CA',
    pattern: 'grid',
  },
  {
    id: 'indiranagar_insider',
    emoji: '🌳',
    title: 'Indiranagar Insider',
    subtitle: '100 FEET ROAD VIBE',
    description: 'Practice on 5+ active days and build local rhythm',
    tileTint: '#D1FAE5',
    bgGradient: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 55%, #A7F3D0 100%)',
    darkBgGradient: 'linear-gradient(135deg, #06291E 0%, #093D2C 55%, #065F46 100%)',
    borderAccent: '#059669',
    accentColor: '#047857',
    pattern: 'rings',
  },
  {
    id: 'monsoon_survivor',
    emoji: '🌧️',
    title: 'Bengaluru Monsoon',
    subtitle: 'TRAFFIC & CHAI',
    description: 'Earn 750+ XP rain or shine across Bengaluru',
    tileTint: '#CFFAFE',
    bgGradient: 'linear-gradient(135deg, #ECFEFF 0%, #CFFAFE 55%, #A5F3FC 100%)',
    darkBgGradient: 'linear-gradient(135deg, #07262E 0%, #0C3A47 55%, #155E75 100%)',
    borderAccent: '#0891B2',
    accentColor: '#0E7490',
    pattern: 'waves',
  },
  {
    id: 'voice_champion',
    emoji: '⚡',
    title: 'Sakkath Speaker',
    subtitle: '25 SPEAK PASSES',
    description: 'Pass 25 spoken Kanglish pronunciation challenges',
    tileTint: '#FFE4E6',
    bgGradient: 'linear-gradient(135deg, #FFF1F2 0%, #FFE4E6 55%, #FECDD3 100%)',
    darkBgGradient: 'linear-gradient(135deg, #2E0D15 0%, #471220 55%, #881337 100%)',
    borderAccent: '#E11D48',
    accentColor: '#BE123C',
    pattern: 'rays',
  },
  {
    id: 'hundred_words',
    emoji: '💎',
    title: '100 Words Master',
    subtitle: 'CENTURY SCHOLAR',
    description: 'Collect 100+ Kannada words in your phrasebook',
    tileTint: '#FAE8FF',
    bgGradient: 'linear-gradient(135deg, #FDF4FF 0%, #FAE8FF 55%, #F5D0FE 100%)',
    darkBgGradient: 'linear-gradient(135deg, #2B0E30 0%, #42144B 55%, #701A75 100%)',
    borderAccent: '#C026D3',
    accentColor: '#A21CAF',
    pattern: 'diamonds',
  },
  {
    id: 'legendary_unit',
    emoji: '🌟',
    title: 'Legendary Unit',
    subtitle: 'BOSS CHALLENGE',
    description: 'Complete Level 5 Challenge of any unit',
    tileTint: '#FEF3C7',
    bgGradient: 'linear-gradient(135deg, #FFFBEB 0%, #FDE68A 50%, #FCD34D 100%)',
    darkBgGradient: 'linear-gradient(135deg, #2D1E06 0%, #4A3008 55%, #78350F 100%)',
    borderAccent: '#D97706',
    accentColor: '#B45309',
    pattern: 'stars',
  },
  {
    id: 'namma_bengaluru_legend',
    emoji: '🏆',
    title: 'Bengaluru Legend',
    subtitle: 'OORU AMBASSADOR',
    description: 'Reach 1,000+ XP and master street-smart Kannada',
    tileTint: '#E0E7FF',
    bgGradient: 'linear-gradient(135deg, #EEF2FF 0%, #DDD6FE 50%, #FDE68A 100%)',
    darkBgGradient: 'linear-gradient(135deg, #1E1B4B 0%, #311042 55%, #451A03 100%)',
    borderAccent: '#6C5CE7',
    accentColor: '#5B4BC4',
    pattern: 'stars',
  },
];

export interface ProgressState {
  xp: number;
  streak: number;
  lastActiveDate: string | null;
  hearts: number;
  heartsRefillDate: string;
  dailyGoal: number;
  xpLog: Record<string, number>;
  wordsLog: Record<string, number>;
  units: Record<string, UnitProgress>;
  words: Record<string, WordBoxEntry>;
  achievements: string[];
  achievementDates: Record<string, string>;
  speakPassesCount: number;
  roleplaysCompletedCount: number;
  lastActiveUnitId?: string | null;
}

export function formatLocalDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getLocalTodayString(): string {
  return formatLocalDate(new Date());
}

export function getLocalYesterdayString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return formatLocalDate(d);
}

/**
 * SM-2 lite due intervals:
 * box1 = 10min, box2 = 1day, box3 = 3days, box4 = 7days, box5 = 21days
 */
export function getBoxIntervalMs(box: 1 | 2 | 3 | 4 | 5): number {
  switch (box) {
    case 1:
      return 10 * 60 * 1000; // 10 minutes
    case 2:
      return 24 * 60 * 60 * 1000; // 1 day
    case 3:
      return 3 * 24 * 60 * 60 * 1000; // 3 days
    case 4:
      return 7 * 24 * 60 * 60 * 1000; // 7 days
    case 5:
      return 21 * 24 * 60 * 60 * 1000; // 21 days
  }
}

function buildInitialUnitsMap(): Record<string, UnitProgress> {
  const map: Record<string, UnitProgress> = {};
  for (const u of COURSE_UNITS) {
    const levelsMap: Record<string, LevelProgress> = {};
    for (const l of u.levels) {
      levelsMap[l.id] = {
        lessonsDone: [],
        crowned: false,
      };
    }
    map[u.id] = { levels: levelsMap };
  }
  return map;
}

function buildInitialWordsMap(): Record<string, WordBoxEntry> {
  const now = Date.now() - 60 * 1000; // due now so initial deck is immediately playable
  const seed = [
    {
      key: 'namaskara',
      kannada: 'ನಮಸ್ಕಾರ',
      translit: 'Namaskāra',
      meaning: 'Hello',
      example: 'Namaskāra Anna, Indiranagara-kke barthira?',
    },
    {
      key: 'houdu',
      kannada: 'ಹೌದು',
      translit: 'Houdu',
      meaning: 'Yes',
      example: 'Houdu sir, meter haakthini.',
    },
    {
      key: 'illa',
      kannada: 'ಇಲ್ಲ',
      translit: 'Illa',
      meaning: 'No / Not available',
      example: 'Chillare illa anna, UPI maadla?',
    },
    {
      key: 'beku',
      kannada: 'ಬೇಕು',
      translit: 'Bēku',
      meaning: 'Want / Need',
      example: 'Ondu filter kaapi bēku.',
    },
    {
      key: 'beda',
      kannada: 'ಬೇಡ',
      translit: 'Bēda',
      meaning: "Don't want",
      example: 'One-and-half bēda anna.',
    },
    {
      key: 'eshtu',
      kannada: 'ಎಷ್ಟು?',
      translit: 'Eshtu?',
      meaning: 'How much?',
      example: 'Auto meter mele eshtu aaythu?',
    },
    {
      key: 'dhanyavaada',
      kannada: 'ಧನ್ಯವಾದ',
      translit: 'Dhanyavāda',
      meaning: 'Thank you',
      example: 'Thumba dhanyavāda anna!',
    },
    {
      key: 'sari',
      kannada: 'ಸರಿ',
      translit: 'Sari',
      meaning: 'Okay / Alright',
      example: 'Sari banni, hogona!',
    },
  ];

  const map: Record<string, WordBoxEntry> = {};
  for (let i = 0; i < seed.length; i++) {
    const item = seed[i];
    map[item.key] = {
      box: 1,
      due: now,
      lastPracticedAt: now - (seed.length - i) * 12 * 60 * 1000,
      kannada: item.kannada,
      translit: item.translit,
      meaning: item.meaning,
      example: item.example,
    };
  }
  return map;
}

function buildInitialXpLog(): Record<string, number> {
  const log: Record<string, number> = {};
  const sampleDailyXp = [10, 20, 15, 25, 20, 30];
  for (let i = 6; i >= 1; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    log[formatLocalDate(d)] = sampleDailyXp[6 - i] || 15;
  }
  log[getLocalTodayString()] = 10;
  return log;
}

function buildInitialWordsLog(): Record<string, number> {
  const log: Record<string, number> = {};
  const sampleDailyWords = [3, 5, 4, 6, 4, 7];
  for (let i = 6; i >= 1; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    log[formatLocalDate(d)] = sampleDailyWords[6 - i] || 3;
  }
  log[getLocalTodayString()] = 3;
  return log;
}

export const INITIAL_PROGRESS_STATE: ProgressState = {
  xp: 350,
  streak: 7,
  lastActiveDate: getLocalYesterdayString(),
  hearts: 5,
  heartsRefillDate: getLocalTodayString(),
  dailyGoal: 20,
  xpLog: buildInitialXpLog(),
  wordsLog: buildInitialWordsLog(),
  units: buildInitialUnitsMap(),
  words: buildInitialWordsMap(),
  achievements: ['seven_day_streak', 'darshini_regular'],
  achievementDates: {
    seven_day_streak: getLocalYesterdayString(),
    darshini_regular: getLocalTodayString(),
  },
  speakPassesCount: 0,
  roleplaysCompletedCount: 0,
  lastActiveUnitId: 'u1',
};

/**
 * Evaluates all 16 achievements strictly against current state so only achieved goals are unlocked.
 */
function evaluateAchievements(state: ProgressState): ProgressState {
  const today = getLocalTodayString();
  const prevDates = state.achievementDates || {};
  const unlockedSet = new Set<string>();
  const nextDates: Record<string, string> = {};

  const grant = (id: string) => {
    unlockedSet.add(id);
    nextDates[id] = prevDates[id] || today;
  };

  const wordCount = Object.keys(state.words).length;
  const activeDaysCount = Object.values(state.xpLog || {}).filter((v) => v > 0).length;

  let anyCrown = false;
  let anyLegendary = false;
  let totalLessonsDone = 0;
  for (const [uId, unitObj] of Object.entries(state.units)) {
    if (!unitObj?.levels) continue;
    for (const [lId, lvlObj] of Object.entries(unitObj.levels)) {
      totalLessonsDone += lvlObj?.lessonsDone?.length || 0;
      if (lvlObj?.crowned) {
        anyCrown = true;
        if (lId === `${uId}-L5` || lId.endsWith('-L5')) {
          anyLegendary = true;
        }
      }
    }
  }

  // 1. 🔥 "7 Day Streak" (7+ day streak)
  if (state.streak >= 7) {
    grant('seven_day_streak');
  }

  // 2. ☕ "Kaapi Connoisseur" (10+ words in deck)
  if (wordCount >= 10) {
    grant('kaapi_connoisseur');
  }

  // 3. 🥞 "Darshini Regular" (300+ XP)
  if (state.xp >= 300) {
    grant('darshini_regular');
  }

  // 4. 🛺 "First Ride" (complete u1-L1)
  const u1L1 = state.units['u1']?.levels?.['u1-L1'];
  if (u1L1 && (u1L1.crowned || u1L1.lessonsDone.length >= 3)) {
    grant('first_ride');
  }

  // 5. 💬 "First Conversation" (finish one roleplay session)
  if ((state.roleplaysCompletedCount || 0) >= 1) {
    grant('first_conversation');
  }

  // 6. 🎙️ "Clear Speaker" (pass 10 speak exercises)
  if ((state.speakPassesCount || 0) >= 10) {
    grant('clear_speaker');
  }

  // 7. 👑 "First Crown", 🚇 "Metro Navigator", 🌟 "Legendary Unit"
  if (anyCrown) {
    grant('first_crown');
  }
  if (totalLessonsDone >= 3) {
    grant('metro_navigator');
  }
  if (anyLegendary) {
    grant('legendary_unit');
  }

  // 8. 🛍️ "Commercial St. Pro" (500+ XP)
  if (state.xp >= 500) {
    grant('bargain_pro');
  }

  // 9. 📚 "50 Words Learned" (50+ words)
  if (wordCount >= 50) {
    grant('fifty_words');
  }

  // 10. 🌳 "Indiranagar Insider" (5+ active days AND at least 1 lesson completed)
  if (activeDaysCount >= 5 && totalLessonsDone >= 1) {
    grant('indiranagar_insider');
  }

  // 11. 🌧️ "Bengaluru Monsoon" (750+ XP)
  if (state.xp >= 750) {
    grant('monsoon_survivor');
  }

  // 12. ⚡ "Sakkath Speaker" (25+ speak passes)
  if ((state.speakPassesCount || 0) >= 25) {
    grant('voice_champion');
  }

  // 13. 💎 "100 Words Master" (100+ words)
  if (wordCount >= 100) {
    grant('hundred_words');
  }

  // 14. 🏆 "Bengaluru Legend" (1000+ XP)
  if (state.xp >= 1000) {
    grant('namma_bengaluru_legend');
  }

  const nextList = Array.from(unlockedSet);
  const sameLength = nextList.length === state.achievements.length;
  const sameItems =
    sameLength && nextList.every((id) => state.achievements.includes(id));

  if (sameItems) return state;

  return {
    ...state,
    achievements: nextList,
    achievementDates: nextDates,
  };
}

type ProgressAction =
  | {
      type: 'COMPLETE_LESSON';
      payload: {
        unitId: string;
        levelId: string;
        lessonId: string;
        xpEarned: number;
        accuracy?: number;
      };
    }
  | {
      type: 'SEE_WORD';
      payload: {
        wordId: string;
        kannada?: string;
        translit?: string;
        meaning?: string;
        example?: string;
        unitId?: string;
      };
    }
  | {
      type: 'REVIEW_FLASHCARD';
      payload: {
        wordId: string;
        rating: 'again' | 'good' | 'easy';
      };
    }
  | { type: 'RECORD_SPEAK_PASS' }
  | { type: 'RECORD_ROLEPLAY_COMPLETE' }
  | { type: 'LOSE_HEART' }
  | { type: 'REFILL_HEARTS' }
  | { type: 'ADD_XP'; payload: number }
  | { type: 'SET_DAILY_GOAL'; payload: number }
  | { type: 'RESET_PROGRESS' };

function progressReducer(
  state: ProgressState,
  action: ProgressAction
): ProgressState {
  const today = getLocalTodayString();
  const yesterday = getLocalYesterdayString();

  switch (action.type) {
    case 'LOSE_HEART': {
      return {
        ...state,
        hearts: Math.max(0, state.hearts - 1),
      };
    }

    case 'REFILL_HEARTS': {
      return {
        ...state,
        hearts: 5,
        heartsRefillDate: today,
      };
    }

    case 'ADD_XP': {
      const added = Math.max(0, action.payload);
      const prevTodayXp = state.xpLog[today] || 0;
      const nextState: ProgressState = {
        ...state,
        xp: state.xp + added,
        xpLog: {
          ...state.xpLog,
          [today]: prevTodayXp + added,
        },
      };
      return evaluateAchievements(nextState);
    }

    case 'SET_DAILY_GOAL': {
      return {
        ...state,
        dailyGoal: action.payload,
      };
    }

    case 'SEE_WORD': {
      const { wordId, kannada, translit, meaning, example, unitId } = action.payload;
      const cleanKey = wordId.toLowerCase().trim();
      if (!cleanKey) return state;

      const nowMs = Date.now();
      // If already in state.words, refresh lastPracticedAt so it appears in Recently Learned
      if (state.words[cleanKey]) {
        return {
          ...state,
          words: {
            ...state.words,
            [cleanKey]: {
              ...state.words[cleanKey],
              lastPracticedAt: nowMs,
            },
          },
        };
      }

      const nextWords: Record<string, WordBoxEntry> = {
        ...state.words,
        [cleanKey]: {
          box: 1,
          due: nowMs, // Immediately available in review deck
          lastPracticedAt: nowMs,
          kannada,
          translit,
          meaning,
          example,
          unitId,
        },
      };

      const prevTodayWords = state.wordsLog?.[today] || 0;

      return evaluateAchievements({
        ...state,
        words: nextWords,
        wordsLog: {
          ...(state.wordsLog || {}),
          [today]: prevTodayWords + 1,
        },
      });
    }

    case 'REVIEW_FLASHCARD': {
      const { wordId, rating } = action.payload;
      const cleanKey = wordId.toLowerCase().trim();
      const nowMs = Date.now();
      const existing = state.words[cleanKey] || {
        box: 1 as const,
        due: nowMs,
      };

      let nextBox: 1 | 2 | 3 | 4 | 5 = 1;
      if (rating === 'again') {
        nextBox = 1;
      } else if (rating === 'good') {
        nextBox = Math.min(5, existing.box + 1) as 1 | 2 | 3 | 4 | 5;
      } else if (rating === 'easy') {
        nextBox = Math.min(5, existing.box + 2) as 1 | 2 | 3 | 4 | 5;
      }

      const nextDue = nowMs + getBoxIntervalMs(nextBox);

      return evaluateAchievements({
        ...state,
        words: {
          ...state.words,
          [cleanKey]: {
            ...existing,
            box: nextBox,
            due: nextDue,
            lastPracticedAt: nowMs,
          },
        },
      });
    }

    case 'RECORD_SPEAK_PASS': {
      return evaluateAchievements({
        ...state,
        speakPassesCount: (state.speakPassesCount || 0) + 1,
      });
    }

    case 'RECORD_ROLEPLAY_COMPLETE': {
      return evaluateAchievements({
        ...state,
        roleplaysCompletedCount: (state.roleplaysCompletedCount || 0) + 1,
      });
    }

    case 'COMPLETE_LESSON': {
      const { unitId, levelId, lessonId, xpEarned } = action.payload;

      // 1. Streak logic on first lesson completion of a calendar day
      let nextStreak = state.streak;
      if (state.lastActiveDate === today) {
        nextStreak = state.streak;
      } else if (state.lastActiveDate === yesterday) {
        nextStreak = state.streak + 1;
      } else {
        nextStreak = 1;
      }

      // 2. Update unit -> level -> lessonsDone & crowned
      const existingUnit = state.units[unitId] || { levels: {} };
      const existingLevel = existingUnit.levels[levelId] || {
        lessonsDone: [],
        crowned: false,
      };

      const nextLessonsDone = existingLevel.lessonsDone.includes(lessonId)
        ? existingLevel.lessonsDone
        : [...existingLevel.lessonsDone, lessonId];

      const courseUnit = COURSE_UNITS.find((u) => u.id === unitId);
      const courseLevel = courseUnit?.levels.find((l) => l.id === levelId);
      const totalInLevel = courseLevel ? courseLevel.lessons.length : 3;
      const isNowCrowned = nextLessonsDone.length >= totalInLevel;

      // 3. Every word/phrase seen in the lesson auto-adds to progress.words with box 1 & due <= now
      const nextWords = { ...state.words };
      let newlyAddedWordsCount = 0;
      const courseLesson = courseLevel?.lessons.find(
        (les) => les.id === lessonId
      );
      if (courseLesson) {
        const nowMs = Date.now();
        let stepOffset = 0;
        for (const ex of courseLesson.exercises) {
          const wordKey = ex.translit.toLowerCase().trim();
          if (wordKey) {
            stepOffset++;
            if (!nextWords[wordKey]) {
              newlyAddedWordsCount++;
              nextWords[wordKey] = {
                box: 1,
                due: nowMs,
                lastPracticedAt: nowMs + stepOffset,
                kannada: ex.kannada,
                translit: ex.translit,
                meaning: ex.meaning,
                example: `Used in ${courseUnit?.title || 'Bengaluru'}: "${
                  ex.translit
                }" (${ex.meaning})`,
              };
            } else {
              nextWords[wordKey] = {
                ...nextWords[wordKey],
                lastPracticedAt: nowMs + stepOffset,
              };
            }
          }
          if (ex.pairs) {
            for (const p of ex.pairs) {
              const pKey = p.translit.toLowerCase().trim();
              if (pKey) {
                stepOffset++;
                if (!nextWords[pKey]) {
                  newlyAddedWordsCount++;
                  nextWords[pKey] = {
                    box: 1,
                    due: nowMs,
                    lastPracticedAt: nowMs + stepOffset,
                    kannada: p.kannada,
                    translit: p.translit,
                    meaning: p.meaning,
                    example: `Local phrase: "${p.translit}" (${p.meaning})`,
                  };
                } else {
                  nextWords[pKey] = {
                    ...nextWords[pKey],
                    lastPracticedAt: nowMs + stepOffset,
                  };
                }
              }
            }
          }
        }
      }

      const prevTodayXp = state.xpLog[today] || 0;
      const prevTodayWords = state.wordsLog?.[today] || 0;
      const wordsIncrement = Math.max(1, newlyAddedWordsCount);

      const updatedState: ProgressState = {
        ...state,
        xp: state.xp + xpEarned,
        streak: nextStreak,
        lastActiveDate: today,
        hearts: 5, // Hearts refill to 5 when a lesson is completed
        heartsRefillDate: today,
        xpLog: {
          ...state.xpLog,
          [today]: prevTodayXp + xpEarned,
        },
        wordsLog: {
          ...(state.wordsLog || {}),
          [today]: prevTodayWords + wordsIncrement,
        },
        units: {
          ...state.units,
          [unitId]: {
            ...existingUnit,
            levels: {
              ...existingUnit.levels,
              [levelId]: {
                lessonsDone: nextLessonsDone,
                crowned: isNowCrowned,
              },
            },
          },
        },
        words: nextWords,
        lastActiveUnitId: unitId,
      };

      return evaluateAchievements(updatedState);
    }

    case 'RESET_PROGRESS': {
      return {
        ...INITIAL_PROGRESS_STATE,
        units: buildInitialUnitsMap(),
        words: buildInitialWordsMap(),
        xpLog: buildInitialXpLog(),
        wordsLog: buildInitialWordsLog(),
      };
    }

    default:
      return state;
  }
}

function loadPersistedProgress(): ProgressState {
  const today = getLocalTodayString();
  try {
    const raw = localStorage.getItem(PROGRESS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ProgressState>;
      const baseUnits = buildInitialUnitsMap();

      if (parsed.units) {
        for (const [uId, uVal] of Object.entries(parsed.units)) {
          if (!baseUnits[uId]) {
            baseUnits[uId] = uVal;
          } else if (uVal && uVal.levels) {
            baseUnits[uId] = {
              levels: {
                ...baseUnits[uId].levels,
                ...uVal.levels,
              },
            };
          }
        }
      }

      const savedHeartsDate = parsed.heartsRefillDate || today;
      const effectiveHearts =
        savedHeartsDate !== today
          ? 5
          : typeof parsed.hearts === 'number'
          ? parsed.hearts
          : 5;

      // Filter legacy achievement IDs to valid ACHIEVEMENT_DEFS IDs
      const validIds = new Set(ACHIEVEMENT_DEFS.map((a) => a.id));
      const cleanAchievements = Array.isArray(parsed.achievements)
        ? parsed.achievements.filter((id) => validIds.has(id))
        : INITIAL_PROGRESS_STATE.achievements;

      const mergedWords =
        parsed.words && Object.keys(parsed.words).length > 0
          ? parsed.words
          : buildInitialWordsMap();

      const mergedXpLog =
        parsed.xpLog && Object.keys(parsed.xpLog).length > 0
          ? parsed.xpLog
          : buildInitialXpLog();

      const mergedWordsLog =
        parsed.wordsLog && Object.keys(parsed.wordsLog).length > 0
          ? parsed.wordsLog
          : buildInitialWordsLog();

      return evaluateAchievements({
        ...INITIAL_PROGRESS_STATE,
        ...parsed,
        hearts: effectiveHearts,
        heartsRefillDate: today,
        units: baseUnits,
        words: mergedWords,
        xpLog: mergedXpLog,
        wordsLog: mergedWordsLog,
        achievements: cleanAchievements,
        achievementDates:
          parsed.achievementDates || INITIAL_PROGRESS_STATE.achievementDates,
        speakPassesCount: parsed.speakPassesCount || 0,
        roleplaysCompletedCount: parsed.roleplaysCompletedCount || 0,
      });
    }
  } catch {
    // Ignore storage read errors
  }
  return evaluateAchievements(INITIAL_PROGRESS_STATE);
}

export interface ProgressContextValue extends ProgressState {
  demoUnlock: boolean;
  toggleDemoUnlock: () => void;
  getLessonState: (unitId: string, lessonIndex: number) => LessonNodeState;
  completedLessonsMap: Record<string, boolean>;
  todayXP: number;
  totalLessonsCompletedCount: number;
  crownedUnitsCount: number;
  totalCrownsCount: number;
  completeLesson: (
    unitId: string,
    levelId: string,
    lessonId: string,
    xpEarned: number,
    accuracy?: number
  ) => void;
  seeWord: (
    wordId: string,
    meta?: {
      kannada?: string;
      translit?: string;
      meaning?: string;
      example?: string;
      unitId?: string;
    }
  ) => void;
  reviewFlashcard: (
    wordId: string,
    rating: 'again' | 'good' | 'easy'
  ) => void;
  recordSpeakPass: () => void;
  recordRoleplayComplete: () => void;
  loseHeart: () => void;
  refillHearts: () => void;
  addXP: (n: number) => void;
  setDailyGoal: (goal: number) => void;
  resetProgress: () => void;
}

const ProgressContext = createContext<ProgressContextValue | null>(null);

const CONFETTI_COLORS = [
  '#4F8CFF',
  '#22D3EE',
  '#34D399',
  '#FF9F2E',
  '#F5C518',
  '#EDF2FC',
];

export const ProgressProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(
    progressReducer,
    undefined,
    loadPersistedProgress
  );

  const demoUnlock = false;
  const toggleDemoUnlock = useCallback(() => {
    // Demo unlock removed in production launch polish
  }, []);

  // Track previously unlocked achievements so we can trigger the Toast Modal mid-session
  const [seenAchievements, setSeenAchievements] = useState<string[]>(
    () => state.achievements
  );
  const [activeToastAchievement, setActiveToastAchievement] =
    useState<AchievementDef | null>(null);

  // Persist to localStorage under "kanglish-progress-v1"
  useEffect(() => {
    try {
      localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore quota errors
    }
  }, [state]);

  // Detect newly unlocked achievements mid-session -> show toast modal with badge + confetti
  useEffect(() => {
    const newlyAdded = state.achievements.find(
      (id) => !seenAchievements.includes(id)
    );
    if (newlyAdded) {
      setSeenAchievements(state.achievements);
      const def = ACHIEVEMENT_DEFS.find((a) => a.id === newlyAdded);
      if (def) {
        playTactileTone('success');
        setActiveToastAchievement(def);
      }
    }
  }, [state.achievements, seenAchievements]);

  // Check for local midnight heart refill on focus
  useEffect(() => {
    const checkMidnight = () => {
      const today = getLocalTodayString();
      if (state.heartsRefillDate !== today && state.hearts < 5) {
        dispatch({ type: 'REFILL_HEARTS' });
      }
    };
    window.addEventListener('focus', checkMidnight);
    return () => window.removeEventListener('focus', checkMidnight);
  }, [state.heartsRefillDate, state.hearts]);

  // Flat map of completed lesson IDs + sum of lessonsDone + full unit crowns
  const { completedLessonsMap, totalLessonsCompletedCount, crownedUnitsCount, totalCrownsCount } =
    useMemo(() => {
      const map: Record<string, boolean> = {};
      let lessonsSum = 0;
      let crownsSum = 0;

      for (const unitObj of Object.values(state.units)) {
        if (!unitObj?.levels) continue;
        for (const [lvlId, lvlObj] of Object.entries(unitObj.levels)) {
          if (lvlObj?.crowned) {
            crownsSum++;
            map[lvlId] = true;
          }
          if (!lvlObj?.lessonsDone) continue;
          lessonsSum += lvlObj.lessonsDone.length;
          for (const lesId of lvlObj.lessonsDone) {
            map[lesId] = true;
          }
        }
      }

      let unitsFullyCompleted = 0;
      for (const courseUnit of COURSE_UNITS) {
        const allLevelsDone =
          courseUnit.levels.length > 0 &&
          courseUnit.levels.every((lvl) =>
            lvl.lessons.every((les) => Boolean(map[les.id]) || Boolean(map[lvl.id]))
          );
        if (allLevelsDone) {
          unitsFullyCompleted++;
        }
      }

      return {
        completedLessonsMap: map,
        totalLessonsCompletedCount: lessonsSum,
        crownedUnitsCount: unitsFullyCompleted,
        totalCrownsCount: crownsSum,
      };
    }, [state.units]);

  const todayXP = state.xpLog[getLocalTodayString()] || 0;

  // Lookup table for enriching word entries from courseData if needed
  const phraseLookup = useMemo(() => {
    const all = getAllCoursePhrases();
    const byKey: Record<
      string,
      { kannada: string; translit: string; meaning: string; example: string }
    > = {};
    for (const p of all) {
      byKey[p.translit.toLowerCase().trim()] = {
        kannada: p.kannada,
        translit: p.translit,
        meaning: p.meaning,
        example: p.example,
      };
    }
    return byKey;
  }, []);

  const enrichedWords = useMemo(() => {
    const result: Record<string, WordBoxEntry> = {};
    for (const [key, val] of Object.entries(state.words)) {
      const fallback = phraseLookup[key];
      result[key] = {
        ...val,
        kannada: val.kannada || fallback?.kannada || key,
        translit: val.translit || fallback?.translit || key,
        meaning: val.meaning || fallback?.meaning || 'Kannada survival phrase',
        example:
          val.example ||
          fallback?.example ||
          `Spoken in Bengaluru: "${val.translit || key}"`,
      };
    }
    return result;
  }, [state.words, phraseLookup]);

  const completeLesson = useCallback(
    (
      unitId: string,
      levelId: string,
      lessonId: string,
      xpEarned: number,
      accuracy?: number
    ) => {
      markActiveToday();
      dispatch({
        type: 'COMPLETE_LESSON',
        payload: { unitId, levelId, lessonId, xpEarned, accuracy },
      });
    },
    []
  );

  const seeWord = useCallback(
    (
      wordId: string,
      meta?: {
        kannada?: string;
        translit?: string;
        meaning?: string;
        example?: string;
        unitId?: string;
      }
    ) =>
      dispatch({
        type: 'SEE_WORD',
        payload: { wordId, ...meta },
      }),
    []
  );

  const reviewFlashcard = useCallback(
    (wordId: string, rating: 'again' | 'good' | 'easy') => {
      markActiveToday();
      dispatch({
        type: 'REVIEW_FLASHCARD',
        payload: { wordId, rating },
      });
    },
    []
  );

  const recordSpeakPass = useCallback(() => {
    markActiveToday();
    dispatch({ type: 'RECORD_SPEAK_PASS' });
  }, []);

  const recordRoleplayComplete = useCallback(() => {
    markActiveToday();
    dispatch({ type: 'RECORD_ROLEPLAY_COMPLETE' });
  }, []);

  const loseHeart = useCallback(() => dispatch({ type: 'LOSE_HEART' }), []);

  const refillHearts = useCallback(
    () => dispatch({ type: 'REFILL_HEARTS' }),
    []
  );

  const addXP = useCallback((n: number) => {
    if (n > 0) markActiveToday();
    dispatch({ type: 'ADD_XP', payload: n });
  }, []);

  const setDailyGoal = useCallback(
    (goal: number) => dispatch({ type: 'SET_DAILY_GOAL', payload: goal }),
    []
  );

  const getLessonState = useCallback(
    (unitId: string, lessonIndex: number): LessonNodeState => {
      return computeLessonState(
        unitId,
        lessonIndex,
        COURSE_UNITS,
        completedLessonsMap,
        demoUnlock
      );
    },
    [completedLessonsMap, demoUnlock]
  );

  const resetProgress = useCallback(() => {
    localStorage.removeItem(PROGRESS_STORAGE_KEY);
    localStorage.removeItem('demoUnlock');
    dispatch({ type: 'RESET_PROGRESS' });
  }, []);

  const value: ProgressContextValue = {
    ...state,
    demoUnlock,
    toggleDemoUnlock,
    getLessonState,
    words: enrichedWords,
    completedLessonsMap,
    todayXP,
    totalLessonsCompletedCount,
    crownedUnitsCount,
    totalCrownsCount,
    completeLesson,
    seeWord,
    reviewFlashcard,
    recordSpeakPass,
    recordRoleplayComplete,
    loseHeart,
    refillHearts,
    addXP,
    setDailyGoal,
    resetProgress,
  };

  return (
    <ProgressContext.Provider value={value}>
      {children}

      {/* 6.4 MID-SESSION ACHIEVEMENT UNLOCK TOAST MODAL WITH BADGE + CONFETTI */}
      {activeToastAchievement && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setActiveToastAchievement(null)}
        >
          <div
            className="max-w-sm w-full card-lift p-6 text-center space-y-4 relative overflow-hidden border-2 border-[var(--accent)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Confetti */}
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-32 overflow-hidden"
              aria-hidden="true"
            >
              {Array.from({ length: 12 }).map((_, idx) => (
                <span
                  key={idx}
                  className="confetti-piece"
                  style={{
                    left: `${6 + idx * 8}%`,
                    top: '-8px',
                    backgroundColor:
                      CONFETTI_COLORS[idx % CONFETTI_COLORS.length],
                    animationDelay: `${(idx % 4) * 120}ms`,
                  }}
                />
              ))}
            </div>

            <span className="mono-label text-[var(--accent2)] block relative z-10">
              ACHIEVEMENT UNLOCKED
            </span>

            <div
              className="w-20 h-20 rounded-full mx-auto flex items-center justify-center shadow-md relative z-10 border border-[var(--line)] overflow-hidden p-3"
              style={{ backgroundColor: activeToastAchievement.tileTint }}
            >
              <img
                src="/assets/logo-icon.webp"
                alt=""
                loading="lazy"
                className="w-12 h-12 object-contain"
              />
            </div>

            <div className="space-y-1 relative z-10">
              <h3 className="font-display font-bold text-2xl text-[var(--ink)]">
                {activeToastAchievement.title}
              </h3>
              <p className="text-xs text-[var(--muted)]">
                {activeToastAchievement.description}
              </p>
              <p className="mono-label text-[var(--success)] !text-[10px] pt-1">
                UNLOCKED {getLocalTodayString()}
              </p>
            </div>

            <button
              onClick={() => setActiveToastAchievement(null)}
              className="btn-primary w-full relative z-10"
            >
              Awesome!
            </button>
          </div>
        </div>
      )}
    </ProgressContext.Provider>
  );
};

export function useProgress(): ProgressContextValue {
  const ctx = useContext(ProgressContext);
  if (!ctx) {
    throw new Error('useProgress must be used within a ProgressProvider');
  }
  return ctx;
}
