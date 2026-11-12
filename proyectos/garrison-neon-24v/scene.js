/* LIGHTMAN · Garrison · R04. Unidades: metros. Arquitectura referencial. */
(() => {
'use strict';
const $=id=>document.getElementById(id), host=$('scene');
const DATA={count:10,length:10,voltage:24,width:6.5,height:7.3,spacing:1.9,color:'#0024ff',brightness:1,red:false,on:true};
let renderer;
try {renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});} catch(e){$('loading').textContent='El visor necesita WebGL. Abre esta propuesta en un navegador con aceleración gráfica.';return;}
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;host.appendChild(renderer.domElement);$('loading').remove();
const scene=new THREE.Scene();scene.background=new THREE.Color('#101119');scene.fog=new THREE.FogExp2('#101119',.009);
const camera=new THREE.PerspectiveCamera(76,1,.08,180);
const hemi=new THREE.HemisphereLight(0xaac6ee,0x292023,.85);scene.add(hemi); scene.add(new THREE.AmbientLight(0xe4e3dc,.65));
const moon=new THREE.DirectionalLight(0xb9cef5,.6);moon.position.set(4,18,10);scene.add(moon);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;moon.castShadow=true;moon.shadow.mapSize.set(1024,1024);Object.assign(moon.shadow.camera,{left:-14,right:14,top:18,bottom:-18,near:.5,far:60});moon.shadow.bias=-.001;
const arch=new THREE.Group(), neon=new THREE.Group(), accents=new THREE.Group(), lamps=new THREE.Group();scene.add(arch,neon,accents,lamps);
const materials={wall:new THREE.MeshStandardMaterial({color:0x55545d,roughness:.84}),edge:new THREE.MeshStandardMaterial({color:0x3e3b3d,metalness:.55,roughness:.4}),metal:new THREE.MeshStandardMaterial({color:0x35393f,metalness:.75,roughness:.4}),dark:new THREE.MeshStandardMaterial({color:0x202735,roughness:.7}),glass:new THREE.MeshStandardMaterial({color:0x344151,metalness:.6,roughness:.16}),curb:new THREE.MeshStandardMaterial({color:0x65605a,roughness:.9}),paint:new THREE.MeshStandardMaterial({color:0x9e9a8d,roughness:.95}),floor:new THREE.MeshStandardMaterial({color:0x49494d,metalness:.15,roughness:.4}),poster:new THREE.MeshBasicMaterial({color:0x821f33}),warm:new THREE.MeshBasicMaterial({color:0xffcb91})};
function box(w,h,d,x,y,z,mat,parent=arch){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);parent.add(m);return m;}
function beam(a,b,r,mat,parent=arch){const v=new THREE.Vector3().subVectors(b,a),m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,v.length(),6),mat);m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());parent.add(m);return m;}
function clear(group){while(group.children.length){const child=group.children[0];child.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material&&o.material.userData.owned)o.material.dispose();});group.remove(child);}}
function owned(m){m.userData.owned=true;return m;}
function glowPath(points,color,r=.012,parent=accents,intensity=1){const curve=new THREE.CatmullRomCurve3(points),group=new THREE.Group();const core=owned(new THREE.MeshBasicMaterial({color}));const soft=owned(new THREE.MeshBasicMaterial({color,transparent:true,opacity:.14*intensity,depthWrite:false,blending:THREE.AdditiveBlending}));const outer=owned(new THREE.MeshBasicMaterial({color,transparent:true,opacity:.045*intensity,depthWrite:false,blending:THREE.AdditiveBlending}));group.add(new THREE.Mesh(new THREE.TubeGeometry(curve,Math.max(8,points.length*2),r,7,false),core),new THREE.Mesh(new THREE.TubeGeometry(curve,Math.max(8,points.length*2),r*3,7,false),soft),new THREE.Mesh(new THREE.TubeGeometry(curve,Math.max(8,points.length*2),r*7,7,false),outer));parent.add(group);return group;}
const V=(x,y,z)=>new THREE.Vector3(x,y,z);
// Materiales UV locales: el modelo se mantiene coherente desde cualquier cámara.
const surfaceMaterial=window.makeGarrisonMaterials(THREE,scene);
const neonVisuals={uMusicTime:{value:0},uVisualMode:{value:0},uVisuals:{value:0},uSpeed:{value:1},uMusicalFlash:{value:0}};
function buildArchitecture(){clear(arch);clear(accents);const summary=window.buildGarrisonArchitecture({THREE,group:arch,accents,DATA,surfaceMaterial,glowPath});arch.traverse(o=>{if(o.isMesh){o.layers.enable(2);o.castShadow=true;o.receiveShadow=true;}});host.dataset.architecture=JSON.stringify(summary);}
// Catenaria: L = 2 a sinh(w / 2a). Se resuelve a para conservar 10 m.
function solveCatenary(width,length){let low=.02,high=10000;for(let n=0;n<90;n++){const mid=(low+high)/2;if(2*mid*Math.sinh(width/(2*mid))>length)low=mid;else high=mid;}const a=(low+high)/2;return {a,sag:a*(Math.cosh(width/(2*a))-1)};}
let neonMats=[],pointsOfLight=[];
function buildNeon(){
 clear(neon);clear(lamps);neonMats=[];pointsOfLight=[];const {a,sag}=solveCatenary(DATA.width,DATA.length);
 const color=new THREE.Color(DATA.color),coreColor=color.clone();
 for(let i=0;i<DATA.count;i++){
  const z=(i-4.5)*DATA.spacing,pts=[];
  for(let j=0;j<=100;j++){const x=-DATA.width/2+DATA.width*j/100;pts.push(V(x,DATA.height+a*(Math.cosh(x/a)-Math.cosh(DATA.width/(2*a))),z));}
  const group=glowPath(pts,DATA.color,.019,neon);group.traverse(o=>{o.layers.enable(1);if(o.material)o.material.toneMapped=false;});
  group.children[0].material.color.copy(coreColor);group.userData={strip:i+1,lengthM:10};
  group.children.forEach((o,j)=>{window.configureGarrisonNeon(o.material,i,neonVisuals);neonMats.push({index:i,mat:o.material,base:j===0?1:j===1?.45:.18,core:j===0});if(j===1)o.material.opacity=.45;if(j===2)o.material.opacity=.18;});
  // Suspensión conceptual independiente: cable fino sobre el difusor.
  const support=pts.map(p=>V(p.x,p.y+.04,p.z));const g=new THREE.BufferGeometry().setFromPoints(support);const m=owned(new THREE.LineBasicMaterial({color:0x767a83,transparent:true,opacity:.5}));neon.add(new THREE.Line(g,m));
  for(const sign of [-1,1]){const x=sign*DATA.width/2;box(.065,.14,.15,x,DATA.height,z,materials.metal,neon);}
  if(i%2===0){const light=new THREE.PointLight(color,1.2,10,2);light.position.set(0,DATA.height-sag+.1,z);lamps.add(light);pointsOfLight.push(light);}
 }
 const m=v=>v.toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2})+' m';
 $('sag').textContent=m(sag);$('clearance').textContent=m(DATA.height-sag);$('coverage').textContent=m((DATA.count-1)*DATA.spacing);
 const low=DATA.height-sag<2.5;$('geometry-note').textContent=low?'Altura central reducida: revisar altura de suspensión y ancho.':'Medidas referenciales, pendientes de levantamiento.';
 host.dataset.width=String(DATA.width);host.dataset.height=String(DATA.height);host.dataset.spacing=String(DATA.spacing);host.dataset.strips=String(DATA.count);host.dataset.lengthEach='10';host.dataset.total='100';host.dataset.curveLength=(2*a*Math.sinh(DATA.width/(2*a))).toFixed(8);host.dataset.sag=String(sag);host.dataset.clearance=String(DATA.height-sag);
 updateLight();
}
function updateLight(){neonVisuals.uVisuals.value=0;neonVisuals.uMusicalFlash.value=0;const power=DATA.on?DATA.brightness:0;neonMats.forEach(({mat,base,core})=>{if(core){mat.color.set(DATA.color).multiplyScalar(power>.001?2+6*power:.001);}else{mat.color.set(DATA.color);mat.opacity=base*power*1.8;}});pointsOfLight.forEach(l=>{l.color.set(DATA.color);l.intensity=8*power;});host.dataset.neon=String(DATA.on);host.dataset.color=DATA.color;host.dataset.brightness=String(DATA.brightness);}
function setAmbient(){scene.background.set(DATA.red?'#160c12':'#101119');scene.fog.color.copy(scene.background);accents.visible=true;accents.traverse(o=>{if(o.material&&o.material.userData.owned){o.material.color.set(DATA.red?'#ff263b':'#fff0d8');o.material.userData.studioColor=o.material.color.clone();}});hemi.intensity=DATA.red?.6:.85;host.dataset.ambient=DATA.red?'rojo':'blanco';}
// Giro libre, zoom y gesto de dos dedos. La cámara siempre mira al objetivo.
const orbit={target:V(0,3.6,0),r:18,theta:.13,phi:1.60};
function renderCamera(){camera.position.set(orbit.target.x+orbit.r*Math.sin(orbit.phi)*Math.sin(orbit.theta),orbit.target.y+orbit.r*Math.cos(orbit.phi),orbit.target.z+orbit.r*Math.sin(orbit.phi)*Math.cos(orbit.theta));camera.lookAt(orbit.target);}
function view(name){const small=host.clientWidth<700;
 const presets={pasaje:{target:V(0,4,-3),r:small?23:18.6,theta:.04,phi:1.67},abajo:{target:V(0,5.3,0),r:small?8.5:7,theta:.16,phi:2.27},aerea:{target:V(0,2.5,0),r:small?31:27,theta:0,phi:.08},frente:{target:V(0,4.45,0),r:small?22:18,theta:0,phi:1.58}};
 Object.assign(orbit,presets[name]);camera.fov=name==='pasaje'?74:63;camera.updateProjectionMatrix();document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===name));host.dataset.view=name;resize();
 $('view-caption').textContent={pasaje:'Diez tiras transversales · vista del recorrido',abajo:'Bajo las curvas · vista de la luz suspendida',aerea:'Distribución · 10 tiras × 10 m',frente:'Sección transversal · caída de cada tira'}[name];renderCamera();
}
const pointers=new Map();let previousDistance=0;
renderer.domElement.addEventListener('pointerdown',e=>{renderer.domElement.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===2){const p=[...pointers.values()];previousDistance=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);}});
renderer.domElement.addEventListener('pointermove',e=>{const previous=pointers.get(e.pointerId);if(!previous)return;if(pointers.size===1){orbit.theta-=(e.clientX-previous.x)*.006;orbit.phi=Math.max(.1,Math.min(Math.PI-.1,orbit.phi+(e.clientY-previous.y)*.005));}pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===2){const p=[...pointers.values()],d=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);if(previousDistance&&d)orbit.r=Math.max(2,Math.min(65,orbit.r*previousDistance/d));previousDistance=d;}renderCamera();});
for(const name of ['pointerup','pointercancel','lostpointercapture'])renderer.domElement.addEventListener(name,e=>{pointers.delete(e.pointerId);previousDistance=0;});
renderer.domElement.addEventListener('wheel',e=>{e.preventDefault();orbit.r=Math.max(2,Math.min(65,orbit.r*Math.exp(e.deltaY*.001)));renderCamera();},{passive:false});
host.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-','='].includes(e.key))return;e.preventDefault();if(e.key==='ArrowLeft')orbit.theta-=.08;if(e.key==='ArrowRight')orbit.theta+=.08;if(e.key==='ArrowUp')orbit.phi=Math.max(.1,orbit.phi-.08);if(e.key==='ArrowDown')orbit.phi=Math.min(Math.PI-.1,orbit.phi+.08);if(e.key==='+'||e.key==='=')orbit.r=Math.max(2,orbit.r*.9);if(e.key==='-')orbit.r=Math.min(65,orbit.r*1.1);renderCamera();});
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>view(b.dataset.view));
document.querySelectorAll('[data-color]').forEach(b=>b.onclick=()=>{DATA.color=b.dataset.color;document.querySelectorAll('[data-color]').forEach(el=>el.classList.toggle('active',el===b));updateLight();});
$('brightness').oninput=e=>{DATA.brightness=Number(e.target.value)/100;$('brightness-value').textContent=e.target.value+' %';updateLight();};
$('neon').onclick=()=>{DATA.on=!DATA.on;$('neon').setAttribute('aria-pressed',String(DATA.on));$('neon').textContent=DATA.on?'Neón encendido':'Neón apagado';updateLight();};
$('ambient').onclick=()=>{DATA.red=!DATA.red;$('ambient').setAttribute('aria-pressed',String(DATA.red));$('ambient').textContent=DATA.red?'Ambiente blanco':'Ambiente rojo';setAmbient();};
for(const id of ['width','height','spacing']){
 const apply=()=>{const input=$(id),raw=Number(input.value);if(!Number.isFinite(raw)||!input.value)input.value=String(DATA[id]);else input.value=String(Math.max(Number(input.min),Math.min(Number(input.max),raw)));DATA[id]=Number(input.value);buildArchitecture();buildNeon();setAmbient();};
 $(id).onchange=apply;
 $(id).addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();apply();}});
}
if($('photo')){$('photo').textContent='Fotos reales';$('photo').onclick=()=>document.getElementById('referencias').scrollIntoView({behavior:'smooth'});}
$('reset').onclick=()=>{Object.assign(DATA,{width:6.5,height:7.3,spacing:1.9,color:'#0024ff',brightness:1,red:false,on:true});for(const id of ['width','height','spacing'])$(id).value=DATA[id];$('brightness').value=100;$('brightness-value').textContent='100 %';$('neon').textContent='Neón encendido';$('neon').setAttribute('aria-pressed','true');$('ambient').textContent='Ambiente rojo';$('ambient').setAttribute('aria-pressed','false');document.querySelectorAll('[data-color]').forEach(b=>b.classList.toggle('active',b.dataset.color===DATA.color));buildArchitecture();buildNeon();setAmbient();view('pasaje');};
$('fullscreen').onclick=()=>{const viewer=document.querySelector('.viewer'),expanded=viewer.classList.toggle('expanded');document.body.style.overflow=expanded?'hidden':'';$('fullscreen').setAttribute('aria-label',expanded?'Salir de pantalla completa':'Pantalla completa');$('fullscreen').innerHTML=expanded?'⛶ <span>Reducir</span>':'⛶ <span>Ampliar</span>';};
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!document.querySelector('dialog[open]')){document.querySelector('.viewer').classList.remove('expanded');document.body.style.overflow='';$('fullscreen').setAttribute('aria-label','Pantalla completa');$('fullscreen').innerHTML='⛶ <span>Ampliar</span>';}});
const resize=()=>{const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h,false);renderer.domElement.style.width=w+'px';renderer.domElement.style.height=h+'px';camera.aspect=w/h;camera.updateProjectionMatrix();};new ResizeObserver(resize).observe(host);
buildArchitecture();buildNeon();setAmbient();resize();view('pasaje');
window.garrisonViewer={DATA,scene,camera,renderer,neon,arch,lamps,accents,neonVisuals,neonMats:()=>neonMats,pointsOfLight:()=>pointsOfLight,view,renderCamera,updateLight,buildArchitecture,buildNeon,setAmbient};
const neonBloom=window.makeGarrisonNeonBloom(THREE,renderer);
function frame(){if(window.garrisonConcert)window.garrisonConcert.tick();const active=window.garrisonConcert?.state.mode==='concert'&&window.garrisonConcert?.state.started;neonBloom.render(scene,camera,active&&host.dataset.flash==='1',active);requestAnimationFrame(frame);}frame();host.dataset.ready='true';
})();
