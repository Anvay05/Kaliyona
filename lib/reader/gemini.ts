import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import type { LexiconEntry } from './lexicon';
import { STRINGS } from '@/lib/i18n';

const DAILY_CAP_STORAGE_KEY = 'kaliyona_reader_daily_scans_v1';
export const DAILY_SCAN_LIMIT = 100;
export const GEMINI_VISION_MODEL = 'gemini-3.8-flash';
const REQUEST_TIMEOUT_MS = 45_000;
const RETRY_BACKOFF_MS = 1_200;
const MAX_IMAGE_DIMENSION = 1152;
const JPEG_QUALITY = 0.85;

export const GEMINI_READER_PROMPT = `You are analyzing an image containing Kannada script (street signs, menus, bus boards, posters, news cards, social media graphics, memes, screenshots, or labels). Find EVERY visible Kannada word, phrase, headline, bus destination, or caption line anywhere in the image. For each item return:
- kn: the Kannada text exactly as written
- translit: simple Latin transliteration
- en: clear, concise English translation (2-8 words)
- box: bounding box as [ymin, xmin, ymax, xmax], integers 0-1000, normalized relative to the image.
Rules:
1. Include ALL Kannada text visible in banners, headlines, vehicle windshields, boards, menus, and bottom captions/paragraphs. Do NOT skip stylized or colored banner text.
2. For multi-line headlines or paragraphs, split them into individual visual lines or meaningful phrases so each line gets its own accurate bounding box.
3. Group multi-word dish names or place names on the same line into ONE entry (e.g. ಮಸಾಲೆ ದೋಸೆ = one entry, ಬಸ್ ಸ್ಟ್ಯಾಂಡ್ = one entry).
4. Max 40 entries. Return ONLY a JSON array.`;

export interface GeminiDetectedOverlayItem {
  id: string;
  kn: string;
  translit: string;
  en: string;
  box: [number, number, number, number]; // [ymin, xmin, ymax, xmax] in 0..1000
  xPct: number;
  yPct: number;
  wPct: number;
  hPct: number;
  entry: LexiconEntry;
}

export type GeminiReaderErrorKind =
  | 'missing_key'
  | 'offline'
  | 'daily_cap'
  | 'rate_limit'
  | 'timeout'
  | 'aborted'
  | 'network';

export class GeminiReaderError extends Error {
  public readonly kind: GeminiReaderErrorKind;

  constructor(kind: GeminiReaderErrorKind, message: string) {
    super(message);
    this.name = 'GeminiReaderError';
    this.kind = kind;
  }
}

function isPlaceholderKey(val?: unknown): boolean {
  if (typeof val !== 'string') return true;
  const trimmed = val.trim();
  return (
    !trimmed ||
    trimmed === 'MY_GEMINI_API_KEY' ||
    trimmed === 'YOUR_DEMO_API_KEY_HERE' ||
    trimmed === 'PASTE_KEY_HERE' ||
    trimmed === '<key>' ||
    trimmed === 'YOUR_API_KEY'
  );
}

function getStoredGeminiKeyFromBrowser(): string {
  if (typeof window === 'undefined' || !window.localStorage) return '';
  try {
    const directCandidates = [
      window.localStorage.getItem('gemini_api_key'),
      window.localStorage.getItem('VITE_GEMINI_API_KEY'),
      window.localStorage.getItem('GEMINI_API_KEY'),
    ];
    for (const candidate of directCandidates) {
      if (candidate && !isPlaceholderKey(candidate)) {
        return candidate.trim();
      }
    }
    // Also support a Google AI Studio key (starts with AIza) if user pasted it in Anna's Brain settings
    const annaKey = (window.localStorage.getItem('anna_api_key') || '').trim();
    if (annaKey.startsWith('AIza') && !isPlaceholderKey(annaKey)) {
      return annaKey;
    }
  } catch {
    // Ignore storage read errors
  }
  return '';
}

export function getConfiguredApiKey(): string {
  const storedBrowserKey = getStoredGeminiKeyFromBrowser();
  if (storedBrowserKey) return storedBrowserKey;

  const metaEnv =
    typeof import.meta !== 'undefined' && import.meta.env
      ? (import.meta.env as Record<string, unknown>)
      : {};
  const procEnv =
    typeof process !== 'undefined' && process.env
      ? (process.env as Record<string, unknown>)
      : {};

  const candidates = [
    metaEnv.VITE_GEMINI_API_KEY,
    metaEnv.GEMINI_API_KEY,
    procEnv.GEMINI_API_KEY,
    procEnv.VITE_GEMINI_API_KEY,
    procEnv.GOOGLE_API_KEY,
    procEnv.API_KEY,
  ];

  for (const raw of candidates) {
    if (typeof raw === 'string' && !isPlaceholderKey(raw)) {
      return raw.trim();
    }
  }
  return '';
}

/**
 * Instant, ping-free check whether Gemini Vision is available.
 * Returns true when online so either VITE_GEMINI_API_KEY, process.env.GEMINI_API_KEY,
 * or the server-side GEMINI_API_KEY proxy can fulfill the request without false-negative key errors.
 */
export function hasGeminiApiKey(): boolean {
  if (getConfiguredApiKey().length > 0) return true;
  // Server proxy (/api/reader/scan) also resolves GEMINI_API_KEY / .env.local at runtime
  return typeof window !== 'undefined';
}

function getTodayDateKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getDailyScanCount(): number {
  if (typeof window === 'undefined' || !window.localStorage) return 0;
  try {
    const raw = window.localStorage.getItem(DAILY_CAP_STORAGE_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as { date?: unknown; count?: unknown };
    if (
      parsed &&
      parsed.date === getTodayDateKey() &&
      typeof parsed.count === 'number' &&
      Number.isFinite(parsed.count)
    ) {
      return Math.max(0, Math.floor(parsed.count));
    }
    return 0;
  } catch {
    return 0;
  }
}

export function isDailyScanCapReached(): boolean {
  return getDailyScanCount() >= DAILY_SCAN_LIMIT;
}

function incrementDailyScanCount(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const nextCount = getDailyScanCount() + 1;
    window.localStorage.setItem(
      DAILY_CAP_STORAGE_KEY,
      JSON.stringify({
        date: getTodayDateKey(),
        count: nextCount,
      })
    );
  } catch {
    // Ignore storage quota errors
  }
}

export interface CompressedImagePayload {
  base64Data: string;
  dataUrl: string;
  width: number;
  height: number;
}

function loadImageElement(source: File | Blob | string): Promise<{
  img: HTMLImageElement;
  revokeUrl?: string;
}> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    let objectUrl: string | undefined;

    img.onload = () => {
      resolve({ img, revokeUrl: objectUrl });
    };
    img.onerror = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      reject(new GeminiReaderError('network', 'Image load failed'));
    };

    if (typeof source === 'string') {
      img.src = source;
    } else {
      objectUrl = URL.createObjectURL(source);
      img.src = objectUrl;
    }
  });
}

/**
 * Downscales an image to max 1152px longest side and encodes as JPEG 0.85 quality.
 * Fills white backdrop first so transparent PNG screenshots never turn black.
 */
export async function compressImageForGemini(
  source: File | Blob | string,
  onProgress?: (pct: number) => void
): Promise<CompressedImagePayload> {
  onProgress?.(8);
  const { img, revokeUrl } = await loadImageElement(source);

  try {
    onProgress?.(18);
    const naturalW = Math.max(1, img.naturalWidth || img.width || 1);
    const naturalH = Math.max(1, img.naturalHeight || img.height || 1);
    const longestSide = Math.max(naturalW, naturalH);
    const scale =
      longestSide > MAX_IMAGE_DIMENSION ? MAX_IMAGE_DIMENSION / longestSide : 1;

    const targetW = Math.max(1, Math.round(naturalW * scale));
    const targetH = Math.max(1, Math.round(naturalH * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new GeminiReaderError('network', 'Canvas context unavailable');
    }

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, targetW, targetH);
    ctx.drawImage(img, 0, 0, targetW, targetH);
    const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
    const commaIdx = dataUrl.indexOf(',');
    const base64Data = commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl;

    onProgress?.(30);
    return {
      base64Data,
      dataUrl,
      width: targetW,
      height: targetH,
    };
  } finally {
    if (revokeUrl) {
      URL.revokeObjectURL(revokeUrl);
    }
  }
}

function pickFirstNonEmptyString(
  record: Record<string, unknown>,
  keys: string[]
): string {
  for (const key of keys) {
    const val = record[key];
    if (typeof val === 'string' && val.trim().length > 0) {
      return val.trim();
    }
  }
  return '';
}

function clampCoord(val: number): number {
  return Math.max(0, Math.min(1000, Math.round(val)));
}

/**
 * Defensively parses and validates the raw text returned by Gemini into
 * normalized percentage bounding boxes + LexiconEntry items.
 * Handles fallback keys, object wrappers, and out-of-bounds edge coordinates.
 */
export function parseAndValidateGeminiResponse(
  rawText: string
): GeminiDetectedOverlayItem[] {
  if (!rawText || typeof rawText !== 'string') return [];

  let candidateArray: unknown[] | null = null;

  // 1. Try extracting the outermost [...] JSON array block
  const startIdx = rawText.indexOf('[');
  const endIdx = rawText.lastIndexOf(']');
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    try {
      const parsed = JSON.parse(rawText.slice(startIdx, endIdx + 1));
      if (Array.isArray(parsed)) {
        candidateArray = parsed;
      }
    } catch {
      // Fall through to object extraction
    }
  }

  // 2. Fallback: if Gemini returned an object wrapper like { "items": [...] }
  if (!candidateArray) {
    const objStart = rawText.indexOf('{');
    const objEnd = rawText.lastIndexOf('}');
    if (objStart !== -1 && objEnd !== -1 && objEnd > objStart) {
      try {
        const parsedObj = JSON.parse(rawText.slice(objStart, objEnd + 1)) as Record<
          string,
          unknown
        >;
        if (parsedObj && typeof parsedObj === 'object') {
          for (const val of Object.values(parsedObj)) {
            if (Array.isArray(val)) {
              candidateArray = val;
              break;
            }
          }
        }
      } catch {
        return [];
      }
    }
  }

  if (!candidateArray) return [];

  const validItems: GeminiDetectedOverlayItem[] = [];

  for (let i = 0; i < candidateArray.length; i++) {
    if (validItems.length >= 40) break;

    const item = candidateArray[i];
    if (!item || typeof item !== 'object') continue;

    const record = item as Record<string, unknown>;
    const kn = pickFirstNonEmptyString(record, [
      'kn',
      'kannada',
      'text',
      'label',
      'word',
      'phrase',
      'original',
    ]);
    const en = pickFirstNonEmptyString(record, [
      'en',
      'english',
      'translation',
      'meaning',
      'gloss',
    ]);
    const translit =
      pickFirstNonEmptyString(record, [
        'translit',
        'transliteration',
        'romanized',
        'pronunciation',
        'kanglish',
      ]) || kn;

    if (!kn || !en) continue;

    const rawBox =
      record.box ??
      record.box_2d ??
      record.bbox ??
      record.bounding_box ??
      record.coordinates;
    if (!Array.isArray(rawBox) || rawBox.length < 4) continue;

    const n0 = Number(rawBox[0]);
    const n1 = Number(rawBox[1]);
    const n2 = Number(rawBox[2]);
    const n3 = Number(rawBox[3]);

    if (
      !Number.isFinite(n0) ||
      !Number.isFinite(n1) ||
      !Number.isFinite(n2) ||
      !Number.isFinite(n3)
    ) {
      continue;
    }

    // Clamp to [0, 1000] and normalize inverted coordinates without inflating small boxes
    let ymin = clampCoord(Math.min(n0, n2));
    let ymax = clampCoord(Math.max(n0, n2));
    let xmin = clampCoord(Math.min(n1, n3));
    let xmax = clampCoord(Math.max(n1, n3));

    if (ymax <= ymin) {
      ymax = Math.min(1000, ymin + 1);
      if (ymax <= ymin) ymin = Math.max(0, ymax - 1);
    }
    if (xmax <= xmin) {
      xmax = Math.min(1000, xmin + 1);
      if (xmax <= xmin) xmin = Math.max(0, xmax - 1);
    }

    // Convert 0-1000 normalized [ymin, xmin, ymax, xmax] to exact percentage bbox:
    const xPct = xmin / 10;
    const yPct = ymin / 10;
    const wPct = (xmax - xmin) / 10;
    const hPct = (ymax - ymin) / 10;

    const entry: LexiconEntry = {
      kn,
      translit,
      en,
      category: 'food',
      variants: [],
    };

    validItems.push({
      id: `gemini-word-${validItems.length}-${kn}`,
      kn,
      translit,
      en,
      box: [ymin, xmin, ymax, xmax],
      xPct,
      yPct,
      wPct,
      hPct,
      entry,
    });
  }

  // Overlap rule: >60% intersection deduplication (keep non-overlapping tight bboxes side by side)
  const deduped: GeminiDetectedOverlayItem[] = [];
  for (const candidate of validItems) {
    const [cy0, cx0, cy1, cx1] = candidate.box;
    const candidateArea = Math.max(1, (cx1 - cx0) * (cy1 - cy0));
    let isDuplicateOverlap = false;

    for (const kept of deduped) {
      const [ky0, kx0, ky1, kx1] = kept.box;
      const keptArea = Math.max(1, (kx1 - kx0) * (ky1 - ky0));
      const interW = Math.max(0, Math.min(cx1, kx1) - Math.max(cx0, kx0));
      const interH = Math.max(0, Math.min(cy1, ky1) - Math.max(cy0, ky0));
      const interArea = interW * interH;
      const overlapRatio = interArea / Math.min(candidateArea, keptArea);
      if (overlapRatio > 0.6) {
        isDuplicateOverlap = true;
        break;
      }
    }

    if (!isDuplicateOverlap) {
      deduped.push(candidate);
    }
  }

  return deduped;
}

function delayMs(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new GeminiReaderError('aborted', 'Scan aborted'));
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(new GeminiReaderError('aborted', 'Scan aborted'));
      },
      { once: true }
    );
  });
}

function cleanBase64Image(input: string): string {
  const trimmed = input.trim();
  const commaIdx = trimmed.indexOf(',');
  if (trimmed.startsWith('data:') && commaIdx !== -1) {
    return trimmed.slice(commaIdx + 1).trim();
  }
  return trimmed;
}

function getThinkingConfigForClientModel(modelName: string) {
  if (modelName.includes('3.1-flash-lite')) {
    return { thinkingLevel: ThinkingLevel.MINIMAL };
  }
  if (modelName.includes('3-flash')) {
    return { thinkingLevel: ThinkingLevel.LOW };
  }
  return undefined;
}

async function performSingleGeminiFetch(
  apiKey: string,
  rawBase64Jpeg: string,
  outerSignal?: AbortSignal
): Promise<string> {
  const base64Jpeg = cleanBase64Image(rawBase64Jpeg);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  const onOuterAbort = () => controller.abort();
  outerSignal?.addEventListener('abort', onOuterAbort, { once: true });

  try {
    // 1. Primary path: server-side proxy (/api/reader/scan)
    //    (works in AI Studio preview, Node server deployments, and Vercel serverless functions)
    let serverMissingKey = false;
    try {
      const serverResp = await fetch('/api/reader/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64: base64Jpeg,
          prompt: GEMINI_READER_PROMPT,
          model: GEMINI_VISION_MODEL,
          clientApiKey: apiKey || undefined,
        }),
        signal: controller.signal,
      });

      if (serverResp.status === 429) {
        throw new GeminiReaderError(
          'rate_limit',
          STRINGS.reader.rateLimitError
        );
      }

      if (serverResp.status === 503) {
        serverMissingKey = true;
      }

      if (serverResp.ok) {
        const contentType = serverResp.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const payload = (await serverResp.json()) as { rawText?: string };
          if (typeof payload?.rawText === 'string') {
            return payload.rawText;
          }
        }
      }
    } catch (proxyErr) {
      if (proxyErr instanceof GeminiReaderError) {
        throw proxyErr;
      }
      if (proxyErr instanceof DOMException && proxyErr.name === 'AbortError') {
        throw proxyErr;
      }
      // If proxy route is unreachable (e.g. static ZIP hosting), fall through to direct SDK fallback below
    }

    // 2. Direct Client-Side @google/genai SDK fallback for static/ZIP hosting
    const effectiveKey = apiKey || getConfiguredApiKey();
    if (!effectiveKey) {
      throw new GeminiReaderError(
        'missing_key',
        serverMissingKey
          ? 'Gemini API key not configured. Set GEMINI_API_KEY or VITE_GEMINI_API_KEY in your environment variables (or paste a Gemini key in Settings).'
          : STRINGS.reader.offlineNotice
      );
    }

    const ai = new GoogleGenAI({
      apiKey: effectiveKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    // Multi-model fallback chain identical to server.ts so public Gemini API calls succeed outside AI Studio
    const candidateModels = [
      'gemini-3-flash-preview',
      'gemini-2.5-flash',
      'gemini-flash-latest',
      'gemini-3.1-flash-lite-preview',
    ];

    const callSdkModel = async (
      modelName: string,
      delayOffsetMs: number
    ): Promise<string> => {
      if (delayOffsetMs > 0) {
        await delayMs(delayOffsetMs, controller.signal);
      }
      if (controller.signal.aborted) {
        throw new GeminiReaderError('aborted', 'Scan aborted');
      }

      const thinkingConfig = getThinkingConfigForClientModel(modelName);
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: [
            {
              role: 'user',
              parts: [
                {
                  inlineData: {
                    mimeType: 'image/jpeg',
                    data: base64Jpeg,
                  },
                },
                {
                  text: GEMINI_READER_PROMPT,
                },
              ],
            },
          ],
          config: {
            responseMimeType: 'application/json',
            ...(thinkingConfig ? { thinkingConfig } : {}),
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  kn: {
                    type: Type.STRING,
                    description: 'Exact Kannada script text as written.',
                  },
                  translit: {
                    type: Type.STRING,
                    description: 'Simple Latin/English transliteration.',
                  },
                  en: {
                    type: Type.STRING,
                    description: 'Concise English translation.',
                  },
                  box: {
                    type: Type.ARRAY,
                    items: { type: Type.INTEGER },
                    description:
                      'Bounding box [ymin, xmin, ymax, xmax] normalized 0 to 1000.',
                  },
                },
                required: ['kn', 'translit', 'en', 'box'],
              },
            },
          },
        });

        const text = (response.text || '').trim();
        const parsedItems = parseAndValidateGeminiResponse(text);
        if (parsedItems.length === 0) {
          throw new Error('EMPTY_DETECTION');
        }
        return text;
      } catch (sdkErr: unknown) {
        if (sdkErr instanceof Error && sdkErr.message === 'EMPTY_DETECTION') {
          throw sdkErr;
        }
        const errObj = sdkErr as { status?: number; message?: string };
        const msg = typeof errObj?.message === 'string' ? errObj.message : '';
        if (
          errObj?.status === 429 ||
          msg.includes('429') ||
          msg.includes('RESOURCE_EXHAUSTED')
        ) {
          throw new GeminiReaderError(
            'rate_limit',
            STRINGS.reader.rateLimitError
          );
        }
        throw new GeminiReaderError(
          'network',
          msg || `Model ${modelName} failed`
        );
      }
    };

    try {
      return await Promise.any(
        candidateModels.map((modelName, idx) =>
          callSdkModel(modelName, idx * 1200)
        )
      );
    } catch (aggErr) {
      if (aggErr instanceof AggregateError && aggErr.errors.length > 0) {
        const rateLimitErr = aggErr.errors.find(
          (e): e is GeminiReaderError =>
            e instanceof GeminiReaderError && e.kind === 'rate_limit'
        );
        if (rateLimitErr) throw rateLimitErr;
        const allEmpty = aggErr.errors.every(
          (e) => e instanceof Error && e.message === 'EMPTY_DETECTION'
        );
        if (allEmpty) return '[]';
        throw aggErr.errors[0];
      }
      throw new GeminiReaderError('network', STRINGS.reader.genericError);
    }
  } catch (err) {
    if (outerSignal?.aborted) {
      throw new GeminiReaderError('aborted', 'Scan aborted');
    }
    if (err instanceof GeminiReaderError) {
      throw err;
    }
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new GeminiReaderError(
        'timeout',
        STRINGS.reader.timeoutError
      );
    }
    throw new GeminiReaderError(
      'network',
      STRINGS.reader.networkError
    );
  } finally {
    clearTimeout(timeoutId);
    outerSignal?.removeEventListener('abort', onOuterAbort);
  }
}

let inFlightScanPromise: Promise<GeminiDetectedOverlayItem[]> | null = null;

/**
 * Sends a compressed JPEG image to Gemini Vision (gemini-3.8-flash), enforces a
 * 1-request-at-a-time lock, 100/day localStorage soft cap, 45s timeout, and 1 automatic retry.
 */
export async function scanKannadaImageWithGemini(
  base64Jpeg: string,
  signal?: AbortSignal
): Promise<GeminiDetectedOverlayItem[]> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new GeminiReaderError(
      'offline',
      STRINGS.reader.offlineNotice
    );
  }

  const apiKey = getConfiguredApiKey();

  if (isDailyScanCapReached()) {
    throw new GeminiReaderError(
      'daily_cap',
      STRINGS.reader.dailyCapReached
    );
  }

  // Debounce / single in-flight request guardrail
  if (inFlightScanPromise) {
    return inFlightScanPromise;
  }

  const runTask = (async () => {
    incrementDailyScanCount();

    try {
      const rawText = await performSingleGeminiFetch(apiKey, base64Jpeg, signal);
      const firstItems = parseAndValidateGeminiResponse(rawText);
      if (firstItems.length > 0 || signal?.aborted) {
        return firstItems;
      }
      // If 0 items returned on first pass, retry once in case of transient truncation
      await delayMs(600, signal);
      const secondRawText = await performSingleGeminiFetch(
        apiKey,
        base64Jpeg,
        signal
      );
      return parseAndValidateGeminiResponse(secondRawText);
    } catch (firstErr) {
      // One automatic retry on 5xx or network failure (1.2s backoff), then error state
      if (
        firstErr instanceof GeminiReaderError &&
        firstErr.kind === 'network' &&
        !signal?.aborted
      ) {
        await delayMs(RETRY_BACKOFF_MS, signal);
        const retryText = await performSingleGeminiFetch(
          apiKey,
          base64Jpeg,
          signal
        );
        return parseAndValidateGeminiResponse(retryText);
      }
      throw firstErr;
    }
  })();

  inFlightScanPromise = runTask;
  try {
    return await runTask;
  } finally {
    if (inFlightScanPromise === runTask) {
      inFlightScanPromise = null;
    }
  }
}
