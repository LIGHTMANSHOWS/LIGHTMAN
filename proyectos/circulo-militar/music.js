'use strict';

const featuredSong = Object.freeze({
  id: 'XRRW0DbJS_I',
  title: 'Historia de Amor',
  artist: 'Caribeños de Guadalupe',
  duration: 216,
  bpm: 133
});

const songLooks = [
  {bar:0, look:'ambar', intensity:.49},
  {bar:8, look:'violeta', intensity:.37},
  {bar:24, look:'ambar', intensity:.67},
  {bar:40, look:'azul', intensity:.51},
  {bar:48, look:'violeta', intensity:.39},
  {bar:64, look:'ambar', intensity:.69},
  {bar:80, look:'azul', intensity:.56},
  {bar:96, look:'violeta', intensity:.62},
  {bar:104, look:'ambar', intensity:.72}
];

function featuredCue(seconds, duration) {
  const beat = seconds * featuredSong.bpm / 60;
  const bar = Math.floor(beat / 4);
  const cue = songLooks.findLast(section => section.bar <= bar) ?? songLooks[0];
  const decay = Math.exp(-(beat % 1) * 6.2);
  const downbeat = Math.floor(beat) % 4 === 0;
  const fade = Math.min(1, Math.max(0, (duration - seconds) / 3));
  const energy = (.12 + cue.intensity * .6 + decay * (downbeat ? .36 : .23)) * fade;
  return {look:cue.look, beat, energy};
}

let youtubeAPI;

function loadYouTubeAPI() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (!youtubeAPI) {
    youtubeAPI = new Promise((resolve,reject) => {
      const script = document.createElement('script');
      const previousReady = window.onYouTubeIframeAPIReady;
      const cleanup = () => {
        clearTimeout(timeout);
        window.onYouTubeIframeAPIReady = previousReady;
      };
      const fail = () => {
        cleanup();
        script.remove();
        reject(new Error('YouTube IFrame API unavailable'));
      };
      const timeout = setTimeout(fail, 12000);
      window.onYouTubeIframeAPIReady = () => {
        cleanup();
        previousReady?.();
        resolve(window.YT);
      };
      script.src = 'https://www.youtube.com/iframe_api';
      script.onerror = fail;
      document.head.append(script);
    }).catch(error => {
      youtubeAPI = null;
      throw error;
    });
  }
  return youtubeAPI;
}

async function createFeaturedPlayer(mount, events) {
  const youtube = await loadYouTubeAPI();
  const url = new URL(`https://www.youtube.com/embed/${featuredSong.id}`);
  url.searchParams.set('enablejsapi','1');
  url.searchParams.set('playsinline','1');
  if (/^https?:$/.test(location.protocol)) url.searchParams.set('origin',location.origin);
  const iframe = document.createElement('iframe');
  iframe.title = `${featuredSong.title} · ${featuredSong.artist} · YouTube`;
  iframe.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share';
  iframe.allowFullscreen = true;
  iframe.referrerPolicy = 'strict-origin-when-cross-origin';
  iframe.src = url.href;
  mount.replaceChildren(iframe);
  return new youtube.Player(iframe,{events});
}
