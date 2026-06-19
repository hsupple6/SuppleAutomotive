/**
 * Server-side SEO page renderer.
 * Renders full HTML with meta tags, JSON-LD, content, and appointment slideout.
 */

var seoContent = require('./seo-content');

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderParagraphs(paragraphs) {
  if (!paragraphs || !paragraphs.length) return '';
  return paragraphs
    .map(function (p) {
      return '<p>' + escapeHtml(p) + '</p>';
    })
    .join('\n');
}

function renderSections(sections) {
  if (!sections || !sections.length) return '';
  return sections
    .map(function (sec) {
      return (
        '<section class="seo-section">' +
        '<h2 class="seo-section-heading">' +
        escapeHtml(sec.heading) +
        '</h2>' +
        '<div class="seo-section-body">' +
        renderParagraphs(sec.paragraphs) +
        '</div></section>'
      );
    })
    .join('\n');
}

function renderFaqs(faqs) {
  if (!faqs || !faqs.length) return '';
  var items = faqs
    .map(function (faq) {
      return (
        '<details class="seo-faq-item">' +
        '<summary class="seo-faq-q">' +
        escapeHtml(faq.q) +
        '</summary>' +
        '<p class="seo-faq-a">' +
        escapeHtml(faq.a) +
        '</p></details>'
      );
    })
    .join('\n');
  return '<section class="seo-section seo-faqs"><h2 class="seo-section-heading">Frequently asked questions</h2>' + items + '</section>';
}

function renderRelated(page) {
  if (!page.related || !page.related.length) return '';
  var links = page.related
    .map(function (relPath) {
      var rel = seoContent.getPageByPath(relPath);
      var label = rel ? rel.h1 : relPath.replace(/^learn\//, '').replace(/-/g, ' ');
      return '<a href="/' + escapeHtml(relPath) + '" class="seo-related-link">' + escapeHtml(label) + '</a>';
    })
    .join('');
  return '<section class="seo-section seo-related"><h2 class="seo-section-heading">Related pages</h2><nav class="seo-related-nav">' + links + '</nav></section>';
}

function renderHubCards() {
  var guides = seoContent.GUIDE_PAGES.concat([seoContent.PRICING_PAGE]);
  var locations = seoContent.getAllPages().filter(function (p) {
    return p.category === 'location' || p.category === 'service';
  });

  function cardList(pages, limit) {
    return pages
      .slice(0, limit || pages.length)
      .map(function (p) {
        return (
          '<a href="/' +
          escapeHtml(p.path) +
          '" class="seo-hub-card">' +
          '<span class="seo-hub-card-cat">' +
          escapeHtml(p.category) +
          '</span>' +
          '<span class="seo-hub-card-title">' +
          escapeHtml(p.h1) +
          '</span>' +
          '<span class="seo-hub-card-desc">' +
          escapeHtml(p.description) +
          '</span></a>'
        );
      })
      .join('');
  }

  return (
    '<section class="seo-section">' +
    '<h2 class="seo-section-heading">Guides &amp; pricing</h2>' +
    '<div class="seo-hub-grid">' +
    cardList(guides) +
    '</div></section>' +
    '<section class="seo-section">' +
    '<h2 class="seo-section-heading">Service areas &amp; services</h2>' +
    '<div class="seo-hub-grid seo-hub-grid--compact">' +
    cardList(locations, 12) +
    '</div>' +
    '<p class="seo-hub-more"><a href="/mobile-mechanic-ventura-county">View all Ventura County service areas →</a></p></section>'
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
    areaServed: {
      '@type': 'AdministrativeArea',
      name: 'Ventura County, California'
    },
    priceRange: '$$',
    openingHoursSpecification: {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      opens: '00:00',
      closes: '23:59'
    }
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
      publisher: {
        '@type': 'Organization',
        name: 'Supple Automotive',
        url: seoContent.SITE_URL
      }
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
    '<p class="appointment-slideout-alt"><a href="/request-service.html">Full request form →</a></p>' +
    '</form></aside></div>'
  );
}

function renderSeoPage(page) {
  if (!page) return null;

  var canonical = seoContent.SITE_URL + '/' + page.path;
  var ogImage = seoContent.SITE_URL + '/share/preview-image.png?v=2';

  var mainContent =
    page.category === 'hub'
      ? renderHubCards()
      : renderSections(page.sections) + renderFaqs(page.faqs) + renderRelated(page);

  var ctaLabel =
    page.category === 'guide'
      ? 'Schedule diagnostics'
      : page.category === 'pricing'
        ? 'Get a quote'
        : 'Schedule service';

  return (
    '<!DOCTYPE html>\n<html lang="en">\n<head>\n' +
    '<meta charset="UTF-8">\n' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
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
    '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Orbitron:wght@400;500;600;700&display=swap" rel="stylesheet">\n' +
    buildJsonLd(page) +
    '\n<script>window.va=window.va||function(){(window.vaq=window.vaq||[]).push(arguments);};</script>\n' +
    '<script defer src="/_vercel/insights/script.js"></script>\n' +
    '</head>\n<body class="page-seo">\n' +
    '<header class="top-bar top-bar--seo">\n' +
    '<a href="/" class="logo site-logo" aria-label="Supple Automotive">\n' +
    '<div class="site-logo-inner">\n' +
    '<img src="/logo/logo.png" alt="Supple Automotive" class="site-logo-img site-logo-img-main" width="auto" height="48">\n' +
    '<img src="/logo/logo1.png" alt="Supple Automotive" class="site-logo-img site-logo-img-alt" width="auto" height="48">\n' +
    '</div></a>\n' +
    '<nav class="seo-top-nav" aria-label="Page navigation">\n' +
    '<a href="/">Home</a>\n' +
    '<a href="/learn">Guides</a>\n' +
    '<a href="/request-service.html">Request service</a>\n' +
    '</nav>\n' +
    '<button type="button" class="link-cta seo-header-cta js-open-appointment">\n' +
    '<span class="link-cta-border link-cta-border-t" aria-hidden="true"></span>\n' +
    '<span class="link-cta-border link-cta-border-r" aria-hidden="true"></span>\n' +
    '<span class="link-cta-border link-cta-border-b" aria-hidden="true"></span>\n' +
    '<span class="link-cta-border link-cta-border-l" aria-hidden="true"></span>\n' +
    '<span class="link-cta-label">' +
    escapeHtml(ctaLabel) +
    '</span></button>\n' +
    '</header>\n' +
    '<main class="seo-main">\n' +
    '<article class="seo-article">\n' +
    '<header class="seo-hero">\n' +
    '<p class="seo-breadcrumb"><a href="/">Home</a> / ' +
    (page.category === 'hub'
      ? '<span>Guides</span>'
      : page.path.indexOf('learn/') === 0
        ? '<a href="/learn">Guides</a> / <span>' + escapeHtml(page.h1) + '</span>'
        : '<a href="/learn">Resources</a> / <span>' + escapeHtml(page.h1) + '</span>') +
    '</p>\n' +
    '<h1 class="seo-h1">' +
    escapeHtml(page.h1) +
    '</h1>\n' +
    '<p class="seo-lead">' +
    escapeHtml(page.description) +
    '</p>\n' +
    '<div class="seo-hero-actions">\n' +
    '<button type="button" class="link-cta js-open-appointment">\n' +
    '<span class="link-cta-border link-cta-border-t" aria-hidden="true"></span>\n' +
    '<span class="link-cta-border link-cta-border-r" aria-hidden="true"></span>\n' +
    '<span class="link-cta-border link-cta-border-b" aria-hidden="true"></span>\n' +
    '<span class="link-cta-border link-cta-border-l" aria-hidden="true"></span>\n' +
    '<span class="link-cta-label">' +
    escapeHtml(ctaLabel) +
    '</span></button>\n' +
    '<a href="tel:' +
    seoContent.PHONE.replace(/\D/g, '') +
    '" class="seo-phone-cta">' +
    escapeHtml(seoContent.PHONE) +
    '</a>\n' +
    '</div></header>\n' +
    '<div class="seo-content">' +
    mainContent +
    '</div>\n' +
    '<footer class="seo-article-cta">\n' +
    '<h2 class="seo-article-cta-heading">Ready to book?</h2>\n' +
    '<p>Request mobile service at your location anywhere in Ventura County.</p>\n' +
    '<button type="button" class="link-cta js-open-appointment">\n' +
    '<span class="link-cta-border link-cta-border-t" aria-hidden="true"></span>\n' +
    '<span class="link-cta-border link-cta-border-r" aria-hidden="true"></span>\n' +
    '<span class="link-cta-border link-cta-border-b" aria-hidden="true"></span>\n' +
    '<span class="link-cta-border link-cta-border-l" aria-hidden="true"></span>\n' +
    '<span class="link-cta-label">' +
    escapeHtml(ctaLabel) +
    '</span></button>\n' +
    '</footer></article></main>\n' +
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
    '<div class="seo-sticky-cta" id="seoStickyCta">\n' +
    '<button type="button" class="seo-sticky-cta-btn js-open-appointment">' +
    escapeHtml(ctaLabel) +
    '</button>\n' +
    '</div>\n' +
    renderAppointmentSlideout(page.serviceType) +
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
