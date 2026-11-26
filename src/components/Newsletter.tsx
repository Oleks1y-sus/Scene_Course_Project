'use client';

import { useState } from 'react';
import { ScrollRevealInit } from '@/components/ScrollRevealInit';
import { isValidEmail } from '@/lib/format';

interface NewsletterErrors {
  name?: string;
  email?: string;
}

export default function Newsletter() {
  const [status, setStatus] = useState('');
  const [errors, setErrors] = useState<NewsletterErrors>({});

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const name = String(data.get('name') ?? '').trim();
    const email = String(data.get('email') ?? '').trim();

    const nextErrors: NewsletterErrors = {};
    if (name.length < 2) nextErrors.name = 'Вкажіть ім’я (мінімум 2 символи).';
    if (!isValidEmail(email)) nextErrors.email = 'Введіть коректну електронну пошту.';
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      const firstField = Object.keys(nextErrors)[0];
      document.getElementById(`newsletter-${firstField}`)?.focus();
      setStatus('');
      return;
    }

    setStatus('Дякуємо за підписку!');
    form.reset();
  };

  return (
    <section className="newsletter" id="newsletter">
      <div className="newsletter__bg"></div>
      <div className="container">
        <div className="newsletter__inner">
          <ScrollRevealInit>
          <div className="newsletter__left">
            <h2 className="newsletter__title">Підпишіться на розсилку</h2>
            <p className="newsletter__sub">Будьте на зв’язку</p>
          </div>
          </ScrollRevealInit>

          <ScrollRevealInit delay="delay-300">
          <div className="newsletter__right">
            <form className="newsletter__fields" onSubmit={handleSubmit} noValidate>
              <div className="newsletter__field">
                <div className="newsletter__field-wrap">
                  <label className="visually-hidden" htmlFor="newsletter-name">Ім’я</label>
                  <input
                    className="newsletter__input"
                    id="newsletter-name"
                    name="name"
                    type="text"
                    placeholder="Ім’я"
                    required
                    minLength={2}
                    maxLength={80}
                    autoComplete="name"
                    aria-invalid={Boolean(errors.name)}
                    aria-describedby={errors.name ? 'newsletter-name-error' : undefined}
                  />
                </div>
                {errors.name ? <p className="form__error" id="newsletter-name-error" role="alert">{errors.name}</p> : null}
              </div>

              <div className="newsletter__field">
                <div className="newsletter__field-wrap">
                  <label className="visually-hidden" htmlFor="newsletter-email">Електронна пошта</label>
                  <input
                    className="newsletter__input"
                    id="newsletter-email"
                    name="email"
                    type="email"
                    placeholder="Електронна пошта"
                    required
                    maxLength={254}
                    autoComplete="email"
                    aria-invalid={Boolean(errors.email)}
                    aria-describedby={errors.email ? 'newsletter-email-error' : undefined}
                  />
                  <button className="newsletter__submit" type="submit" aria-label="Підписатися">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                      <path d="M4 10H16M16 10L10 4M16 10L10 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>
                {errors.email ? <p className="form__error" id="newsletter-email-error" role="alert">{errors.email}</p> : null}
              </div>
              <p className="form__status" role="status" aria-live="polite">{status}</p>
            </form>
          </div>
          </ScrollRevealInit>
        </div>
      </div>
    </section>
  );
}
