import { useSyncExternalStore } from 'react';

export const WALLET_KEY = 'kaliyona.wallet.v1';
export const WALLET_STORAGE_KEY = WALLET_KEY;
export const WALLET_MAX_ITEMS = 200;

export type WalletSource = 'reader' | 'roleplay';

export interface SavedItem {
  id: string;
  kn: string;
  translit: string;
  en: string;
  source: WalletSource;
  savedAt: string;
}

export interface SaveItemInput {
  id?: string;
  kn: string;
  translit?: string;
  en?: string;
  source?: WalletSource;
  savedAt?: string;
}

function normalizeKnKey(kn: string): string {
  return (kn || '').normalize('NFC').trim();
}

const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // Ignore individual subscriber errors
    }
  });
}

let cachedRaw: string | null | undefined = undefined;
let cachedSnapshot: SavedItem[] = [];
const SERVER_SNAPSHOT: SavedItem[] = [];

function normalizeRawItem(rawItem: unknown, fallbackIndex = 0): SavedItem | null {
  if (!rawItem || typeof rawItem !== 'object') return null;
  const obj = rawItem as Record<string, unknown>;
  const rawKn =
    typeof obj.kn === 'string'
      ? obj.kn
      : typeof obj.kannada === 'string'
      ? obj.kannada
      : '';
  const kn = normalizeKnKey(rawKn);
  if (!kn) return null;

  const rawTranslit =
    typeof obj.translit === 'string'
      ? obj.translit
      : typeof obj.kanglish === 'string'
      ? obj.kanglish
      : '';
  const rawEn =
    typeof obj.en === 'string'
      ? obj.en
      : typeof obj.english === 'string'
      ? obj.english
      : typeof obj.meaning === 'string'
      ? obj.meaning
      : '';

  const id =
    typeof obj.id === 'string' && obj.id.trim().length > 0
      ? obj.id.trim()
      : `w-${Date.now()}-${fallbackIndex}-${Math.random().toString(36).slice(2, 6)}`;

  const source: WalletSource =
    obj.source === 'roleplay' ? 'roleplay' : 'reader';

  const savedAt =
    typeof obj.savedAt === 'string' && obj.savedAt.trim().length > 0
      ? obj.savedAt
      : new Date().toISOString();

  return {
    id,
    kn,
    translit: rawTranslit.trim() || kn,
    en: rawEn.trim(),
    source,
    savedAt,
  };
}

export function getSnapshot(): SavedItem[] {
  if (typeof window === 'undefined') return SERVER_SNAPSHOT;
  try {
    const raw = window.localStorage.getItem(WALLET_KEY);
    if (raw === cachedRaw) {
      return cachedSnapshot;
    }
    cachedRaw = raw;
    if (!raw) {
      cachedSnapshot = [];
      return cachedSnapshot;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      cachedSnapshot = [];
      return cachedSnapshot;
    }
    const normalized: SavedItem[] = [];
    const seenKn = new Set<string>();
    for (let i = 0; i < parsed.length; i++) {
      const item = normalizeRawItem(parsed[i], i);
      if (item && !seenKn.has(item.kn)) {
        seenKn.add(item.kn);
        normalized.push(item);
      }
    }
    normalized.sort((a, b) =>
      b.savedAt > a.savedAt ? 1 : b.savedAt < a.savedAt ? -1 : 0
    );
    cachedSnapshot = normalized.slice(0, WALLET_MAX_ITEMS);
    return cachedSnapshot;
  } catch {
    return cachedSnapshot;
  }
}

function persistSnapshot(items: SavedItem[]): void {
  const capped = [...items]
    .sort((a, b) => (b.savedAt > a.savedAt ? 1 : b.savedAt < a.savedAt ? -1 : 0))
    .slice(0, WALLET_MAX_ITEMS);

  const serialized = JSON.stringify(capped);
  cachedRaw = serialized;
  cachedSnapshot = capped;

  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(WALLET_KEY, serialized);
    } catch {
      // Ignore storage quota errors in restricted frames
    }
  }
  notify();
}

export function listSaved(): SavedItem[] {
  return getSnapshot();
}

export function isSaved(kn: string): boolean {
  const target = normalizeKnKey(kn);
  if (!target) return false;
  return getSnapshot().some((item) => normalizeKnKey(item.kn) === target);
}

export function saveItem(input: SaveItemInput): SavedItem {
  const normKn = normalizeKnKey(input.kn);
  const nowIso = new Date().toISOString();
  const current = getSnapshot();

  const existingIdx = current.findIndex(
    (item) => normalizeKnKey(item.kn) === normKn
  );

  if (existingIdx !== -1) {
    const existing = current[existingIdx];
    const updated: SavedItem = {
      ...existing,
      kn: normKn,
      translit: (input.translit ?? '').trim() || existing.translit || normKn,
      en: (input.en ?? '').trim() || existing.en,
      source: input.source || existing.source || 'reader',
      savedAt: nowIso,
    };
    const next = [
      updated,
      ...current.slice(0, existingIdx),
      ...current.slice(existingIdx + 1),
    ].slice(0, WALLET_MAX_ITEMS);
    persistSnapshot(next);
    return updated;
  }

  const created: SavedItem = {
    id:
      input.id && input.id.trim().length > 0
        ? input.id.trim()
        : `w-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    kn: normKn,
    translit: (input.translit ?? '').trim() || normKn,
    en: (input.en ?? '').trim(),
    source: input.source === 'roleplay' ? 'roleplay' : 'reader',
    savedAt: nowIso,
  };

  const next = [created, ...current].slice(0, WALLET_MAX_ITEMS);
  persistSnapshot(next);
  return created;
}

export function removeItem(id: string): SavedItem | null {
  const current = getSnapshot();
  const target = current.find(
    (item) => item.id === id || normalizeKnKey(item.kn) === normalizeKnKey(id)
  ) ?? null;
  const next = current.filter(
    (item) => item.id !== id && normalizeKnKey(item.kn) !== normalizeKnKey(id)
  );
  persistSnapshot(next);
  return target;
}

export function restoreItem(item: SavedItem): void {
  const normalized = normalizeRawItem(item);
  if (!normalized) return;
  const current = getSnapshot();
  const filtered = current.filter(
    (existing) =>
      existing.id !== normalized.id &&
      normalizeKnKey(existing.kn) !== normalizeKnKey(normalized.kn)
  );
  const next = [normalized, ...filtered].slice(0, WALLET_MAX_ITEMS);
  persistSnapshot(next);
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);

  const handleStorage = (e: StorageEvent) => {
    if (!e.key || e.key === WALLET_KEY) {
      cachedRaw = undefined;
      listener();
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', handleStorage);
  }

  return () => {
    listeners.delete(listener);
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', handleStorage);
    }
  };
}

export function useWallet() {
  const items = useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => SERVER_SNAPSHOT
  );

  return {
    items,
    count: items.length,
    maxItems: WALLET_MAX_ITEMS,
    saveItem,
    removeItem,
    restoreItem,
    isSaved: (kn: string) => {
      const target = normalizeKnKey(kn);
      if (!target) return false;
      return items.some((i) => normalizeKnKey(i.kn) === target);
    },
  };
}
