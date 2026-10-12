export default function Opportunities() {
  return (
    <section className="opportunities">
      <div className="container column-layout">
        <h2 className="opportunities__title scroll-reveal">
          <span className="opportunities__title-small">Одна<br />платформа</span>Безмежні<br />
          <span className="opportunities__title-indent">горизонти</span>
        </h2>

        <ul className="opportunities__list scroll-reveal delay-300">
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
      </div>
    </section>
  );
}