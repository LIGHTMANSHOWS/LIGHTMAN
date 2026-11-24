import {installWebPlatform} from './web-platform.js?v=1.5.0-client';
import {mountMobileView} from './mobile-view.js?v=1.5.1-mobile';
installWebPlatform();
await import('./app.js?v=1.5.0-client');
const untilReady=setInterval(()=>{
  if(!window.LASERMAN)return;clearInterval(untilReady);
  const $=id=>document.getElementById(id),localUrl='http://127.0.0.1:8924/';
  mountMobileView();
  document.querySelector('header').title='LIGHTMAN LASERMAN Studio · edición web 1.5';
  $('readiness').textContent='Editor web 1.5 · guardado en este navegador';
  $('connectFb3').textContent='Operador local';$('connectFb3').onclick=()=>window.open(localUrl,'_blank','noopener');
  $('suiteOutputStatus').textContent='Web · simulación';
  $('outputDialog').querySelector('p').textContent='Edita y guarda aquí. La emisión FB3 se realiza desde la aplicación local en el PC del montaje.';
  for(const id of ['scan','laserOnly','enableOutputs','disableOutputs'])$(id).hidden=true;
  $('laserOnly').closest('label').hidden=true;
  $('outputConsent').parentElement.hidden=true;$('outputMessage').textContent='Salida física disponible en el operador local.';
  const link=document.createElement('a');link.href=localUrl;link.target='_blank';link.rel='noopener';link.textContent='Abrir operador local';link.className='local-operator';$('closeOutputs').before(link);
  $('startProjectionTest').hidden=true;$('stopProjectionTest').hidden=true;
  $('projectionDialog').querySelector('h3').textContent='Prueba física en el operador local';
  $('projectionDialog').querySelector('h3').nextElementSibling.textContent='El mapa permite preparar y guardar el encuadre. El patrón láser se prueba desde el PC conectado al FB3.';
  $('projectionDialog').querySelector('#masterKppsField').title='Se conserva en el navegador; la tasa física se revisa en el operador local.';
  const openProjection=$('masterProjection').onclick;
  $('masterProjection').onclick=async()=>{await openProjection();$('projectionStatus').textContent='Encuadre local del navegador · prueba física en el operador local.';};
  const hint=document.createElement('p');hint.className='web-notice';hint.textContent='Editor web 1.5 · Tus cambios se guardan en este navegador. Exporta el show para llevarlo a otra PC.';document.querySelector('main').before(hint);
  const add=document.createElement('button');add.id='addLocalShow';add.textContent='Añadir show';$('nextShow').before(add);
  const input=document.createElement('input');input.type='file';input.accept='.json,.zip';input.hidden=true;document.body.append(input);add.onclick=()=>input.click();
  input.onchange=async()=>{
    const file=input.files[0];if(!file)return;add.disabled=true;
    try{
      await $('save').onclick();let project;
      if(file.name.toLowerCase().endsWith('.zip')){const r=await fetch('/api/import-show',{method:'POST',body:file});const data=await r.json();if(!r.ok)throw Error(data.error);project=data.project;}
      else project=JSON.parse(await file.text());
      const id=await window.LASERMAN_COMMANDS.addShow(project);location.search='?show='+encodeURIComponent(id);
    }catch(error){$('suiteOutputStatus').textContent=error.message;add.disabled=false;}finally{input.value='';}
  };
  const commandButton=document.createElement('button');commandButton.id='webCommands';commandButton.textContent='Comandos';$('hardware').before(commandButton);
  const dialog=document.createElement('dialog');dialog.id='webCommandDialog';
  dialog.innerHTML='<h2>Editar por comandos</h2><p>Aplica un lote de comandos JSON al show abierto. Se valida y respalda antes de guardar.</p><label>Comandos<textarea id="webCommandInput" rows="10" spellcheck="false" aria-label="Comandos JSON"></textarea></label><p id="webCommandStatus" role="status"></p><div class="dialogActions"><button id="validateWebCommands">Validar</button><button id="applyWebCommands" class="primary">Aplicar cambios</button><button id="closeWebCommands">Cerrar</button></div>';
  document.body.append(dialog);$('webCommandInput').value=JSON.stringify([{op:'cue.add',trackId:'laser-1',cue:{name:'Triángulo rojo',shape:'triangle',start:10,duration:1,color:'#ff0000'}}],null,2);
  commandButton.onclick=()=>{$('webCommandStatus').textContent='';dialog.showModal();};$('closeWebCommands').onclick=()=>dialog.close();
  async function run(dryRun){try{const sid=window.LASERMAN.activeShowId;const result=await window.LASERMAN_COMMANDS.apply(sid,JSON.parse($('webCommandInput').value),{dryRun});$('webCommandStatus').textContent=dryRun?'Lote válido. No se guardó ningún cambio.':'Guardado; el editor recibirá el cambio automáticamente.';if(!dryRun){dialog.close();document.activeElement?.blur();}return result;}catch(error){$('webCommandStatus').textContent=error.message;}}
  $('validateWebCommands').onclick=()=>run(true);$('applyWebCommands').onclick=()=>run(false);
},50);
