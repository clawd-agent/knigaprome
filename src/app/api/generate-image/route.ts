import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const PROXYAPI_KEY = process.env.PROXYAPI_KEY || '';
const GEMINI_IMAGE_ENDPOINT =
  'https://api.proxyapi.ru/google/v1beta/models/gemini-2.5-flash-image:generateContent';

function callGeminiFlashImage(prompt: string, referencePhoto?: string): { base64: string; mimeType: string } {
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
    contents: [
      {
        parts,
      },
    ],
    generationConfig: {
      responseModalities: ['IMAGE', 'TEXT'],
    },
  });

  const result = execSync(
    `curl -s -X POST "${GEMINI_IMAGE_ENDPOINT}" \\
      -H "Authorization: Bearer ${PROXYAPI_KEY}" \\
      -H "Content-Type: application/json" \\
      -d '${payload.replace(/'/g, "'\\''")}'`,
    {
      encoding: 'utf-8',
      timeout: 90000,
      maxBuffer: 20 * 1024 * 1024,
    }
  );

  const data = JSON.parse(result);
  const responseParts = data?.candidates?.[0]?.content?.parts || [];

  for (const part of responseParts) {
    const inline = part.inlineData || part.inline_data;
    if (inline?.data) {
      return {
        base64: inline.data,
        mimeType: inline.mimeType || inline.mime_type || 'image/png',
      };
    }
  }

  throw new Error('Gemini не вернул изображение');
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
      return NextResponse.json(
        { error: 'PROXYAPI_KEY не настроен' },
        { status: 500 }
      );
    }

    const enhancedPrompt = `Children's book watercolor illustration, wide shot showing full scene with background and details. Soft ink outlines, cartoon proportions. ${prompt}. Full body view of character in environment, rich detailed background. Style: soft pastel watercolor washes, delicate pen outlines, warm gentle lighting, hand-painted storybook feel, professional children's book quality. NOT a portrait, NOT close-up.`;

    console.log(`🎨 Generating ch${chapterNumber} via Gemini 2.5 Flash Image...`);

    const { base64, mimeType } = callGeminiFlashImage(
      enhancedPrompt,
      Array.isArray(referencePhotos) ? referencePhotos[0] : undefined
    );
    const imageBuffer = Buffer.from(base64, 'base64');

    const outputDir = '/opt/knigaprome/generated';
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    const ext = mimeType.includes('jpeg') || mimeType.includes('jpg') ? 'jpg' : 'png';
    const filename = `${storyId}-ch${chapterNumber}-${Date.now()}.${ext}`;
    const filePath = join(outputDir, filename);
    writeFileSync(filePath, imageBuffer);

    console.log(`✅ Image saved: ${filename}`);

    return NextResponse.json({
      success: true,
      image_url: `/generated/${filename}`,
      provider: 'gemini-2.5-flash-image',
    });
  } catch (error) {
    console.error('Image generation error:', error);
    const message = error instanceof Error ? error.message : 'Ошибка генерации картинки';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
