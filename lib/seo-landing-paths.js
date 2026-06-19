/**
 * SEO landing path slugs — derived from lib/seo-content.js (single source of truth).
 * Kept for backward compatibility with any code that imports this file.
 */
var seoContent = require('./seo-content');

module.exports = seoContent.getLandingPaths();
