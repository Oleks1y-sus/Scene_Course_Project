'use client';

import { SubmitEvent, useState } from 'react';

export default function Newsletter() {
  const [status, setStatus] = useState('');

  const handleSubmit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus('Дякуємо за підписку!');
    (e.target as HTMLFormElement).reset();
  };

  return (
    <section className="newsletter" id="newsletter">
      <div className="newsletter__bg"></div>
      <div className="container">
        <div className="newsletter__inner">
          <div className="newsletter__left scroll-reveal">
            <h2 className="newsletter__title">Підпишіться на розсилку</h2>
            <p className="newsletter__sub">Будьте на зв’язку</p>
          </div>

          <div className="newsletter__right scroll-reveal delay-300">
            <form className="newsletter__fields" onSubmit={handleSubmit} noValidate>
              <div className="newsletter__field">
                <div className="newsletter__field-wrap">
                  <label className="visually-hidden" htmlFor="newsletter-name">Ім’я</label>
                  <input className="newsletter__input" id="newsletter-name" name="name" type="text" placeholder="Ім’я" required />
                </div>
              </div>

              <div className="newsletter__field">
                <div className="newsletter__field-wrap">
                  <label className="visually-hidden" htmlFor="newsletter-email">Електронна пошта</label>
                  <input className="newsletter__input" id="newsletter-email" name="email" type="email" placeholder="Електронна пошта" required />
                  <button className="newsletter__submit" type="submit" aria-label="Підписатися">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                      <path d="M4 10H16M16 10L10 4M16 10L10 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>
              </div>
              <p className="form__status" role="status">{status}</p>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}