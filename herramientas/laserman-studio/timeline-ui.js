import {SHAPE_NAMES,EFFECTS,clamp} from './engine.js';
import {markerSpan,rangeAt,snapTime,fillRange,makeMarker} from './timeline-model.js';

export function commitFocusedField(){
  const focused=document.activeElement;
  if(focused?.matches('[data-property],[data-marker-property]'))focused.dispatchEvent(new Event('change',{bubbles:true}));
}

export function mountTimelineEditor(options){
  const $=id=>document.getElementById(id);
  let markerId=null,rangeMode=false,quantumBeats=.25,templateId=null,dragging=false,libraryDragging=false;
  const bar=document.createElement('div');bar.className='edit-tools';
  bar.innerHTML='<button id="addMarker" title="M · marcador en el cabezal">+ Marcador</button><button id="rangeTool" title="R · arrastra sobre el timeline para marcar un rango">▱ Rango</button><span class="edit-separator"></span><label><input id="showMusicAccents" type="checkbox" checked disabled> Acentos</label><label>Precisión <select id="snapPrecision"><option value=".25">1/16</option><option value=".5">1/8</option><option value="1">1/4 · beat</option><option value="4">Compás</option></select></label><label><input id="fitRange" type="checkbox" checked> Encajar al rango</label><button id="fillMarker">Rellenar rango</button><button id="playMarker">▶ Rango</button><button id="zoomMarker">Ver rango</button><button id="zoomAll">Ver todo</button><span class="spacer"></span><button id="redoEdit" title="Ctrl+Shift+Z">Rehacer ↷</button><small id="editHint">Arrastra un efecto a una pista o a un marcador.</small>';
  $('timelineContent').insertAdjacentHTML('afterbegin','<div id="markerLane" aria-label="Marcadores musicales"></div>');
  document.querySelector('.labels').insertAdjacentHTML('afterbegin','<div class="marker-label">MARCADORES / RANGOS</div>');
  document.querySelector('.timeline-panel').insertBefore(bar,document.querySelector('.timeline'));
  const divider=document.createElement('div');divider.className='timeline-resize';divider.title='Arrastra para cambiar el tamaño del timeline';document.querySelector('.timeline-panel').prepend(divider);
  divider.onpointerdown=e=>{
    if(e.button!==0)return;e.preventDefault();const main=document.querySelector('main'),panel=document.querySelector('.timeline-panel');const y=e.clientY,height=panel.getBoundingClientRect().height,original=main.style.gridTemplateRows;
    const move=event=>{const size=clamp(height+y-event.clientY,260,Math.max(260,main.clientHeight-165));main.style.gridTemplateRows='minmax(165px,1fr) '+size+'px';};
    const end=()=>{window.removeEventListener('pointermove',move,true);window.removeEventListener('pointerup',end,true);window.removeEventListener('pointercancel',cancel,true);window.removeEventListener('laserman-cancel-gesture',cancel);window.removeEventListener('blur',cancel);};
    const cancel=()=>{main.style.gridTemplateRows=original;end();};
    window.addEventListener('pointermove',move,true);window.addEventListener('pointerup',end,{once:true,capture:true});window.addEventListener('pointercancel',cancel,{once:true,capture:true});window.addEventListener('laserman-cancel-gesture',cancel,{once:true});window.addEventListener('blur',cancel,{once:true});
  };
  const library=document.createElement('section');library.id='effectLibrary';
  document.querySelector('.inspector').insertBefore(library,$('properties'));

  const project=()=>options.getProject();
  const selectedMarker=()=>project().markers?.find(m=>m.id===markerId);
  const span=()=>markerSpan(project(),selectedMarker());
  const kindOf=row=>row.includes('/')?'hand':project().tracks.find(t=>t.id===row)?.type;
  const labelsFor=kind=>kind==='laser'?Object.fromEntries(Object.entries(SHAPE_NAMES).filter(([key])=>key!=='custom')):kind==='suit'?EFFECTS:{on:'Encendido'};
  function template(){
    const kind=kindOf(options.getRow()),labels=labelsFor(kind);
    const id=Object.hasOwn(labels,templateId)?templateId:Object.keys(labels)[0];
    return {kind,name:labels[id],...(kind==='laser'?{shape:id}:kind==='suit'?{effect:id}:{})};
  }
  function timeAt(event,element){return (event.clientX-element.getBoundingClientRect().left)/options.getScale();}
  function snap(t,event){
    const enabled=$('snap').checked&&!event?.altKey;
    return snapTime(t,{duration:project().duration,markers:project().markers,quantum:enabled?(60/project().bpm)*quantumBeats:0,tolerance:enabled?Math.min(7/options.getScale(),60/project().bpm/4):0});
  }
  function setMarker(id){markerId=id;options.selectRow(options.getRow());renderMarkers();options.inspect();}
  function commitMarker(marker){
    const existing=(project().markers||[]).find(m=>m.end==null&&marker.end==null&&Math.abs(m.start-marker.start)<.001);
    if(existing){setMarker(existing.id);return;}
    options.checkpoint();project().markers??=[];project().markers.push(marker);markerId=marker.id;options.commit();options.inspect();
  }
  function fill(row=options.getRow(),target=span(),chosen=template()){
    if(!target){options.notice('Crea o selecciona un marcador o rango.');return;}
    if(chosen.kind&&chosen.kind!==kindOf(row)){options.notice('Este efecto corresponde a otra clase de pista.');return;}
    try{
      options.checkpoint();const cue=fillRange(project(),row,target,chosen);options.didFill(row,cue);options.commit();options.inspect();
      options.notice('Rango rellenado: '+target.start.toFixed(3)+'–'+target.end.toFixed(3)+' s');
    }catch(error){options.notice(error.message);}
  }
  function renderPalette(){
    const kind=kindOf(options.getRow()),labels=labelsFor(kind),chosen=template();
    library.replaceChildren();const title=document.createElement('div');title.className='eyebrow';title.textContent=kind==='laser'?'FIGURAS · ARRASTRA PARA AÑADIR':kind==='suit'?'EFECTOS LED · ARRASTRA PARA AÑADIR':'MANO · ENCENDIDO / APAGADO';library.append(title);
    const cards=document.createElement('div');cards.className='effect-palette';
    for(const [id,name]of Object.entries(labels)){
      const b=document.createElement('button');b.type='button';b.textContent=name;b.dataset.effect=id;b.classList.toggle('active',name===chosen.name);b.setAttribute('aria-pressed',String(name===chosen.name));
      b.onclick=()=>{if(libraryDragging)return;templateId=id;renderPalette();};b.ondblclick=()=>{templateId=id;fill();};
      b.ondragstart=e=>e.preventDefault();
      b.onpointerdown=e=>dragLibrary(e,b,{kind,name,...(kind==='laser'?{shape:id}:kind==='suit'?{effect:id}:{})},id);
      cards.append(b);
    }
    library.append(cards);const hint=document.createElement('p');hint.className='hint';hint.textContent='Selecciona un efecto y pulsa Rellenar rango, o arrástralo sobre la pista. Alt evita el encaje al mover un bloque.';library.append(hint);
  }
  function dragLibrary(event,button,data,id){
    if(event.button!==0)return;event.preventDefault();commitFocusedField();
    const start={x:event.clientX,y:event.clientY};let ghost=null,target=null;
    function cleanup(){ghost?.remove();target?.classList.remove('drop-target');window.removeEventListener('pointermove',move,true);window.removeEventListener('pointercancel',cancel,true);window.removeEventListener('laserman-cancel-gesture',cancel);window.removeEventListener('blur',cancel);}
    function move(e){
      if(!ghost&&Math.hypot(e.clientX-start.x,e.clientY-start.y)<5)return;
      if(!ghost){libraryDragging=true;templateId=id;ghost=document.createElement('div');ghost.className='library-drag-preview';ghost.textContent=data.name;document.body.append(ghost);}
      ghost.style.left=e.clientX+'px';ghost.style.top=e.clientY+'px';
      const hit=document.elementFromPoint(e.clientX,e.clientY)?.closest('.track-row,.time-marker');
      if(hit!==target){target?.classList.remove('drop-target');target=hit;target?.classList.add('drop-target');}
      const scroll=$('timelineScroll'),rect=scroll.getBoundingClientRect();
      if(e.clientY>=rect.top&&e.clientY<=rect.bottom){if(e.clientX<rect.left+22)scroll.scrollLeft-=14;else if(e.clientX>rect.right-22)scroll.scrollLeft+=14;}
    }
    function end(e){
      window.removeEventListener('pointerup',end,true);const moved=!!ghost;
      if(moved){
        const hit=document.elementFromPoint(e.clientX,e.clientY)?.closest('.track-row,.time-marker');
        if(hit){
          const row=hit.dataset.row||options.getRow();
          const marker=hit.dataset.marker?project().markers.find(m=>m.id===hit.dataset.marker):null;
          const at=marker?marker.start:snap(timeAt(e,hit),e);
          const selected=span();
          const range=marker?markerSpan(project(),marker):$('fitRange').checked?(selected&&at>=selected.start&&at<selected.end?selected:rangeAt(project(),at)):null;
          cleanup();fill(row,range||{start:at,end:Math.min(project().duration,at+4*60/project().bpm)},data);
        }else{cleanup();options.notice('Suelta el efecto sobre una pista o un marcador.');}
      }else{cleanup();templateId=id;renderPalette();}
      setTimeout(()=>libraryDragging=false,0);
    }
    function cancel(){window.removeEventListener('pointerup',end,true);cleanup();libraryDragging=false;}
    // The inspector may replace its controls after a field blur. Keep the
    // gesture alive even when the original palette button is re-rendered.
    window.addEventListener('pointermove',move,true);window.addEventListener('pointerup',end,{once:true,capture:true});window.addEventListener('pointercancel',cancel,{once:true,capture:true});
    window.addEventListener('laserman-cancel-gesture',cancel,{once:true});window.addEventListener('blur',cancel,{once:true});
  }
  function renderMarkers(){
    const lane=$('markerLane'),scale=options.getScale();lane.replaceChildren();
    const ordered=[...(project().markers||[])].sort((a,b)=>a.start-b.start);
    for(const [index,m]of ordered.entries()){
      const b=document.createElement('button');b.type='button';b.className='time-marker '+(m.end==null?'point':'range')+(m.id===markerId?' selected':'');b.dataset.marker=m.id;
      b.style.left=m.start*scale+'px';b.style.setProperty('--marker',m.color);if(m.end!=null)b.style.width=Math.max(20,(m.end-m.start)*scale)+'px';
      else b.style.maxWidth=Math.max(20,Math.min(160,((ordered[index+1]?.start??project().duration)-m.start)*scale-3))+'px';
      b.textContent=m.name;b.title=m.name+' · '+m.start.toFixed(3)+(m.end==null?'':'–'+m.end.toFixed(3))+' s';b.onclick=()=>{if(!dragging)setMarker(m.id);};b.ondblclick=()=>options.seek(m.start);
      if(m.end!=null){for(const side of ['start','end']){const edge=document.createElement('i');edge.className='marker-edge '+side;edge.dataset.edge=side;b.append(edge);}}
      b.onpointerdown=e=>moveMarker(e,m,b,e.target.dataset.edge);
      enableDrop(b,()=>options.getRow(),()=>markerSpan(project(),m));lane.append(b);
    }
    const selected=span();document.querySelectorAll('.selected-range').forEach(e=>e.remove());
    if(selected){
      for(const row of document.querySelectorAll('.track-row')){
        const tint=document.createElement('div');tint.className='selected-range';tint.style.left=selected.start*scale+'px';tint.style.width=(selected.end-selected.start)*scale+'px';row.prepend(tint);
      }
    }
    for(const id of ['fillMarker','playMarker','zoomMarker'])$(id).disabled=!selected;
    $('rangeTool').classList.toggle('active',rangeMode);$('timelineContent').classList.toggle('range-mode',rangeMode);
    $('editHint').textContent=selected?selected.name+' · '+(selected.end-selected.start).toFixed(3)+' s':rangeMode?'Arrastra para delimitar un rango.':'M · marcador  /  R · rango  /  F · rellenar';
    $('redoEdit').disabled=!options.canRedo();
  }
  function beginRange(e,element){
    if(e.button!==0||(!(rangeMode||e.shiftKey)))return;
    if(e.target.closest('.time-marker'))return;
    const origin=element.getBoundingClientRect().left;
    e.preventDefault();e.stopPropagation();commitFocusedField();
    const start=snap((e.clientX-origin)/options.getScale(),e),x=e.clientX;let end=start;
    const ghost=document.createElement('div');ghost.className='range-ghost';$('timelineContent').append(ghost);
    const update=event=>{end=snap((event.clientX-origin)/options.getScale(),event);ghost.style.left=Math.min(start,end)*options.getScale()+'px';ghost.style.width=Math.abs(end-start)*options.getScale()+'px';};update(e);
    const finish=event=>{
      window.removeEventListener('pointermove',update,true);window.removeEventListener('pointerup',finish,true);window.removeEventListener('pointercancel',cancel,true);window.removeEventListener('laserman-cancel-gesture',cancel);window.removeEventListener('blur',cancel);ghost.remove();
      if(Math.abs(event.clientX-x)<4)commitMarker(makeMarker(project(),start));
      else commitMarker(makeMarker(project(),start,end,'Rango '+String((project().markers?.length||0)+1)));
      rangeMode=false;renderMarkers();
    };
    const cancel=()=>{window.removeEventListener('pointermove',update,true);window.removeEventListener('pointerup',finish,true);window.removeEventListener('pointercancel',cancel,true);window.removeEventListener('laserman-cancel-gesture',cancel);window.removeEventListener('blur',cancel);ghost.remove();};
    window.addEventListener('pointermove',update,true);window.addEventListener('pointerup',finish,{once:true,capture:true});window.addEventListener('pointercancel',cancel,{once:true,capture:true});
    window.addEventListener('laserman-cancel-gesture',cancel,{once:true});window.addEventListener('blur',cancel,{once:true});
  }
  function moveMarker(e,m,element,edge){
    if(e.button!==0)return;e.preventDefault();e.stopPropagation();commitFocusedField();
    const initial={start:m.start,end:m.end},x=e.clientX;let changed=false;dragging=false;
    const move=event=>{
      if(!changed&&Math.abs(event.clientX-x)<3)return;
      if(!changed){changed=true;dragging=true;}
      const delta=(event.clientX-x)/options.getScale(),minimum=.025;
      if(edge==='start')m.start=clamp(snap(initial.start+delta,event),0,m.end-minimum);
      else if(edge==='end')m.end=clamp(snap(initial.end+delta,event),m.start+minimum,project().duration);
      else{const length=initial.end==null?0:initial.end-initial.start;m.start=clamp(snap(initial.start+delta,event),0,project().duration-length);if(m.end!=null)m.end=m.start+length;}
      const visible=$('markerLane').querySelector('[data-marker="'+CSS.escape(m.id)+'"]')||element;
      visible.style.left=m.start*options.getScale()+'px';if(m.end!=null)visible.style.width=(m.end-m.start)*options.getScale()+'px';
    };
    const end=event=>{
      window.removeEventListener('pointermove',move,true);window.removeEventListener('pointercancel',end,true);window.removeEventListener('pointerup',end,true);window.removeEventListener('laserman-cancel-gesture',end);window.removeEventListener('blur',end);
      const final={start:m.start,end:m.end};m.start=initial.start;m.end=initial.end;markerId=m.id;
      const canceled=event.type!=='pointerup';
      if(changed&&!canceled){options.checkpoint();Object.assign(m,final);options.commit();}else renderMarkers();
      options.inspect();setTimeout(()=>dragging=false,0);
    };
    window.addEventListener('pointermove',move,true);window.addEventListener('pointerup',end,{once:true,capture:true});window.addEventListener('pointercancel',end,{once:true,capture:true});
    window.addEventListener('laserman-cancel-gesture',end,{once:true});window.addEventListener('blur',end,{once:true});
  }
  function enableDrop(element,getRow,getSpan){
    element.ondragover=e=>{if(e.dataTransfer.types.includes('application/x-laserman-effect')){e.preventDefault();e.dataTransfer.dropEffect='copy';element.classList.add('drop-target');}};
    element.ondragleave=()=>element.classList.remove('drop-target');
    element.ondrop=e=>{
      e.preventDefault();e.stopPropagation();element.classList.remove('drop-target');
      try{
        const data=JSON.parse(e.dataTransfer.getData('application/x-laserman-effect'));const row=getRow();
        if(data.kind!==kindOf(row))throw Error('Elige una pista de '+(data.kind==='laser'?'láser':data.kind==='suit'?'traje':'mano')+'.');
        let target=getSpan?.();
        if(!target){const at=snap(timeAt(e,element),e),selected=span();target=($('fitRange').checked?(selected&&at>=selected.start&&at<selected.end?selected:rangeAt(project(),at)):null)||{start:at,end:Math.min(project().duration,at+4*60/project().bpm)};}
        fill(row,target,data);
      }catch(error){options.notice(error.message);}
    };
  }
  function inspectMarker(panel){
    const marker=selectedMarker();if(!marker)return false;
    panel.replaceChildren();$('selectionTitle').textContent=marker.name;$('selectionHint').textContent='Marcador · '+(marker.end==null?'hasta el siguiente marcador':'rango de tiempo');$('selectionActions').hidden=true;
    for(const [title,key,type]of [['Nombre','name','text'],['Inicio · segundos','start','number'],['Final del rango · segundos','end','number'],['Color','color','color']]){
      const label=document.createElement('label');label.textContent=title;const input=document.createElement('input');input.type=type;input.dataset.markerProperty=key;if(type==='number'){input.min=0;input.max=project().duration;input.step='any';}input.value=marker[key]??'';
      if(key==='end')input.placeholder='Hasta el siguiente marcador';
      input.onchange=()=>{
        const value=type==='number'?(input.value===''?null:Number(input.value)):input.value;
        if(value===marker[key])return;
        if(!input.checkValidity()||(key==='start'&&(value==null||(marker.end!=null&&value>=marker.end)))||(key==='end'&&value!=null&&value<=marker.start)){input.value=marker[key]??'';options.notice('Revisa los límites del marcador.');return;}
        options.checkpoint();marker[key]=type==='text'?value.slice(0,100):value;marker.kind=marker.end==null?'point':'range';options.commit();options.inspect();
      };label.append(input);panel.append(label);
    }
    const fillButton=document.createElement('button');fillButton.type='button';fillButton.className='primary';fillButton.textContent='Rellenar '+(project().tracks.find(t=>t.id===options.getRow().split('/')[0])?.name||'pista');fillButton.onclick=()=>fill();panel.append(fillButton);
    const remove=document.createElement('button');remove.type='button';remove.textContent='Quitar marcador';remove.onclick=()=>{options.checkpoint();project().markers=project().markers.filter(m=>m.id!==marker.id);markerId=null;options.commit();options.inspect();};panel.append(remove);return true;
  }
  $('addMarker').onclick=()=>commitMarker(makeMarker(project(),options.getTime()));
  $('rangeTool').onclick=()=>{rangeMode=!rangeMode;renderMarkers();};
  $('snapPrecision').onchange=e=>quantumBeats=Number(e.target.value);
  $('showMusicAccents').onchange=()=>options.redrawWave();
  $('fillMarker').onclick=()=>fill();$('playMarker').onclick=()=>{const selected=span();if(selected)options.playRange(selected);};
  $('zoomMarker').onclick=()=>{const selected=span();if(selected)options.zoomTo(selected);};$('zoomAll').onclick=()=>options.zoomTo({start:0,end:project().duration});
  $('redoEdit').onclick=options.redo;
  function render(){
    renderMarkers();renderPalette();
    for(const row of document.querySelectorAll('.track-row')){
      row.addEventListener('pointerdown',e=>beginRange(e,row),{capture:true});enableDrop(row,()=>row.dataset.row);
    }
    for(const el of [$('ruler'),$('markerLane'),$('waveform')])el.onpointerdown=e=>{
      if(rangeMode||e.shiftKey)beginRange(e,el);
      else if(!e.target.closest('.time-marker'))options.seek(clamp(timeAt(e,el),0,project().duration));
    };
  }
  return {render,renderPalette,inspectMarker,span,fill,template,snap,get markerId(){return markerId;},
    clearMarker(){markerId=null;renderMarkers();},
    onClipDrop(cue,event,captured){
      const selected=captured||span();if(!selected||!$('fitRange').checked||event.altKey)return false;
      if(cue.start<selected.start-.0001||cue.start>=selected.end)return false;
      cue.start=selected.start;cue.duration=selected.end-selected.start;delete cue.sourceDuration;delete cue.sourceOffset;return true;
    },
    key(event){
      if((event.ctrlKey||event.metaKey)&&event.shiftKey&&event.key.toLowerCase()==='z'){event.preventDefault();options.redo();return true;}
      if(event.key.toLowerCase()==='m'){$('addMarker').click();return true;}
      if(event.key.toLowerCase()==='r'){$('rangeTool').click();return true;}
      if(event.key.toLowerCase()==='f'){fill();return true;}
      if(event.key.toLowerCase()==='z'&&!event.ctrlKey&&!event.metaKey){$('zoomMarker').click();return true;}
      return false;
    }};
}
