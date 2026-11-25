import {resolveMediaUrl} from './web-platform.js?v=1.7.0-roof';
import {createShowRepository} from './show-library.js?v=1.7.0-roof';
import {routedTracks,buildSharedFrame} from './shared-output.js?v=1.7.0-roof';
import {mountReferenceVideo} from './reference-video.js?v=1.7.0-roof';
import {mountKeyframeEditor} from './keyframe-ui.js?v=1.7.0-roof';
import {mountTransitionEditor} from './transition-ui.js?v=1.7.0-roof';
import {demoProject,validateProject,activeCue,trackEnabled,laserFrame,timelineRows,cueList,newCue,clamp,SHAPE_NAMES,EFFECTS,SECTIONS,REFERENCE_SHAPES} from './engine.js?v=1.7.0-roof';
import {insertLaserReference} from './laser-reference.js?v=1.7.0-roof';
import {createScene} from './scene.js?v=1.7.0-roof';
import {createLedEngine} from './led-engine.js?v=1.7.0-roof';
import {encodeFB3Frame} from './fb3-wire.js?v=1.7.0-roof';
import {validateProject as validateLaserProject} from './laser.js?v=1.7.0-roof';
import {mountTimelineEditor,commitFocusedField} from './timeline-ui.js?v=1.7.0-roof';
import {replaceWindow} from './timeline-model.js?v=1.7.0-roof';
import {mountProjectionEditor} from './projection-ui.js?v=1.7.0-roof';

const $=id=>document.getElementById(id);
let project,scene,led,fixture,time=0,playing=false,anchor=0,anchorTime=0,audio=null,audioReady=false,history=[],selected=null,selectedRow='laser-1';
let scale=5,expanded=new Set(),saveTimer,toastTimer,wave=[],lastPixel=0,ledBuffers=[],outputs=false,posting=false,lastPost=0,devices=[],laserOnly=true;
let keyframeEditor=null,transitionEditor=null,timelineEditor=null,future=[],playbackRange=null,renderRevision=0,lastLedRevision=-1,lastLedTime=-1;
let waveDuration=180,audioGeneration=0,audioRequest=null,musicAnalysis=null;
let inspectorKey=null,storageGeneration=0,referenceVideo=null,laserLayersExpanded=false;
let playbackSpeed=Number(localStorage.getItem('lightman-review-speed'))||1;
let catalog=[],activeShowId='',switchingShow=false,outputEpoch=0,showViews=new Map(),suiteSettings=null;
const clientId=crypto.randomUUID();
let showRepository=null,sharedStatusTimer=null,hardwareReady=false,outputWorker=null;
let localDirty=false,applyingRemote=false,pendingRemote=null,remotePollBusy=false,editGesture=false;
const handledCommands=new Set();
let projectionEditor=null,projectionTestActive=false,projectionStopPending=null;
async function cancelProjectionTest(){
  if(projectionStopPending)return projectionStopPending;
  if(!projectionTestActive)return;
  projectionTestActive=false;projectionEditor?.setActive(false);updateMode();
  if(outputs){projectionStopPending=api('outputs/test/stop',{clientId}).finally(()=>projectionStopPending=null);await projectionStopPending;}
}
const api=async(path,body)=>{
  const r=await fetch('/api/'+path,body===undefined?{cache:'no-store'}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const d=await r.json();if(!r.ok){const error=Error(d.error||'No se pudo completar la operación.');error.status=r.status;error.conflict=!!d.conflict;throw error;}return d;
};
function toast(text){$('toast').textContent=text;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),5500);}
function seconds(t){const m=Math.floor(t/60),s=Math.floor(t%60),ms=Math.floor((t%1)*1000);return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${String(ms).padStart(3,'0')}`;}
function checkpoint(){
  history.push(JSON.stringify(project));future=[];
  while(history.length>1&&(history.length>60||history.reduce((n,s)=>n+s.length,0)>48_000_000))history.shift();
  $('undo').disabled=false;if($('redoEdit'))$('redoEdit').disabled=true;
}
function persist(){
  localDirty=true;
  const sid=activeShowId,snapshot=structuredClone(project),generation=++storageGeneration;
  showRepository.cache(sid,snapshot);$('saveStatus').textContent='Guardado en este navegador';clearTimeout(saveTimer);
  saveTimer=setTimeout(()=>showRepository.save(sid,snapshot).then(()=>{
    if(generation===storageGeneration&&sid===activeShowId){localDirty=false;$('saveStatus').textContent='Guardado en este navegador';}
  }).catch(e=>{if(sid===activeShowId){$('saveStatus').textContent='Guardado local · pendiente de PC';toast(e.message);}}),650);
}
async function flushShow(){clearTimeout(saveTimer);const sid=activeShowId,generation=storageGeneration;await showRepository.save(sid,project);if(sid===activeShowId&&generation===storageGeneration){localDirty=false;$('saveStatus').textContent='Guardado en este navegador';}}
function changed(render=true){renderRevision++;persist();if(render)renderTimeline();}
function syncProjectControls(){
  const ref=$('referenceVideo'),hasVideo=project.reference?.hasVideo!==false&&!!project.reference?.url;
  ref.hidden=!hasVideo;$('referenceEmpty').hidden=hasVideo;
  if(hasVideo&&ref.dataset.mediaPath!==project.reference.url){referenceVideo?.reset();ref.pause();resolveMediaUrl(project.reference.url).then(src=>{if(project.reference?.url===ref.dataset.mediaPath){ref.src=src;ref.load();}}).catch(e=>toast(e.message));ref.dataset.mediaPath=project.reference.url;}
  if(!hasVideo){delete ref.dataset.mediaPath;referenceVideo?.reset();ref.pause();ref.removeAttribute('src');ref.load();}
  ref.dataset.fps=project.reference?.fps||30;
  $('referenceOffset').step=String(1/Number(ref.dataset.fps));
  $('referenceTitle').textContent=hasVideo?'VIDEO ORIGINAL · '+(catalog.find(x=>x.id===activeShowId)?.label||project.name):'NEON PROTOCOL · DEMO';
  if(project.colorPolicy)$('referenceTitle').textContent='REFERENCIA ORIGINAL · PALETA DEL SHOW: AZUL / BLANCO';
  $('stageInfo').textContent=catalog.find(x=>x.id===activeShowId)?.label||project.name;
  $('stageWidth').value=project.stage.width;$('stageDepth').value=project.stage.depth;$('rigHeight').value=project.stage.rigHeight;$('bpm').value=project.bpm;
  document.querySelector('.stage-overlay small').textContent='ESCALA ESTIMADA · '+project.stage.rigHeight.toFixed(1)+' m';
}
function adoptProject(next){
  project=validateProject(next);selected=null;selectedRow=project.tracks[0].id;expanded=new Set();playbackRange=null;
  timelineEditor?.clearMarker();seek(0);syncProjectControls();changed();renderInspector();
  return setAudio(project.audio?.url||'assets/random-switch.wav',project.audio?.name||'Audio');
}
function undo(){
  if(playbackRange?.preview)stop();
  if(!history.length)return;const previousSelection=selected;const beforeAudio=JSON.stringify(project.audio);future.push(JSON.stringify(project));project=validateProject(JSON.parse(history.pop()));
  syncProjectControls();if(beforeAudio!==JSON.stringify(project.audio)){stop();setAudio(project.audio?.url||'assets/random-switch.wav',project.audio?.name||'Audio');}
  selected=previousSelection&&project.tracks.some(t=>t.id===previousSelection.row.split('/')[0])&&cueList(project,previousSelection.row).some(c=>c.id===previousSelection.id)?previousSelection:null;changed();renderInspector();$('undo').disabled=!history.length;
}
function redo(){
  if(playbackRange?.preview)stop();
  if(!future.length)return;const previousSelection=selected;const beforeAudio=JSON.stringify(project.audio);history.push(JSON.stringify(project));project=validateProject(JSON.parse(future.pop()));
  syncProjectControls();if(beforeAudio!==JSON.stringify(project.audio)){stop();setAudio(project.audio?.url||'assets/random-switch.wav',project.audio?.name||'Audio');}
  selected=previousSelection&&project.tracks.some(t=>t.id===previousSelection.row.split('/')[0])&&cueList(project,previousSelection.row).some(c=>c.id===previousSelection.id)?previousSelection:null;changed();renderInspector();$('undo').disabled=false;
}
function currentSelection(){if(!selected)return null;const row=timelineRows(project,expanded).find(r=>r.id===selected.row);if(!row)return null;const cue=cueList(project,selected.row).find(c=>c.id===selected.id);return cue?{row,cue}:null;}
function select(row,id){if(playbackRange?.preview&&id!==playbackRange.cueId)stop();selectedRow=row;selected=id?{row,id}:null;if(id)timelineEditor?.clearMarker();renderInspector();document.querySelectorAll('.clip').forEach(c=>c.classList.toggle('selected',c.dataset.cue===id));document.querySelectorAll('.track-label').forEach(e=>e.classList.toggle('selected',e.dataset.row===row));}
function seek(t){if(playbackRange?.preview&&(t<playbackRange.start||t>=playbackRange.end))clearTransitionPreview();time=clamp(t,0,project.duration);anchorTime=time;anchor=performance.now();if(audio&&audioReady){audio.currentTime=clamp(time-(project.audio?.offset||0),0,audio.duration||project.duration);if(playing)audio.play().catch(()=>{});}led?.reset();updateTime();}
async function setPlaying(value){
  if(value)await cancelProjectionTest();
  playing=value;anchorTime=time;anchor=performance.now();$('play').textContent=value?'Ⅱ Pausar':'▶ Reproducir';updateMode();
  if(audio){if(value){if(audioReady)audio.currentTime=clamp(time-(project.audio?.offset||0),0,audio.duration||project.duration);try{await audio.play();}catch(e){toast('Pulsa Reproducir para autorizar el audio.');}}else audio.pause();}
}
function clearTransitionPreview(){if(playbackRange?.preview&&audio)audio.playbackRate=playbackRange.restoreRate??1;playbackRange=null;transitionEditor?.status();keyframeEditor?.status();}
async function startEditorPreview(range){
  const restoreRate=playbackRange?.preview?playbackRange.restoreRate:audio?.playbackRate??1;
  await stop();playbackRange={...range,preview:true,loop:true,restoreRate};
  if(audio){audio.playbackRate=range.rate;audio.preservesPitch=true;}
  seek(range.start);transitionEditor?.status();keyframeEditor?.status();await setPlaying(true);
}
async function stop(){await cancelProjectionTest();await setPlaying(false);clearTransitionPreview();seek(time);updateMode();}
async function emergencyStop(){
  projectionTestActive=false;projectionEditor?.setActive(false);
  outputWorker?.postMessage({type:'stop'});
  await stop();
  try{await api('outputs/stop',{});}catch(e){toast(e.message);}
  outputs=false;hardwareReady=false;
  if(suiteSettings){suiteSettings.autoConnect=false;try{suiteSettings=await api('suite/settings',{autoConnect:false});}catch{}}
  updateMode();
}
function updateMode(){
  $('modeBadge').textContent='SIMULADOR 3D';$('modeBadge').classList.remove('live');
  $('readiness').textContent='Editor web 1.5 · guardado en este navegador';
  $('suiteOutputStatus').textContent='Web · simulación';
  $('connectFb3').textContent='Operador local';$('connectFb3').classList.remove('active');
}

function updateTime(){$('timecode').textContent=seconds(time);$('playhead').style.left=(time*scale)+'px';$('sectionLabel').textContent=(project.sections||SECTIONS).filter(s=>s.time<=time).at(-1)?.name.toUpperCase()||'SHOW';keyframeEditor?.tick(time);}

function renderTimeline(){
  $('showHands').classList.toggle('active',expanded.size>0);
  const sourceRows=timelineRows(project,expanded),laserRows=sourceRows.filter(r=>r.type==='laser'),firstLaser=laserRows[0];
  const visibleLaserRows=laserRows.filter(r=>r.cues.some(c=>c.enabled!==false));
  const rows=laserLayersExpanded?sourceRows:sourceRows.filter(r=>r.type!=='laser'||r===firstLaser).map(r=>r===firstLaser?{...r,composite:true,label:'Láser · composición completa',cues:laserRows.flatMap(s=>s.cues.filter(c=>s===firstLaser||c.enabled!==false))}:r);
  const width=Math.max($('timelineScroll').clientWidth,project.duration*scale);
  $('timelineContent').style.width=width+'px';$('projectName').value=project.name;$('bpm').value=project.bpm;
  $('totalTime').textContent='/ '+seconds(project.duration).slice(0,5);
  const ruler=$('ruler');ruler.replaceChildren();
  const interval=[.1,.25,.5,1,2,5,10,15,30,60,120].find(t=>t*scale>=55)||120;
  for(let t=0;t<=project.duration;t+=interval){const el=document.createElement('div');el.className='tick';el.style.left=t*scale+'px';el.textContent=seconds(t).slice(0,interval<1?8:5);ruler.append(el);}
  $('trackLabels').replaceChildren();$('trackRows').replaceChildren();
  const grid=4*(60/project.bpm)*scale;
  for(const row of rows){
    const label=document.createElement('div');label.className='track-label '+(row.type==='hand'?'hand':'')+(row.track.enabled===false?' muted':'')+(selectedRow===row.id?' selected':'');label.dataset.row=row.id;
    if(row===firstLaser||row.composite){const toggle=document.createElement('button');toggle.textContent=laserLayersExpanded?'▾':'▸';toggle.title=laserLayersExpanded?'Unir capas de láser en una pista':'Editar capas de láser por separado';toggle.onclick=e=>{e.stopPropagation();laserLayersExpanded=!laserLayersExpanded;renderTimeline();};label.append(toggle);}
    if(row.type==='suit'){
      const exp=document.createElement('button');exp.textContent=expanded.has(row.id)?'▾':'▸';exp.title='Mostrar las dos manos';exp.onclick=e=>{e.stopPropagation();expanded.has(row.id)?expanded.delete(row.id):expanded.add(row.id);renderTimeline();};label.append(exp);
    }else{const dot=document.createElement('i');dot.className='dot';dot.style.background=row.type==='hand'?'#597c8b':row.track.color;label.append(dot);}
    const title=document.createElement('span');title.textContent=row.label;label.append(title);
    if(row.type!=='hand')for(const [text,field] of [['M','enabled'],['S','solo']]){const b=document.createElement('button');b.textContent=text;b.classList.toggle('active',field==='enabled'?!row.track.enabled:!!row.track.solo);b.title=field==='enabled'?'Silenciar pista':'Escuchar solo esta pista';b.onclick=e=>{e.stopPropagation();checkpoint();const value=!row.track[field];for(const t of row.composite?laserRows.map(r=>r.track):[row.track])t[field]=value;changed();};label.append(b);}
    label.onclick=()=>select(row.id,null);$('trackLabels').append(label);
    const line=document.createElement('div');line.className='track-row '+(row.type==='hand'?'hand':'');line.dataset.row=row.id;line.style.width=width+'px';line.style.backgroundSize=grid+'px 100%';
    if(row.composite){const height=Math.max(1,visibleLaserRows.length)*26+6;line.style.height=height+'px';label.style.height=height+'px';}
    line.ondblclick=e=>{if(e.target!==line)return;const rect=line.getBoundingClientRect();addBlock(row.id,(e.clientX-rect.left)/scale);};
    line.onclick=e=>{if(e.target===line)select(row.id,null);};
    for(const cue of row.cues){
      const sourceRow=row.composite?laserRows.find(r=>r.cues.includes(cue)):row;
      const block=document.createElement('div');block.className='clip'+(cue.layer?' accent-layer':'')+(selected?.id===cue.id?' selected':'');block.dataset.cue=cue.id;block.dataset.row=row.id;block.style.setProperty('--clip',cue.color);block.style.left=cue.start*scale+'px';block.style.width=Math.max(4,cue.duration*scale)+'px';block.title=`${cue.name} · ${cue.start.toFixed(2)} s / ${cue.duration.toFixed(2)} s`;
      const text=document.createElement('span');text.textContent=cue.name;const resize=document.createElement('div');resize.className='resize';block.append(text,resize);
      if(row.composite){const lane=Math.max(0,visibleLaserRows.indexOf(sourceRow));block.style.top=(lane*26+3)+'px';block.style.height='22px';block.dataset.row=sourceRow.id;}
      block.onpointerdown=e=>beginDrag(e,sourceRow,cue,block,e.target===resize);block.onclick=e=>{e.stopPropagation();select(sourceRow.id,cue.id);};transitionEditor?.decorate(block,sourceRow,cue);line.append(block);
    }
    $('trackRows').append(line);
  }
  drawWave();updateTime();$('trackSummary').textContent='3 artistas · reconstrucción aproximada · '+project.tracks.reduce((n,t)=>n+t.cues.length+(t.hands? t.hands.left.length+t.hands.right.length:0),0)+' bloques';
  timelineEditor?.render();
}
function beginDrag(e,row,cue,el,resizing){
  if(e.button!==0)return;e.preventDefault();e.stopPropagation();commitFocusedField();const targetSpan=timelineEditor?.span();select(row.id,cue.id);
  const x=e.clientX,start=cue.start,duration=cue.duration;
  const snap=(t,event)=>timelineEditor?.snap(t,event)??t;
  function move(ev){const delta=(ev.clientX-x)/scale;if(resizing)cue.duration=clamp(snap(start+duration+delta,ev)-start,.05,project.duration-cue.start);else cue.start=clamp(snap(start+delta,ev),0,project.duration-cue.duration);const visible=document.querySelector('.clip[data-cue="'+CSS.escape(cue.id)+'"]')||el;visible.style.left=cue.start*scale+'px';visible.style.width=cue.duration*scale+'px';renderRevision++;}
  function end(event){
    window.removeEventListener('pointermove',move,true);window.removeEventListener('pointerup',end,true);window.removeEventListener('pointercancel',end,true);window.removeEventListener('laserman-cancel-gesture',end);window.removeEventListener('blur',end);
    const final={start:cue.start,duration:cue.duration};cue.start=start;cue.duration=duration;
    if(event.type!=='pointerup'){renderRevision++;renderTimeline();renderInspector();return;}
    if(final.start===start&&final.duration===duration){renderTimeline();renderInspector();return;}
    checkpoint();Object.assign(cue,final);
    if(!resizing&&timelineEditor?.onClipDrop(cue,event,targetSpan)){
      const list=cueList(project,row.id);list.splice(0,list.length,...replaceWindow(list,cue));
    }
    changed();renderInspector();
  }
  window.addEventListener('pointermove',move,true);window.addEventListener('pointerup',end,{once:true,capture:true});window.addEventListener('pointercancel',end,{once:true,capture:true});
  window.addEventListener('laserman-cancel-gesture',end,{once:true});window.addEventListener('blur',end,{once:true});
}
function addBlock(rowId,start=time){
  const row=timelineRows(project,expanded).find(r=>r.id===rowId);if(!row)return;
  selectedRow=rowId;
  checkpoint();const cue={...newCue(row.type,clamp(start,0,project.duration-.05)),...timelineEditor?.template()};delete cue.kind;cue.duration=Math.min(cue.duration,project.duration-cue.start);cueList(project,row.id).push(cue);selected={row:row.id,id:cue.id};changed();renderInspector();
}
function renderInspector(){
  const key=timelineEditor?.markerId||selected?.id||selectedRow;
  if(key!==inspectorKey){document.querySelector('.inspector').scrollTop=0;inspectorKey=key;}
  const panel=$('properties');panel.replaceChildren();const item=currentSelection();$('selectionActions').hidden=!item;
  transitionEditor?.inspect();keyframeEditor?.inspect();
  const library=$('effectLibrary');if(library){if(item)$('selectionActions').after(library);else panel.before(library);}
  timelineEditor?.renderPalette();if(timelineEditor?.inspectMarker(panel))return;
  if(!item){$('selectionTitle').textContent=project.tracks.find(t=>t.id===selectedRow.split('/')[0])?.name||'Selecciona un bloque';$('selectionHint').textContent='Doble clic en el timeline o + Bloque para añadir.';return;}
  const {cue,row}=item;$('selectionTitle').textContent=row.label;$('selectionHint').textContent=row.type==='hand'?'Control binario · 0 = apagado / 255 = encendido':row.type==='laser'?'Animación geométrica · tope de salida de 15 kpps':'Motor LDP · Jacket de 530 píxeles';
  function field(label,key,{type='number',min,max,step='any',values,fallback}={}){
    const wrap=document.createElement('label');wrap.textContent=label;const input=document.createElement(values?'select':'input');
    if(values)for(const [v,title]of Object.entries(values))input.add(new Option(title,v));else{input.type=type;if(min!==undefined)input.min=min;if(max!==undefined)input.max=max;input.step=step;}
    input.value=cue[key]??fallback;input.dataset.property=key;
    input.onchange=()=>{
      if(!input.checkValidity()){input.reportValidity();input.value=cue[key];return;}
      const value=type==='number'&&!values?Number(input.value):input.value;
      if(value===cue[key])return;
      if((key==='start'&&value+cue.duration>project.duration)||(key==='duration'&&value+cue.start>project.duration)){toast('El bloque debe terminar dentro del show.');input.value=cue[key];return;}
      checkpoint();cue[key]=value;if(key==='effect')cue.name=EFFECTS[value];if(key==='shape')cue.name=SHAPE_NAMES[value];changed();if(['shape','start','duration'].includes(key))renderInspector();
    };wrap.append(input);panel.append(wrap);return input;
  }
  field('Nombre','name',{type:'text'});field('Comienzo · segundos','start',{min:0,max:project.duration});field('Duración · segundos','duration',{min:.05,max:project.duration});field('Color','color',{type:'color'});
  if(row.type==='laser'){
    if(cue.motion?.length){
      const label=document.createElement('label'),toggle=document.createElement('input');toggle.type='checkbox';toggle.checked=cue.motionEnabled!==false;toggle.onchange=()=>{checkpoint();cue.motionEnabled=toggle.checked;changed();};label.append(toggle,document.createTextNode('Movimiento sincronizado con la música'));panel.append(label);
      if(cue.motionStrength===undefined)cue.motionStrength=1;
      field('Fuerza del movimiento musical','motionStrength',{min:0,max:1,step:.05});
    }
    if(cue.videoMotion&&cue.videoMotion.shape===cue.shape){
      const wrap=document.createElement('label'),toggle=document.createElement('input');toggle.type='checkbox';toggle.checked=cue.videoMotionEnabled!==false;
      toggle.onchange=()=>{checkpoint();cue.videoMotionEnabled=toggle.checked;changed();renderInspector();};
      wrap.append(toggle,document.createTextNode('Movimiento medido del video'));panel.append(wrap);
      const note=document.createElement('p');note.className='hint';note.textContent='1× conserva los tiempos del video. Apertura y desplazamiento medidos a '+cue.videoMotion.fps+' fps ('+Math.round(100*cue.videoMotion.observations/cue.videoMotion.totalSamples)+' % de observaciones fiables); profundidad estimada.';panel.append(note);
    }
    const shapes=Object.fromEntries(Object.entries(SHAPE_NAMES).filter(([key])=>key!=='custom'||cue.customFrames));
    field('Figura','shape',{values:shapes});field('Tamaño','size',{min:.05,max:1,step:.01});field('Rotación inicial · grados','rotation',{min:-720,max:720,step:1});field('Rotación final · grados','rotationEnd',{min:-720,max:720,step:1});field('Centro horizontal · metros','panX',{min:-3,max:3,step:.05});field('Centro en profundidad · metros','panZ',{min:-3,max:3,step:.05});
    if(cue.shape==='polygon')field('Número de lados','polygonSides',{min:3,max:32,step:1,fallback:5});
    if(REFERENCE_SHAPES.includes(cue.shape)){
      field(cue.videoMotion&&cue.videoMotion.shape===cue.shape&&cue.videoMotionEnabled!==false?'Velocidad respecto al video · ×':'Velocidad del efecto','effectSpeed',{min:0,max:4,step:.01,fallback:1});
      if(['beamCage','beamFan'].includes(cue.shape))field('Cantidad de haces','beamCount',{min:3,max:32,step:1,fallback:8});
      field('Origen en el simulador','previewOrigin',{values:{projector:'Proyector superior','left-hand':'Mano izquierda','right-hand':'Mano derecha'},fallback:'projector'});
      field('Altura de la figura en el simulador · m','projectionHeight',{min:0,max:12,step:.005,fallback:cue.shape==='handPinch'?1.235:.035});
    }
    if(!cue.videoMotion||cue.videoMotion.shape!==cue.shape||cue.videoMotionEnabled===false){
      if(REFERENCE_SHAPES.includes(cue.shape)){
        field('Reloj del movimiento','effectClock',{values:{clip:'Desde el inicio del bloque',show:'Continuo desde el inicio del show'},fallback:'clip'});
        field('Fase inicial del movimiento','effectPhase',{min:-50000,max:50000,step:.01,fallback:0});
      }
    }
    if(cue.shape==='custom')field('Velocidad de fotogramas importados','customFps',{min:1,max:60,step:1});
    const picker=document.createElement('input');picker.type='file';picker.accept='.json';picker.hidden=true;
    const importButton=document.createElement('button');importButton.type='button';importButton.textContent='Importar de Laser Studio';importButton.onclick=()=>picker.click();
    picker.onchange=async()=>{
      try{
        const file=picker.files[0];if(!file)return;if(file.size>4e6)throw Error('El archivo láser supera 4 MB.');
        const source=validateLaserProject(JSON.parse(await file.text()));
        const next={...cue,shape:'custom',customFrames:source.frames,customFps:source.fps,name:source.name};
        if(source.frames.length>1)next.duration=Math.min(project.duration-next.start,source.frames.length/source.fps);
        const candidate=structuredClone(project),target=cueList(candidate,row.id).find(c=>c.id===cue.id);Object.assign(target,next);validateProject(candidate);
        if(JSON.stringify(candidate).length>18_000_000)throw Error('El proyecto completo supera el tamaño permitido.');
        checkpoint();Object.assign(cue,next);changed();renderInspector();toast(source.frames.length+' fotogramas importados. Sus colores se conservan.');
      }catch(e){toast(e.message);}
    };panel.append(importButton,picker);
  }else if(row.type==='suit'){
    const layerLabel=document.createElement('label'),layerToggle=document.createElement('input');layerToggle.type='checkbox';layerToggle.checked=!!cue.layer;layerToggle.onchange=()=>{checkpoint();cue.layer=layerToggle.checked;changed();};layerLabel.append(layerToggle,document.createTextNode('Acento superpuesto al efecto base'));panel.append(layerLabel);
    field('Efecto LED','effect',{values:EFFECTS});field('Velocidad del efecto','speed',{min:.1,max:4,step:.1});field('Intensidad LED · %','intensity',{min:0,max:100,step:1});
    const title=document.createElement('label');title.textContent='Zonas del jacket';const zones=document.createElement('div');zones.className='zones';
    for(const name of ['all',...fixture.zones.map(z=>z.name)]){const label=document.createElement('label'),box=document.createElement('input');box.type='checkbox';box.checked=cue.targets.includes(name);box.onchange=()=>{checkpoint();if(name==='all')cue.targets=['all'];else{cue.targets=cue.targets.filter(n=>n!=='all'&&n!==name);if(box.checked)cue.targets.push(name);if(!cue.targets.length)cue.targets=['all'];}changed(false);renderInspector();};label.append(box,document.createTextNode(name==='all'?'Todo el traje':name));zones.append(label);}title.append(zones);panel.append(title);
  }
}

async function setAudio(url,name,upload=false){
  $('play').disabled=true;const generation=++audioGeneration;audioRequest?.abort();audioRequest=new AbortController();
  if(audio){audio.pause();audio.removeAttribute('src');audio.load();audio.remove();}audioReady=false;musicAnalysis=null;
  const nextAudio=new Audio(await resolveMediaUrl(url));audio=nextAudio;nextAudio.id='showAudio';nextAudio.hidden=true;document.body.append(nextAudio);audio.preload='auto';audio.playbackRate=playbackSpeed;audio.preservesPitch=true;audio.volume=project.audio?.volume??.68;if($('masterVolume'))$('masterVolume').value=Math.round(audio.volume*100);
  nextAudio.addEventListener('loadedmetadata',()=>{if(generation===audioGeneration){audioReady=true;waveDuration=nextAudio.duration;}});
  nextAudio.addEventListener('error',()=>{if(generation===audioGeneration)toast('No se pudo cargar la música. Puedes importar un archivo.');});
  $('audioName').textContent=name;$('audioName').title=name;
  let ctx;
  try{
    const bytes=await(await fetch(url,{signal:audioRequest.signal})).arrayBuffer();
    const digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('');
    ctx=new AudioContext();const data=await ctx.decodeAudioData(bytes);
    if(generation!==audioGeneration)return;
    const samples=data.getChannelData(0);waveDuration=data.duration;
    wave=Array.from({length:4500},(_,i)=>{const a=Math.floor(i*samples.length/4500),end=Math.floor((i+1)*samples.length/4500);let v=0;for(let j=a;j<end;j+=Math.max(1,Math.floor((end-a)/90)))v=Math.max(v,Math.abs(samples[j]));return v;});
    if(project.analysis?.audioSha256===digest){
      try{const analysis=await(await fetch(project.analysis?.url||'assets/random-switch-analysis.json',{signal:audioRequest.signal})).json();if(generation===audioGeneration&&analysis.audioSha256===digest)musicAnalysis=analysis;}catch{}
    }
    if(generation===audioGeneration){if($('showMusicAccents'))$('showMusicAccents').disabled=!musicAnalysis;drawWave();}
  }catch(e){if(generation===audioGeneration&&e.name!=='AbortError'){wave=[];drawWave();}}
  finally{if(ctx&&ctx.state!=='closed')await ctx.close();if(generation===audioGeneration)$('play').disabled=false;}
}
function drawWave(){
  const c=$('waveform'),w=Math.min(16384,Math.max($('timelineScroll').clientWidth,Math.ceil(project.duration*scale)));c.width=w;const x=c.getContext('2d');x.clearRect(0,0,w,42);x.fillStyle='#2c8c8a';
  for(let i=0;i<w;i++){const at=i/scale-(project.audio?.offset||0),sample=Math.floor(at/waveDuration*wave.length);const v=sample>=0&&sample<wave.length?wave[sample]:0;x.fillRect(i,21-v*17,1,Math.max(1,v*34));}
  if(musicAnalysis&&$('showMusicAccents')?.checked){
    for(const event of musicAnalysis.events){
      if(!['kick','snare','lead'].includes(event.kind))continue;
      const at=(event.at+(project.audio?.offset||0))*scale;
      x.fillStyle=event.kind==='kick'?'#d5a65b':event.kind==='snare'?'#bc8be7':'#68bfea';
      x.fillRect(at,event.kind==='lead'?2:32,Math.max(1,scale*.012),event.kind==='lead'?5:8);
    }
  }
  for(const s of project.sections||SECTIONS){x.fillStyle='#c4dded';x.font='8px sans-serif';x.fillText(s.name.toUpperCase(),s.time*scale+4,10);}
}
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
function downloadProject(){download(new Blob([JSON.stringify(project)],{type:'application/json'}),project.name.replace(/[^a-z0-9_-]/gi,'_')+'.laserman.json');}

function outputTracks(){return routedTracks(project,suiteSettings);}
function patchEditor(){
  const target=$('patchEditor');target.replaceChildren();
  const trackLabel=document.createElement('label');trackLabel.textContent='Composición enviada al FB3 en todos los shows';
  const track=document.createElement('select');track.id='suiteOutputTrack';
  track.add(new Option('Todas las capas láser · una salida física','laser-1'));suiteSettings.trackId='laser-1';
  track.value=suiteSettings.trackId;track.disabled=outputs;track.onchange=()=>{suiteSettings.trackId=track.value;};trackLabel.append(track);target.append(trackLabel);
  const deviceLabel=document.createElement('label');deviceLabel.textContent='FB3 compartido';
  const device=document.createElement('select');device.id='suiteOutputDevice';device.add(new Option('Selecciona el FB3',''));
  for(const [i,path]of devices.entries())device.add(new Option('FB3 USB '+(i+1)+' · '+path.slice(-28),path));
  if(suiteSettings.device&&!devices.includes(suiteSettings.device))device.add(new Option('FB3 guardado · desconectado',suiteSettings.device));
  device.value=suiteSettings.device;device.disabled=outputs;device.onchange=()=>{suiteSettings.device=device.value;};deviceLabel.append(device);target.append(deviceLabel);
  const note=document.createElement('p');note.textContent='Una conexión para todas las pestañas. Los trajes permanecen en simulación; Art-Net apagado.';target.append(note);
  const brightnessLabel=document.createElement('label');brightnessLabel.textContent='Brillo maestro del láser';
  const brightness=document.createElement('input');brightness.id='suiteLaserIntensity';brightness.type='range';brightness.min=0;brightness.max=100;brightness.step=1;brightness.value=Math.round(suiteSettings.intensity*100);brightness.setAttribute('aria-label','Brillo maestro del láser');
  const brightnessValue=document.createElement('output');brightnessValue.textContent=brightness.value+'%';
  brightness.oninput=()=>{suiteSettings.intensity=Number(brightness.value)/100;brightnessValue.textContent=brightness.value+'%';};
  brightness.onchange=async()=>{try{suiteSettings=await api('suite/settings',{intensity:suiteSettings.intensity});}catch(error){toast(error.message);}};
  brightnessLabel.append(brightness,brightnessValue);target.append(brightnessLabel);
}
async function enableSharedOutput(){
  if(outputs)return;
  if(!suiteSettings.device)throw Error('Selecciona el FB3 conectado.');
  suiteSettings=await api('suite/settings',{device:suiteSettings.device,trackId:suiteSettings.trackId});
  const state=await api('outputs/enable',{tracks:outputTracks(),confirmed:true,laserOnly:true,clientId,showId:activeShowId});
  outputEpoch=state.epoch;outputs=true;hardwareReady=true;lastPost=0;
  outputWorker.postMessage({type:'start',packet:{...buildSharedFrame(project,time,false,suiteSettings),clientId,epoch:outputEpoch,ready:true}});
  suiteSettings=await api('suite/settings',{autoConnect:true});updateMode();
}
async function outputFrame(now){
  const interval=1000/30;if(!outputs||now-lastPost<interval)return;lastPost=now-(now-lastPost)%interval;
  const profile=projectionEditor?.profile;
  const testProject=projectionTestActive?{...project,projection:profile?.show}:project;
  const settings=projectionTestActive?{...suiteSettings,projection:profile?.master,kpps:profile?.kpps??15}:suiteSettings;
  const payload=buildSharedFrame(testProject,time,playing&&!switchingShow&&!projectionTestActive,settings,projectionTestActive?'orientation':null);
  payload.test=projectionTestActive;
  outputWorker.postMessage({type:'frame',packet:{...payload,clientId,epoch:outputEpoch,ready:!switchingShow}});
}
function renderShowTabs(){
  const tabs=$('showTabs');tabs.replaceChildren();
  for(const show of catalog){
    const b=document.createElement('button');b.type='button';b.role='tab';b.dataset.show=show.id;
    b.id='show-tab-'+show.id;b.setAttribute('aria-selected',String(show.id===activeShowId));b.classList.toggle('active',show.id===activeShowId);
    b.tabIndex=show.id===activeShowId?0:-1;
    const title=document.createElement('strong');title.textContent=show.label;
    const meta=document.createElement('small');meta.textContent=seconds(show.duration).slice(0,5)+(show.demo?' · demo':'');
    b.append(title,meta);b.onclick=()=>switchShow(show.id).catch(e=>toast(e.message));
    b.onkeydown=e=>{
      if(e.ctrlKey||e.altKey||e.metaKey||!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
      e.preventDefault();const i=catalog.findIndex(x=>x.id===show.id);
      const next=e.key==='Home'?0:e.key==='End'?catalog.length-1:(i+(e.key==='ArrowRight'?1:-1)+catalog.length)%catalog.length;
      switchShow(catalog[next].id).then(()=>$('show-tab-'+catalog[next].id)?.focus()).catch(error=>toast(error.message));
    };tabs.append(b);
  }
  tabs.querySelector('[aria-selected="true"]')?.scrollIntoView({block:'nearest',inline:'nearest'});
}
async function switchShow(sid){
  if(switchingShow||sid===activeShowId)return;
  await cancelProjectionTest();
  const nextMeta=catalog.find(x=>x.id===sid);if(!nextMeta)throw Error('Show no encontrado.');
  switchingShow=true;$('showTabs').setAttribute('aria-busy','true');
  $('showTabs').querySelectorAll('button').forEach(b=>b.disabled=true);
  const resume=playing;
  showViews.set(activeShowId,{time,scale,selected,selectedRow,expanded:[...expanded],history,future,offset:$('referenceOffset').value});
  try{
    await stop();
    if(outputs){const handoff=await api('outputs/handoff',{clientId,showId:sid});outputEpoch=handoff.epoch;}
    await flushShow();
    const next=validateProject(await showRepository.load(sid));
    activeShowId=sid;project=next;history=[];future=[];selected=null;inspectorKey=null;selectedRow=project.tracks[0].id;expanded=new Set();localDirty=false;pendingRemote=null;$('remoteChanges').hidden=true;
    keyframeEditor?.close();transitionEditor?.close?.();timelineEditor?.clearMarker();
    const view=showViews.get(sid);
    if(view){history=view.history;future=view.future;selected=view.selected;selectedRow=view.selectedRow;expanded=new Set(view.expanded);}
    scale=view?.scale??clamp(($('timelineScroll').clientWidth-35)/project.duration,.5,200);$('zoom').value=scale;
    $('referenceOffset').value=view?.offset??project.reference?.offset??0;
    $('referenceFollow').checked=true;syncProjectControls();
    time=0;led.reset();ledBuffers=[];lastLedTime=-1;renderRevision++;renderTimeline();renderInspector();
    await setAudio(project.audio?.url,project.audio?.name||'Audio del show');
    seek(view?.time??0);
    if(time>=project.duration)seek(0);
    localStorage.setItem('lightman-suite-active-show',sid);
    window.history.replaceState(null,'','?show='+encodeURIComponent(sid));
    document.title='LASERMAN SHOWS · '+nextMeta.label;
    if(resume)await setPlaying(true);
  }finally{
    switchingShow=false;$('showTabs').setAttribute('aria-busy','false');renderShowTabs();updateMode();
  }
}

async function applyRemote(entry,backupLocal=false){
  if(applyingRemote||switchingShow||showRepository.isSaving(activeShowId))return;
  applyingRemote=true;const sid=activeShowId;
  document.querySelector('main').inert=true;document.querySelector('.show-library').inert=true;
  try{
    await stop();
    if(outputs)outputWorker.postMessage({type:'frame',packet:{...buildSharedFrame(project,time,false,suiteSettings),clientId,epoch:outputEpoch,ready:true}});
    clearTimeout(saveTimer);
    if(backupLocal)await api('project/archive',{project});
    const next=validateProject(await showRepository.refresh(sid));
    if(sid!==activeShowId)return;
    const oldTime=time,beforeAudio=JSON.stringify(project.audio);checkpoint();project=next;localDirty=false;inspectorKey=null;
    const target=entry.command?.view?.cueId;
    if(target){
      const track=project.tracks.find(t=>t.cues.some(c=>c.id===target));selected=track?{row:track.id,id:target}:null;if(track)selectedRow=track.id;
    }else if(selected&&!cueList(project,selected.row)?.some(c=>c.id===selected.id))selected=null;
    syncProjectControls();renderRevision++;led.reset();ledBuffers=[];lastLedTime=-1;
    if(beforeAudio!==JSON.stringify(project.audio))await setAudio(project.audio?.url,project.audio?.name||'Audio');
    seek(entry.command?.view?.seek??Math.min(oldTime,project.duration));renderTimeline();renderInspector();
    pendingRemote=null;$('remoteChanges').hidden=true;$('saveStatus').textContent='Cambios por comandos aplicados';
    if(entry.command&&showRepository.revision(sid)===entry.command.revision){handledCommands.add(entry.command.id);await api('commands/ack',{id:entry.command.id,revision:entry.command.revision,state:'applied'});}
    toast('Edición por comandos aplicada · reproducción pausada');
  }catch(error){toast(error.message);}
  finally{applyingRemote=false;document.querySelector('main').inert=false;document.querySelector('.show-library').inert=false;}
}
async function pollRemoteChanges(){
  if(remotePollBusy||switchingShow||applyingRemote||!showRepository||showRepository.isSaving(activeShowId))return;
  remotePollBusy=true;
  try{
    const sid=activeShowId,data=await api('show-revisions');if(sid!==activeShowId)return;
    const entry=data.shows[sid];if(!entry)return;
    const unhandled=entry.command&&!handledCommands.has(entry.command.id)&&entry.command.state!=='applied';
    if(entry.revision===showRepository.revision(sid)&&!unhandled)return;
    if(localDirty||editGesture||document.activeElement?.matches('input,textarea,select')){
      pendingRemote=entry;$('remoteChanges').hidden=false;
      if(entry.command&&entry.command.state!=='conflict')await api('commands/ack',{id:entry.command.id,revision:entry.command.revision,state:'conflict'});
      return;
    }
    await applyRemote(entry);
  }catch(error){if(error.status!==undefined&&error.status!==409)console.warn('Sincronización temporalmente no disponible.');}
  finally{remotePollBusy=false;}
}

function bind(){
  window.addEventListener('pointerdown',()=>editGesture=true,true);
  window.addEventListener('pointerup',()=>editGesture=false,true);window.addEventListener('pointercancel',()=>editGesture=false,true);
  $('properties').onsubmit=e=>{e.preventDefault();commitFocusedField();};
  $('properties').addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.matches('input:not([type=checkbox]):not([type=color])')){e.preventDefault();commitFocusedField();}});
  timelineEditor=mountTimelineEditor({getProject:()=>project,getRow:()=>selectedRow,getScale:()=>scale,getTime:()=>time,
    checkpoint,commit:render=>changed(render!==false),inspect:renderInspector,notice:toast,seek,canRedo:()=>future.length>0,redo,redrawWave:drawWave,
    selectRow:row=>{selectedRow=row;selected=null;},didFill:(row,cue)=>{selectedRow=row;selected={row,id:cue.id};},
    playRange:span=>{clearTransitionPreview();playbackRange={...span};seek(span.start);setPlaying(true);},
    zoomTo:span=>{scale=clamp(($('timelineScroll').clientWidth-50)/(span.end-span.start),.5,200);$('zoom').value=scale;renderTimeline();$('timelineScroll').scrollLeft=Math.max(0,span.start*scale-20);}
  });
  $('zoom').min=.5;$('zoom').step=.1;$('zoom').max=200;
  transitionEditor=mountTransitionEditor({
    getProject:()=>project,getRow:()=>selectedRow,getTime:()=>time,getScale:()=>scale,getSelection:currentSelection,
    getPreview:()=>playbackRange?.preview&&playbackRange.kind!=='keyframes'?playbackRange:null,
    onOpen:()=>{if(keyframeEditor?.isOpen())keyframeEditor.close();},
    checkpoint,commit:()=>changed(),inspect:renderInspector,notice:toast,select,seek,
    invalidate:()=>{renderRevision++;},snap:(t,event)=>timelineEditor.snap(t,event),
    zoom:span=>{scale=clamp(($('timelineScroll').clientWidth-40)/Math.max(.5,span.end-span.start),.5,200);$('zoom').value=scale;renderTimeline();$('timelineScroll').scrollLeft=Math.max(0,span.start*scale-20);},
    startPreview:startEditorPreview,
    stopPreview:async()=>{await stop();transitionEditor.status();}
  });

  keyframeEditor=mountKeyframeEditor({
    getProject:()=>project,getRow:()=>selectedRow,getTime:()=>time,getSelection:currentSelection,captureCanvas:()=>scene.renderer.domElement,
    getPreview:()=>playbackRange?.preview&&playbackRange.kind==='keyframes'?playbackRange:null,
    checkpoint,commit:()=>changed(),inspect:renderInspector,notice:toast,select,undo,redo,canUndo:()=>history.length>0,canRedo:()=>future.length>0,
    invalidate:()=>{renderRevision++;},snap:(t,event)=>timelineEditor.snap(t,event),
    zoom:span=>{scale=clamp(($('timelineScroll').clientWidth-40)/Math.max(.5,span.end-span.start),.5,200);$('zoom').value=scale;renderTimeline();$('timelineScroll').scrollLeft=Math.max(0,span.start*scale-20);},
    scrub:async t=>{await stop();seek(t);},startPreview:startEditorPreview,stopPreview:stop
  });

  const master=document.createElement('label');master.className='master-volume';master.textContent='Volumen';
  const slider=document.createElement('input');slider.id='masterVolume';slider.type='range';slider.min=0;slider.max=100;slider.step=1;slider.value=Math.round((project.audio?.volume??.68)*100);slider.setAttribute('aria-label','Volumen del audio');
  slider.oninput=()=>{const value=Number(slider.value)/100;if(audio)audio.volume=value;project.audio.volume=value;persist();};master.append(slider);$('audioPick').after(master);
  const speedLabel=document.createElement('label');speedLabel.className='master-volume';speedLabel.textContent='Velocidad ';
  const speedSelect=document.createElement('select');speedSelect.id='reviewSpeed';speedSelect.setAttribute('aria-label','Velocidad de revisión');
  for(const value of [.5,.75,1,1.25])speedSelect.add(new Option(Math.round(value*100)+'%',String(value)));
  speedSelect.value=String(playbackSpeed);speedSelect.onchange=()=>{playbackSpeed=Number(speedSelect.value);localStorage.setItem('lightman-review-speed',String(playbackSpeed));anchorTime=time;anchor=performance.now();if(audio){audio.playbackRate=playbackSpeed;audio.preservesPitch=true;}};master.after(speedLabel);speedLabel.append(speedSelect);
  const restore=document.createElement('button');restore.id='loadReferenceShow';restore.textContent='Restaurar referencia de esta pestaña';restore.className='reference-sequence';$('resetDemo').before(restore);
  restore.onclick=async()=>{
    try{await stop();await api('project/archive',{project});checkpoint();
      const meta=catalog.find(x=>x.id===activeShowId);const source=validateProject(await(await fetch(meta.project,{cache:'no-store'})).json());
      await adoptProject(source);await flushShow();toast('Referencia restaurada. La edición anterior quedó respaldada.');
    }catch(e){toast(e.message);}
  };
  $('play').onclick=()=>{if(!playbackRange?.preview)playbackRange=null;setPlaying(!playing);};$('stop').onclick=emergencyStop;$('rewind').onclick=()=>seek(0);
  $('ruler').onpointerdown=$('waveform').onpointerdown=e=>{const rect=e.currentTarget.getBoundingClientRect();seek((e.clientX-rect.left)/scale);};
  $('timelineScroll').onscroll=()=>{$('trackLabels').parentElement.scrollTop=$('timelineScroll').scrollTop;};
  const labels=document.querySelector('.labels');labels.addEventListener('wheel',e=>{e.preventDefault();if(e.shiftKey)$('timelineScroll').scrollLeft+=e.deltaY;else $('timelineScroll').scrollTop+=e.deltaY;},{passive:false});
  labels.onscroll=()=>{if(Math.abs($('timelineScroll').scrollTop-labels.scrollTop)>1)$('timelineScroll').scrollTop=labels.scrollTop;};
  $('zoom').oninput=e=>{scale=Number(e.target.value);renderTimeline();};
  $('showHands').onclick=()=>{expanded=expanded.size?new Set():new Set(project.tracks.filter(t=>t.type==='suit').map(t=>t.id));renderTimeline();$('showHands').classList.toggle('active',expanded.size>0);};
  $('addCue').onclick=()=>timelineEditor.span()?timelineEditor.fill():addBlock(selectedRow);$('undo').onclick=undo;
  $('duplicate').onclick=()=>{const item=currentSelection();if(!item)return;checkpoint();const c=structuredClone(item.cue);c.id=crypto.randomUUID();c.start=clamp(c.start+c.duration,0,project.duration-c.duration);cueList(project,item.row.id).push(c);selected={row:item.row.id,id:c.id};changed();renderInspector();};
  $('remove').onclick=()=>{const item=currentSelection();if(!item)return;checkpoint();const list=cueList(project,item.row.id);list.splice(list.indexOf(item.cue),1);selected=null;changed();renderInspector();};
  $('projectName').onfocus=()=>checkpoint();$('projectName').oninput=e=>{project.name=e.target.value.trim().slice(0,100)||'LASERMAN';changed(false);};
  $('bpm').onchange=e=>{if(!e.target.checkValidity())return;checkpoint();project.bpm=Number(e.target.value);changed();renderInspector();};
  for(const [id,key]of [['stageWidth','width'],['stageDepth','depth'],['rigHeight','rigHeight']])$(id).onchange=e=>{if(!e.target.checkValidity())return;checkpoint();project.stage[key]=Number(e.target.value);document.querySelector('.stage-overlay small').textContent='ESCALA ESTIMADA · '+project.stage.rigHeight.toFixed(1)+' m';changed(false);};
  document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{scene.view(b.dataset.view);document.querySelectorAll('[data-view]').forEach(x=>x.classList.toggle('active',x===b));});
  $('save').onclick=async()=>{try{await flushShow();$('saveStatus').textContent='Guardado en este navegador';toast('Show guardado.');}catch(e){toast(e.message);}};$('load').onclick=()=>$('projectFile').click();
  $('projectFile').onchange=async e=>{
    try{
      const file=e.target.files[0];if(!file)return;
      let raw;
      if(file.name.toLowerCase().endsWith('.zip')){
        if(file.size>300e6)throw Error('El paquete supera 300 MB.');
        const response=await fetch('/api/import-show',{method:'POST',headers:{'Content-Type':'application/octet-stream'},body:file});
        const result=await response.json();if(!response.ok)throw Error(result.error);raw=result.project;
      }else{
        if(file.size>20e6)throw Error('El proyecto supera 20 MB.');raw=JSON.parse(await file.text());
      }
      const p=validateProject(raw);await stop();checkpoint();await adoptProject(p);
    }catch(err){toast(err.message);}e.target.value='';
  };
  $('audioPick').onclick=()=>$('audioFile').click();$('audioFile').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{if(f.size>40e6)throw Error('El audio supera 40 MB.');await stop();const r=await fetch('/api/audio?name='+encodeURIComponent(f.name),{method:'POST',headers:{'Content-Type':'application/octet-stream'},body:f});const d=await r.json();if(!r.ok)throw Error(d.error);checkpoint();project.audio={url:d.url,name:f.name,offset:0};persist();await setAudio(d.url,f.name);}catch(err){toast(err.message);}e.target.value='';};
  $('resetDemo').textContent='Crear respaldo de esta edición';
  $('resetDemo').onclick=async()=>{try{await api('project/archive',{project});toast('Respaldo guardado.');}catch(e){toast(e.message);}};
  const versionsButton=document.createElement('button');versionsButton.id='previousProjects';versionsButton.textContent='Proyectos anteriores';$('resetDemo').after(versionsButton);
  versionsButton.onclick=async()=>{
    try{
      const {versions}=await api('project/versions');let dialog=$('versionsDialog');
      if(!dialog){dialog=document.createElement('dialog');dialog.id='versionsDialog';document.body.append(dialog);}dialog.replaceChildren();
      const heading=document.createElement('h2');heading.textContent='Proyectos anteriores';dialog.append(heading);
      for(const version of versions){const button=document.createElement('button');button.className='project-version';button.textContent=version.name+' · '+version.saved;
        button.onclick=async()=>{try{const data=await api('project/version?id='+encodeURIComponent(version.id));const next=validateProject(data.project);await stop();checkpoint();await adoptProject(next);dialog.close();}catch(e){toast(e.message);}};dialog.append(button);}
      if(!versions.length){const p=document.createElement('p');p.textContent='Todavía no hay versiones archivadas.';dialog.append(p);}
      const close=document.createElement('button');close.textContent='Cerrar';close.onclick=()=>dialog.close();dialog.append(close);dialog.showModal();
    }catch(e){toast(e.message);}
  };
  $('laserOnly').checked=true;$('laserOnly').disabled=true;
  $('hardware').onclick=async()=>{
    try{devices=(await api('devices')).devices;}catch(e){$('scanStatus').textContent=e.message;}
    patchEditor();$('outputMessage').textContent=outputs?'FB3 conectado · composición completa; haz apagado en pausa.':'FB3 sin conexión.';$('outputConsent').checked=true;$('outputDialog').showModal();
  };$('closeOutputs').onclick=()=>$('outputDialog').close();
  $('scan').onclick=async()=>{try{devices=(await api('devices')).devices;$('scanStatus').textContent=devices.length+' FB3 detectados.';patchEditor();}catch(e){$('scanStatus').textContent=e.message;}};
  $('enableOutputs').onclick=async()=>{try{await enableSharedOutput();$('outputMessage').textContent='FB3 conectado en todas las pestañas.';$('outputDialog').close();}catch(e){$('outputMessage').textContent=e.message;}};
  $('disableOutputs').onclick=emergencyStop;
  projectionEditor=mountProjectionEditor({getSettings:()=>({projection:project.projection,masterProjection:suiteSettings.projection,kpps:suiteSettings.kpps??15}),getName:()=>catalog.find(s=>s.id===activeShowId)?.label||project.name,isConnected:()=>outputs&&hardwareReady,
    pause:stop,cancelTest:cancelProjectionTest,
    startTest:async()=>{await stop();if(!outputs)await enableSharedOutput();const profile=projectionEditor.profile,p={...project,projection:profile.show},settings={...suiteSettings,projection:profile.master,kpps:profile.kpps};const frame=buildSharedFrame(p,time,false,settings,'orientation').frames[0].frame;const state=await api('outputs/test/start',{clientId,frame});projectionTestActive=Object.values(state.fb3||{}).some(s=>s.testActive);updateMode();return projectionTestActive;},
    saveSettings:async(projection,{scope,kpps})=>{if(scope==='master'){suiteSettings=await api('suite/settings',{projection,kpps});return;}if(localDirty)await flushShow();checkpoint();project.projection=projection;changed(false);await flushShow();}});
  const projectionButton=document.createElement('button');projectionButton.id='masterProjection';projectionButton.textContent='Encuadre y test';
  projectionButton.onclick=()=>projectionEditor.open().catch(e=>toast(e.message));$('hardware').before(projectionButton);
  $('connectFb3').onclick=()=>{if(outputs){$('hardware').click();}else enableSharedOutput().catch(e=>{toast(e.message);$('hardware').click();});};
  $('nextShow').onclick=()=>{const i=catalog.findIndex(s=>s.id===activeShowId);switchShow(catalog[(i+1)%catalog.length].id).catch(e=>toast(e.message));};
  $('toggleInspector').onclick=()=>document.body.classList.toggle('inspector-open');
  const remoteButton=document.createElement('button');remoteButton.id='remoteChanges';remoteButton.textContent='Aplicar comandos pendientes';remoteButton.hidden=true;
  remoteButton.title='Respalda tu edición local y carga los cambios recibidos por comandos';remoteButton.onclick=()=>{if(pendingRemote)applyRemote(pendingRemote,true);};document.querySelector('.suite-controls').prepend(remoteButton);
  $('trackRows').addEventListener('click',e=>{if(e.target.closest('.clip')&&matchMedia('(max-width:900px)').matches)document.body.classList.add('inspector-open');});
  $('help').onclick=()=>$('helpDialog').showModal();$('closeHelp').onclick=()=>$('helpDialog').close();
  $('shot').onclick=()=>scene.renderer.domElement.toBlob(b=>download(b,'LASERMAN-escenario.png'));
  $('export').onclick=()=>$('exportDialog').showModal();$('closeExport').onclick=()=>$('exportDialog').close();$('downloadProject').onclick=downloadProject;
  $('buildExport').onclick=async()=>{
    if(!$('exportFps').checkValidity())return;const fps=Number($('exportFps').value);$('buildExport').disabled=true;$('exportProgress').hidden=false;
    try{
      const {buildExport}=await import('./export.js?v=1.7.0-roof');await buildExport(project,fixture,scene.points,fps,(p,msg)=>{$('exportProgress').value=p;$('exportStatus').textContent=msg;});
      $('exportStatus').textContent='Paquete descargado con proyecto, ILDA, audio y video de referencia.';
    }catch(e){$('exportStatus').textContent=e.message;}finally{$('buildExport').disabled=false;}
  };
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'){window.dispatchEvent(new Event('laserman-cancel-gesture'));emergencyStop();timelineEditor.clearMarker();return;}
    const focused=document.activeElement;
    if(focused?.matches('textarea,select,input:not([type=checkbox]):not([type=range])')||document.querySelector('dialog[open]'))return;
    if(e.code==='Space'&&focused?.matches('input[type=checkbox],input[type=range]'))return;
    if(timelineEditor.key(e))return;
    if(e.code==='KeyK'&&!e.ctrlKey&&!e.metaKey){e.preventDefault();keyframeEditor.addAtHead();}else if(e.code==='Space'){e.preventDefault();setPlaying(!playing);}else if((e.ctrlKey||e.metaKey)&&e.key==='s'){e.preventDefault();$('save').click();}else if((e.ctrlKey||e.metaKey)&&e.key==='z'){e.preventDefault();$('undo').click();}else if(e.key==='Delete')$('remove').click();
  });
  function leave(){projectionTestActive=false;projectionEditor?.setActive(false);outputWorker?.postMessage({type:'stop'});if(outputs){navigator.sendBeacon('/api/outputs/release',new Blob([JSON.stringify({clientId})],{type:'application/json'}));outputs=false;updateMode();}}
  window.addEventListener('pagehide',leave);
  document.addEventListener('visibilitychange',()=>{if(document.hidden){leave();setPlaying(false);}});

}

function animate(now){
  if(playing){
    time=audio?audio.currentTime+(project.audio?.offset||0):anchorTime+(now-anchor)/1000*playbackSpeed;
    const end=playbackRange?.end??project.duration;
    if(time>=end||audio?.ended){if(playbackRange?.loop??$('loop').checked)seek(playbackRange?.start??0);else{time=end;stop();}}
  }
  if(now-lastPixel>16&&(time!==lastLedTime||lastLedRevision!==renderRevision)){
    ledBuffers=project.tracks.filter(t=>t.type==='suit').map(t=>led.render(project,t,time));lastPixel=now;lastLedTime=time;lastLedRevision=renderRevision;
  }
  if(ledBuffers.length===3)scene.update(project,time,ledBuffers,renderRevision);updateTime();outputFrame(now);
  referenceVideo?.update(time,playing,audio?.playbackRate||playbackSpeed);
  requestAnimationFrame(animate);
}
async function main(){
  const [data,fixtureData,settingsData]=await Promise.all([fetch('assets/show-catalog.json',{cache:'no-store'}).then(r=>r.json()),(await fetch('assets/jacket-patch.json')).json(),api('suite/settings')]);
  catalog=data.shows;fixture=fixtureData;suiteSettings=settingsData;
  outputWorker=new Worker(new URL('./output-worker.js?v=1.7.0-roof',import.meta.url),{type:'module'});
  outputWorker.onmessage=({data})=>{if(data.type==='test'){projectionTestActive=data.active;projectionEditor?.setActive(data.active);updateMode();}if(data.type==='error'){
    projectionTestActive=false;projectionEditor?.setActive(false);
    outputs=false;hardwareReady=false;updateMode();$('suiteOutputStatus').textContent=data.message;toast('Salida detenida: '+data.message);
    api('outputs/release',{clientId}).catch(()=>{});
  }};
  const query=new URLSearchParams(location.search).get('show');
  const requested=query||localStorage.getItem('lightman-suite-active-show')||data.defaultShow;
  activeShowId=catalog.some(x=>x.id===requested)?requested:data.defaultShow;
  showRepository=createShowRepository({request:api});
  project=validateProject(await showRepository.load(activeShowId));
  try{scene=createScene($('stage'),fixture);}catch(e){$('readiness').textContent='No se pudo iniciar WebGL.';throw e;}
  led=createLedEngine(fixture,scene.points);bind();renderShowTabs();syncProjectControls();
  scale=clamp(($('timelineScroll').clientWidth-35)/project.duration,.5,200);$('zoom').value=scale;
  renderTimeline();renderInspector();
  referenceVideo=mountReferenceVideo({seek,stop,setPlaying});
  document.title='LASERMAN SHOWS · '+catalog.find(x=>x.id===activeShowId).label;
  window.LASERMAN={get project(){return project;},get time(){return time;},get playing(){return playing;},get outputs(){return outputs;},get activeShowId(){return activeShowId;},
    get clock(){return {audio:(audio?.currentTime||0)+(project.audio?.offset||0),editor:time};},seek,stop:emergencyStop,scene,timeline:timelineEditor,get ledBuffers(){return ledBuffers;},switchShow};
  requestAnimationFrame(animate);
  await setAudio(project.audio?.url,project.audio?.name||'Audio');
  updateMode();
  setInterval(pollRemoteChanges,1000);
  const state=await api('outputs/status');
  if(state.enabled){$('suiteOutputStatus').textContent='FB3 controlado por otra pestaña del panel';}
  else if(suiteSettings.autoConnect){
    try{devices=(await api('devices')).devices;if(devices.includes(suiteSettings.device))await enableSharedOutput();else $('suiteOutputStatus').textContent='Conecta el FB3 guardado por USB';}
    catch(e){$('suiteOutputStatus').textContent=e.message;}
  }
}
main().catch(e=>{console.error(e);toast(e.message);$('readiness').textContent='Error al iniciar. '+e.message;});
