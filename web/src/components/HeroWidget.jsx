import './HeroWidget.css';

/**
 * SEO hero: only mounted when `getSeoForSlug` returns data (known SEO route).
 */
export function HeroWidget({ h1, description, requestServiceHref, onLearnMore }) {
  return (
    <section className="seo-hero" aria-labelledby="seo-hero-heading">
      <div className="seo-hero-box">
        <h1 id="seo-hero-heading" className="seo-hero-h1">
          {h1}
        </h1>
        <p className="seo-hero-desc">{description}</p>
        <div className="seo-hero-actions">
          <a href={requestServiceHref} className="seo-hero-btn seo-hero-btn-primary">
            Request Service
          </a>
          <button type="button" className="seo-hero-btn seo-hero-btn-secondary" onClick={onLearnMore}>
            Learn More
          </button>
        </div>
      </div>
    </section>
  );
}
