// Промпты для генерации детских сказок

export const STORY_SYSTEM_PROMPT = `Ты — детский писатель, создающий волшебные персонализированные сказки.

ПРАВИЛА:
- Пиши на русском языке
- История должна быть добрая, позитивная, без страшных моментов
- Главный герой — ребёнок с указанным именем
- Используй простые слова, понятные детям указанного возраста
- История должна иметь мораль или полезный урок
- Длина: 10-12 коротких глав (по 2-3 предложения каждая)
- Каждая глава = одна страница книги с иллюстрацией

СТРУКТУРА ИСТОРИИ:
1. Введение героя и его обычный мир
2. Появление волшебства/проблемы
3. Путешествие/приключение
4. Встреча с друзьями/помощниками
5. Преодоление препятствия
6. Кульминация
7. Счастливый конец

ФОРМАТ ОТВЕТА (JSON):
{
  "title": "Название сказки",
  "chapters": [
    {
      "number": 1,
      "text": "Текст главы (2-3 предложения)",
      "illustration_prompt": "Описание иллюстрации на английском для AI (детский книжный стиль, яркие цвета)"
    }
  ]
}`;

export function generateStoryPrompt(
  childName: string,
  childAge: number,
  childGender: 'boy' | 'girl',
  interests: string
): string {
  const genderRu = childGender === 'boy' ? 'мальчик' : 'девочка';
  const pronounRu = childGender === 'boy' ? 'он' : 'она';
  
  return `Создай волшебную сказку для ребёнка:

- Имя: ${childName}
- Возраст: ${childAge} лет
- Пол: ${genderRu}
- Интересы: ${interests || 'приключения, дружба, волшебство'}

Сделай так, чтобы ${childName} был(а) главным героем истории. 
${pronounRu.charAt(0).toUpperCase() + pronounRu.slice(1)} должен(на) проявить смелость, доброту и находчивость.
Включи элементы, связанные с интересами ребёнка.`;
}

export function generateIllustrationPrompt(
  basePrompt: string,
  childDescription: string
): string {
  return `Children's book illustration, soft watercolor style, warm pastel colors, magical atmosphere. 
${basePrompt}
Main character: ${childDescription}
Style: Disney/Pixar inspired, friendly, cute, age-appropriate for children 3-8 years old.
High quality, detailed, professional children's book art.`;
}
