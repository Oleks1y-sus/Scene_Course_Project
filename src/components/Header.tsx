'use client';

import logo from '@/public/img/logo.png';
import { useState, useEffect } from 'react';

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const openModal = () => {
    const modal = document.getElementById('demo-modal') as HTMLDialogElement;
    if (modal) {
      modal.showModal();
      document.body.classList.add('modal-open');
    }
  };

  const closeNav = () => {
    setIsMenuOpen(false);
    document.body.classList.remove('nav-open');
  };

  const toggleNav = () => {
    if (isMenuOpen) {
      closeNav();
    } else {
      setIsMenuOpen(true);
      document.body.classList.add('nav-open');
    }
  };

  return (
    <>
      <header className={`site-header ${isScrolled ? 'scrolled' : ''}`} id="site-header">
        <div className="container">
          <a href="./" className="site-logo" aria-label="Сцена — на головну">
            <img src={logo.src} alt="" className="site-logo__img" width="28" height="28" />
            <span className="site-logo__name">сцена</span>
          </a>

          <nav className="primary-nav" aria-label="Основна навігація">
            <ul className="primary-nav__list">
              <li><a href="#features" className="primary-nav__link">Можливості</a></li>
              <li><a href="#how-it-works" className="primary-nav__link">Як це працює</a></li>
              <li><a href="#testimonials" className="primary-nav__link">Відгуки</a></li>
              <li><a href="#articles" className="primary-nav__link">Блог</a></li>
              <li><a href="#events" className="primary-nav__link">Заходи</a></li>
            </ul>
          </nav>

          <div className="header-actions">
            <button type="button" className="btn btn--primary btn--header" onClick={openModal}>Демо</button>
          </div>

          <button
            className={`burger ${isMenuOpen ? 'is-open' : ''}`}
            id="burger-btn"
            type="button"
            aria-label="Відкрити меню"
            aria-controls="mobile-nav"
            aria-expanded={isMenuOpen}
            onClick={toggleNav}
          >
            <span className="burger__line"></span>
            <span className="burger__line"></span>
            <span className="burger__line"></span>
          </button>
        </div>
      </header>

      <nav id="mobile-nav" className={`mobile-nav ${isMenuOpen ? 'is-open' : ''}`} aria-label="Мобільна навігація">
        <button className="mobile-nav__close" id="mobile-nav-close" type="button" aria-label="Закрити меню" onClick={closeNav}>
          <span className="mobile-nav__close-line"></span>
          <span className="mobile-nav__close-line"></span>
        </button>
        <ul className="mobile-nav__list">
          <li><a href="#features" className="mobile-nav__link" onClick={closeNav}>Можливості</a></li>
          <li><a href="#how-it-works" className="mobile-nav__link" onClick={closeNav}>Як це працює</a></li>
          <li><a href="#testimonials" className="mobile-nav__link" onClick={closeNav}>Відгуки</a></li>
          <li><a href="#articles" className="mobile-nav__link" onClick={closeNav}>Блог</a></li>
          <li><a href="#events" className="mobile-nav__link" onClick={closeNav}>Заходи</a></li>
        </ul>
        <div className="mobile-nav__footer">
          <button type="button" className="btn btn--primary" onClick={() => { closeNav(); openModal(); }}>Замовити демо</button>
        </div>
      </nav>

      <div className={`nav-backdrop ${isMenuOpen ? 'is-visible' : ''}`} id="nav-backdrop" onClick={closeNav}></div>
    </>
  );
}