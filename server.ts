import express from 'express';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import {
  GoogleGenAI,
  Modality,
  Type,
  LiveServerMessage,
  ThinkingLevel,
} from '@google/genai';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

function isPlaceholderKey(val?: string): boolean {
  if (!val) return true;
  const trimmed = val.trim();
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

function getGenAIClient(overrideKey?: string): GoogleGenAI | null {
  const candidates = [
    process.env.GEMINI_API_KEY,
    process.env.VITE_GEMINI_API_KEY,
    process.env.GOOGLE_API_KEY,
    process.env.API_KEY,
    overrideKey,
  ];
  const rawKey = candidates.find((k) => !isPlaceholderKey(k))?.trim() || '';

  if (!rawKey) {
    return null;
  }

  return new GoogleGenAI({
    apiKey: rawKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

interface AnnaOpenAiConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

function firstConfiguredEnv(names: string[]): string {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value && !isPlaceholderKey(value)) return value;
  }
  return '';
}

function getAnnaOpenAiConfig(
  overrideKey?: string,
  overrideBaseUrl?: string,
  overrideModel?: string
): AnnaOpenAiConfig {
  return {
    apiKey:
      (overrideKey && !isPlaceholderKey(overrideKey) ? overrideKey.trim() : '') ||
      firstConfiguredEnv([
        'ANNA_API_KEY',
        'KIMI_API_KEY',
        'KIMI_K3_API_KEY',
        'APINEX_API_KEY',
        'ANNA_DEFAULT_KEY',
        'VITE_ANNA_DEFAULT_KEY',
      ]),
    baseUrl:
      firstConfiguredEnv(['ANNA_BASE_URL', 'KIMI_BASE_URL', 'APINEX_BASE_URL']) ||
      (overrideBaseUrl || '').trim() ||
      'https://api.apinex.bond/v1',
    model:
      firstConfiguredEnv(['ANNA_MODEL', 'KIMI_MODEL']) ||
      (overrideModel || '').trim() ||
      'free/kimi-k3',
  };
}

function getOpenAiChatCompletionsEndpoint(baseUrl: string): string {
  const cleaned = baseUrl.trim().replace(/\/+$/, '');
  return /\/chat\/completions$/i.test(cleaned)
    ? cleaned
    : `${cleaned}/chat/completions`;
}

function buildAnnaOpenAiMessages(
  userTranscript: string,
  history: unknown,
  persona?: { title?: string; tagline?: string }
): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
  const recentHistory = Array.isArray(history) ? history.slice(-8) : [];
  const speakerLabel =
    persona && typeof persona.title === 'string' && persona.title.trim()
      ? persona.title.trim()
      : 'Anna';
  const personaInstruction =
    persona && typeof persona.title === 'string' && persona.title.trim()
      ? `\n\nACTIVE ROLEPLAY ROLE: "${persona.title}" (${persona.tagline || 'Bengaluru local'}). Stay in character as ${persona.title}.`
      : '';

  const messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }> = [
    { role: 'system', content: `${ANNA_SYSTEM_PROMPT}${personaInstruction}` },
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
      content: isAnna ? `${speakerLabel}: ${content}` : content,
    });
  }

  messages.push({ role: 'user', content: userTranscript });
  return messages;
}

async function requestAnnaOpenAiCompletion(
  config: AnnaOpenAiConfig,
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
): Promise<string> {
  const response = await fetch(getOpenAiChatCompletionsEndpoint(config.baseUrl), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature: 0.7,
    }),
  });
  const body = await response.text();

  if (!response.ok) {
    const error = new Error(
      `Anna provider returned HTTP ${response.status}: ${body.slice(0, 240)}`
    ) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  let data: { choices?: Array<{ message?: { content?: unknown } }> };
  try {
    data = JSON.parse(body) as typeof data;
  } catch {
    throw new Error('Anna provider returned invalid JSON.');
  }

  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('Anna provider returned an empty response.');
  }
  return content.trim();
}

function resolveBrainModel(requestedModel?: string): string {
  if (!requestedModel) return 'gemini-3.5-flash-lite';
  const normalized = requestedModel.trim().toLowerCase();
  if (
    normalized === 'gemini-3.5-flash-lite' ||
    normalized === 'gemini-3-flash-preview' ||
    normalized === 'gemini-3.8-flash' ||
    normalized === 'gemini-3.5-flash' ||
    normalized === 'gemini-flash' ||
    normalized === 'gemini-flash-latest'
  ) {
    return 'gemini-3.5-flash-lite';
  }
  if (normalized === 'gemini-lite' || normalized === 'flash-lite' || normalized === 'gemini-3.1-flash-lite') {
    return 'gemini-3.5-flash-lite';
  }
  return requestedModel;
}

function getThinkingConfigForModel(modelName: string) {
  if (modelName.includes('3.1-flash-lite')) {
    return { thinkingLevel: ThinkingLevel.MINIMAL };
  }
  if (modelName.includes('3-flash')) {
    return { thinkingLevel: ThinkingLevel.LOW };
  }
  return undefined;
}

function getApinexApiKey(): string {
  return firstConfiguredEnv([
    'APINEX_API_KEY',
    'KIMI_API_KEY',
    'KIMI_K3_API_KEY',
    'ANNA_API_KEY',
    'VITE_ANNA_DEFAULT_KEY',
  ]);
}

async function callApinexServerVision(
  cleanedBase64: string,
  promptText: string
): Promise<string | null> {
  const apiKey = getApinexApiKey();
  if (!apiKey) return null;

  for (const model of ['free/gemini-3.8-flash', 'free/kimi-k3']) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 24_000);
    try {
      const response = await fetch(
        'https://api.apinex.bond/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'text', text: promptText },
                  {
                    type: 'image_url',
                    image_url: {
                      url: `data:image/jpeg;base64,${cleanedBase64}`,
                    },
                  },
                ],
              },
            ],
            temperature: 0.1,
          }),
          signal: controller.signal,
        }
      );
      if (!response.ok) continue;

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: unknown } }>;
      };
      const raw = String(data?.choices?.[0]?.message?.content || '').trim();
      const start = raw.indexOf('[');
      const end = raw.lastIndexOf(']');
      if (start !== -1 && end > start) {
        const parsed = JSON.parse(raw.slice(start, end + 1));
        if (Array.isArray(parsed) && parsed.length > 0) {
          return JSON.stringify(parsed);
        }
      }
    } catch {
      // Try the next Apinex vision model.
    } finally {
      clearTimeout(timeoutId);
    }
  }
  return null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function generateContentWithFallback(
  ai: GoogleGenAI,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params: any,
  requireNonEmptyArray = false
) {
  const primaryModel = resolveBrainModel(params.model);
  const fallbackChain = requireNonEmptyArray
    ? [
        'gemini-3.5-flash-lite',
        'gemini-3.8-flash',
        'gemini-3-flash-preview',
      ]
    : [
        primaryModel,
        'gemini-3.5-flash-lite',
        'gemini-3.8-flash',
        'gemini-3-flash-preview',
      ].filter((m, idx, arr) => Boolean(m) && arr.indexOf(m) === idx);

  const callSingleModel = async (candidateModel: string, delayMs = 0) => {
    if (delayMs > 0) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
    const thinkingConfig = getThinkingConfigForModel(candidateModel);
    const res = await ai.models.generateContent({
      ...params,
      model: candidateModel,
      config: {
        ...params.config,
        ...(thinkingConfig ? { thinkingConfig } : {}),
      },
    });
    const text = (res.text || '').trim();
    if (!text) {
      throw new Error(`Empty response from ${candidateModel}`);
    }
    if (requireNonEmptyArray) {
      const start = text.indexOf('[');
      const end = text.lastIndexOf(']');
      if (start === -1 || end === -1 || end <= start) {
        throw new Error(`Non-array response from ${candidateModel}`);
      }
      const parsed = JSON.parse(text.slice(start, end + 1));
      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error(`Empty array [] from ${candidateModel}`);
      }
    }
    return res;
  };

  // Run primary fast model first, and hedge with fallback if primary takes >3.5s or fails
  try {
    return await Promise.any(
      fallbackChain.map((candidateModel, idx) =>
        callSingleModel(candidateModel, idx * 3500)
      )
    );
  } catch (err: unknown) {
    if (err instanceof AggregateError && err.errors.length > 0) {
      // If all models returned empty array [], return a synthetic empty array response
      const allEmptyArray = err.errors.every(
        (e) => e instanceof Error && e.message.startsWith('Empty array []')
      );
      if (allEmptyArray) {
        return { text: '[]' };
      }
      throw err.errors[0];
    }
    throw err;
  }
}

const ANNA_SYSTEM_PROMPT = `You are Anna, the friendly Kannada tutor in the Kaliyona app.

WHO YOU ARE:
You are Anna, the dedicated Kannada tutor in the Kaliyona app. You are NOT an auto-rickshaw avatar or auto driver — your role is a warm, friendly Kannada tutor helping learners speak everyday Bengaluru Kannada.

## TEACHING LEVEL — BEGINNER ONLY (STRICT)
- The Kannada phrase you teach must be SHORT: maximum 5-7 words — something a learner can repeat after hearing it ONCE
- If the situation needs a long sentence, teach ONLY the short core phrase — never dump a full complex sentence
- Use the most common everyday spoken version — no bookish words, no complex grammar, no rare vocabulary
- Never add filler like "sir", "yaavagaalu", honorifics unless the user specifically asks about politeness levels
- Teach ONE phrase per reply — never two phrases at once
- After the phrase, in the English explanation give quick word-by-word meaning so the learner can build it themselves

## REPLY FORMAT — TWO-PART (STRICT)
Every teaching reply follows this exact structure:
- Part 1 (Spoken Kannada line -> "kanglish" & "script"): ONLY the pure Kannada phrase (max 5-7 words). Never mix English/Hindi explanation into "kanglish". This is the ONLY part Anna speaks aloud.
- Part 2 (Written English Explanation -> "english"): Explain in clear, friendly ENGLISH only (even if the user wrote in Hindi/Hinglish/English) — meaning, quick word-by-word breakdown, and when to say it. This is displayed as text below the voice message and never spoken aloud.

Example for "hotel mein bill mangana hai":
- kanglish: "Bill kodi"
- script: "ಬಿಲ್ ಕೊಡಿ"
- english: "Means \\"give the bill\\" — 'kodi' = give. Say this to the waiter when you are ready to pay."

Example for "how do I order coffee":
- kanglish: "Ondu coffee kodi"
- script: "ಒಂದು ಕಾಫಿ ಕೊಡಿ"
- english: "Means \\"give me one coffee\\" — 'ondu' = one, 'kodi' = give. Works for anything: ondu tea kodi, ondu dosa kodi."

Example for "auto wala extra maang raha hai":
- kanglish: "Metre mele hattu jasti"
- script: "ಮೀಟರ್ ಮೇಲೆ ಹತ್ತು ಜಾಸ್ತಿ"
- english: "Means \\"ten extra on the meter\\" — 'metre mele' = on the meter, 'hattu jasti' = ten extra. Say this directly to the auto driver."

CRITICAL RULES:
1. Kannada line ("kanglish" + "script") = pure Kannada phrase only (max 5-7 words), never mix English/Hindi into it.
2. Explanation ("english") = always in clear English only (never Hinglish or Hindi), with overall meaning + quick word-by-word breakdown + when to say it.
3. Always reply in STRICT JSON:
   {"kanglish": "...", "script": "...", "english": "...", "correction": "..." | null, "mood": "happy" | "neutral" | "excited" | "thinking"}`;

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '25mb' }));

  // =========================================================================
  // POST /api/reader/scan — City Reader Gemini Vision Endpoint (gemini-3.5-flash-lite)
  // =========================================================================
  app.post('/api/reader/scan', async (req, res) => {
    try {
      const { imageBase64, prompt, model, clientApiKey } = req.body || {};
      if (!imageBase64 || typeof imageBase64 !== 'string') {
        res.status(400).json({ error: 'Missing imageBase64' });
        return;
      }

      const cleanedBase64 = imageBase64.startsWith('data:')
        ? imageBase64.slice(imageBase64.indexOf(',') + 1).trim()
        : imageBase64.trim();

      const promptText =
        typeof prompt === 'string' && prompt.trim()
          ? prompt
          : 'Find every distinct Kannada word, line, or short phrase in this image (including signs, bus boards, menus, banners, and news/meme captions) and return a JSON array of {kn, translit, en, box: [ymin, xmin, ymax, xmax]}.';

      // clientApiKey belongs to the Kimi/OpenAI-compatible provider. Gemini
      // fallback must use the server-side Gemini environment key instead.
      const ai = getGenAIClient();
      if (!ai) {
        const apinexText = await callApinexServerVision(
          cleanedBase64,
          promptText
        );
        if (apinexText) {
          res.json({ rawText: apinexText, provider: 'apinex' });
        } else {
          res.status(200).json({ fallback: true, rawText: '' });
        }
        return;
      }

      const response = await generateContentWithFallback(
        ai,
        {
          model: resolveBrainModel(model || 'gemini-3.5-flash-lite'),
          contents: [
            {
              role: 'user',
              parts: [
                {
                  inlineData: {
                    mimeType: 'image/jpeg',
                    data: cleanedBase64,
                  },
                },
                {
                  text: promptText,
                },
              ],
            },
          ],
          config: {
            responseMimeType: 'application/json',
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
        },
        true
      );

      res.json({ rawText: response.text || '[]' });
    } catch (err: unknown) {
      const apinexText = await callApinexServerVision(
        typeof req.body?.imageBase64 === 'string'
          ? req.body.imageBase64.startsWith('data:')
            ? req.body.imageBase64
                .slice(req.body.imageBase64.indexOf(',') + 1)
                .trim()
            : req.body.imageBase64.trim()
          : '',
        typeof req.body?.prompt === 'string' && req.body.prompt.trim()
          ? req.body.prompt
          : 'Find every distinct Kannada word, line, or short phrase in this image and return a JSON array of {kn, translit, en, box: [ymin, xmin, ymax, xmax]}. '
      );
      if (apinexText) {
        res.json({ rawText: apinexText, provider: 'apinex' });
        return;
      }
      const errorObj = err as { status?: number; message?: string };
      if (
        errorObj?.status === 429 ||
        (typeof errorObj?.message === 'string' &&
          (errorObj.message.includes('429') ||
            errorObj.message.includes('RESOURCE_EXHAUSTED')))
      ) {
        res.status(429).json({ error: 'Rate limit exceeded' });
        return;
      }
      const message = err instanceof Error ? err.message : 'Unknown error';
      res.status(500).json({ error: message });
    }
  });

  // =========================================================================
  // POST /api/anna/chat — MODULE 2A: Anna Conversational Brain
  // =========================================================================
  app.post('/api/anna/chat', async (req, res) => {
    try {
      const {
        userTranscript,
        history,
        model,
        persona,
        clientApiKey,
        clientBaseUrl,
        clientModel,
      } =
        req.body || {};
      if (!userTranscript || typeof userTranscript !== 'string') {
        res.status(400).json({ error: 'Missing userTranscript' });
        return;
      }

      // Prefer Kimi K3/OpenAI-compatible Anna when a server key is configured.
      // This keeps the production key out of the browser and fixes hosted
      // deployments where the old route only knew about Gemini.
      const openAiConfig = getAnnaOpenAiConfig(
        clientApiKey,
        clientBaseUrl,
        clientModel
      );
      if (openAiConfig.apiKey) {
        try {
          const rawText = await requestAnnaOpenAiCompletion(
            openAiConfig,
            buildAnnaOpenAiMessages(userTranscript, history, persona)
          );
          res.json({ rawText, provider: 'kimi' });
          return;
        } catch (providerError) {
          console.warn(
            '[server /api/anna/chat] Kimi provider failed; trying Gemini fallback:',
            providerError
          );

          // A stale browser key must not block a valid server-side key. Retry
          // once with the deployment key before switching providers.
          const serverConfig = getAnnaOpenAiConfig(
            undefined,
            clientBaseUrl,
            clientModel
          );
          if (
            serverConfig.apiKey &&
            serverConfig.apiKey !== openAiConfig.apiKey
          ) {
            try {
              const rawText = await requestAnnaOpenAiCompletion(
                serverConfig,
                buildAnnaOpenAiMessages(userTranscript, history, persona)
              );
              res.json({ rawText, provider: 'kimi' });
              return;
            } catch (serverProviderError) {
              console.warn(
                '[server /api/anna/chat] Server Kimi key failed; trying Gemini fallback:',
                serverProviderError
              );
            }
          }
        }
      }

      // clientApiKey belongs to the Kimi/OpenAI-compatible provider. Never
      // pass it to Gemini as a fallback; use the server-side Gemini key.
      const ai = getGenAIClient();
      if (!ai) {
        res.status(503).json({
          error:
            'Anna provider is not configured. Set ANNA_API_KEY/KIMI_API_KEY or GEMINI_API_KEY on the host.',
        });
        return;
      }

      const recentHistory = Array.isArray(history) ? history.slice(-8) : [];
      const speakerLabel =
        persona && typeof persona.title === 'string' && persona.title.trim()
          ? persona.title.trim()
          : 'Anna';

      const historyLines = recentHistory
        .map(
          (turn: {
            role?: string;
            text?: string;
            kanglish?: string;
            english?: string;
          }) => {
            const speaker = turn.role === 'anna' ? speakerLabel : 'Learner';
            const content =
              turn.role === 'anna'
                ? `${turn.kanglish || turn.text || ''} (EN: ${turn.english || ''})`
                : turn.text || '';
            return `${speaker}: ${content}`;
          }
        )
        .join('\n');

      const personaInstruction =
        persona && typeof persona.title === 'string' && persona.title.trim()
          ? `\n\nACTIVE ROLEPLAY ROLE: "${persona.title}" (${persona.tagline || 'Bengaluru local'}).\nStay 100% in character as a real Bengaluru ${persona.title}. Answer the learner's exact English or Kanglish question/request directly (e.g. if you are a Waiter, take their food/coffee order, answer menu/price/bill questions; if you are a Ticket Conductor, issue bus tickets, tell fares and stops; if you are an Auto Driver, discuss meter, fare, and route; if you are a Shopkeeper, help with groceries, prices, and UPI). In the "english" field, translate your reply and briefly show how the learner can say their English sentence in Kannada.`
          : '';

      const prompt = historyLines
        ? `Recent conversation (last ${recentHistory.length} turns):\n${historyLines}\n\nLearner: ${userTranscript}\n\nThink carefully about what the learner just said or asked, and respond directly as ${speakerLabel} in STRICT JSON:`
        : `Learner: ${userTranscript}\n\nThink carefully about what the learner just said or asked, and respond directly as ${speakerLabel} in STRICT JSON:`;

      const response = await generateContentWithFallback(ai, {
        model: resolveBrainModel(model),
        contents: prompt,
        config: {
          systemInstruction: `${ANNA_SYSTEM_PROMPT}${personaInstruction}`,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              kanglish: {
                type: Type.STRING,
                description:
                  'Short 1-2 sentence reply in romanized Bengaluru Kanglish answering the learner directly and contextually.',
              },
              script: {
                type: Type.STRING,
                description:
                  'The exact Kanglish reply written in native Kannada script (e.g. ಹೌದು ಗುರು!) for authentic speech pronunciation.',
              },
              english: {
                type: Type.STRING,
                description:
                  "Faithful English translation of the Kanglish reply.",
              },
              correction: {
                type: Type.STRING,
                nullable: true,
                description:
                  'One gentle correction if learner Kanglish was broken, or null.',
              },
              mood: {
                type: Type.STRING,
                description: 'One of: happy, neutral, excited, thinking.',
              },
            },
            required: ['kanglish', 'script', 'english', 'mood'],
          },
        },
      });

      const rawText = response.text || '';
      try {
        const cleaned = rawText
          .trim()
          .replace(/^```(?:json)?\s*/i, '')
          .replace(/\s*```$/, '');
        const parsed = JSON.parse(cleaned);
        if (!parsed.script || typeof parsed.script !== 'string' || !parsed.script.trim()) {
          parsed.script = parsed.kanglish || '';
        }
        res.json({ rawText: JSON.stringify(parsed) });
        return;
      } catch (jsonErr) {
        console.warn(
          '[server /api/anna/chat] Model response JSON parse failed:',
          jsonErr,
          rawText
        );
        res.status(500).json({ error: 'Invalid JSON model response' });
        return;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.warn('[server /api/anna/chat] Error generating content:', err);
      const status = Number((err as { status?: number })?.status);
      res.status(status >= 400 && status < 600 ? status : 500).json({
        error: message,
      });
    }
  });

  // =========================================================================
  // POST /api/anna/score-speak — MODULE 2B: Semantic Speak Exercise Scoring
  // =========================================================================
  app.post('/api/anna/score-speak', async (req, res) => {
    try {
      const { targetKn, userTranscript, model, clientApiKey } = req.body || {};
      if (!targetKn || !userTranscript) {
        res.status(400).json({ error: 'Missing targetKn or userTranscript' });
        return;
      }

      const ai = getGenAIClient(clientApiKey);
      if (!ai) {
        res.status(503).json({ error: 'Gemini API key not configured' });
        return;
      }

      const prompt = `Target sentence: '${targetKn}'. Learner said: '${userTranscript}' (may be Kannada script or romanized, may have recognition errors). Do they mean the same? Output STRICT JSON: {"match": true|false, "feedback": "one short encouraging line in English"}`;

      const response = await generateContentWithFallback(ai, {
        model: resolveBrainModel(model),
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              match: {
                type: Type.BOOLEAN,
                description:
                  'True if the learner utterance means the same or is a close spoken attempt at the target Kannada/Kanglish phrase.',
              },
              feedback: {
                type: Type.STRING,
                description: 'One short encouraging line in English.',
              },
            },
            required: ['match', 'feedback'],
          },
        },
      });

      res.json({ rawText: response.text || '' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.warn('[server /api/anna/score-speak] Error scoring speak:', err);
      res.status(500).json({ error: message });
    }
  });

  // =========================================================================
  // MODULE 3: Nano Banana (gemini-3.1-flash-lite-image) Doodle Image Generator
  // =========================================================================
  const doodlesDir = path.join(__dirname, 'public', 'assets', 'doodles');
  try {
    fs.mkdirSync(doodlesDir, { recursive: true });
  } catch {
    // Ignore directory creation errors
  }
  app.use(
    '/assets/doodles',
    express.static(doodlesDir, {
      maxAge: '365d',
      immutable: true,
    })
  );

  app.get('/api/doodles/manifest', (_req, res) => {
    try {
      const files = fs.existsSync(doodlesDir) ? fs.readdirSync(doodlesDir) : [];
      const manifest: Record<string, string> = {};
      for (const file of files) {
        if (file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.webp')) {
          const id = file.replace(/\.(png|jpg|webp)$/i, '');
          manifest[id] = `/assets/doodles/${file}`;
        }
      }
      res.json({ manifest });
    } catch {
      res.json({ manifest: {} });
    }
  });

  let nanoBananaCooldownUntil = 0;

  app.post('/api/doodles/nano-banana', async (req, res) => {
    try {
      const { doodleId, prompt, clientApiKey } = req.body || {};
      if (!doodleId || typeof doodleId !== 'string' || !prompt || typeof prompt !== 'string') {
        res.status(200).json({ imageUrl: null, quotaLimited: true });
        return;
      }

      const safeId = doodleId.replace(/[^a-zA-Z0-9_-]/g, '_');
      const existingFile = path.join(doodlesDir, `${safeId}.png`);
      if (fs.existsSync(existingFile)) {
        res.json({ imageUrl: `/assets/doodles/${safeId}.png`, cached: true });
        return;
      }

      if (Date.now() < nanoBananaCooldownUntil) {
        res.status(200).json({ imageUrl: null, quotaLimited: true });
        return;
      }

      const ai = getGenAIClient(clientApiKey);
      if (!ai) {
        res.status(200).json({ imageUrl: null, quotaLimited: true });
        return;
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite-image',
        contents: {
          parts: [
            {
              text: prompt,
            },
          ],
        },
        config: {
          imageConfig: {
            aspectRatio: '1:1',
          },
        },
      });

      const parts = response.candidates?.[0]?.content?.parts || [];
      let base64Image = '';
      for (const part of parts) {
        if (part.inlineData?.data) {
          base64Image = part.inlineData.data;
          break;
        }
      }

      if (!base64Image) {
        res.status(200).json({ imageUrl: null, quotaLimited: true });
        return;
      }

      const buffer = Buffer.from(base64Image, 'base64');
      try {
        fs.writeFileSync(existingFile, buffer);
        res.json({ imageUrl: `/assets/doodles/${safeId}.png`, cached: false });
      } catch {
        res.json({
          imageUrl: `data:image/png;base64,${base64Image}`,
          cached: false,
        });
      }
    } catch {
      // If the active key is on Free Tier (limit: 0 for gemini-3.1-flash-lite-image) or rate-limited,
      // enter cooldown silently and return a clean 200 fallback response so the client uses rasterized PNG/SVG images.
      nanoBananaCooldownUntil = Date.now() + 10 * 60 * 1000;
      res.status(200).json({ imageUrl: null, quotaLimited: true });
    }
  });

  const server = http.createServer(app);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let vite: any = null;
  const distPath = path.join(__dirname, 'dist');
  let servedViaVite = false;
  if (process.env.NODE_ENV !== 'production') {
    try {
      const { createServer: createViteServer } = await import('vite');
      vite = await createViteServer({
        server: {
          middlewareMode: true,
          hmr: process.env.DISABLE_HMR === 'true' ? false : { server },
        },
        appType: 'spa',
      });
      app.use(vite.middlewares);
      servedViaVite = true;
    } catch {
      servedViaVite = false;
    }
  }
  if (!servedViaVite) {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // =========================================================================
  // WS /api/anna/live-transcribe — MODULE 1: Gemini Transcribe Live Bridge
  // =========================================================================
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const pathname = request.url ? request.url.split('?')[0] : '';
    if (pathname === '/api/anna/live-transcribe') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else if (vite?.ws) {
      try {
        vite.ws.handleUpgrade(request, socket, head);
      } catch {
        // Ignore unhandled upgrade
      }
    }
  });

  wss.on('connection', async (clientWs: WebSocket, request) => {
    const urlObj = new URL(
      request.url || '',
      `http://${request.headers.host || 'localhost'}`
    );
    const clientKey = urlObj.searchParams.get('key') || undefined;
    const requestedModel =
      urlObj.searchParams.get('model') || 'gemini-3.5-transcribe-live';

    const ai = getGenAIClient(clientKey);
    if (!ai) {
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(
          JSON.stringify({
            type: 'error',
            error: 'Gemini API key not available on server',
          })
        );
        clientWs.close();
      }
      return;
    }

    let accumulatedTranscript = '';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let liveSession: any = null;
    let isClosed = false;

    try {
      const sessionPromise = ai.live.connect({
        model: requestedModel,
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          systemInstruction:
            'You are a speech transcription receiver for Kannada and English (Kanglish). Listen to the user audio.',
        },
        callbacks: {
          onmessage: (message: LiveServerMessage) => {
            if (isClosed || clientWs.readyState !== WebSocket.OPEN) return;

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const serverContent = (message as any)?.serverContent;
            const inputText =
              serverContent?.inputTranscription?.text ||
              serverContent?.inputAudioTranscription?.text ||
              '';

            if (inputText) {
              accumulatedTranscript =
                `${accumulatedTranscript} ${inputText}`.trim();
              clientWs.send(
                JSON.stringify({
                  type: 'partial',
                  transcript: accumulatedTranscript,
                })
              );
            }
          },
          onerror: () => {
            if (!isClosed && clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(
                JSON.stringify({
                  type: 'error',
                  error: 'Live transcription session error',
                })
              );
            }
          },
          onclose: () => {
            if (!isClosed && clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(
                JSON.stringify({
                  type: 'final',
                  transcript: accumulatedTranscript.trim(),
                })
              );
            }
          },
        },
      });

      liveSession = await sessionPromise;

      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify({ type: 'ready' }));
      }

      clientWs.on('message', (raw) => {
        try {
          const parsed = JSON.parse(raw.toString());
          if (parsed.type === 'audio' && parsed.audio && liveSession) {
            liveSession.sendRealtimeInput({
              audio: {
                data: parsed.audio,
                mimeType: 'audio/pcm;rate=16000',
              },
            });
          } else if (parsed.type === 'stop') {
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(
                JSON.stringify({
                  type: 'final',
                  transcript: accumulatedTranscript.trim(),
                })
              );
            }
            if (liveSession) {
              try {
                liveSession.close();
              } catch {
                // Ignore close errors
              }
              liveSession = null;
            }
          }
        } catch {
          // Ignore malformed client frames
        }
      });

      clientWs.on('close', () => {
        isClosed = true;
        if (liveSession) {
          try {
            liveSession.close();
          } catch {
            // Ignore close errors
          }
          liveSession = null;
        }
      });
    } catch (err) {
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(
          JSON.stringify({
            type: 'error',
            error:
              err instanceof Error
                ? err.message
                : 'Failed to connect to Gemini Transcribe Live',
          })
        );
        clientWs.close();
      }
    }
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Kanglish Server] Listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
