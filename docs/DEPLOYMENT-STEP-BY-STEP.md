# Повний покроковий деплой «Сцени»

Актуальна схема (без поштового сервісу):

```
GitHub  →  Supabase (PostgreSQL + Storage)  →  Render (API)  →  Vercel (Next.js)
```

Resend, домен і DNS **не використовуються**. Реєстрація та вхід — за логіном і паролем. Відновлення пароля — за парою «логін + пошта», без надсилання листа. Детальніше про компроміс — у розділі 6.

---

## 0. Що куди завантажується

| Сервіс | Що саме | Як |
| --- | --- | --- |
| **GitHub** | Увесь вихідний код: `src/`, `public/`, `server/`, `docs/`, `package.json`, `package-lock.json`, `next.config.ts`, `tsconfig.json`, `render.yaml`, `.github/workflows/ci.yml`, `.env.example` | `git add`, `git commit`, `git push` |
| **Vercel** | Нічого вручну. Підключається до GitHub, збирає корінь репозиторію (Next.js) | Імпорт репозиторію + 3 env-змінні |
| **Render** | Нічого вручну. Підключається до GitHub, бере теку `server/` | Web Service + env у дашборді |
| **Supabase** | Нічого з файлів застосунку. БД, Storage bucket; міграції запускаються з `server/drizzle` | SQL-міграції + bucket |

**Не комітити:** `.env`, `.env.local`, `server/.env`, `node_modules`, `.next`, `out`, `server/dist`, `server/.data`, `server/uploads`, `.vercel`.

---

## 1. GitHub

### 1.1. Перевірка репозиторію

```powershell
cd D:\Practice-main\scene-project
git remote -v
git branch --show-current
```

Очікувано:

```
origin  https://github.com/Oleks1y-sus/Scene_Course_Project.git (fetch)
origin  https://github.com/Oleks1y-sus/Scene_Course_Project.git (push)
main
```

Якщо `origin` уже є — не створюйте новий репозиторій.

### 1.2. Якщо репозиторію ще немає

1. GitHub → **New repository** → `Scene_Course_Project`.
2. **Public** або **Private** (як погоджено).
3. Не додавайте README/.gitignore/license.
4. У терміналі:

```powershell
cd D:\Practice-main\scene-project
git init
git branch -M main
git remote add origin https://github.com/Oleks1y-sus/Scene_Course_Project.git
```

### 1.3. Перевірка секретів

```powershell
git status
git status --short | Select-String -Pattern '\.env$|\.env\.local$|server/\.env$'
git check-ignore -v server/.env
git check-ignore -v .env.local
```

Якщо `.env` випадково вже відслідковується:

```powershell
git rm --cached server/.env .env.local
```

і перегенеруйте всі ключі, які встигли потрапити в історію.

### 1.4. Коміт і пуш

```powershell
git add -A
git status --short
git diff --cached --name-only
git commit -m "feat: credential auth, password reset and deployment-ready full-stack platform"
git push origin main
```

Якщо пуш відхилено:

```powershell
git pull --rebase origin main
git push origin main
```

GitHub запитає пароль — вводьте **Personal Access Token**, не пароль акаунта.

### 1.5. Перевірка

- Є `server/`, `src/`, `docs/`, `render.yaml`, `.github/workflows/ci.yml`.
- Немає `.env`, `node_modules`, `server/dist`.
- Вкладка **Actions** → CI зелений.
- Старий GitHub Pages workflow видалено; деплой буде на Vercel.

---

## 2. Supabase

### 2.1. Створення

1. <https://supabase.com> → New project.
2. Name `scene`, регіон `Frankfurt`.
3. Database Password — надійний, збережіть.
4. Дочекайтеся створення.

### 2.2. Ключі

| Що | Де взяти | Куди |
| --- | --- | --- |
| `DATABASE_URL` | Project Settings → Database → Connection string → **Session pooler** (5432) | Render |
| `SUPABASE_URL` | Project Settings → API → Project URL | Render |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API → `service_role` | Render (секрет) |

`DATABASE_URL` має вигляд:

```
postgresql://postgres.xxxxx:PASSWORD@aws-0-eu-central-1.pooler.supabase.com:5432/postgres
```

Спецсимволи пароля URL-кодуються: `@` → `%40`, `#` → `%23`, `$` → `%24`, `%` → `%25`, `&` → `%26`, `/` → `%2F`, `:` → `%3A`, `?` → `%3F`.

`SUPABASE_SERVICE_ROLE_KEY` — **тільки Render**. Не додавайте у Vercel/GitHub.

### 2.3. Storage

1. Storage → New bucket → `scene-media`.
2. Public bucket — увімкнути.
3. Запис — через service_role з API; анонімні RLS-політики на запис не потрібні.

### 2.4. Міграції

Міграції: `server/drizzle/0000_scene_initial.sql` і `0001_credentials_auth.sql`. Не вставляйте їх вручну в SQL Editor — використовуйте migrator.

```powershell
cd D:\Practice-main\scene-project\server
npm ci

$env:DATABASE_URL = "postgresql://postgres.xxxxx:ENCODED_PASSWORD@aws-0-eu-central-1.pooler.supabase.com:5432/postgres"
$env:DATABASE_SSL = "true"

npm run db:migrate
```

Очікувано: `Database migrations applied.`

Перевірка в Supabase → Table Editor: `users`, `sessions`, `password_reset_tokens`, `webinars`, `favorites`, `registrations`, `reports`, `media`, `audit_logs`.

> Якщо ви вже застосовували стару міграцію з `auth_codes`, нова `0001` додасть `username`/`login`, видалить OTP-таблицю, `display_name`, `pending_email`, `email_verified_at` і створить `password_reset_tokens`. Існуючі користувачі отримають технічні `user_xxxxxxxx`; для чистого старту краще скинути БД перед першим деплоєм.

### 2.5. Перший адміністратор

```powershell
$env:ADMIN_USERNAME = "sceneadmin"
$env:ADMIN_LOGIN = "sceneadmin"
$env:ADMIN_EMAIL = "admin@yourdomain.com"
$env:ADMIN_PASSWORD = "StrongUniquePassword123!"
$env:SEED_DEMO = "false"

npm run db:seed
```

Очікувано: `Admin created: @sceneadmin (login: sceneadmin, email: ...)`.

- Пароль — 16+ символів, унікальний.
- `ADMIN_LOGIN` — те, що вводиться при вході; `ADMIN_USERNAME` — публічне ім’я.
- `ADMIN_EMAIL` — приватна пошта; використовується для відновлення пароля.
- Якщо адмін уже існує, seed не змінює пароль. Збережіть пароль одразу.
- `SEED_DEMO=false`; демо-акаунти в production не створюються.

---

## 3. Render (API) — наступний крок після Supabase

### 3.1. Створення сервісу

1. Render → New → **Web Service** → GitHub-репозиторій.
2. Поля:

| Поле | Значення |
| --- | --- |
| Name | `scene-api` |
| Region | Frankfurt |
| Branch | `main` |
| Root Directory | `server` |
| Runtime | Node |
| Build Command | `npm ci --include=dev && npm run build` |
| Start Command | `npm run start` |
| Health Check Path | `/health` |
| Instance | Free для старту / Starter для захисту |

`npm run start` автоматично виконує `prestart` → `node dist/db/migrate.js` → `node dist/index.js`.

### 3.2. Environment variables

Render → Environment → Add Environment Variable.

| Key | Value | Секрет |
| --- | --- | --- |
| `NODE_ENV` | `production` | ні |
| `TRUST_PROXY` | `1` | ні |
| `DATABASE_URL` | Supabase Session pooler URL | так |
| `DATABASE_SSL` | `true` | ні |
| `DB_POOL_MAX` | `10` | ні |
| `FRONTEND_URL` | `https://your-app.vercel.app` (поки тимчасово, потім точний) | ні |
| `CORS_EXTRA_ORIGINS` | порожньо або preview-домени через кому | ні |
| `SESSION_COOKIE_NAME` | `scene_session` | ні |
| `SESSION_TTL_DAYS` | `7` | ні |
| `COOKIE_SECURE` | `true` | ні |
| `SESSION_PEPPER` | випадковий 48+ байт | так |
| `IP_PEPPER` | інший випадковий 48+ байт | так |
| `SUPABASE_URL` | `https://xxxx.supabase.co` | ні |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key | так |
| `SUPABASE_STORAGE_BUCKET` | `scene-media` | ні |
| `SEED_DEMO` | `false` | ні |
| `ALLOW_ORIGINLESS_REQUESTS` | `false` | ні |
| `RATE_LIMIT_DISABLED` | `false` | ні |
| `MAX_ACTIVE_SESSIONS` | `10` | ні |
| `NODE_VERSION` | `22` | ні |
| `LOG_LEVEL` | `info` | ні |

Не додавайте `PORT` — Render задає його сам. `PGLITE_DATA_DIR`, `ADMIN_*`, `DEMO_PASSWORD` у runtime не потрібні.

Пепери:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Запустіть двічі окремо для `SESSION_PEPPER` і `IP_PEPPER`. Не використовуйте `dev-only-...`.

### 3.3. Деплой і перевірка

1. Deploy.
2. Logs: `npm ci` → `npm run build` → `Database migrations applied.` → `scene-api:started`.
3. `https://<render-service>.onrender.com/health` → 200.
4. Запишіть точний URL Render для Vercel.

### 3.4. Production-валідація

Сервер не стартує, якщо:

- `DATABASE_URL=pglite` → вкажіть Supabase.
- `SESSION_PEPPER` починається з `dev-only` → згенеруйте новий.
- `COOKIE_SECURE` не `true`.
- `FRONTEND_URL` не `https://`.
- `NODE_ENV` не `production` (для Render).

Помилки видно в Logs як `Invalid environment configuration`.

Типові проблеми:

| Помилка | Рішення |
| --- | --- |
| `password authentication failed` | URL-кодуйте пароль |
| `relation "users" does not exist` | міграції: перевірте `prestart`/запустіть `db:migrate` |
| build падає на `sharp`/`argon2` | `NODE_VERSION=22` |
| 502 на `/health` | сервіс ще стартує або впав; дивіться Logs |

---

## 4. Vercel (Next.js)

1. Vercel → Add New → Project → імпорт репозиторію.
2. Framework Preset: Next.js.
3. **Root Directory**: корінь репозиторію (`.`), **не** `server`.
4. Build/Install/Output — стандартні.
5. Environment Variables (Production + Preview):

| Key | Value |
| --- | --- |
| `API_ORIGIN` | `https://<render-service>.onrender.com` |
| `NEXT_PUBLIC_SITE_URL` | `https://<vercel-project>.vercel.app` |
| `NEXT_PUBLIC_DEMO_MODE` | `false` |

`API_ORIGIN` — без слеша й без `/api/v1`. Він читається під час build, тому після зміни — Redeploy.

6. Deploy. Запишіть точний URL Vercel.

### 4.1. Оновіть Render після Vercel

Render → Environment → `FRONTEND_URL` = точний `https://...vercel.app` (без слеша) → Manual Deploy/перезапуск.

Без цього GET можуть працювати, а POST (вхід, реєстрація, створення) буде відхилятися CORS/CSRF з 403.

Preview-деплої: додайте конкретні preview-origin у `CORS_EXTRA_ORIGINS` (wildcard не працює).

---

## 5. Перевірка після деплою

### 5.1. API

```powershell
Invoke-RestMethod https://<render-service>.onrender.com/health
Invoke-RestMethod "https://<vercel-project>.vercel.app/api/v1/webinars?limit=1"
```

### 5.2. Сценарій

1. `/register`: юзернейм, логін, пошта, пароль → одразу вхід.
2. Вийти → `/login`: вхід за логіном і паролем.
3. `/forgot-password`: логін + пошта → новий пароль → вхід.
4. `/profile`: зміна юзернейма, аватара, пошти (з поточним паролем), пароля.
5. Створити захід з обкладинкою; побачити «Ваш захід».
6. Другим акаунтом — обране/реєстрація.
7. Власником — старт/завершення ефіру.
8. Скарга → адмінпанель → приховати/відхилити.
9. Створити нового адміна → увійти з тимчасовим паролем → змінити пароль.
10. Перевірити, що публічно видно лише `@username`.

### 5.3. Приватність

- `GET /auth/me` повертає власнику `username`, `login`, `email`.
- Публічний власник заходу: лише `{ id, username, avatarUrl, bio? }`.
- `GET /admin/users` не повертає email/login.
- `GET /admin/reports` показує лише юзернейми.
- Пароль ніколи не повертається.

### 5.4. Безпека

- `/admin` без входу → login; USER → редірект.
- POST без `Origin` → 403.
- `<script>` у назві → 422.
- Чужий `PATCH /webinars/:id` → 403.
- 5 невдалих паролів → блокування 15 хв.
- 6+ спроб reset → 429/новий токен.
- Завантаження `.svg`/`.exe` → 415; >2 МБ → 413.
- Cookie `Secure` на HTTPS.
- Консоль браузера без помилок.

---

## 6. Модель автентифікації без пошти

| Дія | Дані | Що відбувається |
| --- | --- | --- |
| Реєстрація | username, login, email, password | перевірка унікальності; створення; автосесія |
| Вхід | login, password | Argon2id-перевірка; сесія |
| Забув пароль | login, email | якщо збігається — reset-токен на 15 хв |
| Новий пароль | token, newPassword | зміна; усі сесії відкликаються |

Публічно видно лише `username`. `login`, `email` і `password_hash` — приватні; email/login показуються лише власнику в `/profile`.

**Компроміс:** без листа підтвердження пара «логін + пошта» є достатньою для скидання пароля. Це зроблено на прохання — без поштового домену. Ризик зменшено:

- reset-токен 256-бітний, зберігається як HMAC-хеш, одноразовий, TTL 15 хв;
- не частіше 1 запиту/60 с і 8/годину;
- після скидання всі сесії відкликаються;
- пароль — Argon2id, мінімум 10 символів, велика/мала літера й цифра.

Для production-рівня варто повернути email-підтвердження; у цьому проєкті його свідомо немає.

---

## 7. Env-файли

### Локально

| Файл | Що писати |
| --- | --- |
| `D:\Practice-main\scene-project\.env.local` | `API_ORIGIN=http://localhost:4000`, `NEXT_PUBLIC_SITE_URL=http://localhost:3000`, `NEXT_PUBLIC_DEMO_MODE=true` |
| `D:\Practice-main\scene-project\server\.env` | копія `server/.env.example`; локально `DATABASE_URL=pglite` |

Приклад `server/.env`:

```env
NODE_ENV=development
PORT=4000
DATABASE_URL=pglite
DATABASE_SSL=false
PGLITE_DATA_DIR=./.data/pglite
FRONTEND_URL=http://localhost:3000
SESSION_COOKIE_NAME=scene_session
COOKIE_SECURE=false
SESSION_PEPPER=local-session-pepper-at-least-32-characters
IP_PEPPER=local-ip-pepper-at-least-32-characters
SUPABASE_STORAGE_BUCKET=scene-media
UPLOAD_DIR=./uploads
ADMIN_USERNAME=admin
ADMIN_LOGIN=admin
ADMIN_EMAIL=admin@scene.local
ADMIN_PASSWORD=Admin12345!
SEED_DEMO=true
DEMO_PASSWORD=Demo12345!
```

Обидва файли в `.gitignore`. У GitHub — лише `.env.example`.

### Production

| Сервіс | Де env | Що |
| --- | --- | --- |
| Render | Dashboard → Environment | усі runtime-змінні API |
| Vercel | Settings → Environment Variables | `API_ORIGIN`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_DEMO_MODE` |
| Supabase | Dashboard | ключі копіюються в Render |
| GitHub | `.env.example` | лише заглушки |

На Render **немає** `server/.env`: файл ігнорується Git, змінні задаються в дашборді.

---

## 8. Файли в GitHub

```
.github/workflows/ci.yml
.gitignore
AGENTS.md
README.md
docs/
  DEPLOYMENT.md
  DEPLOYMENT-STEP-BY-STEP.md
  QA.md
  REQUIREMENTS-CHECKLIST.md
eslint.config.mjs
next.config.ts
package.json
package-lock.json
tsconfig.json
render.yaml
.env.example
public/
src/
  app/
    forgot-password/
    ...
  components/
  lib/
  proxy.ts
server/
  .env.example
  README.md
  drizzle.config.ts
  drizzle/
    0000_scene_initial.sql
    0001_credentials_auth.sql
    meta/_journal.json
  package.json
  package-lock.json
  tsconfig.json
  tsconfig.build.json
  src/
```

Не має бути: `node_modules/`, `.next/`, `out/`, `server/node_modules/`, `server/dist/`, `server/.data/`, `server/uploads/`, `.env`, `.env.local`, `server/.env`, `.vercel/`.

---

## 9. Часті проблеми

| Симптом | Причина | Що робити |
| --- | --- | --- |
| Vercel 502 | `API_ORIGIN` неправильний / Render спить | перевірте URL, `/health` |
| 403 CSRF/CORS | `FRONTEND_URL` не збігається з origin Vercel | оновіть Render, redeploy |
| Логін 401 | неправильний логін/пароль | перевірте `login`, не username |
| Забув пароль не працює | логін/пошта не збігаються, токен прострочений, throttle 60 с | повторіть, зачекайте |
| 409 при реєстрації | юзернейм/логін/пошта зайняті | оберіть інші; перевірте поля |
| `relation "users" does not exist` | міграції | `db:migrate`, логи `prestart` |
| `password authentication failed` | спецсимволи в паролі | URL-кодування |
| `Invalid environment configuration` | не всі env | див. розділ 3.4 |
| 500 при upload | Supabase bucket/key | public bucket, service_role |
| Зображення 404 | bucket private | public bucket |
| Render build падає | Node/devDeps | `NODE_VERSION=22`, `--include=dev` |
| Vercel build падає | `NEXT_PUBLIC_SITE_URL` не URL | повний https-URL |
| GitHub push rejected | нові коміти на remote | `git pull --rebase origin main` |

---

## 10. Чекліст перед захистом

- [ ] GitHub: код запушений, CI зелений, секретів немає.
- [ ] Supabase: таблиці створені, bucket `scene-media` public.
- [ ] Адмін створений; логін/пошта/пароль збережені.
- [ ] Render: `/health` = 200, логи без помилок, `FRONTEND_URL` точний.
- [ ] Vercel: `API_ORIGIN` точний, сайт відкривається.
- [ ] Реєстрація → вхід → каталог → створення → скарга → адмін.
- [ ] Відновлення пароля працює.
- [ ] Публічно видно лише юзернейм.
- [ ] Завантаження обкладинки/аватара працює.
- [ ] `/admin` недоступний USER; серверні 403 перевірені.
- [ ] Мобільна версія 390 px без горизонтального скролу.
- [ ] PageSpeed/W3C зроблені для звіту.
- [ ] `NEXT_PUBLIC_DEMO_MODE=false`, `SEED_DEMO=false`.

---

## 11. Шпаргалка

```powershell
# GitHub
cd D:\Practice-main\scene-project
git add -A
git status --short
git commit -m "feat: credential auth and deployment"
git push origin main

# Supabase migrations
cd server
$env:DATABASE_URL = "postgresql://..."; $env:DATABASE_SSL = "true"
npm ci
npm run db:migrate

# Admin seed
$env:ADMIN_USERNAME = "sceneadmin"
$env:ADMIN_LOGIN = "sceneadmin"
$env:ADMIN_EMAIL = "admin@yourdomain.com"
$env:ADMIN_PASSWORD = "StrongUniquePassword123!"
$env:SEED_DEMO = "false"
npm run db:seed

# Render: rootDir=server
# build: npm ci --include=dev && npm run build
# start: npm run start
# health: /health

# Vercel: root=.
# env: API_ORIGIN, NEXT_PUBLIC_SITE_URL, NEXT_PUBLIC_DEMO_MODE=false

# Peppers
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Після цих кроків фронтенд на Vercel звертається до API на Render через same-origin rewrite, API працює з PostgreSQL Supabase, а автентифікація не залежить від поштового сервісу.
