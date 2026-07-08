/**
 * Hero ASCII background — plays ASCII/ascii-animation.mp4 behind the tint layer.
 */
(function () {
  var video = document.getElementById('asciiVideo');
  if (!video) return;

  var prefersReduced =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function tryPlay() {
    var playPromise = video.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(function () {
        // Autoplay blocked — resume on first user interaction.
        function resume() {
          video.play();
          document.removeEventListener('click', resume);
          document.removeEventListener('scroll', resume);
        }
        document.addEventListener('click', resume, { once: true });
        document.addEventListener('scroll', resume, { once: true, passive: true });
      });
    }
  }

  if (prefersReduced) {
    video.pause();
    video.currentTime = 0;
    return;
  }

  video.addEventListener('loadeddata', tryPlay);
  if (video.readyState >= 2) tryPlay();
})();
