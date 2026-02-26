# 📚 Книга Про Меня (knigaprome.ru)

AI-генератор персонализированных детских книг для российского рынка.

## 🎯 Концепция

Родители загружают фото ребёнка → AI создаёт уникальную сказку с иллюстрациями → 
Ребёнок получает книгу, где он — главный герой.

## 💰 Unit Economics

| Продукт | Цена | Себестоимость | Маржа |
|---------|------|---------------|-------|
| PDF (цифровая) | 490₽ | ~75₽ | 85% |
| Печать (мягкая) | 1490₽ | ~330₽ | 78% |

## 🛠 Tech Stack

- **Frontend:** Next.js 14 + Tailwind CSS
- **AI Text:** OpenAI GPT-4o-mini
- **AI Images:** Replicate FLUX Kontext Pro
- **PDF:** @react-pdf/renderer
- **Database:** PostgreSQL + Prisma
- **Payments:** ЮKassa

## 🚀 Запуск

```bash
# Установка зависимостей
npm install

# Настройка переменных окружения
cp .env.example .env.local
# Заполните API ключи

# Запуск в dev режиме
npm run dev
```

## 📁 Структура

```
src/
├── app/
│   ├── page.tsx          # Главная страница
│   ├── api/
│   │   ├── generate/     # Генерация истории + иллюстраций
│   │   └── payment/      # Обработка оплаты
│   └── book/[id]/        # Просмотр готовой книги
├── components/
│   ├── BookPreview.tsx   # Превью книги
│   └── PDFDocument.tsx   # Генерация PDF
└── lib/
    ├── prompts.ts        # Промпты для AI
    └── replicate.ts      # Клиент Replicate
```

## 🎨 Дизайн

- Основной цвет: #7C3AED (фиолетовый — волшебство)
- Акцент: #F59E0B (жёлтый — детский)
- Шрифты: Comfortaa (заголовки), Nunito (текст)

## 📊 Конкуренты

| Конкурент | Технология | Цена | Наше преимущество |
|-----------|------------|------|-------------------|
| mynamebook.ru | Шаблоны | 1890-2490₽ | AI-персонализация |
| resto.kids | AI | 5290-6990₽ | В 3x дешевле! |

## 📝 TODO

- [x] Landing page
- [x] API генерации
- [ ] Интеграция ЮKassa
- [ ] Генерация PDF
- [ ] Email delivery
- [ ] Админка
- [ ] SEO оптимизация
- [ ] Telegram бот

## 📜 Лицензия

Proprietary. All rights reserved.
