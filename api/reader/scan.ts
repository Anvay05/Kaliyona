import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';

const GEMINI_VISION_MODEL = 'gemini-3.5-flash-lite';
const APINEX_VISION_MODELS = ['free/gemini-3.8-flash', 'free/kimi-k3'];

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

function firstConfiguredEnv(names: string[]): string {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value && !isPlaceholderKey(value)) return value;
  }
  return '';
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

function getGenAIClient(overrideKey?: string): GoogleGenAI | null {
  const candidates = [
    overrideKey,
    process.env.GEMINI_API_KEY,
    process.env.VITE_GEMINI_API_KEY,
    process.env.GOOGLE_API_KEY,
    process.env.API_KEY,
  ];
  const rawKey = candidates.find((k) => !isPlaceholderKey(k))?.trim() || '';
  if (!rawKey) return null;

  return new GoogleGenAI({
    apiKey: rawKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
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

async function callApinexServerVision(
  cleanedBase64: string,
  promptText: string,
  apiKey: string
): Promise<string | null> {
  for (const model of APINEX_VISION_MODELS) {
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

// Vercel / Serverless Node handler for POST /api/reader/scan
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const { imageBase64, prompt, clientApiKey } = body;

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

    const ai = getGenAIClient(clientApiKey);
    const apinexKey = getApinexApiKey();
    if (!ai) {
      const apinexText = apinexKey
        ? await callApinexServerVision(cleanedBase64, promptText, apinexKey)
        : null;
      if (apinexText) {
        res.status(200).json({ rawText: apinexText, provider: 'apinex' });
      } else {
        res.status(200).json({ fallback: true, rawText: '' });
      }
      return;
    }

    const fallbackModels = [
      GEMINI_VISION_MODEL,
      'gemini-2.5-flash',
      'gemini-flash-latest',
    ];

    const callModel = async (candidateModel: string, delayMs: number) => {
      if (delayMs > 0) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
      const thinkingConfig = getThinkingConfigForModel(candidateModel);
      const response = await ai.models.generateContent({
        model: candidateModel,
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
      if (!text) {
        throw new Error(`Empty response from ${candidateModel}`);
      }
      const start = text.indexOf('[');
      const end = text.lastIndexOf(']');
      if (start === -1 || end === -1 || end <= start) {
        throw new Error(`Non-array response from ${candidateModel}`);
      }
      const parsed = JSON.parse(text.slice(start, end + 1));
      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error(`Empty array [] from ${candidateModel}`);
      }
      return response;
    };

    try {
      const response = await Promise.any(
        fallbackModels.map((candidateModel, idx) =>
          callModel(candidateModel, idx * 2000)
        )
      );
      res.status(200).json({ rawText: response.text || '[]' });
    } catch (aggErr: unknown) {
      if (apinexKey) {
        const apinexText = await callApinexServerVision(
          cleanedBase64,
          promptText,
          apinexKey
        );
        if (apinexText) {
          res.status(200).json({ rawText: apinexText, provider: 'apinex' });
          return;
        }
      }
      if (aggErr instanceof AggregateError && aggErr.errors.length > 0) {
        const allEmpty = aggErr.errors.every(
          (e) => e instanceof Error && e.message.startsWith('Empty array []')
        );
        if (allEmpty) {
          res.status(200).json({ rawText: '[]' });
          return;
        }
        throw aggErr.errors[0];
      }
      throw aggErr;
    }
  } catch (err: unknown) {
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
}
