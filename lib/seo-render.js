/**
 * Server-side SEO page renderer.
 * Matches main site layout: top-bar, reveal animations, split sections, site images.
 */

var seoContent = require('./seo-content');

var IMAGES = {
  hero: '/images/hero.jpg',
  maintenance: '/images/service-maintenance.jpg',
  diagnostics: '/images/service-diagnostics.jpg',
  inspection: '/images/service-inspection.jpg',
  mechanic: '/images/mechanic.jpg',
  schedule: '/images/process-schedule.jpg',
  parts: '/images/process-parts-quote.jpg',
  repair: '/images/process-repair-go.jpg',
  diagnose: '/images/process-diagnose.jpg'
};

var SECTION_IMAGES = [
  IMAGES.maintenance,
  IMAGES.diagnostics,
  IMAGES.inspection,
  IMAGES.mechanic,
  IMAGES.repair,
  IMAGES.schedule,
  IMAGES.parts,
  IMAGES.diagnose
];

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getHeroImage(page) {
  if (page.heroImage) return page.heroImage;
  if (page.category === 'hub') return IMAGES.hero;
  if (page.category === 'pricing') return IMAGES.parts;
  if (page.category === 'guide') {
    if (page.path.indexOf('check-engine') !== -1) return IMAGES.diagnostics;
    if (page.path.indexOf('brake') !== -1) return IMAGES.maintenance;
    if (page.path.indexOf('pre-purchase') !== -1) return IMAGES.inspection;
    return IMAGES.diagnose;
  }
  if (page.category === 'service') {
    if (page.path.indexOf('diagnostic') !== -1) return IMAGES.diagnostics;
    if (page.path.indexOf('inspection') !== -1) return IMAGES.inspection;
    return IMAGES.maintenance;
  }
  return IMAGES.hero;
}

function getCtaLabel(page) {
  if (page.category === 'guide') return 'Schedule diagnostics';
  if (page.category === 'pricing') return 'Get a quote';
  return 'Schedule service';
}

function renderCtaButton(label, extraClass) {
  var cls = 'link-cta js-open-appointment' + (extraClass ? ' ' + extraClass : '');
  return (
    '<button type="button" class="' +
    cls +
    '">' +
    '<span class="link-cta-border link-cta-border-t" aria-hidden="true"></span>' +
    '<span class="link-cta-border link-cta-border-r" aria-hidden="true"></span>' +
    '<span class="link-cta-border link-cta-border-b" aria-hidden="true"></span>' +
    '<span class="link-cta-border link-cta-border-l" aria-hidden="true"></span>' +
    '<span class="link-cta-label">' +
    escapeHtml(label) +
    '</span></button>'
  );
}

function renderBreadcrumb(page) {
  if (page.category === 'hub') {
    return '<p class="seo-breadcrumb copy-overline" data-split-lines><a href="/">Home</a> · Guides</p>';
  }
  if (page.path.indexOf('learn/') === 0) {
    return (
      '<p class="seo-breadcrumb copy-overline" data-split-lines><a href="/">Home</a> · <a href="/learn">Guides</a></p>'
    );
  }
  return '<p class="seo-breadcrumb copy-overline" data-split-lines><a href="/">Home</a> · <a href="/learn">Resources</a></p>';
}

function renderParagraphsHtml(paragraphs) {
  return (paragraphs || [])
    .map(function (p) {
      return '<p class="copy-body">' + escapeHtml(p) + '</p>';
    })
    .join('');
}

function renderSections(page) {
  if (!page.sections || !page.sections.length) return '';
  return page.sections
    .map(function (sec, i) {
      var flipped = i % 2 === 1 ? ' seo-split--flip' : '';
      var img = SECTION_IMAGES[i % SECTION_IMAGES.length];
      var num = String(i + 1).padStart(2, '0');
      return (
        '<section class="block seo-split' +
        flipped +
        '">' +
        '<div class="about-inner seo-split-inner">' +
        '<div class="about-image-wrap" data-reveal-image>' +
        '<img src="' +
        escapeHtml(img) +
        '" alt="" width="800" height="1000" loading="lazy" decoding="async">' +
        '<div class="about-image-overlay" aria-hidden="true"></div>' +
        '</div>' +
        '<div class="about-copy reveal-on-scroll">' +
        '<p class="copy-overline" data-split-lines>' +
        escapeHtml(num) +
        '</p>' +
        '<h2 class="copy-title" data-split-lines>' +
        escapeHtml(sec.heading) +
        '</h2>' +
        '<div data-split-lines>' +
        renderParagraphsHtml(sec.paragraphs) +
        '</div>' +
        (i === 0 ? renderCtaButton(getCtaLabel(page), 'seo-inline-cta') : '') +
        '</div></div></section>'
      );
    })
    .join('\n');
}

function renderFaqs(page) {
  if (!page.faqs || !page.faqs.length) return '';
  var items = page.faqs
    .map(function (faq) {
      return (
        '<details class="seo-faq-item pricing-accordion-item">' +
        '<summary class="seo-faq-q pricing-accordion-trigger">' +
        escapeHtml(faq.q) +
        '</summary>' +
        '<div class="seo-faq-a pricing-accordion-panel-inner"><p>' +
        escapeHtml(faq.a) +
        '</p></div></details>'
      );
    })
    .join('');
  return (
    '<section class="block block-copy seo-faqs-block">' +
    '<div class="copy-inner reveal-on-scroll">' +
    '<p class="copy-overline" data-split-lines>FAQ</p>' +
    '<h2 class="copy-title" data-split-lines>Common questions</h2>' +
    '<div class="seo-faqs-list">' +
    items +
    '</div></div></section>'
  );
}

function renderRelated(page) {
  if (!page.related || !page.related.length) return '';
  var links = page.related
    .map(function (relPath) {
      var rel = seoContent.getPageByPath(relPath);
      var label = rel ? rel.h1 : relPath.replace(/^learn\//, '').replace(/-/g, ' ');
      return '<a href="/' + escapeHtml(relPath) + '" class="seo-related-link link-discover">' + escapeHtml(label) + '</a>';
    })
    .join('');
  return (
    '<section class="block block-copy seo-related-block">' +
    '<div class="copy-inner reveal-on-scroll">' +
    '<p class="copy-overline" data-split-lines>Explore</p>' +
    '<h2 class="copy-title" data-split-lines>Related pages</h2>' +
    '<nav class="seo-related-nav">' +
    links +
    '</nav></div></section>'
  );
}

function renderHubCards() {
  var guides = seoContent.GUIDE_PAGES.concat([seoContent.PRICING_PAGE]);
  var locations = seoContent.getAllPages().filter(function (p) {
    return p.category === 'location' || p.category === 'service';
  });

  function cardList(pages, limit) {
    return pages
      .slice(0, limit || pages.length)
      .map(function (p, i) {
        var img = getHeroImage(p);
        return (
          '<a href="/' +
          escapeHtml(p.path) +
          '" class="seo-hub-card reveal-on-scroll">' +
          '<span class="seo-hub-card-img"><img src="' +
          escapeHtml(img) +
          '" alt="" loading="lazy" decoding="async"></span>' +
          '<span class="seo-hub-card-body">' +
          '<span class="seo-hub-card-cat copy-overline">' +
          escapeHtml(p.category) +
          '</span>' +
          '<span class="seo-hub-card-title">' +
          escapeHtml(p.h1) +
          '</span>' +
          '<span class="seo-hub-card-desc copy-body">' +
          escapeHtml(p.description) +
          '</span></span></a>'
        );
      })
      .join('');
  }

  return (
    '<section class="block block-copy">' +
    '<div class="copy-inner reveal-on-scroll">' +
    '<p class="copy-overline" data-split-lines>Knowledge</p>' +
    '<h2 class="copy-title" data-split-lines>Guides &amp; pricing</h2>' +
    '</div></section>' +
    '<section class="block seo-hub-section"><div class="seo-hub-grid">' +
    cardList(guides) +
    '</div></section>' +
    '<section class="block block-copy">' +
    '<div class="copy-inner reveal-on-scroll">' +
    '<p class="copy-overline" data-split-lines>Service areas</p>' +
    '<h2 class="copy-title" data-split-lines>Where we work</h2>' +
    '</div></section>' +
    '<section class="block seo-hub-section"><div class="seo-hub-grid seo-hub-grid--compact">' +
    cardList(locations, 12) +
    '</div>' +
    '<p class="seo-hub-more reveal-on-scroll"><a href="/mobile-mechanic-ventura-county" class="link-discover">Ventura County coverage →</a></p></section>'
  );
}

function buildJsonLd(page) {
  var url = seoContent.SITE_URL + '/' + page.path;
  var schemas = [];

  schemas.push({
    '@context': 'https://schema.org',
    '@type': 'AutoRepair',
    name: 'Supple Automotive',
    url: seoContent.SITE_URL,
    telephone: seoContent.PHONE,
    email: seoContent.EMAIL,
    address: {
      '@type': 'PostalAddress',
      streetAddress: '5395 Quailridge Dr.',
      addressLocality: 'Camarillo',
      addressRegion: 'CA',
      postalCode: '93012',
      addressCountry: 'US'
    },
    areaServed: { '@type': 'AdministrativeArea', name: 'Ventura County, California' },
    priceRange: '$'
  });

  if (page.category === 'guide') {
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: page.h1,
      description: page.description,
      url: url,
      dateModified: page.updatedAt,
      author: { '@type': 'Organization', name: 'Supple Automotive' },
      publisher: { '@type': 'Organization', name: 'Supple Automotive', url: seoContent.SITE_URL }
    });
  }

  if (page.faqs && page.faqs.length) {
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: page.faqs.map(function (faq) {
        return {
          '@type': 'Question',
          name: faq.q,
          acceptedAnswer: { '@type': 'Answer', text: faq.a }
        };
      })
    });
  }

  return schemas
    .map(function (s) {
      return '<script type="application/ld+json">' + JSON.stringify(s) + '</script>';
    })
    .join('\n');
}

function renderHeader(ctaLabel) {
  return (
    '<header class="top-bar scrolled" id="seoTopBar">' +
    '<a href="/" class="logo site-logo" aria-label="Supple Automotive">' +
    '<div class="site-logo-inner">' +
    '<img src="/logo/logo.png" alt="" class="site-logo-img site-logo-img-main" width="auto" height="48">' +
    '<img src="/logo/logo1.png" alt="Supple Automotive" class="site-logo-img site-logo-img-alt" width="auto" height="48">' +
    '</div></a>' +
    '<button type="button" class="mobile-logo-cta js-open-appointment" id="mobileLogoCta">' +
    '<span class="link-cta-border link-cta-border-t" aria-hidden="true"></span>' +
    '<span class="link-cta-border link-cta-border-r" aria-hidden="true"></span>' +
    '<span class="link-cta-border link-cta-border-b" aria-hidden="true"></span>' +
    '<span class="link-cta-border link-cta-border-l" aria-hidden="true"></span>' +
    '<span class="link-cta-label">Schedule</span></button>' +
    '<div class="header-brand-chrome" aria-hidden="true">' +
    '<div class="header-brand-chrome-top">UPPLE</div>' +
    '<div class="header-brand-chrome-bottom">AUTOMOTIVE</div></div>' +
    '<button type="button" class="nav-toggle" id="navToggle" aria-label="Open menu" aria-expanded="false" aria-controls="navMenu">' +
    '<span class="nav-toggle-icon" aria-hidden="true"></span></button>' +
    '<div class="nav-menu" id="navMenu" role="navigation">' +
    '<div class="nav-menu-content" id="navMenuContent">' +
    '<nav class="nav-links">' +
    '<a href="/">Home</a>' +
    '<a href="/learn">Guides</a>' +
    '<a href="/learn/mobile-mechanic-pricing">Pricing</a>' +
    '<a href="/#contact">Contact</a>' +
    '</nav>' +
    '<div class="header-actions">' +
    '<a href="/payment.html" class="link-payment js-payment-portal-link">User Portal</a>' +
    renderCtaButton(ctaLabel, 'seo-header-cta') +
    '</div></div></div></header>' +
    '<div class="mobile-nav-slash" id="mobileNavSlash" aria-hidden="true">' +
    '<div class="mobile-nav-slash-fill"></div>' +
    '<div class="mobile-nav-overlay-content" id="mobileNavOverlayContent" aria-hidden="true">' +
    '<nav class="mobile-nav-overlay-links">' +
    '<a href="/">Home</a>' +
    '<a href="/learn">Guides</a>' +
    '<a href="/learn/mobile-mechanic-pricing">Pricing</a>' +
    '<a href="/#contact">Contact</a>' +
    '</nav>' +
    '<div class="mobile-nav-overlay-actions">' +
    '<a href="/payment.html" class="js-payment-portal-link">User Portal</a>' +
    '<button type="button" class="js-open-appointment seo-mobile-nav-cta">Request service</button>' +
    '</div></div></div>'
  );
}

function renderHubBrandExpand() {
  return (
    '<div class="seo-hub-brand-expand" id="seoHubBrandExpand">' +
    '<div class="seo-hub-brand-expand-inner">' +
    '<img src="/logo/logo1.png" alt="" class="seo-hub-brand-logo" width="auto" height="120" decoding="async">' +
    '<div class="seo-hub-brand-chrome">' +
    '<span class="seo-hub-brand-top">SUPPLE</span>' +
    '<span class="seo-hub-brand-bottom">AUTOMOTIVE</span>' +
    '</div></div></div>'
  );
}

function renderHero(page, ctaLabel) {
  var heroImg = getHeroImage(page);
  var isHub = page.category === 'hub';
  var overline =
    isHub
      ? 'Ventura County · Resources'
      : page.category === 'guide'
        ? 'Guide · Ventura County'
        : page.category === 'pricing'
          ? 'Transparent pricing'
          : 'Mobile · Ventura County';

  if (isHub) {
    return (
      '<section class="block seo-hero-block seo-hero-block--hub" aria-label="Page introduction">' +
      '<div class="seo-hero-bg">' +
      '<img src="' +
      escapeHtml(heroImg) +
      '" alt="" width="1920" height="1080" loading="eager" decoding="async">' +
      '<div class="seo-hero-scrim seo-hero-scrim--hub" aria-hidden="true"></div>' +
      '</div>' +
      '<div class="seo-hero-hub-layout">' +
      renderHubBrandExpand() +
      '<div class="seo-hero-content seo-hero-content--hub">' +
      '<div class="seo-hero-copy reveal-on-scroll is-visible">' +
      renderBreadcrumb(page) +
      '<p class="copy-overline" data-split-lines>' +
      escapeHtml(overline) +
      '</p>' +
      '<h1 class="copy-title seo-hero-title" data-split-lines>' +
      escapeHtml(page.h1) +
      '</h1>' +
      '<p class="copy-body seo-hero-lead" data-split-lines>' +
      escapeHtml(page.description) +
      '</p>' +
      '</div></div></div></section>' +
      '<section class="section-black" aria-hidden="true"></section>'
    );
  }

  return (
    '<section class="block seo-hero-block" aria-label="Page introduction">' +
    '<div class="seo-hero-bg">' +
    '<img src="' +
    escapeHtml(heroImg) +
    '" alt="" width="1920" height="1080" loading="eager" decoding="async">' +
    '<div class="seo-hero-scrim" aria-hidden="true"></div>' +
    '</div>' +
    '<div class="seo-hero-content">' +
    '<div class="seo-hero-copy reveal-on-scroll">' +
    renderBreadcrumb(page) +
    '<p class="copy-overline" data-split-lines>' +
    escapeHtml(overline) +
    '</p>' +
    '<h1 class="copy-title seo-hero-title" data-split-lines>' +
    escapeHtml(page.h1) +
    '</h1>' +
    '<p class="copy-body seo-hero-lead" data-split-lines>' +
    escapeHtml(page.description) +
    '</p>' +
    '<div class="seo-hero-actions">' +
    renderCtaButton(ctaLabel) +
    '<a href="tel:' +
    seoContent.PHONE.replace(/\D/g, '') +
    '" class="seo-phone-link link-discover">' +
    escapeHtml(seoContent.PHONE) +
    '</a></div></div></div></section>' +
    '<section class="section-black" aria-hidden="true"></section>'
  );
}

function renderBottomCta(ctaLabel) {
  return (
    '<section class="block block-copy seo-bottom-cta">' +
    '<div class="copy-inner reveal-on-scroll">' +
    '<p class="copy-overline" data-split-lines>Book now</p>' +
    '<h2 class="copy-title" data-split-lines>Ready when you are</h2>' +
    '<p class="copy-body" data-split-lines>Request mobile service at your location anywhere in Ventura County. We confirm timing and pricing before any work begins.</p>' +
    renderCtaButton(ctaLabel) +
    '</div></section>'
  );
}

function renderAppointmentSlideout(serviceType) {
  var preselected = escapeHtml(serviceType || '');
  return (
    '<div class="appointment-slideout" id="appointmentSlideout" aria-hidden="true">' +
    '<div class="appointment-slideout-backdrop js-close-appointment" tabindex="-1"></div>' +
    '<aside class="appointment-slideout-panel" role="dialog" aria-modal="true" aria-labelledby="appointmentSlideoutTitle">' +
    '<header class="appointment-slideout-header">' +
    '<h2 class="appointment-slideout-title" id="appointmentSlideoutTitle">Request service</h2>' +
    '<button type="button" class="appointment-slideout-close js-close-appointment" aria-label="Close">&times;</button>' +
    '</header>' +
    '<form class="service-form appointment-slideout-form" id="appointmentSlideoutForm" action="#" method="post" novalidate>' +
    '<label class="form-field"><span class="form-label">Name <em>required</em></span>' +
    '<input type="text" name="name" required placeholder="Your full name" autocomplete="name" class="form-input"></label>' +
    '<label class="form-field"><span class="form-label">Email <em>required</em></span>' +
    '<input type="email" name="email" required placeholder="you@example.com" autocomplete="email" class="form-input"></label>' +
    '<label class="form-field"><span class="form-label">Phone</span>' +
    '<input type="tel" name="phone" placeholder="(805) 555-0000" autocomplete="tel" class="form-input"></label>' +
    '<label class="form-field"><span class="form-label">Service address <em>required</em></span>' +
    '<input type="text" name="service_address" required placeholder="Street, city, ZIP" autocomplete="street-address" class="form-input"></label>' +
    '<label class="form-field"><span class="form-label">Service needed</span>' +
    '<select name="service_type" class="form-input form-select">' +
    '<option value="">Select…</option>' +
    '<option value="maintenance"' +
    (preselected === 'maintenance' ? ' selected' : '') +
    '>Maintenance &amp; Repairs</option>' +
    '<option value="diagnostics"' +
    (preselected === 'diagnostics' ? ' selected' : '') +
    '>Diagnostics</option>' +
    '<option value="inspection"' +
    (preselected === 'inspection' ? ' selected' : '') +
    '>Inspection</option>' +
    '<option value="other"' +
    (preselected === 'other' ? ' selected' : '') +
    '>Other</option>' +
    '</select></label>' +
    '<label class="form-field"><span class="form-label">Details</span>' +
    '<textarea name="details" rows="3" placeholder="Describe the issue or what you need…" class="form-input form-textarea"></textarea></label>' +
    '<input type="hidden" name="contact_preference" value="email">' +
    '<label class="form-checkbox">' +
    '<input type="checkbox" name="contact_via_ok" required>' +
    '<span class="form-checkbox-indicator" aria-hidden="true"></span>' +
    '<span class="form-checkbox-label">It is okay to contact me via email regarding this request.</span></label>' +
    '<div class="form-actions">' +
    '<button type="submit" class="form-submit">Submit request</button>' +
    '<p id="appointmentSlideoutMessage" class="form-message" role="alert" aria-live="polite" hidden></p>' +
    '</div>' +
    '<p class="appointment-slideout-alt"><a href="/request-service.html" class="link-discover">Full request form →</a></p>' +
    '</form></aside></div>'
  );
}

function renderSeoPage(page) {
  if (!page) return null;

  var canonical = seoContent.SITE_URL + '/' + page.path;
  var ogImage = seoContent.SITE_URL + '/share/preview-image.png?v=2';
  var ctaLabel = getCtaLabel(page);

  var mainContent =
    page.category === 'hub'
      ? renderHubCards()
      : renderSections(page) + renderFaqs(page) + renderRelated(page);

  return (
    '<!DOCTYPE html>\n<html lang="en">\n<head>\n' +
    '<meta charset="UTF-8">\n' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
    '<base href="/">\n' +
    '<link rel="icon" type="image/png" href="/logo/tablogo.png">\n' +
    '<title>' +
    escapeHtml(page.title) +
    '</title>\n' +
    '<meta name="description" content="' +
    escapeHtml(page.description) +
    '">\n' +
    '<link rel="canonical" href="' +
    escapeHtml(canonical) +
    '">\n' +
    '<meta property="og:type" content="article">\n' +
    '<meta property="og:url" content="' +
    escapeHtml(canonical) +
    '">\n' +
    '<meta property="og:site_name" content="Supple Automotive">\n' +
    '<meta property="og:title" content="' +
    escapeHtml(page.title) +
    '">\n' +
    '<meta property="og:description" content="' +
    escapeHtml(page.description) +
    '">\n' +
    '<meta property="og:image" content="' +
    escapeHtml(ogImage) +
    '">\n' +
    '<meta name="twitter:card" content="summary_large_image">\n' +
    '<meta name="twitter:title" content="' +
    escapeHtml(page.title) +
    '">\n' +
    '<meta name="twitter:description" content="' +
    escapeHtml(page.description) +
    '">\n' +
    '<meta name="twitter:image" content="' +
    escapeHtml(ogImage) +
    '">\n' +
    '<link rel="stylesheet" href="/css/styles.css">\n' +
    '<link rel="stylesheet" href="/css/seo.css">\n' +
    '<link rel="preconnect" href="https://fonts.googleapis.com">\n' +
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' +
    '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Montserrat:wght@600;800&family=Orbitron:wght@400;500;600;700&display=swap" rel="stylesheet">\n' +
    buildJsonLd(page) +
    '\n<script>window.va=window.va||function(){(window.vaq=window.vaq||[]).push(arguments);};</script>\n' +
    '<script defer src="/_vercel/insights/script.js"></script>\n' +
    '</head>\n<body class="page-seo' +
    (page.category === 'hub' ? ' page-seo-hub' : '') +
    '">\n' +
    renderHeader(ctaLabel) +
    '<main>\n' +
    renderHero(page, ctaLabel) +
    mainContent +
    renderBottomCta(ctaLabel) +
    '<section class="block block-footer-strip">' +
    '<div class="reveal-on-scroll footer-strip-inner">' +
    '<p class="footer-strip-text">Soft and Supple</p></div></section></main>\n' +
    '<footer class="footer">\n' +
    '<nav class="footer-nav">\n' +
    '<a href="/">Home</a>\n' +
    '<a href="/learn">Guides</a>\n' +
    '<a href="/request-service.html">Request service</a>\n' +
    '<a href="/#contact">Contact</a>\n' +
    '</nav>\n' +
    '<p class="footer-copy">Copyright &copy; since <span id="footerYear"></span> &ndash; <span id="footerName">Supple Automotive</span></p>\n' +
    '<div class="footer-legal">\n' +
    '<a href="/sitemap.xml">Sitemap</a>\n' +
    '<a href="/learn">Resources</a>\n' +
    '</div></footer>\n' +
    '<div class="seo-sticky-cta" id="seoStickyCta">' +
    renderCtaButton(ctaLabel, 'seo-sticky-cta-btn') +
    '</div>\n' +
    renderAppointmentSlideout(page.serviceType) +
    '<button type="button" class="scroll-to-top" id="scrollToTop" aria-label="Back to top" title="Back to top" hidden>' +
    '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 15l-6-6-6 6"/></svg></button>\n' +
    '<script src="/config.js"></script>\n' +
    '<script src="/js/main.js"></script>\n' +
    '</body></html>'
  );
}

function renderSitemapXml() {
  var urls = seoContent.getSitemapUrls();
  var body = urls
    .map(function (u) {
      var lastmod = u.lastmod ? '<lastmod>' + u.lastmod + '</lastmod>' : '';
      return (
        '<url><loc>' +
        escapeHtml(u.loc) +
        '</loc>' +
        lastmod +
        '<changefreq>' +
        (u.changefreq || 'monthly') +
        '</changefreq><priority>' +
        (u.priority || '0.5') +
        '</priority></url>'
      );
    })
    .join('');
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    body +
    '\n</urlset>'
  );
}

module.exports = {
  renderSeoPage: renderSeoPage,
  renderSitemapXml: renderSitemapXml,
  escapeHtml: escapeHtml
};
