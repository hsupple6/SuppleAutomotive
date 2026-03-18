/**
 * Build a professional invoice PDF from service + customer + vehicle + parts.
 * @returns {Promise<Buffer>}
 */
function buildInvoicePdfBuffer(opts) {
  return new Promise(function (resolve, reject) {
    var PDFDocument;
    try {
      PDFDocument = require('pdfkit');
    } catch (e) {
      return reject(new Error('PDF generation unavailable'));
    }
    var service = opts.service || {};
    var customer = opts.customer || {};
    var vehicle = opts.vehicle;
    var parts = opts.parts || [];
    var invoiceNumber = opts.invoiceNumber || 'DRAFT';

    var doc = new PDFDocument({ size: 'LETTER', margin: 50, info: { Title: 'Invoice ' + invoiceNumber } });
    var chunks = [];
    doc.on('data', function (c) { chunks.push(c); });
    doc.on('end', function () {
      resolve(Buffer.concat(chunks));
    });
    doc.on('error', reject);

    var pageW = 612;
    var margin = 50;
    var contentW = pageW - margin * 2;
    var rightX = pageW - margin;

    doc.fillColor('#0d0d0d');
    doc.fontSize(22).font('Helvetica-Bold').text('Supple Automotive', margin, 50);
    doc.fontSize(9).font('Helvetica').fillColor('#555555').text('Invoice', margin, 78);
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#0d0d0d').text(invoiceNumber, margin, 92);

    doc.fontSize(9).font('Helvetica').fillColor('#666666');
    var invDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    doc.text('Date: ' + invDate, rightX - 120, 50, { width: 120, align: 'right' });

    var y = 130;
    doc.moveTo(margin, y).lineTo(pageW - margin, y).strokeColor('#e0e0e0').lineWidth(1).stroke();
    y += 16;

    doc.fontSize(10).font('Helvetica-Bold').fillColor('#0d0d0d').text('Bill to', margin, y);
    y += 16;
    doc.font('Helvetica').fontSize(10).fillColor('#333333');
    doc.text((customer.name || 'Customer').trim(), margin, y);
    y += 14;
    var addr = [customer.address_line1, customer.address_line2, [customer.city, customer.state, customer.postal_code].filter(Boolean).join(', ')].filter(Boolean).join('\n');
    if (addr) {
      doc.text(addr, margin, y);
      y += addr.split('\n').length * 14;
    }
    if (customer.email) {
      doc.text(customer.email, margin, y);
      y += 14;
    }
    if (customer.phone) {
      doc.text(String(customer.phone), margin, y);
      y += 14;
    }

    y += 10;
    doc.font('Helvetica-Bold').text('Service / vehicle', margin, y);
    y += 14;
    doc.font('Helvetica');
    var vehLine = vehicle ? [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ') : '—';
    doc.text((service.service_name || 'Service') + ' · ' + vehLine, margin, y, { width: contentW });
    y += 22;

    var svcNotes = String(service.notes || '').trim();
    if (svcNotes) {
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#0d0d0d').text('Notes', margin, y);
      y += 12;
      doc.font('Helvetica').fontSize(9).fillColor('#444444');
      var notesH = doc.heightOfString(svcNotes, { width: contentW });
      doc.text(svcNotes, margin, y, { width: contentW, lineGap: 2 });
      y += Math.max(notesH, 14) + 10;
    } else {
      y += 6;
    }

    doc.rect(margin, y, contentW, 22).fill('#f5f5f5');
    doc.fillColor('#0d0d0d').font('Helvetica-Bold').fontSize(9);
    doc.text('Description', margin + 8, y + 7);
    doc.text('Qty', margin + 280, y + 7);
    doc.text('Unit', margin + 320, y + 7);
    doc.text('Amount', rightX - 80, y + 7, { width: 72, align: 'right' });
    y += 28;

    doc.font('Helvetica').fontSize(9).fillColor('#333333');

    function money(n) {
      return '$' + (Number(n) || 0).toFixed(2);
    }

    var labor = Number(service.service_price) || 0;
    var rowH = 20;
    doc.text((service.service_name || 'Labor / service').slice(0, 50), margin + 8, y);
    doc.text('1', margin + 280, y);
    doc.text(money(labor), margin + 320, y);
    doc.text(money(labor), rightX - 80, y, { width: 72, align: 'right' });
    y += rowH;

    parts.forEach(function (p) {
      var qty = Number(p.quantity) || 1;
      var unit = Number(p.unit_price) || 0;
      var lineTotal = Number(p.total_price) != null ? Number(p.total_price) : qty * unit;
      doc.fontSize(9).fillColor('#333333');
      doc.text((p.part_name || 'Part').slice(0, 45), margin + 8, y);
      doc.text(String(qty), margin + 280, y);
      doc.text(money(unit), margin + 320, y);
      doc.text(money(lineTotal), rightX - 80, y, { width: 72, align: 'right' });
      y += rowH;
      var partNotes = String(p.notes || '').trim();
      if (partNotes) {
        doc.fontSize(8).fillColor('#666666');
        var pnH = doc.heightOfString(partNotes, { width: 260 });
        doc.text(partNotes, margin + 12, y, { width: 260, lineGap: 1 });
        y += Math.max(pnH, 12) + 4;
        doc.fontSize(9).fillColor('#333333');
      }
    });

    var partsTotal = parts.reduce(function (s, p) {
      return s + Number(p.total_price != null ? p.total_price : (Number(p.quantity) || 1) * (Number(p.unit_price) || 0));
    }, 0);
    var grand = labor + partsTotal;

    y += 12;
    doc.moveTo(margin + 200, y).lineTo(rightX, y).strokeColor('#e0e0e0').stroke();
    y += 10;
    doc.font('Helvetica').text('Subtotal', rightX - 140, y);
    doc.text(money(grand), rightX - 80, y, { width: 72, align: 'right' });
    y += 16;
    doc.font('Helvetica-Bold').fontSize(11).text('Total due', rightX - 140, y);
    doc.text(money(grand), rightX - 80, y, { width: 72, align: 'right' });

    y += 40;
    doc.font('Helvetica').fontSize(8).fillColor('#888888');
    doc.text('Thank you for your business. Questions? Visit suppleautomotive.com', margin, y, { width: contentW, align: 'center' });

    doc.end();
  });
}

module.exports = { buildInvoicePdfBuffer };
