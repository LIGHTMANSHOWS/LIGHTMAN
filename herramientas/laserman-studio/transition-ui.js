import {TRANSITION_TYPES,TRANSITION_CURVES,transitionSeconds,transitionWindow,previousCue} from './transitions.js?v=1.5.0-client';

export function mountTransitionEditor(options){
  const $=id=>document.getElementById(id);
  const panel=document.createElement('section');panel.id='transitionPanel';panel.hidden=true;$('properties').before(panel);
  const toolbar=document.createElement('button');toolbar.id='openTransitions';toolbar.textContent='↝ Transiciones';toolbar.title='Selecciona una unión, ajusta su duración y previsualízala en bucle';
  document.querySelector('.edit-tools').prepend(toolbar);
  const status=document.createElement('div');status.id='transitionPreviewStatus';status.hidden=true;
  const statusText=document.createElement('span'),leave=document.createElement('button');leave.textContent='■ Salir';leave.onclick=()=>options.stopPreview();status.append(statusText,leave);document.querySelector('.stage').append(status);
  let before=2,after=2,rate=1,current=null;
  const project=()=>options.getProject();
  function selected(){const item=options.getSelection();return item&&item.row.type!=='hand'&&!item.cue.layer?item:null;}
  function focus(track,cue,zoom=true){
    options.onOpen?.();
    options.select(track.id,cue.id);options.seek(cue.start);
    if(zoom)options.zoom(span(cue));
    document.querySelector('.inspector').scrollTop=0;
    if(matchMedia('(max-width:700px)').matches){document.body.classList.add('inspector-open');$('mobileInspector')?.setAttribute('aria-expanded','true');}
  }
  function span(cue){const window=transitionWindow(cue,project().bpm);return {start:Math.max(0,window.start-before),end:Math.min(project().duration,Math.max(window.end,window.start+.05)+after)};}
  function start(){const invalid=panel.querySelector('input:invalid');if(invalid){invalid.reportValidity();return;}const item=selected();if(item)options.startPreview({...span(item.cue),rate,cueId:item.cue.id});}
  function statusUpdate(){
    const preview=options.getPreview();status.hidden=!preview;
    if(preview)statusText.textContent=`↝ Bucle de transición · ${preview.start.toFixed(2)}–${preview.end.toFixed(2)} s · ${preview.rate}×`;
    const stop=$('stopTransitionPreview');if(stop)stop.disabled=!preview;
  }
  function open(){
    const item=selected();
    if(item){focus(item.row.track,item.cue);return;}
    const p=project(),track=p.tracks.find(t=>t.id===options.getRow()&&t.type!=='hand')||p.tracks.find(t=>t.type==='laser');
    const cues=track.cues.filter(c=>!c.layer&&c.enabled!==false).sort((a,b)=>a.start-b.start);
    const cue=cues.find(c=>c.start>options.getTime()+.001)||cues.at(-1);
    if(cue)focus(track,cue);else options.notice('Añade un bloque a esta pista para editar su transición.');
  }
  toolbar.onclick=open;
  function inspect(){
    current=selected();panel.hidden=!current;document.body.classList.toggle('editing-transitions',!!current);panel.replaceChildren();if(!current){statusUpdate();return;}
    const {cue,row}=current,track=row.track;
    const heading=document.createElement('div');heading.className='transition-heading';heading.textContent='↝ TRANSICIÓN DE ENTRADA';
    const close=document.createElement('button');close.type='button';close.textContent='×';close.setAttribute('aria-label','Cerrar editor de transiciones');close.onclick=()=>options.select(row.id,null);heading.append(close);panel.append(heading);
    const join=document.createElement('label');join.textContent='Unión';
    const picker=document.createElement('select');picker.id='transitionJoin';picker.setAttribute('aria-label','Unión de efectos');
    const cues=track.cues.filter(c=>c.enabled!==false&&!c.layer).sort((a,b)=>a.start-b.start);
    for(const c of cues){const prior=previousCue(track,c);picker.add(new Option(`${c.start.toFixed(2)} s · ${prior?.name||'Oscuro'} → ${c.name}`,c.id));}
    picker.value=cue.id;picker.onchange=()=>{const next=cues.find(c=>c.id===picker.value);if(next)focus(track,next);};join.append(picker);panel.append(join);
    const grid=document.createElement('div');grid.className='transition-grid';panel.append(grid);
    function control(label,key,{values,value,min,max,step='any',change}={}){
      const wrap=document.createElement('label');wrap.textContent=label;
      const input=document.createElement(values?'select':'input');input.id=key;input.dataset.transitionProperty=key;input.setAttribute('aria-label',label);
      if(values)for(const [v,title] of Object.entries(values))input.add(new Option(title,v));
      else{input.type='number';input.min=min;input.max=max;input.step=step;input.required=true;}
      input.value=value;input.onchange=()=>{if(!input.checkValidity()){input.reportValidity();return;}change?.(values?input.value:Number(input.value));};
      if(!values)input.oninput=()=>{if(input.value!==''&&input.validity.valid)change?.(Number(input.value));};
      wrap.append(input);grid.append(wrap);return input;
    }
    const types=row.type==='laser'?TRANSITION_TYPES:{cut:'Corte',fade:'Fundido cruzado',wipe:'Barrido'};
    function update(key,value){
      if(key==='transitionDuration')value=Math.round(value*1e6)/1e6;
      if(cue[key]===value)return;options.checkpoint();cue[key]=value;
      if(!cue.transitionDuration)cue.transitionDuration=Math.max(.01,Math.min(.6,cue.duration));
      if(!cue.transitionUnit)cue.transitionUnit='seconds';if(!cue.transitionCurve)cue.transitionCurve='smooth';
      options.commit();sync();if(options.getPreview()?.cueId===cue.id)start();
    }
    const type=control('Tipo','transitionType',{values:types,value:cue.transition||'cut',change:value=>update('transition',value)});
    const curve=control('Curva','transitionCurve',{values:TRANSITION_CURVES,value:cue.transitionCurve||'linear',change:value=>update('transitionCurve',value)});
    const unit=control('Unidad','transitionUnit',{values:{seconds:'Segundos',beats:'Pulsos musicales'},value:cue.transitionUnit||'seconds',change:value=>{
      const duration=transitionSeconds({...cue,transition:cue.transition==='cut'?'morph':cue.transition},project().bpm);
      options.checkpoint();cue.transitionDuration=Math.round(Math.max(.01,duration/(value==='beats'?60/project().bpm:1))*1e6)/1e6;cue.transitionUnit=value;options.commit();sync();if(options.getPreview()?.cueId===cue.id)start();
    }});
    const duration=control('Duración','transitionDuration',{value:cue.transitionDuration??Math.min(cue.duration,(cue.sourceDuration||cue.duration)*.12),min:.01,max:1200,change:value=>update('transitionDuration',value)});
    const description=document.createElement('p');description.className='transition-description';panel.append(description);
    const context=document.createElement('div');context.className='transition-grid';panel.append(context);
    // The context is a viewing preference, not a change to show timing.
    const left=control('Antes · s','transitionBefore',{value:before,min:0,max:10,step:.1,change:value=>{before=value;if(options.getPreview()?.cueId===cue.id)start();}});
    const right=control('Después · s','transitionAfter',{value:after,min:0,max:10,step:.1,change:value=>{after=value;if(options.getPreview()?.cueId===cue.id)start();}});
    const speed=control('Velocidad de vista','transitionPreviewRate',{values:{1:'Normal · 1×',.5:'Cámara lenta · 0,5×',.25:'Cámara lenta · 0,25×'},value:rate,change:value=>{rate=Number(value);if(options.getPreview()?.cueId===cue.id)start();}});
    for(const element of [left,right,speed])context.append(element.parentElement);
    const actions=document.createElement('div');actions.className='transition-actions';
    const preview=document.createElement('button');preview.id='previewTransition';preview.type='button';preview.className='primary';preview.textContent='▶ Bucle de transición';preview.onclick=start;
    const stop=document.createElement('button');stop.id='stopTransitionPreview';stop.type='button';stop.textContent='■ Detener';stop.title='Salir del bucle y volver a velocidad normal';stop.onclick=()=>options.stopPreview();
    const zoom=document.createElement('button');zoom.type='button';zoom.textContent='Ver unión';zoom.onclick=()=>{options.seek(cue.start);options.zoom(span(cue));};
    const apply=document.createElement('button');apply.type='button';apply.id='applyTransitionToThree';apply.textContent='Aplicar a los 3 láseres';apply.hidden=row.type!=='laser';
    apply.onclick=()=>{
      const invalid=panel.querySelector('input:invalid');if(invalid){invalid.reportValidity();return;}
      const matches=project().tracks.filter(t=>t.type==='laser').map(t=>t.cues.find(c=>!c.layer&&Math.abs(c.start-cue.start)<.025)).filter(Boolean);
      options.checkpoint();for(const c of matches)for(const key of ['transition','transitionDuration','transitionUnit','transitionCurve'])if(cue[key]!==undefined)c[key]=cue[key];
      options.commit();options.notice('Transición aplicada a '+matches.length+' láseres en esta unión.');
    };
    actions.append(preview,stop,zoom,apply);description.before(actions);
    const details=document.createElement('details');details.className='transition-context';const summary=document.createElement('summary');summary.textContent='Contexto y cámara lenta';details.append(summary,context);panel.append(details);
    function sync(){
      const mode=cue.transition||'cut';type.value=Object.hasOwn(types,mode)?mode:'fade';curve.value=cue.transitionCurve||'linear';unit.value=cue.transitionUnit||'seconds';
      duration.value=Math.round((cue.transitionDuration??Math.min(cue.duration,(cue.sourceDuration||cue.duration)*.12))*1e6)/1e6;
      duration.disabled=curve.disabled=mode==='cut';
      const seconds=transitionSeconds(cue,project().bpm),window=transitionWindow(cue,project().bpm);
      const prior=previousCue(track,cue);
      const requested=(cue.transitionDuration??seconds)*(cue.transitionUnit==='beats'?60/project().bpm:1);
      description.textContent=`${prior?.name||'Entrada desde oscuro'} → ${cue.name} · ${seconds.toFixed(2)} s${mode!=='cut'&&seconds+1e-6<requested?' (limitada por el bloque)':''}. Arrastra la franja del timeline para ajustar.`;
      preview.title=`Bucle de ${Math.max(0,window.start-before).toFixed(2)} a ${Math.min(project().duration,window.end+after).toFixed(2)} s`;
      statusUpdate();
    }
    panel.onkeydown=e=>{if(e.key==='Enter'&&e.target.matches('input')){e.preventDefault();e.target.dispatchEvent(new Event('change',{bubbles:true}));}};
    sync();
    const active=options.getPreview(),expected=span(cue);
    if(active?.cueId===cue.id&&(Math.abs(active.start-expected.start)>.0001||Math.abs(active.end-expected.end)>.0001))start();
  }
  function decorate(block,row,cue){
    if(row.type==='hand'||cue.layer)return;
    const window=transitionWindow(cue,project().bpm),seconds=window.end-window.start;
    const zone=document.createElement('div');zone.className='transition-zone';zone.style.width=Math.min(100,seconds/cue.duration*100)+'%';zone.title=`${TRANSITION_TYPES[cue.transition||'cut']} · ${seconds.toFixed(2)} s`;
    const badge=document.createElement('button');badge.className='transition-badge';badge.type='button';badge.textContent='↝';badge.setAttribute('aria-label',`Editar transición hacia ${cue.name}`);badge.title='Editar transición hacia '+cue.name;
    badge.onpointerdown=e=>e.stopPropagation();badge.onclick=e=>{e.stopPropagation();focus(row.track,cue);};
    if(options.getScale()>=8||options.getSelection()?.cue.id===cue.id)block.append(badge);
    if(seconds>0){
      const handle=document.createElement('div');handle.className='transition-duration-handle';handle.title='Arrastra para cambiar la duración de la transición';handle.setAttribute('role','separator');handle.setAttribute('aria-label','Duración de transición hacia '+cue.name);
      handle.onpointerdown=e=>drag(e,block,zone,row,cue);zone.append(handle);block.append(zone);block.classList.add('has-transition');
    }
  }
  function drag(event,block,zone,row,cue){
    if(event.button!==0)return;event.preventDefault();event.stopPropagation();
    const startX=event.clientX,original=cue.transitionDuration,originalUnit=cue.transitionUnit,initial=transitionSeconds(cue,project().bpm);let moved=false;
    const move=e=>{
      if(Math.abs(e.clientX-startX)>2)moved=true;
      const factor=cue.transitionUnit==='beats'?60/project().bpm:1;
      const desired=Math.max(.01*factor,Math.min(cue.duration,options.snap(cue.start+initial+(e.clientX-startX)/options.getScale(),e)-cue.start));
      cue.transitionDuration=desired/factor;zone.style.width=Math.min(100,desired/cue.duration*100)+'%';options.invalidate();
    };
    const finish=e=>{
      window.removeEventListener('pointermove',move,true);window.removeEventListener('pointerup',finish,true);window.removeEventListener('pointercancel',cancel,true);window.removeEventListener('blur',cancel);window.removeEventListener('laserman-cancel-gesture',cancel);
      const final=Math.round(cue.transitionDuration*1e6)/1e6;if(original===undefined)delete cue.transitionDuration;else cue.transitionDuration=original;
      if(originalUnit===undefined)delete cue.transitionUnit;else cue.transitionUnit=originalUnit;
      if(e.type==='pointerup'&&moved){options.checkpoint();cue.transitionDuration=final;cue.transitionUnit=originalUnit||'seconds';}
      options.commit();options.select(row.id,cue.id);if(options.getPreview()?.cueId===cue.id)start();
    };
    const cancel=e=>finish(e);
    window.addEventListener('pointermove',move,true);window.addEventListener('pointerup',finish,{once:true,capture:true});window.addEventListener('pointercancel',cancel,{once:true,capture:true});window.addEventListener('blur',cancel,{once:true});window.addEventListener('laserman-cancel-gesture',cancel,{once:true});
  }
  return {inspect,decorate,status:statusUpdate,open};
}
