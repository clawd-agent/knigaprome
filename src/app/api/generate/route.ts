import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';
import { STORY_SYSTEM_PROMPT, generateStoryPrompt } from '@/lib/prompts';

// Обёртка через curl (Node.js https не работает с ProxyAPI)
async function callProxyAPI(messages: Array<{role: string, content: string}>) {
  const apiKey = process.env.PROXYAPI_KEY;
  if (!apiKey) {
    throw new Error('PROXYAPI_KEY не настроен');
  }

  const payload = JSON.stringify({
    model: 'gpt-4o-mini',
    messages,
    response_format: { type: 'json_object' },
    temperature: 0.8,
  });

  // Используем curl через execSync (работает стабильно)
  const result = execSync(`curl -s -X POST "https://api.proxyapi.ru/openai/v1/chat/completions" \
    -H "Authorization: Bearer ${apiKey}" \
    -H "Content-Type: application/json" \
    -d '${payload.replace(/'/g, "'\\''")}'`, {
    encoding: 'utf-8',
    timeout: 60000,
  });

  return JSON.parse(result);
}

interface Chapter {
  number: number;
  text: string;
  illustration_prompt: string;
  image_url?: string;
}

interface Story {
  title: string;
  chapters: Chapter[];
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    const childName = formData.get('childName') as string;
    const childAge = parseInt(formData.get('childAge') as string);
    const childGender = formData.get('childGender') as 'boy' | 'girl';
    const interests = formData.get('interests') as string;
    // const photo = formData.get('photo') as File | null; // TODO: для персонализации лица
    
    if (!childName || !childAge) {
      return NextResponse.json(
        { error: 'Имя и возраст обязательны' },
        { status: 400 }
      );
    }

    // 1. Генерируем историю через GPT-4o-mini
    console.log('📝 Generating story...');
    const storyPrompt = generateStoryPrompt(childName, childAge, childGender, interests);
    
    const completion = await callProxyAPI([
      { role: 'system', content: STORY_SYSTEM_PROMPT },
      { role: 'user', content: storyPrompt },
    ]);

    const storyContent = completion.choices[0].message.content;
    if (!storyContent) {
      throw new Error('Не удалось сгенерировать историю');
    }

    const story: Story = JSON.parse(storyContent);
    console.log(`✅ Story generated: "${story.title}" with ${story.chapters.length} chapters`);

    // Картинки генерятся отдельно через /api/generate-image
    const storyId = Date.now().toString(36);
    
    console.log('📖 Story ready!');

    // 4. Возвращаем готовую историю
    return NextResponse.json({
      success: true,
      story: {
        id: storyId,
        title: story.title,
        childName,
        chapters: story.chapters,
      },
    });

  } catch (error) {
    console.error('Generation error:', error);
    const message = error instanceof Error ? error.message : 'Ошибка генерации';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
