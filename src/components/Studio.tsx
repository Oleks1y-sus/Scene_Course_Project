import studioAgenda from '@/public/img/studio-agenda.jpg';
import studioBrand from '@/public/img/studio-brand.png';
import studioStage from '@/public/img/studio-stage.png';
import studioGreenroom from '@/public/img/studio-greenroom.jpg';

export default function Studio() {
  return (
    <section className="studio">
      <div className="container">
        <div className="studio__heading scroll-reveal">
          <p className="studio__label">Працює на</p>
          <h2 className="studio__title">Сцена<br /><span className="studio__title-sub">Студія</span></h2>
        </div>

        <div className="studio__grid scroll-reveal delay-300">
          <article className="studio__card studio__card--main">
            <div className="studio__card-content">
              <h3 className="studio__card-title">Конструктор програми з перетягуванням</h3>
              <p className="studio__card-desc">Швидко змінюйте послідовність дій вебінару — програма заходу оновлюється автоматично щоразу, коли ви переставляєте блоки.</p>
            </div>
            <div className="studio__card-media">
              <img src={studioAgenda.src} alt="Інтерфейс конструктора програми заходу" loading="lazy" />
            </div>
          </article>

          <div className="studio__row">
            <article className="studio__card">
              <div className="studio__card-content">
                <h3 className="studio__card-title">Брендування</h3>
                <p className="studio__card-desc">Оформте весь досвід у стилі бренду: сторінки реєстрації, листи, фони, логотипи, шрифти, накладки та шаблони фотобудки.</p>
              </div>
              <div className="studio__card-media">
                <img src={studioBrand.src} alt="Інтерфейс налаштування брендування" loading="lazy" />
              </div>
            </article>

            <article className="studio__card">
              <div className="studio__card-content">
                <h3 className="studio__card-title">Набір для сцени</h3>
                <p className="studio__card-desc">Створюйте фірмові накладки, нижні титри та градієнти безпосередньо в платформі.</p>
              </div>
              <div className="studio__card-media">
                <img src={studioStage.src} alt="Інтерфейс набору для оформлення сцени" loading="lazy" />
              </div>
            </article>

            <article className="studio__card">
              <div className="studio__card-content">
                <h3 className="studio__card-title">Зелена кімната</h3>
                <p className="studio__card-desc">Запрошуйте спікерів до закритої кімнати очікування, щоб вони познайомилися та підготувалися до виходу на сцену.</p>
              </div>
              <div className="studio__card-media">
                <img src={studioGreenroom.src} alt="Інтерфейс зеленої кімнати для спікерів" loading="lazy" />
              </div>
            </article>
          </div>
        </div>

        <div className="studio__footer">
          <a href="#features" className="btn btn--outline-light">
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