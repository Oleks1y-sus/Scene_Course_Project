import Link from 'next/link';
import type { ReactNode } from 'react';
import { Icon } from '@/components/ui/Icon';

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="auth-page">
      <header className="auth-top">
        <Link href="/" className="auth-top__logo">
          <img src="/img/logo.png" alt="" width="28" height="28" />
          <span>сцена</span>
        </Link>
        <Link href="/" className="auth-top__back">
          <Icon name="i-arrow-left" size={16} />
          На головну
        </Link>
      </header>

      <main className="auth-page__main">
        <section className="auth-brand" aria-label="Про платформу">
          <p className="auth-brand__eyebrow">Платформа онлайн-заходів</p>
          <h2 className="auth-brand__title">Твоя сцена. Твоя аудиторія.</h2>
          <p className="auth-brand__text">
            Створюйте вебінари, збирайте учасників і керуйте подіями — від першої ідеї до завершеного ефіру.
          </p>
          <ul className="auth-brand__list">
            <li><Icon name="i-play" size={18} /> Проведення заходів у демо-режимі</li>
            <li><Icon name="i-heart" size={18} /> Обране та особиста статистика</li>
            <li><Icon name="i-shield" size={18} /> Модерація та безпека спільноти</li>
          </ul>
          <figure className="auth-brand__quote">
            <blockquote>«Найкращі онлайн-заходи починаються зі сцени»</blockquote>
            <figcaption>Команда «Сцена»</figcaption>
          </figure>
        </section>

        <section className="auth-panel" aria-labelledby="auth-title">
          <div className="auth-card">
            <p className="auth-card__eyebrow">Сцена</p>
            <h1 className="auth-card__title" id="auth-title">{title}</h1>
            <p className="auth-card__subtitle">{subtitle}</p>
            {children}
          </div>
          {footer ? <div className="auth-panel__footer">{footer}</div> : null}
        </section>
      </main>

      <footer className="auth-footer">
        <span>© 2026 «Сцена». Усі права захищено.</span>
        <span>
          <Link href="/legal/privacy">Політика конфіденційності</Link>
          <Link href="/legal/terms">Умови користування</Link>
        </span>
      </footer>
    </div>
  );
}
