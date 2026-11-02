/**
 * Pure, deterministic 32-bit string hash (FNV-1a + avalanche finalizer)
 * and Mulberry32 PRNG. Zero Math.random() calls.
 */

export function hash32(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  // MurmurHash3 32-bit finalizer for full bit avalanche
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next(): number {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function deterministicShuffle<T>(
  items: readonly T[],
  rng: () => number
): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const r = rng();
    const clamped = r >= 1 ? 0.999999999 : r < 0 ? 0 : r;
    const j = Math.floor(clamped * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy;
}

export function deterministicSample<T>(
  items: readonly T[],
  count: number,
  rng: () => number
): T[] {
  if (count <= 0 || items.length === 0) return [];
  const shuffled = deterministicShuffle(items, rng);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}
