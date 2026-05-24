(function (global) {
  'use strict';

  function blobToBase64(blob) {
    return blob.arrayBuffer().then(function (buf) {
      var bytes = new Uint8Array(buf);
      var chunks = [];
      var chunkSize = 0x8000;
      for (var i = 0; i < bytes.length; i += chunkSize) {
        chunks.push(String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize)));
      }
      return btoa(chunks.join(''));
    });
  }

  function saveCustomerFile(opts) {
    opts = opts || {};
    return blobToBase64(opts.blob).then(function (base64) {
      return fetch('/supplecontrols/api/export/save-customer-file', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentType: opts.documentType,
          customer: opts.customer,
          invoiceNumber: opts.invoiceNumber || '',
          extension: opts.extension,
          pageSuffix: opts.pageSuffix || '',
          suffix: opts.suffix || '',
          contentBase64: base64
        })
      }).then(function (r) {
        return r.json().then(function (d) {
          if (!r.ok) throw new Error((d && d.error) || 'Could not save export file');
          return d;
        });
      });
    });
  }

  function saveToastMessage(data, fallback) {
    if (data && data.displayPath) {
      return 'Saved to ' + data.displayPath;
    }
    return fallback || 'Export saved.';
  }

  function readPreviewExportHeaders(response) {
    if (!response || !response.headers) return null;
    var exportPath = response.headers.get('X-Customer-Export-Path');
    var filename = response.headers.get('X-Customer-Export-Filename');
    var displayPath = response.headers.get('X-Customer-Export-Display-Path');
    if (!exportPath && !filename) return null;
    return { path: exportPath, filename: filename, displayPath: displayPath || exportPath };
  }

  function exportPdfPreviewPngPages(opts) {
    opts = opts || {};
    var previewBlob = opts.previewBlob;
    var documentType = opts.documentType;
    var customer = opts.customer;
    var downloadBlob = opts.downloadBlob;
    var pdfjsLib = global.pdfjsLib;

    if (!previewBlob || !pdfjsLib) {
      return Promise.reject(new Error('Generate a preview first.'));
    }

    return previewBlob.arrayBuffer().then(function (buf) {
      return pdfjsLib.getDocument({ data: buf }).promise;
    }).then(function (pdf) {
      var scale = 2;
      var pagePromises = [];
      for (var p = 1; p <= pdf.numPages; p++) {
        (function (pageNum) {
          pagePromises.push(
            pdf.getPage(pageNum).then(function (page) {
              var viewport = page.getViewport({ scale: scale });
              var canvas = document.createElement('canvas');
              canvas.width = viewport.width;
              canvas.height = viewport.height;
              return page.render({
                canvasContext: canvas.getContext('2d'),
                viewport: viewport
              }).promise.then(function () {
                return canvas;
              });
            })
          );
        })(p);
      }
      return Promise.all(pagePromises);
    }).then(function (canvases) {
      if (!canvases.length) throw new Error('No pages to export');
      var totalPages = canvases.length;
      var lastSaved = null;
      var chain = Promise.resolve();
      canvases.forEach(function (canvas, idx) {
        chain = chain.then(function () {
          return new Promise(function (resolve) {
            canvas.toBlob(function (blob) {
              if (!blob) {
                resolve();
                return;
              }
              var pageSuffix = totalPages > 1 ? '-page-' + (idx + 1) + '-of-' + totalPages : '';
              saveCustomerFile({
                documentType: documentType,
                customer: customer,
                invoiceNumber: opts.invoiceNumber || '',
                extension: 'png',
                pageSuffix: pageSuffix,
                blob: blob
              }).then(function (saved) {
                lastSaved = saved;
                if (typeof downloadBlob === 'function') {
                  downloadBlob(blob, saved.filename);
                }
                resolve(saved);
              }).catch(resolve);
            }, 'image/png');
          });
        });
      });
      return chain.then(function () {
        return { totalPages: totalPages, lastSaved: lastSaved };
      });
    });
  }

  global.SuppleCustomerExport = {
    saveCustomerFile: saveCustomerFile,
    saveToastMessage: saveToastMessage,
    readPreviewExportHeaders: readPreviewExportHeaders,
    exportPdfPreviewPngPages: exportPdfPreviewPngPages
  };
})(window);
