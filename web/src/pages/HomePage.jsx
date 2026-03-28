import { useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { HeroWidget } from '../components/HeroWidget';
import { getSeoForSlug } from '../config/seoSlugs';
import { useSeoDocumentTitle } from '../hooks/useSeoDocumentTitle';
import './HomePage.css';

/** Link to your live request form (same origin when deployed with static HTML). */
const REQUEST_SERVICE_HREF = '/request-service.html';

/**
 * Replace the inner content with your existing homepage sections.
 * Keep id="main-content" for the Learn More smooth scroll target.
 */
function HomeMainContent() {
  return (
    <div className="home-main-inner">
      <h2 className="home-main-title">Your homepage content</h2>
      <p className="home-main-lead">
        Drop in your existing sections below this block. The SEO hero only appears on mapped routes, not on{' '}
        <code>/</code>.
      </p>
      <p>
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore
        magna aliqua.
      </p>
    </div>
  );
}

export function HomePage() {
  const { seoSlug } = useParams();
  const seo = getSeoForSlug(seoSlug);

  useSeoDocumentTitle(seo);

  const scrollToMain = useCallback(() => {
    document.getElementById('main-content')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  return (
    <>
      {seo ? (
        <HeroWidget
          h1={seo.h1}
          description={seo.description}
          requestServiceHref={REQUEST_SERVICE_HREF}
          onLearnMore={scrollToMain}
        />
      ) : null}

      <main id="main-content" className="home-main" tabIndex={-1}>
        <HomeMainContent />
      </main>
    </>
  );
}
