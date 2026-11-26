'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { OtpStep } from '@/components/auth/OtpStep';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { apiPost, ApiError, errorMessage } from '@/lib/api';
import { isValidEmail } from '@/lib/format';
import type { User } from '@/lib/types';

interface LoginStepOne {
  otpRequired?: boolean;
  requiresEmailVerification?: boolean;
  email: string;
  devCode?: string;
}

interface LoginResult {
  user: User;
  mustChangePassword: boolean;
}

export function LoginForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const { user, loading, setUser } = useAuth();
  const [step, setStep] = useState<'credentials' | 'otp'>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState<string | undefined>();
  const [otpPurpose, setOtpPurpose] = useState<'LOGIN' | 'VERIFY_EMAIL'>('LOGIN');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [cooldown, setCooldown] = useState(0);
  const [info, setInfo] = useState('');

  const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

  useEffect(() => {
    if (!loading && user) router.replace(nextPath);
  }, [loading, user, router, nextPath]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  const applyError = (caught: unknown) => {
    setError(errorMessage(caught));
    if (caught instanceof ApiError) setFields(caught.fields ?? {});
  };

  const handleCredentials = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setFields({});
    setInfo('');

    if (!isValidEmail(email)) {
      setFields({ email: 'Введіть коректну електронну пошту.' });
      return;
    }
    if (!password) {
      setFields({ password: 'Введіть пароль.' });
      return;
    }

    setBusy(true);
    try {
      const result = await apiPost<LoginStepOne>('/auth/login', {
        email: email.trim().toLowerCase(),
        password,
      });
      setEmail(result.email);
      setDevCode(result.devCode);
      setOtpPurpose(result.requiresEmailVerification ? 'VERIFY_EMAIL' : 'LOGIN');
      setStep('otp');
      setCooldown(60);
      if (result.devCode) setCode(result.devCode);
      if (result.requiresEmailVerification) {
        setInfo('Спочатку підтвердіть електронну пошту — код уже надіслано.');
      } else {
        setInfo('Код входу надіслано на пошту.');
      }
    } catch (caught) {
      applyError(caught);
    } finally {
      setBusy(false);
    }
  };

  const handleOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setFields({});
    if (code.length !== 6) {
      setFields({ code: 'Код має містити 6 цифр.' });
      return;
    }

    setBusy(true);
    try {
      const endpoint = otpPurpose === 'VERIFY_EMAIL' ? '/auth/verify-email' : '/auth/login/verify';
      const result = await apiPost<LoginResult>(endpoint, { email, code });
      setUser(result.user);
      const destination = result.mustChangePassword ? '/profile?tab=security&force=1' : nextPath;
      router.push(destination);
      router.refresh();
    } catch (caught) {
      applyError(caught);
      if (caught instanceof ApiError && caught.code === 'INVALID_CODE') setCode('');
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
        purpose: otpPurpose === 'VERIFY_EMAIL' ? 'VERIFY_EMAIL' : 'LOGIN',
      });
      setDevCode(result.devCode);
      setCooldown(60);
      setInfo('Новий код надіслано.');
      if (result.devCode) {
        setCode(result.devCode);
        setInfo('Новий демо-код заповнено автоматично.');
      }
    } catch (caught) {
      applyError(caught);
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
          onSubmit={handleOtp}
          onResend={handleResend}
          onBack={() => {
            setStep('credentials');
            setCode('');
            setDevCode(undefined);
            setError('');
            setInfo('');
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
      {demoMode ? (
        <div className="demo-accounts" role="note">
          <div className="demo-accounts__head">
            <Icon name="i-sparkles" size={16} />
            <span>Демо-доступ</span>
          </div>
          <div className="demo-accounts__row">
            <Avatar src="/img/avatars/avatar-03.svg" name="Олена" size="xs" />
            <span><strong>olena@scene.local</strong> · Demo12345!</span>
            <button type="button" className="text-button" onClick={() => { setEmail('olena@scene.local'); setPassword('Demo12345!'); }}>
              Обрати
            </button>
          </div>
          <div className="demo-accounts__row">
            <Avatar src="/img/avatars/avatar-01.svg" name="Адміністратор" size="xs" />
            <span><strong>admin@scene.local</strong> · Admin12345!</span>
            <button type="button" className="text-button" onClick={() => { setEmail('admin@scene.local'); setPassword('Admin12345!'); }}>
              Обрати
            </button>
          </div>
        </div>
      ) : null}

      <form className="form auth-form" onSubmit={handleCredentials} noValidate>
        <div className="form__group">
          <label className="form__label" htmlFor="login-email">Електронна пошта</label>
          <input
            className={`form__control ${fields.email ? 'is-invalid' : ''}`}
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            maxLength={254}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            aria-invalid={Boolean(fields.email)}
            aria-describedby={fields.email ? 'login-email-error' : undefined}
          />
          {fields.email ? <p className="form__error" id="login-email-error">{fields.email}</p> : null}
        </div>

        <div className="form__group">
          <label className="form__label" htmlFor="login-password">Пароль</label>
          <div className="form__password">
            <input
              className={`form__control ${fields.password ? 'is-invalid' : ''}`}
              id="login-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              maxLength={128}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              aria-invalid={Boolean(fields.password)}
              aria-describedby={fields.password ? 'login-password-error' : undefined}
            />
            <button
              type="button"
              className="form__password-toggle"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? 'Приховати пароль' : 'Показати пароль'}
            >
              <Icon name={showPassword ? 'i-eye' : 'i-eye'} size={18} />
            </button>
          </div>
          {fields.password ? <p className="form__error" id="login-password-error">{fields.password}</p> : null}
        </div>

        {error ? <p className="form__alert" role="alert">{error}</p> : null}

        <button type="submit" className="btn btn--primary btn--block" disabled={busy}>
          {busy ? 'Перевіряємо…' : 'Увійти'}
        </button>

        <p className="auth-form__hint">
          Далі надішлемо одноразовий код на пошту — це захист від несанкціонованого входу.
        </p>
      </form>

      <p className="auth-switch">
        Ще не маєте акаунта? <Link href="/register">Зареєструватися</Link>
      </p>
    </>
  );
}
