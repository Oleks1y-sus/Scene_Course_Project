'use client';

import revenueMockup from '@/public/img/revenue-mockup.jpg';
import { ScrollRevealInit } from '@/components/ScrollRevealInit';

export default function Revenue() {
  return (
    <section className="revenue">
      <div className="container">
        <div className="revenue__inner">
          <ScrollRevealInit>
          <div className="revenue__left">
            <h2 className="revenue__title">
              <span className="revenue__title-block">Зростіть</span>
              <span className="revenue__title-inline">
                <span className="revenue__badge">
                  <img src={revenueMockup.src} alt="Панель аналітики доходу від заходів" loading="lazy" />
                </span>
                дохід
              </span>
            </h2>
          </div>
          </ScrollRevealInit>

          <ScrollRevealInit delay="delay-200">
          <div className="revenue__right">
            <div className="revenue__stat-list">
              <div className="revenue__stat-item">
                <span className="revenue__stat-number">+87%</span>
                <p className="revenue__stat-text">зростання залученості учасників</p>
                <span className="revenue__stat-meta">у «ТехноВектор»</span>
              </div>
              

              <div className="revenue__stat-item">
                <span className="revenue__stat-number">₴68 млн</span>
                <p className="revenue__stat-text">сформовано воронки продажів</p>
                <span className="revenue__stat-meta">у «Фінанс-Хаб»</span>
              </div>

              <div className="revenue__stat-item">
                <span className="revenue__stat-number">58%</span>
                <p className="revenue__stat-text">конверсія учасників у клієнтів</p>
                <span className="revenue__stat-meta">в «Освіта Плюс»</span>
              </div>
            </div>
          </div>
          </ScrollRevealInit>
        </div>
      </div>
    </section>
  );
}