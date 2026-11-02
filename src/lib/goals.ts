export type GoalType = 'goal' | 'note' | 'reminder';

export interface Goal {
  id: string;
  type: GoalType;
  title: string;
  scenarioId?: string; // links to data/scenarios.ts ids
  dueISO?: string; // e.g. '2026-10-27'
  remind: boolean;
  done: boolean;
  createdAt: number;
  doneAt?: number;
}

const KEY = 'kaliyona_goals';

export function loadGoals(): Goal[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveGoals(list: Goal[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // Ignore storage issues
  }
}

export function makeId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return String(Date.now()) + '-' + Math.random().toString(36).slice(2, 9);
}

export function startOfDay(d: Date): Date {
  const next = new Date(d);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function diffDays(dueISO: string): number {
  return Math.round(
    (startOfDay(new Date(dueISO + 'T00:00:00')).getTime() -
      startOfDay(new Date()).getTime()) /
      86400000
  );
}

export function dueLabel(
  goal: Goal
): { text: string; tone: 'overdue' | 'today' | 'soon' | 'later' } | null {
  if (!goal.dueISO) return null;
  const d = diffDays(goal.dueISO);
  if (d < 0) return { text: 'Overdue', tone: 'overdue' };
  if (d === 0) return { text: 'Today', tone: 'today' };
  if (d === 1) return { text: 'Tomorrow', tone: 'soon' };
  if (d <= 7) return { text: `In ${d} days`, tone: 'soon' };

  try {
    const [y, m, day] = goal.dueISO.split('-').map(Number);
    const dateObj = new Date(y, m - 1, day);
    const dayNum = dateObj.getDate();
    const monthStr = dateObj.toLocaleString('en-US', { month: 'short' });
    return { text: `${dayNum} ${monthStr}`, tone: 'later' };
  } catch {
    return { text: goal.dueISO, tone: 'later' };
  }
}

export function isDue(goal: Goal): boolean {
  return Boolean(goal.remind && !goal.done && goal.dueISO && diffDays(goal.dueISO) <= 0);
}
