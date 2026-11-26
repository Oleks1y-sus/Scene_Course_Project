'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { apiPost, ApiError, errorMessage } from '@/lib/api';
import { isValidHandle } from '@/lib/format';
import type { User } from '@/lib/types';

interface LoginResult {
  user: User;
  mustChangePassword: boolean;
}

export function LoginForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const { user, loading, setUser } = useAuth();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});

  const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

  useEffect(() => {
    if (!loading && user) router.replace(nextPath);
  }, [loading, user, router, nextPath]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setFields({});

    if (!isValidHandle(login)) {
      setFields({ login: 'Логін: 3–30 символів, латиниця, цифри або підкреслення.' });
      return;
    }
    if (!password) {
      setFields({ password: 'Введіть пароль.' });
      return;
    }

    setBusy(true);
    try {
      const result = await apiPost<LoginResult>('/auth/login', {
        login: login.trim().toLowerCase(),
        password,
      });
      setUser(result.user);
      router.push(result.mustChangePassword ? '/profile?tab=security&force=1' : nextPath);
      router.refresh();
    } catch (caught) {
      setError(errorMessage(caught));
      if (caught instanceof ApiError) setFields(caught.fields ?? {});
    } finally {
      setBusy(false);
    }
  };

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
            <span><strong>@olena</strong> · логін <strong>olena</strong> · Demo12345!</span>
            <button type="button" className="text-button" onClick={() => { setLogin('olena'); setPassword('Demo12345!'); }}>
              Обрати
            </button>
          </div>
          <div className="demo-accounts__row">
            <Avatar src="/img/avatars/avatar-01.svg" name="Адміністратор" size="xs" />
            <span><strong>@admin</strong> · логін <strong>admin</strong> · Admin12345!</span>
            <button type="button" className="text-button" onClick={() => { setLogin('admin'); setPassword('Admin12345!'); }}>
              Обрати
            </button>
          </div>
        </div>
      ) : null}

      <form className="form auth-form" onSubmit={submit} noValidate>
        <div className="form__group">
          <label className="form__label" htmlFor="login-login">Логін</label>
          <input
            className={`form__control ${fields.login ? 'is-invalid' : ''}`}
            id="login-login"
            name="login"
            type="text"
            autoComplete="username"
            maxLength={30}
            value={login}
            onChange={(event) => setLogin(event.target.value)}
            required
            aria-invalid={Boolean(fields.login)}
            aria-describedby={fields.login ? 'login-login-error' : 'login-login-help'}
          />
          {fields.login ? (
            <p className="form__error" id="login-login-error">{fields.login}</p>
          ) : (
            <p className="form__hint" id="login-login-help">Логін — не публічний, його бачите лише ви.</p>
          )}
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
              <Icon name="i-eye" size={18} />
            </button>
          </div>
          {fields.password ? <p className="form__error" id="login-password-error">{fields.password}</p> : null}
        </div>

        {error ? <p className="form__alert" role="alert">{error}</p> : null}

        <button type="submit" className="btn btn--primary btn--block" disabled={busy}>
          {busy ? 'Перевіряємо…' : 'Увійти'}
        </button>

        <p className="auth-form__hint">
          <Link href="/forgot-password">Забули пароль?</Link>
        </p>
      </form>

      <p className="auth-switch">
        Ще не маєте акаунта? <Link href="/register">Зареєструватися</Link>
      </p>
    </>
  );
}
