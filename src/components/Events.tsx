'use client';

import Link from 'next/link';
import eventImage from '@/public/img/event-1.jpg';
import { ScrollRevealInit } from '@/components/ScrollRevealInit';

export default function Events() {
  return (
    <section className="events" id="events">
      <div className="container">
        <div className="events__header">
          <ScrollRevealInit>
          <h2 className="events__title">Анонси</h2>
          </ScrollRevealInit>
          <Link href="/events" className="btn btn--ghost events__all big-button">Усі заходи</Link>
        </div>

        <div className="events__list">
          <ScrollRevealInit>
          <article className="event-card">
            <div className="event-card__body">
              <time className="event-card__date" dateTime="2026-12-21">21 грудня 2026</time>
              <h3 className="event-card__title">Як привернути увагу на перенасиченому ринку</h3>
              <Link href="/events" className="btn btn--primary event-card__btn big-button">Зареєструватися</Link>
            </div>
            <div className="event-card__media">
              <img src={eventImage.src} alt="Спікери вебінару" loading="lazy" />
            </div>
          </article>
          </ScrollRevealInit>
        </div>
      </div>
    </section>
  );
}