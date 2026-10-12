import integrationLogo1 from '@/public/img/integration-logo-1.png';
import integrationLogo2 from '@/public/img/integration-logo-2.png';
import integrationLogo3 from '@/public/img/integration-logo-3.png';
import integrationLogo4 from '@/public/img/integration-logo-4.png';
import integrationBadge from '@/public/img/integration-badge.jpg';

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
                  <img src={integrationLogo4.src} alt="Marketo" className="integration__oval-img" loading="lazy" />
                </div>
                <div className="integration__oval">
                  <img src={integrationLogo3.src} alt="Salesforce" className="integration__oval-img" loading="lazy" />
                </div>
              </div>

              <div className="integration__ovals-right">
                <div className="integration__oval">
                  <img src={integrationLogo2.src} alt="Pardot" className="integration__oval-img" loading="lazy" />
                </div>
                <div className="integration__oval">
                  <img src={integrationLogo1.src} alt="HubSpot" className="integration__oval-img" loading="lazy" />
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
                    <img src={integrationBadge.src} alt="" loading="lazy" />
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