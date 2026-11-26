'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { OtpStep } from '@/components/auth/OtpStep';
import { Icon } from '@/components/ui/Icon';
import { apiPost, ApiError, errorMessage } from '@/lib/api';
import {
  isValidEmail,
  passwordChecks,
  passwordIsStrong,
  passwordScore,
} from '@/lib/format';
import type { User } from '@/lib/types';

interface RegisterStepOne {
  email: string;
  requiresVerification: true;
  devCode?: string;
}

interface VerifyResult {
  user: User;
  mustChangePassword: boolean;
}

export function RegisterForm() {
  const router = useRouter();
  const { user, loading, setUser } = useAuth();
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [cooldown, setCooldown] = useState(0);
  const [info, setInfo] = useState('');

  const strength = passwordScore(password);
  const checks = passwordChecks(password);

  useEffect(() => {
    if (!loading && user) router.replace('/events');
  }, [loading, user, router]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  const validate = (): boolean => {
    const nextFields: Record<string, string> = {};
    if (displayName.trim().length < 2) nextFields.displayName = 'Введіть ім’я (мінімум 2 символи).';
    if (displayName.trim().length > 60) nextFields.displayName = 'Ім’я має містити не більше 60 символів.';
    if (!isValidEmail(email)) nextFields.email = 'Введіть коректну електронну пошту.';
    if (!passwordIsStrong(password)) nextFields.password = 'Пароль не відповідає вимогам безпеки.';
    if (confirm !== password) nextFields.confirm = 'Паролі не збігаються.';
    if (!acceptTerms) nextFields.acceptTerms = 'Підтвердьте згоду з умовами.';
    setFields(nextFields);
    return Object.keys(nextFields).length === 0;
  };

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!validate()) return;

    setBusy(true);
    try {
      const result = await apiPost<RegisterStepOne>('/auth/register', {
        displayName: displayName.trim(),
        email: email.trim().toLowerCase(),
        password,
        acceptTerms,
      });
      setEmail(result.email);
      setDevCode(result.devCode);
      if (result.devCode) setCode(result.devCode);
      setStep('otp');
      setCooldown(60);
      setInfo('Код підтвердження надіслано на пошту.');
    } catch (caught) {
      setError(errorMessage(caught));
      if (caught instanceof ApiError) setFields(caught.fields ?? {});
    } finally {
      setBusy(false);
    }
  };

  const handleVerify = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (code.length !== 6) {
      setFields({ code: 'Код має містити 6 цифр.' });
      return;
    }
    setBusy(true);
    try {
      const result = await apiPost<VerifyResult>('/auth/verify-email', { email, code });
      setUser(result.user);
      router.push('/events');
      router.refresh();
    } catch (caught) {
      setError(errorMessage(caught));
      if (caught instanceof ApiError) {
        setFields(caught.fields ?? {});
        if (caught.code === 'INVALID_CODE') setCode('');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setBusy(true);
    try {
      const result = await apiPost<{ sent: true; devCode?: string }>('/auth/resend', {
        email,
        purpose: 'VERIFY_EMAIL',
      });
      setCooldown(60);
      setDevCode(result.devCode);
      setInfo('Новий код надіслано.');
      if (result.devCode) {
        setCode(result.devCode);
        setInfo('Новий демо-код заповнено автоматично.');
      }
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  if (step === 'otp') {
    return (
      <>
        {info ? <p className="form__notice" role="status">{info}</p> : null}
        <OtpStep
          email={email}
          code={code}
          setCode={setCode}
          onSubmit={handleVerify}
          onResend={handleResend}
          onBack={() => {
            setStep('form');
            setCode('');
            setDevCode(undefined);
            setError('');
            setFields({});
          }}
          busy={busy}
          error={error}
          fieldError={fields.code}
          cooldown={cooldown}
          devCode={devCode}
        />
      </>
    );
  }

  return (
    <>
      <form className="form auth-form" onSubmit={handleRegister} noValidate>
        <div className="form__group">
          <label className="form__label" htmlFor="register-name">Ім’я та прізвище</label>
          <input
            className={`form__control ${fields.displayName ? 'is-invalid' : ''}`}
            id="register-name"
            name="displayName"
            type="text"
            autoComplete="name"
            maxLength={60}
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            required
            aria-invalid={Boolean(fields.displayName)}
            aria-describedby={fields.displayName ? 'register-name-error' : undefined}
          />
          {fields.displayName ? <p className="form__error" id="register-name-error">{fields.displayName}</p> : null}
        </div>

        <div className="form__group">
          <label className="form__label" htmlFor="register-email">Електронна пошта</label>
          <input
            className={`form__control ${fields.email ? 'is-invalid' : ''}`}
            id="register-email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            maxLength={254}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            aria-invalid={Boolean(fields.email)}
            aria-describedby={fields.email ? 'register-email-error' : undefined}
          />
          {fields.email ? <p className="form__error" id="register-email-error">{fields.email}</p> : null}
        </div>

        <div className="form__group">
          <label className="form__label" htmlFor="register-password">Пароль</label>
          <div className="form__password">
            <input
              className={`form__control ${fields.password ? 'is-invalid' : ''}`}
              id="register-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              maxLength={128}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              aria-invalid={Boolean(fields.password)}
              aria-describedby="register-password-help"
            />
            <button
              type="button"
              className="form__password-toggle"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? 'Приховати пароль' : 'Показати пароль'}
            >
              <Icon name="i-eye" size={18} />
            </button>
          </div>
          <div className="password-meter" aria-hidden="true">
            {[1, 2, 3, 4].map((level) => (
              <span key={level} className={strength >= level ? `is-filled strength-${strength}` : ''} />
            ))}
          </div>
          <ul className="password-hints" id="register-password-help">
            <li className={checks.length ? 'is-met' : ''}>10+ символів</li>
            <li className={checks.lower ? 'is-met' : ''}>мала літера</li>
            <li className={checks.upper ? 'is-met' : ''}>велика літера</li>
            <li className={checks.digit ? 'is-met' : ''}>цифра</li>
          </ul>
          {fields.password ? <p className="form__error">{fields.password}</p> : null}
        </div>

        <div className="form__group">
          <label className="form__label" htmlFor="register-confirm">Повторіть пароль</label>
          <input
            className={`form__control ${fields.confirm ? 'is-invalid' : ''}`}
            id="register-confirm"
            name="confirm"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            maxLength={128}
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            required
            aria-invalid={Boolean(fields.confirm)}
          />
          {fields.confirm ? <p className="form__error">{fields.confirm}</p> : null}
        </div>

        <div className="form__group">
          <label className="form__check" htmlFor="register-terms">
            <input
              id="register-terms"
              name="acceptTerms"
              type="checkbox"
              checked={acceptTerms}
              onChange={(event) => setAcceptTerms(event.target.checked)}
              aria-invalid={Boolean(fields.acceptTerms)}
            />
            <span>Погоджуюсь з умовами користування та політикою конфіденційності</span>
          </label>
          <p className="form__legal-links">
            <Link href="/legal/terms">Умови користування</Link>
            <span aria-hidden="true">·</span>
            <Link href="/legal/privacy">Політика конфіденційності</Link>
          </p>
          {fields.acceptTerms ? <p className="form__error">{fields.acceptTerms}</p> : null}
        </div>

        {error ? <p className="form__alert" role="alert">{error}</p> : null}

        <button type="submit" className="btn btn--primary btn--block" disabled={busy}>
          {busy ? 'Створюємо акаунт…' : 'Зареєструватися'}
        </button>
      </form>

      <p className="auth-switch">
        Уже маєте акаунт? <Link href="/login">Увійти</Link>
      </p>
    </>
  );
}
