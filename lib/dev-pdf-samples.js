/**
 * Filler customer / vehicle / fields for DEV_PDF_SAMPLES PDF previews (xx/xxxxxx style).
 */

var D = 'xx/xxxxxx';

/** 12×8 PNG (minimal valid) for drawn-signature demos */
var FILLER_DRAWN_SIG_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAICAYAAADN5B7xAAAALElEQVQYV2NkGGDAiSGeAREwgY1kYGBg+A8EwShGQwMDAwPDf1TBYCQYhQEA4O0F3fk6sZcAAAAASUVORK5CYII=';

function fillerCustomer() {
  return {
    name: 'John Smith',
    email: 'john.smith@example.com',
    phone: '8055551234',
    address_line1: '1000 Rubicon Road',
    address_line2: '',
    city: 'Camarillo',
    state: 'CA',
    postal_code: '93010'
  };
}

function fillerVehicle() {
  return {
    year: 2018,
    make: 'Jeep',
    model: 'Grand Cherokee',
    trim: '3.6L 6-Cyl 8-speed Auto/4WD',
    vin: '1J4RR4GG8JC876543',
    license_plate: '4BY4CAL',
    mileage: '93292'
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

/** California BAR Write It Right sample-style estimate (simple service + parts inputs). */
function fillerEstimateFields() {
  return {
    labor_rate: '80',
    parts_tax_percent: '7.25',
    services: [
      {
        name: 'Ultimate Oil Change',
        labor_hours: '1',
        parts: [
          { name: '5W-30 full synthetic motor oil (5 qt)', cost: '32.00' },
          { name: 'Oil filter', cost: '7.95' }
        ]
      },
      {
        name: 'Diagnosis',
        labor_hours: '1.75',
        parts: []
      }
    ],
    notes: ''
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
