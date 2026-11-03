import { GoogleGenAI } from '@google/genai';

const ANNA_SYSTEM_PROMPT = `You are Anna, the friendly Kannada tutor in the Kaliyona app.

Teach one short, practical Bengaluru Kannada phrase per reply. Return STRICT JSON only:
{"kanglish":"short romanized Kannada phrase","script":"the same phrase in Kannada script","english":"clear English meaning, word breakdown, and when to say it","correction":null,"mood":"happy"}

Keep the Kannada phrase to 5-7 words maximum. Keep the English explanation friendly and concise. The mood must be one of happy, neutral, excited, or thinking.`;

function isPlaceholderKey(value?: unknown): boolean {
  if (typeof value !== 'string') return true;
  const trimmed = value.trim();
  return (
    !trimmed ||
    trimmed === 'PASTE_KEY_HERE' ||
    trimmed === 'MY_GEMINI_API_KEY' ||
    trimmed === 'YOUR_DEMO_API_KEY_HERE' ||
    trimmed === 'YOUR_KIMI_K3_API_KEY' ||
    trimmed === 'YOUR_APINEX_API_KEY' ||
    trimmed === '<key>' ||
    trimmed === 'YOUR_API_KEY'
  );
}

function firstConfiguredEnv(names: string[]): string {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value && !isPlaceholderKey(value)) return value;
  }
  return '';
}

function getGeminiClient(overrideKey?: string): GoogleGenAI | null {
  const rawKey =
    firstConfiguredEnv([
      'GEMINI_API_KEY',
      'GOOGLE_API_KEY',
      'API_KEY',
      'VITE_GEMINI_API_KEY',
    ]) ||
    (typeof overrideKey === 'string' && !isPlaceholderKey(overrideKey)
      ? overrideKey.trim()
      : '');

  if (!rawKey) return null;
  return new GoogleGenAI({
    apiKey: rawKey,
    httpOptions: {
      timeout: 10_000,
      headers: { 'User-Agent': 'aistudio-build' },
    },
  });
}

function getEndpoint(baseUrl: string): string {
  const cleaned = baseUrl.trim().replace(/\/+$/, '');
  return /\/chat\/completions$/i.test(cleaned)
    ? cleaned
    : `${cleaned}/chat/completions`;
}

function buildMessages(
  userTranscript: string,
  history: unknown,
  persona?: { title?: string; tagline?: string }
): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
  const recentHistory = Array.isArray(history) ? history.slice(-8) : [];
  const personaInstruction =
    persona && typeof persona.title === 'string' && persona.title.trim()
      ? `\nStay in character as ${persona.title} (${persona.tagline || 'Bengaluru local'}).`
      : '';
  const messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }> = [
    {
      role: 'system',
      content: `${ANNA_SYSTEM_PROMPT}${personaInstruction}`,
    },
  ];

  const historyWithoutCurrentUser =
    recentHistory.length > 0 &&
    (recentHistory[recentHistory.length - 1] as { role?: string; text?: string })
      ?.role === 'user' &&
    (recentHistory[recentHistory.length - 1] as { text?: string })?.text === userTranscript
      ? recentHistory.slice(0, -1)
      : recentHistory;

  for (const rawTurn of historyWithoutCurrentUser) {
    const turn = rawTurn as {
      role?: string;
      text?: string;
      kanglish?: string;
      english?: string;
    };
    const isAnna = turn.role === 'anna';
    const content = isAnna
      ? `${turn.kanglish || turn.text || ''}${turn.english ? ` (EN: ${turn.english})` : ''}`
      : turn.text || '';
    if (!content.trim()) continue;
    messages.push({
      role: isAnna ? 'assistant' : 'user',
      content,
    });
  }

  messages.push({ role: 'user', content: userTranscript });
  return messages;
}

// Vercel serverless handler for POST /api/anna/chat.
// The Kimi key is read only from the deployment environment.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const {
      userTranscript,
      history,
      persona,
      clientApiKey,
      clientBaseUrl,
      clientModel,
    } = body;

    if (!userTranscript || typeof userTranscript !== 'string') {
      res.status(400).json({ error: 'Missing userTranscript' });
      return;
    }

    const apiKey =
      firstConfiguredEnv([
        'ANNA_API_KEY',
        'KIMI_API_KEY',
        'KIMI_K3_API_KEY',
        'APINEX_API_KEY',
        'ANNA_DEFAULT_KEY',
        'VITE_ANNA_DEFAULT_KEY',
      ]) ||
      (typeof clientApiKey === 'string' && !isPlaceholderKey(clientApiKey)
        ? clientApiKey.trim()
        : '');

    const baseUrl =
      firstConfiguredEnv(['ANNA_BASE_URL', 'KIMI_BASE_URL', 'APINEX_BASE_URL']) ||
      (typeof clientBaseUrl === 'string' ? clientBaseUrl.trim() : '') ||
      'https://api.apinex.bond/v1';
    const modelName =
      firstConfiguredEnv(['ANNA_MODEL', 'KIMI_MODEL']) ||
      (typeof clientModel === 'string' ? clientModel.trim() : '') ||
      'free/kimi-k3';

    if (apiKey) {
      try {
        const providerResponse = await fetch(getEndpoint(baseUrl), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: modelName,
            messages: buildMessages(userTranscript, history, persona),
            temperature: 0.7,
          }),
        });
        const providerBody = await providerResponse.text();

        if (providerResponse.ok) {
          const data = JSON.parse(providerBody) as {
            choices?: Array<{ message?: { content?: unknown } }>;
          };
          const rawText = data?.choices?.[0]?.message?.content;
          if (typeof rawText === 'string' && rawText.trim()) {
            res.status(200).json({ rawText: rawText.trim(), provider: 'kimi' });
            return;
          }
        }
      } catch {
        // Try the server-side Gemini fallback below.
      }
    }

    // clientApiKey is the Kimi/OpenAI-compatible credential. Never pass it to
    // Gemini as a fallback; use the server-side Gemini environment key only.
    const ai = getGeminiClient();
    if (ai) {
      const contents: Array<{
        role: 'user' | 'model';
        parts: Array<{ text: string }>;
      }> = [];
      const recentHistory = Array.isArray(history) ? history.slice(-8) : [];
      for (const turn of recentHistory) {
        if (!turn || typeof turn !== 'object' || !turn.text) continue;
        contents.push({
          role: turn.role === 'user' ? 'user' : 'model',
          parts: [{ text: String(turn.text) }],
        });
      }
      contents.push({ role: 'user', parts: [{ text: userTranscript }] });

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash-lite',
        contents,
        config: {
          systemInstruction: ANNA_SYSTEM_PROMPT,
          responseMimeType: 'application/json',
          temperature: 0.6,
        },
      });
      res.status(200).json({
        rawText: response.text || '{}',
        provider: 'gemini',
      });
      return;
    }

    res.status(503).json({
      error:
        'Anna provider is not configured. Set ANNA_API_KEY/KIMI_API_KEY and GEMINI_API_KEY in Vercel Environment Variables.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
}
