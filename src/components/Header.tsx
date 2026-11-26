'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import logo from '@/public/img/logo.png';
import { useAuth } from '@/components/AuthProvider';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';

const NAV_ITEMS = [
  { href: '/#features', label: 'Можливості' },
  { href: '/#how-it-works', label: 'Як це працює' },
  { href: '/events', label: 'Заходи' },
  { href: '/#articles', label: 'Блог' },
];

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isMenuOpen) {
      document.body.classList.remove('nav-open');
      return;
    }
    document.body.classList.add('nav-open');
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsMenuOpen(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('keydown', handleKey);
      document.body.classList.remove('nav-open');
    };
  }, [isMenuOpen]);

  const closeNav = () => setIsMenuOpen(false);

  return (
    <>
      <header className={`site-header ${isScrolled ? 'scrolled' : ''}`} id="site-header">
        <div className="container">
          <Link href="/" className="site-logo" aria-label="Сцена — на головну">
            <img src={logo.src} alt="" className="site-logo__img" width="28" height="28" />
            <span className="site-logo__name">сцена</span>
          </Link>

          <nav className="primary-nav" aria-label="Основна навігація">
            <ul className="primary-nav__list">
              {NAV_ITEMS.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="primary-nav__link">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="header-actions">
            {loading ? (
              <span className="header-skeleton" aria-hidden="true" />
            ) : user ? (
              <>
                <Link href="/create" className="btn btn--primary btn--header">
                  <Icon name="i-plus" size={16} /> Створити
                </Link>
                {user.role === 'ADMIN' ? (
                  <Link href="/admin" className="header-icon-link" aria-label="Адмінпанель" title="Адмінпанель">
                    <Icon name="i-shield" size={18} />
                  </Link>
                ) : null}
                <Link href="/profile" className="header-user" aria-label={`Профіль ${user.displayName}`}>
                  <Avatar src={user.avatarUrl} name={user.displayName} size="xs" />
                  <span className="header-user__name">{user.displayName.split(' ')[0]}</span>
                </Link>
                <button type="button" className="header-icon-link" onClick={() => void logout()} aria-label="Вийти" title="Вийти">
                  <Icon name="i-logout" size={18} />
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="btn btn--ghost btn--header">Увійти</Link>
                <Link href="/register" className="btn btn--primary btn--header">Створити акаунт</Link>
              </>
            )}
          </div>

          <button
            className={`burger ${isMenuOpen ? 'is-open' : ''}`}
            id="burger-btn"
            type="button"
            aria-label={isMenuOpen ? 'Закрити меню' : 'Відкрити меню'}
            aria-controls="mobile-nav"
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen((open) => !open)}
          >
            <span className="burger__line" />
            <span className="burger__line" />
            <span className="burger__line" />
          </button>
        </div>
      </header>

      <nav id="mobile-nav" className={`mobile-nav ${isMenuOpen ? 'is-open' : ''}`} aria-label="Мобільна навігація">
        <button className="mobile-nav__close" id="mobile-nav-close" type="button" aria-label="Закрити меню" onClick={closeNav}>
          <span className="mobile-nav__close-line" />
          <span className="mobile-nav__close-line" />
        </button>

        {user ? (
          <div className="mobile-nav__user">
            <Avatar src={user.avatarUrl} name={user.displayName} size="md" />
            <div>
              <p className="mobile-nav__user-name">{user.displayName}</p>
              <p className="mobile-nav__user-email">{user.email}</p>
            </div>
          </div>
        ) : null}

        <ul className="mobile-nav__list">
          {NAV_ITEMS.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className="mobile-nav__link" onClick={closeNav}>
                {item.label}
              </Link>
            </li>
          ))}
          {user ? (
            <>
              <li><Link href="/create" className="mobile-nav__link" onClick={closeNav}>Створити захід</Link></li>
              <li><Link href="/profile" className="mobile-nav__link" onClick={closeNav}>Мій профіль</Link></li>
              {user.role === 'ADMIN' ? (
                <li><Link href="/admin" className="mobile-nav__link" onClick={closeNav}>Адмінпанель</Link></li>
              ) : null}
            </>
          ) : null}
        </ul>

        <div className="mobile-nav__footer">
          {user ? (
            <button type="button" className="btn btn--ghost" onClick={() => { closeNav(); void logout(); }}>
              <Icon name="i-logout" size={18} /> Вийти
            </button>
          ) : (
            <>
              <Link href="/login" className="btn btn--ghost" onClick={closeNav}>Увійти</Link>
              <Link href="/register" className="btn btn--primary" onClick={closeNav}>Створити акаунт</Link>
            </>
          )}
        </div>
      </nav>

      <div className={`nav-backdrop ${isMenuOpen ? 'is-visible' : ''}`} id="nav-backdrop" onClick={closeNav} aria-hidden="true" />
    </>
  );
}
