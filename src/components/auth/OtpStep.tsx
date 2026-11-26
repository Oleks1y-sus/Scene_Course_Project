'use client';

import { Icon } from '@/components/ui/Icon';

export function OtpStep({
  email,
  code,
  setCode,
  onSubmit,
  onResend,
  onBack,
  busy,
  error,
  fieldError,
  cooldown,
  devCode,
}: {
  email: string;
  code: string;
  setCode: (value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
  onResend: () => void;
  onBack: () => void;
  busy: boolean;
  error: string;
  fieldError?: string;
  cooldown: number;
  devCode?: string;
}) {
  return (
    <form className="form auth-form" onSubmit={onSubmit} noValidate>
      <div className="auth-form__icon" aria-hidden="true">
        <Icon name="i-mail" size={26} />
      </div>
      <p className="auth-form__lead">
        Ми надіслали шестизначний код на <strong>{email}</strong>. Введіть його, щоб продовжити.
      </p>

      {devCode ? (
        <div className="dev-code" role="note">
          <span>Демо-режим: код <strong>{devCode}</strong></span>
          <button type="button" className="dev-code__button" onClick={() => setCode(devCode)}>
            Заповнити
          </button>
        </div>
      ) : null}

      <div className="form__group">
        <label className="form__label" htmlFor="otp-code">Код підтвердження</label>
        <input
          className={`form__control form__control--otp ${fieldError ? 'is-invalid' : ''}`}
          id="otp-code"
          name="code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
          required
          aria-invalid={Boolean(fieldError)}
          aria-describedby={fieldError ? 'otp-error' : undefined}
        />
        {fieldError ? <p className="form__error" id="otp-error">{fieldError}</p> : null}
      </div>

      {error ? <p className="form__alert" role="alert">{error}</p> : null}

      <button type="submit" className="btn btn--primary btn--block" disabled={busy || code.length !== 6}>
        {busy ? 'Перевіряємо…' : 'Підтвердити код'}
      </button>

      <div className="auth-form__actions">
        <button type="button" className="text-button" onClick={onBack} disabled={busy}>
          <Icon name="i-arrow-left" size={16} /> Змінити пошту
        </button>
        <button type="button" className="text-button" onClick={onResend} disabled={busy || cooldown > 0}>
          {cooldown > 0 ? `Надіслати ще раз через ${cooldown} с` : 'Надіслати код ще раз'}
        </button>
      </div>
    </form>
  );
}
