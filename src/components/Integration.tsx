export default function Integration() {
  return (
    <section className="integration">
      <div className="container">
        <div className="integration__grid scroll-reveal">
          <div className="integration__ovals-col">
            <div className="integration__ovals-chess">
              <div className="integration__ovals-left">
                <div className="integration__oval integration__oval--custom">
                  <span className="integration__oval-text">Власна<br />інтеграція</span>
                </div>
                <div className="integration__oval">
                  <img src="/img/integration-logo-4.png" alt="Marketo" className="integration__oval-img" loading="lazy" />
                </div>
                <div className="integration__oval">
                  <img src="/img/integration-logo-3.png" alt="Salesforce" className="integration__oval-img" loading="lazy" />
                </div>
              </div>

              <div className="integration__ovals-right">
                <div className="integration__oval">
                  <img src="/img/integration-logo-2.png" alt="Pardot" className="integration__oval-img" loading="lazy" />
                </div>
                <div className="integration__oval">
                  <img src="/img/integration-logo-1.png" alt="HubSpot" className="integration__oval-img" loading="lazy" />
                </div>
                <div className="integration__oval integration__oval--custom">
                  <span className="integration__oval-text">Власна<br />інтеграція</span>
                </div>
              </div>
            </div>
          </div>

          <div className="integration__content-col scroll-reveal">
            <div className="integration__header">
              <h2 className="integration__title">
                Інтегруйте<br />
                <span className="integration__title-row">
                  <span className="integration__title-badge">
                    <img src="/img/integration-badge.jpg" alt="" loading="lazy" />
                  </span>
                  свої дані
                </span>
              </h2>
              <p className="integration__desc">
                Використовуйте наявні маркетингові платформи та безшовно синхронізуйте дані
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}