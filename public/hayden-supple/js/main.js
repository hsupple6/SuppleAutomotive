(function () {
  'use strict';

  var config = window.HAYDEN_CONFIG || {};
  var prefersReduced =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function populateConfig() {
    var emailEl = document.getElementById('contactEmail');
    var phoneEl = document.getElementById('contactPhone');
    var linkedinEl = document.getElementById('contactLinkedin');
    var footerYear = document.getElementById('footerYear');

    if (emailEl && config.email) {
      emailEl.href = 'mailto:' + config.email;
      emailEl.textContent = config.email;
    }
    if (phoneEl && config.phone) {
      phoneEl.href = 'tel:' + config.phone.replace(/\D/g, '');
      phoneEl.textContent = config.phone;
    }
    if (linkedinEl && config.linkedin) {
      linkedinEl.href = config.linkedin;
    }
    if (config.resume) {
      var viewerEl = document.getElementById('resumeViewer');
      if (viewerEl) {
        viewerEl.src = config.resume;
      }
      ['resumeDownload', 'footerResume'].forEach(function (id) {
        var resumeEl = document.getElementById(id);
        if (resumeEl) {
          resumeEl.href = config.resume;
          resumeEl.setAttribute('download', '');
        }
      });
    }
    if (footerYear) {
      footerYear.textContent = String(new Date().getFullYear());
    }
  }

  function initHeader() {
    var header = document.querySelector('.top-bar');
    if (!header) return;

    function onScroll() {
      header.classList.toggle('scrolled', window.scrollY > 48);
    }

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  function initMobileNav() {
    var toggle = document.querySelector('.nav-toggle');
    var overlay = document.querySelector('.mobile-nav-overlay');
    if (!toggle || !overlay) return;

    function closeNav() {
      document.body.classList.remove('nav-open');
      toggle.setAttribute('aria-expanded', 'false');
    }

    toggle.addEventListener('click', function () {
      var open = document.body.classList.toggle('nav-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    overlay.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', closeNav);
    });
  }

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
    if (!words.length) return;
    var style = getComputedStyle(el);
    var measure = document.createElement('div');
    measure.style.cssText =
      'position:absolute;left:-9999px;top:0;width:' +
      el.offsetWidth +
      'px;font-family:' +
      style.fontFamily +
      ';font-size:' +
      style.fontSize +
      ';font-weight:' +
      style.fontWeight +
      ';letter-spacing:' +
      style.letterSpacing +
      ';line-height:' +
      style.lineHeight +
      ';visibility:hidden;';
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
    Array.prototype.slice.call(container.children).forEach(function (child) {
      if (child.nodeType !== 1 || child.querySelector('.split-element')) return;
      var wrap = document.createElement('div');
      wrap.className = 'split-element';
      child.parentNode.insertBefore(wrap, child);
      wrap.appendChild(child);
    });
  }

  function runLineSplits() {
    document.querySelectorAll('[data-split-lines]').forEach(splitElementIntoLines);
    document.querySelectorAll('.reveal-on-scroll').forEach(wrapRevealSplitChildren);
    document.querySelectorAll('[data-reveal-split-only]').forEach(wrapRevealSplitChildren);
  }

  var staggerStep = 0.055;
  var revealDuration = 0.45;
  var buzzLetterMs = 16;
  var buzzWordGapMs = 60;

  function prepareBuzzTargets(container) {
    container.querySelectorAll('.buzz-target').forEach(function (target) {
      if (target.hasAttribute('data-buzz-ready')) return;
      var text = target.textContent;
      target.textContent = '';
      target.setAttribute('data-buzz-ready', '');
      for (var i = 0; i < text.length; i++) {
        var ch = document.createElement('span');
        ch.className = 'buzz-char';
        ch.textContent = text.charAt(i) === ' ' ? '\u00a0' : text.charAt(i);
        if (text.charAt(i) === ' ') {
          ch.classList.add('buzz-char--space');
        }
        target.appendChild(ch);
      }
    });
  }

  function lightBuzzWord(target, done) {
    var chars = Array.prototype.slice.call(target.querySelectorAll('.buzz-char'));
    if (!chars.length) {
      done();
      return;
    }

    var tickIndex = 0;
    function nextChar() {
      if (tickIndex >= chars.length) {
        setTimeout(done, buzzWordGapMs);
        return;
      }
      var char = chars[tickIndex];
      tickIndex += 1;
      char.classList.add('is-lit');
      if (char.classList.contains('buzz-char--space')) {
        nextChar();
        return;
      }
      setTimeout(nextChar, buzzLetterMs);
    }
    nextChar();
  }

  function runBuzzSequence(targets, index) {
    if (index >= targets.length) return;
    lightBuzzWord(targets[index], function () {
      runBuzzSequence(targets, index + 1);
    });
  }

  function getRevealFinishMs(container) {
    var splits = container.querySelectorAll('.split-element');
    if (!splits.length) return 0;
    return ((splits.length - 1) * staggerStep + revealDuration) * 1000 + 90;
  }

  function scheduleBuzzHighlight(container) {
    if (container.dataset.buzzPlayed === 'true') return;
    container.dataset.buzzPlayed = 'true';

    var targets = container.querySelectorAll('.buzz-target');
    if (!targets.length) return;

    if (prefersReduced) {
      targets.forEach(function (target) {
        target.querySelectorAll('.buzz-char').forEach(function (char) {
          char.classList.add('is-lit');
        });
      });
      return;
    }

    setTimeout(function () {
      runBuzzSequence(targets, 0);
    }, getRevealFinishMs(container));
  }

  function initBuzzHighlights() {
    document.querySelectorAll('[data-buzz-highlight]').forEach(prepareBuzzTargets);
  }

  function triggerBuzzIfVisible(container) {
    if (container.classList.contains('is-visible')) {
      scheduleBuzzHighlight(container);
    }
  }

  function setRevealDelays(container) {
    var elements = container.querySelectorAll('.split-element');
    for (var i = 0; i < elements.length; i++) {
      elements[i].style.setProperty('--reveal-delay', i * staggerStep + 's');
    }
  }

  function setupRevealObserver() {
    var revealEls = document.querySelectorAll('.reveal-on-scroll');
    if (!revealEls.length) return;

    if (typeof IntersectionObserver === 'undefined' || prefersReduced) {
      revealEls.forEach(function (el) {
        setRevealDelays(el);
        el.classList.add('is-visible');
        triggerBuzzIfVisible(el);
      });
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            setRevealDelays(entry.target);
            entry.target.classList.add('is-visible');
            triggerBuzzIfVisible(entry.target);
          }
        });
      },
      { rootMargin: '0px', threshold: 0.08 }
    );

    revealEls.forEach(function (el) {
      observer.observe(el);
    });
  }

  function stackAllowsVideoPlay(video) {
    var stack = video.closest('.image-stack');
    if (!stack) return true;
    var isMulti =
      stack.classList.contains('image-stack--count-2') ||
      stack.classList.contains('image-stack--count-3');
    return !isMulti || stack.classList.contains('is-revealed');
  }

  function retryStackVideos(stack) {
    if (!stack || prefersReduced) return;
    stack.querySelectorAll('.image-stack-item--video video').forEach(function (video) {
      if (!stackAllowsVideoPlay(video)) return;
      var target = video.closest('.image-stack-item--video') || video;
      if (!isInViewport(target)) return;
      var playPromise = video.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(function () {});
      }
    });
  }

  function revealImageStack(stack) {
    if (!stack || stack.classList.contains('is-revealed')) return;
    stack.classList.add('is-revealed');
    retryStackVideos(stack);
  }

  function isInViewport(el) {
    var rect = el.getBoundingClientRect();
    var viewH = window.innerHeight || document.documentElement.clientHeight;
    var viewW = window.innerWidth || document.documentElement.clientWidth;
    return rect.bottom > 0 && rect.top < viewH && rect.right > 0 && rect.left < viewW;
  }

  function setupImageReveal() {
    var wraps = document.querySelectorAll('[data-reveal-image]');
    if (!wraps.length) return;

    var dirs = ['reveal-from-left', 'reveal-from-right', 'reveal-from-top'];

    wraps.forEach(function (wrap) {
      if (!wrap.classList.contains('reveal-from-left-full')) {
        wrap.classList.add(dirs[Math.floor(Math.random() * dirs.length)]);
      }
    });

    if (typeof IntersectionObserver === 'undefined' || prefersReduced) {
      wraps.forEach(revealImageStack);
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;

          if (entry.target.matches('[data-reveal-image]')) {
            revealImageStack(entry.target);
            return;
          }

          entry.target.querySelectorAll('[data-reveal-image]').forEach(revealImageStack);
        });
      },
      { rootMargin: '0px 0px -5% 0px', threshold: 0.08 }
    );

    wraps.forEach(function (wrap) {
      var observeTarget = wrap;
      if (wrap.getAttribute('data-variant') === 'full-slide') {
        observeTarget = wrap.closest('.education-media') || wrap.closest('#education') || wrap;
      }

      observer.observe(observeTarget);

      if (isInViewport(observeTarget)) {
        revealImageStack(wrap);
      }
    });
  }

  function getAnchorHash(link) {
    var raw = link.getAttribute('href') || '';
    var hashIndex = raw.indexOf('#');
    return hashIndex >= 0 ? raw.slice(hashIndex) : raw;
  }

  function getScrollOffset() {
    var header = document.querySelector('.top-bar');
    return header ? header.offsetHeight + 16 : 80;
  }

  function scrollToAnchor(target) {
    if (!target) return;
    var top = target.getBoundingClientRect().top + window.scrollY - getScrollOffset();
    window.scrollTo({
      top: Math.max(0, top),
      behavior: prefersReduced ? 'auto' : 'smooth',
    });
  }

  function initSmoothAnchors() {
    document.querySelectorAll('a[href*="#"]').forEach(function (link) {
      link.addEventListener('click', function (e) {
        var hash = getAnchorHash(link);
        if (!hash || hash === '#') return;
        var target = document.querySelector(hash);
        if (!target) return;
        e.preventDefault();
        scrollToAnchor(target);
        if (history.replaceState) {
          history.replaceState(null, '', hash);
        } else {
          location.hash = hash;
        }
      });
    });

    if (location.hash) {
      var initialTarget = document.querySelector(location.hash);
      if (initialTarget) {
        requestAnimationFrame(function () {
          scrollToAnchor(initialTarget);
        });
      }
    }
  }

  function initImageStacks() {
    var stacks = document.querySelectorAll('.image-stack[data-image-section]');
    if (!stacks.length || typeof fetch !== 'function') return Promise.resolve();

    function opposite(side) {
      return side === 'left' ? 'right' : 'left';
    }

    var jobs = Array.prototype.map.call(stacks, function (stack) {
      var section = stack.getAttribute('data-image-section');
      var placeholderLabel = stack.getAttribute('data-placeholder-label') || section;

      var placeholder = document.createElement('div');
      placeholder.className = 'image-stack-placeholder';

      var icon = document.createElement('div');
      icon.className = 'image-stack-placeholder-icon';
      icon.textContent = '+';

      var label = document.createElement('span');
      label.className = 'image-stack-placeholder-label';
      label.textContent = placeholderLabel;

      var hint = document.createElement('span');
      hint.className = 'image-stack-placeholder-hint';
      hint.textContent = 'Add images/' + section + '/';

      placeholder.appendChild(icon);
      placeholder.appendChild(label);
      placeholder.appendChild(hint);
      stack.appendChild(placeholder);

      return fetch('images/' + section + '/manifest.json')
        .then(function (res) {
          if (!res.ok) throw new Error('manifest missing');
          return res.json();
        })
        .then(function (files) {
          var list = Array.isArray(files) ? files.slice(0, 3) : [];
          if (!list.length) return;

          var count = list.length;
          stack.classList.add('image-stack--count-' + count);

          var biasStart = Math.random() < 0.5 ? 'left' : 'right';

          for (var i = 0; i < list.length; i++) {
            var file = list[i];

            var bias = null;
            if (count === 2) {
              bias = i === 0 ? biasStart : opposite(biasStart);
            } else if (count === 3) {
              bias = i === 1 ? opposite(biasStart) : biasStart;
            }

            var item = document.createElement('div');
            item.className = 'image-stack-item';
            if (i === 0) item.classList.add('image-stack-item--lead');
            if (bias) item.classList.add('image-stack-item--bias-' + bias);
            item.style.setProperty('--seq-delay', i * 0.18 + 's');

            var mediaUrl = 'images/' + section + '/' + encodeURIComponent(file);

            if (isVideoFile(file)) {
              var video = document.createElement('video');
              video.src = mediaUrl;
              video.muted = true;
              video.loop = true;
              video.playsInline = true;
              video.setAttribute('muted', '');
              video.setAttribute('playsinline', '');
              video.setAttribute('webkit-playsinline', '');
              video.preload = 'auto';
              video.setAttribute('aria-label', altFromFilename(file));
              item.classList.add('image-stack-item--video');
              item.appendChild(video);
            } else {
              var img = document.createElement('img');
              img.src = mediaUrl;
              img.alt = altFromFilename(file);
              img.loading = i === 0 ? 'eager' : 'lazy';
              img.decoding = 'async';
              item.appendChild(img);
            }

            stack.appendChild(item);
          }

          stack.classList.add('has-image');

          var leadImg = stack.querySelector('.image-stack-item--lead img');
          if (leadImg) {
            if (stack.getAttribute('data-variant') === 'full-slide') {
              leadImg.loading = 'eager';
              leadImg.setAttribute('fetchpriority', 'high');
            }

            function onLeadReady() {
              if (isInViewport(stack.closest('.education-media') || stack)) {
                revealImageStack(stack);
              }
            }

            if (leadImg.complete) {
              onLeadReady();
            } else {
              leadImg.addEventListener('load', onLeadReady);
            }
          }
        })
        .catch(function () {
          // Keep placeholder if manifest/images fail.
        });
    });

    return Promise.all(jobs);
  }

  function isVideoFile(file) {
    return /\.(mp4|mov|webm)$/i.test(file);
  }

  function initStackVideos() {
    var videos = document.querySelectorAll('.image-stack-item--video video');
    if (!videos.length) return;

    videos.forEach(function (video) {
      bindStackVideo(video);
    });
  }

  function bindStackVideo(video) {
    if (prefersReduced) {
      video.pause();
      video.currentTime = 0;
      return;
    }

    var item = video.closest('.image-stack-item--video');
    var stack = video.closest('.image-stack');
    var target = item || video;
    var inView = isInViewport(target);

    function tryPlay() {
      if (!inView || !stackAllowsVideoPlay(video)) return;
      var playPromise = video.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(function () {});
      }
    }

    if (typeof IntersectionObserver === 'undefined') {
      inView = true;
      tryPlay();
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          inView = entry.isIntersecting;
          if (inView) {
            tryPlay();
          } else {
            video.pause();
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px' }
    );

    observer.observe(target);
    video.addEventListener('loadeddata', tryPlay);
    video.addEventListener('canplay', tryPlay);
    if (video.readyState >= 2) tryPlay();

    if (stack && !stack.classList.contains('is-revealed')) {
      var revealObserver = new MutationObserver(function () {
        if (stack.classList.contains('is-revealed')) {
          tryPlay();
          revealObserver.disconnect();
        }
      });
      revealObserver.observe(stack, { attributes: true, attributeFilter: ['class'] });
    }
  }

  function altFromFilename(file) {
    var base = file.replace(/\.[^.]+$/, '');
    return base
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, function (c) {
        return c.toUpperCase();
      });
  }

  function initLogoMarquee() {
    var setA = document.getElementById('logoMarqueeSetA');
    var setB = document.getElementById('logoMarqueeSetB');
    var track = document.getElementById('logoMarqueeTrack');
    var marquee = document.querySelector('.block-logo-marquee');
    if (!setA || !setB) return;

    fetch('logos/manifest.json')
      .then(function (res) {
        if (!res.ok) throw new Error('manifest missing');
        return res.json();
      })
      .then(function (files) {
        if (!files.length) {
          if (marquee) marquee.hidden = true;
          return;
        }

        function buildItem(file) {
          var item = document.createElement('div');
          item.className = 'logo-marquee-item';

          var img = document.createElement('img');
          img.src = 'logos/' + file;
          img.alt = altFromFilename(file);
          img.loading = 'lazy';
          img.decoding = 'async';
          item.appendChild(img);
          return item;
        }

        files.forEach(function (file) {
          setA.appendChild(buildItem(file));
          setB.appendChild(buildItem(file));
        });

        if (prefersReduced && track) {
          track.style.animation = 'none';
        }
      })
      .catch(function () {
        if (marquee) marquee.hidden = true;
      });
  }

  function revealHero() {
    var hero = document.getElementById('heroReveal');
    if (!hero) return;
    setRevealDelays(hero);
    hero.classList.add('is-visible');
  }

  function initCarsSpecCallout() {
    var callout = document.querySelector('[data-car-spec-callout]');
    if (!callout) return;

    function showAllSteps() {
      callout.dataset.played = 'true';
      callout.classList.add('cs-step-dot', 'cs-step-diag', 'cs-step-horiz', 'cs-step-card');
      callout.removeAttribute('aria-hidden');
    }

    function playCallout() {
      if (callout.dataset.played === 'true') return;
      callout.dataset.played = 'true';

      var steps = ['cs-step-dot', 'cs-step-diag', 'cs-step-horiz', 'cs-step-card'];
      var delays = [0, 220, 520, 760];

      steps.forEach(function (step, index) {
        setTimeout(function () {
          callout.classList.add(step);
          if (step === 'cs-step-card') {
            callout.removeAttribute('aria-hidden');
          }
        }, delays[index]);
      });
    }

    if (prefersReduced) {
      showAllSteps();
      return;
    }

    if (typeof IntersectionObserver === 'undefined') {
      playCallout();
      return;
    }

    var played = false;
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting || played) return;
          played = true;
          playCallout();
          observer.disconnect();
        });
      },
      { threshold: 0.35, rootMargin: '0px' }
    );

    observer.observe(callout.closest('.hobby-panel') || callout);
  }

  function initLeadershipTree() {
    var section = document.getElementById('leadership');
    if (!section) return;

    var timeline = section.querySelector('[data-leadership-timeline]');
    if (!timeline) return;

    function loadLeadershipImages() {
      if (typeof fetch !== 'function') return;

      fetch('images/student-gov/manifest.json')
        .then(function (res) {
          if (!res.ok) throw new Error('manifest missing');
          return res.json();
        })
        .then(function (files) {
          var list = Array.isArray(files) ? files.slice(0, 2) : [];
          var slotOrder = [1, 0];
          slotOrder.forEach(function (fileIndex, slotIndex) {
            var file = list[fileIndex];
            if (!file) return;
            var slot = section.querySelector('[data-leadership-image="' + slotIndex + '"]');
            if (!slot) return;

            var img = document.createElement('img');
            img.src = 'images/student-gov/' + encodeURIComponent(file);
            img.alt = altFromFilename(file);
            img.loading = slotIndex === 0 ? 'eager' : 'lazy';
            img.decoding = 'async';
            slot.appendChild(img);
            slot.classList.add('has-image');
          });
        })
        .catch(function () {
          // Placeholders remain.
        });
    }

    function playTimeline() {
      if (timeline.dataset.played === 'true') return;
      timeline.dataset.played = 'true';

      var steps = [
        'lt-step-dot',
        'lt-step-stem-1',
        'lt-step-branch-left',
        'lt-step-card-1',
        'lt-step-stem-2',
        'lt-step-branch-right',
        'lt-step-card-2',
      ];
      var delays = [0, 180, 400, 520, 740, 920, 1040];

      steps.forEach(function (step, index) {
        setTimeout(function () {
          timeline.classList.add(step);
        }, delays[index]);
      });
    }

    function showAllSteps() {
      timeline.dataset.played = 'true';
      timeline.classList.add(
        'lt-step-dot',
        'lt-step-stem-1',
        'lt-step-branch-left',
        'lt-step-card-1',
        'lt-step-stem-2',
        'lt-step-branch-right',
        'lt-step-card-2'
      );
    }

    loadLeadershipImages();

    if (prefersReduced) {
      showAllSteps();
      return;
    }

    if (typeof IntersectionObserver === 'undefined') {
      playTimeline();
      return;
    }

    var played = false;
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting || played) return;
          played = true;
          playTimeline();
          observer.disconnect();
        });
      },
      { threshold: 0.3, rootMargin: '0px' }
    );

    observer.observe(timeline);
  }

  populateConfig();
  initHeader();
  initMobileNav();
  initSmoothAnchors();
  runLineSplits();
  initBuzzHighlights();
  setupRevealObserver();
  initImageStacks().then(function () {
    setupImageReveal();
    initStackVideos();
  });
  initLogoMarquee();
  initLeadershipTree();
  initCarsSpecCallout();
  revealHero();
})();
