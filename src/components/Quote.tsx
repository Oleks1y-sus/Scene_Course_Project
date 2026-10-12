import quoteHandPhone from '@/public/img/quote-hand-phone.jpg';

export default function Quote() {
  return (
    <section className="quote">
      <div className="quote__bg">
        <img src={quoteHandPhone.src} alt="Мобільний застосунок платформи в руці" loading="lazy" />
      </div>
      <div className="container">
        <div className="quote__content scroll-reveal">
          <blockquote className="quote__text">
            «Поруч зі «Сценою» інші платформи виглядають як із 90-х»
          </blockquote>
          <p className="quote__author">— Олена Мельник, директорка з маркетингу в «ТехноВектор»</p>
          <a href="#testimonials" className="btn btn--ghost quote__btn">Читати історії клієнтів</a>
        </div>
      </div>
    </section>
  );
}