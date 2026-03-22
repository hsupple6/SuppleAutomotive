/**
 * Filler customer / vehicle / fields for DEV_PDF_SAMPLES PDF previews (xx/xxxxxx style).
 */

var D = 'xx/xxxxxx';

/** 12×8 PNG (minimal valid) for drawn-signature demos */
var FILLER_DRAWN_SIG_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAICAYAAADN5B7xAAAALElEQVQYV2NkGGDAiSGeAREwgY1kYGBg+A8EwShGQwMDAwPDf1TBYCQYhQEA4O0F3fk6sZcAAAAASUVORK5CYII=';

function fillerCustomer() {
  return {
    name: 'xx xxxxxxx',
    email: 'xx@xxxxxx.dev',
    phone: '8055550123',
    address_line1: 'xxxx Filler Ave',
    address_line2: 'Unit xx/xxxxxx',
    city: 'Camarillo',
    state: 'CA',
    postal_code: 'xxxxx'
  };
}

function fillerVehicle() {
  return {
    year: 2024,
    make: 'xxxxx',
    model: 'xxxxxx',
    vin: 'XXXXXXXXXXXXXXX',
    mileage: 'xxxxx'
  };
}

function fillerAgreementFields() {
  return {
    requested_service: 'Filler complaint / requested service — ' + D,
    drive_out_cost: '$xx/xxxxxx',
    service_address: 'xxxx Service Rd, xx/xxxxxx, XX xxxxx',
    labor_rate: 'xx',
    diagnostic_fee: 'xx',
    late_interest_percent: 'x.x',
    addendum: 'Optional addendum — ' + D
  };
}

function fillerEstimateFields() {
  return {
    labor_rate: '70',
    parts_tax_percent: '7.25',
    services: [{ name: 'Filler labor line — ' + D, labor_hours: '1.5' }],
    parts: [{ name: 'Filler part — ' + D, cost: '99.00', labor_hours: '0.5' }],
    notes: 'Estimate notes — ' + D
  };
}

function fillerInvoiceBundle() {
  return {
    invoiceNumber: 'xx/xxxxxx',
    customer: fillerCustomer(),
    vehicle: fillerVehicle(),
    service: {
      service_name: 'Filler service — ' + D,
      service_price: 450,
      notes: 'Service notes — ' + D
    },
    parts: [
      {
        part_name: 'Filler part A — ' + D,
        quantity: 1,
        unit_price: 89.99,
        total_price: 89.99,
        notes: 'Part note xx/xxxxxx'
      },
      {
        part_name: 'Filler part B',
        quantity: 2,
        unit_price: 25,
        total_price: 50
      }
    ]
  };
}

module.exports = {
  /** Typed signature / date placeholder */
  FILLER_DATE_TOKEN: D,
  FILLER_DRAWN_SIG_PNG: FILLER_DRAWN_SIG_PNG,
  fillerCustomer: fillerCustomer,
  fillerVehicle: fillerVehicle,
  fillerAgreementFields: fillerAgreementFields,
  fillerEstimateFields: fillerEstimateFields,
  fillerInvoiceBundle: fillerInvoiceBundle
};
