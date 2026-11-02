import {
  WORDS,
  Word,
  QType,
  getLesson,
  getWord,
  getUnlockedLessons,
} from '../data/curriculum';
import {
  hash32,
  mulberry32,
  deterministicShuffle,
  deterministicSample,
} from './rng';

export const QTYPE_WEIGHT: Record<QType, 1 | 2 | 3 | 4> = {
  kannada_to_english: 1, // see Kannada, pick English — recognition, easiest
  audio_to_word: 2,      // hear it, pick it — recognition via listening
  english_to_kannada: 3, // see English, pick Kannada — recall, harder
  fill_blank: 4,         // production in context, hardest
};

const QTYPES_BY_EASIEST: readonly QType[] = [
  'kannada_to_english',
  'audio_to_word',
  'english_to_kannada',
  'fill_blank',
];

export function getWordTokenCount(word: Word): number {
  const cleaned = (word.kannada || '')
    .replace(/[?!.,;:'"“”‘’()—–-]/g, ' ')
    .trim();
  if (!cleaned) return 1;
  return cleaned.split(/\s+/).filter(Boolean).length;
}

export function isPhraseWord(word: Word): boolean {
  return word.partOfSpeech === 'phrase' || getWordTokenCount(word) >= 3;
}

export function getWordComplexityWeight(word: Word): 0 | 1 | 2 {
  if (isPhraseWord(word)) return 2;
  if (getWordTokenCount(word) === 2) return 1;
  return 0;
}

export function isSimpleSingleWord(word: Word): boolean {
  return (
    getWordComplexityWeight(word) === 0 &&
    (word.partOfSpeech === 'noun' ||
      word.partOfSpeech === 'verb' ||
      word.partOfSpeech === 'adjective')
  );
}

export function getDifficultyScore(word: Word, qType: QType): number {
  return QTYPE_WEIGHT[qType] + getWordComplexityWeight(word);
}

export interface ExerciseOptionDetail {
  wordId: string;
  label: string;
  kannada: string;
  transliteration: string;
  english: string;
}

export interface GeneratedQuestion {
  id: string;
  wordId: string;
  word: Word;
  qType: QType;
  weight: 1 | 2 | 3 | 4;
  complexityWeight: 0 | 1 | 2;
  difficultyScore: number;
  prompt: string;
  kannada: string;
  transliteration: string;
  english: string;
  audioText: string;
  exampleSentence?: { kannada: string; english: string; blankedKannada: string };
  options: string[];
  optionDetails: ExerciseOptionDetail[];
  correctOption: string;
  correctIndex: number;
  distractorWordIds: string[];
}

export interface GeneratedExercise {
  seed: number;
  lessonId: string;
  canonicalLessonId: string;
  attemptNumber: number;
  userId: string;
  taughtPool: Word[];
  questions: GeneratedQuestion[];
}

function normalizeText(value: string): string {
  return (value || '').normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * A2. pickDistractors(target, pool, n) rules:
 * - Candidates come ONLY from the taught pool. Never from future lessons.
 * - Exclude the target and any word whose english equals the target's english.
 * - Prefer same partOfSpeech as target; if fewer than n exist, top up from remaining pool respecting exclusions.
 * - Never return duplicates. Must return exactly n items or throw.
 */
export function pickDistractors(
  target: Word,
  pool: readonly Word[],
  n: number,
  rng: () => number = mulberry32(hash32(target.id))
): Word[] {
  const targetEn = normalizeText(target.english);
  const targetKn = normalizeText(target.kannada);
  const targetTr = normalizeText(target.transliteration);

  const seenIds = new Set<string>([target.id]);
  const seenEn = new Set<string>([targetEn]);
  const seenKn = new Set<string>([targetKn]);
  const seenTr = new Set<string>([targetTr]);

  const eligible: Word[] = [];
  for (const w of pool) {
    if (!w || seenIds.has(w.id)) continue;
    const en = normalizeText(w.english);
    const kn = normalizeText(w.kannada);
    const tr = normalizeText(w.transliteration);
    if (seenEn.has(en) || seenKn.has(kn) || seenTr.has(tr)) continue;
    seenIds.add(w.id);
    seenEn.add(en);
    seenKn.add(kn);
    seenTr.add(tr);
    eligible.push(w);
  }

  const samePos = eligible.filter((w) => w.partOfSpeech === target.partOfSpeech);
  const otherPos = eligible.filter((w) => w.partOfSpeech !== target.partOfSpeech);

  const shuffledSamePos = deterministicShuffle(samePos, rng);
  const shuffledOtherPos = deterministicShuffle(otherPos, rng);

  const picked = [...shuffledSamePos, ...shuffledOtherPos].slice(0, n);
  if (picked.length !== n) {
    throw new Error(
      `pickDistractors failed for word "${target.id}": needed ${n} distractors, found ${picked.length}`
    );
  }

  return picked;
}

function formatOptionLabelForQType(word: Word, qType: QType): string {
  switch (qType) {
    case 'kannada_to_english':
      return word.english;
    case 'english_to_kannada':
    case 'audio_to_word':
    case 'fill_blank':
      return `${word.kannada} (${word.transliteration})`;
  }
}

function buildQuestionPrompt(
  target: Word,
  qType: QType
): {
  prompt: string;
  exampleSentence?: { kannada: string; english: string; blankedKannada: string };
} {
  switch (qType) {
    case 'english_to_kannada':
      return {
        prompt: `How do you say "${target.english}" in Kannada?`,
      };
    case 'kannada_to_english':
      return {
        prompt: `What does "${target.kannada}" (${target.transliteration}) mean in English?`,
      };
    case 'audio_to_word':
      return {
        prompt: `Listen and choose the Kannada word for "${target.transliteration}"`,
      };
    case 'fill_blank': {
      const rawEx = target.exampleSentence || {
        kannada: `${target.kannada}.`,
        english: target.english,
      };
      const blankedKannada = rawEx.kannada.includes(target.kannada)
        ? rawEx.kannada.replace(target.kannada, '_____')
        : `_____ (${rawEx.kannada})`;
      return {
        prompt: `Fill in the blank: "${blankedKannada}" — ${rawEx.english}`,
        exampleSentence: {
          kannada: rawEx.kannada,
          english: rawEx.english,
          blankedKannada,
        },
      };
    }
  }
}

function getEasiestAllowedType(word: Word): QType {
  for (const candidate of QTYPES_BY_EASIEST) {
    if (word.allowedTypes.includes(candidate)) {
      return candidate;
    }
  }
  return word.allowedTypes[0];
}

function pickAllowedType(word: Word, preferred: readonly QType[]): QType {
  for (const candidate of preferred) {
    if (word.allowedTypes.includes(candidate)) {
      return candidate;
    }
  }
  return getEasiestAllowedType(word);
}

function canTakeRecognitionType(word: Word): boolean {
  return (
    word.allowedTypes.includes('kannada_to_english') ||
    word.allowedTypes.includes('audio_to_word')
  );
}

function rotateArray<T>(items: readonly T[], offset: number): T[] {
  if (items.length <= 1) return [...items];
  const shift = ((offset % items.length) + items.length) % items.length;
  if (shift === 0) return [...items];
  return [...items.slice(shift), ...items.slice(0, shift)];
}

/**
 * PART B — Partition targets into simple items first, complex items last,
 * and assign question types by position respecting each word's allowedTypes
 * and PART C7 relaxation rules for tiny pools.
 */
export function assignTypesAndOrderTargets(
  selectedTargets: readonly Word[],
  currentWordIdSet: ReadonlySet<string>,
  safeAttempt: number
): { word: Word; qType: QType; difficultyScore: number }[] {
  // 1. Partition selected target words:
  //    - Simple single words (noun/verb/adjective, 1 word) first, with current-lesson
  //      simple words ahead of review simple words so Positions 1-2 warm up on current lesson words.
  //    - Complex items last: two-word items first, then phrase items (partOfSpeech === 'phrase' or 3+ words)
  //      in the final 1-2 positions only.
  //    - Also if a word cannot take an easy recognition type, move it after words that can.
  let simpleCurrentEasy = selectedTargets.filter(
    (w) =>
      isSimpleSingleWord(w) &&
      currentWordIdSet.has(w.id) &&
      w.allowedTypes.includes('kannada_to_english')
  );
  const simpleOtherEasy = selectedTargets.filter(
    (w) =>
      isSimpleSingleWord(w) &&
      (!currentWordIdSet.has(w.id) || !w.allowedTypes.includes('kannada_to_english')) &&
      canTakeRecognitionType(w)
  );
  const simpleHardOnly = selectedTargets.filter(
    (w) => isSimpleSingleWord(w) && !canTakeRecognitionType(w)
  );

  // On Attempt 2+, deterministically rotate within simpleCurrentEasy so warm-up
  // and middle/late word-to-type assignments vary across attempts while staying seeded.
  if (safeAttempt > 1 && simpleCurrentEasy.length > 1) {
    simpleCurrentEasy = rotateArray(simpleCurrentEasy, safeAttempt - 1);
  }

  const twoWordEasy = selectedTargets.filter(
    (w) => getWordComplexityWeight(w) === 1 && canTakeRecognitionType(w)
  );
  const twoWordHardOnly = selectedTargets.filter(
    (w) => getWordComplexityWeight(w) === 1 && !canTakeRecognitionType(w)
  );
  const phraseItems = selectedTargets.filter((w) => isPhraseWord(w));

  const orderedTargets: Word[] = [
    ...simpleCurrentEasy,
    ...simpleOtherEasy,
    ...twoWordEasy,
    ...simpleHardOnly,
    ...twoWordHardOnly,
    ...phraseItems,
  ];

  const n = orderedTargets.length;
  const firstHalfEnd = Math.ceil(n / 2);

  // Pre-check whether any non-phrase item in the exercise will have complexityWeight === 1 at pos === n
  const assigned: { word: Word; qType: QType; difficultyScore: number }[] = [];

  for (let i = 0; i < n; i++) {
    const pos = i + 1; // 1-indexed position
    const word = orderedTargets[i];
    const complexity = getWordComplexityWeight(word);
    let qType: QType;

    if (pos === 1) {
      // Position 1: MUST be kannada_to_english on a simple single word (or two-word item under C7 relaxation)
      qType = pickAllowedType(word, ['kannada_to_english', 'audio_to_word']);
    } else if (pos === 2) {
      // Position 2: kannada_to_english on a simple single word (score 1).
      // C7 relaxation if pool has < 2 simple single words: allow audio_to_word on single word (score 2)
      // or kannada_to_english on a two-word item (score 2).
      if (complexity === 0) {
        qType = pickAllowedType(word, ['kannada_to_english', 'audio_to_word']);
      } else {
        qType = pickAllowedType(word, ['kannada_to_english']);
      }
    } else if (pos <= firstHalfEnd) {
      // Middle positions (first half, 3 .. ceil(n/2)):
      // kannada_to_english or audio_to_word. Never english_to_kannada or fill_blank.
      // For two-word items (complexity === 1), use kannada_to_english so difficultyScore === 2 <= 2.
      if (complexity === 0) {
        qType = pickAllowedType(word, ['audio_to_word', 'kannada_to_english']);
      } else {
        qType = pickAllowedType(word, ['kannada_to_english', 'audio_to_word']);
      }
    } else if (pos < n) {
      // Late positions (second half before final position):
      // Phrase words (only possible at n - 1) get english_to_kannada or fill_blank;
      // Non-phrase words get english_to_kannada.
      if (isPhraseWord(word)) {
        qType = pickAllowedType(word, ['english_to_kannada', 'fill_blank']);
      } else {
        qType = pickAllowedType(word, [
          'english_to_kannada',
          'audio_to_word',
          'kannada_to_english',
        ]);
      }
    } else {
      // Final position (pos === n): fill_blank or phrase question (hardest, last)
      if (isPhraseWord(word)) {
        const maxPrevScore = assigned.reduce(
          (max, item) => Math.max(max, item.difficultyScore),
          0
        );
        const preferredForPhrase: QType[] =
          maxPrevScore >= 5 || safeAttempt % 2 === 0
            ? ['fill_blank', 'english_to_kannada']
            : ['english_to_kannada', 'fill_blank'];
        qType = pickAllowedType(word, preferredForPhrase);
      } else {
        qType = pickAllowedType(word, [
          'fill_blank',
          'english_to_kannada',
          'audio_to_word',
          'kannada_to_english',
        ]);
      }
    }

    const difficultyScore = getDifficultyScore(word, qType);
    assigned.push({ word, qType, difficultyScore });
  }

  // 3. Final ordering: sort by difficultyScore non-decreasing, ties broken deterministically by wordId.
  return assigned.sort((a, b) => {
    if (a.difficultyScore !== b.difficultyScore) {
      return a.difficultyScore - b.difficultyScore;
    }
    return a.word.id.localeCompare(b.word.id);
  });
}

/**
 * A2 & PART B. Deterministic lesson-locked exercise builder with difficulty progression.
 */
export function buildExercise(
  lessonId: string,
  attemptNumber: number = 1,
  userId?: string
): GeneratedExercise {
  const effectiveUser = userId && userId.trim().length > 0 ? userId.trim() : 'guest';
  const safeAttempt = Math.max(1, Math.floor(attemptNumber || 1));

  // 1. lesson = getLesson(lessonId)
  const lesson = getLesson(lessonId);

  // Deterministic seed per A4
  const seed = hash32(`${effectiveUser}:${lessonId}:${safeAttempt}`);
  const rng = mulberry32(seed);

  // 2. unlockedLessons = all lessons where level < lesson.level
  //    OR (level === lesson.level AND order <= lesson.order)
  const unlockedLessons = getUnlockedLessons(lesson);
  const unlockedLessonIds = new Set(unlockedLessons.map((l) => l.id));

  // 3. taughtPool = all words whose lessonId is in unlockedLessons
  const taughtPool = WORDS.filter((w) => unlockedLessonIds.has(w.lessonId));

  // 4. currentWords = lesson.wordIds mapped to Word objects (4-8 words)
  const currentWords = lesson.wordIds.map((wId) => getWord(wId));
  const currentWordIdSet = new Set(currentWords.map((w) => w.id));

  // 5. reviewWords = deterministicSample(taughtPool minus currentWords, 2)
  const reviewCandidates = taughtPool.filter((w) => !currentWordIdSet.has(w.id));
  const reviewRng = mulberry32(hash32(`${effectiveUser}:${lesson.id}:review_pool`));
  const reviewWords = deterministicSample(reviewCandidates, 2, reviewRng);

  // 6. targets = currentWords.concat(reviewWords), then deterministicShuffle
  const combinedTargets = currentWords.concat(reviewWords);
  const shuffledTargets = deterministicShuffle(combinedTargets, rng);

  // 7. questionCount = min(8, targets.length); targets = targets.slice(0, questionCount)
  const questionCount = Math.min(8, shuffledTargets.length);
  const targets = shuffledTargets.slice(0, questionCount);

  // 8 & 9. Partition targets, assign question types by position, and sort by (difficultyScore ASC, wordId ASC)
  const orderedPlan = assignTypesAndOrderTargets(
    targets,
    currentWordIdSet,
    safeAttempt
  );

  const questions: GeneratedQuestion[] = orderedPlan.map(
    ({ word: target, qType, difficultyScore }, i) => {
      const distractors = pickDistractors(target, taughtPool, 3, rng);

      const allOptionWords = deterministicShuffle([target, ...distractors], rng);
      const optionDetails: ExerciseOptionDetail[] = allOptionWords.map((w) => ({
        wordId: w.id,
        label: formatOptionLabelForQType(w, qType),
        kannada: w.kannada,
        transliteration: w.transliteration,
        english: w.english,
      }));

      const options = optionDetails.map((o) => o.label);
      const correctOption = formatOptionLabelForQType(target, qType);
      const correctIndex = options.indexOf(correctOption);
      const { prompt, exampleSentence } = buildQuestionPrompt(target, qType);

      return {
        id: `${lesson.id}_a${safeAttempt}_q${i + 1}_${target.id}`,
        wordId: target.id,
        word: target,
        qType,
        weight: QTYPE_WEIGHT[qType],
        complexityWeight: getWordComplexityWeight(target),
        difficultyScore,
        prompt,
        kannada: target.kannada,
        transliteration: target.transliteration,
        english: target.english,
        audioText: target.kannada,
        exampleSentence,
        options,
        optionDetails,
        correctOption,
        correctIndex,
        distractorWordIds: distractors.map((d) => d.id),
      };
    }
  );

  // 10. Return { seed, lessonId, attemptNumber, questions }
  const exercise: GeneratedExercise = {
    seed,
    lessonId,
    canonicalLessonId: lesson.id,
    attemptNumber: safeAttempt,
    userId: effectiveUser,
    taughtPool,
    questions,
  };

  validateExercise(exercise);
  return exercise;
}

/**
 * A3 & PART C. Hard constraints — validate, never silently degrade.
 * Throws in development (import.meta.env.DEV), console.errors in production.
 */
export function validateExercise(exercise: GeneratedExercise): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const lesson = getLesson(exercise.lessonId);
  const unlockedLessons = getUnlockedLessons(lesson);
  const unlockedLessonIds = new Set(unlockedLessons.map((l) => l.id));
  const taughtPool = WORDS.filter((w) => unlockedLessonIds.has(w.lessonId));
  const taughtPoolById = new Map<string, Word>(taughtPool.map((w) => [w.id, w]));

  const currentWords = lesson.wordIds.map((id) => getWord(id));
  const currentWordIds = new Set(currentWords.map((w) => w.id));
  const reviewCandidateCount = taughtPool.filter(
    (w) => !currentWordIds.has(w.id)
  ).length;
  const eligibleTargetCount =
    currentWords.length + Math.min(2, reviewCandidateCount);

  // Constraint 10: questions.length === min(8, eligible target count)
  const expectedQuestionCount = Math.min(8, eligibleTargetCount);
  if (exercise.questions.length !== expectedQuestionCount) {
    errors.push(
      `[C10] questions.length (${exercise.questions.length}) !== min(8, eligibleTargetCount=${eligibleTargetCount})`
    );
  }

  // Words from level > lesson.level for Constraint 9
  const higherLevelWords = WORDS.filter((w) => w.level > lesson.level);

  const seenAnswerIds = new Set<string>();
  const seenPrompts = new Set<string>();

  exercise.questions.forEach((q, qIdx) => {
    const prefix = `Q${qIdx + 1} (${q.wordId})`;
    const answerWord = taughtPoolById.get(q.wordId);

    // Constraint 1: Answer word of every question is in taughtPool
    if (!answerWord) {
      errors.push(`[C1] ${prefix}: answer word "${q.wordId}" is not in taughtPool`);
    }

    // Constraint 2: No word is the answer twice within one attempt
    if (seenAnswerIds.has(q.wordId)) {
      errors.push(`[C2] ${prefix}: word "${q.wordId}" is the answer twice in one attempt`);
    }
    seenAnswerIds.add(q.wordId);

    // Constraint 3: Exactly 4 options, all unique, all non-empty
    if (!Array.isArray(q.options) || q.options.length !== 4) {
      errors.push(
        `[C3] ${prefix}: expected 4 options, got ${q.options?.length ?? 0}`
      );
    } else {
      const normalizedOpts = q.options.map((o) => normalizeText(o));
      if (normalizedOpts.some((o) => o.length === 0)) {
        errors.push(`[C3] ${prefix}: contains an empty option`);
      }
      if (new Set(normalizedOpts).size !== 4) {
        errors.push(`[C3] ${prefix}: options are not all unique: ${JSON.stringify(q.options)}`);
      }
    }

    // Constraint 4: Exactly one correct option
    const matchingCorrectCount = (q.options || []).filter(
      (opt) => opt === q.correctOption
    ).length;
    if (matchingCorrectCount !== 1) {
      errors.push(
        `[C4] ${prefix}: expected exactly 1 correct option matching "${q.correctOption}", found ${matchingCorrectCount}`
      );
    }

    // Constraint 5: All 3 distractors are in taughtPool
    if (!Array.isArray(q.distractorWordIds) || q.distractorWordIds.length !== 3) {
      errors.push(
        `[C5] ${prefix}: expected 3 distractors, got ${q.distractorWordIds?.length ?? 0}`
      );
    } else {
      const distractorWords: Word[] = [];
      for (const dId of q.distractorWordIds) {
        const dw = taughtPoolById.get(dId);
        if (!dw) {
          errors.push(
            `[C5] ${prefix}: distractor "${dId}" is not in taughtPool`
          );
        } else {
          distractorWords.push(dw);
        }
      }

      if (answerWord && distractorWords.length === 3) {
        // Constraint 6: Distractor partOfSpeech matches the answer wherever pool allows
        const availableSamePos = taughtPool.filter(
          (w) =>
            w.id !== answerWord.id &&
            normalizeText(w.english) !== normalizeText(answerWord.english) &&
            w.partOfSpeech === answerWord.partOfSpeech
        );
        const expectedSamePosCount = Math.min(3, availableSamePos.length);
        const actualSamePosCount = distractorWords.filter(
          (d) => d.partOfSpeech === answerWord.partOfSpeech
        ).length;
        if (actualSamePosCount < expectedSamePosCount) {
          errors.push(
            `[C6] ${prefix}: expected at least ${expectedSamePosCount} distractors with partOfSpeech "${answerWord.partOfSpeech}", got ${actualSamePosCount}`
          );
        }

        // Constraint 7: No distractor is a translation-equivalent of the answer
        for (const d of distractorWords) {
          if (
            normalizeText(d.english) === normalizeText(answerWord.english) ||
            normalizeText(d.kannada) === normalizeText(answerWord.kannada) ||
            normalizeText(d.transliteration) ===
              normalizeText(answerWord.transliteration)
          ) {
            errors.push(
              `[C7] ${prefix}: distractor "${d.id}" is a translation-equivalent of answer "${answerWord.id}"`
            );
          }
        }
      }
    }

    // Constraint 8: No two questions share the same prompt string
    const normPrompt = normalizeText(q.prompt);
    if (!normPrompt) {
      errors.push(`[C8] ${prefix}: prompt is empty`);
    } else if (seenPrompts.has(normPrompt)) {
      errors.push(`[C8] ${prefix}: duplicate prompt "${q.prompt}"`);
    }
    seenPrompts.add(normPrompt);

    // Constraint 9: No word from level > lesson.level appears anywhere — prompt OR options
    if (answerWord && answerWord.level > lesson.level) {
      errors.push(
        `[C9] ${prefix}: answer word "${answerWord.id}" is from level ${answerWord.level} > lesson.level ${lesson.level}`
      );
    }
    for (const oDetail of q.optionDetails || []) {
      const ow = taughtPoolById.get(oDetail.wordId) || getWord(oDetail.wordId);
      if (ow.level > lesson.level) {
        errors.push(
          `[C9] ${prefix}: option word "${ow.id}" is from level ${ow.level} > lesson.level ${lesson.level}`
        );
      }
    }
    const extractTokens = (text: string): Set<string> =>
      new Set(
        (text || '')
          .replace(/[?!.,;:'"“”‘’()—–_/-]/g, ' ')
          .split(/\s+/)
          .filter(Boolean)
      );
    const promptTokens = extractTokens(q.prompt);
    const optionTokenSets = q.options.map((opt) => extractTokens(opt));

    for (const hw of higherLevelWords) {
      const promptHasHigherKn = promptTokens.has(hw.kannada);
      const optionsHaveHigherKn = optionTokenSets.some((set) =>
        set.has(hw.kannada)
      );
      if (promptHasHigherKn || optionsHaveHigherKn) {
        errors.push(
          `[C9] ${prefix}: higher-level word "${hw.id}" (level ${hw.level}) appeared in prompt or options`
        );
      }
    }

    // Constraint 11: qType of every question is in that word's allowedTypes
    if (answerWord && !answerWord.allowedTypes.includes(q.qType)) {
      errors.push(
        `[C11] ${prefix}: qType "${q.qType}" is not in allowedTypes for "${answerWord.id}"`
      );
    }
  });

  // =========================================================================
  // PART C — DIFFICULTY PROGRESSION HARD CONSTRAINTS (1-7)
  // =========================================================================
  const n = exercise.questions.length;
  if (n > 0) {
    const simpleSingleCount = exercise.questions.filter((q) =>
      isSimpleSingleWord(q.word)
    ).length;

    const q1 = exercise.questions[0];
    // PART C Constraint 7 & 1: Never start with english_to_kannada, fill_blank, or a phrase.
    // Question 1 difficultyScore MUST equal 1 (or <= 2 only under C7 relaxation when 0 simple single words exist).
    if (
      q1.qType === 'english_to_kannada' ||
      q1.qType === 'fill_blank' ||
      isPhraseWord(q1.word)
    ) {
      errors.push(
        `[PART_C_7] Q1 (${q1.wordId}) must never start with english_to_kannada, fill_blank, or a phrase (got qType="${q1.qType}", partOfSpeech="${q1.word.partOfSpeech}")`
      );
    }
    if (simpleSingleCount >= 1 && q1.difficultyScore !== 1) {
      errors.push(
        `[PART_C_1] Q1 (${q1.wordId}) difficultyScore MUST equal 1, got ${q1.difficultyScore}`
      );
    } else if (simpleSingleCount === 0 && q1.difficultyScore > 2) {
      errors.push(
        `[PART_C_1_C7] Q1 (${q1.wordId}) relaxed difficultyScore MUST be <= 2, got ${q1.difficultyScore}`
      );
    }

    // PART C Constraint 2: Question 2 difficultyScore MUST be <= 2
    if (n >= 2) {
      const q2 = exercise.questions[1];
      if (q2.difficultyScore > 2) {
        errors.push(
          `[PART_C_2] Q2 (${q2.wordId}) difficultyScore MUST be <= 2, got ${q2.difficultyScore}`
        );
      }
    }

    // PART C Constraint 3: No english_to_kannada or fill_blank in the first half (positions 1 to ceil(n/2))
    const firstHalfEnd = Math.ceil(n / 2);
    for (let i = 0; i < firstHalfEnd; i++) {
      const q = exercise.questions[i];
      if (q.qType === 'english_to_kannada' || q.qType === 'fill_blank') {
        errors.push(
          `[PART_C_3] Q${i + 1} (${q.wordId}) in first half (1..${firstHalfEnd}) cannot be "${q.qType}"`
        );
      }
    }

    // PART C Constraint 4: No phrase-type word (partOfSpeech 'phrase' or 3+ words) before position n-1 (last two positions only)
    for (let i = 0; i < n - 2; i++) {
      const q = exercise.questions[i];
      if (isPhraseWord(q.word)) {
        errors.push(
          `[PART_C_4] Q${i + 1} (${q.wordId}) is a phrase-type word at position ${i + 1}, before position ${n - 1}`
        );
      }
    }

    // PART C Constraint 5: difficultyScore sequence must be non-decreasing across the exercise
    for (let i = 1; i < n; i++) {
      const prev = exercise.questions[i - 1];
      const curr = exercise.questions[i];
      const expectedPrevScore = getDifficultyScore(prev.word, prev.qType);
      const expectedCurrScore = getDifficultyScore(curr.word, curr.qType);
      if (curr.difficultyScore !== expectedCurrScore) {
        errors.push(
          `[PART_C_5] Q${i + 1} (${curr.wordId}) difficultyScore (${curr.difficultyScore}) !== computed score (${expectedCurrScore})`
        );
      }
      if (prev.difficultyScore !== expectedPrevScore) {
        errors.push(
          `[PART_C_5] Q${i} (${prev.wordId}) difficultyScore (${prev.difficultyScore}) !== computed score (${expectedPrevScore})`
        );
      }
      if (curr.difficultyScore < prev.difficultyScore) {
        errors.push(
          `[PART_C_5] difficultyScore decreased from Q${i} (${prev.difficultyScore}) to Q${i + 1} (${curr.difficultyScore})`
        );
      }
    }
  }

  if (errors.length > 0) {
    const message = `Exercise validation failed for lesson "${exercise.lessonId}" (attempt ${exercise.attemptNumber}):\n${errors.join('\n')}`;
    const isDev =
      typeof import.meta !== 'undefined' &&
      Boolean((import.meta as { env?: { DEV?: boolean } }).env?.DEV);
    if (isDev) {
      throw new Error(message);
    } else {
      console.error(message);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
