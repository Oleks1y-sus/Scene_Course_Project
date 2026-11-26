# Scene API

Express 5 + TypeScript + Drizzle ORM + PostgreSQL. Усі маршрути мають префікс `/api/v1`.

## Запуск

```bash
npm install
cp .env.example .env
npm run db:migrate
npm run db:seed
npm run dev          # tsx watch, http://localhost:4000
npm run build        # tsc -> dist/
npm start            # prestart: міграції, потім node dist/index.js
```

Health check: `GET /health`.

Локально можна використовувати `DATABASE_URL=pglite` (PostgreSQL у WASM) — без Docker і Supabase. Production вимагає Supabase PostgreSQL.

## Конвенції

- Успіх: `{ data, meta? }`.
- Помилка: `{ error: { code, message, fields?, requestId } }`.
- Коди: `400`, `401`, `403`, `404`, `409`, `413`, `415`, `422`, `429`, `500`, `502`.
- Валідація — Zod на сервері; клієнтська валідація лише для UX.
- Всі небезпечні запити перевіряють `Origin`/`Referer` і вимагають сесійну cookie.

## Автентифікація

Двоетапний вхід: пароль → 6-значний код на email. Коди зберігаються у вигляді HMAC, живуть 10 хвилин, максимум 5 спроб. Після 5 невдалих паролів акаунт блокується на 15 хвилин.

| Метод | Маршрут | Доступ | Опис |
| --- | --- | --- | --- |
| POST | `/auth/register` | публічно | Створити акаунт, надіслати код підтвердження |
| POST | `/auth/verify-email` | публічно | Підтвердити пошту кодом, створити сесію |
| POST | `/auth/login` | публічно | Перевірити пароль, надіслати код входу |
| POST | `/auth/login/verify` | публічно | Підтвердити код, створити сесію |
| POST | `/auth/resend` | публічно | Повторно надіслати код (не розкриває існування акаунта) |
| POST | `/auth/logout` | cookie | Відкликати сесію |
| GET | `/auth/me` | cookie | Поточний користувач |

## Користувач

| Метод | Маршрут | Опис |
| --- | --- | --- |
| GET | `/users/me` | Профіль |
| PATCH | `/users/me` | Ім’я, біо, аватар (пресет або `avatarMediaId`) |
| GET | `/users/me/stats` | Статистика |
| POST | `/users/me/email` | Запит зміни пошти (потрібен пароль) |
| POST | `/users/me/email/verify` | Підтвердити нову пошту |
| POST | `/users/me/email/resend` | Повторно надіслати код на нову пошту |
| PATCH | `/users/me/password` | Змінити пароль, відкликати інші сесії |
| DELETE | `/users/me` | Видалити акаунт (пароль) |

## Заходи

| Метод | Маршрут | Доступ | Опис |
| --- | --- | --- | --- |
| GET | `/webinars` | публічно/частково | Пошук, фільтри, сортування, пагінація; `mine`, `favorites`, `attended` |
| GET | `/webinars/:id` | публічно/частково | Деталі; приховані бачить лише власник/адмін |
| POST | `/webinars` | USER | Створити захід (модерація) |
| PATCH | `/webinars/:id` | власник/адмін | Оновити |
| DELETE | `/webinars/:id` | власник/адмін | М’яке видалення |
| POST | `/webinars/:id/start` | власник/адмін | `UPCOMING → LIVE` |
| POST | `/webinars/:id/end` | власник/адмін | `LIVE → COMPLETED`, реєстрації → `ATTENDED` |
| POST | `/webinars/:id/cancel` | власник/адмін | `→ CANCELLED` |
| POST/DELETE | `/webinars/:id/favorite` | USER | Обране (не власний захід) |
| POST/DELETE | `/webinars/:id/register` | USER | Реєстрація (не власний, лише активні) |

Query-параметри каталогу: `q`, `category`, `scope=active|completed|cancelled|all`, `sort=soonest|newest|popular|title`, `page`, `limit`, `mine`, `favorites`, `attended`.

## Скарги

| Метод | Маршрут | Опис |
| --- | --- | --- |
| POST | `/reports` | `{ targetType: "WEBINAR"\|"USER", targetId, reason, details? }` |

Не можна скаржитися на власний захід чи себе. Повторна відкрита скарга → `409`. 3+ відкритих скарг автоматично приховують захід.

## Завантаження

| Метод | Маршрут | Опис |
| --- | --- | --- |
| POST | `/uploads/avatar` | multipart `image` (JPEG/PNG/WebP ≤ 2 МБ) |
| POST | `/uploads/cover` | multipart `image`, повертає `media.id` для заходу |

Sharp перекодовує у WebP 512×512 (аватар) або 1200×675 (обкладинка), видаляє метадані.

## Адмін (лише ADMIN, перевірка на сервері)

| Метод | Маршрут | Опис |
| --- | --- | --- |
| GET | `/admin/stats` | Агрегована статистика |
| GET | `/admin/reports` | Скарги (`status`, `targetType`, пагінація) |
| PATCH | `/admin/reports/:id` | `HIDE_WEBINAR`, `RESTORE_WEBINAR`, `SHADOW_BAN_USER`, `BAN_USER`, `ACTIVATE_USER`, `DISMISS` + нотатка |
| GET | `/admin/webinars` | Усі заходи, пошук, модерація |
| PATCH | `/admin/webinars/:id` | Змінити `moderationStatus`, нотатку |
| DELETE | `/admin/webinars/:id` | Видалити |
| GET | `/admin/users` | Користувачі, пошук, роль, статус |
| PATCH | `/admin/users/:id` | Змінити роль/статус (не можна змінювати себе; не можна залишити систему без адміна) |
| DELETE | `/admin/users/:id` | Анонімізувати та приховати заходи |
| POST | `/admin/admins` | Створити адміністратора, надіслати тимчасовий пароль |
| GET | `/admin/audit` | Журнал дій |

Адміністратор із `mustChangePassword=true` не може користуватися адмін-маршрутами, доки не змінить пароль.

## Схема БД

`users`, `sessions`, `auth_codes`, `webinars`, `favorites`, `registrations`, `reports`, `media`, `audit_logs`.

Ключові зв’язки:

- `users 1—N webinars` (каскадне видалення).
- `users N—M webinars` через `favorites` і `registrations`.
- `reports` поліморфна: `webinar_id` або `user_id` (CHECK-обмеження).
- `media` належить користувачу; при створенні заходу перевіряється власник і тип.
- `audit_logs` зберігає дії адміністраторів.

Міграції — у `drizzle/`, застосовуються `drizzle-orm` migrator. `npm start` виконує міграції перед запуском завдяки `prestart`.

## Тести

```bash
npm test               # Vitest: модерація, нормалізація, Zod-схеми
npm run typecheck
```

Інтеграційні перевірки API виконувались вручну через тестовий сценарій: реєстрація → OTP → створення заходу → модерація → скарга → рішення адміністратора → зміна статусу ефіру.
