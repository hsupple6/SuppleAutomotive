var fs = require('fs');
var path = require('path');
var shopInfo = require('./shop-info');
var vehicleReleaseFields = require('./vehicle-release-fields');

var ESTIMATE_RELEASE_FIELD_SPEC = [
  { key: 'labor_rate', label: 'Labor rate per hour', required: true, defaultValue: '70' },
  { key: 'parts_tax_percent', label: 'Parts tax (%)', required: false, defaultValue: '7.25' },
  { key: '_vehicle_section', label: 'Vehicle information', isSection: true },
].concat(vehicleReleaseFields.VEHICLE_RELEASE_FIELD_SPEC).concat([
  {
    key: 'services',
    label: 'Services',
    required: true,
    isCollection: true,
    collectionType: 'service_group'
  },
  { key: 'notes', label: 'Estimate notes', multiline: true, required: false }
]);

var BAR_BLUE = '#1f4e79';
var BAR_LIGHT = '#eef4fa';

function normalizeMoney(value) {
  var n = Number(String(value == null ? '' : value).replace(/[^0-9.\-]/g, ''));
  return isFinite(n) ? n : 0;
}

function normalizeQty(value) {
  var n = Number(String(value == null ? '' : value).replace(/[^0-9.\-]/g, ''));
  if (!isFinite(n) || n <= 0) return 1;
  return n;
}

function normalizePartsTaxPercent(value, defaultPercent) {
  var d = defaultPercent != null ? Number(defaultPercent) : 7.25;
  if (!isFinite(d)) d = 7.25;
  var s = String(value == null ? '' : value).trim();
  if (s === '') return d;
  var n = Number(s.replace(/%/g, '').replace(/[^0-9.\-]/g, ''));
  return isFinite(n) ? n : d;
}

function normalizePart(raw) {
  var rawPrice = raw && (raw.unit_price != null && String(raw.unit_price).trim() !== ''
    ? raw.unit_price
    : raw.price != null && String(raw.price).trim() !== ''
      ? raw.price
      : raw.cost);
  var priceStr = rawPrice != null ? String(rawPrice).trim() : '';
  return {
    name: String((raw && raw.name) || '').trim(),
    part_number: String((raw && raw.part_number) || '').trim(),
    unit_cost: String((raw && raw.unit_cost) != null ? raw.unit_cost : '').trim(),
    unit_price: priceStr,
    cost: priceStr
  };
}

function normalizeService(raw) {
  var parts = Array.isArray(raw && raw.parts) ? raw.parts : [];
  return {
    name: String((raw && raw.name) || '').trim(),
    labor_hours: String((raw && raw.labor_hours) != null ? raw.labor_hours : '').trim(),
    parts: parts
      .map(normalizePart)
      .filter(function (p) {
        return p.name || p.unit_price || p.cost;
      })
  };
}

function normalizeLineItem(raw) {
  return {
    name: String((raw && raw.name) || '').trim(),
    detail: String((raw && raw.detail) || '').trim(),
    qty: String((raw && raw.qty) != null && String(raw.qty).trim() !== '' ? raw.qty : '1').trim(),
    parts_amount: String((raw && raw.parts_amount) != null ? raw.parts_amount : '').trim(),
    labor_amount: String((raw && raw.labor_amount) != null ? raw.labor_amount : '').trim(),
    part_condition: String((raw && raw.part_condition) || '').trim().toLowerCase(),
    is_part_subrow: !!(raw && raw.is_part_subrow)
  };
}

/** Build PDF table rows from services (labor hours × rate + nested parts). */
function buildLineItemsFromServices(fields) {
  var laborRate = normalizeMoney(fields.labor_rate);
  var items = [];
  (Array.isArray(fields.services) ? fields.services : []).forEach(function (svc) {
    var normalized = normalizeService(svc);
    if (!normalized.name && !normalized.labor_hours && !normalized.parts.length) return;
    var hours = normalizeMoney(normalized.labor_hours);
    var laborAmt = hours * laborRate;
    items.push({
      name: normalized.name || 'Service',
      detail: '',
      qty: 1,
      parts_amount: 0,
      labor_amount: laborAmt,
      line_total: laborAmt,
      part_condition: '',
      is_service_row: true
    });
    normalized.parts.forEach(function (part) {
      var partCost = normalizeMoney(part.cost);
      items.push({
        name: part.name || 'Part',
        detail: '',
        qty: 1,
        parts_amount: partCost,
        labor_amount: 0,
        line_total: partCost,
        part_condition: '',
        is_part_subrow: true,
        service_name: normalized.name
      });
    });
  });
  return items;
}

/** Legacy flat services + parts lists. */
function buildLineItemsFromLegacyFlat(fields) {
  var laborRate = normalizeMoney(fields.labor_rate);
  var items = [];
  (Array.isArray(fields.services) ? fields.services : []).forEach(function (s) {
    var hours = normalizeMoney(s.labor_hours);
    items.push(
      normalizeLineItem({
        name: s.name,
        qty: '1',
        parts_amount: '0',
        labor_amount: hours * laborRate,
        is_service_row: true
      })
    );
  });
  (Array.isArray(fields.parts) ? fields.parts : []).forEach(function (p) {
    var partCost = normalizeMoney(p.cost);
    var partHours = normalizeMoney(p.labor_hours);
    items.push(
      normalizeLineItem({
        name: p.name,
        detail: 'Remove and replace',
        qty: '1',
        parts_amount: partCost,
        labor_amount: partHours * laborRate,
        part_condition: p.part_condition || 'new',
        is_part_subrow: true
      })
    );
  });
  return items.map(function (item) {
    var qty = normalizeQty(item.qty);
    var partsAmt = normalizeMoney(item.parts_amount);
    var laborAmt = normalizeMoney(item.labor_amount);
    return {
      name: item.name || 'Repair operation',
      detail: item.detail,
      qty: qty,
      parts_amount: partsAmt,
      labor_amount: laborAmt,
      line_total: partsAmt + laborAmt,
      part_condition: item.part_condition,
      is_part_subrow: item.is_part_subrow,
      is_service_row: item.is_service_row
    };
  });
}

function buildLineItemsFromFields(fields) {
  if (Array.isArray(fields.line_items) && fields.line_items.length) {
    return fields.line_items.map(function (item) {
      var normalized = normalizeLineItem(item);
      var qty = normalizeQty(normalized.qty);
      var partsAmt = normalizeMoney(normalized.parts_amount);
      var laborAmt = normalizeMoney(normalized.labor_amount);
      return {
        name: normalized.name || 'Repair operation',
        detail: normalized.detail,
        qty: qty,
        parts_amount: partsAmt,
        labor_amount: laborAmt,
        line_total: partsAmt + laborAmt,
        part_condition: normalized.part_condition,
        is_part_subrow: normalized.is_part_subrow
      };
    });
  }
  if (Array.isArray(fields.services) && fields.services.length && fields.services.some(function (s) {
    return s && Array.isArray(s.parts);
  })) {
    return buildLineItemsFromServices(fields);
  }
  if (
    (Array.isArray(fields.services) && fields.services.length) ||
    (Array.isArray(fields.parts) && fields.parts.length)
  ) {
    return buildLineItemsFromLegacyFlat(fields);
  }
  return [];
}

function normalizeEstimateReleaseFields(raw) {
  var fields = raw || {};
  var rawPartsTax = fields.parts_tax_percent;
  var services = Array.isArray(fields.services) ? fields.services : [];

  var out = {
    labor_rate: String(fields.labor_rate == null ? '' : fields.labor_rate).trim(),
    parts_tax_percent:
      rawPartsTax == null || String(rawPartsTax).trim() === ''
        ? '7.25'
        : String(rawPartsTax).trim(),
    notes: String(fields.notes == null ? '' : fields.notes).trim(),
    toxic_waste_fee: String(fields.toxic_waste_fee == null ? '' : fields.toxic_waste_fee).trim(),
    sublet_statement: String(fields.sublet_statement == null ? '' : fields.sublet_statement).trim(),
    services: services.map(normalizeService).filter(function (s) {
      return s.name || s.labor_hours || (s.parts && s.parts.length);
    })
  };
  var manualVehicle = vehicleReleaseFields.normalizeVehicleReleaseFields(fields);
  out.vehicle_year = manualVehicle.year;
  out.vehicle_make = manualVehicle.make;
  out.vehicle_model = manualVehicle.model;
  out.vehicle_trim = manualVehicle.trim;
  out.vehicle_vin = manualVehicle.vin;
  out.vehicle_license_plate = manualVehicle.license_plate;
  out.vehicle_mileage = manualVehicle.mileage;

  return out;
}

function validateEstimateReleaseFieldsComplete(fields) {
  var f = normalizeEstimateReleaseFields(fields);
  var missing = [];
  if (!String(f.labor_rate || '').trim()) missing.push('labor_rate');
  if (!Array.isArray(f.services) || f.services.length === 0) missing.push('services');
  f.services.forEach(function (s, i) {
    if (!String(s.name || '').trim()) missing.push('services[' + i + '].name');
    if (!String(s.labor_hours || '').trim()) missing.push('services[' + i + '].labor_hours');
    (s.parts || []).forEach(function (p, j) {
      if (!String(p.name || '').trim()) missing.push('services[' + i + '].parts[' + j + '].name');
      if (!String(p.unit_price || p.cost || '').trim()) missing.push('services[' + i + '].parts[' + j + '].unit_price');
    });
  });
  return missing;
}

function digitsLast10(phone) {
  var d = String(phone || '').replace(/\D/g, '');
  return d.length <= 10 ? d : d.slice(-10);
}

function formatPhoneDisplay(phone) {
  var d = digitsLast10(phone);
  if (d.length !== 10) return String(phone || '').trim();
  return '(' + d.slice(0, 3) + ') ' + d.slice(3, 6) + '-' + d.slice(6);
}

function money(n) {
  return '$' + (Number(n) || 0).toFixed(2);
}

function formatEstimateDate(d) {
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function shortEstimateDate(d) {
  return d.toLocaleDateString('en-US');
}

function buildEstimateId(options) {
  if (options && options.estimateId) return String(options.estimateId).trim();
  var n = Date.now() % 1000000;
  return String(n).padStart(6, '0');
}

function vehicleDescription(vehicle) {
  if (!vehicle) return '—';
  var parts = [vehicle.year, vehicle.make, vehicle.model].filter(Boolean);
  return parts.length ? parts.join(' ') : '—';
}

function vehicleMetaLines(vehicle) {
  if (!vehicle) return [];
  var lines = [];
  var desc = vehicleDescription(vehicle);
  var meta = [];
  if (vehicle.mileage != null && vehicle.mileage !== '') meta.push('Odometer: ' + String(vehicle.mileage));
  if (vehicle.license_plate) meta.push('License: ' + String(vehicle.license_plate));
  if (vehicle.trim) meta.push('Engine/Trim: ' + String(vehicle.trim));
  if (vehicle.vin) meta.push('VIN: ' + String(vehicle.vin));
  if (meta.length) lines.push(desc + ', ' + meta.join(', '));
  else lines.push(desc);
  return lines;
}

function drawCheckbox(doc, x, y, checked, label) {
  doc.rect(x, y, 8, 8).strokeColor('#333').lineWidth(0.75).stroke();
  if (checked) {
    doc.moveTo(x + 1.5, y + 4).lineTo(x + 3.5, y + 6.5).lineTo(x + 6.5, y + 1.5).strokeColor('#111').lineWidth(1).stroke();
  }
  doc.font('Helvetica').fontSize(7.5).fillColor('#333').text(label, x + 11, y - 0.5);
}

function decodeDrawnSignatureBuffer(payload) {
  if (!payload) return null;
  var base64 = String(payload)
    .replace(/^data:image\/png;base64,/, '')
    .replace(/^data:image\/\w+;base64,/, '');
  try {
    var raw = Buffer.from(base64, 'base64');
    return raw.length ? raw : null;
  } catch (e) {
    return null;
  }
}

function buildEstimatePdfBuffer(customer, vehicle, options) {
  options = options || {};
  var rawFields = options.releaseFields || {};
  var fields = normalizeEstimateReleaseFields(rawFields);
  var customerSignature = options.customerSignature || null;
  var signedDateStr = String(options.signedDateStr || '').trim();
  var authMethod = String(options.authMethod || 'in_person').trim().toLowerCase();
  var authTimeStr = String(options.authTimeStr || '').trim();
  var authPhoneStr = String(options.authPhoneStr || formatPhoneDisplay(customer.phone)).trim();
  var authEmailStr = String(options.authEmailStr || String(customer.email || '').trim()).trim();
  var hasCustomerSig =
    customerSignature &&
    customerSignature.payload &&
    String(customerSignature.payload).trim().length > 0;
  var drawnSignatureBuffer =
    hasCustomerSig && customerSignature.mode === 'drawn'
      ? decodeDrawnSignatureBuffer(customerSignature.payload)
      : null;
  var shop = shopInfo.getShopInfo();
  var estimateId = buildEstimateId(options);
  var now = options.documentDate instanceof Date ? options.documentDate : new Date();
  var signedDateDisplay = hasCustomerSig && signedDateStr ? signedDateStr : shortEstimateDate(now);

  var lineItems = buildLineItemsFromFields(
    Object.assign({}, fields, {
      line_items: rawFields.line_items
    })
  );

  var subtotalLabor = lineItems.reduce(function (sum, item) {
    return sum + item.labor_amount;
  }, 0);
  var subtotalParts = lineItems.reduce(function (sum, item) {
    return sum + item.parts_amount;
  }, 0);
  var toxicWasteFee = normalizeMoney(fields.toxic_waste_fee);
  var subtotal = subtotalLabor + subtotalParts + toxicWasteFee;
  var grandTotal = subtotal;

  var PDFDocument = require('pdfkit');
  var margin = 36;
  var pageW = 612;
  var rightX = pageW - margin;
  var contentW = pageW - margin * 2;
  var bottomY = 756;

  return new Promise(function (resolve, reject) {
    var doc = new PDFDocument({
      size: 'LETTER',
      margin: margin,
      bufferPages: true,
      info: { Title: 'Estimate ' + estimateId, Author: shop.name }
    });
    var chunks = [];
    doc.on('data', function (c) {
      chunks.push(c);
    });
    doc.on('end', function () {
      resolve(Buffer.concat(chunks));
    });
    doc.on('error', reject);

    function ensureSpace(h) {
      if (doc.y + h > bottomY) {
        doc.addPage();
        doc.y = margin;
      }
    }

    doc.fillColor('#111');
    doc.font('Helvetica-Bold').fontSize(16).text(shop.name, margin, margin);
    doc.font('Helvetica').fontSize(8.5).fillColor('#333');
    var regLine = [];
    if (shop.barRegistrationNo) regLine.push('BAR Registration No. ' + shop.barRegistrationNo);
    if (shop.epaIdentificationNo) regLine.push('EPA Identification No. ' + shop.epaIdentificationNo);
    if (regLine.length) doc.text(regLine.join('   '), margin, doc.y + 2);
    doc.text(shop.address, margin, doc.y + 2);
    doc.text('Phone: ' + shop.phone + '   Email: ' + shop.email, margin, doc.y + 2);

    doc.font('Helvetica-Bold').fontSize(20).fillColor(BAR_BLUE).text('ESTIMATE', rightX - 170, margin, {
      width: 170,
      align: 'right'
    });
    doc.font('Helvetica').fontSize(9).fillColor('#333');
    doc.text('ID #: ' + estimateId, rightX - 170, margin + 26, { width: 170, align: 'right' });
    doc.text('Date: ' + formatEstimateDate(now), rightX - 170, margin + 40, { width: 170, align: 'right' });

    doc.y = Math.max(doc.y, margin + 58);
    doc.moveTo(margin, doc.y + 6).lineTo(rightX, doc.y + 6).strokeColor('#ccc').lineWidth(1).stroke();
    doc.y += 16;

    var infoTop = doc.y;
    var colW = contentW / 2 - 8;
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#111').text('Customer Information:', margin, infoTop);
    doc.font('Helvetica').fontSize(8.5).fillColor('#333');
    var custY = infoTop + 14;
    doc.text(String(customer.name || 'Customer').trim() || 'Customer', margin, custY, { width: colW });
    custY += 12;
    var customerAddr = [customer.address_line1, customer.address_line2, [customer.city, customer.state, customer.postal_code].filter(Boolean).join(', ')]
      .filter(Boolean)
      .join('\n');
    if (customerAddr) {
      doc.text(customerAddr, margin, custY, { width: colW });
      custY += doc.heightOfString(customerAddr, { width: colW }) + 2;
    }
    if (customer.phone) {
      doc.text('Home/Cell: ' + formatPhoneDisplay(customer.phone), margin, custY, { width: colW });
      custY += 12;
    }
    if (customer.email) {
      doc.text('Email: ' + String(customer.email), margin, custY, { width: colW });
      custY += 12;
    }

    var vehX = margin + colW + 16;
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#111').text('Vehicle Information:', vehX, infoTop);
    doc.font('Helvetica').fontSize(8.5).fillColor('#333');
    var vehY = infoTop + 14;
    vehicleMetaLines(vehicle).forEach(function (line) {
      doc.text(line, vehX, vehY, { width: colW });
      vehY += doc.heightOfString(line, { width: colW }) + 2;
    });

    doc.y = Math.max(custY, vehY) + 10;

    var tableTop = doc.y;
    var colDesc = margin + 4;
    var colQty = margin + 300;
    var colParts = margin + 340;
    var colLabor = margin + 400;
    var colPrice = rightX - 4;
    var headerH = 20;
    doc.rect(margin, tableTop, contentW, headerH).fill(BAR_BLUE);
    doc.fillColor('#fff').font('Helvetica-Bold').fontSize(7.5);
    doc.text('LABOR OPERATION OR PART DESCRIPTION', colDesc, tableTop + 6, { width: 285 });
    doc.text('QTY', colQty, tableTop + 6, { width: 30, align: 'center' });
    doc.text('PARTS', colParts, tableTop + 6, { width: 52, align: 'right' });
    doc.text('LABOR', colLabor, tableTop + 6, { width: 52, align: 'right' });
    doc.text('PRICE', colPrice - 58, tableTop + 6, { width: 58, align: 'right' });
    doc.y = tableTop + headerH;

    lineItems.forEach(function (item, idx) {
      ensureSpace(34);
      var rowTop = doc.y;
      if (idx % 2 === 1) doc.rect(margin, rowTop, contentW, 1).fill('#f7f7f7');
      doc.fillColor('#111');
      if (item.is_part_subrow) {
        doc.font('Helvetica').fontSize(8).fillColor('#444');
      } else {
        doc.font('Helvetica-Bold').fontSize(8.5);
      }
      var descName = item.is_part_subrow ? '    ' + item.name : item.name;
      doc.text(descName, colDesc, rowTop + 4, { width: 285 });
      var detailY = doc.y + 1;
      if (item.detail) {
        doc.font('Helvetica').fontSize(7.5).fillColor('#444');
        doc.text(item.detail, colDesc + (item.is_part_subrow ? 6 : 2), detailY, { width: 280, lineGap: 1 });
      }
      if (item.part_condition && item.part_condition !== 'new') {
        doc.font('Helvetica-Oblique').fontSize(7).fillColor('#666');
        doc.text(
          '(' + item.part_condition.charAt(0).toUpperCase() + item.part_condition.slice(1) + ' part)',
          colDesc + 2,
          doc.y + 1,
          { width: 280 }
        );
      }
      var rowBottom = Math.max(doc.y + 4, rowTop + 22);
      doc.font('Helvetica').fontSize(8.5).fillColor('#333');
      doc.text(String(item.qty), colQty, rowTop + 6, { width: 30, align: 'center' });
      doc.text(item.parts_amount ? money(item.parts_amount) : '', colParts, rowTop + 6, { width: 52, align: 'right' });
      doc.text(item.labor_amount ? money(item.labor_amount) : '', colLabor, rowTop + 6, { width: 52, align: 'right' });
      doc.text(money(item.line_total), colPrice - 58, rowTop + 6, { width: 58, align: 'right' });
      doc.y = rowBottom;
      doc.moveTo(margin, doc.y).lineTo(rightX, doc.y).strokeColor('#ddd').lineWidth(0.5).stroke();
    });

    ensureSpace(120);
    doc.y += 8;
    var totalsX = margin + 330;
    var totalsValX = rightX - 58;
    function totalRow(label, value, bold) {
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(bold ? 10 : 9).fillColor('#333');
      doc.text(label, totalsX, doc.y, { width: 120, align: 'right' });
      doc.text(value, totalsValX, doc.y, { width: 58, align: 'right' });
      doc.y += bold ? 18 : 14;
    }
    totalRow('SUBTOTAL LABOR', money(subtotalLabor), false);
    totalRow('SUBTOTAL PARTS', money(subtotalParts), false);
    if (toxicWasteFee > 0) totalRow('TOXIC WASTE DISPOSAL', money(toxicWasteFee), false);
    totalRow('SUBTOTAL', money(subtotal), false);
    totalRow('SALES TAX', '—', false);
    totalRow('TOTAL', money(grandTotal), true);

    ensureSpace(40);
    doc.moveDown(0.3);
    doc.font('Helvetica').fontSize(7).fillColor('#555');
    doc.text(
      'Sales tax is shown on the invoice only (BPC § 9884.8, CCR § 3356(c)(5)).',
      margin,
      doc.y,
      { width: contentW }
    );
    doc.text(
      '¹ All parts are new unless specified as a used, rebuilt, or reconditioned part.',
      margin,
      doc.y + 2,
      { width: contentW }
    );
    if (toxicWasteFee > 0 && shop.epaIdentificationNo) {
      doc.text('Toxic waste disposal EPA ID: ' + shop.epaIdentificationNo, margin, doc.y + 2, { width: contentW });
    }

    if (fields.sublet_statement) {
      ensureSpace(36);
      doc.moveDown(0.4);
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#111').text('Sublet repairs', margin, doc.y);
      doc.font('Helvetica').fontSize(8).fillColor('#333').text(fields.sublet_statement, margin, doc.y + 2, {
        width: contentW,
        lineGap: 1
      });
    }

    if (fields.notes) {
      ensureSpace(36);
      doc.moveDown(0.4);
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#111').text('Notes', margin, doc.y);
      doc.font('Helvetica').fontSize(8).fillColor('#333').text(fields.notes, margin, doc.y + 2, {
        width: contentW,
        lineGap: 1
      });
    }

    ensureSpace(150);
    doc.moveDown(0.6);
    var authTop = doc.y;
    doc.rect(margin, authTop, contentW, 16).fill(BAR_BLUE);
    doc.fillColor('#fff').font('Helvetica-Bold').fontSize(9).text('AUTHORIZATION', margin + 6, authTop + 4);

    var authBoxTop = authTop + 22;
    var innerPad = 8;
    var authY = authBoxTop + innerPad;
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#111').text('Original Estimate: ' + money(grandTotal), margin + 8, authY);
    authY += 16;
    doc.font('Helvetica').fontSize(8).fillColor('#333').text('Authorized By:', margin + 8, authY);
    if (hasCustomerSig && customerSignature.mode === 'typed') {
      doc.font('Helvetica-Oblique').fontSize(14).text(String(customerSignature.payload || '').slice(0, 90), margin + 72, authY - 4);
    } else if (hasCustomerSig && customerSignature.mode === 'drawn' && drawnSignatureBuffer) {
      try {
        doc.image(drawnSignatureBuffer, margin + 72, authY - 6, { fit: [155, 40] });
      } catch (imgErr) {
        doc.font('Helvetica').fontSize(8).fillColor('#333').text('[Drawn signature]', margin + 72, authY);
      }
    } else if (hasCustomerSig && customerSignature.mode === 'drawn') {
      doc.font('Helvetica').fontSize(8).fillColor('#333').text('[Signature on file]', margin + 72, authY);
    } else {
      doc.text('_____________________________________', margin + 72, authY);
    }

    var authMidX = margin + 250;
    doc.font('Helvetica').fontSize(7.5).fillColor('#333');
    doc.text('Date: ' + signedDateDisplay, authMidX, authBoxTop + innerPad);
    doc.text('Time: ' + (authTimeStr || '_______________'), authMidX, authBoxTop + innerPad + 12);
    doc.text('Phone #: ' + (authPhoneStr || '_______________'), authMidX, authBoxTop + innerPad + 24);
    doc.text('Email: ' + (authEmailStr || '_______________'), authMidX, authBoxTop + innerPad + 36);

    var checkX = margin + 430;
    var checkY = authBoxTop + innerPad;
    drawCheckbox(doc, checkX, checkY, authMethod === 'in_person', 'In Person');
    drawCheckbox(doc, checkX, checkY + 12, authMethod === 'phone', 'By Phone');
    drawCheckbox(doc, checkX, checkY + 24, authMethod === 'text', 'By Text');
    drawCheckbox(doc, checkX, checkY + 36, authMethod === 'email', 'By Email');

    authY = authBoxTop + innerPad + 52;
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#111').text('Additional authorization (if needed)', margin + 8, authY);
    authY += 14;
    doc.font('Helvetica').fontSize(7.5).fillColor('#555');
    doc.text(
      'Additional Cost: __________   Revised Estimate: __________   Authorized By: ________________________________',
      margin + 8,
      authY,
      { width: contentW - 16 }
    );
    authY += 12;
    doc.text(
      'Date: __________   Time: __________   Phone #: __________   Email: __________',
      margin + 8,
      authY,
      { width: contentW - 16 }
    );
    authY += doc.heightOfString(
      'Date: __________   Time: __________   Phone #: __________   Email: __________',
      { width: contentW - 16 }
    ) + innerPad;

    doc.rect(margin, authBoxTop, contentW, authY - authBoxTop).strokeColor('#bbb').lineWidth(0.75).stroke();
    doc.y = authY;

    ensureSpace(60);
    doc.y += 18;
    doc.moveDown(0.4);
    doc.font('Helvetica').fontSize(7.5).fillColor('#555');
    doc.text(shop.paymentText, margin, doc.y, { width: contentW, align: 'center', lineGap: 1 });
    doc.text(shop.warrantyText, margin, doc.y + 2, { width: contentW, align: 'center', lineGap: 1 });
    doc.moveDown(0.5);
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#111').text('THANK YOU FOR YOUR BUSINESS!', margin, doc.y, {
      width: contentW,
      align: 'center'
    });

    var pageRange = doc.bufferedPageRange();
    for (var pi = 0; pi < pageRange.count; pi++) {
      doc.switchToPage(pageRange.start + pi);
      doc.font('Helvetica').fontSize(8).fillColor('#666');
      doc.text('Page ' + (pi + 1) + ' of ' + pageRange.count, margin, 20, { lineBreak: false });
    }

    doc.end();
  });
}

module.exports = {
  ESTIMATE_RELEASE_FIELD_SPEC: ESTIMATE_RELEASE_FIELD_SPEC,
  normalizeEstimateReleaseFields: normalizeEstimateReleaseFields,
  validateEstimateReleaseFieldsComplete: validateEstimateReleaseFieldsComplete,
  buildEstimatePdfBuffer: buildEstimatePdfBuffer,
  resolveVehicleForDocument: vehicleReleaseFields.resolveVehicleForDocument
};
