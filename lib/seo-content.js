/**
 * SEO content — single source of truth for landing pages, guides, and pricing.
 *
 * To add a page: push a new entry to the appropriate array below.
 * Each page is server-rendered with full meta tags, JSON-LD, and appointment CTAs.
 *
 * Fields:
 *   path        — URL slug (no leading slash). e.g. "learn/check-engine-light"
 *   category    — "location" | "service" | "guide" | "pricing"
 *   title       — <title> and og:title
 *   description — meta description (150–160 chars ideal)
 *   h1          — main heading
 *   serviceType — pre-fills appointment form: maintenance | diagnostics | inspection | other
 *   sections    — [{ heading, paragraphs: string[] }]
 *   faqs        — [{ q, a }] optional
 *   related     — array of path strings for internal links
 *   updatedAt   — ISO date string
 */

var SITE_URL = 'https://suppleautomotive.com';

var PHONE = '+1 (805) 443-4181';
var EMAIL = 'hlsbusiness@suppleautomotive.com';
var ADDRESS = '5395 Quailridge Dr., Camarillo, CA 93012';

var CITIES = {
  ventura: 'Ventura',
  oxnard: 'Oxnard',
  camarillo: 'Camarillo',
  'thousand-oaks': 'Thousand Oaks',
  'simi-valley': 'Simi Valley',
  moorpark: 'Moorpark',
  ojai: 'Ojai',
  'santa-paula': 'Santa Paula',
  'ventura-county': 'Ventura County'
};

var SERVICES = {
  maintenance: {
    label: 'Maintenance & Repairs',
    short: 'maintenance and repairs',
    examples: 'oil changes, brakes, batteries, and factory-scheduled service'
  },
  diagnostics: {
    label: 'Diagnostics',
    short: 'diagnostics',
    examples: 'check-engine lights, drivability issues, and electrical faults'
  },
  inspection: {
    label: 'Inspections',
    short: 'inspections',
    examples: 'pre-purchase inspections and safety checks'
  },
  brakes: {
    label: 'Brake Repair',
    short: 'brake repair',
    examples: 'pads, rotors, fluid, and full brake system inspections'
  },
  oil: {
    label: 'Oil Change',
    short: 'oil changes',
    examples: 'oil and filter service with the correct spec for your vehicle'
  },
  battery: {
    label: 'Battery Replacement',
    short: 'battery replacement',
    examples: 'battery testing, replacement, and charging-system checks'
  },
  ac: {
    label: 'A/C Repair',
    short: 'A/C repair',
    examples: 'A/C performance testing, refrigerant service, and component repair'
  }
};

function locationPage(slug, cityKey) {
  var city = CITIES[cityKey] || cityKey;
  return {
    path: slug,
    category: 'location',
    title: 'Mobile Mechanic in ' + city + ', CA | Supple Automotive',
    description:
      'Professional mobile auto repair in ' +
      city +
      ', CA. Diagnostics, maintenance, and inspections at your home, driveway, or workplace. Call ' +
      PHONE +
      '.',
    h1: 'Mobile Mechanic in ' + city + ', CA',
    serviceType: 'maintenance',
    sections: [
      {
        heading: 'Auto repair that comes to you in ' + city,
        paragraphs: [
          'Supple Automotive is a mobile mechanic serving ' +
            city +
            ' and surrounding neighborhoods. Instead of losing half a day at a shop, we bring professional tools, quality parts, and clear communication directly to your location — driveway, garage, parking lot, or workplace.',
          'Whether you need routine maintenance, a check-engine light diagnosed, or brakes that do not feel right, our technicians handle the job on-site with the same care you would expect from a trusted shop.'
        ]
      },
      {
        heading: 'Services we provide in ' + city,
        paragraphs: [
          'Our mobile service covers ' +
            SERVICES.maintenance.examples +
            ', ' +
            SERVICES.diagnostics.examples +
            ', and ' +
            SERVICES.inspection.examples +
            '. We work on most makes and models and explain findings before any repair begins.',
          'Common requests in ' +
            city +
            ' include oil changes, brake service, battery replacement, A/C repair, and pre-purchase inspections before you buy a used vehicle.'
        ]
      },
      {
        heading: 'Why drivers in ' + city + ' choose mobile service',
        paragraphs: [
          'Mobile repair saves time — no waiting room, no second trip to pick up your car. It is especially helpful for busy families, remote workers, and anyone whose vehicle is difficult to move.',
          'You get direct access to the technician working on your car. We document what we find, provide upfront pricing, and stand behind our work with a 12-month/12,000-mile warranty on repairs.'
        ]
      },
      {
        heading: 'Schedule mobile service in ' + city,
        paragraphs: [
          'Request an appointment online or call ' +
            PHONE +
            '. Tell us your address in ' +
            city +
            ', what your vehicle needs, and a preferred date. We confirm availability and follow up by email or text.',
          'Serving ' + city + ' and all of Ventura County. Same-day options may be available depending on schedule and parts.'
        ]
      }
    ],
    faqs: [
      {
        q: 'Do you come to my home in ' + city + '?',
        a: 'Yes. We service vehicles at homes, apartments, workplaces, and other approved locations throughout ' + city + '.'
      },
      {
        q: 'What does mobile mechanic service cost in ' + city + '?',
        a: 'Pricing depends on the job. We provide a clear estimate before work begins. See our mobile service pricing guide for typical ranges.'
      },
      {
        q: 'Can you diagnose a check engine light on-site?',
        a: 'Absolutely. We scan codes, perform hands-on testing, and explain the root cause and recommended fix before any repair.'
      }
    ],
    related: ['learn/mobile-mechanic-pricing', 'learn/check-engine-light-guide', 'mobile-car-diagnostics-ventura'],
    updatedAt: '2026-06-18'
  };
}

function serviceLocationPage(slug, serviceKey, cityKey) {
  var city = CITIES[cityKey] || cityKey;
  var svc = SERVICES[serviceKey] || SERVICES.maintenance;
  var serviceType = serviceKey === 'brakes' || serviceKey === 'oil' || serviceKey === 'battery' || serviceKey === 'ac'
    ? 'maintenance'
    : serviceKey === 'diagnostics'
      ? 'diagnostics'
      : 'inspection';

  return {
    path: slug,
    category: 'service',
    title: 'Mobile ' + svc.label + ' in ' + city + ', CA | Supple Automotive',
    description:
      'Mobile ' +
      svc.short +
      ' in ' +
      city +
      ', CA. Professional on-site service at your location. Request an appointment with Supple Automotive.',
    h1: 'Mobile ' + svc.label + ' in ' + city + ', CA',
    serviceType: serviceType,
    sections: [
      {
        heading: svc.label + ' at your location in ' + city,
        paragraphs: [
          'Need ' + svc.short + ' in ' + city + '? Supple Automotive brings the shop to you. Our mobile technicians arrive with professional equipment and quality parts to handle ' + svc.examples + ' on-site.',
          'You skip the tow truck and the waiting room. We inspect, explain, and repair at your driveway, garage, or workplace — with transparent pricing before work starts.'
        ]
      },
      {
        heading: 'What to expect',
        paragraphs: [
          'After you request service, we confirm your appointment and arrive at your ' + city + ' address with the tools and parts needed for most common jobs.',
          'We walk you through what we find, provide a written estimate for approval, and complete the repair with a warranty on parts and labor.'
        ]
      },
      {
        heading: 'Book ' + svc.short + ' in ' + city,
        paragraphs: [
          'Use the appointment button on this page or call ' + PHONE + ' to schedule. Include your vehicle year, make, model, and a brief description of what you need.',
          'We serve ' + city + ' and all of Ventura County. Same-day availability may be possible for urgent issues like brake noise or a dead battery.'
        ]
      }
    ],
    faqs: [
      {
        q: 'How long does ' + svc.short + ' take?',
        a: 'Most appointments take 1–3 hours depending on the vehicle and scope of work. We give you a time estimate when we confirm your booking.'
      },
      {
        q: 'Do you warranty ' + svc.short + '?',
        a: 'Yes. Repairs are covered by our 12-month/12,000-mile warranty unless otherwise noted on your invoice.'
      }
    ],
    related: ['mobile-mechanic-' + cityKey, 'learn/mobile-mechanic-pricing'],
    updatedAt: '2026-06-18'
  };
}

var LOCATION_PAGES = [
  locationPage('mobile-mechanic-ventura', 'ventura'),
  locationPage('mobile-mechanic-oxnard', 'oxnard'),
  locationPage('mobile-mechanic-camarillo', 'camarillo'),
  locationPage('mobile-mechanic-thousand-oaks', 'thousand-oaks'),
  locationPage('mobile-mechanic-simi-valley', 'simi-valley'),
  locationPage('mobile-mechanic-moorpark', 'moorpark'),
  locationPage('mobile-mechanic-ojai', 'ojai'),
  locationPage('mobile-mechanic-santa-paula', 'santa-paula'),
  locationPage('mobile-mechanic-ventura-county', 'ventura-county'),
  {
    path: 'at-home-car-repair-ventura-county',
    category: 'location',
    title: 'At-Home Car Repair in Ventura County, CA | Supple Automotive',
    description:
      'At-home car repair across Ventura County. Maintenance, diagnostics, and inspections at your driveway or workplace. Book Supple Automotive today.',
    h1: 'At-Home Car Repair in Ventura County, CA',
    serviceType: 'maintenance',
    sections: [
      {
        heading: 'Real repairs at home — not just a quick fix',
        paragraphs: [
          'At-home car repair means more than topping off fluids. Supple Automotive performs full diagnostics, brake jobs, battery replacements, A/C service, and pre-purchase inspections at your Ventura County address.',
          'Our mobile shop setup includes professional scan tools, lifts where appropriate, and quality parts — the same standards you would expect at a brick-and-mortar shop, without the hassle of getting there.'
        ]
      },
      {
        heading: 'Where we work in Ventura County',
        paragraphs: [
          'We service Ventura, Oxnard, Camarillo, Thousand Oaks, Simi Valley, Moorpark, Ojai, Santa Paula, and surrounding areas. Driveways, garages, apartment lots, and workplaces are all common service locations.',
          'Tell us your address and where the vehicle will be parked when you request service. We confirm access and any special requirements before arrival.'
        ]
      },
      {
        heading: 'Request at-home repair',
        paragraphs: [
          'Book online with the button on this page or call ' + PHONE + '. Describe the issue, your vehicle, and your preferred date. We follow up to confirm timing and pricing.',
          'Transparent estimates, clear communication, and a warranty on repairs — that is how we earn trust across Ventura County.'
        ]
      }
    ],
    faqs: [
      {
        q: 'Is at-home repair as reliable as a shop?',
        a: 'Yes. We use professional-grade tools and documented procedures. Many jobs are identical to what a shop would perform — we simply bring the capability to you.'
      },
      {
        q: 'What if you need a part we do not have on the van?',
        a: 'We source parts locally and schedule a return visit if needed. We always communicate options and costs before ordering.'
      }
    ],
    related: ['mobile-mechanic-ventura-county', 'learn/mobile-mechanic-pricing'],
    updatedAt: '2026-06-18'
  }
];

var SERVICE_PAGES = [
  serviceLocationPage('mobile-brake-repair-ventura', 'brakes', 'ventura'),
  serviceLocationPage('mobile-oil-change-ventura', 'oil', 'ventura'),
  serviceLocationPage('mobile-car-diagnostics-ventura', 'diagnostics', 'ventura'),
  serviceLocationPage('mobile-battery-replacement-ventura', 'battery', 'ventura'),
  serviceLocationPage('mobile-ac-repair-ventura', 'ac', 'ventura'),
  serviceLocationPage('mobile-pre-purchase-inspection-ventura', 'inspection', 'ventura'),
  serviceLocationPage('mobile-brake-repair-oxnard', 'brakes', 'oxnard'),
  serviceLocationPage('mobile-oil-change-camarillo', 'oil', 'camarillo'),
  serviceLocationPage('mobile-car-diagnostics-thousand-oaks', 'diagnostics', 'thousand-oaks'),
  serviceLocationPage('mobile-battery-replacement-simi-valley', 'battery', 'simi-valley')
];

var GUIDE_PAGES = [
  {
    path: 'learn/check-engine-light-guide',
    category: 'guide',
    title: 'Check Engine Light Guide — What It Means & What To Do | Supple Automotive',
    description:
      'Check engine light on? Learn common causes, when it is safe to drive, and how mobile diagnostics in Ventura County can pinpoint the problem fast.',
    h1: 'Check Engine Light: What It Means and What To Do Next',
    serviceType: 'diagnostics',
    sections: [
      {
        heading: 'Why the check engine light comes on',
        paragraphs: [
          'Your check engine light (malfunction indicator lamp) turns on when the engine control module detects a fault in emissions, fuel, ignition, or related systems. It can be something simple — a loose gas cap — or a sensor, misfire, or catalytic issue that needs attention soon.',
          'The light may be steady or flashing. A steady light usually means schedule diagnostics when convenient. A flashing light often indicates an active misfire that can damage the catalytic converter — reduce driving and get it checked promptly.'
        ]
      },
      {
        heading: 'Common causes we see in Ventura County',
        paragraphs: [
          'Frequent triggers include oxygen sensor faults, evaporative emissions leaks, catalytic converter efficiency codes, ignition coil or spark plug issues, and mass airflow sensor problems. Coastal humidity and stop-and-go driving can accelerate wear on some components.',
          'Reading the code is only the first step. A proper diagnosis includes live data, smoke testing for vacuum leaks, and hands-on inspection — not just replacing the part the code mentions.'
        ]
      },
      {
        heading: 'Mobile diagnostics — no shop visit required',
        paragraphs: [
          'Supple Automotive performs full engine diagnostics at your location in Ventura, Oxnard, Camarillo, and across the county. We scan codes, test components, and explain findings in plain language before recommending repairs.',
          'You get a clear estimate and the option to approve work on the spot when parts are available.'
        ]
      }
    ],
    faqs: [
      {
        q: 'Can I keep driving with the check engine light on?',
        a: 'If the light is steady and the car drives normally, short trips are usually fine — but schedule diagnostics soon. If the light flashes or the engine runs rough, limit driving and book service immediately.'
      },
      {
        q: 'Will clearing the code fix the problem?',
        a: 'No. Clearing codes without fixing the root cause only turns the light off temporarily. The fault will return and may worsen.'
      },
      {
        q: 'How much does a mobile diagnostic cost?',
        a: 'Diagnostic fees vary by complexity. We quote before starting and apply diagnostic fees toward approved repairs when applicable.'
      }
    ],
    related: ['mobile-car-diagnostics-ventura', 'learn/pre-purchase-inspection-guide', 'mobile-mechanic-ventura'],
    updatedAt: '2026-06-18'
  },
  {
    path: 'learn/pre-purchase-inspection-guide',
    category: 'guide',
    title: 'Pre-Purchase Car Inspection Guide | Supple Automotive',
    description:
      'Buying a used car in Ventura County? Learn what a pre-purchase inspection covers, why it matters, and how to book a mobile inspection before you buy.',
    h1: 'Pre-Purchase Inspection: Protect Yourself Before You Buy',
    serviceType: 'inspection',
    sections: [
      {
        heading: 'Why inspect before you buy',
        paragraphs: [
          'A pre-purchase inspection is the best insurance against an expensive mistake. Sellers — private or dealer — may not disclose every issue. A trained technician evaluates the vehicle’s real condition so you can negotiate fairly or walk away.',
          'Spending a few hundred dollars on inspection can save thousands in hidden repairs — transmission problems, frame rust, neglected maintenance, or accident damage.'
        ]
      },
      {
        heading: 'What our mobile inspection includes',
        paragraphs: [
          'We perform a structured inspection covering brakes, tires, fluids, leaks, suspension, steering, exhaust, battery and charging system, scan-tool diagnostics, and a road test when possible. You receive a written summary of findings and severity.',
          'We can meet you at the seller’s location anywhere in Ventura County — no need to coordinate shop drop-offs.'
        ]
      },
      {
        heading: 'How to schedule an inspection',
        paragraphs: [
          'Contact the seller and arrange a time when the vehicle is available. Book through our appointment form or call ' + PHONE + '. Provide the year, make, model, VIN if available, and meeting address.',
          'We recommend inspecting before money changes hands. If issues are found, use the report to renegotiate or request repairs before purchase.'
        ]
      }
    ],
    faqs: [
      {
        q: 'Can you inspect a car at a dealership lot?',
        a: 'Often yes, with the dealer’s permission. Coordinate with the sales contact and confirm we can access the vehicle and test drive if needed.'
      },
      {
        q: 'Do you provide a written report?',
        a: 'Yes. You receive documented findings you can reference during negotiation or for your records.'
      }
    ],
    related: ['mobile-pre-purchase-inspection-ventura', 'learn/check-engine-light-guide', 'mobile-mechanic-ventura-county'],
    updatedAt: '2026-06-18'
  },
  {
    path: 'learn/mobile-brake-repair-guide',
    category: 'guide',
    title: 'When to Replace Brake Pads & Rotors | Supple Automotive',
    description:
      'Squealing brakes? Soft pedal? Learn warning signs, typical service intervals, and how mobile brake repair works in Ventura County.',
    h1: 'Brake Repair: Signs You Need Service and What to Expect',
    serviceType: 'maintenance',
    sections: [
      {
        heading: 'Warning signs your brakes need attention',
        paragraphs: [
          'High-pitched squealing often means wear indicators contacting the rotor — pads are due for replacement. Grinding usually means metal-on-metal and urgent service. A soft or spongy pedal can indicate fluid issues or air in the lines.',
          'Vibration when braking commonly points to warped rotors. Pulling to one side may be a stuck caliper or uneven pad wear. Any of these symptoms warrant inspection before they become safety hazards.'
        ]
      },
      {
        heading: 'Mobile brake service at your location',
        paragraphs: [
          'Supple Automotive replaces pads and rotors, services calipers, and flushes brake fluid on-site in Ventura County. We measure pad thickness, inspect rotors, and recommend only what your vehicle actually needs.',
          'Brake work is safety-critical — we use quality parts and torque specifications to manufacturer standards.'
        ]
      },
      {
        heading: 'Typical cost factors',
        paragraphs: [
          'Price depends on vehicle make, pad and rotor grade, and whether calipers or fluid service are needed. We provide an estimate before any work begins.',
          'See our pricing guide for general ranges, then request a quote for your specific vehicle.'
        ]
      }
    ],
    faqs: [
      {
        q: 'How often should brake pads be replaced?',
        a: 'Most pads last 25,000–70,000 miles depending on driving habits and pad material. We measure thickness during service and recommend replacement at safe limits.'
      },
      {
        q: 'Can mobile mechanics resurface rotors?',
        a: 'We evaluate rotor condition on-site. If rotors are within spec they may be reused; otherwise we recommend replacement for safe, vibration-free braking.'
      }
    ],
    related: ['mobile-brake-repair-ventura', 'learn/mobile-mechanic-pricing', 'mobile-mechanic-oxnard'],
    updatedAt: '2026-06-18'
  }
];

var PRICING_PAGE = {
  path: 'learn/mobile-mechanic-pricing',
  category: 'pricing',
  title: 'Mobile Mechanic Pricing in Ventura County | Supple Automotive',
  description:
    'Transparent mobile auto repair pricing in Ventura County. Typical costs for oil changes, brakes, diagnostics, batteries, and inspections. Request a quote today.',
  h1: 'Mobile Mechanic Pricing — Ventura County',
  serviceType: 'maintenance',
  sections: [
    {
      heading: 'How we price mobile service',
      paragraphs: [
        'Every job starts with understanding your vehicle and the issue. We provide a clear estimate before work begins — no surprises. Mobile service includes a trip fee that covers travel and setup; labor and parts are quoted separately based on your specific repair.',
        'Diagnostic time is quoted upfront. When you approve a repair, diagnostic fees may apply toward the final bill depending on the job.'
      ]
    },
    {
      heading: 'Typical price ranges',
      paragraphs: [
        'These ranges are estimates for common services in Ventura County. Your vehicle, parts availability, and repair complexity may affect the final price.',
        'Oil change (conventional): $80–$120 · Oil change (synthetic): $100–$160 · Brake pads (per axle): $180–$350 · Brake pads + rotors (per axle): $350–$600 · Battery replacement: $200–$350 installed · Check engine diagnostic: $120–$180 · Pre-purchase inspection: $150–$250 · A/C recharge (if system is sound): $150–$250'
      ]
    },
    {
      heading: 'Get an exact quote for your vehicle',
      paragraphs: [
        'The fastest way to get accurate pricing is to request service with your year, make, model, and a description of the issue. We respond with an estimate or schedule an on-site inspection.',
        'Call ' + PHONE + ' or use the appointment button on this page. We serve Ventura, Oxnard, Camarillo, Thousand Oaks, Simi Valley, and all of Ventura County.'
      ]
    }
  ],
  faqs: [
    {
      q: 'Do you charge a trip fee?',
      a: 'Yes. Mobile service includes a trip fee that covers travel to your location. It is quoted as part of your estimate before we schedule.'
    },
    {
      q: 'Are parts included in the prices above?',
      a: 'Ranges shown generally include common parts and labor for typical vehicles. Luxury, diesel, and heavy-duty vehicles may differ — we always confirm before starting.'
    },
    {
      q: 'Do you offer payment plans?',
      a: 'Payment is due upon completion of work. Contact us to discuss options for larger repairs.'
    }
  ],
  related: ['mobile-mechanic-ventura', 'learn/check-engine-light-guide', 'learn/mobile-brake-repair-guide'],
  updatedAt: '2026-06-18'
};

var HUB_PAGE = {
  path: 'learn',
  category: 'hub',
  title: 'Auto Repair Guides & Resources | Supple Automotive',
  description:
    'Free guides on check engine lights, brake repair, pre-purchase inspections, and mobile mechanic pricing in Ventura County. Expert advice from Supple Automotive.',
  h1: 'Guides & Resources',
  serviceType: 'maintenance',
  sections: [
    {
      heading: 'Expert advice for Ventura County drivers',
      paragraphs: [
        'Practical guides written by the Supple Automotive team — covering common problems, what to expect from mobile repair, and how to make smart decisions about your vehicle.',
        'Browse below or schedule service directly if you already know what you need.'
      ]
    }
  ],
  faqs: [],
  related: [],
  updatedAt: '2026-06-18'
};

var ALL_PAGES = LOCATION_PAGES.concat(SERVICE_PAGES, GUIDE_PAGES, [PRICING_PAGE, HUB_PAGE]);

var PAGE_BY_PATH = {};
ALL_PAGES.forEach(function (page) {
  PAGE_BY_PATH[page.path] = page;
});

function getAllPages() {
  return ALL_PAGES.slice();
}

function getPageByPath(path) {
  if (!path || typeof path !== 'string') return null;
  var normalized = path.replace(/^\/+|\/+$/g, '');
  return PAGE_BY_PATH[normalized] || null;
}

function getLandingPaths() {
  return ALL_PAGES.filter(function (p) {
    return p.category !== 'hub';
  }).map(function (p) {
    return p.path;
  });
}

function getSitemapUrls() {
  var urls = [{ loc: SITE_URL + '/', changefreq: 'weekly', priority: '1.0' }];
  urls.push({ loc: SITE_URL + '/request-service.html', changefreq: 'monthly', priority: '0.8' });
  ALL_PAGES.forEach(function (page) {
    urls.push({
      loc: SITE_URL + '/' + page.path,
      changefreq: page.category === 'guide' ? 'monthly' : 'weekly',
      priority: page.category === 'hub' ? '0.9' : page.category === 'location' ? '0.85' : '0.75',
      lastmod: page.updatedAt
    });
  });
  return urls;
}

module.exports = {
  SITE_URL: SITE_URL,
  PHONE: PHONE,
  EMAIL: EMAIL,
  ADDRESS: ADDRESS,
  getAllPages: getAllPages,
  getPageByPath: getPageByPath,
  getLandingPaths: getLandingPaths,
  getSitemapUrls: getSitemapUrls,
  HUB_PAGE: HUB_PAGE,
  GUIDE_PAGES: GUIDE_PAGES,
  PRICING_PAGE: PRICING_PAGE
};
