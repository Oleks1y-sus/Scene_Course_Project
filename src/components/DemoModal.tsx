'use client';

import { useEffect, useRef, useState } from 'react';
import { isValidEmail } from '@/lib/format';

interface DemoErrors {
  name?: string;
  email?: string;
  phone?: string;
  format?: string;
  consent?: string;
}

export default function DemoModal() {
  const modalRef = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [errors, setErrors] = useState<DemoErrors>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const modal = modalRef.current;
    if (!modal) return;
    const handleClose = () => {
      document.body.classList.remove('modal-open');
      setStatusMessage('');
      setErrors({});
    };
    modal.addEventListener('close', handleClose);
    return () => modal.removeEventListener('close', handleClose);
  }, []);

  const closeModal = () => modalRef.current?.close();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = formRef.current;
    if (!form) return;

    const data = new FormData(form);
    const name = String(data.get('name') ?? '').trim();
    const email = String(data.get('email') ?? '').trim();
    const phone = String(data.get('phone') ?? '').trim();
    const format = String(data.get('format') ?? '');
    const consent = data.get('consent') === 'on';

    const nextErrors: DemoErrors = {};
    if (name.length < 2) nextErrors.name = 'Вкажіть ім’я (мінімум 2 символи).';
    if (name.length > 80) nextErrors.name = 'Ім’я занадто довге.';
    if (!isValidEmail(email)) nextErrors.email = 'Введіть коректну робочу пошту.';
    if (phone && !/^\+?[\d\s()-]{7,18}$/.test(phone)) nextErrors.phone = 'Перевірте формат телефону.';
    if (!format) nextErrors.format = 'Оберіть формат заходу.';
    if (!consent) nextErrors.consent = 'Потрібна згода на обробку даних.';

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      const firstField = Object.keys(nextErrors)[0];
      const firstInvalid = firstField ? document.getElementById(`demo-${firstField}`) : null;
      firstInvalid?.focus();
      return;
    }

    setSubmitting(true);
    setStatusMessage('');
    window.setTimeout(() => {
      form.reset();
      setSubmitting(false);
      setStatusMessage('Дякуємо! Ми зв’яжемося з вами найближчим часом.');
    }, 500);
  };

  const describedBy = (field: keyof DemoErrors) => (errors[field] ? `demo-${field}-error` : undefined);
  const markInvalid = (field: keyof DemoErrors) => (errors[field] ? ' is-invalid' : '');
  const invalid = (field: keyof DemoErrors) => Boolean(errors[field]);

  return (
    <dialog
      ref={modalRef}
      className="modal"
      id="demo-modal"
      aria-labelledby="demo-modal-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) closeModal();
      }}
    >
      <div className="modal__content">
        <button type="button" className="modal__close" onClick={closeModal} aria-label="Закрити вікно">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M4 4L16 16M16 4L4 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>

        <h2 className="modal__title" id="demo-modal-title">Замовити демо</h2>
        <p className="modal__lead">Залиште контакти — ми покажемо платформу на прикладі вашого заходу.</p>

        <form ref={formRef} className="form" id="demo-form" onSubmit={handleSubmit} noValidate>
          <div className="form__group">
            <label className="form__label" htmlFor="demo-name">Ім’я</label>
            <input
              className={`form__control${markInvalid('name')}`}
              id="demo-name"
              name="name"
              type="text"
              autoComplete="name"
              required
              minLength={2}
              maxLength={80}
              aria-invalid={invalid('name')}
              aria-describedby={describedBy('name')}
            />
            <p className="form__error" id="demo-name-error" role={errors.name ? 'alert' : undefined}>{errors.name}</p>
          </div>

          <div className="form__group">
            <label className="form__label" htmlFor="demo-email">Робоча пошта</label>
            <input
              className={`form__control${markInvalid('email')}`}
              id="demo-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              aria-invalid={invalid('email')}
              aria-describedby={describedBy('email')}
            />
            <p className="form__error" id="demo-email-error" role={errors.email ? 'alert' : undefined}>{errors.email}</p>
          </div>

          <div className="form__group">
            <label className="form__label" htmlFor="demo-phone">Телефон <span className="form__hint">(необов’язково)</span></label>
            <input
              className={`form__control${markInvalid('phone')}`}
              id="demo-phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              maxLength={18}
              aria-invalid={invalid('phone')}
              aria-describedby={describedBy('phone')}
            />
            <p className="form__error" id="demo-phone-error" role={errors.phone ? 'alert' : undefined}>{errors.phone}</p>
          </div>

          <div className="form__group">
            <label className="form__label" htmlFor="demo-format">Формат заходу</label>
            <select
              className={`form__control${markInvalid('format')}`}
              id="demo-format"
              name="format"
              required
              aria-invalid={invalid('format')}
              aria-describedby={describedBy('format')}
            >
              <option value="">Оберіть формат</option>
              <option value="webinar">Вебінар</option>
              <option value="meeting">Корпоративна зустріч</option>
              <option value="training">Навчання</option>
              <option value="conference">Багатотрекова конференція</option>
            </select>
            <p className="form__error" id="demo-format-error" role={errors.format ? 'alert' : undefined}>{errors.format}</p>
          </div>

          <div className="form__group">
            <label className="form__label" htmlFor="demo-message">Коментар <span className="form__hint">(необов’язково)</span></label>
            <textarea className="form__control form__control--textarea" id="demo-message" name="message" rows={3} maxLength={500} />
            <p className="form__error" id="demo-message-error" />
          </div>

          <div className="form__group">
            <label className="form__check" htmlFor="demo-consent">
              <input
                id="demo-consent"
                name="consent"
                type="checkbox"
                required
                aria-invalid={invalid('consent')}
                aria-describedby={describedBy('consent')}
              />
              <span>Погоджуюсь на обробку персональних даних</span>
            </label>
            <p className="form__error" id="demo-consent-error" role={errors.consent ? 'alert' : undefined}>{errors.consent}</p>
          </div>

          <button type="submit" className="btn btn--primary form__submit" disabled={submitting}>
            {submitting ? 'Надсилаємо…' : 'Надіслати запит'}
          </button>
          <p className="form__status" role="status" aria-live="polite">{statusMessage}</p>
        </form>
      </div>
    </dialog>
  );
}
