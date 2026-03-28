(function () {
  'use strict';

  var EXPORT_SCALE = 4;

  /** Inline SVG avoids raster quirks in the export pipeline. */
  var qrSvgReady = (function () {
    var slot = document.querySelector('.card__back-qr-slot');
    if (!slot) {
      return Promise.resolve();
    }
    return fetch('/QR.svg', { cache: 'reload' })
      .then(function (res) {
        if (!res.ok) throw new Error('QR.svg HTTP ' + res.status);
        return res.text();
      })
      .then(function (svgText) {
        slot.innerHTML = svgText;
        var svg = slot.querySelector('svg');
        if (svg) {
          svg.setAttribute('class', 'card__back-qr-svg');
          svg.setAttribute('aria-hidden', 'true');
        }
      })
      .catch(function (err) {
        console.error('Could not load QR.svg:', err);
      });
  })();

  function downloadBlob(blob, filename) {
    if (!blob) return;
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  /** Let layout + webfonts settle; double rAF matches next paint. */
  function afterNextPaint() {
    return new Promise(function (resolve) {
      requestAnimationFrame(function () {
        requestAnimationFrame(resolve);
      });
    });
  }

  function exportCard(el, filename) {
    if (typeof htmlToImage === 'undefined' || !htmlToImage.toBlob) {
      window.alert('html-to-image failed to load.');
      return;
    }
    var wait = el.id === 'cardBack' ? qrSvgReady : Promise.resolve();
    wait
      .then(function () {
        return document.fonts.ready;
      })
      .then(function () {
        return afterNextPaint();
      })
      .then(function () {
        return htmlToImage.toBlob(el, {
          pixelRatio: EXPORT_SCALE,
          cacheBust: true,
          type: 'image/png',
          quality: 1,
        });
      })
      .then(function (blob) {
        downloadBlob(blob, filename);
      })
      .catch(function (err) {
        console.error(err);
        window.alert('Export failed: ' + (err && err.message ? err.message : String(err)));
      });
  }

  var front = document.getElementById('cardFront');
  var back = document.getElementById('cardBack');
  var btnFront = document.getElementById('btnFront');
  var btnBack = document.getElementById('btnBack');

  if (btnFront && front) {
    btnFront.addEventListener('click', function () {
      exportCard(front, 'supple-automotive-card-front.png');
    });
  }
  if (btnBack && back) {
    btnBack.addEventListener('click', function () {
      exportCard(back, 'supple-automotive-card-back.png');
    });
  }
})();
