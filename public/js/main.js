(function () {
  'use strict';

  var CONFIG = window.SUPPLE_CONFIG || {};
  var phoneDisplay = '+1 (805) 443-4181';
  var businessName = 'Supple Automotive';
  var tagline = 'Professional Mobile Auto Repair You Can Trust.';

  if (CONFIG.phone) phoneDisplay = CONFIG.phone;
  if (CONFIG.businessName) businessName = CONFIG.businessName;
  if (CONFIG.tagline) tagline = CONFIG.tagline;

  function byId(id) {
    return document.getElementById(id);
  }

  function setText(id, text) {
    var el = byId(id);
    if (el) el.textContent = text;
  }

  function setHref(id, url) {
    var el = byId(id);
    if (el && url) el.setAttribute('href', url);
  }

  var parts = businessName.split(/\s+/);
  var first = parts[0] || businessName;
  var rest = parts.slice(1).join(' ') || '';

  setText('heroTitle', first);
  setText('heroTitleAccent', rest);
  setText('logoMain', first);
  setText('logoAccent', rest ? ' ' + rest : '');
  if (byId('heroTagline')) byId('heroTagline').textContent = tagline;

  var heroCredibilityHeadline = byId('heroCredibilityHeadline');
  if (heroCredibilityHeadline) {
    var heroCatchlines = [
      '805 drivers, we come to you for every automotive need.',
      'Mobile auto repair made easy for the 805.',
      'From oil changes to diagnostics, we\'ve got the 805 covered.',
      'Reliable automotive service for every corner of the 805.',
      'Professional mobile mechanics serving the 805 with care.',
      '805\'s go-to solution for honest, on\u2011site auto repair.',
      'Serving Ventura County and the coast from Oxnard to Malibu.', 
      'Mobile auto repair wherever the road takes you — Ventura County and beyond.',
      'Trusted automotive service along the 805 and the Pacific coast.',
      'From Ventura to Malibu, we bring the shop to you.'
  ];
    heroCredibilityHeadline.textContent =
      heroCatchlines[Math.floor(Math.random() * heroCatchlines.length)];
  }

  var heroMechanicBio = byId('heroMechanicBio');
  if (heroMechanicBio) {
    var heroMechanicBios = [
      'Purdue-trained engineer—mobile service from oil changes to engine builds.',
      'Mobile repairs made simple—no job too small, none too complex.',
      'Diagnostics, maintenance, and repairs done right where you park.',
      'Years under the hood—if it rolls, I can fix it, upgrade it, or make it faster.',
      'Honest work, clear answers, trusted across the 805 and Ventura County.',
      'Engineer by training, mechanic by trade—the shop comes to you, not the runaround.'
  ];
    heroMechanicBio.textContent =
      heroMechanicBios[Math.floor(Math.random() * heroMechanicBios.length)];
  }

  setText('footerName', businessName);
  setText('footerYear', String(new Date().getFullYear()));

  var telHref = 'tel:' + phoneDisplay.replace(/\s/g, '').replace(/[^\d+]/g, '');
  setHref('contactPhone', telHref);
  setHref('contactCtaPhone', telHref);
  setText('contactPhone', phoneDisplay);
  setText('contactCtaPhone', 'Call ' + phoneDisplay);

  var email = CONFIG.email && CONFIG.email.trim();
  var emailEl = byId('contactEmail');
  if (emailEl) {
    if (email) {
      emailEl.setAttribute('href', 'mailto:' + email);
      emailEl.textContent = email;
    } else {
      emailEl.removeAttribute('href');
      emailEl.textContent = 'Contact us for email';
    }
  }

  var address = CONFIG.address && CONFIG.address.trim();
  var addressLine2 = CONFIG.addressLine2 && CONFIG.addressLine2.trim();
  var addressText = address ? (address + (addressLine2 ? ' ' + addressLine2 : '')) : '';
  setText('contactAddress', addressText || 'Contact us for location');

  var socialCfg = CONFIG.social || {};
  function setFooterSocialLink(id, url, external) {
    var a = byId(id);
    if (!a) return;
    var u = url && String(url).trim();
    if (!u) {
      a.hidden = true;
      return;
    }
    a.setAttribute('href', u);
    if (external) {
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener noreferrer');
    } else {
      a.removeAttribute('target');
      a.removeAttribute('rel');
    }
    a.hidden = false;
  }
  setFooterSocialLink('footerSocialFacebook', socialCfg.facebook, true);
  setFooterSocialLink('footerSocialInstagram', socialCfg.instagram, true);
  if (email) {
    setFooterSocialLink('footerSocialEmail', 'mailto:' + email, false);
  } else if (byId('footerSocialEmail')) {
    byId('footerSocialEmail').hidden = true;
  }
  var footerStripSocial = byId('footerStripSocial');
  if (footerStripSocial) {
    footerStripSocial.hidden = !footerStripSocial.querySelector('.footer-strip-social-link:not([hidden])');
  }

  var apiBaseForDev = (CONFIG.apiBaseUrl != null && CONFIG.apiBaseUrl !== '') ? CONFIG.apiBaseUrl.replace(/\/$/, '') : '';
  var footerDevControls = byId('footerDevControls');
  var footerDevAdminBtn = byId('footerDevAdminBtn');
  var footerDevPdf = byId('footerDevPdf');
  var footerDevPdfList = byId('footerDevPdfList');
  if (footerDevControls && footerDevAdminBtn && footerDevPdf && footerDevPdfList && typeof fetch !== 'undefined') {
    function isLocalDevHost() {
      var h = window.location.hostname || '';
      return h === 'localhost' || h === '127.0.0.1' || h === '[::1]';
    }
    function showFooterDevLocalMessage(fetchFailed) {
      if (!isLocalDevHost()) return;
      footerDevControls.hidden = false;
      footerDevPdf.hidden = false;
      var hint = footerDevPdf.querySelector('.footer-dev-pdf-hint');
      if (hint) {
        hint.textContent = fetchFailed
          ? 'Could not reach the dev PDF API. Serve the site with npm start (Node), not live-server or opening the HTML file directly.'
          : 'Sample PDF links appear when DEV_PDF_SAMPLES=1 is in the server .env — save the file and restart npm start.';
      }
    }
    footerDevAdminBtn.addEventListener('click', function () {
      window.location.href = '/supplecontrols';
    });
    var pdfSamples = [
      { path: '/api/dev/pdf-samples/agreement', label: 'Service agreement (empty signature lines)' },
      { path: '/api/dev/pdf-samples/agreement-typed', label: 'Service agreement (typed customer signature)' },
      { path: '/api/dev/pdf-samples/agreement-drawn', label: 'Service agreement (drawn placeholder image)' },
      { path: '/api/dev/pdf-samples/agreement-bundle', label: 'Agreement + extra signature page (pdf-lib bundle)' },
      { path: '/api/dev/pdf-samples/estimate', label: 'Estimate (typed customer signature)' },
      { path: '/api/dev/pdf-samples/invoice', label: 'Invoice' }
    ];
    var checkUrl = (apiBaseForDev || '') + '/api/dev/pdf-samples/check';
    fetch(checkUrl, { credentials: 'same-origin' })
      .then(function (r) {
        if (!r.ok) {
          showFooterDevLocalMessage(true);
          return null;
        }
        return r.json();
      })
      .then(function (data) {
        if (!data) return;
        if (data.enabled) {
          footerDevControls.hidden = false;
          footerDevPdf.hidden = false;
          var hintOn = footerDevPdf.querySelector('.footer-dev-pdf-hint');
          if (hintOn) hintOn.hidden = true;
          pdfSamples.forEach(function (item) {
            var li = document.createElement('li');
            var a = document.createElement('a');
            a.href = (apiBaseForDev || '') + item.path;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            a.textContent = item.label;
            li.appendChild(a);
            footerDevPdfList.appendChild(li);
          });
          return;
        }
        showFooterDevLocalMessage(false);
      })
      .catch(function () {
        showFooterDevLocalMessage(true);
      });
  }

  // Request service: full-page blue slash, then navigate to request-service.html
  var requestServiceLinks = document.querySelectorAll('.js-request-service-link');
  var slashOverlay = byId('slashOverlay');
  var slashLine = byId('slashOverlayLine');
  var slashLineBg = byId('slashOverlayLineBg');
  if (requestServiceLinks.length) {
    function goToRequestService(e) {
      var href = e.currentTarget.getAttribute('href');
      if (!href || href.indexOf('request-service') === -1) return;
      if (window.matchMedia('(max-width: 900px)').matches) {
        return;
      }
      if (!slashOverlay || !slashLine) {
        e.preventDefault();
        window.location.href = 'request-service.html';
        return;
      }
      e.preventDefault();
      slashOverlay.classList.remove('slash-overlay-white');
      slashOverlay.setAttribute('aria-hidden', 'false');
      slashOverlay.classList.add('slash-overlay-active');
      if (slashLineBg) slashLineBg.classList.add('slash-line-animate');
      slashLine.classList.add('slash-line-animate');
      function navigate() {
        window.location.href = 'request-service.html';
      }
      var fallback = setTimeout(navigate, 1300);
      slashLine.addEventListener('animationend', function () {
        clearTimeout(fallback);
        navigate();
      }, { once: true });
    }
    requestServiceLinks.forEach(function (link) {
      link.addEventListener('click', goToRequestService);
    });
  }

  // User Portal: same slash animation but WHITE strip, then navigate to payment.html
  var paymentPortalLinks = document.querySelectorAll('.js-payment-portal-link');
  if (paymentPortalLinks.length) {
    function goToPayment(e) {
      var href = e.currentTarget.getAttribute('href');
      if (!href || href.indexOf('payment') === -1) return;
      if (window.matchMedia('(max-width: 900px)').matches) {
        return;
      }
      if (!slashOverlay || !slashLine) {
        e.preventDefault();
        window.location.href = 'payment.html';
        return;
      }
      e.preventDefault();
      slashOverlay.classList.add('slash-overlay-white');
      slashOverlay.setAttribute('aria-hidden', 'false');
      slashOverlay.classList.add('slash-overlay-active');
      if (slashLineBg) slashLineBg.classList.add('slash-line-animate');
      slashLine.classList.add('slash-line-animate');
      function navigate() {
        window.location.href = 'payment.html';
      }
      var fallback = setTimeout(navigate, 1300);
      slashLine.addEventListener('animationend', function () {
        clearTimeout(fallback);
        navigate();
      }, { once: true });
    }
    paymentPortalLinks.forEach(function (link) {
      link.addEventListener('click', goToPayment);
    });
  }

  // Top bar background on scroll
  var topBar = document.querySelector('.top-bar');
  if (topBar) {
    var forceScrolledHeader =
      document.body.classList.contains('page-payment') ||
      document.body.classList.contains('page-request');
    function onScroll() {
      if (forceScrolledHeader) {
        topBar.classList.add('scrolled');
        return;
      }
      topBar.classList.toggle('scrolled', window.scrollY > 80);
    }
    if (!forceScrolledHeader) {
      window.addEventListener('scroll', onScroll, { passive: true });
    }
    onScroll();
  }

  // Scroll-to-top button: show when scrolled down, limited opacity
  var scrollToTop = document.getElementById('scrollToTop');
  if (scrollToTop) {
    var scrollThreshold = 400;
    function updateScrollToTop() {
      scrollToTop.hidden = window.scrollY < scrollThreshold;
    }
    window.addEventListener('scroll', updateScrollToTop, { passive: true });
    updateScrollToTop();
    scrollToTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // Mobile nav: slash from top-left (open = fill, close = reverse), then content stagger
  var navToggle = document.getElementById('navToggle');
  var navMenu = document.getElementById('navMenu');
  var navMenuContent = document.getElementById('navMenuContent');
  var mobileNavSlash = document.getElementById('mobileNavSlash');
  var mobileNavSlashFill = mobileNavSlash ? mobileNavSlash.querySelector('.mobile-nav-slash-fill') : null;
  var mobileNavOverlayContent = document.getElementById('mobileNavOverlayContent');
  var isMobile = function () { return window.matchMedia('(max-width: 900px)').matches; };

  if (navToggle && navMenu && topBar) {
    function setNavOpen(open) {
      topBar.classList.toggle('nav-open', open);
      navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      navToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      if (navMenuContent) navMenuContent.classList.toggle('is-visible', open);
      if (open) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    }

    function openWithSlash() {
      if (!mobileNavSlash || !mobileNavSlashFill) {
        setNavOpen(true);
        return;
      }
      mobileNavSlash.setAttribute('aria-hidden', 'false');
      mobileNavSlash.classList.add('mobile-nav-slash-active', 'mobile-nav-slash-open');
      mobileNavSlash.classList.remove('mobile-nav-slash-close');
      mobileNavSlashFill.removeEventListener('animationend', onSlashCloseEnd);
      mobileNavSlashFill.addEventListener('animationend', onSlashOpenEnd, { once: true });
    }

    function onSlashOpenEnd() {
      mobileNavSlash.classList.remove('mobile-nav-slash-open');
      mobileNavSlash.classList.add('mobile-nav-slash-behind');
      if (mobileNavOverlayContent) mobileNavOverlayContent.setAttribute('aria-hidden', 'false');
      topBar.classList.add('nav-with-slash');
      setNavOpen(true);
    }

    function closeWithSlash() {
      if (!mobileNavSlash || !mobileNavSlashFill) {
        setNavOpen(false);
        return;
      }
      mobileNavSlash.classList.remove('mobile-nav-slash-behind');
      mobileNavSlash.setAttribute('aria-hidden', 'false');
      mobileNavSlash.classList.add('mobile-nav-slash-active', 'mobile-nav-slash-close');
      mobileNavSlash.classList.remove('mobile-nav-slash-open');
      mobileNavSlashFill.removeEventListener('animationend', onSlashOpenEnd);
      mobileNavSlashFill.addEventListener('animationend', onSlashCloseEnd, { once: true });
    }

    function onSlashCloseEnd() {
      mobileNavSlash.classList.remove('mobile-nav-slash-active', 'mobile-nav-slash-close', 'mobile-nav-slash-behind');
      mobileNavSlash.setAttribute('aria-hidden', 'true');
      if (mobileNavOverlayContent) mobileNavOverlayContent.setAttribute('aria-hidden', 'true');
      topBar.classList.remove('nav-with-slash');
      setNavOpen(false);
    }

    navToggle.addEventListener('click', function () {
      var open = !topBar.classList.contains('nav-open');
      if (open) {
        if (isMobile() && mobileNavSlash) openWithSlash();
        else setNavOpen(true);
      } else {
        if (isMobile() && mobileNavSlash) closeWithSlash();
        else setNavOpen(false);
      }
    });

    navMenu.addEventListener('click', function (e) {
      if (e.target.closest('a')) {
        if (isMobile() && mobileNavSlash) closeWithSlash();
        else setNavOpen(false);
      }
      if (e.target === navMenu) {
        if (isMobile() && mobileNavSlash) closeWithSlash();
        else setNavOpen(false);
      }
    });

    if (mobileNavOverlayContent) {
      mobileNavOverlayContent.addEventListener('click', function (e) {
        if (e.target.closest('a')) {
          if (isMobile() && mobileNavSlash) closeWithSlash();
          else setNavOpen(false);
        }
      });
    }

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && topBar.classList.contains('nav-open')) {
        if (isMobile() && mobileNavSlash) closeWithSlash();
        else setNavOpen(false);
      }
    });
  }

  // Koenigsegg-style: split text into lines (.split-element), then reveal on scroll with stagger
  function splitElementIntoLines(el) {
    if (!el || el.hasAttribute('data-split-done')) return;
    var raw = el.innerHTML;
    var hasBr = /<br\s*\/?>/i.test(raw);
    if (hasBr) {
      var parts = raw.split(/<br\s*\/?>/i);
      var temp = document.createElement('div');
      var lines = [];
      for (var i = 0; i < parts.length; i++) {
        temp.innerHTML = parts[i];
        var text = (temp.textContent || '').trim();
        if (text) lines.push(text);
      }
      el.innerHTML = '';
      lines.forEach(function (line) {
        var div = document.createElement('div');
        div.className = 'split-element';
        div.textContent = line;
        el.appendChild(div);
      });
      el.setAttribute('data-split-done', '');
      return;
    }
    var text = (el.textContent || '').trim();
    if (!text) return;
    var words = text.split(/\s+/);
    if (words.length === 0) return;
    var style = getComputedStyle(el);
    var measure = document.createElement('div');
    measure.style.cssText = 'position:absolute;left:-9999px;top:0;width:' + el.offsetWidth + 'px;font-family:' + style.fontFamily + ';font-size:' + style.fontSize + ';font-weight:' + style.fontWeight + ';letter-spacing:' + style.letterSpacing + ';line-height:' + style.lineHeight + ';visibility:hidden;';
    document.body.appendChild(measure);
    var wordSpans = [];
    for (var w = 0; w < words.length; w++) {
      var span = document.createElement('span');
      span.textContent = words[w];
      span.style.whiteSpace = 'nowrap';
      measure.appendChild(span);
      if (w < words.length - 1) measure.appendChild(document.createTextNode(' '));
      wordSpans.push(span);
    }
    var lines = [];
    var currentLine = [];
    var lastTop = null;
    for (var s = 0; s < wordSpans.length; s++) {
      var r = wordSpans[s].getBoundingClientRect();
      if (lastTop !== null && Math.round(r.top) > Math.round(lastTop)) {
        lines.push(currentLine.slice());
        currentLine = [];
      }
      currentLine.push(words[s]);
      lastTop = r.top;
    }
    if (currentLine.length) lines.push(currentLine);
    document.body.removeChild(measure);
    el.textContent = '';
    for (var l = 0; l < lines.length; l++) {
      var lineDiv = document.createElement('div');
      lineDiv.className = 'split-element';
      lineDiv.textContent = lines[l].join(' ');
      el.appendChild(lineDiv);
    }
    el.setAttribute('data-split-done', '');
  }

  function wrapRevealSplitChildren(container) {
    var direct = Array.prototype.slice.call(container.children);
    direct.forEach(function (child) {
      if (child.nodeType === 1 && !child.querySelector('.split-element')) {
        var wrap = document.createElement('div');
        wrap.className = 'split-element';
        child.parentNode.insertBefore(wrap, child);
        wrap.appendChild(child);
      }
    });
  }

  function runLineSplits() {
    document.querySelectorAll('[data-split-lines]').forEach(splitElementIntoLines);
    document.querySelectorAll('.reveal-on-scroll').forEach(wrapRevealSplitChildren);
    document.querySelectorAll('[data-reveal-split-only]').forEach(wrapRevealSplitChildren);
  }

  var staggerStep = 0.055;
  function setRevealDelays(container) {
    var elements = container.querySelectorAll('.split-element');
    for (var i = 0; i < elements.length; i++) {
      elements[i].style.setProperty('--reveal-delay', (i * staggerStep) + 's');
    }
  }
  function setupRevealObserver() {
    var revealEls = document.querySelectorAll('.reveal-on-scroll');
    if (revealEls.length && typeof IntersectionObserver !== 'undefined') {
      var revealObserver = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              setRevealDelays(entry.target);
              entry.target.classList.add('is-visible');
            }
          });
        },
        { rootMargin: '0px', threshold: 0 }
      );
      revealEls.forEach(function (el) {
        if (el.id === 'serviceMaintenanceCopyReveal' || el.id === 'serviceDiagnosticsCopyReveal' || el.id === 'serviceInspectionCopyReveal') return;
        revealObserver.observe(el);
      });
    } else if (revealEls.length) {
      revealEls.forEach(function (el) {
        if (el.id === 'serviceMaintenanceCopyReveal' || el.id === 'serviceDiagnosticsCopyReveal' || el.id === 'serviceInspectionCopyReveal') return;
        setRevealDelays(el);
        el.classList.add('is-visible');
      });
    }
  }

  function serviceSectionIdToCamel(sectionId) {
    return sectionId.replace(/-([a-z])/g, function (_, c) {
      return c.toUpperCase();
    });
  }

  function initServiceBlockTitleChars(sectionId) {
    var titleId = serviceSectionIdToCamel(sectionId) + 'Title';
    var title = document.getElementById(titleId);
    if (!title || title.getAttribute('data-title-chars-done')) return;
    var raw = (title.textContent || '').trim();
    if (!raw) return;
    var charClass = sectionId + '-title-char';
    title.innerHTML = '';
    var upper = raw.toUpperCase();
    var words = upper.split(/\s+/).filter(function (w) {
      return w.length > 0;
    });
    var idx = 0;
    /* Inspection has four words; one break per word stacks four narrow lines. Two lines (like diagnostics) reads much wider. */
    if (sectionId === 'service-inspection' && words.length > 2) {
      var w0 = words[0];
      for (var c0 = 0; c0 < w0.length; c0++) {
        var s0 = document.createElement('span');
        s0.className = charClass;
        s0.style.setProperty('--i', String(idx));
        idx += 1;
        s0.textContent = w0.charAt(c0);
        title.appendChild(s0);
      }
      title.appendChild(document.createElement('br'));
      var restLine = words.slice(1).join(' ');
      for (var r = 0; r < restLine.length; r++) {
        var sr = document.createElement('span');
        sr.className = charClass;
        sr.style.setProperty('--i', String(idx));
        idx += 1;
        /* Regular spaces collapse inside inline-block letter spans; NBSP keeps gaps visible */
        sr.textContent = restLine.charAt(r) === ' ' ? '\u00a0' : restLine.charAt(r);
        title.appendChild(sr);
      }
    } else {
      for (var w = 0; w < words.length; w++) {
        var word = words[w];
        for (var c = 0; c < word.length; c++) {
          var span = document.createElement('span');
          span.className = charClass;
          span.style.setProperty('--i', String(idx));
          idx += 1;
          span.textContent = word.charAt(c);
          title.appendChild(span);
        }
        if (w < words.length - 1) {
          title.appendChild(document.createElement('br'));
        }
      }
    }
    title.setAttribute('data-title-chars-done', '');
  }

  function initServiceBlockScroll(sectionId) {
    var camel = serviceSectionIdToCamel(sectionId);
    var section = document.getElementById(sectionId);
    var copyReveal = document.getElementById(camel + 'CopyReveal');
    var title = document.getElementById(camel + 'Title');
    var compactClass = sectionId + '--compact';
    var compact = section && section.querySelector('.' + sectionId + '-compact');
    var intro = section && section.querySelector('.' + sectionId + '-intro');
    var lettersInClass = sectionId + '-title--letters-in';
    var charClass = sectionId + '-title-char';
    if (!section) return;

    var wasPastThreshold = false;
    var copyAnimTimer = null;
    var letterStaggerMs = 38;
    var letterTransitionMs = 350;

    function clearCopyAnimTimer() {
      if (copyAnimTimer) {
        clearTimeout(copyAnimTimer);
        copyAnimTimer = null;
      }
    }

    function resetCompactText() {
      clearCopyAnimTimer();
      if (copyReveal) {
        copyReveal.classList.remove('is-visible');
        var ctaReset = copyReveal.querySelector('a.js-request-service-link');
        if (ctaReset) {
          ctaReset.classList.remove('service-cta-mobile--draw-in', 'service-cta-mobile--draw-out');
        }
      }
      if (title) {
        title.classList.remove(lettersInClass);
      }
    }

    function scheduleCopyAfterTitle() {
      clearCopyAnimTimer();
      if (!copyReveal || !title) return;
      var chars = title.getElementsByClassName(charClass);
      var n = chars.length;
      var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      var waitMs = reduced ? 0 : Math.max(0, (n - 1) * letterStaggerMs + letterTransitionMs + 45);
      copyAnimTimer = setTimeout(function () {
        copyAnimTimer = null;
        var copyEls = copyReveal.querySelectorAll('.split-element');
        var copyStep = 0.036;
        for (var i = 0; i < copyEls.length; i++) {
          copyEls[i].style.setProperty('--reveal-delay', i * copyStep + 's');
        }
        copyReveal.classList.add('is-visible');
        if (window.matchMedia('(max-width: 639px)').matches) {
          var ctaIn = copyReveal.querySelector('a.js-request-service-link');
          if (ctaIn) {
            ctaIn.classList.remove('service-cta-mobile--draw-out');
            void ctaIn.offsetWidth;
            ctaIn.classList.add('service-cta-mobile--draw-in');
          }
        }
      }, waitMs);
    }

    function playTitleLetters() {
      if (!title) {
        scheduleCopyAfterTitle();
        return;
      }
      var chars = title.getElementsByClassName(charClass);
      if (chars.length === 0) {
        scheduleCopyAfterTitle();
        return;
      }
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        title.classList.add(lettersInClass);
        scheduleCopyAfterTitle();
        return;
      }
      title.classList.remove(lettersInClass);
      void title.offsetHeight;
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          title.classList.add(lettersInClass);
          scheduleCopyAfterTitle();
        });
      });
    }

    var mqServiceMobile = window.matchMedia('(max-width: 639px)');

    function update() {
      var rect = section.getBoundingClientRect();
      var threshold = window.innerHeight * 0.35;
      var pastThreshold = rect.top < threshold;
      var isCompact = mqServiceMobile.matches ? true : pastThreshold;
      section.classList.toggle(compactClass, isCompact);
      if (mqServiceMobile.matches) {
        if (compact) compact.setAttribute('aria-hidden', 'false');
        if (intro) intro.setAttribute('aria-hidden', 'true');
      } else {
        if (compact) compact.setAttribute('aria-hidden', isCompact ? 'false' : 'true');
        if (intro) intro.setAttribute('aria-hidden', isCompact ? 'true' : 'false');
      }

      if (mqServiceMobile.matches) {
        if (pastThreshold && !wasPastThreshold) {
          if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            section.classList.add('service-mobile-bg-rested');
          } else {
            requestAnimationFrame(function () {
              requestAnimationFrame(function () {
                section.classList.add('service-mobile-bg-rested');
              });
            });
          }
        }
        if (!pastThreshold && wasPastThreshold) {
          section.classList.remove('service-mobile-bg-rested');
        }
      } else {
        section.classList.remove('service-mobile-bg-rested');
      }

      if (pastThreshold && !wasPastThreshold) {
        resetCompactText();
        playTitleLetters();
      } else if (!pastThreshold && wasPastThreshold) {
        resetCompactText();
      }

      wasPastThreshold = pastThreshold;
    }

    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    if (mqServiceMobile.addEventListener) {
      mqServiceMobile.addEventListener('change', update);
    } else if (mqServiceMobile.addListener) {
      mqServiceMobile.addListener(update);
    }
    update();
  }

  function initServiceMobileCtaScrollExit() {
    var mq = window.matchMedia('(max-width: 639px)');
    var pairs = [
      { cur: 'service-maintenance', next: 'service-diagnostics' },
      { cur: 'service-diagnostics', next: 'service-inspection' },
      { cur: 'service-inspection', next: 'services' }
    ];
    var wasNextPast = [false, false, false];

    function tick() {
      if (!mq.matches) return;
      var exitY = window.innerHeight * 0.5;
      for (var i = 0; i < pairs.length; i++) {
        var p = pairs[i];
        var curEl = document.getElementById(p.cur);
        var nextEl = document.getElementById(p.next);
        if (!curEl || !nextEl) continue;
        var cta = curEl.querySelector('a.js-request-service-link');
        if (!cta) continue;
        var nextTop = nextEl.getBoundingClientRect().top;
        var past = nextTop < exitY;
        if (past && !wasNextPast[i]) {
          if (cta.classList.contains('service-cta-mobile--draw-in')) {
            cta.classList.remove('service-cta-mobile--draw-in');
            void cta.offsetWidth;
            cta.classList.add('service-cta-mobile--draw-out');
          }
        }
        if (!past && wasNextPast[i]) {
          cta.classList.remove('service-cta-mobile--draw-out');
          var cr = document.getElementById(serviceSectionIdToCamel(p.cur) + 'CopyReveal');
          if (cr && cr.classList.contains('is-visible')) {
            void cta.offsetWidth;
            cta.classList.add('service-cta-mobile--draw-in');
          }
        }
        wasNextPast[i] = past;
      }
    }

    window.addEventListener('scroll', tick, { passive: true });
    window.addEventListener('resize', tick);
    if (mq.addEventListener) {
      mq.addEventListener('change', tick);
    } else if (mq.addListener) {
      mq.addListener(tick);
    }
    tick();
  }

  function initReveal() {
    ['service-maintenance', 'service-diagnostics', 'service-inspection'].forEach(function (sectionId) {
      initServiceBlockTitleChars(sectionId);
    });
    runLineSplits();
    setupRevealObserver();
    ['service-maintenance', 'service-diagnostics', 'service-inspection'].forEach(function (sectionId) {
      initServiceBlockScroll(sectionId);
    });
    initServiceMobileCtaScrollExit();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(initReveal);
      } else {
        initReveal();
      }
    });
  } else {
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(initReveal);
    } else {
      initReveal();
    }
  }

  // About section: when image block enters view, slide overlay away (45° down-right)
  var revealImageEl = document.querySelector('[data-reveal-image]');
  if (revealImageEl && typeof IntersectionObserver !== 'undefined') {
    var imageRevealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) entry.target.classList.add('is-revealed');
        });
      },
      { rootMargin: '0px', threshold: 0.15 }
    );
    imageRevealObserver.observe(revealImageEl);
  } else if (revealImageEl) {
    revealImageEl.classList.add('is-revealed');
  }

  // Process slideshow: stacked images, transparent by default; 45° clip sweep on change
  var processTrack = document.getElementById('processSliderTrack');
  var processNav = document.getElementById('processNav');
  var processNavUnderline = document.getElementById('processNavUnderline');
  var processImageStack = processTrack && processTrack.querySelector('.process-slider-image-stack');
  var processSlideImages = processImageStack ? processImageStack.querySelectorAll('.process-slide-image') : [];
  var processSlides = processTrack ? processTrack.querySelectorAll('.process-slide') : [];
  if (processTrack && processNav && processSlideImages.length) {
    var processDots = processNav.querySelectorAll('.process-dot');
    var processIndex = 0;
    var processTotal = processDots.length;
    var processInterval = 6000;
    var processTimer = null;
    var processAutoStoppedByUser = false;
    var processSweeping = false;

    function updateProcessUnderline() {
      if (!processNavUnderline || processDots.length === 0) return;
      var active = processDots[processIndex];
      if (!active) return;
      var navRect = processNav.getBoundingClientRect();
      var btnRect = active.getBoundingClientRect();
      processNavUnderline.style.left = (btnRect.left - navRect.left) + 'px';
      processNavUnderline.style.width = btnRect.width + 'px';
    }

    function setCopyAndNav(index) {
      processIndex = (index + processTotal) % processTotal;
      processSlides.forEach(function (slide, s) {
        slide.classList.toggle('is-active', s === processIndex);
      });
      for (var d = 0; d < processDots.length; d++) {
        processDots[d].setAttribute('aria-selected', d === processIndex);
      }
      updateProcessUnderline();
    }

    function setProcessSlide(i) {
      var next = (i + processTotal) % processTotal;
      if (next === processIndex && !processSweeping) return;
      if (processSweeping) return;

      var prevIndex = processIndex;
      setCopyAndNav(next);

      var prevImg = processSlideImages[prevIndex];
      var nextImg = processSlideImages[next];
      if (!prevImg || !nextImg) return;

      processSweeping = true;
      var goingForward = next > prevIndex || (prevIndex === processTotal - 1 && next === 0);
      processTrack.classList.remove('is-sweep-ltr', 'is-sweep-rtl');
      processTrack.classList.add(goingForward ? 'is-sweep-ltr' : 'is-sweep-rtl');
      // Apply sweeping to outgoing image first so its higher z-index is set before the next becomes visible
      prevImg.classList.add('is-sweeping', goingForward ? 'is-sweep-ltr' : 'is-sweep-rtl');
      nextImg.classList.add('is-visible');

      function onSweepEnd() {
        prevImg.removeEventListener('animationend', onSweepEnd);
        prevImg.classList.remove('is-sweeping', 'is-sweep-ltr', 'is-sweep-rtl', 'is-visible');
        processTrack.classList.remove('is-sweep-ltr', 'is-sweep-rtl');
        processSweeping = false;
      }
      prevImg.addEventListener('animationend', onSweepEnd);
    }

    function stopAutoAdvance(byUser) {
      if (processTimer) {
        clearInterval(processTimer);
        processTimer = null;
      }
      if (byUser) processAutoStoppedByUser = true;
    }

    // Initial state: first image visible, first copy active
    processSlideImages[0].classList.add('is-visible');
    processSlides[0].classList.add('is-active');

    processDots.forEach(function (dot, d) {
      dot.addEventListener('click', function () {
        setProcessSlide(d);
      });
    });

    processTimer = setInterval(function () {
      setProcessSlide(processIndex + 1);
    }, processInterval);

    processTrack.addEventListener('mouseenter', function () {
      stopAutoAdvance(false);
    });
    processTrack.addEventListener('mouseleave', function () {
      if (processTimer === null && !processAutoStoppedByUser) {
        processTimer = setInterval(function () {
          setProcessSlide(processIndex + 1);
        }, processInterval);
      }
    });

    updateProcessUnderline();
    window.addEventListener('resize', updateProcessUnderline);
  }

  // Contact switch: service request (Email / SMS) uses #contactPreference; user portal (Email / Phone) uses #paymentForm
  var contactSwitch = document.querySelector('.contact-switch');
  if (contactSwitch) {
    var options = contactSwitch.querySelectorAll('.contact-switch-option');
    var inputEmail = byId('formEmail');
    var inputPhone = byId('formPhone');
    var contactPreference = byId('contactPreference');
    var contactViaConsentLabel = byId('contactViaConsentLabel');
    var smsOption = contactSwitch.querySelector('.contact-switch-option[data-mode="sms"]');
    var paymentForm = byId('paymentForm');

    if (contactPreference) {
      function phoneHasTenChars() {
        var value = inputPhone && inputPhone.value ? String(inputPhone.value).trim() : '';
        return value.length >= 10;
      }

      function refreshSmsAvailability() {
        var smsAvailable = phoneHasTenChars();
        if (smsOption) {
          smsOption.disabled = !smsAvailable;
          smsOption.setAttribute('aria-disabled', smsAvailable ? 'false' : 'true');
        }
        if (!smsAvailable && contactPreference && contactPreference.value === 'sms') {
          setMode('email');
        }
      }

      function setMode(mode) {
        if (mode === 'sms' && !phoneHasTenChars()) mode = 'email';
        var isEmail = mode === 'email';
        options.forEach(function (opt) {
          opt.classList.toggle('active', opt.getAttribute('data-mode') === mode);
          opt.setAttribute('aria-pressed', opt.getAttribute('data-mode') === mode);
        });
        contactPreference.value = isEmail ? 'email' : 'sms';
        if (contactViaConsentLabel) {
          contactViaConsentLabel.textContent = isEmail
            ? 'It is okay to contact me via Email regarding this request.'
            : 'It is okay to contact me via SMS regarding this request.';
        }
        if (inputEmail) inputEmail.setAttribute('required', 'required');
        if (inputPhone) {
          if (isEmail) inputPhone.removeAttribute('required');
          else inputPhone.setAttribute('required', 'required');
        }
      }

      options.forEach(function (btn) {
        btn.addEventListener('click', function () {
          setMode(btn.getAttribute('data-mode'));
        });
      });
      if (inputPhone) {
        inputPhone.addEventListener('input', refreshSmsAvailability);
      }
      refreshSmsAvailability();
      setMode('email');
    } else if (paymentForm) {
      var detailEmail = paymentForm.querySelector('.contact-detail-email');
      var detailPhone = paymentForm.querySelector('.contact-detail-phone');

      function setPaymentContactMode(mode) {
        var isEmail = mode === 'email';
        options.forEach(function (opt) {
          var m = opt.getAttribute('data-mode');
          opt.classList.toggle('active', m === mode);
          opt.setAttribute('aria-pressed', String(m === mode));
        });
        if (detailEmail) detailEmail.classList.toggle('is-hidden', !isEmail);
        if (detailPhone) detailPhone.classList.toggle('is-hidden', isEmail);
        if (inputEmail) {
          inputEmail.disabled = !isEmail;
          inputEmail.removeAttribute('required');
          if (!isEmail) inputEmail.value = '';
        }
        if (inputPhone) {
          inputPhone.disabled = isEmail;
          inputPhone.removeAttribute('required');
          if (isEmail) inputPhone.value = '';
        }
      }

      options.forEach(function (btn) {
        btn.addEventListener('click', function () {
          setPaymentContactMode(btn.getAttribute('data-mode') || 'email');
        });
      });
      setPaymentContactMode('email');
    }
  }

  function showFormMessage(form, text, isError) {
    var el = form ? form.querySelector('#serviceFormMessage') || byId('serviceFormMessage') : byId('serviceFormMessage');
    if (!el) return;
    el.textContent = text || '';
    el.hidden = !text;
    el.className = 'form-message' + (isError ? ' form-message-error' : text ? ' form-message-success' : '');
    if (text) {
      clearTimeout(el._formMessageTimer);
      el._formMessageTimer = setTimeout(function () {
        el.hidden = true;
        el.textContent = '';
      }, 8000);
    }
  }

  // Form submit: POST to API → email + SMS to config email/phone
  var serviceForm = byId('serviceForm');
  if (serviceForm) {
    serviceForm.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!serviceForm.checkValidity()) {
        serviceForm.reportValidity();
        return;
      }
      var submitBtn = serviceForm.querySelector('.form-submit');
      var apiBase = (CONFIG.apiBaseUrl != null && CONFIG.apiBaseUrl !== '') ? CONFIG.apiBaseUrl.replace(/\/$/, '') : '';
      var enteredEmail = (serviceForm.querySelector('[name="email"]') || {}).value || '';
      var payload = {
        name: (serviceForm.querySelector('[name="name"]') || {}).value || '',
        email: enteredEmail,
        phone: (serviceForm.querySelector('[name="phone"]') || {}).value || '',
        contact_preference: (serviceForm.querySelector('[name="contact_preference"]') || {}).value || 'email',
        contact_via_ok: !!((serviceForm.querySelector('[name="contact_via_ok"]') || {}).checked),
        vehicle_year: (serviceForm.querySelector('[name="vehicle_year"]') || {}).value || '',
        vehicle_make: (serviceForm.querySelector('[name="vehicle_make"]') || {}).value || '',
        vehicle_model: (serviceForm.querySelector('[name="vehicle_model"]') || {}).value || '',
        service_type: (serviceForm.querySelector('[name="service_type"]') || {}).value || '',
        details: (serviceForm.querySelector('[name="details"]') || {}).value || '',
        preferred_date: (serviceForm.querySelector('[name="preferred_date"]') || {}).value || '',
        preferred_time: (serviceForm.querySelector('[name="preferred_time"]') || {}).value || '',
        notes: (serviceForm.querySelector('[name="notes"]') || {}).value || ''
      };
      if (!String(payload.email || '').trim()) {
        showFormMessage(serviceForm, 'Email is required.', true);
        return;
      }
      var btnText = submitBtn ? submitBtn.textContent : '';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending…';
      }
      showFormMessage(serviceForm, '');
      fetch(apiBase + '/api/submit-service-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(function (r) {
          return r.json().then(function (data) {
            if (!r.ok) throw new Error(data.error || 'Request failed');
            return data;
          });
        })
        .then(function () {
          showFormMessage(serviceForm, 'Thanks. We’ll be in touch soon.', false);
          serviceForm.reset();
        })
        .catch(function (err) {
          showFormMessage(serviceForm, 'Something went wrong: ' + (err.message || 'Please try again.'), true);
        })
        .finally(function () {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = btnText;
          }
        });
    });
  }

  // ========== Reviews section: fetch, render, auto-scroll, add form ==========
  var reviewsTrack = byId('reviewsSlideshowTrack');
  var reviewsAddBtn = byId('reviewsAddBtn');
  var reviewsModal = byId('reviewsModal');
  var reviewsModalBackdrop = byId('reviewsModalBackdrop');
  var reviewsModalCancel = byId('reviewsModalCancel');
  var reviewsForm = byId('reviewsForm');
  var reviewRatingInput = byId('reviewRating');
  var reviewsStarsInput = byId('reviewsStarsInput');

  function formatReviewDate(isoStr) {
    if (!isoStr) return '';
    var d = new Date(isoStr);
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function renderStars(rating) {
    var html = '';
    for (var i = 1; i <= 5; i++) {
      html += '<span class="review-card-star' + (i <= rating ? ' filled' : '') + '" aria-hidden="true">★</span>';
    }
    return html;
  }

  function buildReviewCards(reviews) {
    if (!reviews || reviews.length === 0) {
      return '<div class="review-card"><p class="review-card-body">No reviews yet. Be the first to leave one!</p></div>';
    }
    return reviews.map(function (r) {
      return (
        '<div class="review-card" data-id="' + (r.id || '') + '">' +
          '<div class="review-card-header">' +
            '<span class="review-card-name">' + escapeHtml(r.name || '') + '</span>' +
            '<span class="review-card-date">' + escapeHtml(formatReviewDate(r.created_at)) + '</span>' +
          '</div>' +
          '<p class="review-card-body">' + escapeHtml(r.body || '') + '</p>' +
          '<div class="review-card-stars">' + renderStars(typeof r.rating === 'number' ? r.rating : 5) + '</div>' +
        '</div>'
      );
    }).join('');
  }

  function escapeHtml(s) {
    if (s == null) return '';
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function loadReviews() {
    if (!reviewsTrack) return;
    var apiBase = (typeof window.SUPPLE_API_BASE !== 'undefined' && window.SUPPLE_API_BASE) ? window.SUPPLE_API_BASE : '';
    fetch(apiBase + '/api/reviews')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var list = (data && data.reviews) ? data.reviews : [];
        var cardsHtml = buildReviewCards(list);
        reviewsTrack.innerHTML = cardsHtml + cardsHtml;
        reviewsTrack.classList.remove('paused');
      })
      .catch(function () {
        reviewsTrack.innerHTML = '<div class="review-card"><p class="review-card-body">Reviews could not be loaded.</p></div>';
      });
  }

  if (reviewsTrack) loadReviews();

  if (reviewsAddBtn && reviewsModal) {
    reviewsAddBtn.addEventListener('click', function () {
      reviewsModal.hidden = false;
      if (reviewRatingInput) reviewRatingInput.value = '5';
      if (reviewsStarsInput) {
        [].forEach.call(reviewsStarsInput.querySelectorAll('.reviews-star-btn'), function (btn, i) {
          btn.classList.toggle('filled', i < 5);
        });
      }
    });
  }

  if (reviewsModalBackdrop) reviewsModalBackdrop.addEventListener('click', function () { if (reviewsModal) reviewsModal.hidden = true; });
  if (reviewsModalCancel) reviewsModalCancel.addEventListener('click', function () { if (reviewsModal) reviewsModal.hidden = true; });

  if (reviewsStarsInput) {
    reviewsStarsInput.addEventListener('click', function (e) {
      var btn = e.target.closest('.reviews-star-btn');
      if (!btn) return;
      var rating = parseInt(btn.getAttribute('data-rating'), 10);
      if (reviewRatingInput) reviewRatingInput.value = String(rating);
      [].forEach.call(reviewsStarsInput.querySelectorAll('.reviews-star-btn'), function (b, i) {
        b.classList.toggle('filled', i < rating);
      });
    });
  }

  if (reviewsForm) {
    reviewsForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var nameEl = reviewsForm.querySelector('#reviewName');
      var bodyEl = reviewsForm.querySelector('#reviewBody');
      var name = nameEl ? nameEl.value.trim() : '';
      var body = bodyEl ? bodyEl.value.trim() : '';
      var rating = reviewRatingInput ? parseInt(reviewRatingInput.value, 10) : 5;
      if (!name || !body) return;
      var apiBase = (typeof window.SUPPLE_API_BASE !== 'undefined' && window.SUPPLE_API_BASE) ? window.SUPPLE_API_BASE : '';
      fetch(apiBase + '/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name, body: body, rating: isNaN(rating) ? 5 : Math.min(5, Math.max(1, rating)) })
      })
        .then(function (r) { return r.json().then(function (data) { if (!r.ok) throw new Error(data.error || 'Failed'); return data; }); })
        .then(function () {
          reviewsModal.hidden = true;
          reviewsForm.reset();
          if (reviewRatingInput) reviewRatingInput.value = '5';
          loadReviews();
        })
        .catch(function (err) {
          alert(err.message || 'Could not submit review. Try again.');
        });
    });
  }
})();
