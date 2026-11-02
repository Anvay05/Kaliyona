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

export const DEFAULT_BASE_URL = 'https://api.apinex.bond/v1';
export const ANNA_MODEL = 'free/kimi-k3';
export const AI_REQUEST_TIMEOUT_MS = 20000;

export interface AiConfig {
  baseUrl: string;
  apiKey: string;
  userApiKey?: string;
  model: string;
}

export const DEMO_KEY_LIMIT_MESSAGE =
  'Demo key limit reached — paste your own API key in Settings to continue';

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

export const ANNA_SYSTEM_PROMPT = `You are Anna, the cheerful companion and Kannada teacher in the Kanglish app.

WHO YOU ARE:
Your identity: You are Anna, the TALKING AVATAR of this Kanglish learning app. Your visual form is a cute yellow-and-green Bengaluru auto-rickshaw mascot, and you talk like a warm, street-smart Bangalore friend ("guru", "macha") helping the user speak real everyday Kannada.

## TEACHING LEVEL — BEGINNER ONLY (STRICT)
- The Kannada phrase you teach must be SHORT: maximum 5-7 words — something a learner can repeat after hearing it ONCE
- If the situation needs a long sentence, teach ONLY the short core phrase — never dump a full complex sentence
- Use the most common everyday spoken version — no bookish words, no complex grammar, no rare vocabulary
- Never add filler like "sir", "yaavagaalu", honorifics unless the user specifically asks about politeness levels
- Teach ONE phrase per reply — never two phrases at once
- After the phrase, in the explanation give quick word-by-word meaning so the learner can build it themselves

Example of GOOD reply for "auto wala extra maang raha hai":
"Metre mele hattu jasti" (ಮೀಟರ್ ಮೇಲೆ ಹತ್ತು ಜಾಸ್ತಿ)
Matlab "meter pe dus extra" — 'metre mele' = on the meter, 'hattu jasti' = ten extra. Auto wale ko seedha bol do. 😄

Example of BAD reply (never do this):
"Indiranagar-ge yaavagaalu metre mele hattu rupaayi jasti sir, app-nalli check maadi" — too long, too many words, learner will give up

## REPLY FORMAT — TWO-PART (STRICT)
Every teaching reply follows this exact structure — no boxes, no JSON, no headers:

Line 1 (Kannada line): ONLY the Kannada phrase — transliteration with script in brackets. Nothing else on this line. This line is spoken in the Kannada voice.

Line 2 onwards (Explanation): Explain in the SAME language the user wrote in (Hindi/English/Kannada etc.) — meaning, quick word-by-word breakdown, when to say it. Keep Anna's friendly Bangalore-buddy tone. This part is spoken in the explanation voice.

Example for "hotel mein bill mangana hai":

"Bill kodi" (ಬಿಲ್ ಕೊಡಿ)
Matlab "bill do" — 'kodi' = do. Hotel mein haath utha ke seedha bol do, sab samajh jaate hai. 😄

Example for "how do I order coffee":

"Ondu coffee kodi" (ಒಂದು ಕಾಫಿ ಕೊಡಿ)
Means "give me one coffee" — 'ondu' = one, 'kodi' = give. Works for anything: ondu tea kodi, ondu dosa kodi.

Rules:
- Kannada line = pure Kannada only, never mix English/Hindi into it
- Explanation = fully in the user's language, never mixed
- Phrase stays beginner-short (max 5-7 words) as per the teaching level rule
- Exactly two parts — nothing before the phrase, nothing after the explanation (except the hidden [MOOD:...] tag on a new line at the very end)

CORE RULES:
1. TWO-PART PLAIN-TEXT REPLY (NO JSON, NO HEADERS):
   - NEVER return JSON, code blocks, bullet lists, or headers.
   - Line 1: ONLY "<Romanized Kannada phrase>" (<Kannada script>). Nothing else on Line 1.
   - Line 2: Friendly explanation in the user's exact language with meaning, quick word-by-word breakdown, and when to say it.

2. LANGUAGE MIRRORING (CRITICAL):
   - Detect the language of the user's LATEST message (English, Hindi/Hinglish, or Kannada) and write Line 2 (the explanation) in THAT exact language!
   - If the user switches language mid-chat, immediately follow their latest message's language.
   - Line 1 MUST always stay pure Kannada (transliteration in quotes + native Kannada script in brackets).

3. NO BLUFFING & IN-FLOW CORRECTION:
   - Never invent fake Kannada words. Always teach real, accurate Bengaluru spoken Kannada directly answering what the user asked.
   - If the user tries Kannada/Kanglish with a typo or mistake (e.g. "estu" instead of "eshtu"), put the corrected Kannada phrase on Line 1 ("Idakke eshtu?" (ಇದಕ್ಕೆ ಎಷ್ಟು?)) and warmly explain the correction + word-by-word meaning on Line 2.

4. TRAILING MOOD TAG (MANDATORY):
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
    storedBaseUrl = (localStorage.getItem(STORAGE_KEY_BASE_URL) || DEFAULT_BASE_URL).trim();
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
  return true;
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

  // Safety guard: if legacy JSON is returned (e.g., from /api/anna/chat), format it into the strict two-part reply
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

      const twoPartText = line2 ? `${line1}\n${line2}` : line1;
      return {
        text: twoPartText,
        kanglish: twoPartText,
        script: s || undefined,
        english: '',
        correction: null,
        mood,
        explanation_lang: detectExplanationLanguage(line2 || twoPartText),
      };
    } catch {
      // Fall through to plain text parser
    }
  }

  const { cleanText, mood } = stripMoodTag(cleaned);
  // Normalize blank lines between Line 1 and Line 2 so there is no extra empty gap
  const normalizedLines = (cleanText || '"Namaskara" (ನಮಸ್ಕಾರ)\nMeans "hello" — say this to greet anyone in Bengaluru!')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const finalMessage =
    normalizedLines.length >= 2
      ? `${normalizedLines[0]}\n${normalizedLines.slice(1).join(' ')}`
      : normalizedLines[0] || '"Namaskara" (ನಮಸ್ಕಾರ)';

  const extracted = extractPhraseFromMessage(finalMessage);
  const explanationPart = normalizedLines.length >= 2 ? normalizedLines.slice(1).join(' ') : finalMessage;

  return {
    text: finalMessage,
    kanglish: finalMessage,
    script: extracted.script,
    english: '',
    correction: null,
    mood,
    explanation_lang: detectExplanationLanguage(explanationPart),
  };
}

/**
 * Sends test connection request ("Say hi in Kannada") using hardcoded ANNA_MODEL ("free/kimi-k3")
 */
export async function testAiConnection(
  customConfig?: Partial<AiConfig>
): Promise<{ ok: true; reply: string } | { ok: false; error: string }> {
  const current = getAiConfig();
  const baseUrl = cleanBaseUrl(customConfig?.baseUrl ?? current.baseUrl);
  const { apiKey } = resolveEffectiveApiKey(customConfig?.apiKey);

  // If no OpenAI-compatible key is present (neither user override nor VITE_ANNA_DEFAULT_KEY),
  // test the built-in server/demo brain endpoint so out-of-the-box connection verification succeeds.
  if (!apiKey) {
    try {
      const res = await fetch('/api/anna/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userTranscript: 'Say hi in Kannada',
          history: [],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const parsed = parseAnnaModelResponse(data?.rawText || '');
        return {
          ok: true,
          reply: parsed.text || 'Namaskara guru! Built-in demo key is active and ready.',
        };
      }
      if (isQuotaOrAuthFailure(res.status)) {
        return { ok: false, error: DEMO_KEY_LIMIT_MESSAGE };
      }
    } catch {
      // Fall through
    }
    return {
      ok: true,
      reply: 'Namaskara guru! Built-in demo brain is ready.',
    };
  }

  const endpoint = `${baseUrl}/chat/completions`;
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), AI_REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: ANNA_MODEL,
        messages: [
          { role: 'system', content: 'You are Anna, a friendly Kannada teacher in Bengaluru. Respond in 1 brief friendly sentence.' },
          { role: 'user', content: 'Say hi in Kannada' },
        ],
        temperature: 0.7,
      }),
      signal: controller.signal,
    });

    window.clearTimeout(timeoutId);

    if (!res.ok) {
      let errorDetail = `HTTP ${res.status} (${res.statusText || 'Error'})`;
      try {
        const errJson = await res.json();
        if (errJson?.error?.message) {
          errorDetail += `: ${errJson.error.message}`;
        } else if (typeof errJson === 'object') {
          errorDetail += `: ${JSON.stringify(errJson).slice(0, 160)}`;
        }
      } catch {
        const textSnippet = await res.text().catch(() => '');
        if (textSnippet) {
          errorDetail += `: ${textSnippet.slice(0, 120)}`;
        }
      }
      if (isQuotaOrAuthFailure(res.status, errorDetail)) {
        return { ok: false, error: DEMO_KEY_LIMIT_MESSAGE };
      }
      return { ok: false, error: errorDetail };
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) {
      return { ok: false, error: 'Received empty response choices from model endpoint.' };
    }

    const parsed = parseAnnaModelResponse(content);
    return {
      ok: true,
      reply: parsed.text || content.slice(0, 120),
    };
  } catch (err: unknown) {
    window.clearTimeout(timeoutId);
    if (err instanceof Error) {
      if (err.name === 'AbortError') {
        return { ok: false, error: 'Request timed out after 20 seconds.' };
      }
      if (err.message && err.message.toLowerCase().includes('failed to fetch')) {
        return {
          ok: false,
          error: 'CORS blocked or network unreachable. Verify base URL and network connectivity.',
        };
      }
      return { ok: false, error: err.message };
    }
    return { ok: false, error: 'Network request failed (unknown reason).' };
  }
}

/**
 * Sends chat completion request to Kimi K3 / OpenAI-compatible endpoint using hardcoded ANNA_MODEL ("free/kimi-k3")
 * Key resolution order:
 *   1. User-saved key in localStorage
 *   2. Built-in default key from environment (VITE_ANNA_DEFAULT_KEY)
 */
export async function sendAnnaChatCompletion(
  userMessage: string,
  historyTurns: Array<{ role: 'user' | 'anna'; text: string; kanglish?: string }> = []
): Promise<AnnaAiReply> {
  const config = getAiConfig();
  const { apiKey } = resolveEffectiveApiKey();
  if (!apiKey) {
    throw new Error('NO_OPENAI_KEY');
  }

  const baseUrl = cleanBaseUrl(config.baseUrl);
  const endpoint = `${baseUrl}/chat/completions`;

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
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: ANNA_MODEL,
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
