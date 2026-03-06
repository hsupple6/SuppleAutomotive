(function () {
  'use strict';

  var CONFIG = window.SUPPLE_CONFIG || {};
  var phoneDisplay = '+(1) 805 - 443 - 4181';
  var businessName = 'Supple Automotive';
  var tagline = 'Professional auto care you can trust.';

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

  // Cookie bar (Koenigsegg-style)
  var cookieBar = byId('cookieBar');
  var cookieAccept = byId('cookieAccept');
  if (cookieBar && cookieAccept) {
    if (typeof localStorage !== 'undefined' && localStorage.getItem('supple-cookies-accepted')) {
      cookieBar.classList.remove('visible');
    } else {
      cookieBar.classList.add('visible');
    }
    cookieAccept.addEventListener('click', function () {
      if (typeof localStorage !== 'undefined') localStorage.setItem('supple-cookies-accepted', '1');
      cookieBar.classList.remove('visible');
    });
  }

  // Request service: full-page blue slash, then navigate to request-service.html
  var requestServiceLinks = document.querySelectorAll('.js-request-service-link');
  var slashOverlay = byId('slashOverlay');
  var slashLine = byId('slashOverlayLine');
  var slashLineBg = byId('slashOverlayLineBg');
  if (requestServiceLinks.length && slashOverlay && slashLine) {
    function goToRequestService(e) {
      var href = e.currentTarget.getAttribute('href');
      if (!href || href.indexOf('request-service') === -1) return;
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

  // Payment Portal: same slash animation but WHITE strip, then navigate to payment.html
  var paymentPortalLinks = document.querySelectorAll('.js-payment-portal-link');
  if (paymentPortalLinks.length && slashOverlay && slashLine) {
    function goToPayment(e) {
      var href = e.currentTarget.getAttribute('href');
      if (!href || href.indexOf('payment') === -1) return;
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
    function onScroll() {
      topBar.classList.toggle('scrolled', window.scrollY > 80);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
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

  function runLineSplits() {
    document.querySelectorAll('[data-split-lines]').forEach(splitElementIntoLines);
    document.querySelectorAll('.reveal-on-scroll').forEach(function (container) {
      var direct = Array.prototype.slice.call(container.children);
      direct.forEach(function (child) {
        if (child.nodeType === 1 && !child.querySelector('.split-element')) {
          var wrap = document.createElement('div');
          wrap.className = 'split-element';
          child.parentNode.insertBefore(wrap, child);
          wrap.appendChild(child);
        }
      });
    });
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
        revealObserver.observe(el);
      });
    } else if (revealEls.length) {
      revealEls.forEach(function (el) {
        setRevealDelays(el);
        el.classList.add('is-visible');
      });
    }
  }

  function initReveal() {
    runLineSplits();
    setupRevealObserver();
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

  // Process slideshow: dots + track + chevrons, auto-advance (stops when chevron clicked)
  var processTrack = document.getElementById('processSliderTrack');
  var processDotsContainer = document.getElementById('processDots');
  var processPrev = document.getElementById('processPrev');
  var processNext = document.getElementById('processNext');
  if (processTrack && processDotsContainer) {
    var processSlides = processTrack.querySelectorAll('.process-slide');
    var processDots = processDotsContainer.querySelectorAll('.process-dot');
    var processIndex = 0;
    var processTotal = processSlides.length;
    var processInterval = 6000;
    var processTimer = null;
    var processAutoStoppedByUser = false;

    function setProcessSlide(i) {
      processIndex = (i + processTotal) % processTotal;
      processTrack.style.transform = 'translateX(-' + processIndex * 100 + '%)';
      processDots.forEach(function (dot, d) {
        var selected = d === processIndex;
        dot.setAttribute('aria-selected', selected);
      });
    }

    function stopAutoAdvance(byUser) {
      if (processTimer) {
        clearInterval(processTimer);
        processTimer = null;
      }
      if (byUser) processAutoStoppedByUser = true;
    }

    processDots.forEach(function (dot, d) {
      dot.addEventListener('click', function () {
        setProcessSlide(d);
      });
    });

    if (processPrev) {
      processPrev.addEventListener('click', function () {
        stopAutoAdvance(true);
        setProcessSlide(processIndex - 1);
      });
    }
    if (processNext) {
      processNext.addEventListener('click', function () {
        stopAutoAdvance(true);
        setProcessSlide(processIndex + 1);
      });
    }

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
  }

  // Contact switch (Email / Phone) with animation
  var contactSwitch = document.querySelector('.contact-switch');
  if (contactSwitch) {
    var options = contactSwitch.querySelectorAll('.contact-switch-option');
    var detailEmail = document.querySelector('.contact-detail-email');
    var detailPhone = document.querySelector('.contact-detail-phone');
    var inputEmail = byId('formEmail');
    var inputPhone = byId('formPhone');

    function setMode(mode) {
      var isEmail = mode === 'email';
      options.forEach(function (opt) {
        opt.classList.toggle('active', opt.getAttribute('data-mode') === mode);
        opt.setAttribute('aria-pressed', opt.getAttribute('data-mode') === mode);
      });
      if (detailEmail) detailEmail.classList.toggle('is-hidden', !isEmail);
      if (detailPhone) detailPhone.classList.toggle('is-hidden', isEmail);
      if (inputEmail) inputEmail.removeAttribute('required');
      if (inputPhone) inputPhone.removeAttribute('required');
      if (isEmail && inputEmail) inputEmail.setAttribute('required', 'required');
      if (!isEmail && inputPhone) inputPhone.setAttribute('required', 'required');
    }

    options.forEach(function (btn) {
      btn.addEventListener('click', function () {
        setMode(btn.getAttribute('data-mode'));
      });
    });
    setMode('email');
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
      var payload = {
        toEmail: CONFIG.email && CONFIG.email.trim() ? CONFIG.email.trim() : '',
        toPhone: CONFIG.phone && CONFIG.phone.trim() ? CONFIG.phone.trim() : '',
        name: (serviceForm.querySelector('[name="name"]') || {}).value || '',
        email: (serviceForm.querySelector('[name="email"]') || {}).value || '',
        phone: (serviceForm.querySelector('[name="phone"]') || {}).value || '',
        vehicle_year: (serviceForm.querySelector('[name="vehicle_year"]') || {}).value || '',
        vehicle_make: (serviceForm.querySelector('[name="vehicle_make"]') || {}).value || '',
        vehicle_model: (serviceForm.querySelector('[name="vehicle_model"]') || {}).value || '',
        service_type: (serviceForm.querySelector('[name="service_type"]') || {}).value || '',
        details: (serviceForm.querySelector('[name="details"]') || {}).value || '',
        preferred_date: (serviceForm.querySelector('[name="preferred_date"]') || {}).value || '',
        preferred_time: (serviceForm.querySelector('[name="preferred_time"]') || {}).value || '',
        notes: (serviceForm.querySelector('[name="notes"]') || {}).value || ''
      };
      if (!payload.toEmail || !payload.toPhone) {
        showFormMessage(serviceForm, 'Contact email and phone are not set in config.', true);
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
})();
