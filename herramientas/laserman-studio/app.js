import {resolveAudioUrl} from './web-platform.js';
import {demoProject,validateProject,activeCue,trackEnabled,laserFrame,timelineRows,cueList,newCue,clamp,SHAPE_NAMES,EFFECTS,SECTIONS} from './engine.js';
import {createScene} from './scene.js';
import {createLedEngine} from './led-engine.js';
import {encodeFB3Frame} from './fb3-wire.js';
import {validateProject as validateLaserProject} from './laser.js';
import {mountTimelineEditor,commitFocusedField} from './timeline-ui.js';
import {replaceWindow} from './timeline-model.js';

const $=id=>document.getElementById(id);
let project,scene,led,fixture,time=0,playing=false,anchor=0,anchorTime=0,audio=null,audioReady=false,history=[],selected=null,selectedRow='laser-1';
let scale=5,expanded=new Set(),saveTimer,toastTimer,wave=[],lastPixel=0,ledBuffers=[],outputs=false,posting=false,lastPost=0,devices=[];
let timelineEditor=null,future=[],playbackRange=null,renderRevision=0,lastLedRevision=-1,lastLedTime=-1;
let waveDuration=180,audioGeneration=0,audioRequest=null,musicAnalysis=null;
let inspectorKey=null;
const api=async(path,body)=>{
  const r=await fetch('/api/'+path,body===undefined?{cache:'no-store'}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const d=await r.json();if(!r.ok)throw Error(d.error||'No se pudo completar la operación.');return d;
};
function toast(text){$('toast').textContent=text;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),5500);}
function seconds(t){const m=Math.floor(t/60),s=Math.floor(t%60),ms=Math.floor((t%1)*1000);return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${String(ms).padStart(3,'0')}`;}
function checkpoint(){
  history.push(JSON.stringify(project));future=[];
  while(history.length>1&&(history.length>60||history.reduce((n,s)=>n+s.length,0)>12_000_000))history.shift();
  $('undo').disabled=false;if($('redoEdit'))$('redoEdit').disabled=true;
}
function persist(){
  try{localStorage.setItem('lightman-laserman-project-v1',JSON.stringify(project));$('saveStatus').textContent='Guardado en este navegador';}catch{toast('El almacenamiento del navegador está lleno. Guarda el proyecto como archivo.');}
  clearTimeout(saveTimer);saveTimer=setTimeout(()=>api('project',{project}).then(()=>$('saveStatus').textContent='Guardado en este navegador').catch(e=>toast(e.message)),650);
}
function changed(render=true){renderRevision++;persist();if(render)renderTimeline();}
function syncProjectControls(){
  $('stageWidth').value=project.stage.width;$('stageDepth').value=project.stage.depth;$('rigHeight').value=project.stage.rigHeight;$('bpm').value=project.bpm;
  document.querySelector('.stage-overlay small').textContent='JACKETS / PORTION X · '+project.stage.rigHeight.toFixed(1)+' m';
}
function adoptProject(next){
  project=validateProject(next);selected=null;selectedRow=project.tracks[0].id;expanded=new Set();playbackRange=null;
  timelineEditor?.clearMarker();seek(0);syncProjectControls();changed();renderInspector();
  return setAudio(project.audio?.url||'assets/neon-protocol.wav',project.audio?.name||'Audio');
}
function undo(){
  if(!history.length)return;const beforeAudio=JSON.stringify(project.audio);future.push(JSON.stringify(project));project=validateProject(JSON.parse(history.pop()));
  syncProjectControls();if(beforeAudio!==JSON.stringify(project.audio)){stop();setAudio(project.audio?.url||'assets/neon-protocol.wav',project.audio?.name||'Audio');}
  selected=null;changed();renderInspector();$('undo').disabled=!history.length;
}
function redo(){
  if(!future.length)return;const beforeAudio=JSON.stringify(project.audio);history.push(JSON.stringify(project));project=validateProject(JSON.parse(future.pop()));
  syncProjectControls();if(beforeAudio!==JSON.stringify(project.audio)){stop();setAudio(project.audio?.url||'assets/neon-protocol.wav',project.audio?.name||'Audio');}
  selected=null;changed();renderInspector();$('undo').disabled=false;
}
function currentSelection(){if(!selected)return null;const row=timelineRows(project,expanded).find(r=>r.id===selected.row);if(!row)return null;const cue=cueList(project,selected.row).find(c=>c.id===selected.id);return cue?{row,cue}:null;}
function select(row,id){selectedRow=row;selected=id?{row,id}:null;if(id)timelineEditor?.clearMarker();renderInspector();document.querySelectorAll('.clip').forEach(c=>c.classList.toggle('selected',c.dataset.cue===id));document.querySelectorAll('.track-label').forEach(e=>e.classList.toggle('selected',e.dataset.row===row));}
function seek(t){time=clamp(t,0,project.duration);anchorTime=time;anchor=performance.now();if(audio&&audioReady){audio.currentTime=clamp(time-(project.audio?.offset||0),0,audio.duration||project.duration);if(playing)audio.play().catch(()=>{});}led?.reset();updateTime();}
async function setPlaying(value){
  playing=value;anchorTime=time;anchor=performance.now();$('play').textContent=value?'Ⅱ Pausar':'▶ Reproducir';
  if(audio){if(value){if(audioReady)audio.currentTime=clamp(time-(project.audio?.offset||0),0,audio.duration||project.duration);try{await audio.play();}catch(e){toast('Pulsa Reproducir para autorizar el audio.');}}else audio.pause();}
}
async function stop(){await setPlaying(false);playbackRange=null;if(outputs){try{await api('outputs/stop',{});}catch(e){toast(e.message);}outputs=false;updateMode();}seek(time);}
function updateMode(){$('modeBadge').textContent=outputs?'SALIDAS HABILITADAS':'SIMULADOR 3D';$('modeBadge').classList.toggle('live',outputs);$('readiness').textContent=outputs?'Patch habilitado · Reproducir transmite / Parar deshabilita':'Listo · salidas físicas apagadas';}
function updateTime(){$('timecode').textContent=seconds(time);$('playhead').style.left=(time*scale)+'px';$('sectionLabel').textContent=SECTIONS.filter(s=>s.time<=time).at(-1)?.name.toUpperCase()||'SHOW';}

function renderTimeline(){
  $('showHands').classList.toggle('active',expanded.size>0);
  const rows=timelineRows(project,expanded),width=Math.max(900,project.duration*scale);
  $('timelineContent').style.width=width+'px';$('projectName').value=project.name;$('bpm').value=project.bpm;
  $('totalTime').textContent='/ '+seconds(project.duration).slice(0,5);
  const ruler=$('ruler');ruler.replaceChildren();
  const interval=[.1,.25,.5,1,2,5,10,15,30,60,120].find(t=>t*scale>=55)||120;
  for(let t=0;t<=project.duration;t+=interval){const el=document.createElement('div');el.className='tick';el.style.left=t*scale+'px';el.textContent=seconds(t).slice(0,interval<1?8:5);ruler.append(el);}
  $('trackLabels').replaceChildren();$('trackRows').replaceChildren();
  const grid=4*(60/project.bpm)*scale;
  for(const row of rows){
    const label=document.createElement('div');label.className='track-label '+(row.type==='hand'?'hand':'')+(row.track.enabled===false?' muted':'')+(selectedRow===row.id?' selected':'');label.dataset.row=row.id;
    if(row.type==='suit'){
      const exp=document.createElement('button');exp.textContent=expanded.has(row.id)?'▾':'▸';exp.title='Mostrar las dos manos';exp.onclick=e=>{e.stopPropagation();expanded.has(row.id)?expanded.delete(row.id):expanded.add(row.id);renderTimeline();};label.append(exp);
    }else{const dot=document.createElement('i');dot.className='dot';dot.style.background=row.type==='hand'?'#597c8b':row.track.color;label.append(dot);}
    const title=document.createElement('span');title.textContent=row.label;label.append(title);
    if(row.type!=='hand')for(const [text,field] of [['M','enabled'],['S','solo']]){const b=document.createElement('button');b.textContent=text;b.classList.toggle('active',field==='enabled'?!row.track.enabled:!!row.track.solo);b.title=field==='enabled'?'Silenciar pista':'Escuchar solo esta pista';b.onclick=e=>{e.stopPropagation();checkpoint();row.track[field]=!row.track[field];changed();};label.append(b);}
    label.onclick=()=>select(row.id,null);$('trackLabels').append(label);
    const line=document.createElement('div');line.className='track-row '+(row.type==='hand'?'hand':'');line.dataset.row=row.id;line.style.width=width+'px';line.style.backgroundSize=grid+'px 100%';
    line.ondblclick=e=>{if(e.target!==line)return;const rect=line.getBoundingClientRect();addBlock(row.id,(e.clientX-rect.left)/scale);};
    line.onclick=e=>{if(e.target===line)select(row.id,null);};
    for(const cue of row.cues){
      const block=document.createElement('div');block.className='clip'+(cue.layer?' accent-layer':'')+(selected?.id===cue.id?' selected':'');block.dataset.cue=cue.id;block.dataset.row=row.id;block.style.setProperty('--clip',cue.color);block.style.left=cue.start*scale+'px';block.style.width=Math.max(4,cue.duration*scale)+'px';block.title=`${cue.name} · ${cue.start.toFixed(2)} s / ${cue.duration.toFixed(2)} s`;
      const text=document.createElement('span');text.textContent=cue.name;const resize=document.createElement('div');resize.className='resize';block.append(text,resize);
      block.onpointerdown=e=>beginDrag(e,row,cue,block,e.target===resize);block.onclick=e=>{e.stopPropagation();select(row.id,cue.id);};line.append(block);
    }
    $('trackRows').append(line);
  }
  drawWave();updateTime();$('trackSummary').textContent='3 proyectores · 3 jackets · 6 manos · '+project.tracks.reduce((n,t)=>n+t.cues.length+(t.hands? t.hands.left.length+t.hands.right.length:0),0)+' bloques';
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
  timelineEditor?.renderPalette();if(timelineEditor?.inspectMarker(panel))return;
  if(!item){$('selectionTitle').textContent=project.tracks.find(t=>t.id===selectedRow.split('/')[0])?.name||'Selecciona un bloque';$('selectionHint').textContent='Doble clic en el timeline o + Bloque para añadir.';return;}
  const {cue,row}=item;$('selectionTitle').textContent=row.label;$('selectionHint').textContent=row.type==='hand'?'Control binario · 0 = apagado / 255 = encendido':row.type==='laser'?'Animación geométrica · límite físico de 15 kpps':'Motor LDP · Jacket de 530 píxeles';
  function field(label,key,{type='number',min,max,step='any',values}={}){
    const wrap=document.createElement('label');wrap.textContent=label;const input=document.createElement(values?'select':'input');
    if(values)for(const [v,title]of Object.entries(values))input.add(new Option(title,v));else{input.type=type;if(min!==undefined)input.min=min;if(max!==undefined)input.max=max;input.step=step;}
    input.value=cue[key];input.dataset.property=key;
    input.onchange=()=>{
      if(!input.checkValidity()){input.reportValidity();input.value=cue[key];return;}
      const value=type==='number'&&!values?Number(input.value):input.value;
      if(value===cue[key])return;
      if((key==='start'&&value+cue.duration>project.duration)||(key==='duration'&&value+cue.start>project.duration)){toast('El bloque debe terminar dentro del show.');input.value=cue[key];return;}
      checkpoint();cue[key]=value;if(key==='effect')cue.name=EFFECTS[value];if(key==='shape')cue.name=SHAPE_NAMES[value];changed();
    };wrap.append(input);panel.append(wrap);return input;
  }
  field('Nombre','name',{type:'text'});field('Comienzo · segundos','start',{min:0,max:project.duration});field('Duración · segundos','duration',{min:.05,max:project.duration});field('Color','color',{type:'color'});
  if(row.type==='laser'){
    if(cue.motion?.length){
      const label=document.createElement('label'),toggle=document.createElement('input');toggle.type='checkbox';toggle.checked=cue.motionEnabled!==false;toggle.onchange=()=>{checkpoint();cue.motionEnabled=toggle.checked;changed();};label.append(toggle,document.createTextNode('Movimiento sincronizado con la música'));panel.append(label);
      if(cue.motionStrength===undefined)cue.motionStrength=1;
      field('Fuerza del movimiento musical','motionStrength',{min:0,max:1,step:.05});
    }
    const shapes=Object.fromEntries(Object.entries(SHAPE_NAMES).filter(([key])=>key!=='custom'||cue.customFrames));
    field('Figura','shape',{values:shapes});field('Tamaño','size',{min:.05,max:1,step:.01});field('Rotación inicial · grados','rotation',{min:-720,max:720,step:1});field('Rotación final · grados','rotationEnd',{min:-720,max:720,step:1});field('Transición de figura','transition',{values:{cut:'Corte',morph:'Transformar geometría'}});field('Centro horizontal · metros','panX',{min:-3,max:3,step:.05});field('Centro en profundidad · metros','panZ',{min:-3,max:3,step:.05});
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
        if(JSON.stringify(candidate).length>4_500_000)throw Error('El proyecto completo supera el tamaño permitido.');
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
  const generation=++audioGeneration;audioRequest?.abort();audioRequest=new AbortController();
  if(audio){audio.pause();audio.removeAttribute('src');audio.load();}audioReady=false;musicAnalysis=null;
  const playableUrl=await resolveAudioUrl(url);if(generation!==audioGeneration)return;const nextAudio=new Audio(playableUrl);audio=nextAudio;audio.preload='auto';audio.volume=.68;
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
      try{const analysis=await(await fetch('assets/neon-analysis.json',{signal:audioRequest.signal})).json();if(generation===audioGeneration&&analysis.audioSha256===digest)musicAnalysis=analysis;}catch{}
    }
    if(generation===audioGeneration){if($('showMusicAccents'))$('showMusicAccents').disabled=!musicAnalysis;drawWave();}
  }catch(e){if(generation===audioGeneration&&e.name!=='AbortError'){wave=[];drawWave();}}
  finally{if(ctx&&ctx.state!=='closed')await ctx.close();}
}
function drawWave(){
  const c=$('waveform'),w=Math.min(16384,Math.max(900,Math.ceil(project.duration*scale)));c.width=w;const x=c.getContext('2d');x.clearRect(0,0,w,42);x.fillStyle='#2c8c8a';
  for(let i=0;i<w;i++){const at=i/w*project.duration-(project.audio?.offset||0),sample=Math.floor(at/waveDuration*wave.length);const v=sample>=0&&sample<wave.length?wave[sample]:0;x.fillRect(i,21-v*17,1,Math.max(1,v*34));}
  if(musicAnalysis&&$('showMusicAccents')?.checked){
    for(const event of musicAnalysis.events){
      if(!['kick','snare','lead'].includes(event.kind))continue;
      const at=(event.at+(project.audio?.offset||0))/project.duration*w;
      x.fillStyle=event.kind==='kick'?'#d5a65b':event.kind==='snare'?'#bc8be7':'#68bfea';
      x.fillRect(at,event.kind==='lead'?2:32,Math.max(1,w/project.duration*.012),event.kind==='lead'?5:8);
    }
  }
  for(const s of SECTIONS){x.fillStyle='#c4dded';x.font='8px sans-serif';x.fillText(s.name.toUpperCase(),s.time/project.duration*w+4,10);}
}
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
function downloadProject(){download(new Blob([JSON.stringify(project,null,2)],{type:'application/json'}),project.name.replace(/[^a-z0-9_-]/gi,'_')+'.laserman.json');}

function patchEditor(){
  const target=$('patchEditor');target.replaceChildren();
  for(const track of project.tracks){
    const block=document.createElement('div');block.className='patch';const title=document.createElement('strong');title.textContent=track.name;block.append(title);
    if(track.type==='laser'){
      const select=document.createElement('select');select.add(new Option('Sin asignar · simulación',''));
      for(const [i,p]of devices.entries())select.add(new Option('FB3 USB '+(i+1)+' · '+p.slice(-45),p));
      select.value=track.patch.device;select.onchange=()=>{checkpoint();track.patch.device=select.value;persist();};block.append(select);
    }else{
      const fields=[['Destino Art-Net · IP','ip','text'],['Universo LED inicial','universe','number'],['Universo de manos','handUniverse','number'],['Canal mano izquierda','handLeft','number'],['Canal mano derecha','handRight','number']];
      const row=document.createElement('div');row.className='fieldrow';
      for(const [name,key,type]of fields){const label=document.createElement('label');label.textContent=name;const input=document.createElement('input');input.type=type;input.value=track.patch[key]??'';if(type==='number'){input.min=key.startsWith('hand')&&key!=='handUniverse'?1:0;input.max=key.startsWith('hand')&&key!=='handUniverse'?512:32767;input.step=1;}input.onchange=()=>{if(!input.checkValidity())return;checkpoint();track.patch[key]=type==='number'?Number(input.value):input.value.trim();persist();};label.append(input);row.append(label);}block.append(row);
    }
    target.append(block);
  }
}
async function outputFrame(now){
  if(!outputs||posting||now-lastPost<50)return;posting=true;lastPost=now;
  try{
    const frames=[];
    project.tracks.filter(t=>t.type==='laser').forEach(t=>{
      if(!t.patch.device)return;
      const drawing=playing&&trackEnabled(project,t)?laserFrame(t,time,project.stage.rigHeight):{paths:[]};
      const bytes=encodeFB3Frame(drawing,{kpps:15,scale:.1,intensity:.1,startBlankPoints:9});
      let raw='';for(const b of bytes)raw+=String.fromCharCode(b);frames.push({trackId:t.id,frame:btoa(raw)});
    });
    const suits=project.tracks.filter(t=>t.type==='suit').map((t,i)=>({trackId:t.id,pixels:playing?Array.from(ledBuffers[i]):Array(1590).fill(0),hands:['left','right'].map(h=>playing&&trackEnabled(project,t)&&!!activeCue(t.hands[h],time)?255:0)}));
    await api('outputs/frame',{frames,suits});
  }catch(e){outputs=false;updateMode();toast('Salidas detenidas. '+e.message);api('outputs/stop',{}).catch(()=>{});}finally{posting=false;}
}

function bind(){
  $('properties').onsubmit=e=>{e.preventDefault();commitFocusedField();};
  $('properties').addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.matches('input:not([type=checkbox]):not([type=color])')){e.preventDefault();commitFocusedField();}});
  timelineEditor=mountTimelineEditor({getProject:()=>project,getRow:()=>selectedRow,getScale:()=>scale,getTime:()=>time,
    checkpoint,commit:render=>changed(render!==false),inspect:renderInspector,notice:toast,seek,canRedo:()=>future.length>0,redo,redrawWave:drawWave,
    selectRow:row=>{selectedRow=row;selected=null;},didFill:(row,cue)=>{selectedRow=row;selected={row,id:cue.id};},
    playRange:span=>{playbackRange={...span};seek(span.start);setPlaying(true);},
    zoomTo:span=>{scale=clamp(($('timelineScroll').clientWidth-50)/(span.end-span.start),4,200);$('zoom').value=scale;renderTimeline();$('timelineScroll').scrollLeft=Math.max(0,span.start*scale-20);}
  });
  $('zoom').max=200;
  $('play').onclick=()=>{playbackRange=null;setPlaying(!playing);};$('stop').onclick=stop;$('rewind').onclick=()=>seek(0);
  $('ruler').onpointerdown=$('waveform').onpointerdown=e=>{const rect=e.currentTarget.getBoundingClientRect();seek((e.clientX-rect.left)/scale);};
  $('timelineScroll').onscroll=()=>{$('trackLabels').parentElement.scrollTop=$('timelineScroll').scrollTop;};
  const labels=document.querySelector('.labels');labels.addEventListener('wheel',e=>{e.preventDefault();if(e.shiftKey)$('timelineScroll').scrollLeft+=e.deltaY;else $('timelineScroll').scrollTop+=e.deltaY;},{passive:false});
  labels.onscroll=()=>{if(Math.abs($('timelineScroll').scrollTop-labels.scrollTop)>1)$('timelineScroll').scrollTop=labels.scrollTop;};
  $('zoom').oninput=e=>{scale=Number(e.target.value);renderTimeline();};
  $('showHands').onclick=()=>{expanded=expanded.size?new Set():new Set(project.tracks.filter(t=>t.type==='suit').map(t=>t.id));renderTimeline();$('showHands').classList.toggle('active',expanded.size>0);};
  $('addCue').onclick=()=>timelineEditor.span()?timelineEditor.fill():addBlock(selectedRow);$('undo').onclick=undo;
  $('duplicate').onclick=()=>{const item=currentSelection();if(!item)return;checkpoint();const c=structuredClone(item.cue);c.id=crypto.randomUUID();c.start=clamp(c.start+c.duration,0,project.duration-c.duration);cueList(project,item.row.id).push(c);selected={row:item.row.id,id:c.id};changed();renderInspector();};
  $('remove').onclick=()=>{const item=currentSelection();if(!item)return;checkpoint();const list=cueList(project,item.row.id);list.splice(list.indexOf(item.cue),1);selected=null;changed();renderInspector();};
  $('projectName').onchange=e=>{checkpoint();project.name=e.target.value.trim().slice(0,100)||'LASERMAN';changed(false);};
  $('bpm').onchange=e=>{if(!e.target.checkValidity())return;checkpoint();project.bpm=Number(e.target.value);changed();};
  for(const [id,key]of [['stageWidth','width'],['stageDepth','depth'],['rigHeight','rigHeight']])$(id).onchange=e=>{if(!e.target.checkValidity())return;checkpoint();project.stage[key]=Number(e.target.value);document.querySelector('.stage-overlay small').textContent='JACKETS / PORTION X · '+project.stage.rigHeight.toFixed(1)+' m';changed(false);};
  document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{scene.view(b.dataset.view);document.querySelectorAll('[data-view]').forEach(x=>x.classList.toggle('active',x===b));});
  $('save').onclick=()=>{persist();downloadProject();toast('Proyecto guardado.');};$('load').onclick=()=>$('projectFile').click();
  $('projectFile').onchange=async e=>{
    try{
      const file=e.target.files[0];if(!file)return;
      let raw;
      if(file.name.toLowerCase().endsWith('.zip')){
        if(file.size>100e6)throw Error('El paquete supera 100 MB.');
        const response=await fetch('/api/import-show',{method:'POST',headers:{'Content-Type':'application/octet-stream'},body:file});
        const result=await response.json();if(!response.ok)throw Error(result.error);raw=result.project;
      }else{
        if(file.size>5e6)throw Error('El proyecto supera 5 MB.');raw=JSON.parse(await file.text());
      }
      const p=validateProject(raw);await stop();checkpoint();await adoptProject(p);
    }catch(err){toast(err.message);}e.target.value='';
  };
  $('audioPick').onclick=()=>$('audioFile').click();$('audioFile').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{if(f.size>40e6)throw Error('El audio supera 40 MB.');await stop();const r=await fetch('/api/audio?name='+encodeURIComponent(f.name),{method:'POST',headers:{'Content-Type':'application/octet-stream'},body:f});const d=await r.json();if(!r.ok)throw Error(d.error);checkpoint();project.audio={url:d.url,name:f.name,offset:0};persist();await setAudio(d.url,f.name);}catch(err){toast(err.message);}e.target.value='';};
  $('resetDemo').textContent='Abrir show Director Cut';
  $('resetDemo').onclick=async()=>{
    try{
      const next=validateProject(await(await fetch('assets/director-show.json',{cache:'no-store'})).json());
      await stop();await api('project/archive',{project});checkpoint();await adoptProject(next);
      toast('Director Cut cargado. La versión anterior se conserva en Proyectos anteriores.');
    }catch(e){toast(e.message);}
  };
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
  $('hardware').onclick=()=>{patchEditor();$('outputConsent').checked=false;$('patchEditor').querySelectorAll('input,select').forEach(el=>el.disabled=outputs);$('outputDialog').showModal();};$('closeOutputs').onclick=()=>$('outputDialog').close();
  $('scan').onclick=async()=>{try{const d=await api('devices');devices=d.devices;$('scanStatus').textContent=devices.length+' FB3 detectados.';patchEditor();}catch(e){$('scanStatus').textContent=e.message;}};
  $('enableOutputs').onclick=async()=>{if(!$('outputConsent').checked){toast('Confirma las asignaciones antes de habilitar.');return;}try{await api('outputs/enable',{tracks:project.tracks,confirmed:true});outputs=true;updateMode();$('outputMessage').textContent='Habilitadas. Reproducir transmite el show; Parar deshabilita las salidas.';$('outputDialog').close();}catch(e){$('outputMessage').textContent=e.message;}};
  $('disableOutputs').onclick=async()=>{await stop();$('outputMessage').textContent='Salidas apagadas.';};
  $('help').onclick=()=>$('helpDialog').showModal();$('closeHelp').onclick=()=>$('helpDialog').close();
  $('shot').onclick=()=>scene.renderer.domElement.toBlob(b=>download(b,'LASERMAN-escenario.png'));
  $('export').onclick=()=>$('exportDialog').showModal();$('closeExport').onclick=()=>$('exportDialog').close();$('downloadProject').onclick=downloadProject;
  $('buildExport').onclick=async()=>{
    if(!$('exportFps').checkValidity())return;const fps=Number($('exportFps').value);$('buildExport').disabled=true;$('exportProgress').hidden=false;
    try{
      const {buildExport}=await import('./export.js');await buildExport(project,fixture,scene.points,fps,(p,msg)=>{$('exportProgress').value=p;$('exportStatus').textContent=msg;});
      $('exportStatus').textContent='Paquete descargado. Incluye proyecto, ILDA, LED, manos y audio.';
    }catch(e){$('exportStatus').textContent=e.message;}finally{$('buildExport').disabled=false;}
  };
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'){window.dispatchEvent(new Event('laserman-cancel-gesture'));stop();timelineEditor.clearMarker();return;}
    const focused=document.activeElement;
    if(focused?.matches('textarea,select,input:not([type=checkbox]):not([type=range])')||document.querySelector('dialog[open]'))return;
    if(e.code==='Space'&&focused?.matches('input[type=checkbox],input[type=range]'))return;
    if(timelineEditor.key(e))return;
    if(e.code==='Space'){e.preventDefault();setPlaying(!playing);}else if((e.ctrlKey||e.metaKey)&&e.key==='s'){e.preventDefault();$('save').click();}else if((e.ctrlKey||e.metaKey)&&e.key==='z'){e.preventDefault();$('undo').click();}else if(e.key==='Delete')$('remove').click();
  });
  function leave(){if(outputs){navigator.sendBeacon('/api/outputs/stop',new Blob(['{}'],{type:'application/json'}));outputs=false;updateMode();}}
  window.addEventListener('pagehide',leave);document.addEventListener('visibilitychange',()=>{if(document.hidden){leave();setPlaying(false);}});
}

function animate(now){
  if(playing){
    time=audioReady&&!audio.paused?audio.currentTime+(project.audio?.offset||0):anchorTime+(now-anchor)/1000;
    const end=playbackRange?.end??project.duration;
    if(time>=end){if($('loop').checked)seek(playbackRange?.start??0);else{time=end;stop();}}
  }
  if(now-lastPixel>16&&(time!==lastLedTime||lastLedRevision!==renderRevision)){
    ledBuffers=project.tracks.filter(t=>t.type==='suit').map(t=>led.render(project,t,time));lastPixel=now;lastLedTime=time;lastLedRevision=renderRevision;
  }
  if(ledBuffers.length===3)scene.update(project,time,ledBuffers,renderRevision);updateTime();outputFrame(now);
  requestAnimationFrame(animate);
}
async function main(){
  fixture=await (await fetch('assets/jacket-patch.json')).json();
  try{project=validateProject(JSON.parse(localStorage.getItem('lightman-laserman-project-v1')));}catch{
    try{project=validateProject((await api('project')).project);}catch{project=demoProject();}
  }
  if(!localStorage.getItem('lightman-laserman-director-installed')){
    if(project.edition!=='director-1.1'){
      const previous=structuredClone(project);
      const next=validateProject(await(await fetch('assets/director-show.json',{cache:'no-store'})).json());
      await api('project/archive',{project:previous});localStorage.setItem('lightman-laserman-before-director',JSON.stringify(previous));project=next;
    }
    localStorage.setItem('lightman-laserman-director-installed','1');
  }
  try{scene=createScene($('stage'),fixture);}catch(e){$('readiness').textContent='No se pudo iniciar WebGL. Abre el programa en Chrome o Edge con aceleración gráfica.';throw e;}
  led=createLedEngine(fixture,scene.points);bind();renderTimeline();renderInspector();
  syncProjectControls();
  $('readiness').textContent='Listo · salidas físicas apagadas';window.LASERMAN={get project(){return project;},get time(){return time;},get playing(){return playing;},get outputs(){return outputs;},
    get clock(){return {audio:(audio?.currentTime||0)+(project.audio?.offset||0),editor:time};},seek,stop,scene,timeline:timelineEditor,get ledBuffers(){return ledBuffers;}};
  await setAudio(project.audio?.url||'assets/neon-protocol.wav',project.audio?.name||'NEON PROTOCOL');persist();requestAnimationFrame(animate);
}
main().catch(e=>{console.error(e);toast(e.message);$('readiness').textContent='Error al iniciar. '+e.message;});
