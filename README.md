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

## 🔁 CI/CD (GitHub Actions)

В репозитории добавлен workflow: `.github/workflows/ci-cd.yml`.

- Для каждого `push` и `pull_request`: `npm ci` → `npm run lint` → `npm run build`.
- Для `push` в default ветку репозитория: автоматический деплой на сервер по SSH и перезапуск через Docker Compose.

### GitHub Secrets

Добавьте в `Settings -> Secrets and variables -> Actions`:

- `SSH_HOST` — IP/домен прод-сервера.
- `SSH_PORT` — SSH порт (обычно `22`).
- `SSH_USER` — пользователь на сервере.
- `SSH_PRIVATE_KEY` — приватный ключ для доступа по SSH.
- `DEPLOY_PATH` — путь к проекту на сервере, например `/opt/knigaprome`.
- `SSH_KNOWN_HOSTS` (опционально) — строка known_hosts для сервера.

### Первичная настройка сервера

```bash
# 1) Установить Docker + Docker Compose plugin
# 2) Клонировать проект в DEPLOY_PATH
git clone <your-repo-url> /opt/knigaprome
cd /opt/knigaprome

# 3) Создать .env.production
cp .env.example .env.production
# заполнить переменные

# 4) Первый запуск
docker compose -f docker-compose.prod.yml up -d --build
```

После этого каждый пуш в default ветку будет автоматически деплоиться.

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
