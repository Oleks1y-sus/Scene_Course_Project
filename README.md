# Сцена — платформа інтерактивних онлайн-заходів

Повноцінний full-stack курсовий проєкт: Next.js-фронтенд, власний REST API на Express, PostgreSQL у Supabase, Drizzle ORM, автентифікація за логіном і паролем, відновлення пароля, модерація, скарги, обране, реєстрації та адмінпанель.

> **Демо-режим.** «Прямий ефір» — це демонстраційний статус: кнопки «Розпочати» / «Завершити» змінюють стан заходу в базі. Відеострімінгу немає (це не Zoom/Meet). Листи електронною поштою **не надсилаються**.

## Стек

| Шар | Технології |
| --- | --- |
| Фронтенд | Next.js 16 (App Router, React 19), TypeScript, власний CSS (mobile-first, Flexbox/Grid), SVG-sprite |
| Бекенд | Node.js 20+, Express 5, TypeScript, Drizzle ORM, Zod |
| БД | PostgreSQL (Supabase), 9 пов’язаних таблиць, SQL-міграції |
| Автентифікація | Власні сесії (HttpOnly cookie), Argon2id, логін + пароль, одноразовий токен відновлення пароля, rate limiting |
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
| `/login` | Вхід за логіном і паролем | публічно |
| `/register` | Реєстрація: юзернейм, логін, пошта, пароль | публічно |
| `/forgot-password` | Відновлення пароля за логіном + поштою | публічно |
| `/events` | Каталог: пошук, фільтри, сортування, пагінація, обране | після входу |
| `/events/[id]` | Деталі, реєстрація, скарга, керування ефіром | після входу |
| `/events/[id]/edit` | Редагування власного заходу | власник/адмін |
| `/create` | Створення заходу, обкладинка, теги | після входу |
| `/profile` | Профіль, статистика, обране, відвідані, створені, безпека | після входу |
| `/admin` | Скарги, модерація, користувачі, журнал дій | лише ADMIN |
| `/legal/privacy`, `/legal/terms` | Правові сторінки | публічно |
| `not-found` | Сторінка 404 | публічно |

## Основні можливості

- Реєстрація з **юзернеймом, логіном, поштою та паролем**; вхід одразу після реєстрації. Листи не надсилаються.
- Перевірка унікальності: не можна зайняти чужий юзернейм, логін або пошту — користувач бачить конкретне поле з помилкою.
- Публічно видно **лише юзернейм**; логін, пошта й пароль — приватні. Логін і пошту бачить лише власник у профілі. Пароль не зберігається у відкритому вигляді.
- Вхід за логіном і паролем; після 5 невдалих спроб — блокування на 15 хвилин.
- Відновлення пароля: логін + пошта → одноразовий токен на 15 хвилин → новий пароль; усі сесії після цього завершуються. **Лист не надсилається.**
- Профіль: юзернейм, біо, аватар (8 пресетів або завантажене фото), зміна пошти з поточним паролем, зміна пароля, видалення акаунта.
- Статистика: створені заходи за статусами, скільки разів додали в обране, реєстрації, відвідування.
- Каталог: пошук за назвою/описом/юзернеймом, категорії, статуси (за замовчуванням завершені та скасовані приховані), сортування, пагінація.
- Обране та реєстрація на захід; власний захід не можна додати в обране чи зареєструватися на нього.
- Статуси заходу: `UPCOMING`, `LIVE`, `COMPLETED`, `CANCELLED`; власник запускає та завершує демо-ефір.
- Ефір автоматично завершується після своєї тривалості, навіть якщо власник не натиснув «Завершити». Перевірка виконується під час старту API та щохвилини; реєстрації переводяться в `ATTENDED`.
- Скарги на заходи й користувачів; не можна скаржитися на власний захід/себе; повторна відкрита скарга відсікається.
- Автоматична модерація: нормалізація Unicode/leet-символів і приховування заходу до рішення адміна; 3+ відкритих скарг автоматично ховають захід.
- Адмінпанель: черга скарг, приховати/відновити захід, тіньовий бан/блокування/активація користувача, видалення, створення нових адміністраторів, журнал дій.
- Тіньовий бан: контент зникає з публічного каталогу; користувач не отримує публічного повідомлення про причину.
- Правило «немає користувача — немає заходів»: видалення/блокування власника приховує всі його заходи, видалення акаунта скасовує їх.
- Адміністратор створює нового адміна з юзернеймом, логіном, поштою й тимчасовим паролем. Дані показуються один раз; після першого входу система вимагає змінити пароль.
- Завантаження зображень: JPEG/PNG/WebP ≤ 2 МБ, перевірка сигнатури файлу, перекодування у WebP, зняття метаданих, захист від SVG/polyglot.
- Mobile-first, burger-меню, адаптивні сітки, доступність (підписи, `aria-*`, фокус, контраст).
- SEO: унікальні `title`/`description`, `lang="uk"`, Open Graph, семантичні заголовки, favicon, `robots noindex` для приватних сторінок.

## Безпека

- Паролі — **Argon2id** (memory 19 MiB, 2 iterations). У БД зберігається лише хеш.
- Сесії — випадковий 256-бітний токен; у БД зберігається HMAC-SHA256-хеш. Cookie: `HttpOnly`, `Secure` (у production), `SameSite=Lax`, термін 7 днів, відкликання на сервері.
- Відновлення пароля — випадковий 256-бітний токен, у БД зберігається HMAC-хеш; TTL 15 хвилин, одноразовий, після скидання всі сесії відкликаються.
- Блокування акаунта на 15 хв після 5 невдалих паролів; однакові повідомлення про помилку для неіснуючого логіна та невірного пароля.
- CSRF: SameSite=Lax + перевірка `Origin`/`Referer` для всіх небезпечних методів.
- Rate limiting: глобальний, авторизація, реєстрація, відновлення пароля, скарги, завантаження, адмін-мутації.
- Серверна валідація Zod для кожного тіла/query; обмеження розмірів, заборона HTML-символів, нормалізація Unicode, перевірка типів.
- SQL-ін’єкції: лише параметризовані запити Drizzle; `ILIKE`-пошук екранує `%`, `_`, `\`.
- XSS: React екранує вивід, HTML у текстах заборонено на сервері, немає `dangerouslySetInnerHTML`; CSP, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS.
- RBAC перевіряється **на сервері**: `/api/v1/admin/*` доступний лише ролі `ADMIN`, а `/admin` додатково захищений server-side layout-перевіркою.
- Завантаження файлів: MIME + magic bytes, ліміт 2 МБ, Sharp-перекодування, випадкові імена, власник файлу перевіряється при прикріпленні.
- Секрети — лише в env; `.env*` у `.gitignore`, є `.env.example`.
- Публічні запити не бачать `PENDING`/`HIDDEN` заходи, власник бачить свої з позначкою «На модерації».

> **Компроміс відновлення без листа.** Оскільки листи не надсилаються, доступ до зміни пароля підтверджується парою «логін + пошта». Це означає, що той, хто знає обидва значення, може змінити пароль. Це свідомий вибір для курсового проєкту без поштового домену; ризик зменшено rate limiting, коротким TTL токена та завершенням усіх сесій. Для production-рівня краще повернути email-підтвердження.

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

# 3. Міграції та демо-дані (PGlite, без Docker)
npm run server:migrate
npm run server:seed

# 4. Два процеси в різних терміналах
npm run dev:api    # http://localhost:4000
npm run dev        # http://localhost:3000
```

Локальна БД за замовчуванням — **PGlite** (PostgreSQL у WASM, каталог `server/.data/pglite`). Це дозволяє запустити проєкт без Supabase/Docker. Для production використовуйте Supabase PostgreSQL: змініть `DATABASE_URL` і `DATABASE_SSL=true`.

### Демо-акаунти (після `npm run server:seed`)

| Роль | Юзернейм | Логін | Пошта | Пароль |
| --- | --- | --- | --- | --- |
| ADMIN | `@admin` | `admin` | `admin@scene.local` | `Admin12345!` |
| USER | `@olena` | `olena` | `olena@scene.local` | `Demo12345!` |
| USER | `@maksym` | `maksym` | `maksym@scene.local` | `Demo12345!` |
| USER | `@iryna` | `iryna` | `iryna@scene.local` | `Demo12345!` |
| USER | `@andriy` | `andriy` | `andriy@scene.local` | `Demo12345!` |

Для входу використовуйте **логін** (не юзернейм) і пароль. `NEXT_PUBLIC_DEMO_MODE=true` показує підказку з демо-акаунтами на `/login`; у production — `false`.

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
- `FRONTEND_URL` — точний origin фронтенду (CORS + посилання).
- `SESSION_PEPPER`, `IP_PEPPER` — випадкові рядки 48+ байт.
- `COOKIE_SECURE=true`.
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET`.
- `ADMIN_USERNAME`, `ADMIN_LOGIN`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` — лише для першого сіду.

## Деплой

Детальний покроковий план від отримання ключів до першого входу: [`docs/DEPLOYMENT-STEP-BY-STEP.md`](docs/DEPLOYMENT-STEP-BY-STEP.md). Коротка версія: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

Коротко:

1. **GitHub** — запуште код (без `.env`).
2. **Supabase** — створіть проєкт, виконайте `npm run server:migrate`, створіть публічний bucket `scene-media`.
3. **Render** — Web Service, root `server`, build `npm ci --include=dev && npm run build`, start `npm run start`, env.
4. **Vercel** — імпорт репозиторію, root — корінь, `API_ORIGIN` = URL Render, `NEXT_PUBLIC_SITE_URL` = URL Vercel.
5. Оновіть `FRONTEND_URL` на Render після отримання URL Vercel і перезапустіть API.

Поштовий сервіс (Resend) більше не використовується. Домен і DNS не потрібні.

## API

Префікс `/api/v1`. Повний перелік — у [`server/README.md`](server/README.md). Основне:

- `POST /auth/register`, `/auth/login`, `/auth/password/forgot`, `/auth/password/reset`, `/auth/logout`, `GET /auth/me`
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
npm run server:typecheck   # TypeScript API
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
- Відновлення пароля без листа підтверджується парою «логін + пошта»; для production-рівня варто повернути email-підтвердження.
- Rate limiting зберігається в пам’яті процесу; для кількох інстансів Render варто підключити Redis.
- CSP містить `'unsafe-inline'` для скриптів через особливості Next.js; у майбутньому — nonce-based CSP.
- Для повного production-рівня варто додати Redis, черги листів, S3 lifecycle policy та моніторинг (Sentry).
