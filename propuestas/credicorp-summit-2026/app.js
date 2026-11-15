import * as THREE from './vendor/three.module.js';
import {OrbitControls} from './vendor/OrbitControls.js';
import {types,pieces,pieceLength,totalLength,measuredLength,stage1Front,CYAN,MAGENTA,roundPath,mazeSpec,mazeArch,roundedPlan} from './data.js?v=r07';
const $=s=>document.getElementById(s),fmt=(v,n=2)=>v.toLocaleString('es-PE',{minimumFractionDigits:n,maximumFractionDigits:n}),m=v=>fmt(v)+' m';
let selected=pieces.find(p=>p.type==='presenting'),view='perspective',overview=false,dimensionsOn=true;
const order=['presenting','innovation','food','analytic','dataMaze','totem','stageA','stageB'];
const representatives=order.map(type=>pieces.find(p=>p.type===type));
const groupFor=type=>pieces.filter(p=>p.type===type);
const typeLength=type=>groupFor(type).reduce((s,p)=>s+pieceLength(p),0);
function zonesFor(type){const zones=new Map();for(const p of groupFor(type))zones.set(p.zone,(zones.get(p.zone)||0)+1);return [...zones].map(([zone,n])=>n+' × '+zone).join(' · ');}
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const status=s=>s==='calculado'?'Calculado':'Provisional';
function toast(t){$('toast').textContent=t;$('toast').classList.add('visible');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').classList.remove('visible'),3000);}
function renderNav(){const q=$('search').value.toLowerCase();$('pieces').innerHTML=representatives.filter(p=>(types[p.type].name+' '+zonesFor(p.type)).toLowerCase().includes(q)).map(p=>`<button class="nav-item ${p.id===selected.id?'active':''}" data-piece="${p.id}" aria-current="${p.id===selected.id?'true':'false'}"><span>${escape(types[p.type].name)}</span><small>${groupFor(p.type).length} uds.</small></button>`).join('');}
function fillInspector(){const t=types[selected.type],qty=groupFor(selected.type).length;$('item-category').textContent=t.category.toUpperCase();$('item-name').textContent=t.name;$('item-zone').textContent=zonesFor(selected.type);$('item-total').textContent=m(pieceLength(selected));$('item-quantity').textContent=qty+' '+(qty===1?'unidad':'unidades');$('item-group-total').textContent=m(typeLength(selected.type));$('item-status').textContent=status(t.status);$('item-status').className='status '+(t.status==='calculado'?'calculated':'');$('model-caption').textContent=overview?'Muestra · un modelo por tipo':t.name+' · modelo de referencia';$('item-note').textContent=t.note;$('item-source').textContent=t.source;$('dimensions-list').innerHTML=t.details.map(([k,v])=>`<div><dt>${escape(k)}</dt><dd>${escape(v)}</dd></div>`).join('');$('trace-list').innerHTML=selected.traces.map(tr=>`<div class="trace"><i class="trace-dot" style="background:${tr.color}"></i><span>${escape(tr.name)}</span><strong>${m(tr.length)}</strong><small>${escape(tr.formula)} · ${status(tr.status)}</small></div>`).join('');$('view-source').hidden=!t.image;$('view-label').textContent=overview?'MUESTRA · UN MODELO POR TIPO':'MODELO DE REFERENCIA · 1 UNIDAD';document.querySelectorAll('.meter-row').forEach(el=>el.classList.toggle('active',el.dataset.piece===selected.id));}
function renderTables(){
 $('stat-pieces').textContent=pieces.length;$('piece-count').textContent=representatives.length;$('stat-total').textContent=m(totalLength);$('stat-measured').textContent=m(measuredLength);$('table-total').textContent=m(totalLength);
 $('type-summary').innerHTML=representatives.map(p=>{const a=groupFor(p.type);return `<button class="summary-type" data-piece="${p.id}"><b>${types[p.type].name}</b><small>${a.length} ${a.length===1?'unidad':'unidades'} × ${m(pieceLength(p))}</small><strong>${m(typeLength(p.type))}</strong></button>`;}).join('');
 $('meter-rows').innerHTML=representatives.map(p=>{const t=types[p.type],qty=groupFor(p.type).length;return `<tr class="meter-row ${p.id===selected.id?'active':''}" data-piece="${p.id}"><td>${escape(t.name)}</td><td class="quantity-cell">${qty}</td><td>${escape(t.dimensions)}</td><td>${m(pieceLength(p))}</td><td class="type-total">${m(typeLength(p.type))}</td><td><span class="status ${t.status==='calculado'?'calculated':''}">${status(t.status)}</span></td><td><button class="expand-button" data-expand="${p.id}" aria-expanded="false" aria-label="Desglosar ${escape(t.name)}">+</button></td></tr><tr class="detail-row" id="detail-${p.id}" hidden><td colspan="7"><table aria-label="Desglose ${escape(t.name)}"><thead><tr><th>RECORRIDO POR UNIDAD</th><th>FÓRMULA</th><th>m / UNIDAD</th><th>m × ${qty} UDS.</th><th>BASE</th></tr></thead><tbody>${p.traces.map(tr=>`<tr><td>${escape(tr.name)}</td><td>${escape(tr.formula)}</td><td>${m(tr.length)}</td><td>${m(tr.length*qty)}</td><td>${status(tr.status)}</td></tr>`).join('')}</tbody></table><p>${escape(zonesFor(p.type))}<br>${escape(t.note)}<br>Fuente: ${escape(t.source)}</p></td></tr>`;}).join('');
}
function csv(){
 const rows=[['tipo','elemento','cantidad','ubicacion','ancho_m','fondo_m','alto_modelo_m','recorrido','formula','longitud_unitaria_m','longitud_total_m','base_recorrido','base_elemento','fuente']];
 for(const p of representatives){const t=types[p.type],qty=groupFor(p.type).length;
  for(const tr of p.traces)rows.push([p.type,t.name,qty,zonesFor(p.type),t.w,t.d,t.h,tr.name,tr.formula,tr.length.toFixed(6),(tr.length*qty).toFixed(6),tr.status,t.status,t.source]);
  rows.push([p.type,t.name,qty,zonesFor(p.type),t.w,t.d,t.h,'TOTAL ÍTEM','',(pieceLength(p)).toFixed(6),typeLength(p.type).toFixed(6),'',t.status,t.source]);
 }
 rows.push(['TOTAL MODELO','',pieces.length,'','','','','TOTAL PROVISIONAL','','',totalLength.toFixed(6)]);
 const quote=v=>'"'+String(v??'').replace(/"/g,'""')+'"',blob=new Blob(['\ufeff'+rows.map(r=>r.map(quote).join(';')).join('\r\n')],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='LIGHTMAN_Credicorp_Metrado_14Nov2026_R07.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Metrado descargado con cantidades, metros unitarios y totales por ítem.');
}
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
  for(const tr of p.traces){
   const [a,b]=tr.points;
   // Keep the support behind the luminous centreline. A concentric opaque
   // support with radius .035 enclosed the LED core (radius .013).
   const supportA=[a[0],a[1],a[2]-.055],supportB=[b[0],b[1],b[2]-.055];
   beam(parent,supportA,supportB,.035,darkMat);
   box(parent,a[0],.03,a[2],.09,.06,.20,edgeMat);
  }
  sign(parent,'MR ANALITYC','',1.3,.23,0,.12,.82);
 }else if(p.type==='totem'){
  box(parent,0,.735,0,.4,1.47,.4,darkMat);box(parent,0,.03,0,.48,.06,.48,edgeMat);
  const screen=box(parent,0,1.49,0,.34,.014,.27,screenMat);screen.rotation.x=-.09;
  sign(parent,'SUMMIT','2026',.32,.16,0,1.19,.203);
 }else if(p.type==='dataMaze'){
  const s=mazeSpec,frameMat=new THREE.MeshStandardMaterial({color:'#183141',roughness:.40,metalness:.28});
  const lowerMat=new THREE.MeshStandardMaterial({color:'#122735',roughness:.43,metalness:.24});
  const upperMat=new THREE.MeshStandardMaterial({color:'#112332',roughness:.49,metalness:.20});
  for(const [level,material] of [[s.lower,lowerMat],[s.upper,upperMat]]){
   const contour=roundedPlan(level.w,level.d,level.r,0);
   const sh=new THREE.Shape(contour.map(v=>new THREE.Vector2(v[0],v[2])));
   const geo=new THREE.ExtrudeGeometry(sh,{depth:level.h,steps:1,bevelEnabled:false});
   geo.rotateX(-Math.PI/2);mesh(geo,material,parent,0,level.y,0);
  }
  const outer=mazeArch(-s.width/2,s.width/2,s.floorY,s.height,s.outerRadius,0).map(v=>[v[0],v[1]]);
  const inner=mazeArch(s.innerLeft,s.innerRight,s.floorY,s.innerTop,s.innerRadius,0).map(v=>[v[0],v[1]]);
  polygon(parent,[...outer,...inner.slice().reverse()],s.frameDepth,s.frontZ-s.frameDepth,frameMat);
  const openingWidth=s.innerRight-s.innerLeft,openingHeight=s.innerTop-s.floorY,openingX=(s.innerLeft+s.innerRight)/2;
  box(parent,openingX,s.floorY+openingHeight/2,-1.30,openingWidth+.05,openingHeight,.07,darkMat);
  const graphics=dataMazeGraphics();
  const graphic=(tex,w,h,x,y,z,transparent=false)=>mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:tex,transparent,depthWrite:!transparent,toneMapped:false}),parent,x,y,z);
  graphic(graphics.back,openingWidth,openingHeight,openingX,s.floorY+openingHeight/2,-1.259);
  graphic(graphics.header,2.40,.35,0,2.18,s.frontZ+.010,true);
  graphic(graphics.brand,.34,1.67,-1.16,1.12,s.frontZ+.011,true);
  const floor=graphic(graphics.floor,2.39,2.39,0,s.floorY+.003,0);floor.rotation.x=-Math.PI/2;
  const cyanFill=new THREE.PointLight(CYAN,.65,3,2);cyanFill.position.set(-1.23,.7,-.55);parent.add(cyanFill);
  const magentaFill=new THREE.PointLight(MAGENTA,.42,2.5,2);magentaFill.position.set(1.10,.9,-.58);parent.add(magentaFill);
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
function dataMazeGraphics(){
 // All four surfaces are reference print/branding, not physical LED runs.
 const canvas=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
 const texture=c=>{const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),8);return t;};
 const header=canvas(1600,260),hc=header.getContext('2d');
 hc.textAlign='center';hc.textBaseline='middle';hc.font='600 172px Segoe UI, Arial';hc.shadowColor=CYAN;hc.shadowBlur=20;hc.fillStyle='#c9fbff';hc.fillText('Data Maze',800,130);
 const brand=canvas(300,1600),bc=brand.getContext('2d');bc.translate(150,800);bc.rotate(-Math.PI/2);bc.textAlign='center';bc.textBaseline='middle';bc.font='500 120px Segoe UI, Arial';
 const chars=[...'CREDICORP'],spacing=142,start=-(chars.length-1)*spacing/2;
 chars.forEach((ch,i)=>{bc.fillStyle=i===6?MAGENTA:'#d9f5fc';bc.fillText(i===6?'◇':ch,start+i*spacing,0);});
 let seed=27401;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 const makeCircuits=(floor=false)=>{
  const c=canvas(1024,1024),ctx=c.getContext('2d');
  const bg=ctx.createRadialGradient(480,430,25,512,512,760);bg.addColorStop(0,floor?'#0b2739':'#083140');bg.addColorStop(.6,'#071c2b');bg.addColorStop(1,'#050e1a');ctx.fillStyle=bg;ctx.fillRect(0,0,1024,1024);
  const stroke=(pts,color,width,glow=0)=>{ctx.beginPath();ctx.moveTo(...pts[0]);for(const p of pts.slice(1))ctx.lineTo(...p);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineJoin='round';ctx.lineCap='round';ctx.shadowColor=color;ctx.shadowBlur=glow;ctx.stroke();ctx.shadowBlur=0;};
  for(let i=0;i<(floor?90:72);i++){
   const x=20+random()*984,y=random()*1024,step=20+random()*70,dir=random()>.5?1:-1;
   const pts=[[x,y],[x,y+step],[x+dir*step*.65,y+step],[x+dir*step*.65,y+step*2.6]];
   stroke(pts,i%5===0?'#72366c':'#175468',floor?1.4:2);
   ctx.beginPath();ctx.arc(x,y,1.8+random()*2,0,Math.PI*2);ctx.fillStyle=i%5===0?'#bb408d':'#2592ac';ctx.fill();
  }
  for(let i=0;i<430;i++){const x=random()*1024,y=random()*1024;ctx.globalAlpha=.15+random()*.5;ctx.fillStyle=i%7===0?MAGENTA:CYAN;ctx.beginPath();ctx.arc(x,y,.5+random()*1.6,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
  if(floor){
   stroke([[265,315],[760,315],[760,815],[265,815],[265,315]],'#72bad0',3,3);
   for(const [x,y] of [[265,315],[760,315],[760,815],[265,815]]){ctx.fillStyle='#a7e5ec';ctx.fillRect(x-4,y-4,8,8);}
  }else{
   const maze=[[240,855],[240,265],[270,230],[805,230],[850,190],[850,130],[894,130],[894,245],[837,290],[735,290],[735,395],[642,395],[642,325],[402,325],[402,438],[536,438],[536,528],[710,528],[710,726],[611,726],[611,625],[391,625],[391,805],[280,805],[240,855]];
   stroke(maze,'#0f677e',23,15);stroke(maze,'#54d2e4',8,7);
   const branch=[[275,750],[275,293],[310,265],[770,265],[770,330],[690,330],[690,430],[602,430],[602,365],[440,365],[440,478],[498,478],[498,568],[670,568],[670,685],[650,685]];
   stroke(branch,'#9b4c9c',3,4);
   for(let i=0;i<maze.length-1;i+=2){const [x,y]=maze[i];ctx.shadowColor=CYAN;ctx.shadowBlur=9;ctx.fillStyle=i%4===0?'#92edfa':MAGENTA;ctx.beginPath();ctx.arc(x,y,4,0,Math.PI*2);ctx.fill();}ctx.shadowBlur=0;
   // Small printed data nodes keep the central maze distinct from a generic F.
   for(const [x,y] of [[300,710],[615,490],[800,150]]){ctx.strokeStyle='#62d3e0';ctx.lineWidth=2;ctx.strokeRect(x-18,y-18,36,36);ctx.strokeRect(x-9,y-9,18,18);}
  }
  return texture(c);
 };
 return {header:texture(header),brand:texture(brand),back:makeCircuits(false),floor:makeCircuits(true)};
}
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
function select(id){const requested=pieces.find(p=>p.id===id);if(!requested)return;const p=representatives.find(p=>p.type===requested.type);selected=p;overview=false;$('overview').setAttribute('aria-pressed','false');renderNav();fillInspector();document.querySelector('.inspector').scrollTop=0;if(ready){arrange();fit();}location.hash='item='+p.id;}
function arrange(){const positions=[[-12,-12],[0,-12],[10,-12],[-12,0],[0,0],[10,0],[-12,12],[10,12]];for(const [i,p] of representatives.entries()){const g=models.get(p.id);g.visible=overview||p.id===selected.id;g.position.set(overview?positions[i][0]:0,0,overview?positions[i][1]:0);g.rotation.y=0;}ground.scale.setScalar(overview?3:1);grid.visible=overview;addDimensions();fillInspector();}
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
 for(const p of representatives){const g=new THREE.Group();g.userData.id=p.id;buildStructure(p,g);p.traces.forEach((tr,j)=>addLED(g,tr,j));g.traverse(o=>{o.userData.pieceId=p.id;});collection.add(g);models.set(p.id,g);}
 ready=true;resize();arrange();fit();new ResizeObserver(resize).observe(host);$('loading').remove();document.body.dataset.ready='true';
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;let visible=true;document.addEventListener('visibilitychange',()=>visible=!document.hidden);
 function tick(now){requestAnimationFrame(tick);if(!visible)return;orbit.update();const time=reduced?1.4:now/1000;for(const mat of animated)mat.uniforms.uTime.value=time;renderer.render(scene,camera);for(const l of labels){const p=l.point.clone().project(camera);l.el.hidden=p.z>1||p.z< -1;if(!l.el.hidden){l.el.style.left=((p.x+1)/2*host.clientWidth)+'px';l.el.style.top=((-p.y+1)/2*host.clientHeight)+'px';}}}requestAnimationFrame(tick);
 // An overview click selects a real, independently identified piece.
 let down;renderer.domElement.addEventListener('pointerdown',e=>down=[e.clientX,e.clientY]);renderer.domElement.addEventListener('pointerup',e=>{if(!overview||!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5)return;const r=renderer.domElement.getBoundingClientRect(),ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),camera);const h=ray.intersectObjects(collection.children,true).find(h=>h.object.visible&&h.object.parent.visible);if(h?.object.userData.pieceId)select(h.object.userData.pieceId);});
}
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{view=b.dataset.view;document.querySelectorAll('[data-view]').forEach(v=>v.classList.toggle('active',v===b));if(ready)fit();});
$('overview').onclick=()=>{overview=!overview;$('overview').setAttribute('aria-pressed',String(overview));if(ready){arrange();fit();}if(overview)toast('Un modelo por tipo. Consulta las cantidades reales en cada ficha.');};
$('dimensions').onclick=()=>{dimensionsOn=!dimensionsOn;$('dimensions').setAttribute('aria-pressed',String(dimensionsOn));if(ready)addDimensions();};$('reset-camera').onclick=()=>{if(ready)fit();};
try{init();const id=new URLSearchParams(location.hash.slice(1)).get('item');if(pieces.some(p=>p.id===id))select(id);}catch(err){console.error(err);$('loading').textContent='No se pudo iniciar WebGL. El metrado detallado sigue disponible debajo del visor.';$('loading').style.color='#e5c8d8';document.body.dataset.ready='error';}
// Expose read-only evidence for QA without adding configuration controls to the presentation.
globalThis.CREDICORP_REVIEW=Object.freeze({version:'R07',pieceCount:pieces.length,totemIds:pieces.filter(p=>p.type==='totem').map(p=>p.id),total:totalLength,measured:measuredLength,rows:pieces.map(p=>({id:p.id,total:pieceLength(p),traces:p.traces.length})),palette:[MAGENTA,CYAN]});
