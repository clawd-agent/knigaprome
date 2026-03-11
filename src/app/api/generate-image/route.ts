import { NextRequest, NextResponse } from 'next/server';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const PROXYAPI_KEY = process.env.PROXYAPI_KEY || '';
const OPENAI_IMAGE_ENDPOINT =
  process.env.OPENAI_IMAGE_ENDPOINT || 'https://openai.api.proxyapi.ru/v1/images/generations';
const GEMINI_IMAGE_MODEL =
  process.env.GEMINI_IMAGE_MODEL || 'gemini/gemini-2.5-flash-image';

function detectExt(buf: Buffer): 'png' | 'jpg' | 'webp' {
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'png';
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  return 'png';
}

async function callGeminiViaOpenAICompat(prompt: string): Promise<{ imageBuffer: Buffer; ext: 'png' | 'jpg' | 'webp' }> {
  const payload = {
    model: GEMINI_IMAGE_MODEL,
    prompt,
    n: 1,
    response_format: 'b64_json',
  };

  const resp = await fetch(OPENAI_IMAGE_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${PROXYAPI_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const text = await resp.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`ProxyAPI non-JSON response (HTTP ${resp.status}): ${text.slice(0, 300)}`);
  }

  if (!resp.ok) {
    throw new Error(data?.error?.message || `ProxyAPI HTTP ${resp.status}`);
  }

  const item = data?.data?.[0];
  if (!item) {
    throw new Error('Gemini(OpenAI-compat): empty data[]');
  }

  if (item.b64_json) {
    const imageBuffer = Buffer.from(item.b64_json, 'base64');
    return { imageBuffer, ext: detectExt(imageBuffer) };
  }

  if (item.url) {
    const imgResp = await fetch(item.url);
    if (!imgResp.ok) {
      throw new Error(`Failed to download generated image: HTTP ${imgResp.status}`);
    }
    const arr = await imgResp.arrayBuffer();
    const imageBuffer = Buffer.from(arr);
    return { imageBuffer, ext: detectExt(imageBuffer) };
  }

  throw new Error('Gemini(OpenAI-compat): no b64_json/url in response');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, storyId, chapterNumber, referencePhotos } = body;

    if (!prompt || !storyId || chapterNumber === undefined) {
      return NextResponse.json(
        { error: 'prompt, storyId и chapterNumber обязательны' },
        { status: 400 }
      );
    }

    if (!PROXYAPI_KEY) {
      return NextResponse.json({ error: 'PROXYAPI_KEY не настроен' }, { status: 500 });
    }

    if (Array.isArray(referencePhotos) && referencePhotos.length > 0) {
      return NextResponse.json(
        {
          error:
            'Референс-фото для этого endpoint пока не поддерживается. Используйте text-to-image режим без referencePhotos.',
        },
        { status: 400 }
      );
    }

    const enhancedPrompt = `Children's book watercolor illustration. ${prompt}. Full scene with rich detailed background, soft ink outlines, warm gentle lighting, hand-painted storybook style. Not a close-up portrait.`;

    const { imageBuffer, ext } = await callGeminiViaOpenAICompat(enhancedPrompt);

    const outputDir = process.env.GENERATED_OUTPUT_DIR || join(process.cwd(), 'public', 'generated');
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    const filename = `${storyId}-ch${chapterNumber}-${Date.now()}.${ext}`;
    const filePath = join(outputDir, filename);
    writeFileSync(filePath, imageBuffer);

    return NextResponse.json({
      success: true,
      image_url: `/generated/${filename}`,
      provider: `proxyapi-openai/${GEMINI_IMAGE_MODEL}`,
    });
  } catch (error) {
    console.error('Image generation error:', error);
    const message = error instanceof Error ? error.message : 'Ошибка генерации картинки';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
