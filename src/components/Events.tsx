'use client';
export default function Events() {
  const openModal = () => (document.getElementById('demo-modal') as HTMLDialogElement)?.showModal();

  return (
    <section className="events" id="events">
      <div className="container">
        <div className="events__header">
          <h2 className="events__title scroll-reveal">Анонси</h2>
          <a href="#events" className="btn btn--ghost events__all big-button">Усі заходи</a>
        </div>

        <div className="events__list">
          <article className="event-card scroll-reveal">
            <div className="event-card__body">
              <time className="event-card__date" dateTime="2026-12-21">21 грудня 2026</time>
              <h3 className="event-card__title">Як привернути увагу на перенасиченому ринку</h3>
              <button type="button" className="btn btn--primary event-card__btn big-button" onClick={openModal}>Зареєструватися</button>
            </div>
            <div className="event-card__media">
              <img src="/img/event-1.jpg" alt="Спікери вебінару" loading="lazy" />
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}