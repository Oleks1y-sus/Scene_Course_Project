'use client';
export default function ExperienceWelcome() {
  const openModal = () => (document.getElementById('demo-modal') as HTMLDialogElement)?.showModal();

  return (
    <section className="experience-welcome">
      <div className="container">
        <h2 className="experience-welcome__title scroll-reveal">Відчуйте<br />«Сцену»</h2>
        <p className="experience-welcome__desc scroll-reveal delay-300">Платформа для маркетологів, що допомагає проводити яскраві онлайн-заходи, які приносять дохід.</p>
        <button type="button" className="btn btn--primary big-button scroll-reveal delay-600" onClick={openModal}>Замовити демо</button>
      </div>

      <div className="experience-welcome__ovals" aria-hidden="true">
        <div className="experience-welcome__row">
          <div className="experience-welcome__oval"><img src="/img/ew-1.png" alt="" loading="lazy" /></div>
          <div className="experience-welcome__oval"><img src="/img/ew-2.jpg" alt="" loading="lazy" /></div>
          <div className="experience-welcome__oval"><img src="/img/ew-3.jpg" alt="" loading="lazy" /></div>
          <div className="experience-welcome__oval"><img src="/img/ew-2.jpg" alt="" loading="lazy" /></div>
        </div>

        <div className="experience-welcome__row experience-welcome__row--offset">
          <div className="experience-welcome__oval"><img src="/img/ew-3.jpg" alt="" loading="lazy" /></div>
          <div className="experience-welcome__oval"><img src="/img/ew-1.png" alt="" loading="lazy" /></div>
          <div className="experience-welcome__oval"><img src="/img/ew-2.jpg" alt="" loading="lazy" /></div>
          <div className="experience-welcome__oval"><img src="/img/ew-1.png" alt="" loading="lazy" /></div>
        </div>
      </div>
    </section>
  );
}