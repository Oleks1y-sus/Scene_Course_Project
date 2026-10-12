'use client';

import howCreate from '@/public/img/how-create.jpg';
import howEngage from '@/public/img/how-engage.png';
import howAnalyze from '@/public/img/how-analyze.png';

export default function HowItWorks() {
  const openModal = () => (document.getElementById('demo-modal') as HTMLDialogElement)?.showModal();

  return (
    <section className="how-it-works" id="how-it-works">
      <div className="container">
        <div className="how-it-works__header scroll-reveal">
          <h2 className="how-it-works__title">Як це<br />працює</h2>
          <div className="how-it-works__intro">
            <p className="how-it-works__intro-text">
              Керуйте заходом від початку до кінця: від інтеграцій і реєстрації до інтерактивних елементів на сцені та даних після події — усе в одному місці.
            </p>
            <button type="button" className="btn btn--primary how-it-works__btn" onClick={openModal}>Дізнатися більше</button>
          </div>
        </div>

        <div className="how-it-works__steps">
          <div className="how-it-works__step scroll-reveal">
            <div className="how-it-works__step-content">
              <span className="how-it-works__step-num">Крок 1</span>
              <h3 className="how-it-works__step-title">
                Створіть
                <svg className="how-it-works__arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="7" y1="17" x2="17" y2="7"></line>
                  <polyline points="7 7 17 7 17 17"></polyline>
                </svg>
              </h3>
              <p className="how-it-works__step-desc">
                «Сцена Студія» дає всі інструменти для створення та проведення віртуальних подій, які виглядають бездоганно й ставлять ваш бренд у центр уваги.
              </p>
            </div>
            <div className="how-it-works__step-media">
              <img src={howCreate.src} alt="Інтерфейс створення заходу" loading="lazy" />
            </div>
          </div>

          <div className="how-it-works__step scroll-reveal delay-100">
            <div className="how-it-works__step-content">
              <span className="how-it-works__step-num">Крок 2</span>
              <h3 className="how-it-works__step-title">
                Залучайте
                <svg className="how-it-works__arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="7" y1="17" x2="17" y2="7"></line>
                  <polyline points="7 7 17 7 17 17"></polyline>
                </svg>
              </h3>
              <p className="how-it-works__step-desc">
                Прогоніть нудьгу, привертайте увагу аудиторії та перетворюйте пасивних глядачів на активних учасників.
              </p>
            </div>
            <div className="how-it-works__step-media">
              <img src={howEngage.src} alt="Інтерфейс залучення аудиторії" loading="lazy" />
            </div>
          </div>

          <div className="how-it-works__step scroll-reveal delay-200">
            <div className="how-it-works__step-content">
              <span className="how-it-works__step-num">Крок 3</span>
              <h3 className="how-it-works__step-title">
                Аналізуйте
                <svg className="how-it-works__arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="7" y1="17" x2="17" y2="7"></line>
                  <polyline points="7 7 17 7 17 17"></polyline>
                </svg>
              </h3>
              <p className="how-it-works__step-desc">
                Відстежуйте успіх подій за допомогою глибокої аналітики, що охоплює весь шлях учасника.
              </p>
            </div>
            <div className="how-it-works__step-media">
              <img src={howAnalyze.src} alt="Інтерфейс аналітики заходу" loading="lazy" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}