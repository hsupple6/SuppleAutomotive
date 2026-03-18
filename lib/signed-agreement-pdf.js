var { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

/**
 * Original agreement PDF + appended signature page (typed or drawn).
 */
function buildSignedAgreementPdf(originalBytes, options) {
  var mode = options.mode;
  var payload = options.payload || '';
  var customerName = options.customerName || '';
  var signedAtLabel = options.signedAtLabel || '';
  return PDFDocument.load(originalBytes).then(function (srcDoc) {
    return PDFDocument.create().then(function (outDoc) {
      var indices = srcDoc.getPageIndices();
      return outDoc.copyPages(srcDoc, indices).then(function (copiedPages) {
        copiedPages.forEach(function (p) {
          outDoc.addPage(p);
        });
        var page = outDoc.addPage([612, 792]);
        return outDoc.embedFont(StandardFonts.Helvetica).then(function (font) {
          var y = 770;
          page.drawText('Electronic signature — agreed and accepted', {
            x: 50,
            y: y,
            size: 12,
            font: font,
            color: rgb(0.12, 0.12, 0.12)
          });
          y -= 26;
          page.drawText('Signer (account name): ' + String(customerName).slice(0, 70), {
            x: 50,
            y: y,
            size: 10,
            font: font
          });
          y -= 20;
          page.drawText('Executed (UTC): ' + String(signedAtLabel).slice(0, 60), {
            x: 50,
            y: y,
            size: 10,
            font: font
          });
          y -= 32;
          if (mode === 'typed') {
            page.drawText('Signature (typed):', { x: 50, y: y, size: 10, font: font });
            y -= 22;
            page.drawText(String(payload).trim().slice(0, 120), {
              x: 50,
              y: y,
              size: 16,
              font: font
            });
            return outDoc.save();
          }
          var base64 = String(payload).replace(/^data:image\/png;base64,/, '').replace(/^data:image\/\w+;base64,/, '');
          var raw = Buffer.from(base64, 'base64');
          return outDoc
            .embedPng(raw)
            .then(function (png) {
              var maxW = 240;
              var sc = maxW / png.width;
              var h = png.height * sc;
              if (h > 100) {
                sc = 100 / png.height;
                h = 100;
              }
              var w = png.width * sc;
              page.drawText('Signature (drawn):', { x: 50, y: y, size: 10, font: font });
              y -= 110;
              page.drawImage(png, { x: 50, y: Math.max(72, y - h + 20), width: w, height: h });
              return outDoc.save();
            })
            .catch(function () {
              page.drawText('(Drawn signature on file in system records)', {
                x: 50,
                y: y - 20,
                size: 10,
                font: font,
                color: rgb(0.4, 0.4, 0.4)
              });
              return outDoc.save();
            });
        });
      });
    });
  });
}

module.exports = { buildSignedAgreementPdf: buildSignedAgreementPdf };
