import {installWebPlatform} from './web-platform.js';
installWebPlatform();
await import('./app.js');
const untilReady=setInterval(()=>{
  if(!window.LASERMAN)return;clearInterval(untilReady);
  const $=id=>document.getElementById(id);
  $('readiness').textContent='Editor web · simulación · guardado en este navegador';
  $('outputDialog').querySelector('p').textContent='La web permite editar, guardar y exportar el show. Para emitir con FB3 o Art-Net abre la aplicación instalada en el PC del montaje. Puedes preparar aquí el patch y conservarlo en el proyecto.';
  $('scan').hidden=true;$('outputConsent').parentElement.hidden=true;$('enableOutputs').hidden=true;$('disableOutputs').hidden=true;
  $('outputMessage').textContent='Esta versión web no activa dispositivos físicos.';
  const local=document.createElement('a');local.href='http://127.0.0.1:8890/';local.target='_blank';local.rel='noopener';local.textContent='Abrir operador local';local.className='local-operator';$('closeOutputs').before(local);
  const edit=document.createElement('button');edit.id='mobileInspector';edit.textContent='Editar';edit.setAttribute('aria-expanded','false');edit.onclick=()=>{const open=document.body.classList.toggle('inspector-open');edit.classList.toggle('active',open);edit.setAttribute('aria-expanded',String(open));};document.querySelector('header').append(edit);
  window.addEventListener('pointermove',()=>{if(document.body.classList.contains('inspector-open')&&document.querySelector('.library-drag-preview')){document.body.classList.remove('inspector-open');edit.classList.remove('active');edit.setAttribute('aria-expanded','false');}});
  document.querySelector('header').title='LIGHTMAN LASERMAN Studio · edición web 1.1';
  $('exportStatus').textContent='El paquete se genera en este navegador. Incluye proyecto, ILDA, RGB, manos, marcadores y música.';
},50);
