import {CHANNELS,KEY_CURVES,parameterAt,curveAt,localTime,motionTime,animationClock,ensureAnimation,newKey,upsertKey,simplifyKeys} from './keyframes.js?v=1.8.0-urban';
import {SHAPE_NAMES,EFFECTS,clamp} from './engine.js?v=1.8.0-urban';

const SVG='http://www.w3.org/2000/svg';
const round=v=>Math.round(v*1e6)/1e6;
const fmt=v=>typeof v==='number'?Number(v.toFixed(3)).toString():v;
const baseFields=['size','rotation','rotationEnd','panX','panZ','opening','depthScale','projectionHeight','previewOrigin','effectSpeed','effectPhase','effectClock','beamCount','polygonSides','laserIntensity','speed','intensity','motionRate'];
function node(tag,text,attrs={}){const el=document.createElement(tag);if(text!==undefined)el.textContent=text;for(const [k,v] of Object.entries(attrs))el.setAttribute(k,v);return el;}
function svg(tag,attrs={}){const el=document.createElementNS(SVG,tag);for(const [k,v] of Object.entries(attrs))el.setAttribute(k,v);return el;}

export function mountKeyframeEditor(options){
  const sheet=node('link',undefined,{rel:'stylesheet',href:new URL('./keyframe-ui.css',import.meta.url).href});document.head.append(sheet);
  const panel=node('section',undefined,{id:'keyframePanel','aria-label':'Editor de fotogramas clave'});panel.hidden=true;document.querySelector('#properties').before(panel);
  const toolbar=node('button','◆ Movimiento',{id:'openKeyframes',title:'Fotogramas clave · K añade una clave en el cabezal'});document.querySelector('.edit-tools').prepend(toolbar);
  const banner=node('div',undefined,{id:'keyframePreviewStatus'}),bannerText=node('span');banner.hidden=true;
  const exit=node('button','■ Salir');exit.onclick=()=>options.stopPreview();banner.append(bannerText,exit);document.querySelector('.stage').append(banner);
  let opened=false,current=null,channel='size',selectedId=null,clipboard=null,fit=true;
  let loopStart=0,loopEnd=0,viewRate=1,lastCue=null,dragging=false,view=null,selectedKey=null,reuseOpen=false,suppressClickUntil=0;
  let library=[];try{const saved=JSON.parse(localStorage.getItem('laserman-movement-library-v1')||'[]');if(Array.isArray(saved))library=saved.filter(x=>x?.movement?.animation&&typeof x.name==='string').slice(0,12);}catch{}
  const ui={};
  const help=document.querySelector('#helpDialog'),helpText=node('p','Fotogramas clave: pulsa ◆ Movimiento, elige pista, efecto y parámetro. K añade una clave en el cabezal; puedes arrastrar puntos o escribir tiempo y valor. La velocidad global admite aceleraciones y pausas. Crear y reutilizar movimientos incluye plantillas, biblioteca y aplicación a los tres láseres. Bucle del movimiento permite repetir un tramo y verlo en cámara lenta.');
  if(help)help.querySelector('#closeHelp').before(helpText);
  const item=()=>{const s=options.getSelection();return s&&s.row.type!=='hand'?s:null;};
  const recording=cue=>cue.videoMotion&&cue.videoMotion.shape===cue.shape?cue.videoMotion:null;
  const spec=()=>CHANNELS[channel];
  const span=cue=>cue.sourceDuration||Math.max(cue.duration,recording(cue)?.frames.at(-1)?.[0]||0);
  const keys=()=>current?.cue.animation?.curves?.[channel]||[];
  const virtual=()=>!!spec().video&&!keys().length&&!!recording(current?.cue||{});
  const displayedKeys=()=>virtual()?recording(current.cue).frames.map((f,i)=>({id:'sample-'+i,at:f[0],value:f[spec().video],easing:'linear'})):keys();
  const curveTime=(cue,time)=>spec().video?animationClock(cue,time):channel==='motionRate'?localTime(cue,time):motionTime(cue,time);
  function currentValue(cue,time){
    if(spec().video){const frames=recording(cue)?.frames;if(!frames)return spec().fallback;
      const source=frames.map((f,i)=>({at:f[0],value:f[spec().video],id:'sample-'+i,easing:'linear'}));
      return curveAt(keys().length?keys():source,curveTime(cue,time),spec().fallback,spec());
    }
    return parameterAt(cue,channel,time);
  }
  function projectTime(at){
    const cue=current.cue;
    if(channel==='motionRate')return clamp(cue.start+at-(cue.sourceOffset||0),cue.start,cue.start+cue.duration-1e-6);
    let a=cue.start,b=cue.start+cue.duration;for(let i=0;i<35;i++){const m=(a+b)/2;if(curveTime(cue,m)<at)a=m;else b=m;}
    return Math.min(b,cue.start+cue.duration-1e-6);
  }
  function activate(){
    opened=true;
    if(!item()){
      const project=options.getProject(),track=project.tracks.find(t=>t.id===options.getRow().split('/')[0])||project.tracks[0];
      const enabled=track.cues.filter(c=>c.enabled!==false&&!c.layer).sort((a,b)=>a.start-b.start);
      const cue=enabled.find(c=>options.getTime()>=c.start&&options.getTime()<c.start+c.duration)||enabled.find(c=>c.start>=options.getTime())||enabled.at(-1);
      if(!cue){opened=false;options.notice('Añade un bloque para programar su movimiento.');return;}
      options.select(track.id,cue.id);
    }else options.inspect();
    if(item()){const cue=item().cue;options.zoom?.({start:cue.start,end:cue.start+cue.duration});options.scrub(cue.start);}
    document.querySelector('.inspector').scrollTop=0;
    if(matchMedia('(max-width:700px)').matches)document.body.classList.add('inspector-open');
  }
  function close(){opened=false;options.inspect();}
  toolbar.onclick=activate;
  function status(){
    const preview=options.getPreview();banner.hidden=!preview;
    if(preview)bannerText.textContent=`◆ Bucle de movimiento · ${preview.start.toFixed(2)}–${preview.end.toFixed(2)} s · ${preview.rate}×`;
    if(ui.stop)ui.stop.disabled=!preview;
  }
  function start(){
    if(!current)return;const invalid=panel.querySelector('input:invalid');if(invalid){invalid.reportValidity();return;}
    if(loopEnd-loopStart<.025){options.notice('El bucle necesita al menos 0,025 segundos.');return;}
    options.startPreview({start:current.cue.start+loopStart,end:current.cue.start+loopEnd,rate:viewRate,cueId:current.cue.id,kind:'keyframes'});
  }
  function commit(){options.commit();redraw();status();}
  function checkpoint(){options.checkpoint();}
  function control(label,id,{type='number',value,min,max,step='any',values}={}){
    const wrap=node('label',label),input=node(values?'select':'input',undefined,{id,'aria-label':label});
    if(values)for(const [v,text] of Object.entries(values))input.add(new Option(text,v));
    else{input.type=type;if(type==='number'){input.required=true;input.step=step;if(min!==undefined)input.min=min;if(max!==undefined)input.max=max;}}
    if(type==='checkbox')input.checked=!!value;else if(value!==undefined)input.value=value;
    wrap.append(input);return {wrap,input};
  }
  function action(text,id,handler){const b=node('button',text,{type:'button',id});b.onclick=handler;return b;}
  function selectKey(id,seek=true){
    selectedId=id;selectedKey=displayedKeys().find(k=>k.id===id)||null;redraw();
    if(seek&&selectedKey&&!options.getPreview())options.scrub(projectTime(selectedKey.at));
  }
  function addAtHead(){
    if(!opened)activate();if(!current)return;
    if(virtual()){importVideo();return;}
    const cue=current.cue,t=clamp(options.getTime(),cue.start,cue.start+cue.duration),at=clamp(curveTime(cue,t),0,span(cue));
    const value=currentValue(cue,t),baseline=currentValue(cue,cue.start-(cue.sourceOffset||0));
    checkpoint();if(!keys().length&&at>.0005)upsertKey(cue,channel,0,baseline);
    const key=upsertKey(cue,channel,at,value,ui.easing?.value||'linear');selectedId=key.id;commit();
  }
  function importVideo(){
    if(!current)return;const cue=current.cue,r=recording(cue);if(!r)return;
    checkpoint();const a=ensureAnimation(cue);a.enabled=true;
    for(const name of ['videoCenter','videoWidth','videoPhase'])if(!a.curves[name]?.length)a.curves[name]=r.frames.map(f=>newKey(f[0],f[CHANNELS[name].video]));
    if(!spec().video)channel='videoWidth';selectedId=null;options.commit();inspect();options.notice('Curvas del video listas para editar. La medición original se conserva.');
  }
  function changeValue(value,begin){
    if(!current||virtual())return;
    let key=keys().find(k=>k.id===selectedId);
    if(key&&key.value===value)return;
    begin();
    if(!key){
      const cue=current.cue,at=clamp(curveTime(cue,clamp(options.getTime(),cue.start,cue.start+cue.duration)),0,span(cue));
      const baseline=currentValue(cue,cue.start-(cue.sourceOffset||0));if(!keys().length&&at>.0005)upsertKey(cue,channel,0,baseline);
      key=upsertKey(cue,channel,at,value,ui.easing.value);selectedId=key.id;
    }else{key.value=value;ensureAnimation(current.cue).enabled=true;}
    commit();
  }
  function removeSelected(){
    const list=keys(),index=list.findIndex(k=>k.id===selectedId);if(index<0)return;
    checkpoint();list.splice(index,1);if(!list.length)delete current.cue.animation.curves[channel];selectedId=list[Math.max(0,index-1)]?.id||null;commit();
  }
  function pasteInto(cue,source){
    const factor=fit?span(cue)/source.duration:1,a={version:1,enabled:true,curves:{}};
    for(const [name,points] of Object.entries(source.animation.curves)){
      if(!CHANNELS[name]||![current.row.type,'both'].includes(CHANNELS[name].kind))continue;
      if(CHANNELS[name].video&&source.shape!==cue.shape)continue;
      a.curves[name]=points.map(k=>({...k,id:crypto.randomUUID(),at:round(clamp(k.at*factor,0,1200))})).filter((k,i,list)=>!i||k.at>list[i-1].at);
    }
    cue.animation=a;
    for(const [key,value] of Object.entries(source.base))cue[key]=value;
    if(current.row.type==='laser'){
      if(source.videoMotion&&source.shape===cue.shape){
        cue.videoMotion=structuredClone(source.videoMotion);cue.videoMotion.baseSize=cue.size;
        cue.videoMotion.frames=cue.videoMotion.frames.map(f=>[round(clamp(f[0]*factor,0,1200)),...f.slice(1)]).filter((f,i,list)=>!i||f[0]>list[i-1][0]);
        cue.videoMotionEnabled=source.videoMotionEnabled;
      }
    }
  }
  function capture(){const cue=current.cue;return {kind:current.row.type,shape:cue.shape,duration:span(cue),animation:structuredClone(cue.animation||{version:1,enabled:true,curves:{}}),
    base:Object.fromEntries(baseFields.filter(k=>cue[k]!==undefined).map(k=>[k,cue[k]])),videoMotion:structuredClone(recording(cue)),videoMotionEnabled:cue.videoMotionEnabled!==false};}
  function applyThree(){
    if(!current||current.row.type!=='laser')return;
    const source=capture(),targets=options.getProject().tracks.filter(t=>t.type==='laser').map(t=>t.cues.find(c=>Math.abs(c.start-current.cue.start)<.025)).filter(c=>c&&c.id!==current.cue.id);
    if(!targets.length){options.notice('No hay otros bloques alineados en los láseres.');return;}
    checkpoint();for(const cue of targets)pasteInto(cue,source);commit();options.notice('Movimiento aplicado a '+(targets.length+1)+' láseres.');
  }
  function preset(){
    const cue=current.cue,from=cue.sourceOffset||0,to=from+cue.duration,mode=ui.preset.value;
    const kind=current.row.type;let name,points;
    if(mode==='sweep'){name='panX';points=[[from,-.8],[to,.8]];}
    else if(mode==='open'){name='opening';points=[[from,.08],[(from+to)/2,1],[to,.08]];}
    else if(mode==='turn'){name='rotation';points=[[from,0],[to,360]];}
    else if(mode==='pause'){name='motionRate';points=[[from,0],[from+(to-from)*.35,2],[from+(to-from)*.70,0],[to,0]];}
    else{name=kind==='laser'?'laserIntensity':'intensity';points=[[from,0],[from+(to-from)*.15,100],[from+(to-from)*.8,100],[to,0]];}
    checkpoint();const a=ensureAnimation(cue);a.enabled=true;a.curves[name]=points.map(([at,value])=>newKey(at,value,mode==='turn'?'linear':'smooth'));
    channel=name;selectedId=null;options.commit();inspect();options.notice('Movimiento creado. Arrastra sus puntos para ajustarlo.');
  }
  async function saveMovementView(){
    const source=options.captureCanvas?.();if(!source||!current)return;
    const out=document.createElement('canvas');out.width=1100;out.height=490;const ctx=out.getContext('2d');
    const time=options.getTime();ctx.fillStyle='#09131d';ctx.fillRect(0,0,out.width,out.height);
    ctx.fillStyle='#7aead2';ctx.font='bold 20px Segoe UI';ctx.fillText('LIGHTMAN · FOTOGRAMAS CLAVE',24,34);
    ctx.fillStyle='#c5dce7';ctx.font='14px Segoe UI';ctx.fillText(current.row.track.name+' · '+current.cue.name,24,61,1040);
    const w=605,h=Math.min(350,w*source.height/source.width);ctx.drawImage(source,24,92+(350-h)/2,w,h);
    const clone=ui.graph.cloneNode(true);clone.setAttribute('xmlns',SVG);clone.setAttribute('width','432');clone.setAttribute('height','223');
    const background=svg('rect',{width:320,height:165,fill:'#0b1721'});clone.prepend(background);
    const style=svg('style');style.textContent='text{fill:#8baebe;font:8px Segoe UI,sans-serif}.kf-gridline{stroke:#29404e;stroke-width:.5}.kf-line{stroke:#65e6cd;stroke-width:1.8}.kf-point{fill:#1d4b43;stroke:#a5ffe7;stroke-width:1.2}.kf-point.selected{fill:#ddfff5}.kf-cursor{stroke:#ffd876;stroke-width:1;stroke-dasharray:3 2}';clone.prepend(style);
    const url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)],{type:'image/svg+xml'}));
    try{
      const image=new Image();await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=reject;image.src=url;});
      ctx.fillStyle='#7aead2';ctx.font='bold 15px Segoe UI';ctx.fillText(spec().label,650,115,425);ctx.drawImage(image,650,131,432,223);
      ctx.fillStyle='#94b2c1';ctx.font='13px Segoe UI';ctx.fillText(displayedKeys().length+' fotogramas · tiempo del show '+time.toFixed(3)+' s',650,383,425);
      ctx.fillText('Vista previa del editor · tres artistas · curvas editables',24,464,1040);
      const blob=await new Promise(resolve=>out.toBlob(resolve,'image/png'));if(!blob)throw Error('No se pudo crear la imagen.');
      const downloadUrl=URL.createObjectURL(blob),a=node('a',undefined,{href:downloadUrl,download:'LASERMAN-movimiento.png'});a.click();setTimeout(()=>URL.revokeObjectURL(downloadUrl),2000);
    }finally{URL.revokeObjectURL(url);}
  }
  function inspect(){
    current=item();panel.hidden=!opened||!current;document.body.classList.toggle('editing-keyframes',opened&&!!current);toolbar.classList.toggle('active',opened&&!!current);
    if(panel.hidden){status();return;}
    const {cue,row}=current;
    if(lastCue!==cue.id){lastCue=cue.id;loopStart=0;loopEnd=cue.duration;selectedId=null;}
    loopStart=clamp(loopStart,0,Math.max(0,cue.duration-.025));loopEnd=clamp(loopEnd,loopStart+.025,cue.duration);
    panel.replaceChildren();
    const heading=node('div','◆ FOTOGRAMAS CLAVE',{class:'kf-heading'}),x=action('×','closeKeyframes',close);x.setAttribute('aria-label','Cerrar fotogramas clave');heading.append(x);panel.append(heading);
    const chooser=control('Efecto que estás programando','kfCue',{values:Object.fromEntries(row.track.cues.filter(c=>c.enabled!==false).sort((a,b)=>a.start-b.start).map(c=>[c.id,`${c.start.toFixed(2)} s · ${c.name}`])),value:cue.id});
    chooser.input.onchange=()=>{const next=row.track.cues.find(c=>c.id===chooser.input.value);options.select(row.id,chooser.input.value);if(next){options.zoom?.({start:next.start,end:next.start+next.duration});options.scrub(next.start);}};
    const tracks=options.getProject().tracks,trackPicker=control('Pista para programar','kfTrack',{values:Object.fromEntries(tracks.map(t=>[t.id,t.name])),value:row.track.id});
    trackPicker.input.onchange=()=>{
      const nextTrack=tracks.find(t=>t.id===trackPicker.input.value),candidates=nextTrack.cues.filter(c=>c.enabled!==false&&!c.layer).sort((a,b)=>a.start-b.start);
      const next=candidates.find(c=>Math.abs(c.start-cue.start)<.025)||candidates.find(c=>options.getTime()>=c.start&&options.getTime()<c.start+c.duration)||candidates[0];
      if(!next){options.notice('Añade un bloque a esta pista.');trackPicker.input.value=row.track.id;return;}
      options.select(nextTrack.id,next.id);options.zoom?.({start:next.start,end:next.start+next.duration});options.scrub(next.start);
    };
    const targetRow=node('div',undefined,{class:'kf-target'});targetRow.append(trackPicker.wrap,chooser.wrap);panel.append(targetRow);
    const tip=node('p','Arrastra los puntos · K añade una clave · cambios guardados al instante.',{class:'kf-help'});panel.append(tip);
    const top=node('div',undefined,{class:'kf-grid'});
    const enabled=control('Usar fotogramas clave','kfEnabled',{type:'checkbox',value:cue.animation?.enabled!==false&&!!cue.animation});enabled.input.onchange=()=>{checkpoint();ensureAnimation(cue).enabled=enabled.input.checked;commit();};top.append(enabled.wrap);
    const props=action('Propiedades','kfProperties',close);top.append(props);panel.append(top);
    if(row.type==='laser'){
      const figure=control('Figura del movimiento','kfShape',{values:Object.fromEntries(Object.entries(SHAPE_NAMES).filter(([k])=>k!=='custom'||cue.customFrames)),value:cue.shape});
      figure.input.onchange=()=>{checkpoint();cue.shape=figure.input.value;cue.name=SHAPE_NAMES[cue.shape];options.commit();options.inspect();};ui.figure=figure.wrap;
    }
    const available=Object.fromEntries(Object.entries(CHANNELS).filter(([name,s])=>[row.type,'both'].includes(s.kind)&&(!s.video||recording(cue))&&(name!=='beamCount'||['beamCage','beamFan'].includes(cue.shape))).map(([k,s])=>[k,s.label+(cue.animation?.curves?.[k]?.length?' ◆':'')]));
    if(!Object.hasOwn(available,channel))channel=row.type==='laser'?'panX':'intensity';
    const selector=control('Movimiento a editar','kfChannel',{values:available,value:channel});selector.input.onchange=()=>{channel=selector.input.value;selectedId=null;inspect();};panel.append(selector.wrap);
    const chart=svg('svg',{viewBox:'0 0 320 165',id:'keyframeGraph',role:'group','aria-label':'Curva de movimiento. Arrastra los fotogramas.'});panel.append(chart);ui.graph=chart;
    const graphHint=node('div','',{id:'kfGraphHint',class:'kf-help'});panel.append(graphHint);ui.graphHint=graphHint;
    const scrub=control('Cabezal dentro del efecto · s','kfScrub',{type:'range',value:0,min:0,max:cue.duration,step:.001});scrub.input.min=0;scrub.input.max=cue.duration;scrub.input.step=.001;
    const clock=node('output','0.000 s',{id:'kfPlayheadTime'});scrub.wrap.append(clock);ui.clock=clock;ui.scrub=scrub.input;
    scrub.input.oninput=()=>{selectedId=null;options.scrub(cue.start+Number(scrub.input.value));redraw();};panel.append(scrub.wrap);
    const preciseSeek=control('Ir al segundo del efecto','kfSeek',{value:clamp(options.getTime()-cue.start,0,cue.duration),min:0,max:cue.duration});ui.seek=preciseSeek.input;
    preciseSeek.input.oninput=()=>{if(preciseSeek.input.value===''||!preciseSeek.input.checkValidity())return;selectedId=null;options.scrub(cue.start+Number(preciseSeek.input.value));redraw();};panel.append(preciseSeek.wrap);
    const keySelector=control('Fotograma seleccionado','kfKey',{values:{},value:''});keySelector.input.onchange=()=>selectKey(keySelector.input.value);ui.key=keySelector.input;panel.append(keySelector.wrap);
    const edit=node('div',undefined,{class:'kf-grid'});
    const at=control('Tiempo de la clave · s','kfKeyTime',{value:0,min:0,max:span(cue)}),value=control('Valor de la clave','kfValue',{value:spec().fallback,type:spec().type||'number',min:spec().min,max:spec().max,values:spec().values});
    ui.at=at.input;ui.value=value.input;edit.append(at.wrap,value.wrap);panel.append(edit);
    let valueCheckpoint=false;value.input.onfocus=()=>{valueCheckpoint=false;};value.input.onblur=()=>{valueCheckpoint=false;};
    const saveValue=()=>{if(value.input.value===''||!value.input.checkValidity())return;const v=spec().values||spec().type==='color'?value.input.value:Number(value.input.value);changeValue(spec().discrete&&!spec().values?Math.round(v):v,()=>{if(!valueCheckpoint){checkpoint();valueCheckpoint=true;}});};
    value.input.oninput=saveValue;value.input.onchange=saveValue;
    let timeCheckpoint=false;at.input.onfocus=()=>{timeCheckpoint=false;};at.input.onblur=()=>{timeCheckpoint=false;};
    at.input.oninput=()=>{
      if(!at.input.checkValidity()||at.input.value==='')return;const key=keys().find(k=>k.id===selectedId);if(!key)return;
      const target=round(Number(at.input.value));if(keys().some(k=>k!==key&&Math.abs(k.at-target)<.0005)){at.input.setCustomValidity('Ya hay una clave en ese instante.');return;}
      if(key.at===target)return;if(!timeCheckpoint){checkpoint();timeCheckpoint=true;}key.at=target;keys().sort((a,b)=>a.at-b.at);commit();
    };
    at.input.addEventListener('input',()=>at.input.setCustomValidity(''),{capture:true});
    const easing=control('Transición hacia la siguiente clave','kfEasing',{values:KEY_CURVES,value:'linear'});ui.easing=easing.input;
    easing.input.onchange=()=>{const key=keys().find(k=>k.id===selectedId);if(!key)return;checkpoint();key.easing=easing.input.value;commit();};panel.append(easing.wrap);
    const editActions=node('div',undefined,{class:'kf-actions'});
    const add=action('+ Clave en el cabezal','kfAdd',addAtHead),remove=action('Eliminar clave','kfRemove',removeSelected),duplicate=action('Duplicar clave','kfDuplicate',()=>{
      const key=keys().find(k=>k.id===selectedId);if(!key)return;
      let at=Math.min(span(cue),key.at+Math.min(.25,60/options.getProject().bpm));while(at<span(cue)&&keys().some(k=>Math.abs(k.at-at)<.001))at+=.025;
      at=round(at);if(keys().some(k=>Math.abs(k.at-at)<.001)){options.notice('No hay espacio para duplicar esa clave.');return;}
      checkpoint();const k=upsertKey(cue,channel,at,key.value,key.easing);selectedId=k.id;commit();
    });
    ui.add=add;ui.remove=remove;ui.duplicate=duplicate;editActions.append(add,remove,duplicate);panel.append(editActions);
    const loadVideo=action('Cargar curva medida del video','kfImportVideo',importVideo);loadVideo.hidden=!recording(cue);panel.append(loadVideo);
    if(recording(cue)&&['videoCenter','videoWidth','videoPhase'].every(k=>cue.animation?.curves[k]?.length)){loadVideo.textContent='Curvas del video cargadas';loadVideo.disabled=true;}
    if(cue.motion?.length){const loadMusic=action('Cargar movimiento musical','kfImportMusic',()=>{
      checkpoint();const a=ensureAnimation(cue);a.enabled=true;for(const name of ['panX','panZ','size','rotation'])a.curves[name]=cue.motion.map(k=>newKey(k.at,k[name]));
      cue.motionEnabled=false;selectedId=null;options.commit();inspect();
    });panel.append(loadMusic);}
    const quick=node('details',undefined,{class:'kf-details'});quick.open=reuseOpen;quick.ontoggle=()=>reuseOpen=quick.open;quick.append(node('summary','Crear y reutilizar movimientos'));
    quick.append(top);if(row.type==='laser')quick.append(ui.figure);
    const presets=row.type==='laser'?{sweep:'Barrido lateral',open:'Abrir y cerrar',turn:'Giro completo',pause:'Acelerar, frenar y pausar',fade:'Encender y apagar'}:{pause:'Acelerar, frenar y pausar',fade:'Encender y apagar'};
    const presetSelect=control('Plantilla de movimiento','kfPreset',{values:presets,value:Object.keys(presets)[0]});ui.preset=presetSelect.input;quick.append(presetSelect.wrap,action('Crear movimiento','kfCreate',preset));
    const copy=action('Copiar movimiento','kfCopy',()=>{clipboard=capture();ui.paste.disabled=false;options.notice('Movimiento copiado. Elige otro bloque y pulsa Pegar.');});
    const paste=action('Pegar movimiento','kfPaste',()=>{if(!clipboard||clipboard.kind!==row.type){options.notice('Copia un movimiento de este tipo de pista.');return;}checkpoint();pasteInto(cue,clipboard);selectedId=null;options.commit();inspect();});paste.disabled=!clipboard||clipboard.kind!==row.type;ui.paste=paste;
    const reuse=node('div',undefined,{class:'kf-grid'});reuse.append(copy,paste);quick.append(reuse);
    const fitting=control('Ajustar copia a la duración','kfFit',{type:'checkbox',value:fit});fitting.input.onchange=()=>fit=fitting.input.checked;quick.append(fitting.wrap);
    const all=action('Aplicar movimiento a los 3 láseres','kfApplyThree',applyThree);all.hidden=row.type!=='laser';quick.append(all);
    quick.append(action('Guardar vista del movimiento PNG','kfView',async()=>{try{await saveMovementView();}catch{options.notice('No se pudo guardar la vista del movimiento.');}}));
    if(!spec().type&&!spec().values&&!spec().discrete){
      const precision=control('Tolerancia para reducir puntos','kfTolerance',{value:Math.max(spec().step,.005),min:.000001,max:Math.max(1,spec().max-spec().min)});quick.append(precision.wrap);
      const simplify=action('Reducir puntos de la curva','kfSimplify',()=>{
        if(!precision.input.checkValidity()||keys().length<3)return;const reduced=simplifyKeys(keys(),Number(precision.input.value));
        if(reduced.length===keys().length){options.notice('La curva ya está dentro de esa tolerancia.');return;}
        const before=keys().length;checkpoint();cue.animation.curves[channel]=reduced;selectedId=null;commit();options.notice(before+' → '+reduced.length+' claves. Deshacer restaura la curva.');
      });simplify.disabled=keys().length<3;quick.append(simplify);
    }
    const saveName=control('Nombre para la biblioteca','kfLibraryName',{type:'text',value:cue.name});saveName.input.maxLength=80;quick.append(saveName.wrap);
    quick.append(action('Guardar movimiento en biblioteca','kfLibrarySave',()=>{
      const name=saveName.input.value.trim().slice(0,80)||'Movimiento';
      const next=[{id:crypto.randomUUID(),name,movement:capture()},...library.filter(x=>x.name!==name)].slice(0,12);
      try{localStorage.setItem('laserman-movement-library-v1',JSON.stringify(next));library=next;inspect();options.notice('Movimiento guardado en tu biblioteca.');}catch{options.notice('No hay espacio en la biblioteca. Guarda el proyecto como archivo.');}
    }));
    const saved=library.filter(x=>x.movement.kind===row.type),savedPicker=control('Movimientos guardados','kfLibrary',{values:Object.fromEntries(saved.map(x=>[x.id,x.name]))});quick.append(savedPicker.wrap);
    const savedApply=action('Usar movimiento guardado','kfLibraryApply',()=>{const entry=library.find(x=>x.id===savedPicker.input.value);if(!entry)return;checkpoint();pasteInto(cue,entry.movement);selectedId=null;options.commit();inspect();});savedApply.disabled=!saved.length;quick.append(savedApply);
    quick.append(action('Restablecer esta curva','kfResetCurve',()=>{if(!cue.animation?.curves[channel])return;checkpoint();delete cue.animation.curves[channel];selectedId=null;commit();}));panel.append(quick);
    const history=node('div',undefined,{class:'kf-grid'});ui.undo=action('↶ Deshacer','kfUndo',options.undo);ui.redo=action('Rehacer ↷','kfRedo',options.redo);history.append(ui.undo,ui.redo);selector.wrap.after(history);
    const preview=node('div',undefined,{class:'kf-preview'});preview.append(node('strong','PROBAR EN BUCLE'));
    const bounds=node('div',undefined,{class:'kf-grid'}),startInput=control('Inicio del bucle · s','kfLoopStart',{value:loopStart,min:0,max:cue.duration}),endInput=control('Fin del bucle · s','kfLoopEnd',{value:loopEnd,min:0,max:cue.duration});
    function loopChange(){if(!startInput.input.checkValidity()||!endInput.input.checkValidity())return;loopStart=Number(startInput.input.value);loopEnd=Number(endInput.input.value);if(options.getPreview())start();}
    startInput.input.oninput=endInput.input.oninput=loopChange;startInput.input.onchange=endInput.input.onchange=loopChange;bounds.append(startInput.wrap,endInput.wrap);preview.append(bounds);
    const rate=control('Velocidad de previsualización','kfPreviewRate',{values:{1:'Normal · 1×',.5:'Cámara lenta · 0,5×',.25:'Cámara lenta · 0,25×'},value:viewRate});rate.input.onchange=()=>{viewRate=Number(rate.input.value);if(options.getPreview())start();};preview.append(rate.wrap);
    const buttons=node('div',undefined,{class:'kf-grid'});ui.stop=action('■ Detener bucle','kfStop',()=>options.stopPreview());buttons.append(action('▶ Bucle del movimiento','kfPreview',start),ui.stop);
    const previewDetails=node('details');previewDetails.append(node('summary','Tramo y cámara lenta'),bounds,rate.wrap);preview.append(buttons,previewDetails);targetRow.after(preview);
    const note=node('p','Velocidad global 0× pausa las curvas y el efecto. La cámara lenta solo cambia la vista previa. K añade una clave; arrastra los puntos para cambiar tiempo y valor.',{class:'kf-help'});panel.append(note);
    panel.onkeydown=e=>{if(e.key==='Enter'&&e.target.matches('input')){e.preventDefault();e.target.dispatchEvent(new Event('change',{bubbles:true}));}};
    redraw();tick(options.getTime());status();
    const active=options.getPreview();if(active?.cueId===cue.id&&(Math.abs(active.start-cue.start-loopStart)>.0001||Math.abs(active.end-cue.start-loopEnd)>.0001))start();
  }
  function redraw(){
    if(!current||panel.hidden)return;
    const cue=current.cue,list=displayedKeys(),s=spec();selectedKey=list.find(k=>k.id===selectedId)||null;
    const selectedValue=selectedKey?.value??currentValue(cue,clamp(options.getTime(),cue.start,cue.start+cue.duration));
    ui.key.replaceChildren(new Option('Valor en el cabezal',''));for(const k of list)ui.key.add(new Option(`${fmt(k.at)} s · ${s.values?.[k.value]||fmt(k.value)}`,k.id));ui.key.value=selectedId||'';
    if(document.activeElement!==ui.value)ui.value.value=typeof selectedValue==='number'?round(selectedValue):selectedValue;
    if(document.activeElement!==ui.at)ui.at.value=selectedKey?round(selectedKey.at):round(clamp(curveTime(cue,options.getTime()),0,span(cue)));
    if(document.activeElement!==ui.easing)ui.easing.value=selectedKey?.easing||'linear';
    ui.at.disabled=!selectedKey||virtual();ui.easing.disabled=!selectedKey||virtual()||!!s.discrete;ui.value.disabled=virtual();ui.remove.disabled=ui.duplicate.disabled=!selectedKey||virtual();
    ui.add.textContent=virtual()?'Cargar curva para editar':'+ Clave en el cabezal';
    ui.graphHint.textContent=(virtual()?'Medición original · carga la curva para mover sus puntos.':list.length+' claves · arrastra un punto para editar.')+(s.video?' Tiempo de la fuente del video.':'')+((cue.sourceOffset||0)>0?' El bloque conserva su recorte original.':'');
    const active=panel.querySelector('#kfEnabled');if(active)active.checked=!!cue.animation&&cue.animation.enabled;
    if(ui.undo)ui.undo.disabled=options.canUndo?!options.canUndo():false;if(ui.redo)ui.redo.disabled=options.canRedo?!options.canRedo():false;
    draw(list);tick(options.getTime());
  }
  function draw(list,fixedView){
    const s=spec(),chart=ui.graph;chart.replaceChildren();
    const numeric=!s.type&&!s.values;
    const values=numeric?list.map(k=>k.value).concat(currentValue(current.cue,options.getTime())):[];
    let min=values.length?Math.min(...values):0,max=values.length?Math.max(...values):1;
    const pad=Math.max(s.step||.01,(max-min)*.15,(s.max-s.min)*.015||.1);min=Math.max(s.min??0,min-pad);max=Math.min(s.max??1,max+pad);
    if(!numeric){min=0;max=1;}if(max<=min)max=min+1;
    view=fixedView||{min,max,end:Math.max(.025,span(current.cue)),left:38,right:308,top:14,bottom:137};
    const x=t=>view.left+t/view.end*(view.right-view.left),y=v=>view.bottom-(v-view.min)/(view.max-view.min)*(view.bottom-view.top);
    for(let i=0;i<=4;i++){
      const yy=view.top+(view.bottom-view.top)*i/4;
      chart.append(svg('line',{x1:view.left,x2:view.right,y1:yy,y2:yy,class:'kf-gridline'}));
      const text=svg('text',{x:33,y:yy+3,'text-anchor':'end'});text.textContent=numeric?fmt(view.max-(view.max-view.min)*i/4):'';chart.append(text);
      const tt=view.end*i/4,xx=x(tt);chart.append(svg('line',{x1:xx,x2:xx,y1:view.top,y2:view.bottom,class:'kf-gridline'}));
      const label=svg('text',{x:xx,y:157,'text-anchor':'middle'});label.textContent=fmt(tt)+'s';chart.append(label);
    }
    let d='';const sampleKeys=list.length?list:null;
    for(let i=0;i<=180;i++){
      const t=view.end*i/180,value=curveAt(sampleKeys,t,currentValue(current.cue,projectTime(t)),s);
      const yy=numeric?y(value):76;d+=(i?'L':'M')+x(t).toFixed(2)+','+yy.toFixed(2);
    }
    chart.append(svg('path',{d,class:'kf-line',fill:'none'}));
    for(const key of list){
      const point=svg('circle',{cx:x(key.at),cy:numeric?y(key.value):76,r:key.id===selectedId?5.5:3.5,class:'kf-point'+(key.id===selectedId?' selected':''),tabindex:'0',role:'button','aria-label':`Fotograma ${fmt(key.at)} segundos, valor ${fmt(key.value)}`,'data-key-id':key.id});
      point.onclick=e=>{e.stopPropagation();if(!dragging&&performance.now()>suppressClickUntil)selectKey(key.id);};
      point.onpointerdown=e=>dragPoint(e,key,point);
      point.onkeydown=e=>{
        if(['Delete','Backspace','ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();e.stopPropagation();selectedId=key.id;
          if(e.key==='Delete'||e.key==='Backspace')removeSelected();else{const index=list.indexOf(key),next=list[clamp(index+(e.key==='ArrowLeft'?-1:1),0,list.length-1)];selectKey(next.id);}}
        if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();selectKey(key.id);}
      };chart.append(point);
    }
    const cursor=svg('line',{id:'kfGraphCursor',x1:view.left,x2:view.left,y1:view.top,y2:view.bottom,class:'kf-cursor'});chart.append(cursor);ui.cursor=cursor;
    chart.onclick=e=>{
      if(e.target.closest('.kf-point')||dragging||performance.now()<suppressClickUntil)return;const rect=chart.getBoundingClientRect(),px=(e.clientX-rect.left)/rect.width*320;
      const at=clamp((px-view.left)/(view.right-view.left)*view.end,0,view.end);selectedId=null;options.scrub(projectTime(at));redraw();
    };
    chart.ondblclick=e=>{
      if(virtual()||e.target.closest('.kf-point'))return;const rect=chart.getBoundingClientRect(),px=(e.clientX-rect.left)/rect.width*320,py=(e.clientY-rect.top)/rect.height*165;
      const at=round(clamp((px-view.left)/(view.right-view.left)*view.end,0,view.end));
      const value=numeric?clamp(view.max-(py-view.top)/(view.bottom-view.top)*(view.max-view.min),s.min,s.max):currentValue(current.cue,projectTime(at));
      checkpoint();const k=upsertKey(current.cue,channel,at,s.discrete?Math.round(value):round(value));selectedId=k.id;commit();
    };
  }
  function dragPoint(event,key,point){
    if(event.button!==0||virtual())return;event.preventDefault();event.stopPropagation();selectedId=key.id;
    const initial={at:key.at,value:key.value},frozen={...view},rect=ui.graph.getBoundingClientRect(),sx=event.clientX,sy=event.clientY;
    let moved=false;dragging=true;const cue=current.cue;
    const move=e=>{
      if(Math.abs(e.clientX-sx)+Math.abs(e.clientY-sy)>2)moved=true;if(!moved)return;
      const px=(e.clientX-rect.left)/rect.width*320,py=(e.clientY-rect.top)/rect.height*165;
      let at=clamp((px-frozen.left)/(frozen.right-frozen.left)*frozen.end,0,frozen.end);
      if(at<=curveTime(cue,cue.start+cue.duration))at=clamp(curveTime(cue,options.snap(projectTime(at),e)),0,frozen.end);
      if(!keys().some(k=>k!==key&&Math.abs(k.at-at)<.0005))key.at=round(at);
      if(!spec().type&&!spec().values){let v=clamp(frozen.max-(py-frozen.top)/(frozen.bottom-frozen.top)*(frozen.max-frozen.min),spec().min,spec().max);key.value=spec().discrete?Math.round(v):round(v);}
      keys().sort((a,b)=>a.at-b.at);options.invalidate();draw(keys(),frozen);tick(options.getTime());
      ui.at.value=key.at;ui.value.value=key.value;
    };
    const finish=e=>{
      window.removeEventListener('pointermove',move,true);window.removeEventListener('pointerup',finish,true);window.removeEventListener('pointercancel',cancel,true);window.removeEventListener('blur',cancel);window.removeEventListener('laserman-cancel-gesture',cancel);
      const final={at:key.at,value:key.value};Object.assign(key,initial);keys().sort((a,b)=>a.at-b.at);
      if(e.type==='pointerup'&&moved){checkpoint();Object.assign(key,final);keys().sort((a,b)=>a.at-b.at);ensureAnimation(cue).enabled=true;options.commit();}
      if(moved)suppressClickUntil=performance.now()+150;dragging=false;redraw();
    };
    const cancel=e=>finish(e);
    window.addEventListener('pointermove',move,true);window.addEventListener('pointerup',finish,{once:true,capture:true});window.addEventListener('pointercancel',cancel,{once:true,capture:true});window.addEventListener('blur',cancel,{once:true});window.addEventListener('laserman-cancel-gesture',cancel,{once:true});
  }
  function tick(time){
    if(panel.hidden||!current||!view)return;
    const local=clamp(time-current.cue.start,0,current.cue.duration),at=clamp(curveTime(current.cue,time),0,view.end);
    if(ui.scrub&&document.activeElement!==ui.scrub)ui.scrub.value=local;
    if(ui.seek&&document.activeElement!==ui.seek)ui.seek.value=round(local);
    ui.clock.textContent=local.toFixed(3)+' s';
    const x=view.left+at/view.end*(view.right-view.left);ui.cursor?.setAttribute('x1',x);ui.cursor?.setAttribute('x2',x);
    if(!selectedId&&!dragging){
      if(document.activeElement!==ui.value)ui.value.value=fmt(currentValue(current.cue,clamp(time,current.cue.start,current.cue.start+current.cue.duration)));
      if(document.activeElement!==ui.at)ui.at.value=round(at);
    }
  }
  return {open:activate,close,inspect,tick,status,addAtHead,isOpen:()=>opened};
}
