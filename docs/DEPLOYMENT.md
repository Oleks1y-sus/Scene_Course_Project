# Деплой: Vercel + Render + Supabase

> **Пошта більше не використовується.** Resend, домен і DNS не потрібні. Реєстрація/вхід працюють за логіном і паролем; відновлення пароля — за парою «логін + пошта». Детальний чекліст: [`DEPLOYMENT-STEP-BY-STEP.md`](DEPLOYMENT-STEP-BY-STEP.md).

## 0. Передумови

- GitHub-репозиторій з проєктом.
- Акаунти: Supabase, Render, Vercel.
- Node.js 22 локально (для міграцій і сіду).

## 1. Supabase (PostgreSQL + Storage)

1. Створіть проєкт Supabase, регіон — найближчий до Render (наприклад, Frankfurt).
2. **Project Settings → Database → Connection string → Session pooler** (порт 5432). Скопіюйте рядок:
   ```
   postgresql://postgres.xxxxx:PASSWORD@aws-0-eu-central-1.pooler.supabase.com:5432/postgres
   ```
3. Локально застосуйте міграції:
   ```powershell
   cd server
   $env:DATABASE_URL="postgresql://..."; $env:DATABASE_SSL="true"
   npm ci
   npm run db:migrate
   ```
   Або дозвольте Render зробити це автоматично під час першого старту (`prestart`).
4. Створіть **Storage bucket** `scene-media`, public.
5. Створіть першого адміністратора:
   ```powershell
   $env:ADMIN_USERNAME="sceneadmin"
   $env:ADMIN_LOGIN="sceneadmin"
   $env:ADMIN_EMAIL="admin@yourdomain.com"
   $env:ADMIN_PASSWORD="StrongUniquePassword123!"
   $env:SEED_DEMO="false"
   npm run db:seed
   ```
   Система не надсилає листів; логін/пошта/пароль потрібні для входу. Пароль передайте адміністратору безпечним каналом.

## 2. Render (API)

1. New → Web Service → підключіть репозиторій.
2. **Root Directory**: `server`.
3. Runtime: Node.
4. **Build Command**: `npm ci --include=dev && npm run build`.
5. **Start Command**: `npm run start` (автоматично виконає міграції через `prestart`).
6. **Health Check Path**: `/health`.
7. Environment variables:

| Змінна | Значення |
| --- | --- |
| `NODE_ENV` | `production` |
| `TRUST_PROXY` | `1` |
| `DATABASE_URL` | Supabase session pooler URL |
| `DATABASE_SSL` | `true` |
| `DB_POOL_MAX` | `10` |
| `FRONTEND_URL` | `https://your-app.vercel.app` (точний origin, без слеша) |
| `CORS_EXTRA_ORIGINS` | (порожньо або preview-домени Vercel) |
| `SESSION_COOKIE_NAME` | `scene_session` |
| `SESSION_TTL_DAYS` | `7` |
| `COOKIE_SECURE` | `true` |
| `SESSION_PEPPER` | випадковий 48+ байт |
| `IP_PEPPER` | випадковий 48+ байт |
| `SUPABASE_URL` | `https://xxxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key (лише сервер!) |
| `SUPABASE_STORAGE_BUCKET` | `scene-media` |
| `SEED_DEMO` | `false` |
| `ALLOW_ORIGINLESS_REQUESTS` | `false` |
| `RATE_LIMIT_DISABLED` | `false` |
| `MAX_ACTIVE_SESSIONS` | `10` |
| `NODE_VERSION` | `22` |

`PORT` Render задає сам. `OTP_PEPPER`, `MAIL_MODE`, `RESEND_*` більше не існують.

Згенерувати пепери:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Перевірте `https://<render-service>.onrender.com/health` → `{"status":"ok",...}`.

Render free tier «засинає» після простою; для захисту краще Starter.

## 3. Vercel (Next.js)

1. Import Git repository. Framework — Next.js. Root — корінь репозиторію (`.`, не `server`).
2. Environment variables (Production + Preview):

| Змінна | Значення |
| --- | --- |
| `API_ORIGIN` | `https://<render-service>.onrender.com` |
| `NEXT_PUBLIC_SITE_URL` | `https://<vercel-project>.vercel.app` |
| `NEXT_PUBLIC_DEMO_MODE` | `false` |

`API_ORIGIN` читається під час `next build` для rewrites, тому після зміни потрібен Redeploy.

3. Deploy.
4. Поверніться в Render і оновіть `FRONTEND_URL` на точний URL Vercel, перезапустіть API. Без цього POST-запити (вхід, реєстрація, створення) можуть падати з 403 CSRF/CORS.

## 4. Перевірка

- [ ] `/health` API відповідає 200.
- [ ] Міграції застосовані; таблиці створені.
- [ ] Реєстрація нового користувача (юзернейм, логін, пошта, пароль).
- [ ] Вхід за логіном і паролем; cookie `scene_session` з `HttpOnly`, `Secure`, `SameSite=Lax`.
- [ ] Відновлення пароля: логін + пошта → новий пароль → вхід.
- [ ] Профіль: зміна юзернейма, аватара, пошти, пароля.
- [ ] Каталог, фільтри, пагінація, обране, реєстрація.
- [ ] Створення заходу з обкладинкою; модерація підозрілої назви.
- [ ] Скарга → адмінпанель → приховати/відхилити.
- [ ] Створення нового адміна → вхід із тимчасовим паролем → зміна пароля.
- [ ] Публічно видно лише юзернейм; пошта/логін не показуються іншим.
- [ ] Видалення тестового користувача → його заходи зникають.
- [ ] Немає помилок у консолі браузера.
- [ ] PageSpeed Insights для `/`, `/events`, `/login`.
- [ ] W3C HTML/CSS перевірки (див. `docs/QA.md`).

## 5. Оновлення та відкат

- Зміни коду: коміт у `main` → Vercel/Render перезбирають автоматично.
- Зміна схеми: оновіть `server/src/db/schema.ts`, `npm run db:generate`, закомітьте SQL, застосуйте міграцію (Render `prestart` зробить це на старті).
- Відкат: Vercel → Rollback; Render → Rollback. Міграції БД автоматично не відкочуються — тримайте бекап Supabase.
- Секрети зберігаються лише в Render/Vercel; ніколи не комітьте `.env`.
