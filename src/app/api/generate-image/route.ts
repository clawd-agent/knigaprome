import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const PROXYAPI_KEY = process.env.PROXYAPI_KEY || '';
const GEMINI_IMAGE_ENDPOINT =
  'https://api.proxyapi.ru/google/v1beta/models/gemini-2.5-flash-image:generateContent';

function mapAspectRatioByOrientation(orientation?: string): '9:16' | '16:9' | '1:1' {
  if (orientation === 'landscape') return '16:9';
  if (orientation === 'square') return '1:1';
  return '9:16';
}

function callGeminiFlashImage(prompt: string, aspectRatio: string, referencePhoto?: string): { imageBuffer: Buffer; ext: 'png' | 'jpg' } {
  const parts: Array<Record<string, unknown>> = [{ text: `Generate one children book illustration: ${prompt}` }];

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

  const payload = JSON.stringify({
    contents: [{ parts }],
    generationConfig: {
      responseModalities: ['IMAGE', 'TEXT'],
      imageConfig: {
        aspectRatio,
      },
    },
  });

  const payloadPath = `/tmp/gemini-image-payload-${Date.now()}.json`;
  writeFileSync(payloadPath, payload);

  const raw = execSync(
    `curl -s -X POST "${GEMINI_IMAGE_ENDPOINT}" \\
      -H "Authorization: Bearer ${PROXYAPI_KEY}" \\
      -H "Content-Type: application/json" \\
      -d @${payloadPath}`,
    {
      encoding: 'utf-8',
      timeout: 120000,
      maxBuffer: 30 * 1024 * 1024,
    }
  );

  const data = JSON.parse(raw);
  const responseParts = data?.candidates?.[0]?.content?.parts || [];

  for (const part of responseParts) {
    const inline = part.inlineData || part.inline_data;
    if (inline?.data) {
      const mimeType = inline.mimeType || inline.mime_type || 'image/png';
      return {
        imageBuffer: Buffer.from(inline.data, 'base64'),
        ext: mimeType.includes('jpeg') || mimeType.includes('jpg') ? 'jpg' : 'png',
      };
    }
  }

  throw new Error('Gemini не вернул изображение');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, storyId, chapterNumber, orientation, referencePhotos } = body;

    if (!prompt || !storyId || chapterNumber === undefined) {
      return NextResponse.json(
        { error: 'prompt, storyId и chapterNumber обязательны' },
        { status: 400 }
      );
    }

    if (!PROXYAPI_KEY) {
      return NextResponse.json(
        { error: 'PROXYAPI_KEY не настроен' },
        { status: 500 }
      );
    }

    const aspectRatio = mapAspectRatioByOrientation(orientation);
    const enhancedPrompt = `Children's book watercolor illustration. ${prompt}. Full scene with rich detailed background, soft ink outlines, warm gentle lighting, hand-painted storybook style. Not a close-up portrait.`;

    console.log(`🎨 Generating ch${chapterNumber} via Gemini 2.5 Flash Image (${aspectRatio})...`);

    const { imageBuffer, ext } = callGeminiFlashImage(
      enhancedPrompt,
      aspectRatio,
      Array.isArray(referencePhotos) ? referencePhotos[0] : undefined
    );

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
      provider: 'gemini-2.5-flash-image',
      aspectRatio,
    });
  } catch (error) {
    console.error('Image generation error:', error);
    const message = error instanceof Error ? error.message : 'Ошибка генерации картинки';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
