import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';

function isPlaceholderKey(val?: string): boolean {
  if (!val) return true;
  const trimmed = val.trim();
  return (
    !trimmed ||
    trimmed === 'PASTE_KEY_HERE' ||
    trimmed === 'MY_GEMINI_API_KEY' ||
    trimmed === 'YOUR_DEMO_API_KEY_HERE' ||
    trimmed === 'YOUR_KIMI_K3_API_KEY' ||
    trimmed === '<key>' ||
    trimmed === 'YOUR_API_KEY'
  );
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

    const ai = getGenAIClient(clientApiKey);
    if (!ai) {
      res.status(200).json({ fallback: true, rawText: '' });
      return;
    }

    const fallbackModels = [
      'gemini-3-flash-preview',
      'gemini-2.5-flash',
      'gemini-flash-latest',
      'gemini-3.1-flash-lite-preview',
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
                text:
                  typeof prompt === 'string' && prompt.trim()
                    ? prompt
                    : 'Find every distinct Kannada word, line, or short phrase in this image (including signs, bus boards, menus, banners, and news/meme captions) and return a JSON array of {kn, translit, en, box: [ymin, xmin, ymax, xmax]}.',
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
          callModel(candidateModel, idx * 2500)
        )
      );
      res.status(200).json({ rawText: response.text || '[]' });
    } catch (aggErr: unknown) {
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
