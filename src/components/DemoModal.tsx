'use client';

import { useRef, useState, useEffect, SubmitEvent } from 'react';

export default function DemoModal() {
  const modalRef = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [modalTitle, setModalTitle] = useState('Замовити демо');

  useEffect(() => {
    const modal = modalRef.current;
    if (!modal) return;

    const handleClose = () => {
      document.body.classList.remove('modal-open');
    };

    modal.addEventListener('close', handleClose);
    return () => modal.removeEventListener('close', handleClose);
  }, []);

  const closeModal = () => {
    modalRef.current?.close();
  };

  const handleSubmit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = formRef.current;
    if (!form) return;

    const submitBtn = form.querySelector('[type="submit"]') as HTMLButtonElement;
    if (submitBtn) submitBtn.disabled = true;

    setTimeout(() => {
      form.reset();
      setStatusMessage('Дякуємо! Ми зв’яжемося з вами найближчим часом.');
      if (submitBtn) submitBtn.disabled = false;
    }, 600);
  };

  return (
    <dialog ref={modalRef} className="modal" id="demo-modal" aria-labelledby="demo-modal-title">
      <div className="modal__content">
        <button type="button" className="modal__close" onClick={closeModal} aria-label="Закрити вікно">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M4 4L16 16M16 4L4 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>

        <h2 className="modal__title" id="demo-modal-title">{modalTitle}</h2>
        <p className="modal__lead">Залиште контакти — ми покажемо платформу на прикладі вашого заходу.</p>

        <form ref={formRef} className="form" id="demo-form" onSubmit={handleSubmit} noValidate>
          <div className="form__group">
            <label className="form__label" htmlFor="demo-name">Ім’я</label>
            <input className="form__control" id="demo-name" name="name" type="text" autoComplete="name" required minLength={2} maxLength={80} />
            <p className="form__error" id="demo-name-error"></p>
          </div>

          <div className="form__group">
            <label className="form__label" htmlFor="demo-email">Робоча пошта</label>
            <input className="form__control" id="demo-email" name="email" type="email" autoComplete="email" required maxLength={254} />
            <p className="form__error" id="demo-email-error"></p>
          </div>

          <div className="form__group">
            <label className="form__label" htmlFor="demo-phone">Телефон <span className="form__hint">(необов’язково)</span></label>
            <input className="form__control" id="demo-phone" name="phone" type="tel" autoComplete="tel" maxLength={18} />
            <p className="form__error" id="demo-phone-error"></p>
          </div>

          <div className="form__group">
            <label className="form__label" htmlFor="demo-format">Формат заходу</label>
            <select className="form__control" id="demo-format" name="format" required>
              <option value="">Оберіть формат</option>
              <option value="webinar">Вебінар</option>
              <option value="meeting">Корпоративна зустріч</option>
              <option value="training">Навчання</option>
              <option value="conference">Багатотрекова конференція</option>
            </select>
            <p className="form__error" id="demo-format-error"></p>
          </div>

          <div className="form__group">
            <label className="form__label" htmlFor="demo-message">Коментар <span className="form__hint">(необов’язково)</span></label>
            <textarea className="form__control form__control--textarea" id="demo-message" name="message" rows={3} maxLength={500}></textarea>
            <p className="form__error" id="demo-message-error"></p>
          </div>

          <div className="form__group">
            <label className="form__check" htmlFor="demo-consent">
              <input id="demo-consent" name="consent" type="checkbox" required />
              <span>Погоджуюсь на обробку персональних даних</span>
            </label>
            <p className="form__error" id="demo-consent-error"></p>
          </div>

          <button type="submit" className="btn btn--primary form__submit">Надіслати запит</button>
          <p className="form__status" role="status">{statusMessage}</p>
        </form>
      </div>
    </dialog>
  );
}