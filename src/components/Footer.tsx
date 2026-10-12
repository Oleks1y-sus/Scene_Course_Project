'use client';

import logoFooter from '@/public/img/logo-footer.png';

export default function Footer() {
  const openModal = () => (document.getElementById('demo-modal') as HTMLDialogElement)?.showModal();

  return (
    <footer className="site-footer">
      <div className="container">
        <div className="site-footer__top">
          <nav className="site-footer__nav" aria-label="Навігація у футері">
            <div className="site-footer__col">
              <img src={logoFooter.src} alt="Сцена" className="site-footer__logo" />
            </div>

            <div className="site-footer__col">
              <span className="site-footer__col-title">Продукт</span>
              <ul className="site-footer__list">
                <li><a href="#features" className="site-footer__link">Можливості</a></li>
                <li><a href="#how-it-works" className="site-footer__link">Як це працює</a></li>
                <li><button type="button" className="site-footer__link" onClick={openModal}>Замовити демо</button></li>
              </ul>
            </div>

            <div className="site-footer__col">
              <span className="site-footer__col-title">Розділи</span>
              <ul className="site-footer__list">
                <li><a href="#events" className="site-footer__link">Заходи</a></li>
                <li><a href="#articles" className="site-footer__link">Блог</a></li>
              </ul>
            </div>

            <div className="site-footer__col">
              <span className="site-footer__col-title">Компанія</span>
              <ul className="site-footer__list">
                <li><a href="#testimonials" className="site-footer__link">Відгуки</a></li>
                <li><a href="#newsletter" className="site-footer__link">Зв’язатися з нами</a></li>
              </ul>
            </div>
          </nav>
        </div>

        <div className="site-footer__bottom">
          <div className="site-footer__legal">
            <span className="site-footer__copy">© 2026 «Сцена». Усі права захищено.</span>
            <a href="#" className="site-footer__legal-link">Політика конфіденційності</a>
            <a href="#" className="site-footer__legal-link">Умови користування</a>
          </div>

          <div className="site-footer__socials">
            <a href="https://www.youtube.com/" className="site-footer__social" target="_blank" rel="noopener noreferrer" aria-label="YouTube">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
            </a>

            <a href="https://x.com/" className="site-footer__social" target="_blank" rel="noopener noreferrer" aria-label="X (Twitter)">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </a>

            <a href="https://www.linkedin.com/" className="site-footer__social" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}