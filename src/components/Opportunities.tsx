'use client';

import { ScrollRevealInit } from '@/components/ScrollRevealInit';

export default function Opportunities() {
  return (
    <section className="opportunities">
      <div className="container column-layout">
        <ScrollRevealInit>
        <h2 className="opportunities__title">
          <span className="opportunities__title-small">Одна<br />платформа</span>Безмежні<br />
          <span className="opportunities__title-indent">горизонти</span>
        </h2>
        </ScrollRevealInit>

        <ScrollRevealInit delay="delay-300">
        <ul className="opportunities__list">
          <li className="opportunities__item">
            <span>Вебінари</span>
            <span>Корпоративні зустрічі</span>
          </li>
          <li className="opportunities__item">
            <span>Демо продукту</span>
            <span>Навчання клієнтів</span>
          </li>
          <li className="opportunities__item">
            <span>Події спільнот</span>
            <span>Відверті розмови</span>
          </li>
          <li className="opportunities__item">
            <span>Сесії AMA</span>
            <span>Стартові зустрічі</span>
          </li>
          <li className="opportunities__item">
            <span>Багатотрекові події</span>
            <span>Воркшопи</span>
          </li>
        </ul>
        </ScrollRevealInit>
      </div>
    </section>
  );
}