(() => {
  'use strict';
  const videos = [...document.querySelectorAll('#videos .reel-video')];
  videos.forEach(video => {
    // Native controls and playback also work without JavaScript.
    video.addEventListener('play', () => {
      videos.forEach(other => { if (other !== video) other.pause(); });
    });
    const error = video.closest('.reel-card').querySelector('.reel-error');
    const showError = () => { error.hidden = false; };
    video.addEventListener('error', showError);
    video.querySelector('source').addEventListener('error', showError);
    video.addEventListener('loadeddata', () => { error.hidden = true; });
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) videos.forEach(video => video.pause());
  });
})();
