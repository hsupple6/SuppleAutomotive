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
  function runMobileHamburgerSlashNavigate(href) {
    if (!window.matchMedia('(max-width: 900px)').matches) return false;
    var mobileNavSlash = byId('mobileNavSlash');
    var mobileNavSlashFill = mobileNavSlash ? mobileNavSlash.querySelector('.mobile-nav-slash-fill') : null;
    var mobileNavOverlayContent = byId('mobileNavOverlayContent');
    var topBarForNav = document.querySelector('.top-bar');
    var navToggleForNav = byId('navToggle');
    var navMenuContentForNav = byId('navMenuContent');
    if (!mobileNavSlash || !mobileNavSlashFill) return false;

    if (topBarForNav) {
      topBarForNav.classList.remove('nav-open', 'nav-with-slash');
    }
    if (navToggleForNav) {
      navToggleForNav.setAttribute('aria-expanded', 'false');
      navToggleForNav.setAttribute('aria-label', 'Open menu');
    }
    if (navMenuContentForNav) navMenuContentForNav.classList.remove('is-visible');
    if (mobileNavOverlayContent) mobileNavOverlayContent.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';

    mobileNavSlash.setAttribute('aria-hidden', 'false');
    mobileNavSlash.classList.add('mobile-nav-slash-active', 'mobile-nav-slash-open');
    mobileNavSlash.classList.remove('mobile-nav-slash-close', 'mobile-nav-slash-behind');

    var done = false;
    function navigate() {
      if (done) return;
      done = true;
      window.location.href = href;
    }
    var fallback = setTimeout(navigate, 1400);
    function onCloseEnd() {
      clearTimeout(fallback);
      navigate();
    }
    var closeStarted = false;
    function startClose() {
      if (closeStarted) return;
      closeStarted = true;
      mobileNavSlash.classList.remove('mobile-nav-slash-open', 'mobile-nav-slash-behind');
      mobileNavSlash.classList.add('mobile-nav-slash-close');
      mobileNavSlashFill.addEventListener('animationend', onCloseEnd, { once: true });
    }
    mobileNavSlashFill.addEventListener('animationend', startClose, { once: true });
    // Kick close a bit early so mobile does not sit on a blue full-screen hold.
    setTimeout(startClose, 260);
    return true;
  }

  if (requestServiceLinks.length) {
    function goToRequestService(e) {
      var href = e.currentTarget.getAttribute('href');
      if (!href || href.indexOf('request-service') === -1) return;
      if (runMobileHamburgerSlashNavigate('request-service.html')) {
        e.preventDefault();
        e.stopPropagation();
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

  // Payment Portal: same slash animation but WHITE strip, then navigate to payment.html
  var paymentPortalLinks = document.querySelectorAll('.js-payment-portal-link');
  if (paymentPortalLinks.length) {
    function goToPayment(e) {
      var href = e.currentTarget.getAttribute('href');
      if (!href || href.indexOf('payment') === -1) return;
      if (runMobileHamburgerSlashNavigate('payment.html')) {
        e.preventDefault();
        e.stopPropagation();
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

  // Contact switch: service request (Email / SMS) uses #contactPreference; payment portal (Email / Phone) uses #paymentForm
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
        toEmail: enteredEmail,
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
      if (!payload.toEmail) {
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
