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

/** Flat mobile oil change price — update here only */
var OIL_CHANGE_FLAT = 85;

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

  var sections = [
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
  ];

  if (serviceKey === 'oil') {
    sections[0].paragraphs[1] =
      'Supple Automotive offers a flat $' +
      OIL_CHANGE_FLAT +
      ' mobile oil change in ' +
      city +
      ' — quality oil and filter, correct spec for your vehicle, done at your driveway or workplace. No shop waiting room required.';
  }

  var related = ['mobile-mechanic-' + cityKey, 'learn/mobile-mechanic-pricing'];
  if (serviceKey === 'oil') {
    related = related.concat(['learn/synthetic-vs-conventional-oil', 'learn/oil-filter-types-guide']);
  }
  if (serviceKey === 'brakes') {
    related = related.concat(['learn/brake-diagnosis-guide', 'learn/mobile-brake-repair-guide']);
  }
  if (serviceKey === 'battery') {
    related = related.concat(['learn/battery-vs-alternator-guide']);
  }

  return {
    path: slug,
    category: 'service',
    title: 'Mobile ' + svc.label + ' in ' + city + ', CA | Supple Automotive',
    description:
      serviceKey === 'oil'
        ? 'Mobile oil change in ' +
          city +
          ', CA — flat $' +
          OIL_CHANGE_FLAT +
          ' at your location. Quality oil and filter service from Supple Automotive.'
        : 'Mobile ' +
          svc.short +
          ' in ' +
          city +
          ', CA. Professional on-site service at your location. Request an appointment with Supple Automotive.',
    h1: 'Mobile ' + svc.label + ' in ' + city + ', CA',
    serviceType: serviceType,
    sections: sections,
    faqs:
      serviceKey === 'oil'
        ? [
            {
              q: 'How much is a mobile oil change in ' + city + '?',
              a:
                'We charge a flat $' +
                OIL_CHANGE_FLAT +
                ' for a standard mobile oil change in ' +
                city +
                ', including quality oil and filter matched to your vehicle. We confirm the price before your appointment.'
            },
            {
              q: 'Do you use synthetic or conventional oil?',
              a: 'We use the oil grade and type specified for your vehicle — conventional, synthetic blend, or full synthetic. See our synthetic vs conventional guide for details.'
            },
            {
              q: 'How long does a mobile oil change take?',
              a: 'Most oil changes take 30–45 minutes on-site once we arrive at your ' + city + ' location.'
            }
          ]
        : [
            {
              q: 'How long does ' + svc.short + ' take?',
              a: 'Most appointments take 1–3 hours depending on the vehicle and scope of work. We give you a time estimate when we confirm your booking.'
            },
            {
              q: 'Do you warranty ' + svc.short + '?',
              a: 'Yes. Repairs are covered by our 12-month/12,000-mile warranty unless otherwise noted on your invoice.'
            }
          ],
    related: related,
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
    related: ['mobile-brake-repair-ventura', 'learn/brake-diagnosis-guide', 'learn/mobile-mechanic-pricing', 'mobile-mechanic-oxnard'],
    updatedAt: '2026-06-18'
  },
  {
    path: 'learn/synthetic-vs-conventional-oil',
    category: 'guide',
    title: 'Synthetic vs Conventional Oil — Which Does Your Car Need? | Supple Automotive',
    description:
      'Synthetic or conventional oil? Learn the differences, what your manufacturer recommends, and mobile oil changes in Ventura County from $' +
      OIL_CHANGE_FLAT +
      ' flat.',
    h1: 'Synthetic vs Conventional Oil: What You Need to Know',
    serviceType: 'maintenance',
    sections: [
      {
        heading: 'The basics: conventional vs synthetic',
        paragraphs: [
          'Conventional oil is refined from crude petroleum and works well in many older or lower-stress engines. Full synthetic oil is engineered for consistent viscosity, better high-temperature stability, and longer drain intervals. Synthetic blends split the difference — part synthetic, part conventional.',
          'Your owner’s manual is the authority. Using the wrong grade (5W-20 vs 5W-30, for example) matters more than the marketing name on the bottle. We always match oil to your vehicle’s spec.'
        ]
      },
      {
        heading: 'When synthetic is worth it',
        paragraphs: [
          'Turbocharged engines, heavy towing, frequent short trips, and extreme heat or cold all stress engine oil. Synthetic handles those conditions better and resists breakdown longer. Many modern vehicles require synthetic oil — using conventional can void warranty coverage or accelerate wear.',
          'If you drive mostly highway miles in mild weather and your manual allows conventional, either can work when changed on schedule. When in doubt, synthetic is the safer choice for engine protection.'
        ]
      },
      {
        heading: 'Oil change intervals',
        paragraphs: [
          'Old rules of thumb (“every 3,000 miles”) rarely apply today. Many synthetics go 7,500–10,000 miles; some vehicles with oil-life monitors stretch further. Conventional oil typically needs changes sooner — often 5,000–7,500 miles depending on driving conditions.',
          'We reset your oil-life monitor when applicable and note the recommended next service on your invoice so you are not guessing.'
        ]
      },
      {
        heading: 'Mobile oil changes in Ventura County',
        paragraphs: [
          'Supple Automotive performs oil and filter service at your home, job, or driveway across Ventura County. Our flat $' +
          OIL_CHANGE_FLAT +
          ' mobile oil change includes quality oil and filter matched to your vehicle’s requirements — conventional, blend, or synthetic as specified.',
          'Schedule online or call ' +
          PHONE +
          '. We confirm oil type and price before we arrive so there are no surprises.'
        ]
      }
    ],
    faqs: [
      {
        q: 'Can I switch from conventional to synthetic?',
        a: 'Usually yes, if your vehicle allows it. Switching to synthetic in a high-mileage engine with leaks may expose existing wear — we inspect first and recommend what makes sense for your car.'
      },
      {
        q: 'Does synthetic oil cause leaks?',
        a: 'No — that is a myth. Synthetic does not create leaks. It may flow through worn seals slightly faster than conventional, which is why we inspect older engines before recommending a switch.'
      },
      {
        q: 'What is included in your $' + OIL_CHANGE_FLAT + ' oil change?',
        a: 'A standard mobile oil change with quality oil and filter for your vehicle spec, performed at your location. Unusual oil capacity or specialty filters are confirmed upfront.'
      }
    ],
    related: ['learn/oil-filter-types-guide', 'mobile-oil-change-ventura', 'learn/mobile-mechanic-pricing'],
    updatedAt: '2026-06-18'
  },
  {
    path: 'learn/oil-filter-types-guide',
    category: 'guide',
    title: 'Oil Filter Types Explained — Which Filter Your Car Needs | Supple Automotive',
    description:
      'Paper, synthetic media, cartridge, spin-on — learn oil filter types, what fits your vehicle, and how we match filters during mobile oil service in Ventura County.',
    h1: 'Oil Filter Types: A Practical Guide',
    serviceType: 'maintenance',
    sections: [
      {
        heading: 'Why the oil filter matters',
        paragraphs: [
          'Your oil filter traps metal particles, soot, and debris before they circulate through the engine. A restricted or poor-quality filter can reduce oil flow and cause pressure warnings — or let contaminants through and accelerate wear.',
          'The right filter is not “the biggest one that fits.” It must match your engine’s flow rate, bypass valve spec, and thread or cartridge design.'
        ]
      },
      {
        heading: 'Spin-on vs cartridge (element) filters',
        paragraphs: [
          'Spin-on filters are self-contained metal canisters you unscrew and replace — common on many American and Asian vehicles. Cartridge (element) filters use a replaceable paper element inside a permanent housing; common on many European makes. Cartridge changes can take a bit more labor but often produce less waste.',
          'We carry the correct style for your vehicle and torque the housing or spin-on filter to specification — overtightening spin-on filters is a common DIY mistake that makes the next change difficult.'
        ]
      },
      {
        heading: 'Filter media: cellulose, blend, and synthetic',
        paragraphs: [
          'Cellulose (paper) media is economical and fine for normal intervals on many vehicles. Synthetic or synthetic-blend media captures smaller particles and holds more dirt before restricting flow — a good match for longer oil change intervals or synthetic oil.',
          'Premium filters often have stronger canisters and anti-drainback valves that protect during cold starts. For turbocharged engines, a quality filter and correct oil pressure are especially important.'
        ]
      },
      {
        heading: 'What we use on mobile oil changes',
        paragraphs: [
          'Every Supple Automotive oil change includes a quality filter matched to your vehicle — not a one-size-fits-all part. Our flat $' +
          OIL_CHANGE_FLAT +
          ' mobile oil change covers standard oil and filter service at your Ventura County location.',
          'If your vehicle uses a specialty cartridge, oversized capacity, or performance filter, we confirm parts and pricing before your appointment.'
        ]
      }
    ],
    faqs: [
      {
        q: 'How often should the oil filter be replaced?',
        a: 'Every oil change — always. Replacing oil without a new filter leaves contaminants in the system and defeats part of the service.'
      },
      {
        q: 'Are cheap oil filters okay?',
        a: 'We avoid filters that do not meet OE specifications. Poor bypass valves or thin media can cause pressure problems or pass debris under load.'
      },
      {
        q: 'Do you stock filters for European vehicles?',
        a: 'Yes for most common makes. We verify fitment by year, make, and model when you book so the right filter is on the van when we arrive.'
      }
    ],
    related: ['learn/synthetic-vs-conventional-oil', 'mobile-oil-change-ventura', 'mobile-oil-change-camarillo'],
    updatedAt: '2026-06-18'
  },
  {
    path: 'learn/battery-vs-alternator-guide',
    category: 'guide',
    title: 'Bad Battery or Alternator? How to Tell the Difference | Supple Automotive',
    description:
      'Car won’t start or dims at idle? Learn how to tell a bad battery from a failing alternator — and how mobile diagnostics in Ventura County pinpoints the problem.',
    h1: 'Battery vs Alternator: How to Diagnose Starting & Charging Problems',
    serviceType: 'diagnostics',
    sections: [
      {
        heading: 'Battery and alternator — different jobs',
        paragraphs: [
          'The battery stores energy to crank the engine and power accessories when the engine is off. The alternator recharges the battery and powers electrical systems while the engine runs. A no-start or dim-light complaint can come from either — or from a parasitic drain, bad cable, or loose connection.',
          'Replacing the wrong part wastes money. A quick parts-store swap often treats the symptom, not the cause.'
        ]
      },
      {
        heading: 'Signs pointing to a bad battery',
        paragraphs: [
          'Slow cranking — especially in the morning or after the car sits — often means a weak battery. Corrosion on terminals, a swollen case, or a battery more than 4–5 years old are red flags. If a jump-start works and the car starts fine afterward until it sits again, the battery is the prime suspect.',
          'We test battery state of charge and cold-cranking amps with a conductance tester — faster and more accurate than guessing from age alone.'
        ]
      },
      {
        heading: 'Signs pointing to a bad alternator',
        paragraphs: [
          'If the battery warning light is on while driving, headlights dim at idle but brighten when you rev the engine, or you smell hot wires or rubber, suspect the charging system. A car that dies while running — not just fails to start — often means the alternator is not maintaining voltage.',
          'We measure charging voltage under load at your location. Output should typically be in the 13.5–14.5 volt range at idle with accessories on. Low output with a good battery confirms alternator or wiring faults.'
        ]
      },
      {
        heading: 'Mobile testing in Ventura County',
        paragraphs: [
          'Supple Automotive performs battery and charging-system diagnostics on-site — no tow to a shop required. We test the battery, alternator output, starter draw, and key grounds before recommending replacement.',
          'If you need a new battery, we install quality units and register BMS-equipped vehicles where required. Call ' + PHONE + ' or book online.'
        ]
      }
    ],
    faqs: [
      {
        q: 'Can a bad alternator kill a good battery?',
        a: 'Yes. An undercharging alternator leaves the battery chronically low; overcharging can boil the battery dry. Both shorten battery life.'
      },
      {
        q: 'My car started with a jump — battery or alternator?',
        a: 'If it runs after the jump but will not restart after sitting, lean toward battery. If it dies while driving, lean toward alternator or charging circuit.'
      },
      {
        q: 'Do you replace alternators mobile?',
        a: 'Many alternator jobs can be done on-site depending on access and vehicle. We quote after diagnosis — some tight engine bays may need shop equipment.'
      }
    ],
    related: ['mobile-battery-replacement-ventura', 'mobile-car-diagnostics-ventura', 'learn/check-engine-light-guide'],
    updatedAt: '2026-06-18'
  },
  {
    path: 'learn/brake-diagnosis-guide',
    category: 'guide',
    title: 'How to Diagnose Brake Problems — Noises, Pedal Feel & More | Supple Automotive',
    description:
      'Squealing, grinding, soft pedal, or pulling? Learn how to diagnose brake problems before they become safety issues. Mobile brake inspection in Ventura County.',
    h1: 'Diagnosing Brake Problems: Symptoms and What They Mean',
    serviceType: 'maintenance',
    sections: [
      {
        heading: 'Start with how the pedal feels',
        paragraphs: [
          'A firm, consistent pedal that stops the car smoothly is the baseline. A soft or spongy pedal that sinks toward the floor can mean air in the lines, a fluid leak, or internal master-cylinder wear. A pedal that pulses or vibrates under light braking often points to warped rotors.',
          'If the pedal feels normal but the car pulls left or right when braking, suspect a stuck caliper, contaminated pad, or uneven tire pressure — not always the pads themselves.'
        ]
      },
      {
        heading: 'Listen to the noises',
        paragraphs: [
          'High-pitched squeal at low speed usually means pad wear indicators touching the rotor — scheduled maintenance, not an emergency yet. A grinding metal-on-metal sound means pads are gone and the rotor is being damaged — schedule service immediately.',
          'Clunking over bumps can be loose caliper hardware or worn suspension components that only show up under braking load. Rhythmic rubbing that speeds up with the wheel is often a stuck caliper or misaligned pad.'
        ]
      },
      {
        heading: 'Visual and measured inspection',
        paragraphs: [
          'Proper brake diagnosis measures pad thickness, rotor runout and thickness, caliper slide function, fluid condition, and hose condition. We look for leaks at calipers, lines, and the master cylinder. Fluid that is dark or contaminated may need a flush — not just pads.',
          'Rotors can look fine and still be below minimum thickness or warped beyond spec. Measuring beats guessing from a glance.'
        ]
      },
      {
        heading: 'Mobile brake diagnosis in Ventura County',
        paragraphs: [
          'Supple Automotive inspects brakes at your location across Ventura, Oxnard, Camarillo, and the county. We explain what is safe to drive on, what needs immediate attention, and provide a written estimate before any repair.',
          'Brakes are safety-critical — we never upsell parts you do not need, and we never skip steps that affect stopping distance.'
        ]
      }
    ],
    faqs: [
      {
        q: 'Is it safe to drive with squealing brakes?',
        a: 'Light squeal from wear indicators usually means schedule service soon. Grinding, soft pedal, or brake warning lights mean limit driving and book inspection immediately.'
      },
      {
        q: 'Why do my brakes vibrate only sometimes?',
        a: 'Heat-related rotor warping, uneven pad transfer, or loose hardware can cause intermittent vibration. We measure rotor thickness and runout to confirm.'
      },
      {
        q: 'Do you charge for a brake inspection?',
        a: 'Brake inspection is typically part of a service visit or diagnostic appointment. We quote before starting any paid diagnostic work.'
      }
    ],
    related: ['learn/mobile-brake-repair-guide', 'mobile-brake-repair-ventura', 'mobile-brake-repair-oxnard'],
    updatedAt: '2026-06-18'
  }
];

var PRICING_PAGE = {
  path: 'learn/mobile-mechanic-pricing',
  category: 'pricing',
  title: 'Mobile Mechanic Pricing in Ventura County | Supple Automotive',
  description:
    'Transparent mobile auto repair pricing in Ventura County. Flat $' +
    OIL_CHANGE_FLAT +
    ' oil changes, plus brakes, diagnostics, batteries, and inspections. Request a quote today.',
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
      heading: 'Flat-rate oil changes',
      paragraphs: [
        'Supple Automotive offers a flat $' +
        OIL_CHANGE_FLAT +
        ' mobile oil change anywhere in Ventura County. That includes quality oil and filter matched to your vehicle’s spec — conventional, blend, or synthetic as required — performed at your driveway, garage, or workplace.',
        'No waiting room, no hidden shop fees. We confirm your vehicle details and oil type when you book. See our guides on synthetic vs conventional oil and oil filter types for more detail.'
      ]
    },
    {
      heading: 'Other common services',
      paragraphs: [
        'These ranges are estimates beyond oil changes. Your vehicle, parts availability, and repair complexity may affect the final price.',
        'Brake pads (per axle): $180–$350 · Brake pads + rotors (per axle): $350–$600 · Battery replacement: $200–$350 installed · Check engine diagnostic: $120–$180 · Pre-purchase inspection: $150–$250 · A/C recharge (if system is sound): $150–$250'
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
      q: 'Is the $' + OIL_CHANGE_FLAT + ' oil change really flat?',
      a: 'Yes for standard vehicles and typical oil capacity. Specialty filters, extra quarts for large engines, or performance applications are confirmed before your appointment.'
    },
    {
      q: 'Do you charge a trip fee?',
      a: 'Yes. Mobile service includes a trip fee that covers travel to your location. It is quoted as part of your estimate before we schedule.'
    },
    {
      q: 'Are parts included in the prices above?',
      a: 'Ranges shown generally include common parts and labor for typical vehicles. Luxury, diesel, and heavy-duty vehicles may differ — we always confirm before starting.'
    }
  ],
  related: [
    'learn/synthetic-vs-conventional-oil',
    'mobile-oil-change-ventura',
    'learn/brake-diagnosis-guide',
    'learn/battery-vs-alternator-guide'
  ],
  updatedAt: '2026-06-18'
};

var HUB_PAGE = {
  path: 'learn',
  category: 'hub',
  title: 'Auto Repair Guides & Resources | Supple Automotive',
  description:
    'Free guides on oil types, brake diagnosis, battery vs alternator, check engine lights, and mobile mechanic pricing in Ventura County. Expert advice from Supple Automotive.',
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
  PRICING_PAGE: PRICING_PAGE,
  OIL_CHANGE_FLAT: OIL_CHANGE_FLAT
};
