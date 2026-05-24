var estimatePdf = require('./estimate-pdf');

function customerFromBuilderBody(raw) {
  raw = raw || {};
  return {
    name: String(raw.name || '').trim(),
    email: raw.email ? String(raw.email).trim() : null,
    phone: raw.phone ? String(raw.phone).trim() : null,
    address_line1: raw.address_line1 ? String(raw.address_line1).trim() : null,
    address_line2: raw.address_line2 ? String(raw.address_line2).trim() : null,
    city: raw.city ? String(raw.city).trim() : null,
    state: raw.state ? String(raw.state).trim() : null,
    postal_code: raw.postal_code ? String(raw.postal_code).trim() : null
  };
}

function parseMoney(value) {
  var n = Number(String(value == null ? '' : value).replace(/[^0-9.\-]/g, ''));
  return isFinite(n) ? n : 0;
}

function buildSaveTitle(customer, fields) {
  var name = String((customer && customer.name) || 'Customer').trim() || 'Customer';
  var services = fields && Array.isArray(fields.services) ? fields.services : [];
  var firstSvc = services[0] && services[0].name ? String(services[0].name).trim() : '';
  var d = new Date().toLocaleDateString('en-US');
  return firstSvc ? name + ' — ' + firstSvc + ' (' + d + ')' : name + ' (' + d + ')';
}

function partUnitPrice(part) {
  if (part.unit_price != null && String(part.unit_price).trim() !== '') return parseMoney(part.unit_price);
  if (part.price != null && String(part.price).trim() !== '') return parseMoney(part.price);
  return parseMoney(part.cost);
}

function partUnitCost(part) {
  if (part.unit_cost == null || String(part.unit_cost).trim() === '') return null;
  return parseMoney(part.unit_cost);
}

function builderFieldsToInvoiceBundle(customer, fields) {
  var cust = customerFromBuilderBody(customer);
  var normalized = estimatePdf.normalizeEstimateReleaseFields(fields || {});
  var vehicle = estimatePdf.resolveVehicleForDocument(normalized, null);
  var laborRate = parseMoney(normalized.labor_rate);
  var parts = [];
  var totalLabor = 0;
  var serviceNames = [];

  (normalized.services || []).forEach(function (svc) {
    var hours = parseMoney(svc.labor_hours);
    var laborAmt = hours * laborRate;
    totalLabor += laborAmt;
    if (svc.name) serviceNames.push(String(svc.name).trim());
    (svc.parts || []).forEach(function (part) {
      var unitPrice = partUnitPrice(part);
      parts.push({
        part_name: part.name || 'Part',
        part_number: part.part_number || null,
        quantity: 1,
        unit_price: unitPrice,
        unit_cost: partUnitCost(part),
        total_price: unitPrice
      });
    });
  });

  var serviceLabel = serviceNames.length === 1 ? serviceNames[0] : serviceNames.length ? serviceNames.join(' / ') : 'Labor / service';

  return {
    customer: cust,
    vehicle: vehicle,
    service: {
      service_name: serviceLabel,
      service_price: totalLabor,
      notes: normalized.notes || ''
    },
    parts: parts
  };
}

function normalizeSavePayload(body) {
  body = body || {};
  return {
    customer: customerFromBuilderBody(body.customer),
    fields: body.fields || {},
    invoiceNumber: body.invoiceNumber ? String(body.invoiceNumber).trim() : '',
    sourceEstimateId: body.sourceEstimateId ? String(body.sourceEstimateId).trim() : null
  };
}

module.exports = {
  customerFromBuilderBody: customerFromBuilderBody,
  buildSaveTitle: buildSaveTitle,
  builderFieldsToInvoiceBundle: builderFieldsToInvoiceBundle,
  normalizeSavePayload: normalizeSavePayload
};
