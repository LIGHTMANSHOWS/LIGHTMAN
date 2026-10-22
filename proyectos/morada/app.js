(() => {
  const intensity = document.querySelector('#intensity');
  intensity.addEventListener('input', () => { document.querySelector('#intensity-value').value = `${intensity.value}%`; });
  const showFallback = () => {
    document.querySelector('#loading').hidden = true;
    document.querySelector('#viewer-fallback').hidden = false;
    document.querySelectorAll('[data-scene], [data-gradient], [data-view], #intensity, #speed, #pause, #rotate').forEach(button => { button.disabled = true; });
  };
  window.addEventListener('morada-viewer-error', showFallback);
  window.addEventListener('error', event => { if(event.filename && /scene\.js|three\.module|OrbitControls/.test(event.filename)) showFallback(); });
  setTimeout(() => { if(!document.querySelector('#viewer canvas')) showFallback(); }, 12000);
})();
