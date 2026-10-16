(() => {
  'use strict';
  const menu=document.querySelector('.menu-toggle'),nav=document.querySelector('#primary-nav');
  const closeMenu=()=>{menu?.setAttribute('aria-expanded','false');nav?.classList.remove('is-open');};
  menu?.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));nav.classList.toggle('is-open',open);});
  document.querySelectorAll('.nav-group').forEach(detail=>detail.addEventListener('toggle',()=>{if(detail.open)document.querySelectorAll('.nav-group').forEach(other=>{if(other!==detail)other.open=false;});}));
  document.addEventListener('click',event=>{if(!event.target.closest('.site-header')){closeMenu();document.querySelectorAll('.nav-group').forEach(d=>d.open=false);}});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'){closeMenu();document.querySelectorAll('.nav-group').forEach(d=>d.open=false);}});
  const normalized=text=>text.toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const search=document.querySelector('#catalog-search');
  if(search){
    const cards=[...document.querySelectorAll('#catalog-grid .product-card')];
    const filter=()=>{const term=normalized(search.value.trim());let count=0;cards.forEach(card=>{card.hidden=!normalized(card.dataset.name).includes(term);if(!card.hidden)count++;});document.querySelector('#result-count').textContent=`${count} ${count===1?'formato':'formatos'}`;document.querySelector('#no-results').hidden=count!==0;};
    search.value=new URLSearchParams(location.search).get('q')||'';filter();search.addEventListener('input',filter);
  }
  const dialog=document.querySelector('#photo-dialog');
  document.querySelectorAll('[data-photo]').forEach(link=>link.addEventListener('click',event=>{if(!dialog?.showModal)return;event.preventDefault();const image=dialog.querySelector('img');image.src=link.href;image.alt=link.querySelector('img')?.alt||'Fotografía de catálogo';dialog.querySelector('p').textContent=image.alt;dialog.showModal();}));
  dialog?.querySelector('.dialog-close').addEventListener('click',()=>dialog.close());
  dialog?.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
  const videos=[...document.querySelectorAll('video')];
  videos.forEach(video=>{
    video.addEventListener('play',()=>videos.forEach(other=>{if(other!==video)other.pause();}));
    const error=()=>{const note=video.closest('.video-frame')?.querySelector('.video-error');if(note)note.hidden=false;};
    video.addEventListener('error',error);video.querySelector('source')?.addEventListener('error',error);
    video.addEventListener('loadeddata',()=>{const note=video.closest('.video-frame')?.querySelector('.video-error');if(note)note.hidden=true;});
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden)videos.forEach(v=>v.pause());});
  const form=document.querySelector('#quote-form');
  if(form){
    const chosen=new URLSearchParams(location.search).get('servicio');
    if(chosen&&[...form.elements.servicio.options].some(o=>o.value===chosen))form.elements.servicio.value=chosen;
    const date=form.elements.fecha,now=new Date();date.min=[now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');
    form.addEventListener('submit',event=>{event.preventDefault();if(!form.reportValidity())return;const data=new FormData(form);const text=`Hola Lightman, quiero cotizar un evento.\n\nNombre: ${data.get('nombre').trim()}\nFormato: ${data.get('servicio')}\nFecha: ${data.get('fecha')||'Por definir'}\nCiudad / distrito: ${data.get('ciudad').trim()}\nDetalles: ${data.get('detalle').trim()||'Por coordinar'}`;location.assign('https://wa.me/51947113430?text='+encodeURIComponent(text));});
  }
})();
