export default function Articles() {
  return (
    <section className="articles" id="articles">
      <div className="container">
        <h2 className="articles__title">Останні статті</h2>

        <div className="articles__grid scroll-reveal">
          <article className="article-card">
            <img src="/img/article-1.png" alt="Підготовка контенту вебінару" className="article-card__img" loading="lazy" />
            <div className="article-card__body">
              <span className="article-card__tag">Натхнення</span>
              <h3 className="article-card__heading">8 креативних способів повторно використати контент вебінару</h3>
              <a href="#articles" className="article-card__read">Читати</a>
            </div>
          </article>

          <article className="article-card">
            <img src="/img/article-2.jpg" alt="Вебінари як інструмент генерації лідів" className="article-card__img" loading="lazy" />
            <div className="article-card__body">
              <span className="article-card__tag">Натхнення</span>
              <h3 className="article-card__heading">Чому вебінари — маркетингова стратегія №1 для генерації лідів, про яку ви могли не думати</h3>
              <a href="#articles" className="article-card__read">Читати</a>
            </div>
          </article>

          <article className="article-card">
            <img src="/img/article-3.jpg" alt="Робота з воронкою продажів після вебінару" className="article-card__img" loading="lazy" />
            <div className="article-card__body">
              <span className="article-card__tag">Натхнення</span>
              <h3 className="article-card__heading">Як сформувати якісну воронку та підготувати відділ продажів після завершення вебінару</h3>
              <a href="#articles" className="article-card__read">Читати</a>
            </div>
          </article>
        </div>

        <div className="articles__footer">
          <a href="#articles" className="btn btn--primary big-button">Читати блог</a>
        </div>
      </div>
    </section>
  );
}