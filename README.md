# Сцена — платформа інтерактивних онлайн-заходів

Повноцінний full-stack курсовий проєкт: сучасний Next.js-фронтенд, власний REST API на Express, PostgreSQL у Supabase, Drizzle ORM, автентифікація з одноразовими кодами на пошту (Resend), модерація, скарги, обране, реєстрації та адмінпанель.

> **Демо-режим.** «Прямий ефір» — це демонстраційний статус: кнопки «Розпочати» / «Завершити» змінюють стан заходу в базі. Відеострімінгу немає (це не Zoom/Meet).

## Стек

| Шар | Технології |
| --- | --- |
| Фронтенд | Next.js 16 (App Router, React 19), TypeScript, власний CSS (mobile-first, Flexbox/Grid), SVG-sprite |
| Бекенд | Node.js 20+, Express 5, TypeScript, Drizzle ORM, Zod |
| БД | PostgreSQL (Supabase), 9 пов’язаних таблиць, SQL-міграції |
| Автентифікація | Власні сесії (HttpOnly cookie), Argon2id, 6-значні коди на email, rate limiting, блокування після невдалих спроб |
| Пошта | Resend (у dev — консольний транспорт) |
| Файли | Multer + Sharp (WebP, перевірка magic bytes), Supabase Storage або локальний диск |
| Деплой | Vercel (фронтенд) + Render (API) + Supabase (БД/Storage) |

## Архітектура

```
Браузер
  │  same-origin fetch /api/v1/*
  ▼
Vercel: Next.js (proxy.ts перевіряє наявність сесії)
  │  rewrite /api/v1/* -> API_ORIGIN
  ▼
Render: Express 5 REST API
  │  Drizzle ORM, parameterized SQL
  ▼
Supabase: PostgreSQL + Storage
```

Фронтенд **ніколи не звертається до БД напряму**. Усі операції проходять через REST API; cookie сесії є first-party завдяки Next.js rewrite, тому SameSite=Lax працює, а CSRF додатково відсікається перевіркою Origin/Referer.

## Сторінки

| Маршрут | Призначення | Доступ |
| --- | --- | --- |
| `/` | Головна (збережена верстка) | публічно |
| `/login`, `/register` | Вхід / реєстрація з OTP-кодом | публічно |
| `/events` | Каталог: пошук, фільтри, сортування, пагінація, обране | після входу |
| `/events/[id]` | Деталі, реєстрація, скарга, керування ефіром | після входу |
| `/events/[id]/edit` | Редагування власного заходу | власник/адмін |
| `/create` | Створення заходу, обкладинка, теги | після входу |
| `/profile` | Профіль, статистика, обране, відвідані, створені, безпека | після входу |
| `/admin` | Скарги, модерація, користувачі, журнал дій | лише ADMIN |
| `/legal/privacy`, `/legal/terms` | Правові сторінки | публічно |
| `not-found` | Сторінка 404 | публічно |

## Основні можливості

- Реєстрація/вхід/вихід; підтвердження пошти; вхід за паролем + одноразовим кодом на email.
- Профіль: ім’я, біо, аватар (8 пресетів або завантажене фото), зміна пошти з підтвердженням, зміна пароля, видалення акаунта.
- Статистика: створені заходи за статусами, скільки разів додали в обране, реєстрації, відвідування.
- Каталог: пошук за назвою/описом/спікером, категорії, статуси (за замовчуванням завершені та скасовані приховані), сортування, пагінація.
- Обране та реєстрація на захід; власний захід не можна додати в обране чи зареєструватися на нього.
- Статуси заходу: `UPCOMING`, `LIVE`, `COMPLETED`, `CANCELLED`; власник запускає та завершує демо-ефір.
- Скарги на заходи й користувачів; не можна скаржитися на власний захід/себе; повторна відкрита скарга відсікається.
- Автоматична модерація: нормалізація Unicode/leet-символів і приховування заходу до рішення адміна; 3+ відкритих скарг автоматично ховають захід.
- Адмінпанель: черга скарг, приховати/відновити захід, тіньовий бан/блокування/активація користувача, видалення, створення нових адміністраторів, журнал дій.
- Тіньовий бан: контент зникає з публічного каталогу; користувач не отримує публічного повідомлення про причину.
- Правило «немає користувача — немає заходів»: видалення/блокування власника приховує всі його заходи, видалення акаунта скасовує їх.
- Email-розсилка: OTP-коди, запрошення адміністратора з тимчасовим паролем.
- Завантаження зображень: JPEG/PNG/WebP ≤ 2 МБ, перевірка сигнатури файлу, перекодування у WebP, зняття метаданих, захист від SVG/polyglot.
- Mobile-first, burger-меню, адаптивні сітки, доступність (підписи, `aria-*`, фокус, контраст).
- SEO: унікальні `title`/`description`, `lang="uk"`, Open Graph, семантичні заголовки, favicon, `robots noindex` для приватних сторінок.

## Безпека

- Паролі — **Argon2id** (memory 19 MiB, 2 iterations). У БД зберігається лише хеш.
- Сесії — випадковий 256-бітний токен; у БД зберігається HMAC-SHA256-хеш. Cookie: `HttpOnly`, `Secure` (у production), `SameSite=Lax`, термін 7 днів, відкликання на сервері.
- OTP-коди — HMAC-SHA256 з пепером, TTL 10 хв, максимум 5 спроб, повторне надсилання не частіше 60 с, старі коди інвалідуються.
- Блокування акаунта на 15 хв після 5 невдалих паролів; однакові повідомлення про помилку для неіснуючої пошти та невірного пароля.
- CSRF: SameSite=Lax + перевірка `Origin`/`Referer` для всіх небезпечних методів.
- Rate limiting: глобальний, авторизація, OTP, реєстрація, скарги, завантаження, адмін-мутації.
- Серверна валідація Zod для кожного тіла/query; обмеження розмірів, заборона HTML-символів, нормалізація Unicode, перевірка типів.
- SQL-ін’єкції: лише параметризовані запити Drizzle; `ILIKE`-пошук екранує `%`, `_`, `\`.
- XSS: React екранує вивід, HTML у текстах заборонено на сервері, немає `dangerouslySetInnerHTML`; CSP, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS.
- RBAC перевіряється **на сервері**: `/api/v1/admin/*` доступний лише ролі `ADMIN`, а `/admin` додатково захищений server-side layout-перевіркою.
- Завантаження файлів: MIME + magic bytes, ліміт 2 МБ, Sharp-перекодування, випадкові імена, власник файлу перевіряється при прикріпленні.
- Секрети — лише в env; `.env*` у `.gitignore`, є `.env.example`.
- Публічні запити не бачать `PENDING`/`HIDDEN` заходи, власник бачить свої з позначкою «На модерації».

## Локальний запуск

Потрібні Node.js 20.11+ (рекомендовано 22 LTS).

```bash
# 1. Залежності
npm install
npm --prefix server install

# 2. Конфігурація
cp .env.example .env.local              # Windows: Copy-Item
cp server/.env.example server/.env
# Для локального демо залиште DATABASE_URL=pglite у server/.env
# і додайте NEXT_PUBLIC_DEMO_MODE=true у .env.local

# 3. Міграції та демо-дані (PGlite, без Docker)
npm run server:migrate
npm run server:seed

# 4. Два процеси в різних терміналах
npm run dev:api    # http://localhost:4000
npm run dev        # http://localhost:3000
```

Локальна БД за замовчуванням — **PGlite** (PostgreSQL у WASM, каталог `server/.data/pglite`). Це дозволяє запустити проєкт без Supabase/Docker. Для production використовуйте Supabase PostgreSQL: змініть `DATABASE_URL` і `DATABASE_SSL=true`.

### Демо-акаунти (після `npm run server:seed`)

| Роль | Пошта | Пароль |
| --- | --- | --- |
| ADMIN | `admin@scene.local` | `Admin12345!` |
| USER | `olena@scene.local` | `Demo12345!` |
| USER | `maksym@scene.local` | `Demo12345!` |
| USER | `iryna@scene.local` | `Demo12345!` |
| USER | `andriy@scene.local` | `Demo12345!` |

> Після пароля система попросить 6-значний код. У dev він друкується в консоль API та повертається як `devCode` (якщо `EXPOSE_DEV_CODES=true`), тому фронтенд підставляє його автоматично. У production `EXPOSE_DEV_CODES=false`, код приходить лише на пошту.

## Змінні середовища

### Фронтенд (`.env.local` / Vercel)

| Змінна | Приклад | Призначення |
| --- | --- | --- |
| `API_ORIGIN` | `https://scene-api.onrender.com` | Куди Next.js проксує `/api/v1` і `/uploads` |
| `NEXT_PUBLIC_SITE_URL` | `https://scene.vercel.app` | Канонічні URL / Open Graph |
| `NEXT_PUBLIC_DEMO_MODE` | `false` | Показувати підказку з демо-акаунтами на `/login` |

### Бекенд (`server/.env` / Render)

Повний перелік — у [`server/.env.example`](server/.env.example). Ключові:

- `DATABASE_URL` — Supabase PostgreSQL (session pooler, `sslmode=require`), `DATABASE_SSL=true`.
- `FRONTEND_URL` — точний origin фронтенду (CORS + посилання в листах).
- `SESSION_PEPPER`, `OTP_PEPPER`, `IP_PEPPER` — випадкові рядки 48+ байт.
- `COOKIE_SECURE=true`, `MAIL_MODE=resend`, `RESEND_API_KEY`, `RESEND_FROM`.
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET`.
- `ADMIN_EMAIL`, `ADMIN_PASSWORD` — для першого сіду.

## Деплой

Детальний покроковий план від отримання ключів до першого входу: [`docs/DEPLOYMENT-STEP-BY-STEP.md`](docs/DEPLOYMENT-STEP-BY-STEP.md). Коротка версія: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

Коротко:

1. **Supabase** — створіть проєкт, візьміть connection string, виконайте `npm run server:migrate` з production-`DATABASE_URL`, створіть публічний bucket `scene-media`.
2. **Render** — New Web Service, root directory `server`, build `npm install && npm run build`, start `npm run start`, додайте env, health check `/health`.
3. **Vercel** — імпортуйте репозиторій, root — корінь, env `API_ORIGIN` = URL Render, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_DEMO_MODE=false`.
4. **Resend** — підтвердіть домен, вкажіть `RESEND_FROM`.

## API

Префікс `/api/v1`. Повний перелік — у [`server/README.md`](server/README.md). Основне:

- `POST /auth/register`, `/auth/login`, `/auth/login/verify`, `/auth/resend`, `/auth/logout`, `GET /auth/me`
- `GET /webinars`, `GET /webinars/:id`, `POST /webinars`, `PATCH/DELETE /webinars/:id`
- `POST /webinars/:id/start|end|cancel|favorite|register`
- `GET/PATCH /users/me`, `/users/me/stats`, `/users/me/email`, `/users/me/password`
- `POST /reports`
- `GET/PATCH /admin/reports`, `/admin/webinars`, `/admin/users`, `/admin/stats`, `/admin/audit`, `POST /admin/admins`

Формат відповіді: `{ "data": ..., "meta": ... }`; помилки: `{ "error": { "code", "message", "fields?", "requestId" } }` з коректними HTTP-статусами.

## Перевірка

```bash
npm run typecheck          # TypeScript фронтенду
npm run lint               # ESLint
npm run build              # production build Next.js
npm run server:typecheck   # TypeScript API (додано в CI)
npm run server:test        # Vitest: модерація, валідація, схеми
```

CI: [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

## Структура

```
.
├─ src/                    # Next.js App Router + компоненти
│  ├─ app/                 # сторінки, layout, CSS, proxy.ts
│  ├─ components/          # Header, auth, webinars, profile, admin, ui
│  └─ lib/                 # API-клієнт, типи, константи, форматування
├─ public/img/             # зображення, SVG-обкладинки, аватари, іконки
├─ server/                 # Express + Drizzle API
│  ├─ src/modules/         # auth, users, webinars, reports, admin, uploads
│  ├─ src/db/              # schema, client, migrations, seed
│  ├─ drizzle/             # SQL-міграції
│  └─ .env.example
├─ docs/                   # деплой, чекліст вимог, QA
├─ render.yaml
└─ .github/workflows/ci.yml
```

## Відповідність вимогам курсової

Детальне зіставлення з вимогами на 10–12 балів і бонусами — у [`docs/REQUIREMENTS-CHECKLIST.md`](docs/REQUIREMENTS-CHECKLIST.md).

## Обмеження та що можна покращити

- Демо-ефір не є реальним відеострімінгом (свідоме обмеження завдання).
- Rate limiting зберігається в пам’яті процесу; для кількох інстансів Render варто підключити Redis.
- CSP містить `'unsafe-inline'` для скриптів через особливості Next.js; у майбутньому — nonce-based CSP.
- Для повного production-рівня варто додати Redis, черги листів, S3 lifecycle policy та моніторинг (Sentry).
