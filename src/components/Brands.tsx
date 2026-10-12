export default function Brands() {
  return (
    <section className="brands">
      <div className="container">
        <div className="brands__right scroll-reveal">
          <img src="/img/brands.png" alt="Логотипи компаній-партнерів платформи" loading="lazy" />
        </div>
        <div className="brands__left scroll-reveal delay-100">
          <h2 className="brands__title">Провідні команди переходять на «Сцену»</h2>
          <p className="brands__desc">Компанії відмовляються від застарілих платформ заради яскравого досвіду для учасників на кожному етапі заходу.</p>
          <div className="brands__stat">
            <svg className="brands__arrow" width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M7 17L17 7M17 7H8M17 7V16" stroke="#00eb8d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <div className="brands__stat-text">
              <span className="brands__stat-number">66% <span className="muted">явка</span></span>
              <span className="brands__stat-label">середня відвідуваність заходів клієнтів «Сцени»</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}