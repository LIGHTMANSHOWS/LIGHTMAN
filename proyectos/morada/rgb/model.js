import * as THREE from '../vendor/three.module.js';
import { OrbitControls } from '../vendor/OrbitControls.js';
import { shelves, ledPaths, HEIGHT_DELTA as DY } from './layout.js?v=20261027-calido-altura5-r4';

const $=id=>document.getElementById(id);
const zoneSpecs=[
 {id:'frisos',name:'Frisos completos',detail:'Frente + ambos laterales',description:'Contorno del friso frontal y de los dos retornos laterales.'},
 {id:'esquinas',name:'Esquinas',detail:'Aristas exteriores',description:'Cuatro aristas exteriores desde la base hasta el friso.'},
 {id:'arcos',name:'Arcos laterales',detail:'Dos marcos de acceso',description:'Dos marcos rectangulares laterales, cada uno con dos verticales y travesaño superior. Ubicación referencial.'},
 {id:'techo',name:'Techo',detail:'Perímetro interior',description:'Delineado de los cuatro bordes interiores del techo. El centro es opaco.'},
 {id:'repisas',name:'Tres repisas',detail:'Retroiluminación posterior',description:'Cinta oculta detrás de cada repisa, con luz reflejada en el muro. Tres recorridos posteriores, sin delineado frontal. Ubicación y largos referenciales.'}
];
const colors={warm:Array(5).fill('#ffd4a2'),morada:['#aa35ff','#aa35ff','#aa35ff','#aa35ff','#aa35ff'],contrast:['#a62bff','#ff3179','#15e5ed','#2477ff','#ff8b24'],white:Array(5).fill('#ffffff')};
let state=zoneSpecs.map((_,i)=>({color:colors.warm[i],brightness:85,on:true})),selected=0,preset='warm',isolate=false;
function valid(a){return Array.isArray(a)&&a.length===5&&a.every(s=>s&&/^#[\da-f]{6}$/i.test(s.color)&&Number.isFinite(s.brightness)&&s.brightness>=0&&s.brightness<=100&&typeof s.on==='boolean')}
try{let raw=new URLSearchParams(location.hash.slice(1)).get('rgb3d')||localStorage.getItem('lightman-morada-3d-warm-r3');if(raw){let a=JSON.parse(raw);if(valid(a)){state=a;preset=''}}}catch(e){}

let renderer;
try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power',preserveDrawingBuffer:true})}
catch(e){window.dispatchEvent(new Event('morada-viewer-error'));throw e}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.8));
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.06;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.domElement.setAttribute('aria-label','Modelo tridimensional del stand Morada. Arrastra para girar, usa las vistas para revisar frisos y laterales.');
renderer.domElement.tabIndex=0;$('viewer').appendChild(renderer.domElement);$('loading').hidden=true;
const scene=new THREE.Scene(),model=new THREE.Group();scene.background=new THREE.Color('#17151d');model.name='Morada - RGB convencional - modelo conceptual';scene.add(model);
const camera=new THREE.PerspectiveCamera(38,1,.1,100);camera.position.set(6.4,3.2+DY*.8,8.2+DY*1.1);
const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,1.35+DY/2,0);controls.enableDamping=true;controls.dampingFactor=.07;controls.minDistance=5.5;controls.maxDistance=22;controls.minPolarAngle=.06;controls.maxPolarAngle=Math.PI/2.02;controls.enablePan=false;controls.autoRotate=false;controls.autoRotateSpeed=.3;controls.update();
const mat=(color,roughness=.7)=>new THREE.MeshStandardMaterial({color,roughness,metalness:.06});
const ivory=mat('#e8e3de'),purple=mat('#49215e'),wood=mat('#a07756'),dark=mat('#342a31'),black=mat('#221e24'),metal=mat('#99969a',.5);
function box(w,h,d,x,y,z,m=ivory,parent=model){let mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh}
function panel(w,h,x,y,z,texture,rot=0){const m=new THREE.MeshStandardMaterial({map:texture,roughness:.85,side:THREE.DoubleSide});const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h),m);mesh.position.set(x,y,z);mesh.rotation.y=rot;model.add(mesh);return mesh}
function textTexture(text,bg,fg='#fff',w=1024,h=256,font='bold 150px Arial'){const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d');if(bg){ctx.fillStyle=bg;ctx.fillRect(0,0,w,h)}ctx.fillStyle=fg;ctx.font=font;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,w/2,h/2);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),8);return t}
// Base 5 m front, 3 m depth and 5 m overall height confirmed by Cintia.
// Detailed frieze, arch and shelf dimensions remain conceptual pending the drawing.
box(5.2,.09,3.2,0,-.045,0,mat('#666064'));
const structureH=2.35+DY;box(5,structureH,.08,0,structureH/2,-1.5);
for(const x of [-2.5,2.5])for(const z of [-1.5,1.5])box(.14,structureH,.14,x,structureH/2,z);
// Front and two side friezes, with no assumed rear illuminated frieze.
box(5.16,.64,.16,0,2.68+DY,1.5,purple);
box(.16,.64,3.13,-2.5,2.68+DY,0,purple);box(.16,.64,3.13,2.5,2.68+DY,0,purple);
const ceiling=box(5,.055,3,0,2.325+DY,0,ivory);ceiling.name='Techo opaco - abrir para vista interior';
// Inset side portals make the two rectangular arches visible from either side.
for(const x of [-2.41,2.41]){for(const z of [-1.22,1.22])box(.115,2.23+DY,.12,x,(2.23+DY)/2,z);box(.115,.115,2.56,x,2.23+DY,0)}
// Existing display panels occupy the front jambs, not the open side entrances.
for(const x of [-2.21,2.21])box(.46,2.23+DY,.11,x,(2.23+DY)/2,1.43);
function logo(width,x,y,z,rot){const group=new THREE.Group();group.name='Logo Morada blanco independiente';group.position.set(x,y,z);group.rotation.y=rot;const texture=textTexture('morada',null,'#ffffff',1024,256,'bold 226px Arial');const mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,width/4),new THREE.MeshBasicMaterial({map:texture,transparent:true,toneMapped:false,depthWrite:false}));group.add(mesh);model.add(group)}
logo(2.02,1.15,2.68+DY,1.586,0);logo(1.6,2.586,2.68+DY,0,Math.PI/2);logo(1.6,-2.586,2.68+DY,0,-Math.PI/2);
const displayTex=textTexture('Tu nueva morada.','#89766d','#ffffff',1400,500,'64px Arial');
box(3.76,1.13,.04,0,1.63,-1.432,black);const backPoster=panel(3.7,1.07,0,1.63,-1.405,displayTex);
const posterTex=textTexture('morada','#ebe7e4','#632d81',400,1200,'bold 70px Arial');
const leftPoster=panel(.40,1.68,-2.21,1.38,1.49,posterTex),rightPoster=panel(.40,1.68,2.21,1.38,1.49,posterTex);
const loader=new THREE.TextureLoader();let pendingTextures=3;
function texture(rect,callback){loader.load('../assets/morada-frontal-referencia.png',t=>{t.colorSpace=THREE.SRGBColorSpace;t.repeat.set(rect[2]/517,rect[3]/400);t.offset.set(rect[0]/517,(400-rect[1]-rect[3])/400);t.anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),8);callback(t);pendingTextures--;if(!pendingTextures)document.documentElement.dataset.textures='ready'},undefined,()=>{pendingTextures--;})}
texture([129,173,247,87],t=>{backPoster.material.map=t;backPoster.material.needsUpdate=true});
texture([38,153,30,171],t=>{leftPoster.material.map=t;leftPoster.material.needsUpdate=true});texture([449,158,25,164],t=>{rightPoster.material.map=t;rightPoster.material.needsUpdate=true});
// Exactly three shelves: one low run and two short upper shelves.
shelves.forEach((s,i)=>{const shelf=box(s.w,.045,s.d,s.x,s.y,s.z,i===0?wood:ivory);shelf.name='Repisa '+(i+1);});
box(4.30,.38,.33,0,.37,-1.25,mat('#b3a395'));
// Furniture follows the six-chair reference arrangement.
box(4.14,.09,.63,0,.70,.48,purple);for(const x of [-1.85,1.85])for(const z of [.25,.7])box(.045,.65,.045,x,.325,z,purple);
for(let i=0;i<6;i++){const x=-1.73+i*.69;box(.44,.045,.43,x,.37,1.08,wood);box(.44,.16,.04,x,.59,1.31,wood);for(const dx of [-.19,.19])box(.025,.26,.03,x+dx,.48,1.31,wood);for(const dx of [-.17,.17])for(const dz of [-.16,.16])box(.027,.35,.027,x+dx,.175,1.08+dz,wood)}
box(.24,.2,.2,-.65,.745,-1.17,black);box(.12,.15,.12,-.25,.72,-1.17,metal);
const laptop=box(.26,.17,.018,1.0,.83,.48,black);laptop.rotation.x=-.18;box(.27,.012,.20,1,.754,.55,black);
const leafMat=mat('#3f633a'),potMat=mat('#d4c7ba');
for(const x of [-.65,.55]){box(.16,.16,.16,x,1.14,-1.3,potMat);for(let i=0;i<9;i++){const leaf=new THREE.Mesh(new THREE.SphereGeometry(.09,8,5),leafMat);leaf.position.set(x+Math.sin(i*2.4)*.12,1.28+Math.cos(i)*.045,-1.28+Math.cos(i*2.4)*.1);leaf.scale.set(.6,1,.45);model.add(leaf)}}
// Five independently controllable analogue RGB groups; each group is uniform.
const groups=zoneSpecs.map(s=>{const g=new THREE.Group();g.name=s.name;g.userData.zone=s.id;model.add(g);return {root:g,segments:[],lights:[]}}),pickables=[];
function line(zone,a,b){const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),length=start.distanceTo(end),mid=start.clone().add(end).multiplyScalar(.5),quat=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),end.clone().sub(start).normalize());const group=groups[zone];
 const channel=new THREE.Mesh(new THREE.CylinderGeometry(.008,.008,length,6),metal);channel.position.copy(mid);channel.quaternion.copy(quat);group.root.add(channel);
 const mesh=new THREE.Mesh(new THREE.CylinderGeometry(.009,.009,length,8),new THREE.MeshBasicMaterial({color:'#aa35ff',toneMapped:false}));mesh.position.copy(mid);mesh.quaternion.copy(quat);mesh.userData.zone=zone;group.root.add(mesh);pickables.push(mesh);
 const halo=new THREE.Mesh(new THREE.CylinderGeometry(.043,.043,length,8),new THREE.MeshBasicMaterial({color:'#aa35ff',transparent:true,opacity:.14,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false}));halo.position.copy(mid);halo.quaternion.copy(quat);halo.userData.visualOnly=true;mesh.name='LED_'+zoneSpecs[zone].id+'_'+(group.segments.length+1);channel.name='Perfil_'+zoneSpecs[zone].id+'_'+(group.segments.length+1);group.root.add(halo);group.segments.push({mesh,halo,channel,length,a,b});
}
ledPaths.forEach(p=>line(p.zone,p.a,p.b));
// Soft wall wash represents a concealed source behind each shelf.
const washCanvas=document.createElement('canvas');washCanvas.width=256;washCanvas.height=128;
const washCtx=washCanvas.getContext('2d');const grad=washCtx.createLinearGradient(0,0,0,128);
grad.addColorStop(0,'rgba(255,255,255,0)');grad.addColorStop(.35,'rgba(255,255,255,.28)');grad.addColorStop(.5,'rgba(255,255,255,.68)');grad.addColorStop(.65,'rgba(255,255,255,.28)');grad.addColorStop(1,'rgba(255,255,255,0)');washCtx.fillStyle=grad;washCtx.fillRect(0,0,256,128);
const washTexture=new THREE.CanvasTexture(washCanvas);const shelfWashes=[];
shelves.forEach(s=>{const wash=new THREE.Mesh(new THREE.PlaneGeometry(s.w-.02,.27),new THREE.MeshBasicMaterial({map:washTexture,color:'#ffd4a2',transparent:true,opacity:.35,depthWrite:false,toneMapped:false,blending:THREE.AdditiveBlending}));wash.position.set(s.x,s.y,-1.452);wash.userData.visualOnly=true;wash.name='Retroiluminacion_repisa';model.add(wash);shelfWashes.push(wash)});
const bouncePositions=[[[0,2.7+DY,1.68],[2.7,2.7+DY,0],[-2.7,2.7+DY,0]],[[2.4,1.3+DY/2,1.4],[-2.4,1.3+DY/2,-1.4]],[[2.2,1.3+DY/2,0],[-2.2,1.3+DY/2,0]],[[0,2.13+DY,0]],[[-1.63,1.04,-1.28],[1.63,1.04,-1.28],[0,.62,-1.28]]];
bouncePositions.forEach((ps,i)=>ps.forEach(p=>{const light=new THREE.PointLight('#aa35ff',.65,2.6,2);light.position.set(...p);scene.add(light);groups[i].lights.push(light)}));
scene.add(new THREE.HemisphereLight('#f2edff','#33303b',1.65));const key=new THREE.DirectionalLight('#fff1df',2.4);key.position.set(3,7+DY,5);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-5;key.shadow.camera.right=5;key.shadow.camera.top=5;key.shadow.camera.bottom=-5;key.shadow.normalBias=.035;scene.add(key);const fill=new THREE.DirectionalLight('#c6c1e4',1);fill.position.set(-5,4+DY,-1);scene.add(fill);const room=new THREE.PointLight('#fff0dc',5.6,7,2);room.position.set(0,2.05+DY,0);scene.add(room);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(60,60),mat('#17151c'));floor.rotation.x=-Math.PI/2;floor.position.y=-.094;floor.receiveShadow=true;scene.add(floor);const grid=new THREE.GridHelper(24,24,'#39303f','#26222e');grid.position.y=-.09;grid.material.transparent=true;grid.material.opacity=.45;scene.add(grid);

function say(text){$('status').textContent=text}
zoneSpecs.forEach((spec,i)=>{const b=document.createElement('button');b.type='button';b.className='zone';b.dataset.zone=i;b.innerHTML='<span class="dot"></span><span class="zone-copy"><span class="zone-name">'+spec.name+'</span><span class="zone-detail">'+spec.detail+'</span></span><span class="hex-small"></span>';b.addEventListener('click',()=>select(i));$('zones').append(b)});
function sync(){[...$('zones').children].forEach((el,i)=>{const s=state[i];el.classList.toggle('active',i===selected);el.setAttribute('aria-pressed',String(i===selected));el.style.setProperty('--color',s.on&&s.brightness?s.color:'#44444f');el.querySelector('.hex-small').textContent=s.on&&s.brightness?s.color.toUpperCase():'APAGADA'});const s=state[selected];$('zone-name').textContent=zoneSpecs[selected].name;$('selection-description').textContent=zoneSpecs[selected].description;$('color').value=s.color;$('hex').value=s.color.toUpperCase();$('brightness').value=s.brightness;$('brightness-value').textContent=s.brightness+'%';$('power').checked=s.on;document.querySelectorAll('[data-preset]').forEach(b=>b.classList.toggle('active',b.dataset.preset===preset))}
function updateLights(){const shelfState=state[4],shelfGain=shelfState.on&&(!isolate||selected===4)?shelfState.brightness/100:0;shelfWashes.forEach(w=>{w.material.color.set(shelfState.color);w.material.opacity=.35*shelfGain;w.visible=shelfGain>0});groups.forEach((g,i)=>{const s=state[i],gain=s.on&&(!isolate||i===selected)?s.brightness/100:0;const col=new THREE.Color(s.color);g.segments.forEach(({mesh,halo})=>{mesh.material.color.copy(col).multiplyScalar(gain);halo.material.color.copy(col);halo.material.opacity=.16*gain;mesh.visible=gain>0;halo.visible=gain>0});g.lights.forEach(l=>{l.color.copy(col);l.intensity=[.12,.25,.3,.45,.18][i]*gain})})}
let saveTimer;function persist(){clearTimeout(saveTimer);saveTimer=setTimeout(()=>{try{localStorage.setItem('lightman-morada-3d-warm-r3',JSON.stringify(state))}catch(e){}},120)}
function change(){preset='';sync();updateLights();persist();say('')}
function select(i){selected=i;sync();updateLights()}
$('color').addEventListener('input',e=>{state[selected].color=e.target.value;state[selected].on=true;change()});$('hex').addEventListener('change',e=>{let v=e.target.value.trim();if(!v.startsWith('#'))v='#'+v;if(/^#[\da-f]{6}$/i.test(v)){state[selected].color=v.toLowerCase();state[selected].on=true;change()}else{sync();say('Usa seis dígitos hexadecimales, por ejemplo #A62BFF.')}});
$('power').addEventListener('change',e=>{state[selected].on=e.target.checked;change()});$('brightness').addEventListener('input',e=>{state[selected].brightness=Number(e.target.value);change()});$('isolate').addEventListener('change',e=>{isolate=e.target.checked;updateLights()});
document.querySelectorAll('[data-color]').forEach(b=>b.addEventListener('click',()=>{state[selected].color=b.dataset.color;state[selected].on=true;change()}));$('apply-all').addEventListener('click',()=>{const s=state[selected];state=state.map(()=>({...s}));change();say('Color, brillo y encendido aplicados a los cinco grupos.')});
document.querySelectorAll('[data-preset]').forEach(b=>b.addEventListener('click',()=>{const p=b.dataset.preset;if(p==='off')state.forEach(s=>s.on=false);else state=colors[p].map(color=>({color,brightness:85,on:true}));preset=p;sync();updateLights();persist();say(p==='off'?'Delineado apagado. El logo conserva su luz blanca.':'Escena aplicada; puedes editar cada zona.')}));
function setView(view){controls.autoRotate=false;$('rotate').checked=false;let position,target=[0,1.35+DY/2,0];if(view==='front')position=[0,1.65+DY/2,10.5+DY];else if(view==='left')position=[-(8+DY*1.5),2.2+DY/2,2.6+DY*.5];else if(view==='right')position=[8+DY*1.5,2.2+DY/2,2.6+DY*.5];else if(view==='top'){position=[0,14+DY,.96];target=[0,0,0]}else position=[6.4,3.2+DY*.8,8.2+DY*1.1];camera.position.set(...position);controls.target.set(...target);ceiling.visible=view!=='top'&&!$('open-roof').checked;controls.update();document.querySelectorAll('[data-view]').forEach(b=>{b.classList.toggle('active',b.dataset.view===view);b.setAttribute('aria-pressed',String(b.dataset.view===view))})}
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));$('open-roof').addEventListener('change',e=>{ceiling.visible=!e.target.checked});$('rotate').addEventListener('change',e=>{controls.autoRotate=e.target.checked});controls.addEventListener('start',()=>{controls.autoRotate=false;$('rotate').checked=false;document.querySelectorAll('[data-view]').forEach(b=>{b.classList.remove('active');b.setAttribute('aria-pressed','false')})});
const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();let down;
renderer.domElement.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY]});renderer.domElement.addEventListener('pointerup',e=>{if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5)return;const b=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-b.left)/b.width*2-1,-(e.clientY-b.top)/b.height*2+1);raycaster.setFromCamera(pointer,camera);const hit=raycaster.intersectObjects(pickables)[0];if(hit){select(hit.object.userData.zone);say('Zona seleccionada: '+zoneSpecs[selected].name)}});
renderer.domElement.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();const offset=camera.position.clone().sub(controls.target);offset.applyAxisAngle(new THREE.Vector3(0,1,0),e.key==='ArrowLeft'?.15:-.15);camera.position.copy(controls.target).add(offset);controls.update()}else if(e.key==='+'||e.key==='-'){e.preventDefault();camera.position.sub(controls.target).multiplyScalar(e.key==='+'?.9:1.1).add(controls.target);controls.update()}});
function download(blob,name){const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),3000)}
$('download').addEventListener('click',()=>{
 const w=$('viewer').clientWidth,h=$('viewer').clientHeight,pixelRatio=renderer.getPixelRatio();
 const restore=()=>{renderer.setPixelRatio(pixelRatio);renderer.setSize(w,h,false);renderer.render(scene,camera)};
 try{renderer.setPixelRatio(1);renderer.setSize(2560,Math.round(2560/camera.aspect),false);renderer.render(scene,camera);renderer.domElement.toBlob(blob=>{restore();if(blob){download(blob,'Morada-3D-Calido-LIGHTMAN.png');say('Imagen de esta vista guardada en alta resolución (2560 px de ancho).')}else say('No se pudo crear la imagen. Intenta de nuevo.')},'image/png')}
 catch(e){restore();say('No se pudo exportar esta vista. Intenta de nuevo con menos aplicaciones abiertas.')}
});
$('share').addEventListener('click',async()=>{const p=new URLSearchParams();p.set('rgb3d',JSON.stringify(state));const url=location.origin+location.pathname+'#'+p;history.replaceState(null,'','#'+p);try{await navigator.clipboard.writeText(url);say('Enlace copiado con los colores y brillos de las cinco zonas.')}catch(e){say('La combinación está en la URL. Copia la dirección del navegador.')}});
// Portable OBJ export of the actual modeled geometry (not a flat image).
$('export-model').addEventListener('click',()=>{model.updateMatrixWorld(true);const out=['# LIGHTMAN - Morada RGB conceptual',' # Dimensions are referential; not fabrication data.'];let index=1;model.traverse(mesh=>{if(!mesh.isMesh||!mesh.visible||mesh.userData.visualOnly)return;const geo=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry;const pos=geo.attributes.position;if(!pos)return;out.push('o '+(mesh.name||'mesh_'+mesh.id).replace(/[^a-zA-Z0-9_-]/g,'_'));const v=new THREE.Vector3();for(let i=0;i<pos.count;i++){v.fromBufferAttribute(pos,i).applyMatrix4(mesh.matrixWorld);out.push('v '+v.toArray().map(n=>n.toFixed(5)).join(' '))}for(let i=0;i<pos.count;i+=3)out.push('f '+(index+i)+' '+(index+i+1)+' '+(index+i+2));index+=pos.count;if(geo!==mesh.geometry)geo.dispose()});download(new Blob([out.join('\n')],{type:'text/plain'}),'Morada-3D-Conceptual.obj');say('Modelo 3D OBJ guardado. Geometría conceptual, sin texturas.')});
function resize(){const w=$('viewer').clientWidth,h=$('viewer').clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.zoom=Math.min(1.12,Math.max(.62,camera.aspect*.85));camera.updateProjectionMatrix()}
new ResizeObserver(resize).observe($('viewer'));resize();renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();window.dispatchEvent(new Event('morada-viewer-error'))});
let visible=true,previous=0;new IntersectionObserver(e=>{visible=e[0].isIntersecting},{rootMargin:'100px'}).observe($('viewer'));
function frame(t){requestAnimationFrame(frame);const dt=previous?Math.min((t-previous)/1000,.06):0;previous=t;if(!visible||document.hidden)return;controls.update(dt);renderer.render(scene,camera)}
sync();updateLights();requestAnimationFrame(frame);document.documentElement.dataset.modelReady='true';document.documentElement.dataset.modelRevision='20261027-calido-altura5-ambiente70-retro3repisas';
