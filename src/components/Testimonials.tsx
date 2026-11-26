'use client';

import testimonialAlly from '@/public/img/testimonial-ally.jpg';
import testimonialTalisha from '@/public/img/testimonial-talisha.jpg';
import testimonialDribbble from '@/public/img/testimonial-dribbble.png';
import { useEffect, useRef } from 'react';

interface AutoScrollComponent {
  pause: () => void;
  play: () => void;
}

interface SplideInstance {
  go: (direction: string) => void;
  destroy: () => void;
  Components?: { AutoScroll?: AutoScrollComponent };
}

export default function Testimonials() {
  const splideRef = useRef<HTMLDivElement>(null);
  const splideInstance = useRef<SplideInstance | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function initSplide() {
      const [{ default: Splide }, { AutoScroll }] = await Promise.all([
        import('@splidejs/splide'),
        import('@splidejs/splide-extension-auto-scroll'),
      ]);

      // Якщо компонент вже розмонтувався (Strict Mode) або слайдер вже існує — виходимо
      if (!isMounted || !splideRef.current || splideInstance.current) return;

      const splide = new Splide(splideRef.current, {
        type: 'loop',
        perPage: 2,
        perMove: 1,
        gap: '1rem',
        speed: 600, // Швидкість плавного переходу при кліку на стрілки (мс)
        autoScroll: {
          speed: 0.8,
          pauseOnHover: true,
          pauseOnFocus: false,
        },
        pagination: false,
        breakpoints: {
          768: {
            perPage: 1,
          },
        },
      });

      splide.mount({ AutoScroll });
      splideInstance.current = splide as unknown as SplideInstance;
    }

    initSplide();

    return () => {
      isMounted = false;
      if (splideInstance.current) {
        splideInstance.current.destroy();
        splideInstance.current = null;
      }
    };
  }, []);

  const handlePrev = () => {
    const splide = splideInstance.current;
    if (!splide) return;
    
    // Тимчасово ставимо AutoScroll на паузу під час ручного кліку, щоб не було ривків
    const autoScroll = splide.Components?.AutoScroll;
    autoScroll?.pause();
    splide.go('<');
    setTimeout(() => autoScroll?.play(), 650);
  };

  const handleNext = () => {
    const splide = splideInstance.current;
    if (!splide) return;

    const autoScroll = splide.Components?.AutoScroll;
    autoScroll?.pause();
    splide.go('>');
    setTimeout(() => autoScroll?.play(), 650);
  };

  return (
    <section className="testimonials" id="testimonials">
      <div className="testimonials__top">
        <div className="container">
          <div className="testimonials__header">
            <h2 className="testimonials__title">Нам<br />довіряють</h2>
            <div className="testimonials__controls">
              <button className="testimonials__arrow" id="testimonials-prev" type="button" aria-label="Попередній відгук" onClick={handlePrev}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <button className="testimonials__arrow" id="testimonials-next" type="button" aria-label="Наступний відгук" onClick={handleNext}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="testimonials__slider-wrap">
        {/* Прив'язуємо ref={splideRef} замість пошуку по рядку '#testimonials-splide' */}
        <div ref={splideRef} className="splide testimonials__splide" id="testimonials-splide" aria-label="Відгуки клієнтів">
          <div className="splide__track">
            <ul className="splide__list">
              <li className="splide__slide">
                <article className="testimonial-card">
                  <p className="testimonial-card__text">«Ми обрали «Сцену», бо вона інтуїтивна, гарно виглядає та створена для взаємодії з аудиторією. Чат у стилі месенджера, питання на сцені й опитування помітно підвищили залученість учасників.»</p>
                  <div className="testimonial-card__author">
                    <img src={testimonialAlly.src} alt="Олена Мельник" className="testimonial-card__avatar" width="44" height="44" loading="lazy" />
                    <div className="testimonial-card__info">
                      <span className="testimonial-card__name">Олена Мельник</span>
                      <span className="testimonial-card__role">Директорка з маркетингу подій</span>
                      <span className="testimonial-card__company-name">ТехноВектор</span>
                    </div>
                  </div>
                </article>
              </li>

              <li className="splide__slide">
                <article className="testimonial-card">
                  <p className="testimonial-card__text">«Раніше доводилося поєднувати відеомікшер, OBS і купу додаткового обладнання. Тепер двоє людей легко проводять наші онлайн-заходи без жодної спеціальної техніки. <strong>Одна платформа замінила весь набір інструментів.</strong>»</p>
                  <div className="testimonial-card__author">
                    <img src={testimonialTalisha.src} alt="Тарас Коваленко" className="testimonial-card__avatar" width="44" height="44" loading="lazy" />
                    <div className="testimonial-card__info">
                      <span className="testimonial-card__name">Тарас Коваленко</span>
                      <span className="testimonial-card__role">Керівник відділу подій</span>
                      <span className="testimonial-card__company-name">Фінанс-Хаб</span>
                    </div>
                  </div>
                </article>
              </li>

              <li className="splide__slide">
                <article className="testimonial-card">
                  <p className="testimonial-card__text">««Сцена» — це 10 з 10. Коли спонсори розглядають участь у наших заходах, <strong>платформа стає нашою «секретною зброєю»</strong>.»</p>
                  <div className="testimonial-card__author">
                    <img src={testimonialDribbble.src} alt="Ірина Бондар" className="testimonial-card__avatar" width="44" height="44" loading="lazy" />
                    <div className="testimonial-card__info">
                      <span className="testimonial-card__name">Ірина Бондар</span>
                      <span className="testimonial-card__role">Менеджерка спільноти</span>
                      <span className="testimonial-card__company-name">Освіта Плюс</span>
                    </div>
                  </div>
                </article>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
