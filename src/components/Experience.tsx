export default function Experience() {
  return (
    <section className="experience" id="features">
      <div className="container">
        <div className="experience__heading scroll-reveal">
          <p className="experience__label">Неперевершений для кожного учасника</p>
          <h2 className="experience__title">Досвід</h2>
        </div>

        <div className="experience__grid">
          <article className="experience__card experience__card--wide scroll-reveal">
            <img src="/img/feature-overlays.jpg" alt="Інтерактивні накладки поверх живого відео" className="h100" loading="lazy" />
            <div className="experience__card-text">
              <h3 className="experience__card-title">Інтерактивні накладки</h3>
              <p className="experience__card-desc">Додавайте фірмову графіку поверх живого відео: представляйте спікерів, виділяйте головне та показуйте клікабельні заклики до дії.</p>
            </div>
          </article>

          <div className="experience__row scroll-reveal delay-100">
            <article className="experience__card experience__card--dark-text">
              <img src="/img/feature-polls.png" alt="Інтерактивні опитування на сцені" className="h100" loading="lazy" />
              <div className="experience__card-text">
                <h3 className="experience__card-title">Інтерактивні опитування</h3>
                <p className="experience__card-desc">Запускайте опитування просто на сцені та дивіться, як результати оновлюються в реальному часі.</p>
              </div>
            </article>

            <article className="experience__card experience__card--light-text">
              <img src="/img/feature-hd.png" alt="Трансляція у високій якості HD" className="h100" loading="lazy" />
              <div className="experience__card-text">
                <h3 className="experience__card-title">Відео в HD-якості</h3>
                <p className="experience__card-desc">Дарує глядачам кращий досвід завдяки кришталево чистій HD-трансляції.</p>
              </div>
            </article>
          </div>

          <div className="experience__row">
            <article className="experience__card experience__card--light-text">
              <img src="/img/feature-qa.png" alt="Блок питань та відповідей" loading="lazy" />
              <div className="experience__card-text">
                <h3 className="experience__card-title">Питання та відповіді</h3>
                <p className="experience__card-desc">Модеруйте запитання аудиторії, дозволяйте голосувати за них і запрошуйте учасників на сцену.</p>
              </div>
            </article>

            <article className="experience__card experience__card--dark-text">
              <img src="/img/feature-chat.png" alt="Чат учасників із реакціями" loading="lazy" />
              <div className="experience__card-text">
                <h3 className="experience__card-title">Чат</h3>
                <p className="experience__card-desc">Саме в чаті народжується залученість. Зі зручним форматом, як у месенджері, учасники висловлюються за допомогою емодзі, реакцій і гіфок.</p>
              </div>
            </article>
          </div>
        </div>

        <div className="experience__footer">
          <a href="#features" className="btn btn--outline-dark">
            Усі можливості
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M3.75 9H14.25M14.25 9L9.75 4.5M14.25 9L9.75 13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}