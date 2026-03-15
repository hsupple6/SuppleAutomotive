(function () {
  'use strict';
  var fonts = [
    'Orbitron', 'Exo 2', 'Rajdhani', 'Audiowide', 'Russo One', 'Bebas Neue',
    'Oswald', 'Archivo Black', 'Teko', 'Share Tech', 'Lexend', 'Saira',
    'Staatliches', 'Barlow Condensed', 'Anton', 'Jura', 'Righteous',
    'Passion One', 'Black Ops One', 'Electrolize'
  ];
  var fontParam = fonts.map(function (f) { return 'family=' + encodeURIComponent(f + ':wght@400;700'); }).join('&');
  var link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?' + fontParam + '&display=swap';
  document.head.appendChild(link);

  var style = document.createElement('style');
  style.textContent = [
    '.supple-font-widget{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;z-index:9999;background:rgba(0,0,0,.4);overflow:auto;padding:24px;box-sizing:border-box;}',
    '.supple-font-widget__inner{background:#111;color:#eee;padding:32px 40px;border-radius:12px;max-width:560px;width:100%;max-height:90vh;overflow:auto;box-shadow:0 8px 40px rgba(0,0,0,.6);}',
    '.supple-font-widget__title{margin-bottom:20px;font-family:system-ui;font-size:12px;opacity:.7;text-transform:uppercase;letter-spacing:.1em;}',
    '.supple-font-widget__item{margin-bottom:20px;}',
    '.supple-font-widget__line{display:block;font-size:22px;line-height:1.2;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
    '.supple-font-widget__name{font-family:system-ui,sans-serif;font-size:11px;opacity:.6;}'
  ].join('');
  document.head.appendChild(style);

  var wrap = document.createElement('div');
  wrap.className = 'supple-font-widget';
  wrap.setAttribute('aria-label', 'Font examples');
  var inner = document.createElement('div');
  inner.className = 'supple-font-widget__inner';
  var title = document.createElement('div');
  title.className = 'supple-font-widget__title';
  title.textContent = 'Supple Automotive';
  inner.appendChild(title);

  fonts.forEach(function (font) {
    var item = document.createElement('div');
    item.className = 'supple-font-widget__item';
    var line = document.createElement('div');
    line.className = 'supple-font-widget__line';
    line.style.fontFamily = "'" + font.replace(/'/g, "\\'") + "', sans-serif";
    line.textContent = 'Supple Automotive';
    var name = document.createElement('div');
    name.className = 'supple-font-widget__name';
    name.textContent = font;
    item.appendChild(line);
    item.appendChild(name);
    inner.appendChild(item);
  });

  wrap.appendChild(inner);
  document.body.appendChild(wrap);
})();
