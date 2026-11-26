# Повний покроковий деплой «Сцени»

Цей документ — практичний чекліст від «є лише файли проєкту» до працюючого продакшену:

```
GitHub  →  Supabase (БД + Storage)  →  Resend (пошта)  →  Render (API)  →  Vercel (Next.js)
```

Орієнтовний час першого деплою — 1–2 години, з яких більшість — очікування DNS, Supabase та збірки.

> **Головне правило безпеки:** у GitHub потрапляють лише `.env.example` з заглушками. Справжні ключі вставляються:
> - локально — у `server/.env` та `.env.local` (вони в `.gitignore`);
> - у продакшені — у дашборди Render і Vercel, **не у файли репозиторію**.

---

## 0. Що куди завантажується

| Сервіс | Що саме | Як |
| --- | --- | --- |
| **GitHub** | Увесь вихідний код: `src/`, `public/`, `server/`, `docs/`, `package.json`, `package-lock.json`, `next.config.ts`, `tsconfig.json`, `render.yaml`, `.github/workflows/ci.yml`, `.env.example` | `git add`, `git commit`, `git push` |
| **Vercel** | Нічого вручну. Vercel підключається до GitHub і збирає корінь репозиторію (Next.js) | Імпорт репозиторію + 3 env-змінні |
| **Render** | Нічого вручну. Render підключається до GitHub, бере теку `server/` і збирає API | Web Service + env-змінні |
| **Supabase** | Нічого з файлів застосунку. Тут створюються PostgreSQL-БД, Storage bucket; міграції запускаються з `server/drizzle` через `npm run db:migrate` | SQL-міграції + bucket |
| **Resend** | Нічого з файлів. Домен, DNS-записи, API-ключ | Дашборд Resend |

**Не комітити ніколи:**

```
.env
.env.local
server/.env
node_modules/
.next/
out/
server/dist/
server/.data/
server/uploads/
.vercel/
```

У репозиторії вже налаштований `.gitignore`, але перед першим пушем обов’язково перевірте це вручну (розділ 1.4).

---

## 1. Підготовка та GitHub

### 1.1. Що вже є

У проєкті вже налаштований Git:

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

Якщо `origin` уже вказує на ваш репозиторій — **не створюйте новий** і не додавайте `origin` повторно. Переходьте до 1.3.

### 1.2. Якщо репозиторію на GitHub ще немає

1. Відкрийте <https://github.com/new>.
2. Repository name: `Scene_Course_Project`.
3. Виберіть **Public** (для захисту курсової зазвичай потрібен публічний репозиторій) або **Private**, якщо так погоджено.
4. **Не** ставте галочки «Add a README», «Add .gitignore», «Choose a license» — інакше буде конфлікт історії.
5. Натисніть **Create repository**.
6. У терміналі:

```powershell
cd D:\Practice-main\scene-project
git init
git branch -M main
git remote add origin https://github.com/Oleks1y-sus/Scene_Course_Project.git
```

> Якщо `git init` каже, що репозиторій уже існує — це нормально, у проєкті вже є `.git`.

Альтернатива через GitHub CLI (лише для нового репозиторію):

```powershell
gh auth login
gh repo create Scene_Course_Project --public --source=. --remote=origin --push
```

### 1.3. Перевірка перед комітом

```powershell
cd D:\Practice-main\scene-project

git status
git diff --stat
```

Ви побачите багато змін: це нормально, додано весь full-stack функціонал. Перевірте, що серед них **немає** `.env`:

```powershell
git status --short | Select-String -Pattern '\.env$|\.env\.local$|server/\.env$'
```

Якщо щось знайшлося — не комітьте це. Виконайте:

```powershell
git rm --cached server/.env .env.local
```

і переконайтеся, що `.gitignore` містить `.env*` з винятком `!.env.example`. Якщо ключ уже потрапив у Git-історію — **недостатньо видалити файл**, ключ треба відкликати/перегенерувати в Supabase, Resend, Render, Vercel.

### 1.4. Перевірка, що ігнорується

```powershell
git check-ignore -v server/.env
git check-ignore -v .env.local
git check-ignore -v server/node_modules
git check-ignore -v server/dist
git check-ignore -v .next
```

Кожна команда має показати правило з `.gitignore`. Якщо `server/.env` не ігнорується — виправте `.gitignore` перед комітом.

Перевірити, що потрапить у коміт:

```powershell
git add -A
git status --short
git diff --cached --name-only
```

У списку мають бути `server/`, `src/app/events/`, `src/app/profile/`, `docs/`, `render.yaml`, `.github/workflows/ci.yml`, `public/img/covers/` тощо. Не має бути `node_modules`, `.next`, `server/dist`, `.env`.

Швидка перевірка на секрети:

```powershell
git diff --cached | Select-String -Pattern 're_[A-Za-z0-9]|service_role|postgresql://.*:.*@|SUPABASE_SERVICE_ROLE_KEY=.+'
```

Якщо бачите реальний ключ — приберіть його з індексу та перегенеруйте.

### 1.5. Коміт і пуш

```powershell
git commit -m "feat: full-stack Scene platform with auth, events, moderation and admin"
git push origin main
```

Якщо це перший пуш гілки:

```powershell
git push -u origin main
```

Якщо GitHub відхилив пуш, бо на сервері є нові коміти:

```powershell
git pull --rebase origin main
git push origin main
```

Якщо конфлікт — вирішіть його у файлах, потім:

```powershell
git add <файли>
git rebase --continue
git push origin main
```

### 1.6. Авторизація Git

GitHub не приймає пароль від акаунта в `git push`.

- Найпростіше — встановити **Git Credential Manager** (зазвичай ставиться разом із Git for Windows) і увійти через браузер.
- Або створити **Personal Access Token**: GitHub → Settings → Developer settings → Personal access tokens.
  - Classic: scope `repo`.
  - Fine-grained: доступ до конкретного репозиторію, Contents: Read and write.
- Коли Git запитає password — вставте **токен**, не пароль акаунта.
- Не вставляйте токен у `git remote set-url` у вигляді `https://TOKEN@github.com/...`, бо він потрапить у `.git/config`. Якщо вже вставили — змініть URL назад і відкличте токен.

### 1.7. Перевірка на GitHub

1. Відкрийте `https://github.com/Oleks1y-sus/Scene_Course_Project`.
2. Переконайтеся, що є:
   - `src/`
   - `server/` (з `drizzle/`, `src/`, `package.json`, `.env.example`)
   - `docs/`
   - `render.yaml`
   - `.github/workflows/ci.yml`
   - `.env.example`
3. Переконайтеся, що **немає**:
   - `.env`, `.env.local`, `server/.env`
   - `node_modules`, `.next`, `server/dist`
4. Вкладка **Actions** → має запуститися CI (`Frontend` + `Backend`). Якщо він червоний — відкрийте лог і виправте до деплою. Найчастіші причини: не закомічений `package-lock.json`, помилка TypeScript, відсутній `API_ORIGIN` у CI (у робочому процесі він уже заданий як `http://localhost:4000`).

> Старий GitHub Pages workflow видалено. Сайт буде на Vercel, API — на Render. GitHub Pages для цього проєкту не потрібен.

---

## 2. Supabase: база даних і Storage

Supabase — це ваш PostgreSQL і сховище зображень. Автентифікація в проєкті **власна** (Express + Argon2id + OTP), тому Supabase Auth не використовується; потрібні лише Database і Storage.

### 2.1. Створення проєкту

1. Зареєструйтеся на <https://supabase.com>.
2. **New project**.
3. Name: `scene`.
4. Database Password: згенеруйте надійний пароль **і збережіть його** (він потрібен для `DATABASE_URL`).
5. Region: `Frankfurt` (або найближчий до Render).
6. Plan: Free для старту; для захисту краще платний, бо Free «засинає».
7. Дочекайтеся завершення створення (1–2 хвилини).

### 2.2. Ключі та connection string

Потрібні три значення.

#### A. `DATABASE_URL`

1. Supabase → **Project Settings** (шестерня) → **Database**.
2. **Connection string** → **URI**.
3. Виберіть **Session pooler** (порт `5432`). Це найстабільніший варіант для міграцій і Render.
4. Скопіюйте рядок. Він має вигляд:

```
postgresql://postgres.abcdefghijklmnop:[YOUR-PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:5432/postgres
```

5. Замініть `[YOUR-PASSWORD]` на пароль БД. Якщо в паролі є спецсимволи, URL-кодуйте їх:

| Символ | Код |
| --- | --- |
| `@` | `%40` |
| `#` | `%23` |
| `$` | `%24` |
| `%` | `%25` |
| `&` | `%26` |
| `/` | `%2F` |
| `:` | `%3A` |
| `?` | `%3F` |

Приклад: пароль `P@ss#1` → `P%40ss%231`.

6. Якщо Session pooler недоступний, використайте **Direct connection** (теж порт 5432). Не використовуйте transaction pooler (6543) для міграцій без потреби.

> `DATABASE_URL` — секрет. Він потрібен **тільки Render** (і локальним командам міграцій/сіду). Не додавайте його у Vercel.

#### B. `SUPABASE_URL`

1. **Project Settings** → **API**.
2. **Project URL** — наприклад `https://abcdefghijklmnop.supabase.co`.
3. Це значення для `SUPABASE_URL` на Render.

#### C. `SUPABASE_SERVICE_ROLE_KEY`

1. Там же: **Project API keys** → `service_role` → **Reveal** → скопіюйте.
2. Це **секретний** ключ. Він потрібен лише серверу (Render) для завантаження файлів у Storage.
3. **Ніколи** не додавайте його у Vercel, у клієнтський код, у GitHub або в публічні змінні `NEXT_PUBLIC_*`.
4. Якщо ключ випадково засвітився — **Rotate** у Supabase і оновіть Render.

### 2.3. Storage bucket

1. Supabase → **Storage** → **New bucket**.
2. Name: `scene-media` (саме так, якщо не змінюєте `SUPABASE_STORAGE_BUCKET`).
3. Public bucket: **увімкніть** (щоб `<img>` міг читати файли без підпису).
4. Створіть bucket.
5. Політики:
   - Public read — достатньо для перегляду зображень.
   - Запис/оновлення — через `service_role` з API; окремі RLS-політики для анонімного запису **не потрібні** й небезпечні.
6. Якщо bucket приватний, зображення будуть віддавати 403/404. Для курсового проєкту використовуйте public bucket.

### 2.4. Міграції БД

Міграції лежать у `server/drizzle/`:

```
server/drizzle/0000_scene_initial.sql
server/drizzle/meta/_journal.json
```

Їх не можна просто вставити в SQL Editor Supabase: тоді не буде запису в службовій таблиці міграцій, і `prestart` на Render спробує застосувати їх повторно. Запускайте через Drizzle migrator.

```powershell
cd D:\Practice-main\scene-project\server
npm ci

$env:DATABASE_URL = "postgresql://postgres.xxxxx:ENCODED_PASSWORD@aws-0-eu-central-1.pooler.supabase.com:5432/postgres"
$env:DATABASE_SSL = "true"

npm run db:migrate
```

Очікуваний вивід:

```
Database migrations applied.
```

Перевірка: Supabase → **Table Editor** → мають з’явитися таблиці:

`users`, `sessions`, `auth_codes`, `webinars`, `favorites`, `registrations`, `reports`, `media`, `audit_logs`, а також службова схема `drizzle`.

> Якщо бачите `password authentication failed` — перевірте URL-кодування пароля та те, що скопіювали саме Session pooler. Якщо `ENOTFOUND` — перевірте хост із connection string.

### 2.5. Перший адміністратор

Адміністратора створює seed-скрипт. Він **не створює демо-даних**, якщо `SEED_DEMO=false`.

```powershell
cd D:\Practice-main\scene-project\server

$env:DATABASE_URL = "postgresql://postgres.xxxxx:ENCODED_PASSWORD@aws-0-eu-central-1.pooler.supabase.com:5432/postgres"
$env:DATABASE_SSL = "true"
$env:ADMIN_EMAIL = "admin@yourdomain.com"
$env:ADMIN_PASSWORD = "YourStrongUniquePassword123!"
$env:ADMIN_NAME = "Адміністратор"
$env:SEED_DEMO = "false"

npm run db:seed
```

Очікувано: `Admin created: admin@yourdomain.com`.

Правила:

- Пароль — мінімум 10 символів; краще 16+ і унікальний.
- `ADMIN_EMAIL` — реальна пошта, на неї приходитиме OTP.
- Якщо адмін уже існує, seed **не змінить** пароль. Збережіть пароль у менеджері паролів; якщо загубили — створіть окремий скрипт/змініть пароль через профіль після входу.
- Не залишайте `ADMIN_PASSWORD=Admin12345!` у продакшені.
- `SEED_DEMO=false` обов’язково; демо-акаунти в продакшені не потрібні.

> Якщо запускаєте seed на Render Shell, там уже є env-змінні; достатньо задати `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME`, `SEED_DEMO=false` і виконати `npm run db:seed:prod` (попередньо має бути виконаний `npm run build`).

### 2.6. Резервні копії

Supabase → Database → Backups. На Free доступні обмежені бекапи; перед захистом зробіть експорт/знімок. Не зберігайте дамп із персональними даними в публічному GitHub.

---

## 3. Resend: листи з OTP

### 3.1. Домен

1. Зареєструйтеся на <https://resend.com>.
2. **Domains** → **Add Domain** → введіть ваш домен, наприклад `scene.yourdomain.com`.
3. Resend покаже DNS-записи (SPF, DKIM, інколи DMARC). Додайте їх у панелі вашого реєстратора домену/Cloudflare.
4. Дочекайтеся статусу **Verified**. Це може зайняти від кількох хвилин до кількох годин.
5. Без верифікованого домену можна тестувати лише `onboarding@resend.dev` і лише на свою пошту; для реальних користувачів це не підходить.

### 3.2. API-ключ

1. Resend → **API Keys** → **Create API Key**.
2. Name: `scene-render`.
3. Permission: **Sending access** (достатньо для листів).
4. Domain: ваш верифікований домен.
5. Скопіюйте ключ `re_...` **одразу** — після закриття вікна він більше не показується.
6. Збережіть у менеджері паролів. Він потрібен **тільки Render**.

### 3.3. Значення для env

| Змінна | Приклад | Де взяти |
| --- | --- | --- |
| `RESEND_API_KEY` | `re_xxxxxxxxx` | Resend → API Keys |
| `RESEND_FROM` | `Сцена <no-reply@scene.yourdomain.com>` | Ваш верифікований домен |
| `SUPPORT_EMAIL` | `support@scene.yourdomain.com` | Будь-яка ваша пошта |

`RESEND_FROM` у дашборді Render вводьте **без лапок**. У `.env`-файлі лапки допустимі; якщо в значенні є `#`, беріть у лапки.

### 3.4. Тест

Після деплою API:

1. Увійдіть у застосунок.
2. Введіть пароль.
3. На пошту має прийти 6-значний код.
4. Якщо листа немає: Resend → **Logs** → перевірте статус, домен, `RESEND_FROM`, спам.

---

## 4. Render: API

### 4.1. Створення сервісу

1. Зареєструйтеся на <https://render.com> і підключіть GitHub.
2. **New** → **Web Service**.
3. Виберіть репозиторій `Oleks1y-sus/Scene_Course_Project`.
4. Налаштування:

| Поле | Значення |
| --- | --- |
| Name | `scene-api` |
| Region | Frankfurt (або найближчий) |
| Branch | `main` |
| **Root Directory** | **`server`** |
| Runtime | Node |
| Build Command | `npm ci --include=dev && npm run build` |
| Start Command | `npm run start` |
| Health Check Path | `/health` |
| Instance Type | Free для старту; Starter для захисту (без cold start) |

**Чому саме так:**

- `Root Directory = server` — інакше Render збере корінь Next.js і не знайде Express.
- `npm ci --include=dev` — `tsc` і типи потрібні під час build; без devDependencies build впаде.
- `npm run start` — npm автоматично виконає `prestart`, який запускає `node dist/db/migrate.js`, а потім `node dist/index.js`. Якщо замінити на `node dist/index.js`, міграції не застосуються.
- `/health` — Render не вважатиме сервіс живим, поки не отримає 200.

### 4.2. Environment variables

Render → ваш сервіс → **Environment** → **Add Environment Variable**. Додавайте по одній.

#### Обов’язкові

| Key | Value | Секрет? |
| --- | --- | --- |
| `NODE_ENV` | `production` | ні |
| `TRUST_PROXY` | `1` | ні |
| `DATABASE_URL` | Supabase Session pooler URL | **так** |
| `DATABASE_SSL` | `true` | ні |
| `DB_POOL_MAX` | `10` | ні |
| `FRONTEND_URL` | `https://<ваш-проєкт>.vercel.app` (спочатку тимчасово, потім точний) | ні |
| `CORS_EXTRA_ORIGINS` | `` (або preview-домени через кому) | ні |
| `SESSION_COOKIE_NAME` | `scene_session` | ні |
| `SESSION_TTL_DAYS` | `7` | ні |
| `COOKIE_SECURE` | `true` | ні |
| `SESSION_PEPPER` | випадковий рядок 48+ байт | **так** |
| `OTP_PEPPER` | інший випадковий рядок 48+ байт | **так** |
| `IP_PEPPER` | третій випадковий рядок 48+ байт | **так** |
| `MAIL_MODE` | `resend` | ні |
| `RESEND_API_KEY` | `re_...` | **так** |
| `RESEND_FROM` | `Сцена <no-reply@yourdomain.com>` | ні |
| `SUPPORT_EMAIL` | `support@yourdomain.com` | ні |
| `EXPOSE_DEV_CODES` | `false` | ні |
| `SUPABASE_URL` | `https://xxxx.supabase.co` | ні |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key | **так** |
| `SUPABASE_STORAGE_BUCKET` | `scene-media` | ні |
| `SEED_DEMO` | `false` | ні |
| `ALLOW_ORIGINLESS_REQUESTS` | `false` | ні |
| `RATE_LIMIT_DISABLED` | `false` | ні |
| `MAX_ACTIVE_SESSIONS` | `10` | ні |
| `LOG_LEVEL` | `info` | ні |
| `NODE_VERSION` | `22` | ні |

#### Необов’язкові / не для production runtime

| Key | Коментар |
| --- | --- |
| `PORT` | Render задає автоматично; не додавайте |
| `PGLITE_DATA_DIR` | лише локальний PGlite |
| `UPLOAD_DIR` | локальний fallback; у production файли йдуть у Supabase Storage |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` | лише для seed; у runtime не потрібні |
| `DEMO_PASSWORD` | лише для локального seed |

#### Генерація пеперів

Виконайте команду **тричі** й вставте три різні значення:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Не використовуйте значення з `.env.example` (`dev-only-...`) — production-валідація не дасть серверу стартувати.

### 4.3. `render.yaml` vs ручне створення

У репозиторії є `render.yaml` — Blueprint. Він описує:

- `rootDir: server`
- `buildCommand`
- `startCommand`
- `healthCheckPath`
- перелік env-змінних; для секретів стоїть `sync: false` — Render попросить ввести їх під час створення Blueprint.

Варіанти:

- **Простіше:** створити Web Service вручну (розділ 4.1) і ввести env у дашборді.
- **Автоматизовано:** New → Blueprint → вибрати репозиторій → Render прочитає `render.yaml` → заповнити секрети.

Якщо використовуєте Blueprint, не забудьте змінити `plan: free` на потрібний і перевірити `region`.

### 4.4. Перший деплой

1. Натисніть **Create Web Service** / **Deploy**.
2. Відкрийте **Logs**. Очікувані етапи:
   - `npm ci`
   - `npm run build` → `dist/`
   - `prestart` → `Database migrations applied.`
   - `scene-api:started`
3. Після статусу **Live** відкрийте:

```
https://<render-service>.onrender.com/health
```

Очікувано:

```json
{"status":"ok","uptime":5,"timestamp":"..."}
```

4. Запишіть точний URL сервісу — він потрібен Vercel як `API_ORIGIN`. Якщо Render згенерував інше ім’я (наприклад `scene-api-abc1`), використовуйте саме його.

### 4.5. Типові помилки старту

| Помилка в логах | Причина | Рішення |
| --- | --- | --- |
| `Invalid environment configuration` | не заповнена/некоректна env | перевірте список нижче |
| `DATABASE_URL=pglite is not allowed in production` | забули Supabase URL | вставте `DATABASE_URL` |
| `Production requires MAIL_MODE=resend...` | `MAIL_MODE`/`RESEND_API_KEY` | вставте обидва |
| `EXPOSE_DEV_CODES must be false` | true | поставте `false` |
| `COOKIE_SECURE must be true` | false | поставте `true` |
| `FRONTEND_URL must use HTTPS` | http або localhost | вставте https-домен Vercel |
| `password authentication failed` | пароль у URL | URL-кодуйте спецсимволи |
| `relation "users" does not exist` | міграції не виконані | перевірте `prestart`/запустіть `db:migrate` |
| build падає на `sharp`/`argon2` | старий Node | `NODE_VERSION=22` |
| 502 на `/health` | сервіс ще стартує / впав | дивіться Logs |

> **Free tier Render** засинає після простою. Перший запит може йти 30–60 секунд. Для захисту краще Starter.

### 4.6. Оновлення `FRONTEND_URL` після Vercel

Після того як Vercel видасть фінальний URL:

1. Render → Environment → `FRONTEND_URL` → вставте точний `https://...vercel.app` (без слеша в кінці).
2. Якщо маєте preview-деплої Vercel, додайте їх у `CORS_EXTRA_ORIGINS` через кому (точна адреса, без wildcard).
3. **Manual Deploy → Deploy latest commit** (або перезапустіть сервіс), щоб env застосувався.

Без цього кроку GET-запити можуть працювати, а POST (вхід, OTP, створення) буде відхилятися через CORS/CSRF.

---

## 5. Vercel: Next.js

### 5.1. Імпорт

1. Зареєструйтеся на <https://vercel.com> через GitHub.
2. **Add New** → **Project** → імпортуйте `Oleks1y-sus/Scene_Course_Project`.
3. Framework Preset: **Next.js** (визначиться автоматично).
4. **Root Directory**: залиште корінь репозиторію (`.`) — **не** вибирайте `server`.
5. Build Command: залиште стандартне (`npm run build` / `next build`).
6. Install Command: стандартне (`npm install`).
7. Output Directory: стандартне.

### 5.2. Environment variables

Vercel → Project → **Settings** → **Environment Variables**. Додайте у **Production** (і за потреби у Preview):

| Key | Value | Публічна? |
| --- | --- | --- |
| `API_ORIGIN` | `https://<render-service>.onrender.com` | ні, але не секрет |
| `NEXT_PUBLIC_SITE_URL` | `https://<vercel-project>.vercel.app` | так |
| `NEXT_PUBLIC_DEMO_MODE` | `false` | так |

Правила:

- `API_ORIGIN` — **без** слеша в кінці й **без** `/api/v1`. Next.js сам додає шлях.
- `NEXT_PUBLIC_SITE_URL` — точний фінальний домен; використовується для canonical/Open Graph.
- `NEXT_PUBLIC_DEMO_MODE=true` показує демо-акаунти на `/login`. Для продакшену — **false**.
- **Не додавайте у Vercel**: `DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, пепери. Вони не потрібні фронтенду й небезпечні.
- `API_ORIGIN` читається під час **build** (у `next.config.ts` для rewrites). Після зміни цієї змінної обов’язковий **Redeploy**, інакше rewrite залишиться старим.

### 5.3. Деплой

1. **Deploy**.
2. Дочекайтеся `Ready`.
3. Відкрийте URL виду `https://scene-course-project.vercel.app`.
4. Запишіть точний URL.
5. Поверніться в Render і оновіть `FRONTEND_URL` (розділ 4.6).

### 5.4. Перевірка зв’язки

У браузері:

- `/` — головна.
- `/login` — форма входу.
- `/events` без входу → редірект на `/login?next=/events`.
- Вхід: пароль → лист із кодом → каталог.
- `/admin` під USER → редірект на `/events`; під ADMIN → панель.
- Створення заходу з обкладинкою → файл у Supabase Storage.
- Скарга → адмінпанель.

У DevTools → Network:

- запити йдуть на `/api/v1/...` (same-origin, не напряму на Render);
- відповіді 200/201;
- cookie `scene_session`: `HttpOnly`, `Secure`, `SameSite=Lax`;
- немає 401/403/500.

### 5.5. Кастомний домен (опційно)

1. Vercel → Settings → Domains → Add.
2. Додайте DNS-записи у реєстратора.
3. Оновіть `NEXT_PUBLIC_SITE_URL` на `https://yourdomain.com`, зробіть Redeploy.
4. Оновіть `FRONTEND_URL` на Render, перезапустіть API.
5. Якщо залишаєте і `*.vercel.app`, додайте його в `CORS_EXTRA_ORIGINS`.

### 5.6. Preview-деплої

Кожен PR може створювати preview-URL. Щоб логін працював:

- додайте конкретний preview-origin у `CORS_EXTRA_ORIGINS` Render;
- `FRONTEND_URL` залишається production-доменом;
- або вимкніть preview для цього проєкту.

Wildcard `https://*.vercel.app` у CORS не працює — потрібні точні origin.

---

## 6. Повна перевірка після деплою

### 6.1. API

```powershell
Invoke-RestMethod https://<render-service>.onrender.com/health
```

Очікувано: `status: ok`.

```powershell
Invoke-RestMethod "https://<vercel-project>.vercel.app/api/v1/webinars?limit=1"
```

Очікувано: JSON з `data` і `meta` (публічний каталог).

### 6.2. Сценарій користувача

1. Зареєструйте нового користувача (не демо).
2. Отримайте OTP на пошту.
3. Увійдіть.
4. Змініть ім’я/аватар.
5. Створіть захід із майбутньою датою й обкладинкою.
6. Перевірте, що він з’явився в каталозі й позначений «Ваш захід».
7. Другим акаунтом додайте в обране та зареєструйтеся.
8. Власником запустіть і завершіть ефір.
9. Надішліть скаргу; перевірте адмінпанель.
10. Створіть нового адміна; увійдіть ним; змініть тимчасовий пароль.

### 6.3. Безпека

- `/admin` без входу → login; USER → редірект.
- `POST /api/v1/auth/logout` без `Origin` → 403.
- Спроба `<script>` у назві → 422.
- Чужий `PATCH /webinars/:id` → 403.
- 6 невдалих паролів → блокування.
- 6+ OTP-спроб → новий код.
- Завантаження `.svg`/`.exe` → 415; >2 МБ → 413.
- Cookie `Secure` на HTTPS.
- У консолі браузера немає помилок.

### 6.4. Швидкість і валідність

- PageSpeed Insights для `/`, `/login`, `/events` (див. `docs/QA.md`).
- W3C HTML/CSS.
- Мобільна ширина 390 px: немає горизонтального скролу.
- Render Free може погіршувати TTFB; для захисту — Starter.

---

## 7. Оновлення після першого деплою

### 7.1. Звичайні зміни коду

```powershell
cd D:\Practice-main\scene-project
git add -A
git commit -m "fix: ..."
git push origin main
```

- Vercel автоматично перезбереже фронтенд.
- Render автоматично перезбереже API (якщо `autoDeploy` увімкнено).
- CI на GitHub перевірить типи/тести.

### 7.2. Зміни схеми БД

1. Змініть `server/src/db/schema.ts`.
2. Згенеруйте міграцію:

```powershell
cd server
npm run db:generate
```

3. Закомітьте новий `.sql` і `meta/` у Git.
4. Застосуйте:

```powershell
$env:DATABASE_URL = "..."
$env:DATABASE_SSL = "true"
npm run db:migrate
```

5. Задеплойте. Render `prestart` також застосує міграцію, але краще перевірити локально.

> Не редагуйте вже застосовані міграції. Додавайте нові.

### 7.3. Відкат

- Vercel: Deployments → потрібний деплой → **Promote to Production** / Rollback.
- Render: Events / Deploys → **Rollback**.
- БД: міграції не відкочуються автоматично; відновлюйте з бекапу Supabase.
- Секрети: якщо відкочуєте код, який очікує інші env, перевірте сумісність.

### 7.4. Ротація секретів

Ротyйте, якщо ключ потрапив у чат/лог/скрін:

1. Supabase → service_role → Rotate; оновіть Render.
2. Resend → API key → revoke/create; оновіть Render.
3. Нові `SESSION_PEPPER`/`OTP_PEPPER`/`IP_PEPPER` → оновіть Render (усі сесії стануть недійсними).
4. Змініть пароль адміна.

---

## 8. Файли env: локально vs production

### 8.1. Локально

| Файл | Призначення | Приклад |
| --- | --- | --- |
| `D:\Practice-main\scene-project\.env.local` | адреса локального API для Next.js | `API_ORIGIN=http://localhost:4000` |
| `D:\Practice-main\scene-project\server\.env` | усі налаштування Express | копія `server/.env.example` |
| `D:\Practice-main\scene-project\.env.example` | шаблон для Git | комітиться |
| `D:\Practice-main\scene-project\server\.env.example` | шаблон для Git | комітиться |

Локальний `.env.local`:

```env
API_ORIGIN=http://localhost:4000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_DEMO_MODE=true
```

Локальний `server/.env` (мінімум):

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
OTP_PEPPER=local-otp-pepper-at-least-32-characters
IP_PEPPER=local-ip-pepper-at-least-32-characters
MAIL_MODE=console
EXPOSE_DEV_CODES=true
SUPABASE_STORAGE_BUCKET=scene-media
UPLOAD_DIR=./uploads
ADMIN_EMAIL=admin@scene.local
ADMIN_PASSWORD=Admin12345!
SEED_DEMO=true
DEMO_PASSWORD=Demo12345!
```

### 8.2. Production

| Сервіс | Де задаються env | Які саме |
| --- | --- | --- |
| Render | Dashboard → Environment | усі `server/.env`-змінні, крім локальних PGlite/сіду |
| Vercel | Settings → Environment Variables | `API_ORIGIN`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_DEMO_MODE` |
| Supabase | Dashboard | нічого для застосунку; ключі копіюються в Render |
| Resend | Dashboard | нічого для застосунку; ключ копіюється в Render |
| GitHub | `.env.example` | лише заглушки |

**Немає файлу `server/.env` на Render.** Render не бере його з репозиторію (він у `.gitignore`); змінні задаються в дашборді. Якщо створити `server/.env` локально й закомітити — це витік секретів.

---

## 9. Точний перелік файлів у GitHub

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
  img/
    avatars/
    covers/
    icons.svg
    ...
src/
  app/
  components/
  lib/
  proxy.ts
server/
  .env.example
  README.md
  drizzle.config.ts
  drizzle/
    0000_scene_initial.sql
    meta/_journal.json
  package.json
  package-lock.json
  tsconfig.json
  tsconfig.build.json
  src/
    app.ts
    index.ts
    env.ts
    db/
    lib/
    middleware/
    modules/
    services/
    types/
```

**Не має бути в GitHub:**

```
node_modules/
.next/
out/
server/node_modules/
server/dist/
server/.data/
server/uploads/
.env
.env.local
server/.env
.vercel/
*.tsbuildinfo
next-env.d.ts   (генерується автоматично)
```

`next-env.d.ts` у `.gitignore` — це нормально; Next створить його під час build.

---

## 10. Часті проблеми

| Симптом | Причина | Що робити |
| --- | --- | --- |
| Vercel 502 / API недоступний | `API_ORIGIN` неправильний або Render спить | перевірте URL, health, cold start |
| 403 `CSRF_REJECTED` після входу | `FRONTEND_URL` не збігається з origin Vercel | оновіть Render env, redeploy |
| 403 `CORS_REJECTED` | те саме або preview-домен | точний origin у `FRONTEND_URL`/`CORS_EXTRA_ORIGINS` |
| Логін проходить, але `/auth/me` 401 | cookie не ставиться | HTTPS, `COOKIE_SECURE=true`, перевірте Set-Cookie |
| OTP не приходить | Resend домен/ключ/from | Resend Logs, спам, `RESEND_FROM` |
| `relation "users" does not exist` | міграції | `db:migrate`, логи `prestart` |
| `password authentication failed` | пароль у `DATABASE_URL` | URL-кодування |
| `Invalid environment configuration` | production-валідація | перевірте всі env зі списку |
| Завантаження 500 | Supabase Storage/bucket/key | bucket public, service_role, `SUPABASE_URL` |
| Зображення 404 | bucket private / неправильний URL | public bucket, перевірте URL |
| Render build падає | Node 20 або devDeps | `NODE_VERSION=22`, `--include=dev` |
| Vercel build падає на `metadataBase` | некоректний `NEXT_PUBLIC_SITE_URL` | вкажіть повний https-URL |
| GitHub push rejected | remote має нові коміти | `git pull --rebase origin main` |
| CI червоний | TypeScript/тести/лок | відкрийте Actions, виправте, запуште |

---

## 11. Мінімальний чекліст перед захистом

- [ ] GitHub: код запушений, CI зелений, секретів немає.
- [ ] Supabase: таблиці створені, bucket `scene-media` public.
- [ ] Адмін створений із сильним паролем; пароль збережений.
- [ ] Resend: домен Verified, API key у Render, OTP доходить.
- [ ] Render: `/health` = 200, логи без помилок, `FRONTEND_URL` точний.
- [ ] Vercel: `API_ORIGIN` точний, сайт відкривається.
- [ ] Реєстрація → OTP → каталог → створення → скарга → адмін.
- [ ] Завантаження обкладинки/аватара працює.
- [ ] `/admin` недоступний USER; серверні 403 перевірені.
- [ ] Мобільна версія 390 px без горизонтального скролу.
- [ ] PageSpeed/W3C зроблені для звіту.
- [ ] `NEXT_PUBLIC_DEMO_MODE=false`, `SEED_DEMO=false`, `EXPOSE_DEV_CODES=false`.

---

## 12. Коротка шпаргалка команд

```powershell
# GitHub
cd D:\Practice-main\scene-project
git status
git add -A
git status --short
git commit -m "feat: deploy ready"
git push origin main

# Supabase migrations
cd server
$env:DATABASE_URL = "postgresql://..."; $env:DATABASE_SSL = "true"
npm ci
npm run db:migrate

# Admin seed
$env:ADMIN_EMAIL = "admin@yourdomain.com"
$env:ADMIN_PASSWORD = "StrongUniquePassword123!"
$env:ADMIN_NAME = "Адміністратор"
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

Готово: після цих кроків фронтенд на Vercel звертається до API на Render через same-origin rewrite, API працює з PostgreSQL Supabase, а листи йдуть через Resend.
