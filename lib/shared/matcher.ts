/**
 * Shared text normalization, Levenshtein distance, and fuzzy similarity utilities
 * used by both Roleplay speech evaluation and City Reader OCR lexicon matching.
 */

const ZERO_WIDTH_REGEX = /[\u200B-\u200D\uFEFF]/g;
const PUNCTUATION_REGEX = /[.,?!;:"'’“”\-_/\\()[\]{}|+*=<>~`@#$%^&₹•·|]/g;

/**
 * Normalizes a string (Kannada or Latin):
 * - NFC Unicode normalization
 * - Lowercases Latin characters
 * - Strips zero-width joiners/non-joiners and punctuation
 * - Collapses whitespace
 */
export function normalize(raw: string): string {
  if (!raw) return '';
  return raw
    .normalize('NFC')
    .toLowerCase()
    .replace(ZERO_WIDTH_REGEX, '')
    .replace(PUNCTUATION_REGEX, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalizes Latin/transliterated text by stripping combining accents/diacritics
 * in addition to standard normalization.
 */
export function normalizeLatin(raw: string): string {
  if (!raw) return '';
  return raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(ZERO_WIDTH_REGEX, '')
    .replace(PUNCTUATION_REGEX, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Standard Levenshtein edit distance between two strings.
 */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array<number>(n + 1).fill(0)
  );

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    const ca = a[i - 1];
    for (let j = 1; j <= n; j++) {
      const cost = ca === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }

  return dp[m][n];
}

/**
 * Computes normalized Levenshtein similarity in [0, 1].
 */
export function similarity(a: string, b: string): number {
  if (a === b) return a.length > 0 ? 1 : 0;
  if (!a || !b) return 0;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  const dist = levenshtein(a, b);
  return Math.max(0, 1 - dist / maxLen);
}
