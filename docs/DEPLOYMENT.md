# Деплой: Vercel + Render + Supabase + Resend

> **Повний покроковий чекліст** з отриманням ключів, точними env-змінними, GitHub-командами та переліком файлів для кожного сервісу: [`DEPLOYMENT-STEP-BY-STEP.md`](DEPLOYMENT-STEP-BY-STEP.md).

## 0. Передумови

- GitHub-репозиторій з цим проєктом.
- Акаунти: Supabase, Render, Vercel, Resend.
- Node.js 22 локально (для міграцій і сіду).

## 1. Supabase (PostgreSQL + Storage)

1. Створіть новий проєкт Supabase, регіон — найближчий до Render (наприклад, Frankfurt).
2. **Project Settings → Database → Connection string → Session pooler**. Скопіюйте рядок вигляду:
   ```
   postgresql://postgres.xxxxx:PASSWORD@aws-0-eu-central-1.pooler.supabase.com:5432/postgres
   ```
   Використовуйте саме session pooler (порт 5432) для міграцій і стабільних з’єднань. Якщо ваш тариф/регіон пропонує direct connection — він теж підходить.
3. Локально застосуйте міграції:
   ```bash
   cd server
   # тимчасово встановіть production DATABASE_URL у середовищі
   $env:DATABASE_URL="postgresql://..."; $env:DATABASE_SSL="true"
   npm run db:migrate
   ```
   Або дозвольте Render зробити це автоматично під час першого старту (`prestart` виконує `node dist/db/migrate.js`).
4. Створіть **Storage bucket** `scene-media`:
   - Public bucket (щоб `<img>` міг читати файли).
   - Policy: public read; запис — лише через service role (API).
5. (Опційно) Створіть першого адміністратора:
   ```bash
   cd server
   $env:DATABASE_URL="postgresql://..."; $env:DATABASE_SSL="true"
   $env:ADMIN_EMAIL="admin@yourdomain.com"
   $env:ADMIN_PASSWORD="StrongPassword123!"
   $env:SEED_DEMO="false"
   npm run db:seed:prod
   ```
   Після цього змініть пароль у профілі (система не змушує для сід-адміна, але це безпечніше).

## 2. Resend (email)

1. Додайте домен у Resend, пройдіть DNS-верифікацію (SPF/DKIM).
2. Створіть API key.
3. `RESEND_FROM` має бути на верифікованому домені, наприклад:
   ```
   RESEND_FROM="Сцена <no-reply@scene.yourdomain.com>"
   ```
4. Без верифікованого домену Resend дозволяє тестовий `onboarding@resend.dev` лише на вашу власну пошту.

## 3. Render (API)

1. New → Web Service → підключіть репозиторій.
2. Налаштування:
   - **Root Directory**: `server`
   - **Runtime**: Node
   - **Build Command**: `npm ci --include=dev && npm run build`
   - **Start Command**: `npm run start` (автоматично виконає міграції через `prestart`)
   - **Health Check Path**: `/health`
   - **Instance**: Free або Starter.
3. Environment variables:

| Змінна | Значення |
| --- | --- |
| `NODE_ENV` | `production` |
| `PORT` | Render задає сам; залиште порожнім або `10000` |
| `TRUST_PROXY` | `1` |
| `DATABASE_URL` | Supabase session pooler URL |
| `DATABASE_SSL` | `true` |
| `DB_POOL_MAX` | `10` |
| `FRONTEND_URL` | `https://your-app.vercel.app` (точний origin, без слеша) |
| `CORS_EXTRA_ORIGINS` | (порожньо або preview-домени Vercel) |
| `SESSION_COOKIE_NAME` | `scene_session` |
| `COOKIE_SECURE` | `true` |
| `SESSION_TTL_DAYS` | `7` |
| `SESSION_PEPPER` | випадковий 48+ байт |
| `OTP_PEPPER` | випадковий 48+ байт |
| `IP_PEPPER` | випадковий 48+ байт |
| `MAIL_MODE` | `resend` |
| `RESEND_API_KEY` | `re_...` |
| `RESEND_FROM` | `Сцена <no-reply@scene.yourdomain.com>` |
| `SUPPORT_EMAIL` | `support@scene.yourdomain.com` |
| `EXPOSE_DEV_CODES` | `false` |
| `SUPABASE_URL` | `https://xxxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | service role key (лише сервер!) |
| `SUPABASE_STORAGE_BUCKET` | `scene-media` |
| `SEED_DEMO` | `false` |
| `ALLOW_ORIGINLESS_REQUESTS` | `false` |
| `RATE_LIMIT_DISABLED` | `false` |

Згенерувати пепери:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

> `SUPABASE_SERVICE_ROLE_KEY` не можна додавати у Vercel або віддавати клієнту.

4. Перевірте `https://scene-api.onrender.com/health` → `{"status":"ok",...}`.

Render free tier «засинає» після простою; перший запит може тривати 30–60 с. Для захисту краще Starter.

## 4. Vercel (Next.js)

1. Import Git repository. Framework preset — Next.js. Root — корінь репозиторію.
2. Environment variables (Production + Preview):

| Змінна | Значення |
| --- | --- |
| `API_ORIGIN` | `https://scene-api.onrender.com` |
| `NEXT_PUBLIC_SITE_URL` | `https://your-app.vercel.app` |
| `NEXT_PUBLIC_DEMO_MODE` | `false` |

> `API_ORIGIN` читається під час `next build` для rewrites, тому після зміни env потрібен redeploy.

3. Deploy. Перевірте:
   - `https://your-app.vercel.app/` — головна.
   - `/events` без входу → редірект на `/login?next=/events`.
   - Вхід: пароль → код (реальний лист).
   - `/admin` з USER → редірект на `/events`; з ADMIN — панель.
   - Завантаження обкладинки → файл у Supabase Storage.

## 5. Пост-деплой чекліст

- [ ] `/health` API відповідає 200.
- [ ] Міграції застосовані; таблиці створені.
- [ ] Лист із кодом надходить (перевірте Resend Logs).
- [ ] Cookie `scene_session` має `HttpOnly`, `Secure`, `SameSite=Lax`.
- [ ] Вхід/вихід, зміна пароля, зміна пошти.
- [ ] Каталог, фільтри, пагінація, обране, реєстрація.
- [ ] Створення заходу з обкладинкою; модерація підозрілої назви.
- [ ] Скарга → адмінпанель → приховати/відхилити.
- [ ] Створення нового адміна та перший вхід із тимчасовим паролем.
- [ ] Видалення тестового користувача → його заходи зникають.
- [ ] Немає помилок у консолі браузера.
- [ ] PageSpeed Insights для `/`, `/events`, `/login`.
- [ ] W3C HTML/CSS перевірки (див. `docs/QA.md`).

## 6. Оновлення та відкат

- Схема БД змінюється: оновіть `server/src/db/schema.ts`, згенеруйте міграцію (`npm run db:generate`), закомітьте SQL, задеплойте. Render виконає її на старті.
- Відкат: Render → Rollback до попереднього деплою; Vercel → Instant Rollback. Міграції зміни схеми назад не відкочуються автоматично — тримайте резервну копію Supabase.
- Секрети зберігаються лише в Render/Vercel; ніколи не комітьте `.env`.
