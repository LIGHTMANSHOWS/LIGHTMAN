import {DEFAULT_PROJECTION,validateProjection,projectPoint,testDrawing} from './projection.js?v=1.5.0-client';

export function mountProjectionEditor({getSettings,getName,saveSettings,pause,cancelTest,startTest,isConnected}){
  const dialog=document.createElement('dialog');dialog.id='projectionDialog';
  dialog.innerHTML=`<h2>Encuadre y test · FB3</h2><div class="dialogActions"><button id="scopeShow">Este show</button><button id="scopeMaster">Máster del evento</button></div><p id="projectionShowName"></p><p id="projectionScopeHint"></p>
    <canvas id="projectionCanvas" width="500" height="300" aria-label="Zona de proyección y cuatro esquinas ajustables"></canvas>
    <div class="projection-sliders"></div><label id="masterKppsField">KPPS <output id="masterKppsValue">15</output><input id="masterKpps" aria-label="KPPS del máster" type="range" min="8" max="15" step="1" value="15"></label><details><summary>Ajuste de esquinas</summary><div class="projection-corners"></div></details><div class="dialogActions projection-tools"></div>
    <p class="hint">La cuadrícula representa coordenadas de salida, no grados ópticos. El encuadre no reemplaza la calibración de los galvos.</p>
    <div class="dialogActions"><button id="saveProjection" class="primary">Guardar encuadre</button><button id="resetProjection">Máxima área · 100 %</button></div>
    <h3>Prueba de encuadre · 50 %</h3><p>Marco exterior, ejes y círculo. Ajusta el mapa o los sliders durante la prueba. Se apaga automáticamente a los 30 segundos; Terminar test y Esc la detienen antes.</p>
    <div class="dialogActions projection-tests"><button id="startProjectionTest" class="primary">Probar test</button><button id="stopProjectionTest" class="danger">Terminar test</button></div><p id="projectionStatus" role="status"></p>
    <div class="dialogActions"><button id="closeProjection">Cerrar</button></div>`;
  document.body.append(dialog);
  const $=id=>dialog.querySelector('#'+id),canvas=$('projectionCanvas'),ctx=canvas.getContext('2d');
  let draft=null,dirty=false,drag=-1,busy=false,active=false,generation=0,dragOrigin=null,scope='show',drafts=null,kpps=15;
  const inputs=[],sliders=[];
  const names=['Superior izquierda','Superior derecha','Inferior derecha','Inferior izquierda'];
  const position=([x,y])=>[25+(x+1)*225,15+(1-y)*135];
  function message(text){$('projectionStatus').textContent=text;}
  async function halt(text){generation++;try{await cancelTest();active=false;if(text)message(text);}catch(e){message(e.message);}finally{if(draft)sync();}}
  function draw(){
    ctx.clearRect(0,0,500,300);ctx.fillStyle='#08131d';ctx.fillRect(0,0,500,300);ctx.strokeStyle='#284352';ctx.lineWidth=1;
    for(let i=0;i<=10;i++){ctx.beginPath();ctx.moveTo(25+i*45,15);ctx.lineTo(25+i*45,285);ctx.stroke();ctx.beginPath();ctx.moveTo(25,15+i*27);ctx.lineTo(475,15+i*27);ctx.stroke();}
    ctx.strokeStyle='#41dbc4';ctx.lineWidth=2;ctx.beginPath();draft.corners.forEach((p,i)=>{const [x,y]=position(p);i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.closePath();ctx.stroke();
    ctx.strokeStyle='#b0c3d0';ctx.lineWidth=1;
    for(const path of testDrawing('orientation').paths){ctx.beginPath();path.points.forEach((p,i)=>{const [x,y]=position(projectPoint(p,draft));i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.stroke();}
    draft.corners.forEach((p,i)=>{const [x,y]=position(p);ctx.fillStyle='#41dbc4';ctx.beginPath();ctx.arc(x,y,6,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff';ctx.font='12px sans-serif';ctx.fillText(String(i+1),x+8,y+14);});
  }
  function metrics(){const x=draft.corners.map(p=>p[0]),y=draft.corners.map(p=>p[1]);return {x:draft.corners.reduce((s,p)=>s+p[0],0)/4,y:draft.corners.reduce((s,p)=>s+p[1],0)/4,zoom:Math.max(Math.max(...x)-Math.min(...x),Math.max(...y)-Math.min(...y))/2};}
  function sync(){draft.corners.forEach((p,i)=>p.forEach((v,j)=>inputs[i][j].value=(v*100).toFixed(1)));const m=metrics();sliders.forEach(([key,input,out])=>{input.value=m[key]*100;out.textContent=Math.round(m[key]*100)+' %';});$('startProjectionTest').disabled=busy||active;$('stopProjectionTest').disabled=!active&&!busy;$('saveProjection').disabled=!dirty||busy;$('masterKppsField').hidden=scope!=='master';$('masterKpps').value=kpps;$('masterKppsValue').textContent=kpps;$('scopeShow').classList.toggle('active',scope==='show');$('scopeMaster').classList.toggle('active',scope==='master');draw();}
  function edit(next){try{draft=validateProjection(next);dirty=true;message(active?'Ajuste en vivo · guarda el encuadre para todo el show.':'Encuadre pendiente de guardar · se aplicará a todo el show.');sync();}catch(e){message(e.message);sync();}}
  function moveZone(corners,dx,dy){const xs=corners.map(p=>p[0]),ys=corners.map(p=>p[1]);dx=Math.max(-1-Math.min(...xs),Math.min(1-Math.max(...xs),dx));dy=Math.max(-1-Math.min(...ys),Math.min(1-Math.max(...ys),dy));edit({corners:corners.map(p=>[p[0]+dx,p[1]+dy])});}
  for(const [key,label,min,max] of [['x','Posición X',-100,100],['y','Posición Y',-100,100],['zoom','Zoom general',5,100]]){
    const wrap=document.createElement('label');wrap.textContent=label;const out=document.createElement('output'),input=document.createElement('input');input.type='range';input.min=min;input.max=max;input.step=1;input.setAttribute('aria-label',label);
    input.oninput=()=>{const m=metrics(),target=Number(input.value)/100;if(key==='zoom'){const factor=target/m.zoom;edit({corners:draft.corners.map(p=>[m.x+(p[0]-m.x)*factor,m.y+(p[1]-m.y)*factor])});}else moveZone(draft.corners,key==='x'?target-m.x:0,key==='y'?target-m.y:0);};wrap.append(out,input);sliders.push([key,input,out]);dialog.querySelector('.projection-sliders').append(wrap);
  }
  names.forEach((name,i)=>{const group=document.createElement('div');const title=document.createElement('strong');title.textContent=(i+1)+' · '+name;group.append(title);inputs[i]=[];
    ['X','Y'].forEach((axis,j)=>{const label=document.createElement('label');label.textContent=axis+' % ';const input=document.createElement('input');input.type='number';input.min=-100;input.max=100;input.step=1;input.setAttribute('aria-label',name+' '+axis+' en porcentaje');input.onchange=()=>{const next=structuredClone(draft);next.corners[i][j]=Number(input.value)/100;edit(next);};inputs[i][j]=input;label.append(input);group.append(label);});dialog.querySelector('.projection-corners').append(group);});
  for(const [label,dx,dy,factor] of [['←',-.05,0,1],['→',.05,0,1],['↑',0,.05,1],['↓',0,-.05,1],['Reducir',0,0,.95],['Ampliar',0,0,1.05]]){
    const b=document.createElement('button');b.textContent=label;b.onclick=()=>{const center=[0,1].map(j=>draft.corners.reduce((s,p)=>s+p[j],0)/4);edit({corners:draft.corners.map(p=>[(p[0]-center[0])*factor+center[0]+dx,(p[1]-center[1])*factor+center[1]+dy])});};dialog.querySelector('.projection-tools').append(b);
  }
  canvas.onpointerdown=e=>{const r=canvas.getBoundingClientRect(),p=[(e.clientX-r.left)*500/r.width,(e.clientY-r.top)*300/r.height];drag=draft.corners.findIndex(c=>Math.hypot(position(c)[0]-p[0],position(c)[1]-p[1])<20);if(drag<0){const q=[(p[0]-25)/225-1,1-(p[1]-15)/135];const inside=draft.corners.every((a,i)=>{const b=draft.corners[(i+1)%4];return (b[0]-a[0])*(q[1]-a[1])-(b[1]-a[1])*(q[0]-a[0])<=0;});if(inside){drag=-2;dragOrigin={point:q,corners:structuredClone(draft.corners)};}}if(drag!==-1)canvas.setPointerCapture(e.pointerId);};
  canvas.onpointermove=e=>{if(drag===-1)return;const r=canvas.getBoundingClientRect(),p=[((e.clientX-r.left)*500/r.width-25)/225-1,1-((e.clientY-r.top)*300/r.height-15)/135];if(drag===-2){moveZone(dragOrigin.corners,p[0]-dragOrigin.point[0],p[1]-dragOrigin.point[1]);return;}const next=structuredClone(draft);next.corners[drag]=p.map(v=>Math.max(-1,Math.min(1,v)));edit(next);};
  canvas.onpointerup=canvas.onpointercancel=()=>drag=-1;
  $('startProjectionTest').onclick=async()=>{const ticket=++generation;busy=true;sync();message('Preparando test · 50 %…');try{const running=await startTest();if(ticket!==generation||!dialog.open){await cancelTest();active=false;}else{active=running;message(running?'Test activo · 50 % · apagado automático.':'Test terminado · haz apagado.');}}catch(e){message(e.message);}finally{busy=false;sync();}};
  $('saveProjection').onclick=async()=>{await halt();busy=true;sync();try{await pause();await saveSettings(validateProjection(draft),{scope,kpps});dirty=false;drafts[scope]={projection:draft,dirty:false};message(scope==='master'?'Máster guardado · se aplica a todos los shows.':'Encuadre guardado en este show.');}catch(e){message(e.message);}finally{busy=false;sync();}};
  $('resetProjection').onclick=()=>edit(DEFAULT_PROJECTION);
  $('stopProjectionTest').onclick=()=>halt('Test terminado · haz apagado.');$('closeProjection').onclick=()=>dialog.close();
  dialog.addEventListener('close',()=>halt());dialog.addEventListener('cancel',()=>halt());
  async function setScope(value){await halt();if(draft)drafts[scope]={projection:draft,dirty};scope=value;draft=drafts[scope].projection;dirty=drafts[scope].dirty;$('projectionShowName').textContent=scope==='master'?'Máster del evento · todos los shows':'Show: '+getName();$('projectionScopeHint').textContent=scope==='master'?'Mueve o escala todo el conjunto sin cambiar los encuadres individuales.':'Ajuste propio de este show. El máster del evento se aplica después.';sync();}
  $('scopeShow').onclick=()=>setScope('show');$('scopeMaster').onclick=()=>setScope('master');$('masterKpps').oninput=()=>{kpps=Number($('masterKpps').value);dirty=true;sync();};
  let lastConnection=isConnected();
  setInterval(()=>{if(!dialog.open)return;const next=isConnected();if(next===lastConnection)return;lastConnection=next;if(!next)halt('FB3 desconectado · test apagado.');else if(!active&&!dirty&&!busy)message('FB3 conectado · haz apagado.');sync();},250);
  return {get profile(){return {show:scope==='master'?undefined:scope==='show'?draft:drafts?.show.projection,master:scope==='master'?draft:drafts?.master.projection,kpps};},async open(){await pause();await halt();const settings=getSettings();draft=null;scope='show';drafts={show:{projection:validateProjection(settings.projection??DEFAULT_PROJECTION),dirty:false},master:{projection:validateProjection(settings.masterProjection??DEFAULT_PROJECTION),dirty:false}};kpps=settings.kpps??15;await setScope('show');message(isConnected()?'FB3 conectado · haz apagado.':'Probar test conectará el FB3 guardado.');dialog.showModal();dialog.scrollTop=0;},setActive(value){active=value;if(dialog.open&&!busy)message(value?'Test activo · 50 % · apagado automático.':'Test terminado · haz apagado.');if(draft)sync();}};
}
