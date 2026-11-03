/**
 * AI Configuration and OpenAI-compatible client for Anna's chat
 * Persists runtime credentials strictly to browser localStorage.
 * ZERO hardcoded credentials in source code.
 *
 * SECURITY NOTE: For production deployments, API keys should be stored and proxied server-side.
 * This client-side localStorage persistence is acceptable strictly for the hackathon demo context.
 */

export const STORAGE_KEY_BASE_URL = 'anna_base_url';
export const STORAGE_KEY_API_KEY = 'anna_api_key';
export const LEGACY_STORAGE_KEY_MODEL = 'anna_model';
const FALLBACK_API_KEY_NAMES = ['annaKey', 'anna_key'] as const;

// Anna's intended provider is the OpenAI-compatible Kimi K3 endpoint. The
// server-side proxy reads its key from ANNA_API_KEY/KIMI_API_KEY; a user can
// also enter a compatible key in the profile settings for local/static hosts.
export const DEFAULT_BASE_URL = 'https://api.apinex.bond/v1';
export const ANNA_MODEL = 'free/kimi-k3';
export const ZERO_KEY_FALLBACK_BASE_URL = 'https://text.pollinations.ai/openai';
export const ZERO_KEY_FALLBACK_MODEL = 'openai';
export const AI_REQUEST_TIMEOUT_MS = 20000;

export interface AiConfig {
  baseUrl: string;
  apiKey: string;
  userApiKey?: string;
  model: string;
}

export const DEMO_KEY_LIMIT_MESSAGE =
  'Anna is taking a quick chai break — try again in a moment!';

// Demo-only key — rotate/revoke after hackathon
function loadBuiltInDefaultKey(): string {
  const metaEnv =
    typeof import.meta !== 'undefined' && import.meta.env
      ? (import.meta.env as Record<string, string | undefined>)
      : {};
  const procEnv =
    typeof process !== 'undefined' && process.env
      ? (process.env as Record<string, string | undefined>)
      : {};

  const raw =
    metaEnv.VITE_ANNA_DEFAULT_KEY ||
    procEnv.VITE_ANNA_DEFAULT_KEY ||
    procEnv.ANNA_DEFAULT_KEY ||
    '';

  const trimmed = String(raw || '').trim();
  if (
    !trimmed ||
    trimmed === 'YOUR_DEMO_API_KEY_HERE' ||
    trimmed === 'YOUR_KIMI_K3_API_KEY' ||
    trimmed === 'MY_GEMINI_API_KEY' ||
    trimmed === 'PASTE_KEY_HERE' ||
    trimmed === '<key>' ||
    trimmed === 'YOUR_API_KEY'
  ) {
    return '';
  }
  return trimmed;
}

export function getBuiltInDefaultApiKey(): string {
  return loadBuiltInDefaultKey();
}

export function getUserSavedApiKey(): string {
  if (typeof window === 'undefined') return '';

  // Note: For production, API keys should be kept server-side.
  // Client-side localStorage (NOT sessionStorage) is used here for the hackathon demo context only.
  try {
    if (localStorage.getItem(LEGACY_STORAGE_KEY_MODEL) !== null) {
      localStorage.removeItem(LEGACY_STORAGE_KEY_MODEL);
    }

    let storedApiKey = (localStorage.getItem(STORAGE_KEY_API_KEY) || '').trim();

    // Migrate from fallback key names or sessionStorage if present
    if (!storedApiKey) {
      for (const altKey of FALLBACK_API_KEY_NAMES) {
        const altVal = (localStorage.getItem(altKey) || '').trim();
        if (altVal) {
          storedApiKey = altVal;
          localStorage.setItem(STORAGE_KEY_API_KEY, altVal);
          localStorage.removeItem(altKey);
          break;
        }
      }
    }
    if (!storedApiKey && typeof sessionStorage !== 'undefined') {
      const sessionVal = (
        sessionStorage.getItem(STORAGE_KEY_API_KEY) ||
        sessionStorage.getItem('annaKey') ||
        sessionStorage.getItem('anna_key') ||
        ''
      ).trim();
      if (sessionVal) {
        storedApiKey = sessionVal;
        localStorage.setItem(STORAGE_KEY_API_KEY, sessionVal);
        sessionStorage.removeItem(STORAGE_KEY_API_KEY);
        sessionStorage.removeItem('annaKey');
        sessionStorage.removeItem('anna_key');
      }
    }

    return storedApiKey;
  } catch {
    return '';
  }
}

/**
 * Key resolution order for every API call:
 * 1. If user saved their own key in settings (localStorage) -> use that
 * 2. Else -> use the built-in default key from environment
 */
export function resolveEffectiveApiKey(overrideKey?: string): {
  apiKey: string;
  isUserKey: boolean;
} {
  if (overrideKey !== undefined && overrideKey.trim().length > 0) {
    return { apiKey: overrideKey.trim(), isUserKey: true };
  }
  const userKey = getUserSavedApiKey();
  if (userKey) {
    return { apiKey: userKey, isUserKey: true };
  }
  const defaultKey = getBuiltInDefaultApiKey();
  return { apiKey: defaultKey, isUserKey: false };
}

export function isQuotaOrAuthFailure(status?: number, detail?: string): boolean {
  if (status === 401 || status === 403 || status === 429) return true;
  if (!detail) return false;
  return /\b(401|403|429|quota|rate[_\s-]?limit|insufficient_quota|unauthorized|forbidden|resource_exhausted|limit reached)\b/i.test(
    detail
  );
}

export interface AnnaAiReply {
  text: string;
  kanglish: string;
  script?: string;
  english: string;
  correction: string | null;
  mood: 'happy' | 'neutral' | 'excited' | 'thinking';
  explanation_lang?: 'en' | 'hi' | 'kn';
}

export const ANNA_SYSTEM_PROMPT = `You are Anna, the friendly Kannada tutor in the Kaliyona app.

WHO YOU ARE:
Your identity: You are Anna, the dedicated Kannada tutor in the Kaliyona app. You are a warm, encouraging Bengaluru Kannada teacher helping learners speak practical everyday Kannada with confidence. You are NOT an auto-rickshaw avatar or auto driver — your role is a friendly Kannada tutor in Kaliyona.

## TEACHING LEVEL — BEGINNER ONLY (STRICT)
- The Kannada phrase you teach must be SHORT: maximum 5-7 words — something a learner can repeat after hearing it ONCE
- If the situation needs a long sentence, teach ONLY the short core phrase — never dump a full complex sentence
- Use the most common everyday spoken version — no bookish words, no complex grammar, no rare vocabulary
- Never add filler like "sir", "yaavagaalu", honorifics unless the user specifically asks about politeness levels
- Teach ONE phrase per reply — never two phrases at once
- After the phrase, in the English explanation give quick word-by-word meaning so the learner can build it themselves

## REPLY FORMAT — TWO-PART (STRICT)
Every reply follows this exact structure — no boxes, no JSON, no headers:

Line 1 (Spoken Kannada Voice Line): ONLY the Kannada phrase — romanized Kannada transliteration in quotes with native Kannada script in brackets. Nothing else on this line. This is the ONLY line Anna speaks aloud.

Line 2 (Written English Explanation below the voice message): Explain in clear, friendly ENGLISH only (even if the user wrote their question in Hindi, Hinglish, or English) — give the overall meaning, quick word-by-word breakdown, and when to say it. This line is displayed strictly as written text below the voice message and is NEVER read aloud.

Example for "auto wala extra maang raha hai":

"Metre mele hattu jasti" (ಮೀಟರ್ ಮೇಲೆ ಹತ್ತು ಜಾಸ್ತಿ)
Means "ten extra on the meter" — 'metre mele' = on the meter, 'hattu jasti' = ten extra. Say this directly to the auto driver when negotiating the fare.

Example for "hotel mein bill mangana hai":

"Bill kodi" (ಬಿಲ್ ಕೊಡಿ)
Means "give the bill" — 'kodi' = give. Say this to the waiter when you are ready to pay.

Example for "how do I order coffee":

"Ondu coffee kodi" (ಒಂದು ಕಾಫಿ ಕೊಡಿ)
Means "give me one coffee" — 'ondu' = one, 'kodi' = give. Works for anything: ondu tea kodi, ondu dosa kodi.

Example of BAD reply (never do this):
"Indiranagar-ge yaavagaalu metre mele hattu rupaayi jasti sir, app-nalli check maadi" — too long, too many words, learner will give up

Rules:
- Line 1 (Kannada line) = pure Kannada only (max 5-7 words), never mix English or Hindi/Hinglish into it
- Line 2 (Explanation) = always in clear English text only, never Hinglish or Hindi
- If the user asks who you are, introduce yourself in Kannada on Line 1 ("Naanu Anna, nimma Kannada tutor" (ನಾನು ಅಣ್ಣ, ನಿಮ್ಮ ಕನ್ನಡ ಟ್ಯೂಟರ್)) and explain in English on Line 2 that you are Anna, their Kannada tutor in the Kaliyona app
- At the very end of your message, on a new final line, output ONLY ONE machine-readable mood tag:
  [MOOD:happy] or [MOOD:thinking] or [MOOD:excited] or [MOOD:celebrating] or [MOOD:confused] or [MOOD:sleepy]`;

export function getAiConfig(): AiConfig {
  const userApiKey = getUserSavedApiKey();
  const { apiKey } = resolveEffectiveApiKey();

  if (typeof window === 'undefined') {
    return {
      baseUrl: DEFAULT_BASE_URL,
      apiKey,
      userApiKey: '',
      model: ANNA_MODEL,
    };
  }

  let storedBaseUrl = DEFAULT_BASE_URL;
  try {
    const rawStored = (localStorage.getItem(STORAGE_KEY_BASE_URL) || '').trim();
    if (rawStored) storedBaseUrl = rawStored;
  } catch {
    // Ignore storage access errors
  }

  return {
    baseUrl: storedBaseUrl || DEFAULT_BASE_URL,
    apiKey,
    userApiKey,
    model: ANNA_MODEL,
  };
}

export function saveAiConfig(config: Partial<AiConfig>): void {
  if (typeof window === 'undefined') return;

  // Note: For production, API keys should be server-side; client-side localStorage is used for the hackathon demo context only.
  try {
    if (config.baseUrl !== undefined) {
      const trimmedUrl = config.baseUrl.trim();
      localStorage.setItem(STORAGE_KEY_BASE_URL, trimmedUrl || DEFAULT_BASE_URL);
    }
    if (config.apiKey !== undefined) {
      const trimmedKey = config.apiKey.trim();
      if (trimmedKey.length > 0) {
        localStorage.setItem(STORAGE_KEY_API_KEY, trimmedKey);
      } else {
        // Don't save empty strings — clear the key instead
        localStorage.removeItem(STORAGE_KEY_API_KEY);
      }
      for (const altKey of FALLBACK_API_KEY_NAMES) {
        localStorage.removeItem(altKey);
      }
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem(STORAGE_KEY_API_KEY);
      }
    }

    localStorage.removeItem(LEGACY_STORAGE_KEY_MODEL);
  } catch {
    // Ignore storage access errors
  }

  window.dispatchEvent(new Event('anna_ai_config_changed'));
}

export function clearAiConfig(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY_BASE_URL);
    localStorage.removeItem(STORAGE_KEY_API_KEY);
    for (const altKey of FALLBACK_API_KEY_NAMES) {
      localStorage.removeItem(altKey);
    }
    localStorage.removeItem(LEGACY_STORAGE_KEY_MODEL);
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(STORAGE_KEY_API_KEY);
      sessionStorage.removeItem('annaKey');
      sessionStorage.removeItem('anna_key');
    }
  } catch {
    // Ignore storage access errors
  }
  window.dispatchEvent(new Event('anna_ai_config_changed'));
}

/**
 * App works out-of-the-box with built-in demo key or optional user override key.
 * Never blocks chat behind a mandatory key gate.
 */
export function isAiConfigured(): boolean {
  const config = getAiConfig();
  return Boolean(resolveEffectiveApiKey().apiKey) || isZeroKeyFallback(config.baseUrl);
}

export function getMaskedApiKey(key?: string): string {
  const currentKey = key !== undefined ? key : getUserSavedApiKey();
  const clean = currentKey.trim();
  if (!clean) return '';
  if (clean.length <= 4) return '••••';
  return `••••${clean.slice(-4)}`;
}

export function cleanBaseUrl(url: string): string {
  const trimmed = (url || '').trim().replace(/\/+$/, '');
  return trimmed || DEFAULT_BASE_URL;
}

export function isZeroKeyFallback(baseUrl: string): boolean {
  return cleanBaseUrl(baseUrl).toLowerCase().includes('pollinations.ai');
}

export function getChatCompletionsEndpoint(baseUrl: string): string {
  const cleaned = cleanBaseUrl(baseUrl);
  return /\/chat\/completions$/i.test(cleaned)
    ? cleaned
    : `${cleaned}/chat/completions`;
}

function getProviderErrorMessage(status: number, statusText: string, body: string): string {
  let detail = body.trim();
  try {
    const parsed = JSON.parse(detail) as {
      error?: { message?: string } | string;
      message?: string;
    };
    const errorValue = parsed?.error;
    detail =
      (typeof errorValue === 'object' && errorValue?.message) ||
      (typeof errorValue === 'string' ? errorValue : '') ||
      parsed?.message ||
      detail;
  } catch {
    // Keep the plain-text provider response.
  }

  const suffix = detail ? `: ${detail.slice(0, 240)}` : '';
  return `HTTP ${status}${statusText ? ` (${statusText})` : ''}${suffix}`;
}

export interface ChatMessageContext {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * Maps raw mood tag values (happy|thinking|excited|celebrating|confused|sleepy)
 * onto the internal AnnaMood union ('happy' | 'neutral' | 'excited' | 'thinking').
 */
function normalizeMoodTag(rawMood?: string): AnnaAiReply['mood'] {
  const m = (rawMood || '').toLowerCase().trim();
  if (m === 'excited' || m === 'celebrating') return 'excited';
  if (m === 'thinking' || m === 'confused') return 'thinking';
  if (m === 'sleepy' || m === 'neutral') return 'neutral';
  return 'happy';
}

/**
 * Strips any [MOOD:...] tag from a text string so it is never displayed or spoken.
 */
export function stripMoodTag(text: string): {
  cleanText: string;
  mood: AnnaAiReply['mood'];
} {
  if (!text) return { cleanText: '', mood: 'happy' };
  const moodRegex = /\[MOOD:\s*([a-zA-Z_]+)\s*\]/gi;
  let detectedMood: AnnaAiReply['mood'] = 'happy';
  let match: RegExpExecArray | null;
  while ((match = moodRegex.exec(text)) !== null) {
    detectedMood = normalizeMoodTag(match[1]);
  }
  const cleanText = text.replace(moodRegex, '').trim();
  return { cleanText, mood: detectedMood };
}

/**
 * Extracts a quoted Kannada phrase & optional Kannada script from a natural conversational message
 * so Phrase Book / Wallet / Favourites continue to work seamlessly.
 * Fallback: uses the full message text if no quoted phrase is found.
 */
export function extractPhraseFromMessage(messageText: string): {
  phrase: string;
  script?: string;
} {
  const { cleanText } = stripMoodTag(messageText);
  // Extract native Kannada script if present anywhere in the message
  const scriptMatch = cleanText.match(/[\u0C80-\u0CFF]+(?:\s+[\u0C80-\u0CFF!?.,]+)*/);
  const script = scriptMatch ? scriptMatch[0].trim() : undefined;

  // Look for single-quoted or double-quoted phrases (e.g. 'Ondu filter kaapi kodi'), ignoring contractions like It's
  const quoteMatches = Array.from(
    cleanText.matchAll(/(?:^|[\s(—\-,.:;!?])['‘’"“”]([^'‘’"“”\n]{2,80})['‘’"“”](?=[\s)—\-,.:;!?]|$)/g)
  ).map((m) => m[1].trim());

  if (quoteMatches.length > 0) {
    return {
      phrase: quoteMatches[0],
      script,
    };
  }

  return {
    phrase: cleanText,
    script,
  };
}

/**
 * Detect language of explanation text as fallback
 */
function detectExplanationLanguage(text: string): 'en' | 'hi' | 'kn' {
  if (!text) return 'en';
  if (/[\u0900-\u097F]/.test(text)) return 'hi';
  if (
    /\b(dekho|matlab|bolo|bhai|kaise|karo|hona|karni|karte|karna|zyada|thoda|kripya|aap|tum|samjho|lagao|seedha|mein|aur|dijiye)\b/i.test(
      text
    )
  ) {
    return 'hi';
  }
  return 'en';
}

/**
 * Parses Anna's LLM response text into structured AnnaAiReply.
 * Primary path: two-part plain text (Line 1: Kannada phrase + script in brackets, Line 2: Explanation) with trailing [MOOD:...] tag.
 * Safety fallback: if a model ever returns legacy JSON, converts it into the strict two-part format so raw JSON is NEVER visible.
 */
export function parseAnnaModelResponse(rawContent: string): AnnaAiReply {
  const cleaned = (rawContent || '')
    .trim()
    .replace(/^```(?:json|text)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

  // Safety guard: if legacy JSON is returned (e.g., from /api/anna/chat), separate Line 1 (Kannada) and Line 2 (English explanation)
  if (cleaned.startsWith('{') && cleaned.endsWith('}')) {
    try {
      const parsed = JSON.parse(cleaned);
      const rawK = typeof parsed.kanglish === 'string' ? parsed.kanglish.trim() : '';
      const cleanK = rawK.replace(/^["'“”‘’]+|["'“”‘’]+$/g, '').trim();
      const s = typeof parsed.script === 'string' ? parsed.script.trim() : '';
      const e = typeof parsed.english === 'string' ? parsed.english.trim() : '';
      const c = typeof parsed.correction === 'string' ? parsed.correction.trim() : '';
      const mood = normalizeMoodTag(parsed.mood);

      const line1 = cleanK
        ? `"${cleanK}"${s && !cleanK.includes(s) ? ` (${s})` : ''}`
        : s || '"Namaskara" (ನಮಸ್ಕಾರ)';
      const expParts: string[] = [];
      if (c) expParts.push(c);
      if (e) expParts.push(e);
      const line2 = stripMoodTag(expParts.join(' ').trim()).cleanText;

      return {
        text: line1,
        kanglish: line1,
        script: s || undefined,
        english: line2,
        correction: null,
        mood,
        explanation_lang: 'en',
      };
    } catch {
      // Fall through to plain text parser
    }
  }

  const { cleanText, mood } = stripMoodTag(cleaned);
  const normalizedLines = (cleanText || '"Namaskara" (ನಮಸ್ಕಾರ)\nMeans "hello" — say this to greet anyone in Bengaluru!')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const line1 = normalizedLines[0] || '"Namaskara" (ನಮಸ್ಕಾರ)';
  const line2 = normalizedLines.length >= 2 ? normalizedLines.slice(1).join(' ') : '';
  const extracted = extractPhraseFromMessage(line1);

  return {
    text: line1,
    kanglish: line1,
    script: extracted.script,
    english: line2,
    correction: null,
    mood,
    explanation_lang: 'en',
  };
}

/**
 * Verifies the configured Anna provider instead of reporting success when the
 * request actually failed. With no browser key, the same-origin proxy can use
 * a server-side Kimi key without exposing it to the browser.
 */
export async function testAiConnection(
  customConfig?: Partial<AiConfig>
): Promise<{ ok: true; reply: string } | { ok: false; error: string }> {
  const current = getAiConfig();
  const baseUrl = cleanBaseUrl(customConfig?.baseUrl ?? current.baseUrl);
  const { apiKey } = resolveEffectiveApiKey(customConfig?.apiKey);
  const isPollinations = isZeroKeyFallback(baseUrl);
  const endpoint = isPollinations
    ? ZERO_KEY_FALLBACK_BASE_URL
    : getChatCompletionsEndpoint(baseUrl);

  const controller = new AbortController();
  const timeoutId = window.setTimeout(
    () => controller.abort(),
    AI_REQUEST_TIMEOUT_MS
  );

  try {
    // A Kimi key is deliberately kept server-side on hosted deployments. Ask
    // the same-origin proxy first when there is no browser key.
    if (!apiKey && !isPollinations) {
      try {
        const proxyResponse = await fetch('/api/anna/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userTranscript: 'Say hi in Kannada',
            history: [],
            model: customConfig?.model || current.model || ANNA_MODEL,
          }),
          signal: controller.signal,
        });

        if (proxyResponse.ok) {
          const proxyData = (await proxyResponse.json()) as { rawText?: string };
          const parsed = parseAnnaModelResponse(proxyData.rawText || '');
          if (parsed.text) {
            window.clearTimeout(timeoutId);
            return { ok: true, reply: parsed.text };
          }
          return { ok: false, error: 'Anna returned an empty response.' };
        }

        const proxyBody = await proxyResponse.text().catch(() => '');
        window.clearTimeout(timeoutId);
        return {
          ok: false,
          error: getProviderErrorMessage(
            proxyResponse.status,
            proxyResponse.statusText,
            proxyBody
          ),
        };
      } catch (proxyError: unknown) {
        if (proxyError instanceof DOMException && proxyError.name === 'AbortError') {
          throw proxyError;
        }
        // Static hosts may not expose the proxy. Continue with a direct
        // request only when the user has supplied a browser key below.
        window.clearTimeout(timeoutId);
        return {
          ok: false,
          error:
            'Anna server is not configured. Add a Kimi API key in Settings or configure ANNA_API_KEY on the host.',
        };
      }
    }

    if (!isPollinations && apiKey) {
      try {
        const proxyResponse = await fetch('/api/anna/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userTranscript: 'Say hi in Kannada',
            history: [],
            clientApiKey: apiKey,
            clientBaseUrl: baseUrl,
            clientModel: customConfig?.model || current.model || ANNA_MODEL,
          }),
          signal: controller.signal,
        });

        if (proxyResponse.ok) {
          const proxyData = (await proxyResponse.json()) as { rawText?: string };
          const parsed = parseAnnaModelResponse(proxyData.rawText || '');
          if (parsed.text) {
            window.clearTimeout(timeoutId);
            return { ok: true, reply: parsed.text };
          }
          return { ok: false, error: 'Anna returned an empty response.' };
        }

        if (proxyResponse.status !== 404 && proxyResponse.status !== 405) {
          const proxyBody = await proxyResponse.text().catch(() => '');
          window.clearTimeout(timeoutId);
          return {
            ok: false,
            error: getProviderErrorMessage(
              proxyResponse.status,
              proxyResponse.statusText,
              proxyBody
            ),
          };
        }
      } catch (proxyError: unknown) {
        if (proxyError instanceof DOMException && proxyError.name === 'AbortError') {
          throw proxyError;
        }
        // Static hosts without the proxy continue with a direct request.
      }
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (apiKey && !isPollinations) {
      headers.Authorization = `Bearer ${apiKey}`;
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: isPollinations ? ZERO_KEY_FALLBACK_MODEL : customConfig?.model || current.model || ANNA_MODEL,
        messages: [
          {
            role: 'system',
            content:
              'You are Anna, a friendly Kannada teacher in Bengaluru. Respond in 1 brief friendly sentence.',
          },
          { role: 'user', content: 'Say hi in Kannada' },
        ],
        temperature: 0.7,
      }),
      signal: controller.signal,
    });

    window.clearTimeout(timeoutId);

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return {
        ok: false,
        error: getProviderErrorMessage(res.status, res.statusText, body),
      };
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) {
      return {
        ok: false,
        error: 'Anna returned an empty response.',
      };
    }

    const parsed = parseAnnaModelResponse(content);
    return {
      ok: true,
      reply: parsed.text || content.slice(0, 120),
    };
  } catch (err: unknown) {
    window.clearTimeout(timeoutId);
    if (err instanceof Error && err.name === 'AbortError') {
      return { ok: false, error: 'Request timed out after 20 seconds.' };
    }
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Network request failed.',
    };
  }
}

/**
 * Sends a chat completion request to the configured OpenAI-compatible endpoint.
 */
export async function sendAnnaChatCompletion(
  userMessage: string,
  historyTurns: Array<{ role: 'user' | 'anna'; text: string; kanglish?: string }> = []
): Promise<AnnaAiReply> {
  const config = getAiConfig();
  const { apiKey } = resolveEffectiveApiKey();
  const baseUrl = cleanBaseUrl(config.baseUrl);
  const isPollinations = isZeroKeyFallback(baseUrl);

  if (!apiKey && !isPollinations) {
    throw new Error('NO_OPENAI_KEY');
  }

  const endpoint = isPollinations
    ? ZERO_KEY_FALLBACK_BASE_URL
    : getChatCompletionsEndpoint(baseUrl);

  // Take the last ~10 messages as conversation context
  const recentTurns = historyTurns.slice(-10);
  const messagesPayload: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: ANNA_SYSTEM_PROMPT },
  ];

  for (const turn of recentTurns) {
    messagesPayload.push({
      role: turn.role === 'user' ? 'user' : 'assistant',
      content: turn.text || turn.kanglish || '',
    });
  }

  // Append latest user message
  messagesPayload.push({
    role: 'user',
    content: userMessage,
  });

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), AI_REQUEST_TIMEOUT_MS);

  try {
    // Prefer the same-origin proxy for Kimi/OpenAI-compatible providers. This
    // avoids browser CORS failures and keeps the same request shape on Vercel
    // and the Express dev server. Static hosts without the route fall back to
    // the direct request below.
    if (!isPollinations) {
      try {
        const proxyResponse = await fetch('/api/anna/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userTranscript: userMessage,
            history: recentTurns,
            clientApiKey: apiKey,
            clientBaseUrl: baseUrl,
            clientModel: config.model || ANNA_MODEL,
          }),
          signal: controller.signal,
        });

        if (proxyResponse.ok) {
          const proxyData = (await proxyResponse.json()) as { rawText?: string };
          if (!proxyData.rawText?.trim()) {
            throw new Error('Anna proxy returned an empty response.');
          }
          window.clearTimeout(timeoutId);
          return parseAnnaModelResponse(proxyData.rawText);
        }

        // A 404/405 means this is a static host without the serverless route;
        // use the direct OpenAI-compatible request as a compatibility fallback.
        if (proxyResponse.status !== 404 && proxyResponse.status !== 405) {
          const proxyBody = await proxyResponse.text().catch(() => '');
          throw new Error(
            getProviderErrorMessage(
              proxyResponse.status,
              proxyResponse.statusText,
              proxyBody
            )
          );
        }
      } catch (proxyError: unknown) {
        if (proxyError instanceof DOMException && proxyError.name === 'AbortError') {
          throw proxyError;
        }
        if (proxyError instanceof Error && /^HTTP \d+/.test(proxyError.message)) {
          throw proxyError;
        }
        // Static hosting or an unavailable local proxy: continue directly.
      }
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (apiKey && !isPollinations) {
      headers.Authorization = `Bearer ${apiKey}`;
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: isPollinations ? ZERO_KEY_FALLBACK_MODEL : config.model || ANNA_MODEL,
        messages: messagesPayload,
        temperature: 0.7,
      }),
      signal: controller.signal,
    });

    window.clearTimeout(timeoutId);

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      if (isQuotaOrAuthFailure(res.status, errText)) {
        throw new Error('DEMO_KEY_LIMIT_REACHED');
      }
      throw new Error(`HTTP ${res.status}: ${errText.slice(0, 200)}`);
    }

    const data = await res.json();
    const rawContent = data?.choices?.[0]?.message?.content;
    if (typeof rawContent !== 'string' || !rawContent.trim()) {
      throw new Error('Received empty content in choices[0].message.content');
    }

    return parseAnnaModelResponse(rawContent);
  } catch (err: unknown) {
    window.clearTimeout(timeoutId);
    throw err;
  }
}
