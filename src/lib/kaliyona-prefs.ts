export interface KaliyonaPrefs {
  voice: boolean;
  reminder: boolean;
  tips: boolean;
}

export const DEFAULT_KALIYONA_PREFS: KaliyonaPrefs = {
  voice: true,
  reminder: false,
  tips: true,
};

export function getKaliyonaPrefs(): KaliyonaPrefs {
  if (typeof window === 'undefined') return DEFAULT_KALIYONA_PREFS;
  try {
    const raw = localStorage.getItem('kaliyona_prefs');
    if (!raw) return DEFAULT_KALIYONA_PREFS;
    const parsed = JSON.parse(raw);
    return {
      voice: typeof parsed.voice === 'boolean' ? parsed.voice : DEFAULT_KALIYONA_PREFS.voice,
      reminder:
        typeof parsed.reminder === 'boolean'
          ? parsed.reminder
          : DEFAULT_KALIYONA_PREFS.reminder,
      tips: typeof parsed.tips === 'boolean' ? parsed.tips : DEFAULT_KALIYONA_PREFS.tips,
    };
  } catch {
    return DEFAULT_KALIYONA_PREFS;
  }
}

export function setKaliyonaPrefs(prefs: KaliyonaPrefs): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('kaliyona_prefs', JSON.stringify(prefs));
  } catch {
    // Ignore quota or private-browsing errors
  }
}
