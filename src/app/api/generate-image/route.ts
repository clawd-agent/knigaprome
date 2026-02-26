import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';

const LEONARDO_TOKEN = process.env.LEONARDO_API_KEY || '';
const LEONARDO_BASE = 'https://cloud.leonardo.ai/api/rest/v1';

// Lightning XL model (best for storybook + character reference)
const MODEL_ID = 'b24e16ff-06e3-43eb-8d33-4416c2d75876';
const STYLE_REF_PREPROCESSOR = 67;
const CHARACTER_REF_PREPROCESSOR = 133;

// Style reference image (watercolor storybook with ink outlines)
const STYLE_REF_PATH = '/opt/knigaprome/assets/style-reference.jpg';
let cachedStyleRefId: string | null = null;

// Upload image to Leonardo and get initImageId
function uploadToLeonardo(imagePath: string): string {
  const initResp = execSync(`curl -s ${LEONARDO_BASE}/init-image \
    -H "authorization: Bearer ${LEONARDO_TOKEN}" \
    -H "content-type: application/json" \
    -d '{"extension": "jpg"}'`, { encoding: 'utf-8', timeout: 15000 });

  const { uploadInitImage } = JSON.parse(initResp);
  const { id, url, fields: fieldsStr } = uploadInitImage;
  const fields = JSON.parse(fieldsStr);

  const formFields = Object.entries(fields)
    .map(([k, v]) => `-F "${k}=${(v as string).replace(/"/g, '\\"')}"`)
    .join(' ');

  execSync(`curl -s -o /dev/null "${url}" ${formFields} -F "file=@${imagePath}"`, {
    timeout: 30000,
    maxBuffer: 10 * 1024 * 1024,
  });

  return id;
}

// Upload base64 image to Leonardo
function uploadBase64ToLeonardo(base64Data: string): string {
  const tmpPath = `/tmp/leo-ref-${Date.now()}.jpg`;
  const buf = Buffer.from(base64Data.replace(/^data:image\/\w+;base64,/, ''), 'base64');
  writeFileSync(tmpPath, buf);
  return uploadToLeonardo(tmpPath);
}

// Get or upload style reference (cached per process lifetime)
function getStyleRefId(): string | null {
  if (cachedStyleRefId) return cachedStyleRefId;
  if (!existsSync(STYLE_REF_PATH)) {
    console.warn('⚠️ Style reference not found at', STYLE_REF_PATH);
    return null;
  }
  try {
    cachedStyleRefId = uploadToLeonardo(STYLE_REF_PATH);
    console.log(`✅ Style reference uploaded: ${cachedStyleRefId}`);
    return cachedStyleRefId;
  } catch (e) {
    console.warn('⚠️ Failed to upload style reference:', e);
    return null;
  }
}

// Poll for generation result
function pollGeneration(generationId: string, maxWait = 90): { url: string } {
  const start = Date.now();
  while (Date.now() - start < maxWait * 1000) {
    execSync('sleep 3');
    const resp = execSync(`curl -s "${LEONARDO_BASE}/generations/${generationId}" \
      -H "authorization: Bearer ${LEONARDO_TOKEN}"`, { encoding: 'utf-8', timeout: 15000 });

    const data = JSON.parse(resp);
    const gen = data.generations_by_pk;

    if (gen?.status === 'COMPLETE' && gen.generated_images?.length > 0) {
      return { url: gen.generated_images[0].url };
    }
    if (gen?.status === 'FAILED') {
      throw new Error('Leonardo generation failed');
    }
  }
  throw new Error('Leonardo generation timeout');
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

    if (!LEONARDO_TOKEN) {
      return NextResponse.json(
        { error: 'LEONARDO_API_KEY не настроен' },
        { status: 500 }
      );
    }

    // Build controlnets: Style Reference + optional Character Reference
    const controlnets: Array<{
      initImageId: string;
      initImageType: string;
      preprocessorId: number;
      strengthType: string;
    }> = [];

    // 1. Style Reference (watercolor storybook)
    const styleId = getStyleRefId();
    if (styleId) {
      controlnets.push({
        initImageId: styleId,
        initImageType: 'UPLOADED',
        preprocessorId: STYLE_REF_PREPROCESSOR,
        strengthType: 'High',
      });
    }

    // 2. Character Reference (face from uploaded photo)
    if (referencePhotos?.length > 0) {
      console.log(`📸 Uploading character reference to Leonardo...`);
      try {
        const refId = uploadBase64ToLeonardo(referencePhotos[0]);
        controlnets.push({
          initImageId: refId,
          initImageType: 'UPLOADED',
          preprocessorId: CHARACTER_REF_PREPROCESSOR,
          strengthType: 'Low',
        });
        console.log(`✅ Character reference uploaded: ${refId}`);
      } catch (e) {
        console.warn('⚠️ Failed to upload character ref, continuing without:', e);
      }
    }

    // Storybook watercolor prompt — wide scene, not portrait
    const enhancedPrompt = `Children's book watercolor illustration, wide shot showing full scene with background and details. Soft ink outlines, cartoon proportions. ${prompt}. Full body view of character in environment, rich detailed background. Style: soft pastel watercolor washes, delicate pen outlines, warm gentle lighting, hand-painted storybook feel, professional children's book quality. NOT a portrait, NOT close-up.`;

    console.log(`🎨 Generating ch${chapterNumber} via Leonardo (${controlnets.length} refs)...`);

    // Build generation payload
    const genPayload: Record<string, unknown> = {
      height: 768,
      width: 1024,
      modelId: MODEL_ID,
      prompt: enhancedPrompt,
      negative_prompt: 'portrait, close-up, headshot, face only, bust shot, zoomed in face, blurry background',
      num_images: 1,
      alchemy: true,
      presetStyle: 'ILLUSTRATION',
    };

    if (controlnets.length > 0) {
      genPayload.controlnets = controlnets;
    }

    const tmpPayload = `/tmp/leo-payload-${Date.now()}.json`;
    writeFileSync(tmpPayload, JSON.stringify(genPayload));

    const genResp = execSync(`curl -s ${LEONARDO_BASE}/generations \
      -H "authorization: Bearer ${LEONARDO_TOKEN}" \
      -H "content-type: application/json" \
      -d @${tmpPayload}`, { encoding: 'utf-8', timeout: 15000 });

    const genData = JSON.parse(genResp);

    if (genData.error) {
      throw new Error(genData.error);
    }

    const generationId = genData.sdGenerationJob?.generationId;
    if (!generationId) {
      throw new Error('No generationId returned');
    }

    const cost = genData.sdGenerationJob?.cost?.amount || '?';
    console.log(`⏳ Generation ${generationId} ($${cost})...`);

    // Poll for result
    const result = pollGeneration(generationId);

    // Download the image
    const imageData = execSync(`curl -sL "${result.url}"`, {
      timeout: 30000,
      maxBuffer: 50 * 1024 * 1024,
      encoding: 'buffer',
    });

    // Save to /opt/knigaprome/generated/
    const outputDir = '/opt/knigaprome/generated';
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    const filename = `${storyId}-ch${chapterNumber}-${Date.now()}.jpg`;
    const filePath = join(outputDir, filename);
    writeFileSync(filePath, imageData);

    console.log(`✅ Image saved: ${filename}`);

    return NextResponse.json({
      success: true,
      image_url: `/generated/${filename}`,
    });

  } catch (error) {
    console.error('Image generation error:', error);
    const message = error instanceof Error ? error.message : 'Ошибка генерации картинки';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
