import * as THREE from './vendor/three.module.js';
import {OrbitControls} from './vendor/OrbitControls.js';
import {types,pieces,pieceLength,totalLength,measuredLength,stage1Front,CYAN,MAGENTA,roundPath} from './data.js?v=r04';
const $=s=>document.getElementById(s),fmt=(v,n=2)=>v.toLocaleString('es-PE',{minimumFractionDigits:n,maximumFractionDigits:n}),m=v=>fmt(v)+' m';
let selected=pieces.find(p=>p.type==='presenting'),view='perspective',overview=false,dimensionsOn=true;
const order=['presenting','innovation','food','analytic','dataMaze','totem','stageA','stageB'];
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const status=s=>s==='calculado'?'Calculado':'Provisional';
function toast(t){$('toast').textContent=t;$('toast').classList.add('visible');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').classList.remove('visible'),3000);}
function renderNav(){const q=$('search').value.toLowerCase();$('pieces').innerHTML=order.map(type=>{const a=pieces.filter(p=>p.type===type&&(p.name+' '+p.zone).toLowerCase().includes(q));if(!a.length)return '';return `<div class="nav-section"><span>${types[type].short}</span><span>${a.length}</span></div>`+a.map(p=>`<button class="nav-item ${p.id===selected.id?'active':''}" data-piece="${p.id}" aria-current="${p.id===selected.id?'true':'false'}"><span>${escape(p.name)}</span><small>${fmt(pieceLength(p),1)}</small></button>`).join('');}).join('');}
function fillInspector(){const t=types[selected.type];$('item-category').textContent=t.category.toUpperCase();$('item-name').textContent=selected.name;$('item-zone').textContent=selected.zone;$('item-total').textContent=m(pieceLength(selected));$('item-status').textContent=status(t.status);$('item-status').className='status '+(t.status==='calculado'?'calculated':'');$('model-caption').textContent=overview?'Conjunto · distribución de referencia':selected.name;$('item-note').textContent=t.note;$('item-source').textContent=t.source;$('dimensions-list').innerHTML=t.details.map(([k,v])=>`<div><dt>${escape(k)}</dt><dd>${escape(v)}</dd></div>`).join('');$('trace-list').innerHTML=selected.traces.map(tr=>`<div class="trace"><i class="trace-dot" style="background:${tr.color}"></i><span>${escape(tr.name)}</span><strong>${m(tr.length)}</strong><small>${escape(tr.formula)} · ${status(tr.status)}</small></div>`).join('');$('view-source').hidden=!t.image;$('view-label').textContent=overview?'CONJUNTO · UBICACIONES DE REFERENCIA':'VISTA DE ELEMENTO';document.querySelectorAll('.meter-row').forEach(el=>el.classList.toggle('active',el.dataset.piece===selected.id));}
function renderTables(){
 $('stat-pieces').textContent=pieces.length;$('piece-count').textContent=pieces.length;$('stat-total').textContent=m(totalLength);$('stat-measured').textContent=m(measuredLength);$('table-total').textContent=m(totalLength);
 $('type-summary').innerHTML=order.flatMap(key=>{const a=pieces.filter(p=>p.type===key);if(key==='totem')return a.map(p=>`<button class="summary-type" data-piece="${p.id}"><b>${p.name}</b><small>1 unidad independiente</small><strong>${m(pieceLength(p))}</strong></button>`);const total=a.reduce((s,p)=>s+pieceLength(p),0);return [`<button class="summary-type" data-piece="${a[0].id}"><b>${types[key].name}</b><small>${a.length} ${a.length===1?'unidad':'unidades'} × ${m(pieceLength(a[0]))}</small><strong>${m(total)}</strong></button>`];}).join('');
 $('meter-rows').innerHTML=order.flatMap(type=>pieces.filter(p=>p.type===type)).map(p=>{const t=types[p.type];return `<tr class="meter-row ${p.id===selected.id?'active':''}" data-piece="${p.id}"><td><small>${p.id.toUpperCase()}</small>${escape(p.name)}</td><td>${escape(p.zone)}</td><td>${escape(t.dimensions)}</td><td>${m(pieceLength(p))}</td><td><span class="status ${t.status==='calculado'?'calculated':''}">${status(t.status)}</span></td><td><button class="expand-button" data-expand="${p.id}" aria-expanded="false" aria-label="Desglosar ${escape(p.name)}">+</button></td></tr><tr class="detail-row" id="detail-${p.id}" hidden><td colspan="6"><table aria-label="Desglose ${escape(p.name)}">${p.traces.map(tr=>`<tr><td>${escape(tr.name)}</td><td>${escape(tr.formula)}</td><td>${m(tr.length)}</td><td>${status(tr.status)}</td></tr>`).join('')}</table><p>${escape(t.note)}<br>Fuente: ${escape(t.source)}</p></td></tr>`;}).join('');
}
function csv(){const rows=[['item','elemento','ubicacion','ancho_m','fondo_m','alto_modelo_m','recorrido','formula','longitud_m','base_recorrido','base_elemento','fuente']];for(const p of pieces){const t=types[p.type];for(const tr of p.traces)rows.push([p.id,p.name,p.zone,t.w,t.d,t.h,tr.name,tr.formula,tr.length.toFixed(6),tr.status,t.status,t.source]);rows.push([p.id,p.name,p.zone,'','','','TOTAL UNIDAD','',pieceLength(p).toFixed(6),'',t.status,'']);}rows.push(['TOTAL MODELO','','','','','','TOTAL PROVISIONAL','',totalLength.toFixed(6)]);const quote=v=>'"'+String(v??'').replace(/"/g,'""')+'"',blob=new Blob(['\ufeff'+rows.map(r=>r.map(quote).join(';')).join('\r\n')],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='LIGHTMAN_Credicorp_Metrado_14Nov2026_R04.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Metrado descargado con todos los recorridos y sus bases.');}
renderNav();renderTables();fillInspector();
$('search').addEventListener('input',renderNav);
document.addEventListener('click',e=>{const ex=e.target.closest('[data-expand]');if(ex){const row=$('detail-'+ex.dataset.expand);row.hidden=!row.hidden;ex.setAttribute('aria-expanded',String(!row.hidden));ex.textContent=row.hidden?'+':'−';return;}const b=e.target.closest('[data-piece]');if(b){select(b.dataset.piece);if(b.classList.contains('summary-type')||b.classList.contains('meter-row'))document.querySelector('.studio').scrollIntoView({behavior:'smooth',block:'start'});}});
$('download-csv').onclick=csv;$('view-source').onclick=()=>{const t=types[selected.type];$('source-image').src='./assets/'+t.image;$('source-title').textContent=t.name+' · referencia';$('source-dialog').showModal();};$('close-source').onclick=()=>$('source-dialog').close();$('source-dialog').addEventListener('click',e=>{if(e.target===$('source-dialog'))$('source-dialog').close();});
let renderer,scene,camera,orbit,collection,dimGroup,ground,grid;const models=new Map(),animated=[],labels=[];let ready=false;
const bodyMat=new THREE.MeshStandardMaterial({color:'#26313d',roughness:.64,metalness:.18});
const darkMat=new THREE.MeshStandardMaterial({color:'#111a25',roughness:.5,metalness:.22});
const edgeMat=new THREE.MeshStandardMaterial({color:'#394959',roughness:.38,metalness:.55});
const deckMat=new THREE.MeshStandardMaterial({color:'#18232e',roughness:.70,metalness:.16});
const screenMat=new THREE.MeshStandardMaterial({color:'#05151e',roughness:.28,metalness:.3});
function mesh(geo,mat,parent,x=0,y=0,z=0){const o=new THREE.Mesh(geo,mat);o.position.set(x,y,z);parent.add(o);return o;}
function box(parent,x,y,z,w,h,d,mat=bodyMat){return mesh(new THREE.BoxGeometry(w,h,d),mat,parent,x,y,z);}
function polygon(parent,points,depth,z,mat=bodyMat){const sh=new THREE.Shape(points.map(p=>new THREE.Vector2(...p)));const geo=new THREE.ExtrudeGeometry(sh,{depth,bevelEnabled:false,steps:1});return mesh(geo,mat,parent,0,0,z);}
function beam(parent,a,b,r=.025,mat=edgeMat){const va=new THREE.Vector3(...a),vb=new THREE.Vector3(...b),delta=vb.clone().sub(va),o=mesh(new THREE.CylinderGeometry(r,r,delta.length(),7),mat,parent);o.position.copy(va.add(vb).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return o;}
function labelTexture(text,sub,w=1024){const c=document.createElement('canvas');c.width=w;c.height=256;const ctx=c.getContext('2d');ctx.fillStyle='#07121c';ctx.fillRect(0,0,w,256);ctx.fillStyle='#00e5ff';ctx.fillRect(40,42,65,4);ctx.fillStyle='#d8e9f1';ctx.font='500 64px Segoe UI';ctx.textAlign='center';ctx.fillText(text,w/2,135);if(sub){ctx.fillStyle='#889eb2';ctx.font='24px Segoe UI';ctx.fillText(sub,w/2,194);}const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;}
function sign(parent,text,sub,w,h,x,y,z){const mat=new THREE.MeshBasicMaterial({map:labelTexture(text,sub),side:THREE.DoubleSide});return mesh(new THREE.PlaneGeometry(w,h),mat,parent,x,y,z);}
function roundedBody(parent,w,h,r,cy,z,depth,mat=bodyMat){return polygon(parent,roundPath(w,h,r,cy,0).map(p=>p.slice(0,2)),depth,z,mat);}
function buildStructure(p,parent){const t=types[p.type];
 if(p.type==='presenting'){
  box(parent,0,.025,0,5.70,.07,3,deckMat);
  const outer=[[-2.85,.08],[-2.30,2.33],[-1.25,2.60],[1.25,2.60],[2.30,2.33],[2.85,.08]],inner=[[-2.60,.08],[-2.04,1.98],[-1.25,2.20],[1.25,2.20],[2.04,1.98],[2.60,.08]];
  polygon(parent,[...outer,...inner.reverse()],.32,1.0);
  polygon(parent,[[-.475,.08],[-.525,2.52],[.525,2.52],[.475,.08]],.25,-1.30,darkMat);
  box(parent,0,2.90,-.02,1.05,.40,2.40,bodyMat);box(parent,0,2.64,-.05,1.05,.12,2.65,darkMat);
  roundedBody(parent,1.8,.90,.30,.53,.54,.49,darkMat);
  sign(parent,p.n===5?'CREDICORP':'PRESENTING PARTNER','SUMMIT 2026',2.48,.35,0,2.4,1.326);
  sign(parent,'TU MARCA','',1.25,.30,0,.55,1.041);
  sign(parent,p.n===5?'CREDICORP':'SUMMIT 2026','IA · DATA · CIBERSEGURIDAD',.88,.55,0,1.32,-1.04);
 }else if(p.type==='innovation'){
  box(parent,0,.025,0,4,.07,2,deckMat);box(parent,0,.98,-.97,3.65,1.96,.06,darkMat);
  box(parent,-1.95,1,-.24,.10,2,1.5);box(parent,1.95,1,-.24,.10,2,1.5);
  const outerArch=p.traces[0].points.map(v=>[v[0],v[1]]),innerArch=p.traces[1].points.map(v=>[v[0],v[1]]);
  // The support sits behind both LED centrelines. A tube on the outer
  // centreline enclosed that LED and hid it from the front.
  polygon(parent,[...outerArch,...innerArch.slice().reverse()],.025,-.952,bodyMat);
  roundedBody(parent,1.18,.78,.25,.4,.35,.50,bodyMat);
  sign(parent,'INNOVATION','EXPERIENCE',2.5,.47,0,1.62,-.932);sign(parent,'TU MARCA','',.9,.3,0,.4,.866);
 }else if(p.type==='food'){
  for(const x of [-1.5,1.5])for(const z of [-.95,.95])box(parent,x,1.1,z,.055,2.2,.055,edgeMat);
  box(parent,0,2.15,0,3.1,.10,2,deckMat);box(parent,0,.48,.40,2.6,.96,.5,darkMat);
  const outer=[[-1.55,0],[-1.55,2.2],[1.55,2.2],[1.55,0]],ar=p.traces[1].points.map(v=>[v[0],v[1]]);
  polygon(parent,[...outer,...ar.slice().reverse()],.10,.91,bodyMat);
  sign(parent,'ALIMENTOS','',2.25,.30,0,.50,.66);
 }else if(p.type==='analytic'){
  mesh(new THREE.CylinderGeometry(.9,.9,.2,64),deckMat,parent,0,.1,0);
  for(const tr of p.traces){const [a,b]=tr.points;beam(parent,a,b,.035,darkMat);box(parent,a[0],.03,a[2],.09,.06,.20,edgeMat);}
  sign(parent,'MR ANALITYC','',1.3,.23,0,.12,.82);
 }else if(p.type==='totem'){
  box(parent,0,.735,0,.4,1.47,.4,darkMat);box(parent,0,.03,0,.48,.06,.48,edgeMat);
  const screen=box(parent,0,1.49,0,.34,.014,.27,screenMat);screen.rotation.x=-.09;
  sign(parent,'SUMMIT','2026',.32,.16,0,1.19,.203);
 }else if(p.type==='dataMaze'){
  box(parent,0,.045,0,2.8,.09,2.8,deckMat);box(parent,0,.16,0,2.66,.14,2.66,darkMat);
  box(parent,0,1.30,-1.34,2.8,2.2,.12,darkMat);box(parent,-1.20,1.32,-1.16,.4,2.16,.32,bodyMat);box(parent,1.20,1.32,-1.16,.4,2.16,.32,bodyMat);
  roundedBody(parent,2.8,.35,.14,2.225,-1.23,.15,bodyMat);
  sign(parent,'Data Maze','',2.22,.30,0,2.21,-1.068);
  // Printed graphics, not LED; intentionally excluded from the metrado.
  const tex=mazeTexture();mesh(new THREE.PlaneGeometry(2.05,1.75),new THREE.MeshBasicMaterial({map:tex}),parent,0,1.25,-1.269);
 }else{
  const w=t.w,d=t.d,front=stage1Front.map(([x,z])=>[x*w/15.86,z]);
  const shape=new THREE.Shape();shape.moveTo(-w/2,-d/2);shape.lineTo(w/2,-d/2);for(const [x,z] of front.slice().reverse())shape.lineTo(x,z);shape.closePath();
  const geo=new THREE.ExtrudeGeometry(shape,{depth:t.h,bevelEnabled:false,steps:1});geo.rotateX(-Math.PI/2);geo.translate(0,0,0);
  // Shape Y becomes -Z after rotation; invert Z to retain the CAD front orientation.
  geo.scale(1,1,-1);geo.computeVertexNormals();mesh(geo,new THREE.MeshStandardMaterial({color:'#25313d',roughness:.65,metalness:.1,side:THREE.DoubleSide}),parent);
  for(let x=-w/2+1.22;x<w/2;x+=1.22)beam(parent,[x,t.h+.002,-d/2],[x,t.h+.002,.70],.006,darkMat);
  for(let z=-d/2+1.22;z<.70;z+=1.22)beam(parent,[-w/2,t.h+.002,z],[w/2,t.h+.002,z],.006,darkMat);
  box(parent,0,t.h+2.25,-d/2+.3,Math.min(w-1,10),4.5,.14,darkMat);
  sign(parent,'CREDICORP','IA, DATA & CIBERSEGURIDAD',Math.min(w-2,9),2.05,0,t.h+2.5,-d/2+.38);
 }
}
function mazeTexture(){const c=document.createElement('canvas');c.width=512;c.height=512;const ctx=c.getContext('2d');ctx.fillStyle='#06141f';ctx.fillRect(0,0,512,512);ctx.lineWidth=3;ctx.strokeStyle='#25445b';for(let j=0;j<14;j++){const x=26+j*35;ctx.beginPath();ctx.moveTo(x,15);ctx.lineTo(x,497);ctx.stroke();}ctx.strokeStyle='#52607c';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(70,430);ctx.lineTo(70,130);ctx.lineTo(400,130);ctx.lineTo(400,205);ctx.lineTo(170,205);ctx.lineTo(170,320);ctx.lineTo(360,320);ctx.lineTo(360,430);ctx.stroke();return new THREE.CanvasTexture(c);}
function tubeGeometry(points,radius,sides=6){
 const pos=[],norm=[],svalues=[],idx=[];let distance=0;const total=points.slice(1).reduce((s,p,i)=>s+p.distanceTo(points[i]),0);
 for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],length=a.distanceTo(b);if(length<1e-8)continue;const dir=b.clone().sub(a).normalize(),axis=Math.abs(dir.y)<.9?new THREE.Vector3(0,1,0):new THREE.Vector3(1,0,0),normal=new THREE.Vector3().crossVectors(dir,axis).normalize(),binormal=new THREE.Vector3().crossVectors(dir,normal).normalize(),start=pos.length/3;
  for(const [k,p] of [a,b].entries())for(let j=0;j<sides;j++){const angle=j/sides*Math.PI*2,n=normal.clone().multiplyScalar(Math.cos(angle)).addScaledVector(binormal,Math.sin(angle));pos.push(p.x+n.x*radius,p.y+n.y*radius,p.z+n.z*radius);norm.push(n.x,n.y,n.z);svalues.push((distance+k*length)/Math.max(total,1e-6));}
  for(let j=0;j<sides;j++){const k=(j+1)%sides;idx.push(start+j,start+k,start+sides+k,start+j,start+sides+k,start+sides+j);}distance+=length;
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(norm,3));g.setAttribute('pathS',new THREE.Float32BufferAttribute(svalues,1));g.setIndex(idx);g.computeBoundingSphere();return g;
}
function addLED(parent,tr,index){const points=tr.points.map(v=>new THREE.Vector3(...v)),col=new THREE.Color(tr.color),alt=new THREE.Color(tr.color===CYAN?MAGENTA:CYAN);
 const mat=new THREE.ShaderMaterial({uniforms:{uTime:{value:0},uColor:{value:col},uAlt:{value:alt},uOffset:{value:index*.75}},vertexShader:'attribute float pathS; varying float vS; void main(){vS=pathS;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'uniform float uTime;uniform float uOffset;uniform vec3 uColor;uniform vec3 uAlt;varying float vS;void main(){float wave=sin(vS*12.-uTime*0.7+uOffset);vec3 col=wave>.65?uAlt:uColor;float bright=.62+.38*pow(max(0.,sin(vS*18.-uTime*1.1+uOffset)),4.);gl_FragColor=vec4(col*bright,1.);}',toneMapped:false});
 const core=mesh(tubeGeometry(points,.013,6),mat,parent);core.userData.trace=index;animated.push(mat);
 mesh(tubeGeometry(points,.032,5),new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:.12,depthWrite:false,blending:THREE.AdditiveBlending}),parent);
 mesh(tubeGeometry(points,.061,5),new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:.025,depthWrite:false,blending:THREE.AdditiveBlending}),parent);
}
function dimensionLine(a,b,text,labelAt){const geo=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...a),new THREE.Vector3(...b)]),mat=new THREE.LineDashedMaterial({color:'#7193a5',dashSize:.08,gapSize:.055,transparent:true,opacity:.72});const line=new THREE.Line(geo,mat);line.computeLineDistances();dimGroup.add(line);const diff=new THREE.Vector3(...b).sub(new THREE.Vector3(...a)).normalize(),tick=diff.y>.9?new THREE.Vector3(.07,0,0):new THREE.Vector3(0,.065,0);for(const p of [a,b]){const v=new THREE.Vector3(...p),g=new THREE.BufferGeometry().setFromPoints([v.clone().sub(tick),v.clone().add(tick)]);dimGroup.add(new THREE.Line(g,new THREE.LineBasicMaterial({color:'#9cbdcc'})));}const el=document.createElement('div');el.className='scene-label';el.textContent=text;$('scene-labels').appendChild(el);labels.push({el,point:new THREE.Vector3(...labelAt)});}
function addDimensions(){dimGroup.clear();for(const l of labels)l.el.remove();labels.length=0;if(overview||!dimensionsOn)return;const t=types[selected.type];dimensionLine([-t.w/2,.04,t.d/2+.5],[t.w/2,.04,t.d/2+.5],m(t.w),[0,.04,t.d/2+.6]);dimensionLine([t.w/2+.5,0,0],[t.w/2+.5,t.h,0],m(t.h)+(selected.type==='totem'||selected.type==='stageB'?' ref.':''),[t.w/2+.5,t.h/2,0]);dimensionLine([t.w/2+.28,.02,-t.d/2],[t.w/2+.28,.02,t.d/2],m(t.d)+(selected.type==='food'?' ref.':''),[t.w/2+.38,.02,0]);}
function select(id){const p=pieces.find(p=>p.id===id);if(!p)return;selected=p;overview=false;$('overview').setAttribute('aria-pressed','false');renderNav();fillInspector();document.querySelector('.inspector').scrollTop=0;if(ready){arrange();fit();}location.hash='item='+p.id;}
function arrange(){for(const p of pieces){const g=models.get(p.id);g.visible=overview||p.id===selected.id;g.position.set(overview?p.x:0,0,overview?p.z:0);g.rotation.y=overview?THREE.MathUtils.degToRad(p.rotation):0;}ground.scale.setScalar(overview?8:1);grid.visible=overview;addDimensions();fillInspector();}
function fit(){const t=types[selected.type];let center,size;if(overview){const b=new THREE.Box3().setFromObject(collection);center=b.getCenter(new THREE.Vector3());size=b.getSize(new THREE.Vector3());}else{const b=new THREE.Box3().setFromObject(models.get(selected.id));center=b.getCenter(new THREE.Vector3());size=b.getSize(new THREE.Vector3());center.y=Math.max(center.y,t.h*.40);size.x=Math.max(size.x,t.w+1);size.z=Math.max(size.z,t.d+1);}
 const span=Math.max(size.x,size.y,size.z,overview?0:t.w+1.3,overview?0:t.d+1.3),vfov=THREE.MathUtils.degToRad(camera.fov),hfov=2*Math.atan(Math.tan(vfov/2)*camera.aspect),dist=span/(2*Math.tan(Math.min(vfov,hfov)/2))*1.36;
 const direction=view==='front'?new THREE.Vector3(0,.03,1):view==='top'?new THREE.Vector3(0,1,.001):new THREE.Vector3(.95,.67,1.45).normalize();camera.position.copy(center).addScaledVector(direction,dist);camera.near=Math.max(.01,dist/1000);camera.far=Math.max(400,dist*10);camera.updateProjectionMatrix();orbit.target.copy(center);orbit.minDistance=Math.max(.2,span*.16);orbit.maxDistance=Math.max(150,dist*3);orbit.update();}
function resize(){const host=$('viewport'),w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();if(ready)fit();}
function init(){
 const host=$('viewport');renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setClearColor('#09121e',0);renderer.domElement.setAttribute('aria-label','Modelo 3D interactivo del delineado LED en magenta y cyan');renderer.domElement.setAttribute('role','img');host.appendChild(renderer.domElement);
 scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(38,1,.02,800);orbit=new OrbitControls(camera,renderer.domElement);orbit.enableDamping=true;orbit.dampingFactor=.08;orbit.maxPolarAngle=Math.PI*.49;
 scene.add(new THREE.HemisphereLight('#e0edff','#202539',2.0));const key=new THREE.DirectionalLight('#e8f1ff',3);key.position.set(5,10,9);scene.add(key);const fill=new THREE.DirectionalLight('#9eb3d0',1.2);fill.position.set(-7,4,-7);scene.add(fill);
 ground=mesh(new THREE.PlaneGeometry(25,25),new THREE.MeshBasicMaterial({color:'#101b28',transparent:true,opacity:.45}),scene);ground.rotation.x=-Math.PI/2;ground.position.y=-.055;
 grid=new THREE.GridHelper(160,80,'#2f485c','#1a2c3e');grid.position.y=-.04;grid.material.transparent=true;grid.material.opacity=.5;scene.add(grid);
 collection=new THREE.Group();scene.add(collection);dimGroup=new THREE.Group();scene.add(dimGroup);
 for(const p of pieces){const g=new THREE.Group();g.userData.id=p.id;buildStructure(p,g);p.traces.forEach((tr,j)=>addLED(g,tr,j));g.traverse(o=>{o.userData.pieceId=p.id;});collection.add(g);models.set(p.id,g);}
 ready=true;resize();arrange();fit();new ResizeObserver(resize).observe(host);$('loading').remove();document.body.dataset.ready='true';
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;let visible=true;document.addEventListener('visibilitychange',()=>visible=!document.hidden);
 function tick(now){requestAnimationFrame(tick);if(!visible)return;orbit.update();const time=reduced?1.4:now/1000;for(const mat of animated)mat.uniforms.uTime.value=time;renderer.render(scene,camera);for(const l of labels){const p=l.point.clone().project(camera);l.el.hidden=p.z>1||p.z< -1;if(!l.el.hidden){l.el.style.left=((p.x+1)/2*host.clientWidth)+'px';l.el.style.top=((-p.y+1)/2*host.clientHeight)+'px';}}}requestAnimationFrame(tick);
 // An overview click selects a real, independently identified piece.
 let down;renderer.domElement.addEventListener('pointerdown',e=>down=[e.clientX,e.clientY]);renderer.domElement.addEventListener('pointerup',e=>{if(!overview||!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5)return;const r=renderer.domElement.getBoundingClientRect(),ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),camera);const h=ray.intersectObjects(collection.children,true).find(h=>h.object.visible&&h.object.parent.visible);if(h?.object.userData.pieceId)select(h.object.userData.pieceId);});
}
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{view=b.dataset.view;document.querySelectorAll('[data-view]').forEach(v=>v.classList.toggle('active',v===b));if(ready)fit();});
$('overview').onclick=()=>{overview=!overview;$('overview').setAttribute('aria-pressed',String(overview));if(ready){arrange();fit();}if(overview)toast('Distribución de referencia. Tótems y alimentos de piso 7: ubicación pendiente.');};
$('dimensions').onclick=()=>{dimensionsOn=!dimensionsOn;$('dimensions').setAttribute('aria-pressed',String(dimensionsOn));if(ready)addDimensions();};$('reset-camera').onclick=()=>{if(ready)fit();};
try{init();const id=new URLSearchParams(location.hash.slice(1)).get('item');if(pieces.some(p=>p.id===id))select(id);}catch(err){console.error(err);$('loading').textContent='No se pudo iniciar WebGL. El metrado detallado sigue disponible debajo del visor.';$('loading').style.color='#e5c8d8';document.body.dataset.ready='error';}
// Expose read-only evidence for QA without adding configuration controls to the presentation.
globalThis.CREDICORP_REVIEW=Object.freeze({version:'R04',pieceCount:pieces.length,totemIds:pieces.filter(p=>p.type==='totem').map(p=>p.id),total:totalLength,measured:measuredLength,rows:pieces.map(p=>({id:p.id,total:pieceLength(p),traces:p.traces.length})),palette:[MAGENTA,CYAN]});
