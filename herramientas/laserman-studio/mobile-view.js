// Keep the shared transport and clock: the mobile view only changes presentation.
export function mountMobileView() {
  const $=id=>document.getElementById(id);
  const toggle=document.createElement('button');
  toggle.id='mobileLayout';toggle.type='button';toggle.textContent='Editar';
  toggle.setAttribute('aria-label','Mostrar herramientas de edición');
  toggle.setAttribute('aria-expanded','false');
  document.querySelector('header').append(toggle);
  toggle.onclick=()=>{
    const editing=document.body.classList.toggle('mobile-editing');
    toggle.textContent=editing?'Ver show':'Editar';
    toggle.setAttribute('aria-expanded',String(editing));
    toggle.setAttribute('aria-label',editing?'Volver a la vista del show':'Mostrar herramientas de edición');
    if(!editing)document.body.classList.remove('inspector-open');
  };
  const scrub=document.createElement('label');scrub.id='mobileScrub';
  const name=document.createElement('span');name.textContent='Avanzar show';
  const slider=document.createElement('input');slider.id='mobileSeek';slider.type='range';
  slider.min='0';slider.step='0.001';slider.value='0';slider.setAttribute('aria-label','Tiempo del show');
  scrub.append(name,slider);document.querySelector('.transport').after(scrub);
  let dragging=false;
  slider.addEventListener('pointerdown',()=>{dragging=true;});
  const release=()=>{dragging=false;};
  window.addEventListener('pointerup',release);window.addEventListener('pointercancel',release);
  slider.addEventListener('input',()=>window.LASERMAN.seek(Number(slider.value)));
  let lastUpdate=-Infinity;
  function update(now){
    requestAnimationFrame(update);
    if(now-lastUpdate<100)return;
    lastUpdate=now;
    const show=window.LASERMAN;
    slider.max=String(show.project.duration);
    if(!dragging)slider.value=String(show.time);
    slider.setAttribute('aria-valuetext',`${Math.floor(show.time/60)}:${(show.time%60).toFixed(1).padStart(4,'0')}`);
  }
  requestAnimationFrame(update);
}
