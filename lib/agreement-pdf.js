/**
 * Service agreement PDF — pure pdfkit (Vercel / serverless friendly).
 * Template: doc/agreement.md (optional) or lib/default-agreement.md
 */
var fs = require('fs');
var path = require('path');

var AGREEMENT_RELEASE_FIELD_SPEC = [
  {
    key: 'requested_service',
    label: 'Requested service / customer complaint',
    multiline: true,
    required: true
  },
  {
    key: 'drive_out_cost',
    label: 'Drive out cost',
    required: true
  },
  {
    key: 'service_address',
    label: 'Service address',
    multiline: true,
    required: true
  },
  { key: 'labor_rate', label: 'Labor rate per hour', required: true, defaultValue: '70' },
  { key: 'diagnostic_fee', label: 'Diagnostic fee', required: true, defaultValue: '125' },
  {
    key: 'late_interest_percent',
    label: 'Late payment interest (% per month)',
    required: true,
    defaultValue: '2.0'
  },
  {
    key: 'addendum',
    label: 'Optional addendum (custom notes)',
    multiline: true,
    required: false
  }
];

function digitsLast10(phone) {
  var d = String(phone || '').replace(/\D/g, '');
  return d.length <= 10 ? d : d.slice(-10);
}

function formatPhoneDisplay(phone) {
  var d = digitsLast10(phone);
  if (d.length !== 10) return String(phone || '').trim();
  return '(' + d.slice(0, 3) + ') ' + d.slice(3, 6) + '-' + d.slice(6);
}

function placeholderMap(customer, vehicle) {
  vehicle = vehicle || {};
  var line1 = customer.address_line1 || '';
  var line2 = customer.address_line2 || '';
  var city = customer.city || '';
  var st = customer.state || '';
  var zip = customer.postal_code || '';
  var full = [line1, line2, city, st, zip].filter(Boolean).join(', ');
  var vy = vehicle.year != null && vehicle.year !== '' ? String(vehicle.year) : '';
  var vmk = vehicle.make != null ? String(vehicle.make) : '';
  var vmd = vehicle.model != null ? String(vehicle.model) : '';
  var vv = vehicle.vin != null ? String(vehicle.vin) : '';
  var vmi = vehicle.mileage != null && vehicle.mileage !== '' ? String(vehicle.mileage) : '';
  return {
    __CUSTOMER_NAME__: String(customer.name || '').trim(),
    __CUSTOMER_EMAIL__: String(customer.email || '').trim(),
    __CUSTOMER_PHONE__: formatPhoneDisplay(customer.phone),
    __ADDRESS_LINE1__: line1,
    __ADDRESS_LINE2__: line2,
    __CITY__: city,
    __STATE__: st,
    __POSTAL_CODE__: zip,
    __ADDRESS_FULL__: full,
    __VEHICLE_YEAR__: vy,
    __VEHICLE_MAKE__: vmk,
    __VEHICLE_MODEL__: vmd,
    __VEHICLE_VIN__: vv,
    __VEHICLE_MILEAGE__: vmi
  };
}

function releasePlaceholderMap(fields) {
  var f = fields || {};
  return {
    __REQUESTED_SERVICE__: String(f.requested_service || '').trim(),
    __AUTHORIZED_REPAIR_AMOUNT__: String(f.drive_out_cost || '').trim(),
    __DRIVE_OUT_COST__: String(f.drive_out_cost || '').trim(),
    __SERVICE_ADDRESS__: String(f.service_address || '').trim(),
    __LABOR_RATE__: String(f.labor_rate || '').trim(),
    __DIAGNOSTIC_FEE__: String(f.diagnostic_fee || '').trim(),
    __LATE_INTEREST_PCT__: String(f.late_interest_percent || '').trim(),
    __WARRANTY_DAYS__: '30'
  };
}

function applyTokenMap(text, map) {
  var keys = Object.keys(map).sort(function (a, b) {
    return b.length - a.length;
  });
  var out = text;
  keys.forEach(function (k) {
    out = out.split(k).join(map[k]);
  });
  return out;
}

function applyPlaceholders(text, customer, vehicle) {
  return applyTokenMap(text, placeholderMap(customer, vehicle));
}

function applyReleaseFieldPlaceholders(text, fields) {
  return applyTokenMap(text, releasePlaceholderMap(fields));
}

function normalizeAgreementReleaseFields(raw) {
  var out = {};
  AGREEMENT_RELEASE_FIELD_SPEC.forEach(function (spec) {
    var v = raw && raw[spec.key];
    out[spec.key] = v == null ? '' : String(v).trim();
  });
  return out;
}

function validateAgreementReleaseFieldsComplete(fields) {
  var missing = [];
  AGREEMENT_RELEASE_FIELD_SPEC.forEach(function (f) {
    if (!f.required) return;
    if (!String((fields && fields[f.key]) || '').trim()) missing.push(f.key);
  });
  return missing;
}

function parseAgreementMd(source) {
  var re = /\n(?=## \d+\.\s)/;
  var idx = source.search(re);
  if (idx === -1) {
    return { cover: source.trim(), sections: [] };
  }
  var cover = source.slice(0, idx).trim();
  var rest = source.slice(idx + 1);
  var parts = rest.split(/\n(?=## \d+\.\s)/);
  var sections = parts.map(function (block) {
    var lines = block.split('\n');
    var first = lines[0] || '';
    var heading = first.replace(/^##\s+/, '').trim();
    var body = lines.slice(1).join('\n').trim();
    return { heading: heading, body: body };
  });
  return { cover: cover, sections: sections };
}

function agreementTemplatePath() {
  return path.join(__dirname, '..', 'doc', 'agreement.md');
}

function defaultAgreementPath() {
  return path.join(__dirname, 'default-agreement.md');
}

function loadAgreementSource() {
  var custom = agreementTemplatePath();
  if (fs.existsSync(custom) && fs.statSync(custom).isFile()) {
    var t = fs.readFileSync(custom, 'utf8').trim();
    if (t.length > 0) return t;
  }
  return fs.readFileSync(defaultAgreementPath(), 'utf8');
}

function hasAgreementMarkdown() {
  try {
    var p = agreementTemplatePath();
    return fs.existsSync(p) && fs.statSync(p).isFile() && fs.readFileSync(p, 'utf8').trim().length > 0;
  } catch (e) {
    return false;
  }
}

function decodeDrawnSignaturePng(payload) {
  if (!payload || typeof payload !== 'string') return null;
  var base64 = payload
    .replace(/^data:image\/png;base64,/, '')
    .replace(/^data:image\/\w+;base64,/, '');
  try {
    var buf = Buffer.from(base64, 'base64');
    return buf && buf.length > 40 ? buf : null;
  } catch (e) {
    return null;
  }
}

/**
 * @param {object} customer
 * @param {object|null} vehicle
 * @param {object} [options]
 * @param {object} options.releaseFields — keys per AGREEMENT_RELEASE_FIELD_SPEC
 * @param {object} [options.customerSignature] — { mode: 'typed'|'drawn', payload: string }
 * @param {string} [options.signedDateStr] — printed on each customer signature line when signed
 * @returns {Promise<Buffer>}
 */
function buildAgreementPdfBuffer(customer, vehicle, options) {
  options = options || {};
  var releaseFields = normalizeAgreementReleaseFields(options.releaseFields || {});
  var customerSignature = options.customerSignature || null;
  var signedDateStr = String(options.signedDateStr || '').trim() || '_______________';
  var hasCustomerSig =
    customerSignature &&
    customerSignature.payload &&
    String(customerSignature.payload).trim().length > 0;
  var drawnPng = null;
  if (hasCustomerSig && customerSignature.mode === 'drawn') {
    drawnPng = decodeDrawnSignaturePng(customerSignature.payload);
  }

  var PDFDocument = require('pdfkit');
  var raw = loadAgreementSource();
  var filled = applyPlaceholders(raw, customer, vehicle);
  filled = applyReleaseFieldPlaceholders(filled, releaseFields);
  var parsed = parseAgreementMd(filled);
  var margin = 50;
  var contentW = 512;
  var bottomY = 720;

  return new Promise(function (resolve, reject) {
    var doc = new PDFDocument({
      size: 'LETTER',
      margin: margin,
      info: { Title: 'Service Agreement', Author: 'Supple Automotive' }
    });
    var chunks = [];
    doc.on('data', function (c) {
      chunks.push(c);
    });
    doc.on('end', function () {
      resolve(Buffer.concat(chunks));
    });
    doc.on('error', reject);

    function newPageIfNeeded(estimated) {
      if (doc.y + estimated > bottomY) {
        doc.addPage();
        doc.y = margin;
      }
    }

    var dancingWoff = path.join(
      __dirname,
      '..',
      'node_modules',
      '@fontsource',
      'dancing-script',
      'files',
      'dancing-script-latin-400-normal.woff'
    );
    var hasMechFont = fs.existsSync(dancingWoff);
    if (hasMechFont) {
      try {
        doc.registerFont('MechSig', dancingWoff);
        doc.registerFont('CustSig', dancingWoff);
      } catch (regErr) {
        hasMechFont = false;
      }
    }

    doc.fillColor('#111111');
    doc.y = margin;

    var coverLines = parsed.cover.split('\n');
    coverLines.forEach(function (line) {
      var L = line.trimEnd();
      var t = L.trim();
      if (!t) {
        doc.moveDown(0.35);
        return;
      }
      if (L.startsWith('# ') && !L.startsWith('##')) {
        doc.fontSize(15).font('Helvetica-Bold').text(L.slice(2).trim(), { width: contentW, align: 'center' });
        doc.moveDown(0.6);
        return;
      }
      if (/^###\s+/.test(L)) {
        doc.fontSize(11).font('Helvetica-Bold').text(L.replace(/^###\s+/, '').trim(), { width: contentW });
        doc.moveDown(0.35);
        return;
      }
      if (/^---+\s*$/.test(t)) {
        doc.moveDown(0.2);
        return;
      }
      if (/^\s*-\s+/.test(L)) {
        var cBullet = L.replace(/^\s*-\s+/, '').trim();
        doc.fontSize(10).font('Helvetica');
        var cx = doc.x;
        doc.x = margin + 14;
        doc.text('\u2022  ' + cBullet, { width: contentW - 14, lineGap: 2 });
        doc.x = cx;
        doc.moveDown(0.12);
        return;
      }
      doc.fontSize(10).font('Helvetica').text(L, { width: contentW, lineGap: 2 });
      doc.moveDown(0.15);
    });

    function drawCustomerSigRow() {
      newPageIfNeeded(52);
      var y0 = doc.y + 6;
      doc.fontSize(10).font('Helvetica').fillColor('#111');
      doc.text('Customer signature:', margin, y0, { width: 118, lineBreak: false });
      var sigX = margin + 120;
      var sigY = y0 - 2;
      if (hasCustomerSig) {
        if (customerSignature.mode === 'drawn' && drawnPng) {
          try {
            doc.image(drawnPng, sigX, sigY, { fit: [130, 42], align: 'left', valign: 'top' });
          } catch (imgErr) {
            doc
              .font('Helvetica')
              .fontSize(9)
              .fillColor('#666')
              .text('(signature on file)', sigX, sigY + 12, { width: 130 });
          }
        } else {
          var typed = String(customerSignature.payload || '')
            .trim()
            .slice(0, 90);
          doc
            .font(hasMechFont ? 'CustSig' : 'Helvetica-Oblique')
            .fontSize(22)
            .fillColor('#1a1a1a')
            .text(typed, sigX, sigY + 2, { width: 260, lineBreak: false });
        }
      } else {
        doc
          .font('Helvetica')
          .fontSize(10)
          .fillColor('#111')
          .text('_____________________________________________', sigX, sigY + 10, { width: 260 });
      }
      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor('#555')
        .text('Date: ' + (hasCustomerSig ? signedDateStr : '_______________'), margin + 395, y0 + 4, {
          width: 160
        });
      doc.x = margin;
      doc.y = y0 + 46;
    }

    /**
     * Section bodies are not full Markdown: pdfkit only got one font block before.
     * We interpret common patterns: ### headings, - bullets, --- spacers, blank-line paragraphs.
     */
    function renderBodyChunkPlain(chunk) {
      var lines = (chunk || '').split('\n');
      var para = [];
      function flushPara() {
        if (!para.length) return;
        var joined = para
          .map(function (p) {
            return p.trim();
          })
          .filter(Boolean)
          .join(' ');
        if (joined) {
          newPageIfNeeded(48);
          doc.fontSize(10).font('Helvetica').fillColor('#111').text(joined, { width: contentW, lineGap: 3 });
          doc.moveDown(0.2);
        }
        para = [];
      }
      lines.forEach(function (raw) {
        var line = raw.trimEnd();
        var t = line.trim();
        if (!t) {
          flushPara();
          doc.moveDown(0.2);
          return;
        }
        if (/^###\s+/.test(line)) {
          flushPara();
          newPageIfNeeded(40);
          doc
            .fontSize(11)
            .font('Helvetica-Bold')
            .fillColor('#111')
            .text(line.replace(/^###\s+/, '').trim(), { width: contentW, lineGap: 2 });
          doc.moveDown(0.35);
          return;
        }
        if (/^##\s+/.test(line)) {
          flushPara();
          newPageIfNeeded(40);
          doc
            .fontSize(11)
            .font('Helvetica-Bold')
            .fillColor('#111')
            .text(line.replace(/^##\s+/, '').trim(), { width: contentW, lineGap: 2 });
          doc.moveDown(0.35);
          return;
        }
        if (/^---+\s*$/.test(t)) {
          flushPara();
          doc.moveDown(0.15);
          return;
        }
        if (/^\s*-\s+/.test(line)) {
          flushPara();
          var bullet = line.replace(/^\s*-\s+/, '').trim();
          newPageIfNeeded(32);
          doc.fontSize(10).font('Helvetica').fillColor('#111');
          var xSave = doc.x;
          doc.x = margin + 14;
          doc.text('\u2022  ' + bullet, { width: contentW - 14, lineGap: 2 });
          doc.x = xSave;
          doc.moveDown(0.12);
          return;
        }
        para.push(t);
      });
      flushPara();
    }

    function renderBodyWithSigMarkers(body) {
      if (!body || body.indexOf('[[CUSTOMER_SIG]]') === -1) {
        renderBodyChunkPlain(body || '');
        return;
      }
      var parts = body.split(/\[\[CUSTOMER_SIG\]\]/);
      for (var pi = 0; pi < parts.length; pi++) {
        var chunk = parts[pi];
        if (chunk) renderBodyChunkPlain(chunk);
        if (pi < parts.length - 1) {
          drawCustomerSigRow();
        }
      }
    }

    var lastIdx = parsed.sections.length - 1;
    var CUSTOMER_SIG_MARKER = '[[CUSTOMER_SIG]]';
    parsed.sections.forEach(function (sec, si) {
      doc.addPage();
      doc.y = margin;
      doc.fontSize(12).font('Helvetica-Bold').text(sec.heading, { width: contentW });
      doc.moveDown(0.5);
      var body = sec.body || '';
      if (si === lastIdx) {
        body = body.replace(/\n*\n*Mechanic Signature:[\s\S]*$/m, '').trim();
      }
      if (si === lastIdx) {
        var addendumText = String(releaseFields.addendum || '').trim();
        if (addendumText && body.indexOf(CUSTOMER_SIG_MARKER) !== -1) {
          var lastSigPos = body.lastIndexOf(CUSTOMER_SIG_MARKER);
          var beforeLastSig = body.slice(0, lastSigPos);
          var afterLastSig = body.slice(lastSigPos + CUSTOMER_SIG_MARKER.length);
          renderBodyWithSigMarkers(beforeLastSig);
          newPageIfNeeded(100);
          doc.moveDown(0.5);
          doc.fontSize(12).font('Helvetica-Bold').fillColor('#111').text('Addendum', { width: contentW });
          doc.moveDown(0.35);
          doc.fontSize(10).font('Helvetica').text(addendumText, { width: contentW, lineGap: 3 });
          doc.moveDown(0.5);
          drawCustomerSigRow();
          if (afterLastSig.trim()) {
            renderBodyChunkPlain(afterLastSig.trim());
          }
        } else {
          renderBodyWithSigMarkers(body);
          if (addendumText) {
            newPageIfNeeded(100);
            doc.moveDown(0.5);
            doc.fontSize(12).font('Helvetica-Bold').fillColor('#111').text('Addendum', { width: contentW });
            doc.moveDown(0.35);
            doc.fontSize(10).font('Helvetica').text(addendumText, { width: contentW, lineGap: 3 });
          }
        }
      } else {
        renderBodyWithSigMarkers(body);
      }
      if (si === lastIdx) {
        var sigY = doc.y + 20;
        if (sigY > 620) {
          doc.addPage();
          doc.y = margin;
          sigY = doc.y + 12;
        }
        doc.fontSize(10).font('Helvetica').fillColor('#111').text('Mechanic signature:', margin, sigY);
        sigY += 22;
        if (hasMechFont) {
          doc.font('MechSig').fontSize(30).fillColor('#1a1a1a').text('Hayden L Supple', margin, sigY);
        } else {
          doc.font('Helvetica-Oblique').fontSize(17).text('Hayden L Supple', margin, sigY);
        }
        doc
          .font('Helvetica')
          .fontSize(9)
          .fillColor('#555')
          .text(
            'Date: ' +
              new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              }),
            margin + 300,
            sigY + 10
          );
      }
    });

    doc.end();
  });
}

module.exports = {
  AGREEMENT_RELEASE_FIELD_SPEC: AGREEMENT_RELEASE_FIELD_SPEC,
  buildAgreementPdfBuffer: buildAgreementPdfBuffer,
  hasAgreementMarkdown: hasAgreementMarkdown,
  agreementTemplatePath: agreementTemplatePath,
  applyPlaceholders: applyPlaceholders,
  applyReleaseFieldPlaceholders: applyReleaseFieldPlaceholders,
  normalizeAgreementReleaseFields: normalizeAgreementReleaseFields,
  validateAgreementReleaseFieldsComplete: validateAgreementReleaseFieldsComplete,
  loadAgreementSource: loadAgreementSource
};
