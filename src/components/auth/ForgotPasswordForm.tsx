'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { apiPost, ApiError, errorMessage } from '@/lib/api';
import {
  isValidEmail,
  isValidHandle,
  passwordChecks,
  passwordIsStrong,
  passwordScore,
} from '@/lib/format';

export function ForgotPasswordForm() {
  const [step, setStep] = useState<'request' | 'reset' | 'done'>('request');
  const [login, setLogin] = useState('');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [expiresIn, setExpiresIn] = useState(15);
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});

  const checks = passwordChecks(newPassword);
  const strength = passwordScore(newPassword);

  const requestReset = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setFields({});

    const nextFields: Record<string, string> = {};
    if (!isValidHandle(login)) nextFields.login = 'Введіть коректний логін.';
    if (!isValidEmail(email)) nextFields.email = 'Введіть коректну пошту.';
    if (Object.keys(nextFields).length > 0) {
      setFields(nextFields);
      return;
    }

    setBusy(true);
    try {
      const result = await apiPost<{ resetToken: string; expiresInMinutes: number }>(
        '/auth/password/forgot',
        { login: login.trim().toLowerCase(), email: email.trim().toLowerCase() },
      );
      setToken(result.resetToken);
      setExpiresIn(result.expiresInMinutes);
      setStep('reset');
    } catch (caught) {
      setError(errorMessage(caught));
      if (caught instanceof ApiError) setFields(caught.fields ?? {});
    } finally {
      setBusy(false);
    }
  };

  const reset = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setFields({});

    const nextFields: Record<string, string> = {};
    if (!passwordIsStrong(newPassword)) nextFields.newPassword = 'Пароль не відповідає вимогам безпеки.';
    if (confirm !== newPassword) nextFields.confirm = 'Паролі не збігаються.';
    if (Object.keys(nextFields).length > 0) {
      setFields(nextFields);
      return;
    }

    setBusy(true);
    try {
      await apiPost('/auth/password/reset', { token, newPassword });
      setStep('done');
    } catch (caught) {
      setError(errorMessage(caught));
      if (caught instanceof ApiError) setFields(caught.fields ?? {});
    } finally {
      setBusy(false);
    }
  };

  if (step === 'done') {
    return (
      <div className="auth-form">
        <div className="auth-form__icon" aria-hidden="true">
          <Icon name="i-check" size={26} />
        </div>
        <p className="form__notice" role="status">
          Пароль змінено. Усі сесії завершено — увійдіть з новим паролем.
        </p>
        <Link href="/login" className="btn btn--primary btn--block">До входу</Link>
      </div>
    );
  }

  if (step === 'reset') {
    return (
      <form className="form auth-form" onSubmit={reset} noValidate>
        <div className="auth-form__icon" aria-hidden="true">
          <Icon name="i-lock" size={26} />
        </div>
        <p className="auth-form__lead">
          Логін і пошта збігаються. Встановіть новий пароль. Посилання діє {expiresIn} хвилин.
        </p>

        <div className="form__group">
          <label className="form__label" htmlFor="reset-password">Новий пароль</label>
          <div className="form__password">
            <input
              className={`form__control ${fields.newPassword ? 'is-invalid' : ''}`}
              id="reset-password"
              type={show ? 'text' : 'password'}
              autoComplete="new-password"
              maxLength={128}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              required
            />
            <button
              type="button"
              className="form__password-toggle"
              onClick={() => setShow((value) => !value)}
              aria-label={show ? 'Приховати пароль' : 'Показати пароль'}
            >
              <Icon name="i-eye" size={18} />
            </button>
          </div>
          <div className="password-meter" aria-hidden="true">
            {[1, 2, 3, 4].map((level) => (
              <span key={level} className={strength >= level ? `is-filled strength-${strength}` : ''} />
            ))}
          </div>
          <ul className="password-hints">
            <li className={checks.length ? 'is-met' : ''}>10+ символів</li>
            <li className={checks.lower ? 'is-met' : ''}>мала літера</li>
            <li className={checks.upper ? 'is-met' : ''}>велика літера</li>
            <li className={checks.digit ? 'is-met' : ''}>цифра</li>
          </ul>
          {fields.newPassword ? <p className="form__error">{fields.newPassword}</p> : null}
        </div>

        <div className="form__group">
          <label className="form__label" htmlFor="reset-confirm">Повторіть новий пароль</label>
          <input
            className={`form__control ${fields.confirm ? 'is-invalid' : ''}`}
            id="reset-confirm"
            type={show ? 'text' : 'password'}
            autoComplete="new-password"
            maxLength={128}
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            required
          />
          {fields.confirm ? <p className="form__error">{fields.confirm}</p> : null}
        </div>

        {error ? <p className="form__alert" role="alert">{error}</p> : null}

        <button type="submit" className="btn btn--primary btn--block" disabled={busy}>
          {busy ? 'Зберігаємо…' : 'Змінити пароль'}
        </button>
        <button
          type="button"
          className="text-button auth-form__back"
          onClick={() => {
            setStep('request');
            setToken('');
            setNewPassword('');
            setConfirm('');
            setError('');
          }}
        >
          <Icon name="i-arrow-left" size={15} /> Почати спочатку
        </button>
      </form>
    );
  }

  return (
    <>
      <form className="form auth-form" onSubmit={requestReset} noValidate>
        <p className="auth-form__lead">
          Введіть логін і пошту, прив’язану до акаунта. Ми не надсилаємо листів: якщо дані
          збігаються, ви одразу зможете встановити новий пароль.
        </p>

        <div className="form__group">
          <label className="form__label" htmlFor="forgot-login">Логін</label>
          <input
            className={`form__control ${fields.login ? 'is-invalid' : ''}`}
            id="forgot-login"
            name="login"
            type="text"
            autoComplete="username"
            maxLength={30}
            value={login}
            onChange={(event) => setLogin(event.target.value)}
            required
          />
          {fields.login ? <p className="form__error">{fields.login}</p> : null}
        </div>

        <div className="form__group">
          <label className="form__label" htmlFor="forgot-email">Електронна пошта</label>
          <input
            className={`form__control ${fields.email ? 'is-invalid' : ''}`}
            id="forgot-email"
            name="email"
            type="email"
            autoComplete="email"
            maxLength={254}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          {fields.email ? <p className="form__error">{fields.email}</p> : null}
        </div>

        {error ? <p className="form__alert" role="alert">{error}</p> : null}

        <button type="submit" className="btn btn--primary btn--block" disabled={busy}>
          {busy ? 'Перевіряємо…' : 'Продовжити'}
        </button>
      </form>

      <p className="auth-switch">
        <Link href="/login">Повернутися до входу</Link>
      </p>
    </>
  );
}
