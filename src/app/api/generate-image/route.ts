import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const PROXYAPI_KEY = process.env.PROXYAPI_KEY || '';
const OPENAI_IMAGE_ENDPOINT = 'https://api.proxyapi.ru/openai/v1/images/generations';
const IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1';

function mapSizeByOrientation(orientation?: string): '1024x1536' | '1536x1024' | '1024x1024' {
  if (orientation === 'landscape') return '1536x1024';
  if (orientation === 'square') return '1024x1024';
  return '1024x1536';
}

function callProxyOpenAIImage(prompt: string, size: string): { imageBuffer: Buffer; ext: 'png' | 'jpg' } {
  const payload = JSON.stringify({
    model: IMAGE_MODEL,
    prompt,
    size,
    n: 1,
    response_format: 'b64_json',
  });

  const payloadPath = `/tmp/openai-image-payload-${Date.now()}.json`;
  writeFileSync(payloadPath, payload);

  const raw = execSync(
    `curl -s -X POST "${OPENAI_IMAGE_ENDPOINT}" \\
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

  if (data?.error) {
    throw new Error(data.error?.message || JSON.stringify(data.error));
  }

  const item = data?.data?.[0];
  if (!item) {
    throw new Error('OpenAI images: пустой ответ');
  }

  if (item.b64_json) {
    return {
      imageBuffer: Buffer.from(item.b64_json, 'base64'),
      ext: 'png',
    };
  }

  if (item.url) {
    const downloaded = execSync(`curl -sL "${item.url}"`, {
      encoding: 'buffer',
      timeout: 60000,
      maxBuffer: 50 * 1024 * 1024,
    });
    return { imageBuffer: downloaded, ext: 'png' };
  }

  throw new Error('OpenAI images: не найден b64_json/url в ответе');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, storyId, chapterNumber, orientation } = body;

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

    const size = mapSizeByOrientation(orientation);

    const enhancedPrompt = `Children's book watercolor illustration. ${prompt}. Full scene with rich background details, soft ink outlines, warm gentle lighting, hand-painted storybook style. Not a close-up portrait.`;

    console.log(`🎨 Generating ch${chapterNumber} via ProxyAPI OpenAI images (${IMAGE_MODEL}, ${size})...`);

    const { imageBuffer, ext } = callProxyOpenAIImage(enhancedPrompt, size);

    const outputDir = process.env.GENERATED_OUTPUT_DIR || join(process.cwd(), 'public', 'generated');
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    const filename = `${storyId}-ch${chapterNumber}-${Date.now()}.${ext}`;
    const filePath = join(outputDir, filename);
    writeFileSync(filePath, imageBuffer);

    console.log(`✅ Image saved: ${filename}`);

    return NextResponse.json({
      success: true,
      image_url: `/generated/${filename}`,
      provider: `proxyapi-openai/${IMAGE_MODEL}`,
      size,
    });
  } catch (error) {
    console.error('Image generation error:', error);
    const message = error instanceof Error ? error.message : 'Ошибка генерации картинки';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
