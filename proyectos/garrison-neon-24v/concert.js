/* LIGHTMAN · Motor musical adaptado de plano-a-conciert / viewer-template.html.
   profileAt, chorusHitAt, musicalCompositionAt, resetSongCue y reloj nativo.
   El inventario del caso se limita a las diez curvas de neón, sin añadir luminarias. */
(()=>{'use strict';
const $=id=>document.getElementById(id),V=window.garrisonViewer,T=THREE;
if(!V||!window.GARRISON_ARRANGEMENT)return;
const arrangement=window.GARRISON_ARRANGEMENT,audio=$('song-audio'),host=$('scene');
const state={mode:'concert',started:false,time:0,lastTime:0,loops:0,section:0,composition:'solid',hold:.5,fade:.055,flashes:true,visuals:true,palette:'electric'};
const profiles={intro:{light:.8},verse:{light:.94},build:{light:1},chorus:{light:1},bridge:{light:.7},outro:{light:.8}};
const order=['wave','gate','mirror','surge','strobe','split','comet','center','scatter','blocks','laser','glitch'];
const palettes={electric:{label:'Eléctrica',colors:['#0024ff','#00e5ff','#ffffff']},industrial:{label:'Industrial',colors:['#ff0000','#ffffff']}};
const effectNames={wave:'Barrido',gate:'Alternancia',mirror:'Espejo',surge:'Carga',strobe:'Estrobo',split:'Cruce',comet:'Recorrido',center:'Centro',scatter:'Cortes',blocks:'Bloques',laser:'Láser',glitch:'Glitch'};
let sections=arrangement.sections.map(s=>({...s}));
function sectionIndexAt(t){let i=sections.length-1;while(i>0&&t<sections[i].start)i--;return i;}
function sectionFade(kind){return kind==='chorus'?.08:1.6;}
function chorusHitAt(t){const s=sections[sectionIndexAt(t)],dt=t-s.start;if(s.kind!=='chorus'||dt<0||dt>=.65)return 0;return dt<.1?1:Math.pow(1-(dt-.1)/.55,2);}
function profileAt(t){const index=sectionIndexAt(t),section=sections[index],target=profiles[section.kind],old=profiles[sections[Math.max(0,index-1)].kind],u=T.MathUtils.clamp((t-section.start)/sectionFade(section.kind),0,1),blend=u*u*(3-2*u);return {index,section,light:T.MathUtils.lerp(old.light,target.light,blend)};}
function musicalCompositionAt(t){return order[Math.floor(Math.max(0,t)/state.hold)%order.length];}
function resetSongCue(t){state.time=Math.max(0,t);state.composition=musicalCompositionAt(state.time);state.section=sectionIndexAt(state.time);host.dataset.resetTime=state.time.toFixed(3);}
function audioDuration(){return Number.isFinite(audio.duration)&&audio.duration>0?audio.duration:arrangement.duration;}
function nativeClockBeforeRender(){
 const position=audio.currentTime||0;
 if(position>=audioDuration()){
  if(audio.loop&&!audio.paused){state.loops++;audio.currentTime=0;state.lastTime=0;resetSongCue(0);lastUI=-1;return;}
  if(!audio.paused)audio.pause();state.time=audioDuration();state.lastTime=audioDuration();return;
 }
 if(position+.5<state.lastTime&&!audio.seeking){state.loops++;resetSongCue(position);}
 state.lastTime=position;state.time=position;
}
function updateSongClock(){nativeClockBeforeRender();}
const cA=new T.Color(),cB=new T.Color(),cOut=new T.Color(),oldColor=new T.Color(),white=new T.Color('white');
function sample(id,index,t,target){
 const beat=Math.max(0,t-arrangement.beatOffset)*arrangement.bpm/60,u=index/9,cue=Math.floor(t/.5),pal=palettes[state.palette].colors;
 target.set(pal[(cue+Math.floor(index/2))%pal.length]);let power=1;
 if(id==='wave')power=.22+.78*(.5+.5*Math.sin(u*9-beat*4));
 if(id==='gate')power=(index+Math.floor(beat*2))%2?.18:1;
 if(id==='mirror')power=.2+.8*Math.pow(.5+.5*Math.cos(Math.abs(index-4.5)*1.8-beat*5),2);
 if(id==='surge')power=.55+.45*Math.sin(beat*4+index);
 if(id==='split')power=.24+.76*(.5+.5*Math.sin(beat*6+index*Math.PI));
 if(id==='comet'){const p=(beat*2.8)%10,d=Math.min(Math.abs(index-p),10-Math.abs(index-p));power=.12+.88*Math.exp(-d*d*.7);}
 if(id==='center')power=.2+.8*Math.pow(.5+.5*Math.cos(Math.abs(index-4.5)*1.7-beat*5),3);
 if(id==='scatter')power=.14+.86*(Math.sin(index*8.75+Math.floor(t*16)*4.2)>.4?1:0);
 if(id==='blocks')power=.22+.78*(.5+.5*Math.sin(beat*7+(index<5?0:Math.PI)));
 if(id==='laser')power=.22+.78*Math.pow(.5+.5*Math.sin(index*1.4-beat*8),5);
 if(id==='glitch')power=.18+.82*(Math.sin(Math.floor(t*12)*3.71+index*2.57)>.05?1:0);
 return power;
}
const reflection=new T.Group();V.scene.add(reflection);
const glowCanvas=document.createElement('canvas');glowCanvas.width=glowCanvas.height=64;
const gc=glowCanvas.getContext('2d'),gradient=gc.createRadialGradient(32,32,0,32,32,32);gradient.addColorStop(0,'rgba(255,255,255,0.45)');gradient.addColorStop(1,'rgba(255,255,255,0)');gc.fillStyle=gradient;gc.fillRect(0,0,64,64);
const glowTexture=new T.CanvasTexture(glowCanvas),reflections=[];
for(let i=0;i<10;i++){const mat=new T.MeshBasicMaterial({map:glowTexture,color:0x66aaff,transparent:true,opacity:0,depthWrite:false,blending:T.AdditiveBlending});const mesh=new T.Mesh(new T.PlaneGeometry(1,1),mat);mesh.rotation.x=-Math.PI/2;reflection.add(mesh);reflections.push(mesh);}
const colors=Array.from({length:10},()=>new T.Color()),powers=Array(10).fill(0);
let lastUI=-1;
function updateMusicalDynamics(t){
 const profile=profileAt(t),{section,index}=profile,cue=Math.floor(t/state.hold),cueStart=cue*state.hold,id=musicalCompositionAt(t),prior=musicalCompositionAt(Math.max(0,cueStart-.001)),dt=t-cueStart;
 const blend=T.MathUtils.smoothstep(Math.min(1,dt/state.fade),0,1),beat=Math.max(0,t-arrangement.beatOffset)*arrangement.bpm/60,kick=Math.exp(-(beat%1)*14);
 state.composition=id;state.section=index;
 const epos=t/arrangement.energyHop,ei=Math.floor(epos),energy=T.MathUtils.lerp(arrangement.energy[ei]||0,arrangement.energy[ei+1]||0,epos-ei);
 const burst=state.flashes&&(id==='strobe'||cue%7===4),flash=burst&&t%.125<.060?1:0;
 const on=state.started&&V.DATA.on,flashPalette=palettes[state.palette].colors,flashColor=flashPalette[cue%flashPalette.length];
 V.accents.traverse(o=>{const m=o.material;if(m?.userData.studioColor)m.color.copy(m.userData.studioColor).multiplyScalar(state.started?.10+.045*kick:1);});
 for(let i=0;i<10;i++){
  const np=sample(id,i,t,cOut),op=sample(prior,i,t,oldColor);colors[i].copy(cOut);
  let level=T.MathUtils.lerp(op,np,blend)*profile.light*(.45+.55*energy)*(.58+.42*kick);
  if(burst){level=flash?1:0;if(flash)colors[i].set(flashColor);}
  if(!state.flashes)level=.22+.78*level;
  powers[i]=on?Math.min(1,level)*V.DATA.brightness:0;
 }
 const U=V.neonVisuals;U.uMusicTime.value=t;U.uVisualMode.value=order.indexOf(id);U.uVisuals.value=state.visuals&&on?1:0;U.uSpeed.value=state.flashes?1.25:.7;U.uMusicalFlash.value=flash;
 V.neonMats().forEach(({mat,base,core,index:i})=>{const p=powers[i];mat.color.copy(colors[i]);if(core)mat.color.multiplyScalar(p>0?(flash?18*p:10.5*Math.pow(p,.70)):.001);else mat.opacity=base*p*(flash?3.2:2.0);});
 V.pointsOfLight().forEach((l,k)=>{const i=k*2;l.color.copy(colors[i]);l.intensity=powers[i]*(flash?26:10);});
 reflections.forEach((m,i)=>{m.position.set(0,.017,(i-4.5)*V.DATA.spacing);m.scale.set(V.DATA.width*.95,2.4,1);m.material.color.copy(colors[i]);m.material.opacity=Math.min(.85,powers[i]*(flash?.85:.42));});
 const stamp=Math.floor(t*30);if(lastUI!==stamp){lastUI=stamp;$('song-section-label').textContent=section.label+' / '+effectNames[id];host.dataset.showTime=t.toFixed(3);host.dataset.section=section.label;host.dataset.composition=id;host.dataset.cue=String(cue);host.dataset.cueInterval=String(state.hold);host.dataset.beat=beat.toFixed(3);host.dataset.flash=String(flash);host.dataset.palette=state.palette;host.dataset.flashColor=flash?flashColor:'';host.dataset.neonGain=flash?'18':'10.5';host.dataset.power=powers[0].toFixed(3);$('beat-dot').style.opacity=String(.35+.65*kick);$('audio-seek').value=String(t);$('audio-time').textContent=format(t);}
}
function format(t){return String(Math.floor(t/60)).padStart(2,'0')+':'+String(Math.floor(t%60)).padStart(2,'0');}
function ui(){const playing=!audio.paused; $('audio-play').textContent=playing?'Ⅱ Pausar':'▶ Reproducir';$('start-show').hidden=state.started||state.mode==='study';$('study-mode').setAttribute('aria-pressed',String(state.mode==='study'));$('study-mode').textContent=state.mode==='study'?'Volver al concierto':'Ver sin música';host.dataset.playing=String(playing);host.dataset.mode=state.mode;$('audio-state').textContent=state.mode==='study'?'Vista de estudio':playing?'Concierto en reproducción':state.started?'Show en pausa':'Listo para reproducir';}
async function play(){if(state.mode==='study')state.mode='concert';state.started=true;try{await audio.play();}catch{state.started=false;$('audio-state').textContent='Pulsa Reproducir para habilitar el audio.';}ui();}
function pause(){audio.pause();ui();}
function study(){audio.pause();state.mode='study';reflection.visible=false;V.updateLight();V.setAmbient();ui();}
function tick(){if(state.mode==='concert'){reflection.visible=true;updateSongClock();updateMusicalDynamics(state.time);}else{reflection.visible=false;}host.dataset.loopCount=String(state.loops);}
$('start-show').onclick=play;$('audio-play').onclick=()=>audio.paused?play():pause();
$('audio-restart').onclick=()=>{audio.pause();audio.currentTime=0;state.started=false;state.lastTime=0;state.mode='concert';resetSongCue(0);lastUI=-1;tick();ui();};
$('audio-seek').oninput=e=>{state.started=true;state.mode='concert';audio.currentTime=Number(e.target.value);state.lastTime=audio.currentTime;resetSongCue(audio.currentTime);lastUI=-1;tick();ui();};
$('audio-volume').oninput=e=>{audio.volume=Number(e.target.value)/100;$('volume-value').textContent=e.target.value+' %';};
$('audio-loop').onclick=()=>{audio.loop=!audio.loop;$('audio-loop').setAttribute('aria-pressed',String(audio.loop));};
$('study-mode').onclick=()=>{if(state.mode==='study'){state.mode='concert';resetSongCue(audio.currentTime);ui();tick();}else study();};
audio.volume=.65;audio.loop=true;audio.addEventListener('play',ui);audio.addEventListener('pause',ui);audio.addEventListener('seeking',()=>{resetSongCue(audio.currentTime);lastUI=-1;});audio.addEventListener('seeked',()=>{state.lastTime=audio.currentTime;resetSongCue(audio.currentTime);lastUI=-1;tick();});
audio.addEventListener('ended',()=>{pause();tick();});audio.addEventListener('error',()=>{$('audio-state').textContent='No se pudo cargar el audio local.';});
document.querySelectorAll('[data-color]').forEach(b=>b.addEventListener('click',study));$('reset').addEventListener('click',()=>{audio.pause();audio.currentTime=0;state.started=false;state.lastTime=0;state.mode='concert';resetSongCue(0);lastUI=-1;tick();ui();});
for(const key of Object.keys(palettes))$('palette-'+key).onclick=()=>{state.palette=key;for(const name of Object.keys(palettes))$('palette-'+name).setAttribute('aria-pressed',String(key===name));lastUI=-1;tick();};
$('flash-toggle').onclick=()=>{state.flashes=!state.flashes;lastUI=-1;$('flash-toggle').setAttribute('aria-pressed',String(state.flashes));};
$('visual-toggle').onclick=()=>{state.visuals=!state.visuals;lastUI=-1;$('visual-toggle').setAttribute('aria-pressed',String(state.visuals));};
$('audio-seek').max=String(arrangement.duration);
audio.addEventListener('durationchange',()=>{$('audio-seek').max=String(audioDuration());});
const chapters=$('chapters');sections.forEach((s,i)=>{const b=document.createElement('button');b.textContent=s.label;b.onclick=()=>{state.started=true;state.mode='concert';audio.currentTime=s.start;resetSongCue(s.start);state.lastTime=s.start;lastUI=-1;tick();ui();};chapters.appendChild(b);});
$('capture').onclick=()=>{
 let dialog=$('capture-preview');
 if(!dialog){dialog=document.createElement('dialog');dialog.id='capture-preview';dialog.innerHTML='<div class="capture-head"><span>GARRISON · CAPTURA 3D</span><button id="close-capture">Cerrar</button></div><img id="capture-image" alt="Vista capturada del pasaje de Garrison con las diez curvas de neón"><div class="capture-foot"><span id="capture-time"></span><a id="download-capture">Descargar PNG</a></div>';document.body.appendChild(dialog);$('close-capture').onclick=()=>dialog.close();}
 const url=V.renderer.domElement.toDataURL('image/png');$('capture-image').src=url;$('download-capture').href=url;$('download-capture').download='LIGHTMAN-Garrison-Neon-R04-'+state.time.toFixed(1)+'s.png';$('capture-time').textContent='R04 · '+format(state.time);dialog.showModal();
};
if(document.body.dataset.editor==='true'){
 $('private-editor').hidden=false;
 sections.forEach((s,i)=>{const label=document.createElement('label');label.textContent=s.label+' · segundos';const input=document.createElement('input');input.type='number';input.step='.01';input.value=s.start;input.disabled=i===0;input.onchange=()=>{const n=Number(input.value),min=i?sections[i-1].start+.1:0,max=(sections[i+1]?.start||arrangement.duration)-.1;if(!Number.isFinite(n)||n<min||n>max){input.value=s.start;return;}s.start=n;resetSongCue(audio.currentTime);};label.appendChild(input);if(s.kind==='chorus'){const audition=document.createElement('button');audition.textContent='Oír entrada';audition.setAttribute('aria-label','Oír entrada · '+s.label);audition.onclick=()=>{audio.currentTime=Math.max(0,s.start-2);state.lastTime=audio.currentTime;resetSongCue(audio.currentTime);play();};label.appendChild(audition);}$('section-cuts').appendChild(label);});
 $('export-settings').onclick=()=>{const blob=new Blob([JSON.stringify({revision:'R04',geometry:V.DATA,show:{palette:state.palette,hold:state.hold,flashes:state.flashes,visuals:state.visuals},arrangement:{...arrangement,sections}},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='Garrison-Neon-Editor-R04.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
}
window.garrisonConcert={state,tick,play,pause,study,resetSongCue,arrangement,profileAt,musicalCompositionAt,palettes};
window.songArrangement={data:arrangement,sample:profileAt,hitAt:chorusHitAt,compositionAt:musicalCompositionAt};window.showMusic={transport:state,tick:updateSongClock,pause,resume:play};
ui();tick();
})();
