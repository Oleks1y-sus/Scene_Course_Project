'use client';

import ew1 from '@/public/img/ew-1.png';
import ew2 from '@/public/img/ew-2.jpg';
import ew3 from '@/public/img/ew-3.jpg';
import { ScrollRevealInit } from '@/components/ScrollRevealInit';

export default function ExperienceWelcome() {
  const openModal = () => (document.getElementById('demo-modal') as HTMLDialogElement)?.showModal();

  return (
    <section className="experience-welcome">
      <div className="container">
        <ScrollRevealInit>
          <h2 className="experience-welcome__title">Відчуйте<br />«Сцену»</h2>
        </ScrollRevealInit>
        <ScrollRevealInit delay="delay-300">
          <p className="experience-welcome__desc">Платформа для маркетологів, що допомагає проводити яскраві онлайн-заходи, які приносять дохід.</p>
        </ScrollRevealInit>
        <ScrollRevealInit delay="delay-600">
          <button type="button" className="btn btn--primary big-button" onClick={openModal}>Замовити демо</button>
        </ScrollRevealInit>
      </div>

      <div className="experience-welcome__ovals" aria-hidden="true">
        <div className="experience-welcome__row">
          <div className="experience-welcome__oval"><img src={ew1.src} alt="" loading="lazy" /></div>
          <div className="experience-welcome__oval"><img src={ew2.src} alt="" loading="lazy" /></div>
          <div className="experience-welcome__oval"><img src={ew3.src} alt="" loading="lazy" /></div>
          <div className="experience-welcome__oval"><img src={ew2.src} alt="" loading="lazy" /></div>
        </div>

        <div className="experience-welcome__row experience-welcome__row--offset">
          <div className="experience-welcome__oval"><img src={ew3.src} alt="" loading="lazy" /></div>
          <div className="experience-welcome__oval"><img src={ew1.src} alt="" loading="lazy" /></div>
          <div className="experience-welcome__oval"><img src={ew2.src} alt="" loading="lazy" /></div>
          <div className="experience-welcome__oval"><img src={ew1.src} alt="" loading="lazy" /></div>
        </div>
      </div>
    </section>
  );
}