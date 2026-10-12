'use client';
export default function Hero() {
  return (
    <section className="hero">
      <div className="hero__fog"></div>
      <div className="hero__content scroll-reveal">
        <h1 className="hero__title">Залучай і конвертуй</h1>
        <p className="hero__subtitle">
          Платформа для маркетологів, що допомагає проводити яскраві онлайн-заходи, які приносять дохід.
        </p>
        <div className="hero__cta">
          <button type="button" className="btn btn--primary" onClick={() => (document.getElementById('demo-modal') as HTMLDialogElement)?.showModal()}>Замовити демо</button>
          <a href="#how-it-works" className="btn btn--ghost">
            <svg className="btn__play-icon" width="10" height="12" viewBox="0 0 10 12" fill="none" aria-hidden="true">
              <path d="M0.5 1L9.5 6L0.5 11V1Z" fill="currentColor"/>
            </svg>
            Як це працює
          </a>
        </div>
      </div>

      <div className="hero__laptop-wrap scroll-reveal delay-200">
        <div className="hero__preview">
          <img
            className="hero__preview-photo"
            src="/img/photo-video-preview.png"
            alt="Ведучий проводить живу трансляцію в інтерфейсі платформи"
            width="1280"
            height="720"
          />
          <div className="hero__preview-overlay"></div>
        </div>
      </div>
    </section>
  );
}