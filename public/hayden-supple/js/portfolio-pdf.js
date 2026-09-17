/**
 * Generate a multi-page portfolio PDF from the live page.
 */
(function () {
  'use strict';

  var JSPDF_SOURCES = [
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.2/jspdf.umd.min.js',
    'https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js',
    'https://unpkg.com/jspdf@2.5.2/dist/jspdf.umd.min.js'
  ];

  function getJsPdfCtor() {
    if (window.jspdf && typeof window.jspdf.jsPDF === 'function') return window.jspdf.jsPDF;
    if (typeof window.jsPDF === 'function') return window.jsPDF;
    return null;
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = function () { resolve(); };
      script.onerror = function () { reject(new Error('Failed ' + src)); };
      document.head.appendChild(script);
    });
  }

  function loadJsPdf() {
    var existing = getJsPdfCtor();
    if (existing) return Promise.resolve(existing);

    function next(i) {
      if (i >= JSPDF_SOURCES.length) {
        return Promise.reject(new Error('Could not load PDF library'));
      }
      return loadScript(JSPDF_SOURCES[i]).then(function () {
        var ctor = getJsPdfCtor();
        if (ctor) return ctor;
        return next(i + 1);
      }).catch(function () {
        return next(i + 1);
      });
    }

    return next(0);
  }

  function cleanText(value) {
    return String(value || '')
      .replace(/\u00a0/g, ' ')
      .replace(/[\u2013\u2014\u2212]/g, '-')
      .replace(/[\u2018\u2019\u2032]/g, "'")
      .replace(/[\u201c\u201d]/g, '"')
      .replace(/\u2022/g, '-')
      .replace(/\u2026/g, '...')
      .replace(/\u2122/g, 'TM')
      .replace(/[^\x09\x0a\x0d\x20-\x7e\xa0-\xff]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function readableText(el) {
    if (!el) return '';
    var clone = el.cloneNode(true);
    Array.prototype.forEach.call(clone.querySelectorAll('.split-element'), function (div) {
      div.appendChild(document.createTextNode(' '));
    });
    Array.prototype.forEach.call(clone.querySelectorAll('br'), function (br) {
      br.parentNode.replaceChild(document.createTextNode(' '), br);
    });
    return cleanText(clone.textContent);
  }

  function textsOf(nodeList) {
    return Array.prototype.slice.call(nodeList || []).map(readableText).filter(Boolean);
  }

  function metaText(el) {
    if (!el) return '';
    var spans = [];
    var node = el.firstElementChild;
    while (node) {
      if (node.tagName === 'SPAN') spans.push(node);
      node = node.nextElementSibling;
    }
    if (spans.length) {
      return spans.map(readableText).filter(Boolean).join('  |  ');
    }
    return readableText(el);
  }

  function mediaSize(el) {
    if (!el) return { w: 0, h: 0 };
    if (el.tagName === 'VIDEO') return { w: el.videoWidth || 0, h: el.videoHeight || 0 };
    if (el.tagName === 'CANVAS') return { w: el.width || 0, h: el.height || 0 };
    return { w: el.naturalWidth || el.width || 0, h: el.naturalHeight || el.height || 0 };
  }

  function parsePos(token, fallback) {
    if (!token) return fallback;
    if (token === 'center') return 0.5;
    if (token === 'left' || token === 'top') return 0;
    if (token === 'right' || token === 'bottom') return 1;
    if (/%$/.test(token)) return Math.min(1, Math.max(0, parseFloat(token) / 100));
    return fallback;
  }

  function objectPos(el) {
    var style = window.getComputedStyle(el);
    var parts = String(style.objectPosition || '50% 50%').split(/\s+/);
    return {
      x: parsePos(parts[0], 0.5),
      y: parsePos(parts[1] || parts[0], 0.5)
    };
  }

  function mediaFrom(el, posEl) {
    var size = mediaSize(el);
    if (size.w < 8 || size.h < 8) return null;
    var pos = objectPos(posEl || el);
    return { el: el, posX: pos.x, posY: pos.y };
  }

  function loadImageCopy(el) {
    return new Promise(function (resolve) {
      var src = el.currentSrc || el.getAttribute('src');
      if (!src) return resolve(mediaFrom(el));
      var img = new Image();
      var done = false;
      function finish(node) {
        if (done) return;
        done = true;
        resolve(mediaFrom(node, el) || mediaFrom(el));
      }
      img.onload = function () { finish(img); };
      img.onerror = function () { finish(el); };
      img.src = src;
      if (img.complete && img.naturalWidth > 8) finish(img);
      setTimeout(function () {
        finish(img.naturalWidth > 8 ? img : el);
      }, 8000);
    });
  }

  function waitForVideo(el, timeoutMs) {
    return new Promise(function (resolve) {
      var finished = false;
      function done() {
        if (finished) return;
        finished = true;
        resolve(mediaFrom(el));
      }
      if (mediaSize(el).w > 8) return done();
      el.addEventListener('loadeddata', done, { once: true });
      el.addEventListener('error', done, { once: true });
      try { el.load(); } catch (err) {}
      setTimeout(done, timeoutMs || 4000);
    });
  }

  function collectMediaAsync(root, maxCount) {
    maxCount = maxCount || 3;
    if (!root) return Promise.resolve([]);
    var imgs = Array.prototype.slice.call(root.querySelectorAll('img'));
    var videos = Array.prototype.slice.call(root.querySelectorAll('video'));
    var nodes = (imgs.length ? imgs : videos).slice(0, maxCount);
    return Promise.all(nodes.map(function (el) {
      return el.tagName === 'IMG' ? loadImageCopy(el) : waitForVideo(el);
    })).then(function (list) {
      return list.filter(Boolean);
    });
  }

  var IMAGE_OPTS = { quality: 0.5, pxPerMm: 4, maxPx: 780 };

  function captureHeroFrame() {
    return new Promise(function (resolve) {
      var img = new Image();
      var done = false;
      function finish(media) {
        if (done) return;
        done = true;
        resolve(media);
      }
      img.onload = function () { finish(mediaFrom(img)); };
      img.onerror = function () { finish(null); };
      img.src = 'ASCII/frame-1.jpg';
      if (img.complete && img.naturalWidth > 8) finish(mediaFrom(img));
      setTimeout(function () {
        finish(img.naturalWidth > 8 ? mediaFrom(img) : null);
      }, 4000);
    });
  }

  function rasterJpeg(media, destWmm, destHmm, mode) {
    if (!media || !media.el) return null;
    var size = mediaSize(media.el);
    if (size.w < 8 || size.h < 8) return null;
    try {
      var pxW = Math.max(2, Math.min(IMAGE_OPTS.maxPx, Math.round(destWmm * IMAGE_OPTS.pxPerMm)));
      var pxH = Math.max(2, Math.min(IMAGE_OPTS.maxPx, Math.round(destHmm * IMAGE_OPTS.pxPerMm)));
      var canvas = document.createElement('canvas');
      canvas.width = pxW;
      canvas.height = pxH;
      var ctx = canvas.getContext('2d');
      ctx.fillStyle = '#111111';
      ctx.fillRect(0, 0, pxW, pxH);

      var radius = Math.min(16, pxW * 0.016, pxH * 0.04);
      ctx.beginPath();
      ctx.moveTo(radius, 0);
      ctx.arcTo(pxW, 0, pxW, pxH, radius);
      ctx.arcTo(pxW, pxH, 0, pxH, radius);
      ctx.arcTo(0, pxH, 0, 0, radius);
      ctx.arcTo(0, 0, pxW, 0, radius);
      ctx.closePath();
      ctx.clip();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      if (mode === 'contain') {
        var scale = Math.min(pxW / size.w, pxH / size.h);
        var dw = size.w * scale;
        var dh = size.h * scale;
        ctx.drawImage(media.el, 0, 0, size.w, size.h, (pxW - dw) / 2, (pxH - dh) / 2, dw, dh);
      } else {
        var srcRatio = size.w / size.h;
        var destRatio = pxW / pxH;
        var sx;
        var sy;
        var sw;
        var sh;
        if (srcRatio > destRatio) {
          sh = size.h;
          sw = sh * destRatio;
          sx = (size.w - sw) * (media.posX != null ? media.posX : 0.5);
          sy = 0;
        } else {
          sw = size.w;
          sh = sw / destRatio;
          sx = 0;
          sy = (size.h - sh) * (media.posY != null ? media.posY : 0.5);
        }
        ctx.drawImage(media.el, sx, sy, sw, sh, 0, 0, pxW, pxH);
      }
      return canvas.toDataURL('image/jpeg', IMAGE_OPTS.quality);
    } catch (err) {
      return null;
    }
  }

  function liveSite(config) {
    if (config.site) return cleanText(String(config.site).replace(/^https?:\/\//, '').replace(/\/$/, ''));
    var host = window.location && window.location.hostname;
    if (!host || host === 'localhost' || host === '127.0.0.1') return '';
    var origin = window.location.origin.replace(/^https?:\/\//, '');
    if (window.location.pathname.indexOf('/hayden-supple') === 0) return origin + '/hayden-supple';
    return origin;
  }

  function collectAsync() {
    var config = window.HAYDEN_CONFIG || {};
    var blocks = Array.prototype.slice.call(document.querySelectorAll('.block-entry'));
    var hobbyPanels = Array.prototype.slice.call(document.querySelectorAll('.hobby-panel'));

    var entryJobs = blocks.map(function (block) {
      return collectMediaAsync(block.querySelector('.image-stack') || block, 3);
    });
    var hobbyJobs = hobbyPanels.map(function (panel) {
      return collectMediaAsync(panel, 1);
    });
    var eduJob = collectMediaAsync(document.querySelector('.image-stack--education'), 1);
    var heroJob = captureHeroFrame();

    return Promise.all([Promise.all(entryJobs), Promise.all(hobbyJobs), eduJob, heroJob]).then(function (results) {
      var entryMedia = results[0];
      var hobbyMedia = results[1];
      var educationMedia = results[2];
      var heroFrame = results[3];
      var edu = config.education || {};
      var skills = config.skills || {};

      var entries = blocks.map(function (block, i) {
        var copy = block.querySelector('.entry-copy') || block;
        return {
          dates: metaText(copy.querySelector('.entry-meta')),
          title: readableText(copy.querySelector('.entry-title')),
          subtitle: readableText(copy.querySelector('.entry-subtitle')),
          problems: textsOf(copy.querySelectorAll('.entry-problem')),
          solution: readableText(copy.querySelector('.entry-solution')),
          bullets: textsOf(copy.querySelectorAll('.entry-bullets li')),
          tags: textsOf(copy.querySelectorAll('.entry-tag')),
          media: entryMedia[i] || []
        };
      }).filter(function (entry) { return entry.title; });

      var hobbies = hobbyPanels.map(function (panel, i) {
        return {
          overline: readableText(panel.querySelector('.hobby-overline')),
          title: readableText(panel.querySelector('.hobby-title')),
          body: readableText(panel.querySelector('.hobby-body')),
          media: hobbyMedia[i] || []
        };
      }).filter(function (item) { return item.title; });

      var leadership = Array.prototype.slice.call(document.querySelectorAll('.leadership-milestone')).map(function (item) {
        return {
          title: readableText(item.querySelector('.leadership-milestone-title')),
          date: readableText(item.querySelector('.leadership-milestone-date')),
          body: readableText(item.querySelector('.leadership-milestone-bio'))
        };
      }).filter(function (item) { return item.title; });

      return {
        name: cleanText(config.name || 'Hayden Supple'),
        title: cleanText(config.title || 'Mechanical Engineer'),
        tagline: readableText(document.querySelector('.hero-tagline')) || cleanText(config.tagline),
        email: cleanText(config.email || readableText(document.getElementById('contactEmail'))),
        phone: cleanText(config.phone || readableText(document.getElementById('contactPhone'))),
        linkedin: cleanText(config.linkedin),
        site: liveSite(config),
        education: {
          school: cleanText(edu.school),
          degree: cleanText(edu.degree),
          location: cleanText(edu.location),
          dates: cleanText(edu.dates),
          gpa: cleanText(edu.gpa)
        },
        educationMedia: educationMedia,
        skills: {
          programming: (skills.programming || []).map(cleanText).filter(Boolean),
          mechanical: (skills.mechanical || []).map(cleanText).filter(Boolean)
        },
        leadershipTitle: readableText(document.querySelector('.leadership-title')),
        leadershipOrg: readableText(document.querySelector('.leadership-header .entry-subtitle')),
        leadershipMeta: metaText(document.querySelector('.leadership-meta')),
        leadership: leadership,
        entries: entries,
        hobbies: hobbies,
        heroFrame: heroFrame,
        year: String(new Date().getFullYear())
      };
    });
  }

  function buildPdf(JsPDF, data) {
    var doc = new JsPDF({ unit: 'mm', format: 'letter', compress: true });
    var pageW = 215.9;
    var pageH = 279.4;
    var m = 18;
    var innerW = pageW - m * 2;
    var y = m;
    var accent = [56, 189, 248];
    var bg = [10, 10, 10];
    var muted = [148, 148, 148];
    var text = [245, 245, 245];
    var rule = [40, 40, 40];

    function pad2(n) {
      n = String(n);
      return n.length < 2 ? '0' + n : n;
    }

    function wrap(str, width) {
      str = cleanText(str);
      if (!str) return [];
      width = width == null ? innerW : width;
      var words = str.split(' ');
      var lines = [];
      var line = '';
      var i;
      for (i = 0; i < words.length; i++) {
        var word = words[i];
        var test = line ? line + ' ' + word : word;
        if (doc.getTextWidth(test) <= width) {
          line = test;
        } else {
          if (line) lines.push(line);
          if (doc.getTextWidth(word) > width) {
            var chunk = '';
            var c;
            for (c = 0; c < word.length; c++) {
              if (doc.getTextWidth(chunk + word[c]) > width && chunk) {
                lines.push(chunk);
                chunk = word[c];
              } else {
                chunk += word[c];
              }
            }
            line = chunk;
          } else {
            line = word;
          }
        }
      }
      if (line) lines.push(line);
      return lines;
    }

    function paint() {
      doc.setFillColor(bg[0], bg[1], bg[2]);
      doc.rect(0, 0, pageW, pageH, 'F');
      doc.setFillColor(accent[0], accent[1], accent[2]);
      doc.rect(0, 0, 2.2, pageH, 'F');
    }

    function footerAll() {
      var total = doc.getNumberOfPages();
      var i;
      var site = data.site || '';
      for (i = 1; i <= total; i++) {
        doc.setPage(i);
        doc.setDrawColor(rule[0], rule[1], rule[2]);
        doc.setLineWidth(0.2);
        doc.line(m, pageH - 12, m + innerW, pageH - 12);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(muted[0], muted[1], muted[2]);
        doc.text(cleanText(data.name.toUpperCase()) + (site ? '  |  ' + site : '  |  PORTFOLIO'), m, pageH - 7);
        doc.text(pad2(i) + '  /  ' + pad2(total), m + innerW, pageH - 7, { align: 'right' });
      }
    }

    function addPage() {
      doc.addPage();
      paint();
      y = m + 2;
    }

    function need(h) {
      if (y + h > pageH - 18) addPage();
    }

    function setMuted(size) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(size || 9);
      doc.setTextColor(muted[0], muted[1], muted[2]);
    }

    function setBody(size) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(size || 10.5);
      doc.setTextColor(text[0], text[1], text[2]);
    }

    function setBold(size) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(size || 12);
      doc.setTextColor(text[0], text[1], text[2]);
    }

    function kicker(label) {
      need(10);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(accent[0], accent[1], accent[2]);
      doc.text(cleanText(label).toUpperCase(), m, y);
      y += 6.5;
    }

    function paragraph(str, size, color, width) {
      str = cleanText(str);
      if (!str) return;
      width = width || innerW;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(size || 10.5);
      var lines = wrap(str, width);
      var lineH = (size || 10.5) * 0.4;
      need(lines.length * lineH + 2);
      if (color) doc.setTextColor(color[0], color[1], color[2]);
      else doc.setTextColor(text[0], text[1], text[2]);
      doc.text(lines, m, y);
      y += lines.length * lineH + 2.8;
    }

    function drawMedia(media, x, boxY, w, h, mode) {
      var dataUrl = rasterJpeg(media, w, h, mode || 'cover');
      if (!dataUrl) return false;
      doc.setFillColor(17, 17, 17);
      doc.roundedRect(x, boxY, w, h, 2, 2, 'F');
      try {
        doc.addImage(dataUrl, 'JPEG', x, boxY, w, h, undefined, 'FAST');
      } catch (err) {
        return false;
      }
      doc.setDrawColor(38, 38, 38);
      doc.setLineWidth(0.18);
      doc.roundedRect(x, boxY, w, h, 2, 2, 'S');
      return true;
    }

    function addGallery(mediaList) {
      if (!mediaList || !mediaList.length) return;
      var gap = 2.4;
      var w = innerW;
      var n = Math.min(mediaList.length, 3);
      var h;
      if (n === 1) {
        var size = mediaSize(mediaList[0].el);
        var ratio = size.w / Math.max(1, size.h);
        var boxW = w;
        var boxH;
        if (ratio >= 1.35) {
          boxH = Math.min(78, boxW / ratio);
          h = boxH;
          need(h + 6);
          drawMedia(mediaList[0], m, y, boxW, h, 'contain');
        } else {
          h = Math.min(88, 72);
          boxW = Math.min(w, h * ratio);
          need(h + 6);
          drawMedia(mediaList[0], m + (w - boxW) / 2, y, boxW, h, 'contain');
        }
        y += h + 7;
        return;
      }
      if (n === 2) {
        var tw = (w - gap) / 2;
        h = tw * 0.7;
        need(h + 6);
        drawMedia(mediaList[0], m, y, tw, h, 'cover');
        drawMedia(mediaList[1], m + tw + gap, y, tw, h, 'cover');
        y += h + 7;
        return;
      }
      var leadW = w * 0.62;
      var sideW = w - leadW - gap;
      h = Math.max(60, leadW * 0.7);
      var half = (h - gap) / 2;
      need(h + 6);
      drawMedia(mediaList[0], m, y, leadW, h, 'cover');
      drawMedia(mediaList[1], m + leadW + gap, y, sideW, half, 'cover');
      drawMedia(mediaList[2], m + leadW + gap, y + half + gap, sideW, half, 'cover');
      y += h + 7;
    }

    function writeLink(label, url, size) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(size || 10);
      doc.setTextColor(muted[0], muted[1], muted[2]);
      if (url && typeof doc.textWithLink === 'function') {
        doc.textWithLink(label, m, y, { url: url });
      } else {
        doc.text(label, m, y);
      }
    }

    paint();

    y = 38;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(accent[0], accent[1], accent[2]);
    doc.text('PORTFOLIO  |  ' + data.year, m, y);

    y = 68;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(34);
    doc.setTextColor(255, 255, 255);
    doc.text(wrap(data.name, innerW), m, y);
    y += 16;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(13);
    doc.setTextColor(accent[0], accent[1], accent[2]);
    doc.text(data.title, m, y);
    y += 10;

    if (data.tagline) {
      setMuted(11);
      var tagLines = wrap(data.tagline, innerW * 0.78);
      doc.text(tagLines, m, y);
      y += tagLines.length * 5.6 + 10;
    }

    var nowBits = [];
    data.entries.forEach(function (entry, idx) {
      if (idx >= 3 && entry.subtitle) nowBits.push(entry.subtitle.split('|')[0].trim());
    });
    if (data.education.school) nowBits.push(data.education.school);
    if (nowBits.length) {
      setMuted(9);
      doc.text(wrap(nowBits.join('   |   '), innerW), m, y);
      y += 10;
    }

    doc.setDrawColor(accent[0], accent[1], accent[2]);
    doc.setLineWidth(0.4);
    doc.line(m, y, m + 26, y);
    y += 12;

    setMuted(9.5);
    var contactBits = [data.email, data.phone].filter(Boolean);
    doc.text(contactBits.join('   |   '), m, y);
    y += 7;
    if (data.linkedin) {
      writeLink(data.linkedin.replace(/^https?:\/\//, ''), data.linkedin, 9.5);
      y += 7;
    }
    if (data.site) {
      writeLink(data.site, /^https?:\/\//.test(data.site) ? data.site : 'https://' + data.site, 9.5);
      y += 7;
    }

    if (data.heroFrame) {
      var heroH = 112;
      var heroY = pageH - 16 - heroH;
      if (heroY > y + 10) {
        drawMedia(data.heroFrame, m, heroY, innerW, heroH, 'cover');
      }
    }

    data.entries.forEach(function (entry, index) {
      addPage();
      kicker(index < 3 ? 'Project' : 'Experience');
      setBold(17);
      var titleLines = wrap(entry.title, innerW);
      doc.text(titleLines, m, y);
      y += titleLines.length * 6.8 + 2.5;
      if (entry.subtitle) {
        setMuted(10);
        doc.text(wrap(entry.subtitle, innerW), m, y);
        y += 5;
      }
      if (entry.dates) {
        setMuted(9);
        doc.text(wrap(entry.dates, innerW), m, y);
        y += 6.5;
      }
      addGallery(entry.media);
      if (entry.problems.length) {
        setBold(8);
        doc.setTextColor(accent[0], accent[1], accent[2]);
        doc.text('PROBLEM', m, y);
        y += 5;
        entry.problems.forEach(function (p) { paragraph(p, 10, muted); });
      }
      if (entry.solution) {
        setBold(8);
        doc.setTextColor(accent[0], accent[1], accent[2]);
        doc.text('SOLUTION', m, y);
        y += 5;
        paragraph(entry.solution, 10, text);
      }
      if (entry.bullets.length) {
        setBold(8);
        doc.setTextColor(accent[0], accent[1], accent[2]);
        doc.text('ENGINEERING', m, y);
        y += 5.5;
        entry.bullets.forEach(function (bullet) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
          var lines = wrap(bullet, innerW - 7);
          var lineH = 4.2;
          need(lines.length * lineH + 2);
          doc.setFillColor(accent[0], accent[1], accent[2]);
          doc.circle(m + 1.2, y - 1.1, 0.65, 'F');
          setBody(10);
          doc.text(lines, m + 6, y);
          y += lines.length * lineH + 1.8;
        });
      }
      if (entry.tags.length) {
        y += 2;
        need(8);
        setMuted(8);
        doc.text(wrap(entry.tags.join('  |  '), innerW), m, y);
        y += 5;
      }
    });

    addPage();
    kicker('Education');
    setBold(17);
    doc.text(data.education.degree || 'B.S. Mechanical Engineering', m, y);
    y += 7;
    setMuted(10.5);
    doc.text(wrap((data.education.school || 'Purdue University') + (data.education.gpa ? '  |  GPA ' + data.education.gpa : ''), innerW), m, y);
    y += 5.5;
    doc.text(wrap([data.education.location, data.education.dates].filter(Boolean).join('  |  '), innerW), m, y);
    y += 7;
    if (data.educationMedia && data.educationMedia.length) {
      addGallery(data.educationMedia);
    }

    if (data.leadershipTitle) {
      kicker('Leadership');
      setBold(15);
      var leadLines = wrap(data.leadershipTitle, innerW);
      doc.text(leadLines, m, y);
      y += leadLines.length * 6.2 + 2.5;
      if (data.leadershipOrg) {
        setMuted(10);
        doc.text(data.leadershipOrg, m, y);
        y += 4.5;
      }
      if (data.leadershipMeta) {
        setMuted(9);
        doc.text(wrap(data.leadershipMeta, innerW), m, y);
        y += 7;
      }
      data.leadership.forEach(function (item) {
        need(20);
        setBold(11.5);
        doc.text(wrap(item.title, innerW), m, y);
        y += 5;
        if (item.date) {
          setMuted(9);
          doc.text(wrap(item.date, innerW), m, y);
          y += 4.5;
        }
        if (item.body) paragraph(item.body, 10, muted);
        y += 1.5;
      });
    }

    var prog = data.skills.programming || [];
    var mech = data.skills.mechanical || [];
    if (prog.length || mech.length) {
      y += 4;
      need(28);
      kicker('Technical Skills');
      if (prog.length) {
        setBold(8);
        doc.setTextColor(accent[0], accent[1], accent[2]);
        doc.text('PROGRAMMING & SOFTWARE', m, y);
        y += 5;
        paragraph(prog.join('  |  '), 10.5, text);
      }
      if (mech.length) {
        setBold(8);
        doc.setTextColor(accent[0], accent[1], accent[2]);
        doc.text('MECHANICAL & ELECTRONICS', m, y);
        y += 5;
        paragraph(mech.join('  |  '), 10.5, text);
      }
    }

    if (data.hobbies.length) {
      addPage();
      kicker('About');
      setBold(17);
      doc.text('Beyond Engineering', m, y);
      y += 9;

      var gap = 4;
      var colW = (innerW - gap) / 2;
      var imgH = colW * 0.62;
      var colX = [m, m + colW + gap];
      var rowY = y;
      var rowBottom = y;

      data.hobbies.forEach(function (hobby, i) {
        var col = i % 2;
        if (col === 0 && i > 0) {
          y = rowBottom + 7;
          rowY = y;
        }
        var x = colX[col];
        var cursor = rowY;
        if (cursor + imgH + 26 > pageH - 18) {
          addPage();
          rowY = y;
          cursor = y;
        }
        if (hobby.media && hobby.media[0]) {
          drawMedia(hobby.media[0], x, cursor, colW, imgH, 'cover');
          cursor += imgH + 4.5;
        }
        if (hobby.overline) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7.5);
          doc.setTextColor(accent[0], accent[1], accent[2]);
          doc.text(cleanText(hobby.overline).toUpperCase(), x, cursor);
          cursor += 4.5;
        }
        setBold(11.5);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11.5);
        var hobbyTitle = wrap(hobby.title, colW);
        doc.text(hobbyTitle, x, cursor);
        cursor += hobbyTitle.length * 4.8 + 2;
        if (hobby.body) {
          setMuted(8.5);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8.5);
          var bodyLines = wrap(hobby.body, colW);
          doc.text(bodyLines, x, cursor);
          cursor += bodyLines.length * 3.7 + 2;
        }
        if (cursor > rowBottom) rowBottom = cursor;
        if (col === 1 || i === data.hobbies.length - 1) y = rowBottom;
      });
    }

    addPage();
    y = 70;
    kicker('Contact');
    y += 10;
    setBold(28);
    doc.text("Let's build.", m, y);
    y += 18;
    setMuted(12);
    if (data.email) {
      writeLink(data.email, 'mailto:' + data.email, 12);
      y += 8;
    }
    if (data.phone) {
      doc.text(data.phone, m, y);
      y += 8;
    }
    if (data.linkedin) {
      writeLink(data.linkedin.replace(/^https?:\/\//, ''), data.linkedin, 12);
      y += 8;
    }
    if (data.site) {
      writeLink(data.site, /^https?:\/\//.test(data.site) ? data.site : 'https://' + data.site, 12);
      y += 8;
    }
    y += 8;
    doc.setDrawColor(accent[0], accent[1], accent[2]);
    doc.setLineWidth(0.4);
    doc.line(m, y, m + 26, y);
    y += 10;
    setMuted(10);
    doc.text(wrap('Open to internships, collaborations, and interesting problems.', innerW), m, y);

    footerAll();
    return doc;
  }

  function savePortfolio(JsPDF, data) {
    var presets = [
      { quality: 0.5, pxPerMm: 4, maxPx: 780 },
      { quality: 0.42, pxPerMm: 3.4, maxPx: 640 },
      { quality: 0.34, pxPerMm: 2.9, maxPx: 520 },
      { quality: 0.26, pxPerMm: 2.4, maxPx: 420 }
    ];
    var filename = data.name.replace(/\s+/g, '_') + '_Portfolio.pdf';
    var i;
    var doc;
    var bytes;
    for (i = 0; i < presets.length; i++) {
      IMAGE_OPTS = presets[i];
      doc = buildPdf(JsPDF, data);
      bytes = doc.output('arraybuffer');
      if (bytes.byteLength < 1000 * 1024) break;
    }
    doc.save(filename);
  }

  function setBusy(btn, busy) {
    if (!btn) return;
    var label = btn.querySelector('.link-cta-label');
    btn.disabled = busy;
    if (label) label.textContent = busy ? 'Building PDF…' : 'Download Portfolio';
  }

  function init() {
    var btn = document.getElementById('portfolioPdfBtn');
    if (!btn) return;
    loadJsPdf().catch(function () {});
    btn.addEventListener('click', function () {
      if (btn.disabled) return;
      setBusy(btn, true);
      loadJsPdf()
        .then(function (JsPDF) {
          if (typeof JsPDF !== 'function') {
            throw new Error('PDF library missing');
          }
          return collectAsync().then(function (data) {
            savePortfolio(JsPDF, data);
          });
        })
        .catch(function (err) {
          console.error(err);
          window.alert('Could not build the portfolio PDF. Check your connection and try again.');
        })
        .then(function () {
          setBusy(btn, false);
        });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
