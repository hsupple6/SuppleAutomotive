/**
 * SEO page image assignments — maps each page to unique hero + section photos.
 * Add new images to public/images/ or public/img-bank/, then assign here.
 * Avoid: IMG-11, IMG-13, IMG-15, IMG-17, IMG-19, IMG-23 (fire extinguisher residue).
 */

var PAGE_IMAGES = {
  learn: {
    hero: '/images/hero1.jpg',
    sections: ['/images/mechanic.jpg', '/img-bank/IMG-30.jpg', '/img-bank/IMG-31.jpg']
  },
  'learn/mobile-mechanic-pricing': {
    hero: '/images/Oil3.png',
    sections: ['/images/Oil1.jpg', '/img-bank/IMG-28.jpg', '/img-bank/IMG-34.jpg']
  },
  'learn/synthetic-vs-conventional-oil': {
    hero: '/images/Oil1.jpg',
    sections: ['/images/Oil2.jpg', '/images/Oil3.png', '/img-bank/IMG-42.jpg', '/img-bank/IMG-28.jpg']
  },
  'learn/oil-filter-types-guide': {
    hero: '/images/OilFilter2.jpg',
    sections: ['/images/OilFilter1.webp', '/images/OilFilter3.webp', '/img-bank/IMG-28.jpg', '/images/Oil3.png']
  },
  'learn/battery-vs-alternator-guide': {
    hero: '/images/Battery2.jpg',
    sections: ['/images/Alternator1.jpg', '/images/Alternator2.PNG', '/images/Battery1.webp']
  },
  'learn/brake-diagnosis-guide': {
    hero: '/images/Brake1.jpg',
    sections: ['/images/Brake2.jpeg', '/img-bank/IMG-4.jpg', '/images/Suspension1.jpg', '/img-bank/IMG-3.jpg']
  },
  'learn/mobile-brake-repair-guide': {
    hero: '/images/Brake2.jpeg',
    sections: ['/images/Brake1.jpg', '/img-bank/IMG-4.jpg', '/img-bank/IMG-5.jpg']
  },
  'learn/check-engine-light-guide': {
    hero: '/img-bank/IMG-38.jpg',
    sections: ['/img-bank/IMG-22.jpg', '/img-bank/IMG-35.jpg', '/img-bank/IMG-39.jpg']
  },
  'learn/pre-purchase-inspection-guide': {
    hero: '/img-bank/IMG-7.jpg',
    sections: ['/images/service-inspection.jpg', '/images/Suspension2.jpg', '/images/Suspension3.jpeg']
  },

  'mobile-mechanic-ventura': {
    hero: '/img-bank/IMG-31.jpg',
    sections: ['/images/mechanic.jpg', '/img-bank/IMG-43.jpg', '/img-bank/IMG-30.jpg']
  },
  'mobile-mechanic-oxnard': {
    hero: '/img-bank/IMG-43.png',
    sections: ['/img-bank/IMG-21.jpg', '/img-bank/IMG-30.jpg', '/images/mechanic-about.png']
  },
  'mobile-mechanic-camarillo': {
    hero: '/img-bank/IMG-21.jpg',
    sections: ['/img-bank/IMG-27.jpg', '/images/mechanic.jpg', '/img-bank/IMG-7.jpg']
  },
  'mobile-mechanic-thousand-oaks': {
    hero: '/img-bank/IMG-16.jpg',
    sections: ['/img-bank/IMG-7.jpg', '/images/mechanic1.jpg', '/img-bank/IMG-36.jpg']
  },
  'mobile-mechanic-simi-valley': {
    hero: '/images/mechanic1.jpg',
    sections: ['/img-bank/IMG-30.jpg', '/img-bank/IMG-22.jpg', '/img-bank/IMG-5.jpg']
  },
  'mobile-mechanic-moorpark': {
    hero: '/img-bank/IMG-27.jpg',
    sections: ['/img-bank/IMG-7.jpg', '/images/mechanic-about.png', '/img-bank/IMG-24.jpg']
  },
  'mobile-mechanic-ojai': {
    hero: '/images/mechanic-about.png',
    sections: ['/img-bank/IMG-30.jpg', '/images/mechanic1.jpg', '/img-bank/IMG-32.jpg']
  },
  'mobile-mechanic-santa-paula': {
    hero: '/img-bank/IMG-32.jpg',
    sections: ['/images/hero1.jpg', '/img-bank/IMG-27.jpg', '/images/mechanic.jpg']
  },
  'mobile-mechanic-ventura-county': {
    hero: '/img-bank/IMG-29.jpg',
    sections: ['/img-bank/IMG-7.jpg', '/img-bank/IMG-31.jpg', '/img-bank/IMG-22.jpg', '/images/mechanic.jpg']
  },
  'at-home-car-repair-ventura-county': {
    hero: '/img-bank/IMG-36.jpg',
    sections: ['/img-bank/IMG-7.jpg', '/img-bank/IMG-5.jpg', '/images/mechanic.jpg', '/img-bank/IMG-43.png']
  },

  'mobile-oil-change-ventura': {
    hero: '/img-bank/IMG-28.jpg',
    sections: ['/images/OilFilter2.jpg', '/images/Oil2.jpg', '/img-bank/IMG-34.jpg', '/img-bank/IMG-1.jpg']
  },
  'mobile-oil-change-camarillo': {
    hero: '/img-bank/IMG-34.jpg',
    sections: ['/images/OilFilter1.webp', '/images/Oil3.png', '/img-bank/IMG-28.jpg', '/img-bank/IMG-42.jpg']
  },
  'mobile-brake-repair-ventura': {
    hero: '/img-bank/IMG-4.jpg',
    sections: ['/images/Brake1.jpg', '/images/Brake2.jpeg', '/images/Suspension1.jpg']
  },
  'mobile-brake-repair-oxnard': {
    hero: '/img-bank/IMG-6.jpg',
    sections: ['/images/Brake2.jpeg', '/img-bank/IMG-3.jpg', '/img-bank/IMG-5.jpg']
  },
  'mobile-car-diagnostics-ventura': {
    hero: '/img-bank/IMG-39.jpg',
    sections: ['/img-bank/IMG-38.jpg', '/img-bank/IMG-35.jpg', '/img-bank/IMG-22.jpg']
  },
  'mobile-car-diagnostics-thousand-oaks': {
    hero: '/img-bank/IMG-2.jpg',
    sections: ['/img-bank/IMG-22.jpg', '/img-bank/IMG-35.jpg', '/img-bank/IMG-38.jpg']
  },
  'mobile-battery-replacement-ventura': {
    hero: '/images/Battery1.webp',
    sections: ['/images/Battery2.jpg', '/images/Alternator1.jpg', '/images/Alternator2.PNG']
  },
  'mobile-battery-replacement-simi-valley': {
    hero: '/images/Alternator1.jpg',
    sections: ['/images/Battery2.jpg', '/images/Battery1.webp', '/img-bank/IMG-22.jpg']
  },
  'mobile-ac-repair-ventura': {
    hero: '/img-bank/IMG-35.jpg',
    sections: ['/img-bank/IMG-34.jpg', '/img-bank/IMG-22.jpg', '/img-bank/IMG-1.jpg']
  },
  'mobile-pre-purchase-inspection-ventura': {
    hero: '/images/service-inspection.jpg',
    sections: ['/images/Suspension3.jpeg', '/img-bank/IMG-7.jpg', '/images/Suspension2.jpg']
  }
};

/** Fallback pools when a page has no explicit entry */
var FALLBACK = {
  hero: {
    hub: '/images/hero1.jpg',
    pricing: '/images/Oil3.png',
    guide: '/images/mechanic.jpg',
    location: '/img-bank/IMG-30.jpg',
    service: '/img-bank/IMG-7.jpg'
  },
  sections: {
    oil: ['/images/Oil1.jpg', '/images/Oil2.jpg', '/images/OilFilter2.jpg', '/img-bank/IMG-28.jpg'],
    brake: ['/images/Brake1.jpg', '/images/Brake2.jpeg', '/img-bank/IMG-4.jpg', '/images/Suspension1.jpg'],
    diagnostic: ['/img-bank/IMG-22.jpg', '/img-bank/IMG-38.jpg', '/img-bank/IMG-35.jpg'],
    battery: ['/images/Battery2.jpg', '/images/Alternator1.jpg', '/images/Battery1.webp', '/images/Alternator2.PNG'],
    inspection: ['/images/service-inspection.jpg', '/img-bank/IMG-7.jpg', '/images/Suspension3.jpeg'],
    location: ['/images/mechanic.jpg', '/img-bank/IMG-7.jpg', '/img-bank/IMG-22.jpg', '/img-bank/IMG-30.jpg'],
    general: ['/images/mechanic.jpg', '/img-bank/IMG-30.jpg', '/img-bank/IMG-22.jpg', '/images/hero1.jpg']
  }
};

function getPageConfig(page) {
  if (!page || !page.path) return null;
  return PAGE_IMAGES[page.path] || null;
}

function getTopicPool(page) {
  if (!page) return FALLBACK.sections.general;
  var path = page.path || '';
  if (path.indexOf('oil') !== -1 || path.indexOf('synthetic') !== -1) return FALLBACK.sections.oil;
  if (path.indexOf('brake') !== -1) return FALLBACK.sections.brake;
  if (path.indexOf('battery') !== -1 || path.indexOf('alternator') !== -1) return FALLBACK.sections.battery;
  if (path.indexOf('diagnostic') !== -1 || path.indexOf('check-engine') !== -1) return FALLBACK.sections.diagnostic;
  if (path.indexOf('inspection') !== -1 || path.indexOf('pre-purchase') !== -1) return FALLBACK.sections.inspection;
  if (page.category === 'location') return FALLBACK.sections.location;
  return FALLBACK.sections.general;
}

function getPageHeroImage(page) {
  if (!page) return FALLBACK.hero.guide;
  if (page.heroImage) return page.heroImage;
  var config = getPageConfig(page);
  if (config && config.hero) return config.hero;
  if (page.category === 'hub') return FALLBACK.hero.hub;
  if (page.category === 'pricing') return FALLBACK.hero.pricing;
  if (page.category === 'location') return FALLBACK.hero.location;
  if (page.category === 'service') return FALLBACK.hero.service;
  return FALLBACK.hero.guide;
}

function getSectionImage(page, index) {
  var config = getPageConfig(page);
  if (config && config.sections && config.sections.length) {
    return config.sections[index % config.sections.length];
  }
  var pool = getTopicPool(page);
  return pool[index % pool.length];
}

function getHubCardImage(page) {
  return getPageHeroImage(page);
}

module.exports = {
  PAGE_IMAGES: PAGE_IMAGES,
  getPageHeroImage: getPageHeroImage,
  getSectionImage: getSectionImage,
  getHubCardImage: getHubCardImage
};
