export const QUIZ_HISTORY_KEY = 'kaliyona.quizHistory.v1';
export const QUIZ_HISTORY_CAP = 60;

export interface QuestionLike {
  id?: string;
  type?: string;
  prompt?: string;
  kannada?: string;
  translit?: string;
  meaning?: string;
  word?: string;
  direction?: string;
  pairs?: ReadonlyArray<{
    kannada?: string;
    translit?: string;
    meaning?: string;
  }>;
}

export interface OptionLike {
  kannada: string;
  translit: string;
  meaning: string;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}

let memoryHistoryFallback: string[] = [];

/**
 * Seeded PRNG (Mulberry32) returning numbers in [0, 1).
 * Use mulberry32(Date.now()) in production or a fixed seed in tests.
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next(): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Canonical string normalization:
 * NFC normalization -> trim -> collapse internal whitespace -> lowercase.
 * Visually identical Kannada strings (e.g. "ಟೀ" vs "ಟೀ ") normalize to the exact same key.
 */
export function normalizeForKey(value: string | undefined | null): string {
  return (value ?? '')
    .normalize('NFC')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

/**
 * Pure Fisher-Yates shuffle returning a new array without mutating the input.
 */
export function fisherYatesShuffle<T>(
  arr: readonly T[],
  rng: () => number = mulberry32(Date.now())
): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const raw = rng();
    const clamped = raw >= 1 ? 0.999999999 : raw < 0 ? 0 : raw;
    const j = Math.floor(clamped * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy;
}

/**
 * Sampling without replacement:
 * 1. Dedupes `pool` by normalized `key(item)` FIRST (preserving first occurrence).
 * 2. Shuffles the deduplicated pool via `fisherYatesShuffle`.
 * 3. Returns `min(count, dedupedPool.length)` items.
 * NEVER returns two items with the same key, and NEVER pads with repeats when pool < count.
 */
export function sampleUnique<T>(
  pool: readonly T[],
  count: number,
  key: (t: T) => string,
  rng: () => number = mulberry32(Date.now())
): T[] {
  if (count <= 0 || !pool || pool.length === 0) {
    return [];
  }

  const seenKeys = new Set<string>();
  const deduped: T[] = [];

  for (let i = 0; i < pool.length; i++) {
    const item = pool[i];
    const k = normalizeForKey(key(item));
    if (!seenKeys.has(k)) {
      seenKeys.add(k);
      deduped.push(item);
    }
  }

  const shuffled = fisherYatesShuffle(deduped, rng);
  const limit = Math.min(count, shuffled.length);
  return shuffled.slice(0, limit);
}

/**
 * Computes the canonical question direction from its type or explicit direction.
 */
export function getQuestionDirection(q: QuestionLike): string {
  if (q.direction) return normalizeForKey(q.direction);
  const t = normalizeForKey(q.type || 'mcq');
  switch (t) {
    case 'mcq':
      return 'kn->en';
    case 'reverse_mcq':
      return 'en->kn';
    case 'listen':
      return 'audio->en';
    case 'speak':
      return 'speak->kn';
    case 'translate_bank':
      return 'bank->kn';
    case 'match':
      return 'match';
    default:
      return t;
  }
}

/**
 * Extracts the normalized underlying word/phrase/sentence stem for a question.
 */
export function getQuestionWordStem(q: QuestionLike): string {
  if (normalizeForKey(q.type) === 'match' && q.pairs && q.pairs.length > 0) {
    return q.pairs
      .map((p) => normalizeForKey(p.translit || p.kannada || p.meaning))
      .filter(Boolean)
      .sort()
      .join('|');
  }
  const stem = normalizeForKey(q.translit || q.kannada || q.word || '');
  if (stem) return stem;
  return normalizeForKey(q.prompt || '');
}

/**
 * Canonical dedupe key for a question (`${type}:${normalize(prompt/stem)}`).
 * - Word/phrase/sentence questions include question type + direction (kn->en vs en->kn) + normalized word/sentence stem.
 * - Match questions include sorted normalized pair keys.
 * - Generic prompt-only questions use `${type}:${normalize(prompt)}`.
 */
export function canonicalQuestionKey(q: QuestionLike): string {
  const type = normalizeForKey(q.type || 'mcq');
  if (type === 'match' && q.pairs && q.pairs.length > 0) {
    const pairSig = q.pairs
      .map((p) => normalizeForKey(p.translit || p.kannada || p.meaning))
      .filter(Boolean)
      .sort()
      .join('|');
    return `match:${pairSig || normalizeCanonicalTextOrPrompt(q)}`;
  }

  const direction = getQuestionDirection(q);
  const stem = normalizeForKey(q.translit || q.kannada || q.word || '');
  if (stem) {
    return `${type}:${direction}:${stem}`;
  }
  return `${type}:${normalizeCanonicalTextOrPrompt(q)}`;
}

function normalizeCanonicalTextOrPrompt(q: QuestionLike): string {
  return normalizeForKey(q.prompt || q.meaning || q.id || '');
}

/**
 * Canonical dedupe key for an MCQ option (string or ExerciseOption).
 */
export function canonicalOptionKey(opt: OptionLike | string): string {
  if (typeof opt === 'string') {
    return normalizeForKey(opt);
  }
  const kn = normalizeForKey(opt.kannada);
  const tr = normalizeForKey(opt.translit);
  const en = normalizeForKey(opt.meaning);
  return `${kn}|${tr}|${en}`;
}

function sanitizeOption(opt: OptionLike): OptionLike {
  return {
    kannada: (opt.kannada ?? '').normalize('NFC').trim().replace(/\s+/g, ' '),
    translit: (opt.translit ?? '').normalize('NFC').trim().replace(/\s+/g, ' '),
    meaning: (opt.meaning ?? '').normalize('NFC').trim().replace(/\s+/g, ' '),
  };
}

/**
 * Builds unique MCQ options for a question:
 * - Correct answer + up to `maxDistractors` (default 3) distractors chosen via `sampleUnique`.
 * - Prevents any distractor from matching the correct answer or another distractor on
 *   normalized `kannada`, normalized `translit`, OR normalized `meaning` (catching trailing spaces like "ಟೀ" vs "ಟೀ ").
 * - Falls back through `candidatePools` (lesson pool -> unit/category pool -> broad lexicon pool).
 * - If all pools combined yield fewer than 3 distractors, returns fewer options (2-3) rather than EVER duplicating.
 */
export function buildUniqueMcqOptions(
  correct: OptionLike,
  candidatePools: readonly (readonly OptionLike[])[],
  options?: {
    maxDistractors?: number;
    rng?: () => number;
    isForbiddenPair?: (a: OptionLike, b: OptionLike) => boolean;
  }
): OptionLike[] {
  const maxDistractors = options?.maxDistractors ?? 3;
  const rng = options?.rng ?? mulberry32(Date.now());
  const isForbiddenPair = options?.isForbiddenPair;

  const cleanCorrect = sanitizeOption(correct);
  const usedKn = new Set<string>();
  const usedTr = new Set<string>();
  const usedEn = new Set<string>();

  const corrKn = normalizeForKey(cleanCorrect.kannada);
  const corrTr = normalizeForKey(cleanCorrect.translit);
  const corrEn = normalizeForKey(cleanCorrect.meaning);

  if (corrKn) usedKn.add(corrKn);
  if (corrTr) usedTr.add(corrTr);
  if (corrEn) usedEn.add(corrEn);

  const chosenDistractors: OptionLike[] = [];

  for (let tierIdx = 0; tierIdx < candidatePools.length; tierIdx++) {
    if (chosenDistractors.length >= maxDistractors) break;
    const rawTier = candidatePools[tierIdx];
    if (!rawTier || rawTier.length === 0) continue;

    // Sample unique candidates from this tier via sampleUnique
    const uniqueTier = sampleUnique(
      rawTier,
      rawTier.length,
      canonicalOptionKey,
      rng
    );

    for (let i = 0; i < uniqueTier.length; i++) {
      if (chosenDistractors.length >= maxDistractors) break;
      const cand = sanitizeOption(uniqueTier[i]);
      const cKn = normalizeForKey(cand.kannada);
      const cTr = normalizeForKey(cand.translit);
      const cEn = normalizeForKey(cand.meaning);

      if (!cKn && !cTr && !cEn) continue;
      if (
        (cKn && usedKn.has(cKn)) ||
        (cTr && usedTr.has(cTr)) ||
        (cEn && usedEn.has(cEn))
      ) {
        continue;
      }

      if (isForbiddenPair) {
        if (isForbiddenPair(cleanCorrect, cand)) continue;
        if (chosenDistractors.some((existing) => isForbiddenPair(existing, cand))) {
          continue;
        }
      }

      if (cKn) usedKn.add(cKn);
      if (cTr) usedTr.add(cTr);
      if (cEn) usedEn.add(cEn);
      chosenDistractors.push(cand);
    }
  }

  const combined = [cleanCorrect, ...chosenDistractors];
  return sampleUnique(combined, combined.length, canonicalOptionKey, rng);
}

function resolveStorage(customStorage?: StorageLike): StorageLike | null {
  if (customStorage) return customStorage;
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  return null;
}

/**
 * Reads cross-round question history from localStorage ('kaliyona.quizHistory.v1'),
 * returning at most `QUIZ_HISTORY_CAP` (60) normalized keys in FIFO order (oldest first, newest last).
 */
export function loadQuizHistory(customStorage?: StorageLike): string[] {
  const storage = resolveStorage(customStorage);
  if (!storage) {
    return [...memoryHistoryFallback];
  }

  try {
    const raw = storage.getItem(QUIZ_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const normalized: string[] = [];
    for (let i = 0; i < parsed.length; i++) {
      if (typeof parsed[i] === 'string') {
        const k = normalizeForKey(parsed[i]);
        if (k) {
          const existingIdx = normalized.indexOf(k);
          if (existingIdx !== -1) {
            normalized.splice(existingIdx, 1);
          }
          normalized.push(k);
        }
      }
    }
    return normalized.slice(-QUIZ_HISTORY_CAP);
  } catch {
    return [...memoryHistoryFallback];
  }
}

/**
 * Persists a history array to localStorage ('kaliyona.quizHistory.v1'), capped at 60 FIFO.
 */
export function saveQuizHistory(
  keys: readonly string[],
  customStorage?: StorageLike
): string[] {
  const dedupedOrder: string[] = [];
  for (let i = 0; i < keys.length; i++) {
    const k = normalizeForKey(keys[i]);
    if (!k) continue;
    const existingIdx = dedupedOrder.indexOf(k);
    if (existingIdx !== -1) {
      dedupedOrder.splice(existingIdx, 1);
    }
    dedupedOrder.push(k);
  }

  const trimmed =
    dedupedOrder.length > QUIZ_HISTORY_CAP
      ? dedupedOrder.slice(dedupedOrder.length - QUIZ_HISTORY_CAP)
      : dedupedOrder;

  memoryHistoryFallback = [...trimmed];
  const storage = resolveStorage(customStorage);
  if (storage) {
    try {
      storage.setItem(QUIZ_HISTORY_KEY, JSON.stringify(trimmed));
    } catch {
      // Ignore storage quota / sandbox restrictions
    }
  }
  return trimmed;
}

/**
 * Appends newly asked question keys to 'kaliyona.quizHistory.v1' and trims FIFO to 60 keys.
 */
export function recordQuizHistory(
  newKeys: readonly string[],
  customStorage?: StorageLike
): string[] {
  const existing = loadQuizHistory(customStorage);
  return saveQuizHistory([...existing, ...newKeys], customStorage);
}

/**
 * Clears the stored quiz history (useful for resets/tests).
 */
export function clearQuizHistory(customStorage?: StorageLike): void {
  memoryHistoryFallback = [];
  const storage = resolveStorage(customStorage);
  if (storage) {
    try {
      if (typeof storage.removeItem === 'function') {
        storage.removeItem(QUIZ_HISTORY_KEY);
      } else {
        storage.setItem(QUIZ_HISTORY_KEY, '[]');
      }
    } catch {
      // Ignore
    }
  }
}

/**
 * Samples a round of unique questions without replacement, respecting cross-round memory:
 * 1. Dedupes `pool` by `key(item)` first.
 * 2. Shrinks round size to `min(count, deduped.length)` if pool is smaller than `count` (never pads with repeats).
 * 3. Partitions deduplicated pool into `unseen` vs `recentlySeen` (based on `kaliyona.quizHistory.v1`).
 * 4. Fills from `unseen` first (shuffled with `sampleUnique`, preferring distinct word stems first when `wordStemFn` is provided).
 * 5. Falls back to `recentlySeen` ONLY when `unseen` is exhausted, taking OLDEST-seen first.
 * 6. Records the chosen keys into `kaliyona.quizHistory.v1` (FIFO cap 60).
 */
export function sampleRoundWithHistory<T>(
  pool: readonly T[],
  count: number,
  keyFn: (t: T) => string,
  options?: {
    rng?: () => number;
    wordStemFn?: (t: T) => string;
    storage?: StorageLike;
    historyOverride?: readonly string[];
    persistHistory?: boolean;
  }
): T[] {
  if (count <= 0 || !pool || pool.length === 0) {
    return [];
  }

  const rng = options?.rng ?? mulberry32(Date.now());
  const wordStemFn = options?.wordStemFn;
  const persistHistory = options?.persistHistory ?? true;

  // Step 1: Deduplicate pool by canonical key first
  const seenKeys = new Set<string>();
  const deduped: T[] = [];
  for (let i = 0; i < pool.length; i++) {
    const item = pool[i];
    const k = normalizeForKey(keyFn(item));
    if (!seenKeys.has(k)) {
      seenKeys.add(k);
      deduped.push(item);
    }
  }

  if (deduped.length === 0) {
    return [];
  }

  const targetCount = Math.min(count, deduped.length);

  // Step 2: Load history (oldest at index 0, newest at end)
  const rawHistory = options?.historyOverride
    ? options.historyOverride.map((k) => normalizeForKey(k)).filter(Boolean)
    : loadQuizHistory(options?.storage);

  const historyIndexMap = new Map<string, number>();
  for (let i = 0; i < rawHistory.length; i++) {
    historyIndexMap.set(rawHistory[i], i);
  }

  // Step 3: Partition into unseen vs recently-seen
  const unseenRaw: T[] = [];
  const recentlySeenRaw: T[] = [];

  for (let i = 0; i < deduped.length; i++) {
    const item = deduped[i];
    const k = normalizeForKey(keyFn(item));
    if (historyIndexMap.has(k)) {
      recentlySeenRaw.push(item);
    } else {
      unseenRaw.push(item);
    }
  }

  // Step 4: Shuffle unseen via sampleUnique
  const unseenShuffled = sampleUnique(
    unseenRaw,
    unseenRaw.length,
    keyFn,
    rng
  );

  // Within unseen, prefer distinct words first when wordStemFn is provided
  let unseenOrdered: T[] = unseenShuffled;
  if (wordStemFn) {
    const seenWords = new Set<string>();
    const primaryUnseen: T[] = [];
    const secondaryUnseen: T[] = [];
    for (let i = 0; i < unseenShuffled.length; i++) {
      const item = unseenShuffled[i];
      const stem = normalizeForKey(wordStemFn(item));
      if (!stem || !seenWords.has(stem)) {
        if (stem) seenWords.add(stem);
        primaryUnseen.push(item);
      } else {
        secondaryUnseen.push(item);
      }
    }
    unseenOrdered = [...primaryUnseen, ...secondaryUnseen];
  }

  // Step 5: Sort recently-seen by OLDEST-seen first (ascending history index)
  const recentlySeenOldestFirst = [...recentlySeenRaw].sort((a, b) => {
    const idxA = historyIndexMap.get(normalizeForKey(keyFn(a))) ?? 0;
    const idxB = historyIndexMap.get(normalizeForKey(keyFn(b))) ?? 0;
    return idxA - idxB;
  });

  // Step 6: Combine unseen first, then oldest-seen fallback
  const orderedCandidates = [...unseenOrdered, ...recentlySeenOldestFirst];
  const selected = orderedCandidates.slice(0, targetCount);

  // Step 7: Persist chosen keys to history (capped at 60 FIFO)
  if (persistHistory && selected.length > 0) {
    const chosenKeys = selected.map((item) => normalizeForKey(keyFn(item)));
    if (options?.historyOverride) {
      saveQuizHistory([...rawHistory, ...chosenKeys], options?.storage);
    } else {
      recordQuizHistory(chosenKeys, options?.storage);
    }
  }

  return selected;
}

/**
 * Self-contained unit test suite verifying all 6 sampler requirements:
 * a. sampleUnique: 1000 runs over pool of 10, count 5 -> zero rounds contain a duplicate key.
 * b. Pool smaller than count -> returns pool-size items, zero dupes.
 * c. Distractor builder -> never returns an option equal to the correct answer (normalized, including Kannada trailing spaces).
 * d. Cross-round: with history seeded with 8 of 10 keys, next round prefers the 2 unseen + oldest-seen, and caps at 60 FIFO.
 */
export function runSamplerSelfTests(): {
  passed: boolean;
  assertions: number;
  failures: string[];
} {
  const failures: string[] = [];
  let assertions = 0;

  // Test A: sampleUnique 1000 runs over pool of 10 (with extra duplicate entries), count 5 -> zero duplicate keys
  const poolOf10 = [
    { id: '1', k: 'namaskara' },
    { id: '2', k: 'hegiddira' },
    { id: '3', k: 'chennagidini' },
    { id: '4', k: 'dhanyavada' },
    { id: '5', k: 'kshamisi' },
    { id: '6', k: 'dayavittu' },
    { id: '7', k: 'haudu' },
    { id: '8', k: 'illa' },
    { id: '9', k: 'sari' },
    { id: '10', k: 'banni' },
    // Intentional duplicate keys with different ids/whitespace
    { id: '11', k: 'namaskara ' },
    { id: '12', k: '  DHANYAVADA' },
  ];

  const rngA = mulberry32(42);
  for (let run = 0; run < 1000; run++) {
    const picked = sampleUnique(poolOf10, 5, (x) => x.k, rngA);
    assertions++;
    if (picked.length !== 5) {
      failures.push(`Run ${run}: expected 5 items, got ${picked.length}`);
      break;
    }
    const keys = picked.map((x) => normalizeForKey(x.k));
    const uniqueKeys = new Set(keys);
    if (uniqueKeys.size !== 5) {
      failures.push(`Run ${run}: duplicate key found in [${keys.join(', ')}]`);
      break;
    }
  }

  // Test B: Pool smaller than count -> returns pool-size items, zero dupes
  const smallPool = [
    { id: 'a', prompt: 'ನಮಸ್ಕಾರ' },
    { id: 'b', prompt: 'ನಮಸ್ಕಾರ ' }, // duplicate after normalization
    { id: 'c', prompt: 'ಧನ್ಯವಾದ' },
    { id: 'd', prompt: 'ಸರಿ' },
  ];
  const smallResult = sampleUnique(
    smallPool,
    10,
    (x) => x.prompt,
    mulberry32(99)
  );
  assertions++;
  if (smallResult.length !== 3) {
    failures.push(
      `Small pool test: expected 3 unique items from pool of 3 distinct, got ${smallResult.length}`
    );
  }
  const smallKeys = new Set(smallResult.map((x) => normalizeForKey(x.prompt)));
  assertions++;
  if (smallKeys.size !== 3) {
    failures.push('Small pool test: returned duplicate items');
  }

  // Test C: Distractor builder -> never returns an option equal to the correct answer (normalized)
  const correctOpt: OptionLike = {
    kannada: 'ಟೀ',
    translit: 'tea',
    meaning: 'Tea',
  };
  const distractorCandidates: OptionLike[] = [
    { kannada: 'ಟೀ ', translit: 'tea ', meaning: 'Tea' }, // visually identical trailing space
    { kannada: 'ಟೀ', translit: 'chaa', meaning: 'Hot Tea' }, // same Kannada glyph
    { kannada: 'ಚಾ', translit: 'tea', meaning: 'Chai' }, // same translit
    { kannada: 'ಕಾಫಿ', translit: 'kaapi', meaning: 'Tea' }, // same English meaning
    { kannada: 'ಕಾಫಿ', translit: 'kaapi', meaning: 'Coffee' }, // valid distractor 1
    { kannada: 'ಹಾಲು', translit: 'haalu', meaning: 'Milk' }, // valid distractor 2
    { kannada: 'ನೀರು', translit: 'neeru', meaning: 'Water' }, // valid distractor 3
    { kannada: 'ನೀರು ', translit: 'neeru', meaning: 'Water' }, // duplicate of valid distractor 3
  ];

  for (let i = 0; i < 100; i++) {
    const builtOptions = buildUniqueMcqOptions(
      correctOpt,
      [distractorCandidates],
      { rng: mulberry32(1000 + i) }
    );
    assertions++;
    if (builtOptions.length !== 4) {
      failures.push(
        `Distractor builder run ${i}: expected 4 options, got ${builtOptions.length}`
      );
      break;
    }
    const knSet = new Set(builtOptions.map((o) => normalizeForKey(o.kannada)));
    const trSet = new Set(builtOptions.map((o) => normalizeForKey(o.translit)));
    const enSet = new Set(builtOptions.map((o) => normalizeForKey(o.meaning)));
    if (knSet.size !== 4 || trSet.size !== 4 || enSet.size !== 4) {
      failures.push(
        `Distractor builder run ${i}: duplicate option text detected`
      );
      break;
    }
  }

  // Also verify small distractor pool (< 3 distractors available) renders 2-3 options without duplicating
  const tinyDistractorPool: OptionLike[] = [
    { kannada: 'ಟೀ ', translit: 'tea', meaning: 'Tea' }, // dupe of correct
    { kannada: 'ಕಾಫಿ', translit: 'kaapi', meaning: 'Coffee' }, // only 1 valid distractor
  ];
  const shortOptions = buildUniqueMcqOptions(correctOpt, [tinyDistractorPool], {
    rng: mulberry32(7),
  });
  assertions++;
  if (shortOptions.length !== 2) {
    failures.push(
      `Short distractor pool: expected 2 options without dupes, got ${shortOptions.length}`
    );
  }

  // Test D: Cross-round memory with history seeded with 8 of 10 keys -> prefers 2 unseen + oldest-seen
  const storeMap = new Map<string, string>();
  const mockStorage: StorageLike = {
    getItem: (k) => (storeMap.has(k) ? storeMap.get(k)! : null),
    setItem: (k, v) => {
      storeMap.set(k, v);
    },
    removeItem: (k) => {
      storeMap.delete(k);
    },
  };

  const tenQuestions = Array.from({ length: 10 }, (_, idx) => ({
    id: `q${idx + 1}`,
    type: 'mcq',
    translit: `word_${idx + 1}`,
    prompt: `Meaning of word_${idx + 1}`,
  }));

  // Seed history with first 8 keys (q1 is oldest, q8 is newest; q9 and q10 are unseen)
  const seeded8Keys = tenQuestions.slice(0, 8).map(canonicalQuestionKey);
  saveQuizHistory(seeded8Keys, mockStorage);

  const nextRound5 = sampleRoundWithHistory(
    tenQuestions,
    5,
    canonicalQuestionKey,
    {
      rng: mulberry32(123),
      storage: mockStorage,
    }
  );
  assertions++;
  if (nextRound5.length !== 5) {
    failures.push(
      `Cross-round test: expected 5 questions, got ${nextRound5.length}`
    );
  }

  const pickedIds = nextRound5.map((q) => q.id);
  const unseenPicked = pickedIds.slice(0, 2);
  const oldestSeenPicked = pickedIds.slice(2, 5);
  assertions++;
  if (!unseenPicked.includes('q9') || !unseenPicked.includes('q10')) {
    failures.push(
      `Cross-round test: expected first 2 picks to be unseen [q9, q10], got [${unseenPicked.join(', ')}]`
    );
  }
  assertions++;
  if (
    oldestSeenPicked[0] !== 'q1' ||
    oldestSeenPicked[1] !== 'q2' ||
    oldestSeenPicked[2] !== 'q3'
  ) {
    failures.push(
      `Cross-round test: expected fallback picks to be oldest-seen [q1, q2, q3], got [${oldestSeenPicked.join(', ')}]`
    );
  }

  // Verify 60-key FIFO cap
  const seventyKeys = Array.from({ length: 70 }, (_, idx) => `mcq:kn->en:w${idx + 1}`);
  const capped = saveQuizHistory(seventyKeys, mockStorage);
  assertions++;
  if (
    capped.length !== QUIZ_HISTORY_CAP ||
    capped[0] !== 'mcq:kn->en:w11' ||
    capped[capped.length - 1] !== 'mcq:kn->en:w70'
  ) {
    failures.push(
      `History cap test: expected 60 keys starting at w11, got length=${capped.length}, first=${capped[0]}`
    );
  }

  return {
    passed: failures.length === 0,
    assertions,
    failures,
  };
}
