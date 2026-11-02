// Streak = consecutive days with at least one real practice activity.

export interface DaySlot {
  iso: string;
  label: string; // e.g. 'Jul 23'
  state: 'active' | 'missed' | 'today-active' | 'today-pending' | 'future';
}

export interface StreakInfo {
  streak: number;
  activeToday: boolean;
  slots: DaySlot[];
}

const KEY = 'kaliyona_streak_v1';
const EVT = 'kaliyona:streak';

function localISO(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function load(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '{"days":[]}');
    return Array.isArray(raw.days) ? raw.days.filter((x: unknown) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

/** Record practice activity for today (idempotent). Notifies listeners. */
export function markActiveToday(): void {
  if (typeof window === 'undefined') return;
  const days = load();
  const today = localISO(new Date());
  if (!days.includes(today)) {
    try { localStorage.setItem(KEY, JSON.stringify({ days: [...days, today] })); } catch {}
  }
  window.dispatchEvent(new Event(EVT));
}

/** Subscribe to streak changes (same-tab). Returns unsubscribe. */
export function onStreakChange(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(EVT, cb);
  return () => window.removeEventListener(EVT, cb);
}

export function getStreakInfo(): StreakInfo {
  const days = new Set(load());
  const today = new Date();
  const activeToday = days.has(localISO(today));

  // walk backwards from today (or yesterday if today not yet active)
  let streak = 0;
  const cursor = new Date(today);
  if (!activeToday) cursor.setDate(cursor.getDate() - 1);
  while (days.has(localISO(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  // strip: 4 past days + today + tomorrow
  const slots: DaySlot[] = [];
  for (let off = -4; off <= 1; off++) {
    const d = new Date(today);
    d.setDate(d.getDate() + off);
    const iso = localISO(d);
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    let state: DaySlot['state'];
    if (off === 0) state = days.has(iso) ? 'today-active' : 'today-pending';
    else if (off > 0) state = 'future';
    else state = days.has(iso) ? 'active' : 'missed';
    slots.push({ iso, label, state });
  }

  return { streak, activeToday, slots };
}

export interface StreakStats {
  totalActiveDays: number;
  bestStreak: number;
  activeLast7: number; // 0–7, includes today
}

export function getStreakStats(): StreakStats {
  const days = load().sort();
  const totalActiveDays = days.length;

  // longest run of consecutive days
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const iso of days) {
    if (prev) {
      const diff =
        (new Date(iso + 'T00:00:00').getTime() -
          new Date(prev + 'T00:00:00').getTime()) / 86400000;
      run = diff === 1 ? run + 1 : 1;
    } else {
      run = 1;
    }
    if (run > best) best = run;
    prev = iso;
  }

  // active days within the last 7 calendar days (today included)
  const set = new Set(days);
  let activeLast7 = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    if (set.has(localISO(d))) activeLast7++;
  }

  return { totalActiveDays, bestStreak: best, activeLast7 };
}
