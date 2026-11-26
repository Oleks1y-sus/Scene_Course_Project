import { describe, expect, it } from 'vitest';
import {
  countLetters,
  cleanupDisplayName,
  isAllowedTitle,
  isValidDisplayName,
  normalizeText,
} from './lib/text.js';
import { createWebinarSchema } from './modules/webinars/webinar.schemas.js';
import { registerSchema } from './modules/auth/auth.schemas.js';

describe('text normalisation', () => {
  it('removes zero-width and control characters', () => {
    expect(normalizeText('Пла\u200Bтформа\u0000 заходів')).toBe('Платформа заходів');
  });

  it('collapses repeated whitespace', () => {
    expect(normalizeText('  Назва    заходу  ')).toBe('Назва заходу');
  });

  it('keeps a single blank line in multiline text', () => {
    expect(normalizeText('Перший\n\n\n\nДругий', true)).toBe('Перший\n\nДругий');
  });

  it('validates display names and cleans surrounding punctuation', () => {
    expect(cleanupDisplayName('  .Олена Ковальчук.  ')).toBe('Олена Ковальчук');
    expect(isValidDisplayName('Олена Ковальчук')).toBe(true);
    expect(isValidDisplayName('Олена <b>Ковальчук</b>')).toBe(false);
    expect(isValidDisplayName('A')).toBe(false);
  });

  it('rejects markup in titles', () => {
    expect(isAllowedTitle('Безпечний вебінар')).toBe(true);
    expect(isAllowedTitle('<script>alert(1)</script>')).toBe(false);
    expect(countLetters('<b></b>')).toBe(2);
  });
});

describe('API schemas', () => {
  const validWebinar = {
    title: 'Практичний вебінар з безпеки',
    description: 'Розберемо паролі, двофакторну автентифікацію та типові схеми шахрайства. Практичні вправи та відповіді на запитання.',
    category: 'TECHNOLOGY',
    tags: ['security', 'practice'],
    startsAt: new Date(Date.now() + 86_400_000).toISOString(),
    durationMinutes: 60,
    capacity: 100,
  };

  it('accepts a valid webinar payload', () => {
    expect(createWebinarSchema.safeParse(validWebinar).success).toBe(true);
  });

  it('rejects HTML in a webinar title', () => {
    const result = createWebinarSchema.safeParse({ ...validWebinar, title: '<img src=x onerror=alert(1)>' });
    expect(result.success).toBe(false);
  });

  it('rejects out-of-range duration and capacity', () => {
    expect(createWebinarSchema.safeParse({ ...validWebinar, durationMinutes: 5 }).success).toBe(false);
    expect(createWebinarSchema.safeParse({ ...validWebinar, capacity: 20_000 }).success).toBe(false);
  });

  it('requires public username, private login and a strong password', () => {
    const base = {
      username: 'olena',
      login: 'olena_login',
      email: 'olena@example.com',
      acceptTerms: true,
    };
    expect(registerSchema.safeParse({ ...base, password: 'short' }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, password: 'alllowercase123' }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, password: 'StrongPass123' }).success).toBe(true);
    expect(registerSchema.safeParse({ ...base, username: 'a!' }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, login: '1olena' }).success).toBe(false);
  });
});
