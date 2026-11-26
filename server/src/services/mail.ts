import { Resend } from 'resend';
import { env } from '../env.js';
import { AppError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { escapeHtml } from '../lib/text.js';

const resend = env.MAIL_MODE === 'resend' ? new Resend(env.RESEND_API_KEY) : null;

interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

const sendMail = async (message: MailMessage): Promise<void> => {
  if (!resend) {
    logger.info({ to: message.to, subject: message.subject, body: message.text }, 'email:console');
    return;
  }

  const { error } = await resend.emails.send({
    from: env.RESEND_FROM,
    to: message.to,
    subject: message.subject,
    text: message.text,
    html: message.html,
  });

  if (error) {
    logger.error({ error, to: message.to }, 'email:send-failed');
    throw new AppError(502, 'EMAIL_FAILED', 'Не вдалося надіслати лист. Спробуйте пізніше.');
  }
};

const layout = (title: string, bodyHtml: string): string => `
<!doctype html>
<html lang="uk">
  <body style="margin:0;padding:0;background:#0b0b0f;font-family:Arial,Helvetica,sans-serif;color:#f5f5f7;">
    <div style="max-width:560px;margin:0 auto;padding:32px 20px;">
      <div style="font-size:20px;font-weight:700;letter-spacing:0.02em;margin-bottom:24px;">сцена</div>
      <div style="background:#121218;border:1px solid #2a2a35;border-radius:16px;padding:28px;">
        <h1 style="font-size:22px;line-height:1.35;margin:0 0 16px;">${escapeHtml(title)}</h1>
        ${bodyHtml}
      </div>
      <p style="font-size:12px;color:#8b8b99;margin-top:20px;line-height:1.6;">
        Це автоматичний лист платформи «Сцена». Не відповідайте на нього.<br>
        Питання: <a href="mailto:${escapeHtml(env.SUPPORT_EMAIL)}" style="color:#9b9dff;">${escapeHtml(env.SUPPORT_EMAIL)}</a>
      </p>
    </div>
  </body>
</html>`;

const codeBlock = (code: string): string => `
  <div style="font-size:34px;letter-spacing:10px;font-weight:700;background:#1c1c26;border-radius:12px;padding:16px 20px;text-align:center;color:#ffffff;margin:20px 0;">${escapeHtml(code)}</div>`;

export const sendOtpEmail = async (
  to: string,
  code: string,
  purpose: 'VERIFY_EMAIL' | 'LOGIN' | 'CHANGE_EMAIL',
): Promise<void> => {
  const minutes = 10;
  const subjects: Record<typeof purpose, string> = {
    VERIFY_EMAIL: 'Підтвердіть пошту — Сцена',
    LOGIN: 'Код входу — Сцена',
    CHANGE_EMAIL: 'Підтвердіть нову пошту — Сцена',
  };
  const leads: Record<typeof purpose, string> = {
    VERIFY_EMAIL: 'Вітаємо у «Сцені»! Введіть цей код, щоб підтвердити електронну пошту та активувати акаунт.',
    LOGIN: 'Ви намагаєтесь увійти в акаунт «Сцени». Введіть цей код, щоб завершити вхід.',
    CHANGE_EMAIL: 'Ви змінюєте електронну пошту в акаунті «Сцени». Введіть цей код, щоб підтвердити нову адресу.',
  };
  const subject = subjects[purpose];
  const lead = leads[purpose];
  const text = `${lead}\n\nКод: ${code}\n\nКод діє ${minutes} хвилин. Якщо це були не ви — просто проігноруйте лист і змініть пароль.`;

  await sendMail({
    to,
    subject,
    text,
    html: layout(subject, `
      <p style="font-size:15px;line-height:1.65;color:#c9c9d4;margin:0;">${escapeHtml(lead)}</p>
      ${codeBlock(code)}
      <p style="font-size:13px;line-height:1.6;color:#9a9aa8;margin:0;">Код діє ${minutes} хвилин. Якщо це були не ви — проігноруйте лист і змініть пароль.</p>
    `),
  });
};

export const sendAdminCredentialsEmail = async (options: {
  to: string;
  displayName: string;
  email: string;
  temporaryPassword: string;
}): Promise<void> => {
  const loginUrl = `${env.FRONTEND_URL}/login`;
  const subject = 'Доступ до адмінпанелі «Сцени»';
  const text = `Вітаємо, ${options.displayName}!\n\nВам надано доступ адміністратора платформи «Сцена».\nПошта: ${options.email}\nТимчасовий пароль: ${options.temporaryPassword}\n\nУвійдіть: ${loginUrl}\nПісля входу система попросить змінити пароль. Не пересилайте цей лист іншим.`;

  await sendMail({
    to: options.to,
    subject,
    text,
    html: layout(subject, `
      <p style="font-size:15px;line-height:1.65;color:#c9c9d4;margin:0 0 16px;">Вітаємо, ${escapeHtml(options.displayName)}! Вам надано доступ адміністратора платформи «Сцена».</p>
      <table style="width:100%;font-size:14px;color:#e6e6ee;border-collapse:collapse;">
        <tr><td style="padding:6px 0;color:#9a9aa8;">Пошта</td><td style="padding:6px 0;">${escapeHtml(options.email)}</td></tr>
        <tr><td style="padding:6px 0;color:#9a9aa8;">Тимчасовий пароль</td><td style="padding:6px 0;font-family:monospace;">${escapeHtml(options.temporaryPassword)}</td></tr>
      </table>
      <p style="margin:22px 0 0;">
        <a href="${escapeHtml(loginUrl)}" style="display:inline-block;background:#5b5ef4;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-size:14px;font-weight:600;">Увійти в адмінпанель</a>
      </p>
      <p style="font-size:13px;line-height:1.6;color:#9a9aa8;margin:18px 0 0;">Після входу система попросить змінити пароль. Не пересилайте цей лист іншим.</p>
    `),
  });
};
