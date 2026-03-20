var fs = require('fs');
var path = require('path');

var ESTIMATE_RELEASE_FIELD_SPEC = [
  { key: 'labor_rate', label: 'Labor rate per hour', required: true, defaultValue: '70' },
  { key: 'services', label: 'Services', required: true, isCollection: true, collectionType: 'service' },
  { key: 'parts', label: 'Parts', required: false, isCollection: true, collectionType: 'part' },
  { key: 'notes', label: 'Estimate notes', multiline: true, required: false }
];

function normalizeMoney(value) {
  var n = Number(String(value == null ? '' : value).replace(/[^0-9.\-]/g, ''));
  return isFinite(n) ? n : 0;
}

function normalizeHours(value) {
  var n = Number(String(value == null ? '' : value).replace(/[^0-9.\-]/g, ''));
  return isFinite(n) ? n : 0;
}

function normalizeEstimateReleaseFields(raw) {
  var fields = raw || {};
  var out = {
    labor_rate: String(fields.labor_rate == null ? '' : fields.labor_rate).trim(),
    notes: String(fields.notes == null ? '' : fields.notes).trim(),
    services: [],
    parts: []
  };
  var services = Array.isArray(fields.services) ? fields.services : [];
  var parts = Array.isArray(fields.parts) ? fields.parts : [];
  out.services = services
    .map(function (s) {
      return {
        name: String((s && s.name) || '').trim(),
        labor_hours: String((s && s.labor_hours) || '').trim()
      };
    })
    .filter(function (s) {
      return s.name || s.labor_hours;
    });
  out.parts = parts
    .map(function (p) {
      return {
        name: String((p && p.name) || '').trim(),
        cost: String((p && p.cost) || '').trim()
      };
    })
    .filter(function (p) {
      return p.name || p.cost;
    });
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
  });
  f.parts.forEach(function (p, i) {
    if (!String(p.name || '').trim()) missing.push('parts[' + i + '].name');
    if (!String(p.cost || '').trim()) missing.push('parts[' + i + '].cost');
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

function buildEstimatePdfBuffer(customer, vehicle, options) {
  options = options || {};
  var fields = normalizeEstimateReleaseFields(options.releaseFields || {});
  var customerSignature = options.customerSignature || null;
  var signedDateStr = String(options.signedDateStr || '').trim() || '_______________';
  var hasCustomerSig =
    customerSignature &&
    customerSignature.payload &&
    String(customerSignature.payload).trim().length > 0;

  var PDFDocument = require('pdfkit');
  var margin = 50;
  var pageW = 612;
  var rightX = pageW - margin;
  var contentW = pageW - margin * 2;

  var laborRate = normalizeMoney(fields.labor_rate);
  var services = fields.services.map(function (s) {
    var hours = normalizeHours(s.labor_hours);
    return {
      name: s.name || 'Service',
      labor_hours: hours,
      labor_total: hours * laborRate
    };
  });
  var parts = fields.parts.map(function (p) {
    var partCost = normalizeMoney(p.cost);
    return {
      name: p.name || 'Part',
      line_label: 'Remove and Replace',
      cost: partCost
    };
  });
  var laborTotal = services.reduce(function (sum, s) {
    return sum + s.labor_total;
  }, 0);
  var partsTotal = parts.reduce(function (sum, p) {
    return sum + p.cost;
  }, 0);
  var grandTotal = laborTotal + partsTotal;

  return new Promise(function (resolve, reject) {
    var doc = new PDFDocument({
      size: 'LETTER',
      margin: margin,
      info: { Title: 'Estimate', Author: 'Supple Automotive' }
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
      if (doc.y + h > 740) {
        doc.addPage();
        doc.y = margin;
      }
    }

    doc.fillColor('#111');
    doc.font('Helvetica-Bold').fontSize(22).text('Supple Automotive', margin, margin);
    doc.font('Helvetica-Bold').fontSize(14).text('Estimate', margin, margin + 28);
    doc.font('Helvetica').fontSize(9).fillColor('#555');
    doc.text(
      'Date: ' +
        new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      rightX - 170,
      margin + 4,
      { width: 170, align: 'right' }
    );
    doc.text('Labor rate: ' + money(laborRate) + '/hr', rightX - 170, margin + 18, { width: 170, align: 'right' });

    doc.moveTo(margin, 108).lineTo(rightX, 108).strokeColor('#ddd').lineWidth(1).stroke();
    doc.y = 122;

    var vehicleLine = vehicle ? [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ') : '—';
    var customerAddr = [customer.address_line1, customer.address_line2, customer.city, customer.state, customer.postal_code]
      .filter(Boolean)
      .join(', ');
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#111').text('Customer');
    doc.font('Helvetica').fontSize(10).fillColor('#333');
    doc.text(String(customer.name || 'Customer').trim() || 'Customer');
    if (customerAddr) doc.text(customerAddr);
    if (customer.email) doc.text(String(customer.email));
    if (customer.phone) doc.text(formatPhoneDisplay(customer.phone));
    doc.moveDown(0.5);
    doc.font('Helvetica-Bold').fillColor('#111').text('Vehicle');
    doc.font('Helvetica').fillColor('#333').text(vehicleLine || '—');
    if (vehicle && vehicle.vin) doc.text('VIN: ' + String(vehicle.vin));
    if (vehicle && vehicle.mileage != null && vehicle.mileage !== '') doc.text('Mileage: ' + String(vehicle.mileage));

    doc.moveDown(0.8);
    ensureSpace(40);
    doc.rect(margin, doc.y, contentW, 22).fill('#f5f5f5');
    var headerY = doc.y + 7;
    doc.fillColor('#111').font('Helvetica-Bold').fontSize(9);
    doc.text('Description', margin + 8, headerY);
    doc.text('Hours', margin + 300, headerY, { width: 50, align: 'right' });
    doc.text('Amount', rightX - 78, headerY, { width: 72, align: 'right' });
    doc.y += 30;
    doc.font('Helvetica').fillColor('#333').fontSize(9);

    services.forEach(function (s) {
      ensureSpace(22);
      doc.text(s.name, margin + 8, doc.y, { width: 280 });
      doc.text(String(s.labor_hours.toFixed(2)), margin + 300, doc.y, { width: 50, align: 'right' });
      doc.text(money(s.labor_total), rightX - 78, doc.y, { width: 72, align: 'right' });
      doc.y += 20;
    });

    parts.forEach(function (p) {
      ensureSpace(34);
      doc.text((p.name + ' — ' + p.line_label).slice(0, 85), margin + 8, doc.y, { width: 340 });
      doc.text('—', margin + 300, doc.y, { width: 50, align: 'right' });
      doc.text(money(p.cost), rightX - 78, doc.y, { width: 72, align: 'right' });
      doc.y += 20;
    });

    ensureSpace(90);
    doc.moveDown(0.4);
    doc.moveTo(margin + 260, doc.y).lineTo(rightX, doc.y).strokeColor('#ddd').stroke();
    doc.y += 10;
    doc.font('Helvetica').fontSize(10).fillColor('#333');
    doc.text('Labor', rightX - 170, doc.y, { width: 90 });
    doc.text(money(laborTotal), rightX - 78, doc.y, { width: 72, align: 'right' });
    doc.y += 16;
    doc.text('Parts', rightX - 170, doc.y, { width: 90 });
    doc.text(money(partsTotal), rightX - 78, doc.y, { width: 72, align: 'right' });
    doc.y += 18;
    doc.font('Helvetica-Bold').fontSize(11);
    doc.text('Estimated Total', rightX - 170, doc.y, { width: 90 });
    doc.text(money(grandTotal), rightX - 78, doc.y, { width: 72, align: 'right' });

    if (fields.notes) {
      ensureSpace(72);
      doc.moveDown(0.6);
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#111').text('Notes', margin, doc.y);
      doc.moveDown(0.3);
      doc.font('Helvetica').fontSize(9).fillColor('#333').text(fields.notes, margin, doc.y, {
        width: contentW,
        lineGap: 2
      });
    }

    ensureSpace(110);
    doc.moveDown(1);
    var sigY = doc.y;
    doc.font('Helvetica').fontSize(10).fillColor('#111').text('Customer signature:', margin, sigY);
    if (hasCustomerSig && customerSignature.mode === 'typed') {
      doc.font('Helvetica-Oblique').fontSize(18).text(String(customerSignature.payload || '').slice(0, 90), margin + 130, sigY - 6);
    } else {
      doc.font('Helvetica').fontSize(10).text('_____________________________________', margin + 130, sigY + 1);
    }
    doc.font('Helvetica').fontSize(9).fillColor('#555').text(
      'Date: ' + (hasCustomerSig ? signedDateStr : '_______________'),
      rightX - 170,
      sigY + 2,
      { width: 170, align: 'right' }
    );

    sigY += 44;
    doc.font('Helvetica').fontSize(10).fillColor('#111').text('Mechanic signature:', margin, sigY);
    doc.font('Helvetica-Oblique').fontSize(17).text('Hayden L Supple', margin + 130, sigY - 4);

    var dancingWoff = path.join(
      __dirname,
      '..',
      'node_modules',
      '@fontsource',
      'dancing-script',
      'files',
      'dancing-script-latin-400-normal.woff'
    );
    if (fs.existsSync(dancingWoff)) {
      try {
        doc.registerFont('MechSigEstimate', dancingWoff);
        doc.font('MechSigEstimate').fontSize(30).text('Hayden L Supple', margin + 130, sigY - 14);
      } catch (e) {
        // Fall back to Helvetica-Oblique signature.
      }
    }
    doc.font('Helvetica').fontSize(9).fillColor('#555').text(
      'Date: ' +
        new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      rightX - 170,
      sigY + 2,
      { width: 170, align: 'right' }
    );

    doc.end();
  });
}

module.exports = {
  ESTIMATE_RELEASE_FIELD_SPEC: ESTIMATE_RELEASE_FIELD_SPEC,
  normalizeEstimateReleaseFields: normalizeEstimateReleaseFields,
  validateEstimateReleaseFieldsComplete: validateEstimateReleaseFieldsComplete,
  buildEstimatePdfBuffer: buildEstimatePdfBuffer
};
