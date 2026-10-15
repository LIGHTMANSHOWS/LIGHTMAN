(() => {
  'use strict';
  const section = document.querySelector('#videos');
  if (!section) return;
  const cards = [...section.querySelectorAll('.reel-card')];
  const pending = new WeakMap();

  function reset(card, restoreFocus = false) {
    const state = pending.get(card);
    clearTimeout(state?.timer);
    pending.delete(card);
    const embed = card.querySelector('.reel-embed');
    embed.replaceChildren(); // Removing the iframe also stops its audio/video.
    embed.hidden = true;
    card.querySelector('.reel-cover').hidden = false;
    card.querySelector('.reel-close').hidden = true;
    card.querySelector('.reel-status').textContent = '';
    if (restoreFocus) card.querySelector('.reel-load').focus();
  }

  function open(card) {
    if (pending.has(card) || !/^[A-Za-z0-9_-]{5,32}$/.test(card.dataset.reelId)) return;
    cards.forEach(other => { if (other !== card) reset(other); });
    const state = {};
    pending.set(card, state);
    const embed = card.querySelector('.reel-embed');
    const status = card.querySelector('.reel-status');
    const close = card.querySelector('.reel-close');
    card.querySelector('.reel-cover').hidden = true;
    embed.hidden = false;
    close.hidden = false;
    status.textContent = 'Cargando desde Instagram…';
    const frame = document.createElement('iframe');
    frame.title = 'Reel de Lightman: ' + card.querySelector('h3').textContent;
    frame.src = `https://www.instagram.com/reel/${card.dataset.reelId}/embed/`;
    frame.allow = 'fullscreen; encrypted-media; picture-in-picture';
    frame.allowFullscreen = true;
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    state.timer = setTimeout(() => {
      if (pending.get(card) !== state) return;
      const restoreFocus = document.activeElement === frame;
      reset(card, restoreFocus);
      status.textContent = 'Instagram no respondió. Puedes reintentar o usar «Ver en Instagram».';
    }, 15000);
    frame.addEventListener('load', () => {
      if (pending.get(card) !== state) return;
      clearTimeout(state.timer);
      // A cross-origin load event does not guarantee playable media.
      status.textContent = 'Si Instagram no permite reproducirlo aquí, abre el enlace de abajo.';
    }, { once: true });
    frame.addEventListener('error', () => {
      if (pending.get(card) !== state) return;
      reset(card, true);
      status.textContent = 'No se pudo conectar con Instagram. Puedes reintentar o abrir el enlace.';
    }, { once: true });
    embed.append(frame);
    frame.focus({ preventScroll: true });
  }

  cards.forEach(card => {
    const load = card.querySelector('.reel-load');
    load.hidden = false;
    load.addEventListener('click', () => open(card));
    card.querySelector('.reel-close').addEventListener('click', () => reset(card, true));
  });
  const filters = section.querySelector('.reels-filters');
  filters.hidden = false;
  filters.addEventListener('click', event => {
    const button = event.target.closest('[data-reel-filter]');
    if (!button) return;
    const category = button.dataset.reelFilter;
    filters.querySelectorAll('button').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    let count = 0;
    cards.forEach(card => {
      card.hidden = category !== 'all' && card.dataset.reelCategory !== category;
      if (card.hidden) reset(card);
      else count++;
    });
    section.querySelector('.reels-count').textContent = `${count} ${count === 1 ? 'video' : 'videos'} de Lightman`;
  });
})();
