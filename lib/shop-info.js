/**
 * Shop identity for BAR-compliant repair documents (estimate, invoice, work order).
 * Override via .env — values should match BAR registration records.
 */
function getShopInfo() {
  return {
    name: String(process.env.SHOP_NAME || process.env.BUSINESS_NAME || 'Supple Automotive').trim(),
    barRegistrationNo: String(process.env.BAR_REGISTRATION_NUMBER || '').trim(),
    epaIdentificationNo: String(process.env.EPA_IDENTIFICATION_NUMBER || '').trim(),
    address: String(process.env.SHOP_ADDRESS || '5395 Quailridge Dr., Camarillo, CA 93012').trim(),
    phone: String(process.env.SHOP_PHONE || '(805) 443-4181').trim(),
    email: String(process.env.SHOP_EMAIL || 'hlsbusiness@suppleautomotive.com').trim(),
    paymentText: String(
      process.env.ESTIMATE_PAYMENT_TEXT ||
        'Make all checks payable to Supple Automotive. Payment is expected upon completion of all work.'
    ).trim(),
    warrantyText: String(
      process.env.ESTIMATE_WARRANTY_TEXT ||
        'All repairs are covered by our 12-month/12,000-mile warranty unless otherwise stated on this document.'
    ).trim()
  };
}

module.exports = { getShopInfo };
