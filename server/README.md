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

Реєстрація потребує **юзернейм, логін, пошту та пароль**. Листи не надсилаються, email-verification немає. Юзернейм публічний; логін, пошта й пароль бачить лише власник (пароль — ніколи у відкритому вигляді).

| Метод | Маршрут | Доступ | Опис |
| --- | --- | --- | --- |
| POST | `/auth/register` | публічно | Створити акаунт; одразу створити сесію |
| POST | `/auth/login` | публічно | Вхід за логіном і паролем |
| POST | `/auth/password/forgot` | публічно | Перевірити логін + пошту, видати reset-токен |
| POST | `/auth/password/reset` | публічно | Встановити новий пароль за токеном |
| POST | `/auth/logout` | cookie | Відкликати сесію |
| GET | `/auth/me` | cookie | Поточний користувач (з логіном і поштою) |

### Відновлення пароля

1. `POST /auth/password/forgot` з `{ login, email }`.
2. Якщо пара збігається — повертається `{ resetToken, expiresInMinutes: 15 }`.
3. `POST /auth/password/reset` з `{ token, newPassword }`.
4. Усі сесії користувача відкликаються.

Токен зберігається у БД як HMAC-хеш, одноразовий, TTL 15 хв. Повторний запит — не частіше 60 секунд, rate limit 8/годину. Оскільки листи не надсилаються, пари «логін + пошта» достатньо для скидання — це свідомий компроміс; для production-рівня краще email-підтвердження.

Після 5 невдалих паролів акаунт блокується на 15 хвилин. Помилка входу не розкриває, чи існує логін.

## Користувач

| Метод | Маршрут | Опис |
| --- | --- | --- |
| GET | `/users/me` | Профіль (юзернейм, логін, пошта) |
| PATCH | `/users/me` | Юзернейм, біо, аватар (пресет або `avatarMediaId`) |
| GET | `/users/me/stats` | Статистика |
| PATCH | `/users/me/email` | Змінити пошту: `{ newEmail, password }` |
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

Публічний власник заходу містить лише `{ id, username, avatarUrl, bio? }` — без пошти, логіна чи інших приватних даних.

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
| GET | `/admin/users` | Користувачі (лише юзернейми), пошук, роль, статус |
| PATCH | `/admin/users/:id` | Змінити роль/статус (не можна змінювати себе; не можна залишити систему без адміна) |
| DELETE | `/admin/users/:id` | Анонімізувати та приховати заходи |
| POST | `/admin/admins` | Створити адміністратора: `{ username, login, email, password? }` |
| GET | `/admin/audit` | Журнал дій |

Адміністратор із `mustChangePassword=true` не може користуватися адмін-маршрутами, доки не змінить пароль. Створений адмін отримує тимчасовий пароль у відповіді — лист не надсилається.

## Схема БД

`users`, `sessions`, `password_reset_tokens`, `webinars`, `favorites`, `registrations`, `reports`, `media`, `audit_logs`.

Ключові зв’язки:

- `users 1—N webinars` (каскадне видалення).
- `users N—M webinars` через `favorites` і `registrations`.
- `reports` поліморфна: `webinar_id` або `user_id` (CHECK-обмеження).
- `media` належить користувачу; при створенні заходу перевіряється власник і тип.
- `password_reset_tokens` належить користувачу; зберігається лише хеш.
- `audit_logs` зберігає дії адміністраторів.

Міграції — у `drizzle/`, застосовуються `drizzle-orm` migrator. `npm start` виконує міграції перед запуском завдяки `prestart`.

## Тести

```bash
npm test               # Vitest: модерація, нормалізація, Zod-схеми
npm run typecheck
```

Інтеграційні перевірки API виконувались вручну: реєстрація → вхід → створення заходу → модерація → скарга → рішення адміністратора → зміна статусу ефіру → відновлення пароля.
