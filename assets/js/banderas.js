(() => {
  const videos = {
    lightman: {src: 'https://www.instagram.com/reel/DVzoQfEjTRW/embed/', title: 'Banderas LED — Lightman Perú'},
    vimeo: {src: 'https://player.vimeo.com/video/693002300?dnt=1', title: 'LED VISION FLAG — MPLUSPLUS'},
    youtube: {src: 'https://www.youtube-nocookie.com/embed/2JB9O_aj3uo', title: 'LED Visual Flag — The Show Theatre'},
    instagram: {src: 'https://www.instagram.com/reel/Deewoe4NYfM/embed/', title: 'Reel de referencia de banderas LED en Instagram'}
  };
  document.querySelectorAll('[data-load-video]').forEach(button => button.addEventListener('click', () => {
    const holder = button.closest('[data-video]');
    const video = videos[holder.dataset.video];
    if (!video) return;
    const iframe = document.createElement('iframe');
    iframe.src = video.src;
    iframe.title = video.title;
    iframe.allow = 'fullscreen; picture-in-picture; encrypted-media';
    iframe.allowFullscreen = true;
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    holder.replaceChildren(iframe);
    holder.classList.add('is-loaded');
  }));
  const dialog = document.getElementById('flagsPhotoDialog');
  if (dialog && typeof dialog.showModal === 'function') {
    document.querySelectorAll('[data-flag-photo]').forEach(link => link.addEventListener('click', event => {
      event.preventDefault();
      const image = dialog.querySelector('img');
      image.src = link.href;
      image.alt = link.querySelector('img').alt;
      dialog.querySelector('p').textContent = link.closest('figure').querySelector('figcaption').textContent;
      dialog.showModal();
    }));
    dialog.querySelector('button').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  }
  const share = document.getElementById('flagsShare');
  if (share) share.addEventListener('click', async () => {
    const url = 'https://lightmanperu.com/productos/banderas-led.html';
    const status = document.getElementById('flagsShareStatus');
    try {
      await navigator.clipboard.writeText(url);
      status.textContent = 'Enlace copiado. Ya puedes compartirlo.';
    } catch {
      status.textContent = 'Copia este enlace: ' + url;
    }
  });
})();
