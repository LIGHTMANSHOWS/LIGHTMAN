// Media stays in the browser. One decoded video feeds every LED surface.
export function setupMedia({state,onUpdate}) {
 const $=s=>document.querySelector(s),input=$('#logo-input'),video=$('#video-preview');
 const image=$('#image-preview'),error=$('#file-error');
 let objectUrl=null,pending=null,generation=0;
 function discardPending(){if(!pending)return;pending.cancel();pending=null;}
 function dispose(){
  if(video){video.pause();video.removeAttribute('src');video.load();video.hidden=true;}
  if(objectUrl)URL.revokeObjectURL(objectUrl);objectUrl=null;
  image.hidden=true;image.removeAttribute('src');state.logo=null;state.mediaKind=null;
 }
 function describe(name,isVideo){
  $('#image-filename').textContent=name;
  $('#image-placeholder').hidden=!isVideo;$('#reset-logo').hidden=false;
  $('.image-drop')?.classList.toggle('has-video',isVideo);
  if($('#video-restart'))$('#video-restart').hidden=!isVideo;
  if($('#video-toggle'))$('#video-toggle').hidden=!isVideo;
  $('#brand-status').textContent=isVideo?'Video en banderas y tambores · 30 × 16 píxeles':'Imagen aplicada en banderas, tambores y capa';
 }
 function applyImage(file){
  const token=++generation;discardPending();const url=URL.createObjectURL(file),im=new Image();
  pending={cancel:()=>{im.onload=im.onerror=null;URL.revokeObjectURL(url);}};
  im.onload=()=>{if(token!==generation)return;pending=null;dispose();objectUrl=url;state.logo=im;state.mediaKind='image';image.src=url;image.hidden=false;describe(file.name,false);onUpdate();};
  im.onerror=()=>{if(token!==generation)return;discardPending();error.textContent='No se pudo abrir la imagen. Prueba con PNG o JPG.';};im.src=url;
 }
 function applyVideo(url,name,local=false){
  if(!video){if(local)URL.revokeObjectURL(url);return;}
  const token=++generation;discardPending();error.textContent='';
  // Decode before replacing the current visual, so invalid files cannot blank it.
  const probe=document.createElement('video');probe.preload='auto';probe.muted=true;probe.playsInline=true;
  const release=()=>{probe.onloadeddata=probe.onerror=null;probe.removeAttribute('src');probe.load();};
  pending={cancel:()=>{release();if(local)URL.revokeObjectURL(url);}};
  probe.onloadeddata=()=>{
   if(token!==generation)return;pending=null;release();dispose();
   if(local)objectUrl=url;
   state.logo=video;state.mediaKind='video';video.hidden=false;video.src=url;
   state.flagScale=state.screenScale=1;
   for(const id of ['flag-scale','screen-scale']){if($('#'+id))$('#'+id).value='100';if($('#'+id+'-value'))$('#'+id+'-value').value='100%';}
   describe(name,true);
   video.play().catch(()=>{error.textContent='Pulsa reproducir en el video para iniciar la animación.';});
  };
  probe.onerror=()=>{if(token!==generation)return;discardPending();error.textContent='No se pudo abrir el video. Usa MP4 H.264 o WebM compatible con tu navegador.';};probe.src=url;
 }
 input?.addEventListener('change',e=>{
  const file=e.target.files?.[0];e.target.value='';error.textContent='';if(!file)return;
  const isVideo=['video/mp4','video/webm','video/quicktime'].includes(file.type)||/\.(mp4|m4v|webm|mov)$/i.test(file.name);
  const isImage=['image/png','image/jpeg','image/webp','image/svg+xml'].includes(file.type)||/\.(png|jpe?g|webp|svg)$/i.test(file.name);
  if((!isImage&&!isVideo)||file.size>(isVideo?100:8)*1024*1024){error.textContent='Usa PNG, JPG, WebP o SVG hasta 8 MB; MP4, WebM o MOV hasta 100 MB. La reproducción depende del códec del navegador.';return;}
  if(isVideo)applyVideo(URL.createObjectURL(file),file.name,true);else applyImage(file);
 });
 $('#reset-logo')?.addEventListener('click',()=>{
  generation++;discardPending();dispose();input.value='';error.textContent='';$('#reset-logo').hidden=true;
  if($('#video-restart'))$('#video-restart').hidden=true;
  if($('#video-toggle'))$('#video-toggle').hidden=true;
  $('#image-placeholder').hidden=false;$('#image-filename').textContent='Sin imagen ni video cargado';
  $('.image-drop')?.classList.remove('has-video');
  $('#brand-status').textContent='Banderas y capa transparentes · luz por ambos lados';onUpdate();
 });
 $('#hermes-load')?.addEventListener('click',()=>applyVideo('assets/hermes/hermes-30x16.mp4?v=6.0','HERMES · 15 s · 30 × 16 px'));
 $('#video-restart')?.addEventListener('click',()=>{video.currentTime=0;video.play().catch(()=>{});});
 $('#video-toggle')?.addEventListener('click',()=>{if(video.paused)video.play().catch(()=>{error.textContent='No se pudo iniciar el video.';});else video.pause();});
 for(const event of ['play','pause','loadeddata','emptied'])video?.addEventListener(event,()=>{
  const button=$('#video-toggle');if(!button)return;button.textContent=video.paused?'Reproducir video ▶':'Pausar video Ⅱ';button.setAttribute('aria-pressed',String(!video.paused));
 });
 for(const event of ['loadeddata','seeked','pause','play','ended'])video?.addEventListener(event,()=>{if(state.logo===video&&video.readyState>=2)onUpdate();});
 video?.addEventListener('error',()=>{if(state.logo===video)error.textContent='El video no pudo reproducirse. Prueba un MP4 H.264.';});
 if(new URLSearchParams(location.search).get('visual')==='hermes')applyVideo('assets/hermes/hermes-30x16.mp4?v=6.0','HERMES · 15 s · 30 × 16 px');
 return {get video(){return state.mediaKind==='video'?video:null;}};
}
