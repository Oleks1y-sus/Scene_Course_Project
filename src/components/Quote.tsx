'use client';

import quoteHandPhone from '@/public/img/quote-hand-phone.jpg';
import { ScrollRevealInit } from '@/components/ScrollRevealInit';

export default function Quote() {
  return (
    <section className="quote">
      <div className="quote__bg">
        <img src={quoteHandPhone.src} alt="Мобільний застосунок платформи в руці" loading="lazy" />
      </div>
      <div className="container">
        <ScrollRevealInit>
        <div className="quote__content">
          <blockquote className="quote__text">
            «Поруч зі «Сценою» інші платформи виглядають як із 90-х»
          </blockquote>
          <p className="quote__author">— Олена Мельник, директорка з маркетингу в «ТехноВектор»</p>
          <a href="#testimonials" className="btn btn--ghost quote__btn">Читати історії клієнтів</a>
        </div>
        </ScrollRevealInit>
      </div>
    </section>
  );
}