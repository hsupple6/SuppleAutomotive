/**
 * Supple Automotive — site configuration
 * Single source of truth for business info. Reference this file across the website.
 */
window.SUPPLE_CONFIG = {
  businessName: "Supple Automotive",
  phone: "+1 (805) 443-4181",
  email: "hlsbusiness@suppleautomotive.com",           // e.g. "info@suppleautomotive.com"
  address: "5395 Quailridge Dr., Camarillo, CA 93012",         // e.g. "123 Main St, City, CA 93001"
  addressLine2: "",    // optional suite/unit
  tagline: "Professional Mobile Auto Repair You Can Trust.",
  services: [
    { id: "maintenance", title: "Maintenance & Repairs", description: "Oil changes, brakes, tires, and factory-recommended service." },
    { id: "diagnostics", title: "Diagnostics", description: "Check engine light, electrical, and computer diagnostics." },
    { id: "inspection", title: "Inspections", description: "Pre-purchase and state safety/emissions inspections." },
  ],
  hours: [{ days: "All Days", time: "All Hours" }],           // e.g. [{ days: "Mon–Fri", time: "8am–6pm" }]
  /** Full URLs for footer icons above “Soft and Supple” (homepage). Email icon uses `email` as mailto. Image files live in project `img/` (served as `/img/…`). */
  social: {
    facebook: "https://www.facebook.com/profile.php?id=61577543962820",
    instagram: "https://www.instagram.com/suppleautomotive/",
  },
};
