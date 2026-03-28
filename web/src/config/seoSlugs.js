/**
 * SEO landing slugs → page title, hero H1, and short description.
 * Add new keys here to support more routes (keep in sync with server SEO paths if used).
 */
export const DEFAULT_PAGE_TITLE = 'Supple Automotive — Mobile Auto Repair & Service';

/** @type {Record<string, { title: string; h1: string; description: string }>} */
export const SEO_SLUG_MAP = {
  'mobile-mechanic-ventura': {
    title: 'Mobile Mechanic in Ventura, CA | Supple Automotive',
    h1: 'Mobile Mechanic in Ventura, CA',
    description:
      'Professional diagnostics, maintenance, and repairs at your location in Ventura. Same-day options when available.'
  },
  'mobile-mechanic-oxnard': {
    title: 'Mobile Mechanic in Oxnard, CA | Supple Automotive',
    h1: 'Mobile Mechanic in Oxnard, CA',
    description:
      'Trusted mobile auto service throughout Oxnard. We bring the shop to your driveway, garage, or lot.'
  },
  'mobile-mechanic-camarillo': {
    title: 'Mobile Mechanic in Camarillo, CA | Supple Automotive',
    h1: 'Mobile Mechanic in Camarillo, CA',
    description:
      'Full-service mobile repair and inspections for Camarillo drivers—transparent pricing and clear communication.'
  },
  'mobile-mechanic-thousand-oaks': {
    title: 'Mobile Mechanic in Thousand Oaks, CA | Supple Automotive',
    h1: 'Mobile Mechanic in Thousand Oaks, CA',
    description:
      'Convenient mobile automotive care in Thousand Oaks. Schedule service that fits your day, not the other way around.'
  },
  'mobile-mechanic-simi-valley': {
    title: 'Mobile Mechanic in Simi Valley, CA | Supple Automotive',
    h1: 'Mobile Mechanic in Simi Valley, CA',
    description:
      'Experienced mobile technicians serving Simi Valley with quality parts and workmanship at your location.'
  },
  'mobile-mechanic-moorpark': {
    title: 'Mobile Mechanic in Moorpark, CA | Supple Automotive',
    h1: 'Mobile Mechanic in Moorpark, CA',
    description:
      'Reliable mobile auto repair for Moorpark residents and businesses—fleet options available.'
  },
  'mobile-mechanic-ojai': {
    title: 'Mobile Mechanic in Ojai, CA | Supple Automotive',
    h1: 'Mobile Mechanic in Ojai, CA',
    description:
      'Personalized mobile service in Ojai and surrounding areas. We handle maintenance through complex diagnostics.'
  },
  'mobile-mechanic-santa-paula': {
    title: 'Mobile Mechanic in Santa Paula, CA | Supple Automotive',
    h1: 'Mobile Mechanic in Santa Paula, CA',
    description:
      'Fast, professional mobile automotive service in Santa Paula—brakes, batteries, A/C, and more.'
  },
  'mobile-brake-repair-ventura': {
    title: 'Mobile Brake Repair in Ventura, CA | Supple Automotive',
    h1: 'Mobile Brake Repair in Ventura, CA',
    description:
      'Pads, rotors, fluid, and full brake inspections at your location in Ventura. Safety-first workmanship.'
  },
  'mobile-oil-change-ventura': {
    title: 'Mobile Oil Change in Ventura, CA | Supple Automotive',
    h1: 'Mobile Oil Change in Ventura, CA',
    description:
      'Convenient oil and filter service at home or work in Ventura—quality fluids matched to your vehicle.'
  },
  'mobile-car-diagnostics-ventura': {
    title: 'Mobile Car Diagnostics in Ventura, CA | Supple Automotive',
    h1: 'Mobile Car Diagnostics in Ventura, CA',
    description:
      'Check-engine light, drivability, and electrical diagnostics brought to you in Ventura with clear explanations.'
  },
  'mobile-battery-replacement-ventura': {
    title: 'Mobile Battery Replacement in Ventura, CA | Supple Automotive',
    h1: 'Mobile Battery Replacement in Ventura, CA',
    description:
      'Test, replace, and register batteries on-site in Ventura—get back on the road without a tow.'
  },
  'mobile-ac-repair-ventura': {
    title: 'Mobile A/C Repair in Ventura, CA | Supple Automotive',
    h1: 'Mobile A/C Repair in Ventura, CA',
    description:
      'A/C performance checks and repairs at your location in Ventura—stay comfortable year-round.'
  },
  'mobile-pre-purchase-inspection-ventura': {
    title: 'Mobile Pre-Purchase Inspection in Ventura, CA | Supple Automotive',
    h1: 'Mobile Pre-Purchase Inspection in Ventura, CA',
    description:
      'Thorough used-car inspections before you buy—mobile service across Ventura with detailed findings.'
  },
  'mobile-brake-repair-oxnard': {
    title: 'Mobile Brake Repair in Oxnard, CA | Supple Automotive',
    h1: 'Mobile Brake Repair in Oxnard, CA',
    description:
      'Complete brake service at your Oxnard location—noise, vibration, and stopping issues addressed properly.'
  },
  'mobile-oil-change-camarillo': {
    title: 'Mobile Oil Change in Camarillo, CA | Supple Automotive',
    h1: 'Mobile Oil Change in Camarillo, CA',
    description:
      'Scheduled maintenance and oil changes where you are in Camarillo—protect your engine with the right spec.'
  },
  'mobile-car-diagnostics-thousand-oaks': {
    title: 'Mobile Car Diagnostics in Thousand Oaks, CA | Supple Automotive',
    h1: 'Mobile Car Diagnostics in Thousand Oaks, CA',
    description:
      'Advanced scanning and hands-on testing in Thousand Oaks—clear next steps, no dealership runaround.'
  },
  'mobile-battery-replacement-simi-valley': {
    title: 'Mobile Battery Replacement in Simi Valley, CA | Supple Automotive',
    h1: 'Mobile Battery Replacement in Simi Valley, CA',
    description:
      'On-site battery testing and replacement in Simi Valley—starting and charging systems checked end-to-end.'
  },
  'mobile-mechanic-ventura-county': {
    title: 'Mobile Mechanic in Ventura County, CA | Supple Automotive',
    h1: 'Mobile Mechanic in Ventura County, CA',
    description:
      'Countywide mobile automotive service—one team, consistent quality, wherever you need us in Ventura County.'
  },
  'at-home-car-repair-ventura-county': {
    title: 'At-Home Car Repair in Ventura County, CA | Supple Automotive',
    h1: 'At-Home Car Repair in Ventura County, CA',
    description:
      'Real repairs at your home or workplace across Ventura County—maintenance through major services.'
  }
};

/**
 * @param {string | undefined} slug
 * @returns {{ title: string; h1: string; description: string } | null}
 */
export function getSeoForSlug(slug) {
  if (!slug || typeof slug !== 'string') return null;
  return SEO_SLUG_MAP[slug] ?? null;
}
