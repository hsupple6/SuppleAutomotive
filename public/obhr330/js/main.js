(function () {
  'use strict';

  var ROUND_MS = 90000;
  var RATE_WINDOW = 5;

  var prefersReduced =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var categories = [];
  var currentCategory = '';
  var spinning = false;
  var phase = 'pick';
  var rafId = 0;
  var lastX = 0;
  var entries = [];
  var roundStart = 0;
  var roundRaf = 0;

  var track = document.getElementById('reelTrack');
  var viewport = document.getElementById('reelViewport');
  var shell = document.getElementById('reelShell');
  var continueBtn = document.getElementById('continueBtn');
  var respinBtn = document.getElementById('respinBtn');
  var statusText = document.getElementById('statusText');
  var playStage = document.getElementById('playStage');
  var resultsStage = document.getElementById('resultsStage');
  var playCategory = document.getElementById('playCategory');
  var playTimer = document.getElementById('playTimer');
  var playMeterFill = document.getElementById('playMeterFill');
  var playList = document.getElementById('playList');
  var playForm = document.getElementById('playForm');
  var playInput = document.getElementById('playInput');
  var resultsCategory = document.getElementById('resultsCategory');
  var resultsStat = document.getElementById('resultsStat');
  var resultsList = document.getElementById('resultsList');
  var burnoutGraph = document.getElementById('burnoutGraph');
  var statsPanel = document.getElementById('statsPanel');
  var againBtn = document.getElementById('againBtn');
  var sampleBtn = document.getElementById('sampleBtn');

  function parseCategories(raw) {
    var seen = {};
    return String(raw || '')
      .split(/\r?\n/)
      .map(function (line) { return line.trim(); })
      .filter(function (line) {
        if (!line || line.charAt(0) === '#') return false;
        var key = line.toLowerCase();
        if (seen[key]) return false;
        seen[key] = true;
        return true;
      });
  }

  function rand(max) {
    return Math.floor(Math.random() * max);
  }

  function pickCategory(exclude) {
    if (categories.length === 1) return categories[0];
    var next = categories[rand(categories.length)];
    var guard = 0;
    while (next === exclude && guard < 40) {
      next = categories[rand(categories.length)];
      guard += 1;
    }
    return next;
  }

  function randomFiller(avoidA, avoidB) {
    var next = categories[rand(categories.length)];
    var guard = 0;
    while ((next === avoidA || next === avoidB) && guard < 30) {
      next = categories[rand(categories.length)];
      guard += 1;
    }
    return next;
  }

  function syncButtons() {
    var onPick = phase === 'pick';
    continueBtn.disabled = spinning || !onPick;
    respinBtn.disabled = spinning || !onPick;
    continueBtn.setAttribute('aria-disabled', continueBtn.disabled ? 'true' : 'false');
    respinBtn.setAttribute('aria-disabled', respinBtn.disabled ? 'true' : 'false');
  }

  function setBusy(isBusy) {
    spinning = isBusy;
    syncButtons();
  }

  function splitTitle() {
    var line = document.querySelector('[data-split]');
    if (!line || line.getAttribute('data-split-done')) return;
    var words = (line.textContent || '').trim().split(/\s+/);
    line.textContent = '';
    words.forEach(function (word, i) {
      var wrap = document.createElement('span');
      wrap.className = 'split-word';
      var inner = document.createElement('span');
      inner.textContent = word;
      inner.style.setProperty('--d', (0.12 + i * 0.07) + 's');
      wrap.appendChild(inner);
      line.appendChild(wrap);
      if (i < words.length - 1) line.appendChild(document.createTextNode(' '));
    });
    line.setAttribute('data-split-done', '');
  }

  function xForIndex(index) {
    var items = track.children;
    if (!items.length || !viewport) return 0;
    var item = items[Math.max(0, Math.min(index, items.length - 1))];
    var center = item.offsetLeft + item.offsetWidth / 2;
    return viewport.clientWidth / 2 - center;
  }

  function applyX(x, blurPx) {
    lastX = x;
    track.style.transform = 'translate3d(' + x + 'px, 0, 0)';
    if (blurPx && blurPx > 0.35) {
      track.style.filter = 'blur(' + Math.min(10, blurPx) + 'px)';
    } else {
      track.style.filter = 'none';
    }
  }

  function nearestIndex(x) {
    var items = track.children;
    var viewCenter = viewport.clientWidth / 2;
    var best = 0;
    var bestDist = Infinity;
    for (var i = 0; i < items.length; i++) {
      var itemCenter = x + items[i].offsetLeft + items[i].offsetWidth / 2;
      var dist = Math.abs(itemCenter - viewCenter);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    }
    return best;
  }

  function markCenter(index) {
    var items = track.children;
    for (var i = 0; i < items.length; i++) {
      items[i].classList.toggle('is-center', i === index);
    }
  }

  function renderSequence(seq, startIndex) {
    track.innerHTML = '';
    seq.forEach(function (label, i) {
      var el = document.createElement('div');
      el.className = 'reel-item' + (i === startIndex ? ' is-center' : '');
      if (label.length > 22) el.classList.add('is-long');
      el.textContent = label;
      track.appendChild(el);
    });
  }

  function easeOutQuint(t) {
    return 1 - Math.pow(1 - t, 5);
  }

  function land(category) {
    currentCategory = category;
    shell.classList.remove('is-spinning');
    shell.classList.add('is-landing');
    track.setAttribute('aria-label', 'Category: ' + category);
    if (navigator.vibrate) {
      try { navigator.vibrate(12); } catch (e) {}
    }
    window.setTimeout(function () {
      shell.classList.remove('is-landing');
    }, 620);
    setBusy(false);
  }

  function animateTo(fromX, toX, duration, targetIndex, category) {
    if (rafId) cancelAnimationFrame(rafId);
    var start = performance.now();
    var distance = Math.abs(toX - fromX);

    function frame(now) {
      var t = Math.min(1, (now - start) / duration);
      var e = prefersReduced ? 1 : easeOutQuint(t);
      var x = fromX + (toX - fromX) * e;
      var velocity = distance * 5 * Math.pow(1 - t, 4) / Math.max(duration, 1);
      applyX(x, prefersReduced ? 0 : velocity * 0.085);
      markCenter(t > 0.86 ? targetIndex : nearestIndex(x));
      if (t < 1) {
        rafId = requestAnimationFrame(frame);
      } else {
        applyX(toX, 0);
        markCenter(targetIndex);
        land(category);
      }
    }

    rafId = requestAnimationFrame(frame);
  }

  function spin(isInitial) {
    if (spinning || categories.length === 0 || phase !== 'pick') return;

    var target = pickCategory(currentCategory);
    var flyby = isInitial ? 22 : 16 + rand(10);
    var seq = [];
    if (currentCategory) seq.push(currentCategory);
    else seq.push(randomFiller(target, ''));

    for (var i = 0; i < flyby; i++) {
      seq.push(randomFiller(seq[seq.length - 1], target));
    }
    seq.push(target);

    renderSequence(seq, 0);
    applyX(xForIndex(0), 0);
    markCenter(0);

    setBusy(true);
    shell.classList.add('is-spinning');
    shell.classList.remove('is-landing', 'is-locked');

    var targetIndex = seq.length - 1;
    var duration = prefersReduced ? 1 : (isInitial ? 2400 : 1750 + rand(700));

    requestAnimationFrame(function () {
      var fromX = xForIndex(0);
      var toX = xForIndex(targetIndex);
      applyX(fromX, 0);
      requestAnimationFrame(function () {
        animateTo(fromX, toX, duration, targetIndex, target);
      });
    });
  }

  function formatClock(ms) {
    var sec = Math.max(0, Math.ceil(ms / 1000));
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function makeChip(text) {
    var li = document.createElement('li');
    li.className = 'play-chip';
    li.textContent = text;
    return li;
  }

  function addEntry(text) {
    var value = String(text || '').replace(/\s+/g, ' ').trim();
    if (!value || phase !== 'play') return false;
    var elapsed = performance.now() - roundStart;
    if (elapsed >= ROUND_MS) return false;
    entries.push({ text: value, t: elapsed });
    playList.appendChild(makeChip(value));
    playList.scrollTop = playList.scrollHeight;
    return true;
  }

  function tickRound(now) {
    if (phase !== 'play') return;
    var elapsed = now - roundStart;
    var remain = Math.max(0, ROUND_MS - elapsed);
    playTimer.textContent = formatClock(remain);
    playTimer.classList.toggle('is-late', remain <= 10000);
    playMeterFill.style.transform = 'scaleX(' + (remain / ROUND_MS) + ')';
    if (remain <= 0) {
      endRound();
      return;
    }
    roundRaf = requestAnimationFrame(tickRound);
  }

  function startRound() {
    if (spinning || !currentCategory || phase !== 'pick') return;
    phase = 'play';
    entries = [];
    playList.innerHTML = '';
    playInput.value = '';
    playCategory.textContent = currentCategory;
    playTimer.textContent = '1:30';
    playTimer.classList.remove('is-late');
    playMeterFill.style.transform = 'scaleX(1)';
    playStage.hidden = false;
    resultsStage.hidden = true;
    document.body.classList.add('is-playing');
    document.body.classList.remove('is-results');
    syncButtons();
    roundStart = performance.now();
    if (roundRaf) cancelAnimationFrame(roundRaf);
    roundRaf = requestAnimationFrame(tickRound);
    window.setTimeout(function () {
      playInput.focus();
    }, 80);
  }

  function svgEl(name, attrs) {
    var el = document.createElementNS('http://www.w3.org/2000/svg', name);
    Object.keys(attrs || {}).forEach(function (key) {
      el.setAttribute(key, attrs[key]);
    });
    return el;
  }

  function computeRates(list) {
    var bins = [];
    var i;
    for (i = 0; i < 90; i++) bins.push(0);
    list.forEach(function (entry) {
      var sec = Math.floor(entry.t / 1000);
      if (sec >= 0 && sec < 90) bins[sec] += 1;
    });
    var rates = [];
    for (i = 0; i < 90; i++) {
      var from = Math.max(0, i - RATE_WINDOW + 1);
      var sum = 0;
      var j;
      for (j = from; j <= i; j++) sum += bins[j];
      rates.push(sum / (i - from + 1));
    }
    return { bins: bins, rates: rates };
  }

  function sum(arr) {
    var t = 0;
    for (var i = 0; i < arr.length; i++) t += arr[i];
    return t;
  }

  function mean(arr) {
    return arr.length ? sum(arr) / arr.length : NaN;
  }

  function sortedCopy(arr) {
    return arr.slice().sort(function (a, b) { return a - b; });
  }

  function quantile(arr, p) {
    if (!arr.length) return NaN;
    var s = sortedCopy(arr);
    var idx = (s.length - 1) * p;
    var lo = Math.floor(idx);
    var hi = Math.ceil(idx);
    if (lo === hi) return s[lo];
    return s[lo] * (hi - idx) + s[hi] * (idx - lo);
  }

  function median(arr) {
    return quantile(arr, 0.5);
  }

  function variance(arr, sample) {
    if (arr.length < (sample ? 2 : 1)) return NaN;
    var m = mean(arr);
    var t = 0;
    for (var i = 0; i < arr.length; i++) t += (arr[i] - m) * (arr[i] - m);
    return t / (sample ? arr.length - 1 : arr.length);
  }

  function stdev(arr, sample) {
    var v = variance(arr, sample);
    return isFinite(v) ? Math.sqrt(v) : NaN;
  }

  function mad(arr) {
    if (!arr.length) return NaN;
    var med = median(arr);
    return median(arr.map(function (x) { return Math.abs(x - med); }));
  }

  function modeValue(arr) {
    if (!arr.length) return NaN;
    var counts = {};
    var best = arr[0];
    var bestN = 0;
    for (var i = 0; i < arr.length; i++) {
      var key = String(arr[i]);
      counts[key] = (counts[key] || 0) + 1;
      if (counts[key] > bestN) {
        bestN = counts[key];
        best = arr[i];
      }
    }
    return best;
  }

  function skewness(arr) {
    var n = arr.length;
    if (n < 3) return NaN;
    var m = mean(arr);
    var s = stdev(arr, true);
    if (!s) return 0;
    var t = 0;
    for (var i = 0; i < n; i++) t += Math.pow((arr[i] - m) / s, 3);
    return (n / ((n - 1) * (n - 2))) * t;
  }

  function excessKurtosis(arr) {
    var n = arr.length;
    if (n < 4) return NaN;
    var m = mean(arr);
    var s = stdev(arr, true);
    if (!s) return 0;
    var t = 0;
    for (var i = 0; i < n; i++) t += Math.pow((arr[i] - m) / s, 4);
    var num = (n * (n + 1)) * t;
    var den = (n - 1) * (n - 2) * (n - 3);
    var adj = (3 * (n - 1) * (n - 1)) / ((n - 2) * (n - 3));
    return num / den - adj;
  }

  function ols(xs, ys) {
    var n = Math.min(xs.length, ys.length);
    if (n < 2) return { slope: NaN, intercept: NaN, r: NaN, r2: NaN };
    var mx = mean(xs);
    var my = mean(ys);
    var sxx = 0;
    var sxy = 0;
    var syy = 0;
    for (var i = 0; i < n; i++) {
      var dx = xs[i] - mx;
      var dy = ys[i] - my;
      sxx += dx * dx;
      sxy += dx * dy;
      syy += dy * dy;
    }
    if (!sxx) return { slope: 0, intercept: my, r: NaN, r2: NaN };
    var slope = sxy / sxx;
    var intercept = my - slope * mx;
    var r = syy ? sxy / Math.sqrt(sxx * syy) : NaN;
    return { slope: slope, intercept: intercept, r: r, r2: r * r };
  }

  function lag1Auto(arr) {
    if (arr.length < 3) return NaN;
    var a = arr.slice(0, -1);
    var b = arr.slice(1);
    var ma = mean(a);
    var mb = mean(b);
    var num = 0;
    var da = 0;
    var db = 0;
    for (var i = 0; i < a.length; i++) {
      var x = a[i] - ma;
      var y = b[i] - mb;
      num += x * y;
      da += x * x;
      db += y * y;
    }
    if (!da || !db) return NaN;
    return num / Math.sqrt(da * db);
  }

  function shannonEntropy(arr) {
    var total = sum(arr);
    if (!total) return 0;
    var h = 0;
    for (var i = 0; i < arr.length; i++) {
      if (!arr[i]) continue;
      var p = arr[i] / total;
      h -= p * Math.log(p) / Math.LN2;
    }
    return h;
  }

  function gini(arr) {
    var n = arr.length;
    if (!n) return NaN;
    var s = sortedCopy(arr);
    var total = sum(s);
    if (!total) return 0;
    var acc = 0;
    for (var i = 0; i < n; i++) acc += (2 * (i + 1) - n - 1) * s[i];
    return acc / (n * total);
  }

  function longestRun(arr, pred) {
    var best = 0;
    var cur = 0;
    var start = -1;
    var bestStart = -1;
    for (var i = 0; i < arr.length; i++) {
      if (pred(arr[i])) {
        if (!cur) start = i;
        cur += 1;
        if (cur > best) {
          best = cur;
          bestStart = start;
        }
      } else {
        cur = 0;
      }
    }
    return { length: best, start: bestStart };
  }

  function fmt(v, digits) {
    if (v == null || !isFinite(v)) return '—';
    var n = Number(v);
    if (Math.abs(n) >= 100) return String(Math.round(n));
    return n.toFixed(digits == null ? 2 : digits);
  }

  function fmtSec(v) {
    if (v == null || !isFinite(v)) return '—';
    return fmt(v, 1) + 's';
  }

  function fmtPct(v) {
    if (v == null || !isFinite(v)) return '—';
    return fmt(v * 100, 1) + '%';
  }

  function fmtSigned(v, digits) {
    if (v == null || !isFinite(v)) return '—';
    var n = Number(v);
    var body = fmt(Math.abs(n), digits);
    return (n > 0 ? '+' : n < 0 ? '−' : '') + body;
  }

  function analyze(list) {
    var series = computeRates(list);
    var bins = series.bins;
    var rates = series.rates;
    var n = list.length;
    var xs = [];
    var i;
    for (i = 0; i < 90; i++) xs.push(i);

    var first = n ? list[0].t / 1000 : NaN;
    var last = n ? list[n - 1].t / 1000 : NaN;
    var peakBin = 0;
    var peakVal = bins[0];
    for (i = 1; i < bins.length; i++) {
      if (bins[i] > peakVal) {
        peakVal = bins[i];
        peakBin = i;
      }
    }
    var peakRate = 0;
    var peakRateAt = 0;
    for (i = 0; i < rates.length; i++) {
      if (rates[i] > peakRate) {
        peakRate = rates[i];
        peakRateAt = i;
      }
    }

    var first30 = sum(bins.slice(0, 30));
    var mid30 = sum(bins.slice(30, 60));
    var last30 = sum(bins.slice(60, 90));
    var firstHalf = sum(bins.slice(0, 45));
    var secondHalf = sum(bins.slice(45, 90));
    var first10 = sum(bins.slice(0, 10));
    var last10 = sum(bins.slice(80, 90));
    var occupied = bins.filter(function (x) { return x > 0; }).length;
    var drought = longestRun(bins, function (x) { return x === 0; });
    var streak = longestRun(bins, function (x) { return x > 0; });

    var cum = 0;
    var halfLife = NaN;
    var t80 = NaN;
    for (i = 0; i < bins.length; i++) {
      cum += bins[i];
      if (!isFinite(halfLife) && n && cum >= n * 0.5) halfLife = i;
      if (!isFinite(t80) && n && cum >= n * 0.8) t80 = i;
    }

    var iei = [];
    for (i = 1; i < list.length; i++) iei.push((list[i].t - list[i - 1].t) / 1000);

    var itemEps = [];
    for (i = 0; i < list.length; i++) {
      var prevT = i === 0 ? 0 : list[i - 1].t;
      var dt = Math.max((list[i].t - prevT) / 1000, 0.08);
      itemEps.push({ t: list[i].t / 1000, eps: 1 / dt });
    }

    var lengths = list.map(function (e) { return e.text.length; });
    var unique = {};
    var uniqueN = 0;
    list.forEach(function (e) {
      var key = e.text.toLowerCase();
      if (!unique[key]) {
        unique[key] = true;
        uniqueN += 1;
      }
    });

    var binFit = ols(xs, bins);
    var rateFit = ols(xs, rates);
    var mBins = mean(bins);
    var vBins = variance(bins, true);
    var maxBits = Math.log(90) / Math.LN2;

    return {
      n: n,
      meanEps: n / 90,
      peakEps: peakVal,
      peakAt: peakVal ? peakBin : NaN,
      peakRate: peakRate,
      peakRateAt: peakRate ? peakRateAt : NaN,
      minBin: n ? Math.min.apply(null, bins) : 0,
      medianBin: median(bins),
      modeBin: modeValue(bins),
      q1: quantile(bins, 0.25),
      q3: quantile(bins, 0.75),
      iqr: quantile(bins, 0.75) - quantile(bins, 0.25),
      p10: quantile(bins, 0.1),
      p90: quantile(bins, 0.9),
      range: (n ? Math.max.apply(null, bins) : 0) - (n ? Math.min.apply(null, bins) : 0),
      std: stdev(bins, true),
      var: vBins,
      mad: mad(bins),
      cv: mBins ? stdev(bins, true) / mBins : NaN,
      skew: skewness(bins),
      kurtosis: excessKurtosis(bins),
      fano: mBins ? vBins / mBins : NaN,
      entropy: shannonEntropy(bins),
      entropyNorm: maxBits ? shannonEntropy(bins) / maxBits : NaN,
      gini: gini(bins),
      autocorr: lag1Auto(bins),
      occupied: occupied,
      occupancy: occupied / 90,
      zeros: 90 - occupied,
      first: first,
      last: last,
      span: isFinite(first) && isFinite(last) ? last - first : NaN,
      first10: first10,
      last10: last10,
      first30: first30,
      mid30: mid30,
      last30: last30,
      firstHalf: firstHalf,
      secondHalf: secondHalf,
      burnout: firstHalf ? (firstHalf - secondHalf) / firstHalf : NaN,
      frontLoad: n ? first30 / n : NaN,
      endFade: n ? last30 / n : NaN,
      halfLife: halfLife,
      t80: t80,
      drought: drought.length,
      droughtAt: drought.start,
      streak: streak.length,
      streakAt: streak.start,
      slope: rateFit.slope,
      intercept: rateFit.intercept,
      r: rateFit.r,
      r2: rateFit.r2,
      binSlope: binFit.slope,
      binR2: binFit.r2,
      peakToAvg: mBins ? peakVal / mBins : NaN,
      predictedEnd: rateFit.intercept + rateFit.slope * 89,
      delta90: rateFit.slope * 89,
      meanIei: mean(iei),
      medianIei: median(iei),
      minIei: iei.length ? Math.min.apply(null, iei) : NaN,
      maxIei: iei.length ? Math.max.apply(null, iei) : NaN,
      stdIei: stdev(iei, true),
      cvIei: mean(iei) ? stdev(iei, true) / mean(iei) : NaN,
      unique: uniqueN,
      uniquePct: n ? uniqueN / n : NaN,
      dupes: n - uniqueN,
      meanLen: mean(lengths),
      medianLen: median(lengths),
      maxLen: lengths.length ? Math.max.apply(null, lengths) : NaN,
      bins: bins,
      rates: rates,
      itemEps: itemEps,
      fit: rateFit
    };
  }

  function renderStats(stats) {
    var groups = [
      {
        title: 'Pace',
        items: [
          ['Total entries', String(stats.n)],
          ['Mean EPS', fmt(stats.meanEps, 3)],
          ['Peak EPS', fmt(stats.peakEps, 0)],
          ['Peak rolling EPS', fmt(stats.peakRate, 2)],
          ['Peak-to-average', fmt(stats.peakToAvg, 2)],
          ['Active seconds', stats.occupied + ' / 90']
        ]
      },
      {
        title: 'Burnout',
        items: [
          ['First 45s', String(stats.firstHalf)],
          ['Last 45s', String(stats.secondHalf)],
          ['Burnout index', fmtPct(stats.burnout)],
          ['Front-load 0–30s', fmtPct(stats.frontLoad)],
          ['Mid 30–60s', String(stats.mid30)],
          ['End-fade 60–90s', fmtPct(stats.endFade)],
          ['First 10s', String(stats.first10)],
          ['Last 10s', String(stats.last10)],
          ['Trend slope', fmtSigned(stats.slope, 4) + '/s'],
          ['90s trend Δ', fmtSigned(stats.delta90, 3)],
          ['Trend R²', fmt(stats.r2, 3)],
          ['Pearson r', fmt(stats.r, 3)]
        ]
      },
      {
        title: 'Distribution',
        items: [
          ['Std. deviation', fmt(stats.std, 3)],
          ['Variance', fmt(stats.var, 3)],
          ['CV', fmt(stats.cv, 3)],
          ['Median /s', fmt(stats.medianBin, 2)],
          ['Mode /s', fmt(stats.modeBin, 0)],
          ['IQR', fmt(stats.iqr, 2)],
          ['P10 / P90', fmt(stats.p10, 2) + ' / ' + fmt(stats.p90, 2)],
          ['Range', fmt(stats.range, 0)],
          ['MAD', fmt(stats.mad, 3)],
          ['Skewness', fmt(stats.skew, 3)],
          ['Excess kurtosis', fmt(stats.kurtosis, 3)],
          ['Fano factor', fmt(stats.fano, 3)]
        ]
      },
      {
        title: 'Timing',
        items: [
          ['Time to first', fmtSec(stats.first)],
          ['Time to last', fmtSec(stats.last)],
          ['Active span', fmtSec(stats.span)],
          ['Peak at', isFinite(stats.peakAt) ? stats.peakAt + 's' : '—'],
          ['50% done at', isFinite(stats.halfLife) ? stats.halfLife + 's' : '—'],
          ['80% done at', isFinite(stats.t80) ? stats.t80 + 's' : '—'],
          ['Longest gap', stats.drought ? stats.drought + 's' : '—'],
          ['Gap starts', isFinite(stats.droughtAt) && stats.droughtAt >= 0 ? stats.droughtAt + 's' : '—'],
          ['Longest streak', stats.streak ? stats.streak + 's' : '—'],
          ['Occupancy', fmtPct(stats.occupancy)],
          ['Empty seconds', String(stats.zeros)],
          ['Lag-1 autocorr', fmt(stats.autocorr, 3)]
        ]
      },
      {
        title: 'Intervals',
        items: [
          ['Mean IEI', fmtSec(stats.meanIei)],
          ['Median IEI', fmtSec(stats.medianIei)],
          ['Min IEI', fmtSec(stats.minIei)],
          ['Max IEI', fmtSec(stats.maxIei)],
          ['IEI σ', fmtSec(stats.stdIei)],
          ['IEI CV', fmt(stats.cvIei, 3)]
        ]
      },
      {
        title: 'Concentration',
        items: [
          ['Shannon entropy', fmt(stats.entropy, 3) + ' bits'],
          ['Normalized H', fmt(stats.entropyNorm, 3)],
          ['Gini', fmt(stats.gini, 3)],
          ['Unique names', String(stats.unique)],
          ['Uniqueness', fmtPct(stats.uniquePct)],
          ['Duplicates', String(stats.dupes)],
          ['Mean length', fmt(stats.meanLen, 1)],
          ['Median length', fmt(stats.medianLen, 1)],
          ['Longest name', fmt(stats.maxLen, 0)]
        ]
      }
    ];

    statsPanel.innerHTML = '';
    groups.forEach(function (group) {
      var wrap = document.createElement('section');
      wrap.className = 'stats-group';
      var h = document.createElement('h3');
      h.textContent = group.title;
      wrap.appendChild(h);
      var dl = document.createElement('dl');
      dl.className = 'stats-grid';
      group.items.forEach(function (pair) {
        var item = document.createElement('div');
        item.className = 'stats-item';
        var dt = document.createElement('dt');
        dt.textContent = pair[0];
        var dd = document.createElement('dd');
        dd.textContent = pair[1];
        item.appendChild(dt);
        item.appendChild(dd);
        dl.appendChild(item);
      });
      wrap.appendChild(dl);
      statsPanel.appendChild(wrap);
    });
  }

  function drawGraph(list, stats) {
    var svg = burnoutGraph;
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    var bins = stats.bins;
    var rates = stats.rates;
    var itemEps = stats.itemEps || [];
    var maxRate = 0;
    var i;
    for (i = 0; i < rates.length; i++) {
      if (rates[i] > maxRate) maxRate = rates[i];
      if (bins[i] > maxRate) maxRate = bins[i];
    }
    var itemMax = 0;
    for (i = 0; i < itemEps.length; i++) {
      if (itemEps[i].eps > itemMax) itemMax = itemEps[i].eps;
    }
    var orangeCap = Math.max(maxRate * 2.4, 1.5);
    if (itemMax) maxRate = Math.max(maxRate, Math.min(itemMax, orangeCap));
    if (maxRate < 1) maxRate = 1;

    var W = 800;
    var H = 280;
    var pad = { t: 18, r: 18, b: 42, l: 46 };
    var innerW = W - pad.l - pad.r;
    var innerH = H - pad.t - pad.b;

    function xAt(sec) {
      return pad.l + (sec / 89) * innerW;
    }
    function yAt(val) {
      var y = pad.t + innerH - (val / maxRate) * innerH;
      return Math.max(pad.t, Math.min(pad.t + innerH, y));
    }

    svg.appendChild(svgEl('rect', {
      x: 0,
      y: 0,
      width: W,
      height: H,
      fill: 'transparent'
    }));

    var gridVals = [0, maxRate / 2, maxRate];
    gridVals.forEach(function (val, idx) {
      var y = yAt(val);
      svg.appendChild(svgEl('line', {
        x1: pad.l,
        y1: y,
        x2: W - pad.r,
        y2: y,
        stroke: 'rgba(255,255,255,0.06)',
        'stroke-width': '1'
      }));
      var label = idx === 0 ? '0' : (maxRate >= 2 ? String(Math.round(val * 10) / 10) : val.toFixed(1));
      var text = svgEl('text', {
        x: pad.l - 10,
        y: y + 4,
        fill: 'rgba(255,255,255,0.32)',
        'font-size': '12',
        'font-family': 'Urbanist, sans-serif',
        'font-weight': '300',
        'text-anchor': 'end'
      });
      text.textContent = label;
      svg.appendChild(text);
    });

    [0, 30, 60, 90].forEach(function (sec) {
      var x = sec === 90 ? xAt(89) : xAt(sec);
      var text = svgEl('text', {
        x: x,
        y: H - 14,
        fill: 'rgba(255,255,255,0.32)',
        'font-size': '12',
        'font-family': 'Urbanist, sans-serif',
        'font-weight': '300',
        'text-anchor': sec === 0 ? 'start' : sec === 90 ? 'end' : 'middle'
      });
      text.textContent = sec + 's';
      svg.appendChild(text);
    });

    if (isFinite(stats.halfLife)) {
      var hx = xAt(Math.min(89, stats.halfLife));
      svg.appendChild(svgEl('line', {
        x1: hx,
        y1: pad.t,
        x2: hx,
        y2: pad.t + innerH,
        stroke: 'rgba(255,255,255,0.14)',
        'stroke-width': '1',
        'stroke-dasharray': '3 5'
      }));
    }

    if (itemEps.length) {
      var orangeArea = 'M ' + xAt(itemEps[0].t) + ' ' + yAt(0);
      var orangeLine = '';
      for (i = 0; i < itemEps.length; i++) {
        var ix = xAt(itemEps[i].t);
        var iy = yAt(itemEps[i].eps);
        orangeLine += (i === 0 ? 'M ' : ' L ') + ix + ' ' + iy;
        orangeArea += ' L ' + ix + ' ' + iy;
      }
      orangeArea += ' L ' + xAt(itemEps[itemEps.length - 1].t) + ' ' + yAt(0) + ' Z';
      svg.appendChild(svgEl('path', {
        d: orangeArea,
        fill: 'rgba(251,146,60,0.16)'
      }));
      svg.appendChild(svgEl('path', {
        d: orangeLine,
        fill: 'none',
        stroke: 'rgba(251,146,60,0.55)',
        'stroke-width': '2',
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round'
      }));
      var itemBarW = Math.max(6, innerW / Math.max(itemEps.length * 2.8, 28));
      for (i = 0; i < itemEps.length; i++) {
        var barH = Math.max(0, (Math.min(itemEps[i].eps, maxRate) / maxRate) * innerH);
        svg.appendChild(svgEl('rect', {
          x: xAt(itemEps[i].t) - itemBarW / 2,
          y: yAt(itemEps[i].eps),
          width: itemBarW,
          height: barH,
          rx: String(Math.min(8, itemBarW / 2)),
          fill: 'rgba(251,146,60,0.28)'
        }));
      }
    }

    var barW = innerW / 90 * 0.55;
    for (i = 0; i < bins.length; i++) {
      if (!bins[i]) continue;
      var bh = (bins[i] / maxRate) * innerH;
      svg.appendChild(svgEl('rect', {
        x: xAt(i) - barW / 2,
        y: yAt(bins[i]),
        width: Math.max(2, barW),
        height: Math.max(0, bh),
        rx: '3',
        fill: 'rgba(56,189,248,0.16)'
      }));
    }

    var line = '';
    var area = 'M ' + xAt(0) + ' ' + yAt(0);
    for (i = 0; i < rates.length; i++) {
      var x = xAt(i);
      var y = yAt(rates[i]);
      line += (i === 0 ? 'M ' : ' L ') + x + ' ' + y;
      area += ' L ' + x + ' ' + y;
    }
    area += ' L ' + xAt(89) + ' ' + yAt(0) + ' Z';

    svg.appendChild(svgEl('path', {
      d: area,
      fill: 'rgba(56,189,248,0.12)'
    }));
    svg.appendChild(svgEl('path', {
      d: line,
      fill: 'none',
      stroke: '#38bdf8',
      'stroke-width': '2.4',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round'
    }));

    if (stats.fit && isFinite(stats.fit.slope) && isFinite(stats.fit.intercept)) {
      var y0 = stats.fit.intercept;
      var y1 = stats.fit.intercept + stats.fit.slope * 89;
      svg.appendChild(svgEl('line', {
        x1: xAt(0),
        y1: yAt(y0),
        x2: xAt(89),
        y2: yAt(y1),
        stroke: 'rgba(255,255,255,0.35)',
        'stroke-width': '1.5',
        'stroke-dasharray': '5 6',
        'stroke-linecap': 'round'
      }));
    }
  }

  function showResults(list, category, vibrate) {
    phase = 'results';
    if (roundRaf) cancelAnimationFrame(roundRaf);
    playInput.blur();
    playInput.value = '';
    playStage.hidden = true;
    resultsStage.hidden = false;
    document.body.classList.remove('is-playing');
    document.body.classList.add('is-results');
    resultsCategory.textContent = category || currentCategory;
    var n = list.length;
    resultsStat.textContent = n === 1 ? '1 entry in 90 seconds' : n + ' entries in 90 seconds';
    resultsList.innerHTML = '';
    list.forEach(function (entry) {
      resultsList.appendChild(makeChip(entry.text));
    });
    var stats = analyze(list);
    drawGraph(list, stats);
    renderStats(stats);
    syncButtons();
    if (vibrate && navigator.vibrate) {
      try { navigator.vibrate([12, 40, 18]); } catch (e) {}
    }
  }

  function endRound() {
    if (phase !== 'play') return;
    showResults(entries, currentCategory, true);
  }

  function isLocalHost() {
    var host = location.hostname;
    return host === 'localhost' || host === '127.0.0.1' || host === '[::1]' || host === '0.0.0.0';
  }

  function buildSampleEntries() {
    var names = [
      'Mario', 'Zelda', 'Minecraft', 'Fortnite', 'Halo', 'Pokemon', 'Tetris',
      'Overwatch', 'Stardew Valley', 'Celeste', 'Portal', 'Skyrim', 'GTA',
      'Animal Crossing', 'Splatoon', 'Metroid', 'Sonic', 'Pac-Man', 'Kirby',
      'Street Fighter', 'Final Fantasy', 'Wii Sports', 'Among Us', 'Roblox',
      'Elden Ring', 'Hades', 'SimCity', 'Donkey Kong'
    ];
    var out = [];
    var t = 700;
    var i = 0;
    while (t < 86000 && i < names.length) {
      out.push({ text: names[i], t: t });
      t += 900 + i * 210 + Math.floor(Math.random() * 420);
      i += 1;
    }
    return out;
  }

  function showSampleResults() {
    if (!isLocalHost()) return;
    if (rafId) cancelAnimationFrame(rafId);
    if (roundRaf) cancelAnimationFrame(roundRaf);
    spinning = false;
    currentCategory = currentCategory || 'Video Games';
    entries = buildSampleEntries();
    showResults(entries, currentCategory, false);
  }

  function resetToPick() {
    phase = 'pick';
    entries = [];
    if (roundRaf) cancelAnimationFrame(roundRaf);
    playStage.hidden = true;
    resultsStage.hidden = true;
    document.body.classList.remove('is-playing', 'is-results');
    playInput.value = '';
    setBusy(false);
    spin(false);
  }

  function onResize() {
    if (spinning || !track.children.length || phase !== 'pick') return;
    var centerIndex = 0;
    for (var i = 0; i < track.children.length; i++) {
      if (track.children[i].classList.contains('is-center')) centerIndex = i;
    }
    applyX(xForIndex(centerIndex), 0);
  }

  function armRespin(on) {
    respinBtn.classList.toggle('is-armed', on);
  }

  continueBtn.addEventListener('click', startRound);

  respinBtn.addEventListener('pointerdown', function () {
    if (respinBtn.disabled) return;
    armRespin(true);
  });
  respinBtn.addEventListener('pointerup', function () {
    window.setTimeout(function () { armRespin(false); }, 180);
  });
  respinBtn.addEventListener('pointerleave', function () { armRespin(false); });
  respinBtn.addEventListener('click', function () {
    spin(false);
  });

  playForm.addEventListener('submit', function (e) {
    e.preventDefault();
    if (addEntry(playInput.value)) {
      playInput.value = '';
    }
  });

  againBtn.addEventListener('click', resetToPick);

  if (isLocalHost() && sampleBtn) {
    document.body.classList.add('is-local');
    sampleBtn.hidden = false;
    sampleBtn.addEventListener('click', showSampleResults);
  }

  window.addEventListener('resize', onResize, { passive: true });
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', onResize);
  }

  splitTitle();

  fetch('categories.txt', { cache: 'no-store' })
    .then(function (res) {
      if (!res.ok) throw new Error('Could not load categories');
      return res.text();
    })
    .then(function (text) {
      categories = parseCategories(text);
      if (!categories.length) throw new Error('No categories found');
      window.setTimeout(function () { spin(true); }, prefersReduced ? 0 : 420);
    })
    .catch(function () {
      statusText.hidden = false;
      statusText.textContent = 'Could not load categories.';
      setBusy(false);
      continueBtn.disabled = true;
      respinBtn.disabled = true;
    });
})();
