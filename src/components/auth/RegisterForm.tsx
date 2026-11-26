'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { Icon } from '@/components/ui/Icon';
import { apiPost, ApiError, errorMessage } from '@/lib/api';
import {
  isValidEmail,
  isValidHandle,
  passwordChecks,
  passwordIsStrong,
  passwordScore,
} from '@/lib/format';
import type { User } from '@/lib/types';

interface RegisterResult {
  user: User;
  mustChangePassword: boolean;
}

export function RegisterForm() {
  const router = useRouter();
  const { user, loading, setUser } = useAuth();
  const [username, setUsername] = useState('');
  const [login, setLogin] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});

  const strength = passwordScore(password);
  const checks = passwordChecks(password);

  useEffect(() => {
    if (!loading && user) router.replace('/events');
  }, [loading, user, router]);

  const validate = (): boolean => {
    const nextFields: Record<string, string> = {};
    if (!isValidHandle(username)) {
      nextFields.username = 'Юзернейм: 3–30 символів, латиниця, цифри або підкреслення.';
    }
    if (!isValidHandle(login)) {
      nextFields.login = 'Логін: 3–30 символів, латиниця, цифри або підкреслення.';
    }
    if (!isValidEmail(email)) nextFields.email = 'Введіть коректну електронну пошту.';
    if (!passwordIsStrong(password)) nextFields.password = 'Пароль не відповідає вимогам безпеки.';
    if (confirm !== password) nextFields.confirm = 'Паролі не збігаються.';
    if (!acceptTerms) nextFields.acceptTerms = 'Підтвердьте згоду з умовами.';
    setFields(nextFields);
    return Object.keys(nextFields).length === 0;
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!validate()) return;

    setBusy(true);
    try {
      const result = await apiPost<RegisterResult>('/auth/register', {
        username: username.trim().toLowerCase(),
        login: login.trim().toLowerCase(),
        email: email.trim().toLowerCase(),
        password,
        acceptTerms,
      });
      setUser(result.user);
      router.push('/events');
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
      <form className="form auth-form" onSubmit={submit} noValidate>
        <div className="form__group">
          <label className="form__label" htmlFor="register-username">Юзернейм <span className="form__hint">(публічний)</span></label>
          <input
            className={`form__control ${fields.username ? 'is-invalid' : ''}`}
            id="register-username"
            name="username"
            type="text"
            autoComplete="nickname"
            maxLength={30}
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            required
            aria-invalid={Boolean(fields.username)}
            aria-describedby="register-username-help"
          />
          <p className="form__hint" id="register-username-help">Його бачать інші користувачі. 3–30 символів, латиниця, цифри, _. </p>
          {fields.username ? <p className="form__error">{fields.username}</p> : null}
        </div>

        <div className="form__group">
          <label className="form__label" htmlFor="register-login">Логін <span className="form__hint">(приватний)</span></label>
          <input
            className={`form__control ${fields.login ? 'is-invalid' : ''}`}
            id="register-login"
            name="login"
            type="text"
            autoComplete="username"
            maxLength={30}
            value={login}
            onChange={(event) => setLogin(event.target.value)}
            required
            aria-invalid={Boolean(fields.login)}
            aria-describedby="register-login-help"
          />
          <p className="form__hint" id="register-login-help">Потрібен для входу. Інші користувачі його не бачать.</p>
          {fields.login ? <p className="form__error">{fields.login}</p> : null}
        </div>

        <div className="form__group">
          <label className="form__label" htmlFor="register-email">Електронна пошта <span className="form__hint">(приватна)</span></label>
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
            aria-describedby="register-email-help"
          />
          <p className="form__hint" id="register-email-help">Потрібна лише для відновлення пароля; листи не надсилаються.</p>
          {fields.email ? <p className="form__error">{fields.email}</p> : null}
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
