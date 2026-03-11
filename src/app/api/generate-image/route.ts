import { NextRequest, NextResponse } from 'next/server';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

export const runtime = 'nodejs';

const PROXYAPI_KEY = process.env.PROXYAPI_KEY || '';
const BASE_URL_ENV = process.env.PROXYAPI_BASE_URL?.trim();
const PROXYAPI_BASE_URLS = BASE_URL_ENV
  ? [BASE_URL_ENV]
  : ['https://api.proxyapi.ru/openai/v1', 'https://openai.api.proxyapi.ru/v1'];
const GEMINI_IMAGE_MODEL =
  process.env.GEMINI_IMAGE_MODEL || 'gemini/gemini-2.5-flash-image';
const GEMINI_NATIVE_ENDPOINT =
  process.env.GEMINI_NATIVE_ENDPOINT ||
  'https://api.proxyapi.ru/google/v1beta/models/gemini-2.5-flash-image:generateContent';
const MODEL_CANDIDATES = [GEMINI_IMAGE_MODEL].filter((v, i, a) => a.indexOf(v) === i);

function detectExt(buf: Buffer): 'png' | 'jpg' | 'webp' {
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'png';
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  return 'png';
}

function mimeFromExt(ext: 'png' | 'jpg' | 'webp'): string {
  if (ext === 'jpg') return 'image/jpeg';
  if (ext === 'webp') return 'image/webp';
  return 'image/png';
}

function mapAspectRatioByOrientation(orientation?: string): '9:16' | '16:9' | '1:1' {
  if (orientation === 'landscape') return '16:9';
  if (orientation === 'square') return '1:1';
  return '9:16';
}

async function callGeminiNative(
  prompt: string,
  orientation?: string,
  referencePhoto?: string
): Promise<{ imageBuffer: Buffer; ext: 'png' | 'jpg' | 'webp'; endpoint: string; model: string }> {
  const parts: Array<Record<string, unknown>> = [{ text: prompt }];

  if (referencePhoto?.startsWith('data:image/')) {
    const match = referencePhoto.match(/^data:(image\/[\w+.-]+);base64,(.+)$/);
    if (match) {
      parts.push({
        inlineData: {
          mimeType: match[1],
          data: match[2],
        },
      });
    }
  }

  const payload = {
    contents: [{ parts }],
    generationConfig: {
      responseModalities: ['IMAGE', 'TEXT'],
      imageConfig: {
        aspectRatio: mapAspectRatioByOrientation(orientation),
      },
    },
  };

  const resp = await fetch(GEMINI_NATIVE_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${PROXYAPI_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(45000),
  });

  const text = await resp.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`native non-JSON (HTTP ${resp.status}): ${text.slice(0, 300)}`);
  }

  if (!resp.ok) {
    throw new Error(data?.error?.message || `native HTTP ${resp.status} body=${text.slice(0, 240)}`);
  }

  const responseParts = data?.candidates?.[0]?.content?.parts || [];
  for (const part of responseParts) {
    const inline = part?.inlineData || part?.inline_data;
    if (inline?.data) {
      const imageBuffer = Buffer.from(inline.data, 'base64');
      return {
        imageBuffer,
        ext: detectExt(imageBuffer),
        endpoint: GEMINI_NATIVE_ENDPOINT,
        model: 'gemini-2.5-flash-image(native)',
      };
    }
  }

  throw new Error(`native empty image parts body=${text.slice(0, 240)}`);
}

async function callGeminiViaOpenAICompat(prompt: string): Promise<{ imageBuffer: Buffer; ext: 'png' | 'jpg' | 'webp'; endpoint: string; model: string }> {
  const errors: string[] = [];

  for (const baseUrl of PROXYAPI_BASE_URLS) {
    const endpoint = `${baseUrl.replace(/\/$/, '')}/images/generations`;

    for (const model of MODEL_CANDIDATES) {
      const payload = {
        model,
        prompt,
        n: 1,
        size: '1024x1024',
      };

      try {
        const resp = await fetch(endpoint, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${PROXYAPI_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(45000),
        });

        const text = await resp.text();
        let data: any;
        try {
          data = JSON.parse(text);
        } catch {
          throw new Error(`non-JSON response (HTTP ${resp.status}): ${text.slice(0, 300)}`);
        }

        if (!resp.ok) {
          throw new Error(data?.error?.message || `HTTP ${resp.status} body=${text.slice(0, 240)}`);
        }

        const item = data?.data?.[0] ?? data?.output?.[0];
        if (!item) {
          throw new Error(`empty data[] body=${text.slice(0, 240)}`);
        }

        if (item.b64_json) {
          const imageBuffer = Buffer.from(item.b64_json, 'base64');
          return { imageBuffer, ext: detectExt(imageBuffer), endpoint, model };
        }

        if (item.url) {
          const imgResp = await fetch(item.url, { signal: AbortSignal.timeout(45000) });
          if (!imgResp.ok) {
            throw new Error(`image download HTTP ${imgResp.status}`);
          }
          const arr = await imgResp.arrayBuffer();
          const imageBuffer = Buffer.from(arr);
          return { imageBuffer, ext: detectExt(imageBuffer), endpoint, model };
        }

        throw new Error(`no b64_json/url in response body=${text.slice(0, 240)}`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`${endpoint} [${model}] -> ${msg}`);
      }
    }
  }

  throw new Error(`ProxyAPI endpoints unavailable: ${errors.join(' | ')}`);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, storyId, chapterNumber, referencePhotos, orientation } = body;
    const firstReferencePhoto = Array.isArray(referencePhotos) ? referencePhotos[0] : undefined;

    if (!prompt || !storyId || chapterNumber === undefined) {
      return NextResponse.json(
        { error: 'prompt, storyId и chapterNumber обязательны' },
        { status: 400 }
      );
    }

    if (!PROXYAPI_KEY) {
      return NextResponse.json({ error: 'PROXYAPI_KEY не настроен' }, { status: 500 });
    }

    const enhancedPrompt = `Children's book watercolor illustration. ${prompt}. Full scene with rich detailed background, soft ink outlines, warm gentle lighting, hand-painted storybook style. Not a close-up portrait.`;

    let imageResult: { imageBuffer: Buffer; ext: 'png' | 'jpg' | 'webp'; endpoint: string; model: string };

    if (firstReferencePhoto) {
      // Для режима с reference-photo сразу используем native Gemini с inlineData.
      imageResult = await callGeminiNative(enhancedPrompt, orientation, firstReferencePhoto);
    } else {
      try {
        imageResult = await callGeminiViaOpenAICompat(enhancedPrompt);
      } catch (openAiCompatError) {
        console.warn('OpenAI-compatible Gemini failed, trying native Gemini endpoint...');
        imageResult = await callGeminiNative(enhancedPrompt, orientation);
      }
    }

    const { imageBuffer, ext, endpoint, model } = imageResult;

    const outputDir = process.env.GENERATED_OUTPUT_DIR || join(process.cwd(), 'public', 'generated');
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    const filename = `${storyId}-ch${chapterNumber}-${Date.now()}.${ext}`;
    const filePath = join(outputDir, filename);
    writeFileSync(filePath, imageBuffer);

    const mime = mimeFromExt(ext);
    const imageDataUrl = `data:${mime};base64,${imageBuffer.toString('base64')}`;

    return NextResponse.json({
      success: true,
      image_url: `/generated/${filename}`,
      image_data_url: imageDataUrl,
      provider: `proxyapi-openai/${model}`,
      endpoint,
    });
  } catch (error) {
    console.error('Image generation error:', error);
    const message = error instanceof Error ? error.message : 'Ошибка генерации картинки';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
