/**
 * Hero ASCII background — hidden video, canvas display.
 * Avoids the native play/pause overlay on autoplay.
 */
(function () {
  var video = document.getElementById('asciiVideo');
  var canvas = document.getElementById('asciiCanvas');
  if (!video) return;

  var prefersReduced =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
  video.controls = false;
  video.setAttribute('muted', '');
  video.setAttribute('playsinline', '');
  video.setAttribute('webkit-playsinline', '');
  video.removeAttribute('controls');

  var ctx = canvas ? canvas.getContext('2d') : null;
  var drawing = false;

  function sizeCanvas() {
    if (!canvas || !ctx) return;
    var layer = canvas.parentElement;
    if (!layer) return;
    var w = layer.clientWidth || window.innerWidth;
    var h = layer.clientHeight || window.innerHeight;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.floor(w * dpr));
    canvas.height = Math.max(1, Math.floor(h * dpr));
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
  }

  function drawCover() {
    if (!ctx || !canvas || video.readyState < 2) return;
    var cw = canvas.width;
    var ch = canvas.height;
    var vw = video.videoWidth || 16;
    var vh = video.videoHeight || 9;
    var scale = Math.max(cw / vw, ch / vh);
    var dw = vw * scale;
    var dh = vh * scale;
    ctx.drawImage(video, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
  }

  function loop() {
    if (!drawing) return;
    drawCover();
    requestAnimationFrame(loop);
  }

  function startDraw() {
    if (drawing || !canvas) return;
    drawing = true;
    sizeCanvas();
    loop();
  }

  function tryPlay() {
    if (prefersReduced) return;
    var playPromise = video.play();
    if (playPromise && typeof playPromise.then === 'function') {
      playPromise.then(startDraw).catch(function () {
        function resume() {
          video.muted = true;
          var p = video.play();
          if (p && typeof p.then === 'function') p.then(startDraw);
        }
        document.addEventListener('pointerdown', resume, { once: true });
        document.addEventListener('touchstart', resume, { once: true, passive: true });
        document.addEventListener('scroll', resume, { once: true, passive: true });
        document.addEventListener('keydown', resume, { once: true });
      });
    } else {
      startDraw();
    }
  }

  if (prefersReduced) {
    video.pause();
    video.currentTime = 0;
    sizeCanvas();
    video.addEventListener('loadeddata', function () {
      sizeCanvas();
      drawCover();
    });
    return;
  }

  video.addEventListener('loadeddata', tryPlay);
  video.addEventListener('canplay', tryPlay);
  video.addEventListener('playing', startDraw);
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) tryPlay();
  });
  window.addEventListener('pageshow', tryPlay);
  window.addEventListener('resize', sizeCanvas);

  if (video.readyState >= 2) tryPlay();
})();
