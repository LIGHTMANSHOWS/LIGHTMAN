import * as T from './vendor/three.module.js';
import { OrbitControls } from './vendor/OrbitControls.js';
import { layout } from './layout.js?v=chacana-5m-06';

const $=id=>document.getElementById(id),host=$('viewer');
let renderer;
try{renderer=new T.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true,powerPreference:'low-power'});}catch(e){$('loading').hidden=true;$('viewer-error').hidden=false;throw e;}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.65));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;
renderer.domElement.setAttribute('aria-label','Escenario Amaranta / ExpoFolk: 48 barras LED de 5 m detrás de los rombos y de la chacana escalonada; arrastra para girar');host.appendChild(renderer.domElement);
const scene=new T.Scene();scene.fog=new T.FogExp2('#090910',.013);
const camera=new T.PerspectiveCamera(40,1,.1,180);
const orbit=new OrbitControls(camera,renderer.domElement);orbit.enableDamping=true;orbit.enablePan=true;orbit.dampingFactor=.075;orbit.minDistance=13;orbit.maxDistance=85;orbit.maxPolarAngle=Math.PI*.72;
scene.add(new T.HemisphereLight('#bac2e7','#16131c',.6));const key=new T.DirectionalLight('#d7e1ff',1.3);key.position.set(4,16,15);scene.add(key);
const mat=(color,metalness=.1)=>new T.MeshStandardMaterial({color,roughness:.8,metalness});
const stageMat=mat('#292c38'),steel=mat('#404454',.6),dark=mat('#08080d'),edge=mat('#484957');
const scenery=new T.Group(),screenGroup=new T.Group(),beamGroup=new T.Group(),tubes=new T.Group();scene.add(scenery,screenGroup,beamGroup,tubes);
const lightGroup=new T.Group();scene.add(lightGroup);
const temp=new T.Object3D(),color=new T.Color();
function box(w,h,d,x,y,z,m=stageMat,parent=scenery){const o=new T.Mesh(new T.BoxGeometry(w,h,d),m);o.position.set(x,y,z);parent.add(o);return o;}
function rod(a,b,r=.045,m=steel,parent=scenery){const start=new T.Vector3(...a),end=new T.Vector3(...b),dir=end.clone().sub(start);const o=new T.Mesh(new T.CylinderGeometry(r,r,dir.length(),6),m);o.position.copy(start.add(end).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),dir.normalize());parent.add(o);return o;}
// Stepped rear edge and curved apron traced from the final ground plan.
const stageShape=new T.Shape(layout.stageOutline.map(([x,z])=>new T.Vector2(x,-z)));
const deckMesh=new T.Mesh(new T.ExtrudeGeometry(stageShape,{depth:layout.deck,bevelEnabled:false}),stageMat);deckMesh.rotation.x=-Math.PI/2;scenery.add(deckMesh);
const deckEdge=new T.LineLoop(new T.BufferGeometry().setFromPoints(layout.stageOutline.map(([x,z])=>new T.Vector3(x,layout.deck+.01,z))),new T.LineBasicMaterial({color:'#646b7d',transparent:true,opacity:.65}));scenery.add(deckEdge);
for(const r of layout.risers){
 box(r.w,r.h-.12,r.d,r.x,layout.deck+r.h/2+.06,r.z,edge);
 for(const dx of [-1.25,1.25])for(const dz of [-1.25,1.25]){
  if(r.wheels){const wheel=new T.Mesh(new T.CylinderGeometry(.10,.10,.10,10),dark);wheel.rotation.z=Math.PI/2;wheel.position.set(r.x+dx,layout.deck+.10,r.z+dz);scenery.add(wheel);}
  else box(.12,.12,.12,r.x+dx,layout.deck+.06,r.z+dz,steel);
 }
}
const floor=new T.Mesh(new T.PlaneGeometry(140,110),mat('#0d0d13'));floor.rotation.x=-Math.PI/2;floor.position.y=-.02;scenery.add(floor);
const rails=[];
function line(a,b){rails.push(...a,...b);}
function truss(a,b,size=.3){const A=new T.Vector3(...a),B=new T.Vector3(...b),dir=B.clone().sub(A),len=dir.length(),n=dir.clone().normalize();let u=new T.Vector3(0,0,1);if(Math.abs(n.dot(u))>.9)u.set(1,0,0);let v=new T.Vector3().crossVectors(n,u).normalize();u.crossVectors(v,n).normalize();const offsets=[u.clone().add(v).multiplyScalar(size*.5),u.clone().sub(v).multiplyScalar(size*.5),u.clone().add(v).multiplyScalar(-size*.5),u.clone().sub(v).multiplyScalar(-size*.5)];for(const off of offsets)line(A.clone().add(off).toArray(),B.clone().add(off).toArray());const steps=Math.max(1,Math.ceil(len/.9));for(let j=0;j<steps;j++){const p=A.clone().addScaledVector(dir,j/steps),q=A.clone().addScaledVector(dir,(j+1)/steps);for(let k=0;k<4;k++){line(p.clone().add(offsets[k]).toArray(),p.clone().add(offsets[(k+1)%4]).toArray());line(p.clone().add(offsets[k]).toArray(),q.clone().add(offsets[(k+1)%4]).toArray());}}}
// The 16 final truss runs replace the provisional rectangular roof/towers.
for(const run of layout.runs)truss(run.a,run.b,.42);
const lattice=new T.LineSegments(new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(rails,3)),new T.LineBasicMaterial({color:'#7c8195',transparent:true,opacity:.8}));scenery.add(lattice);
function texture(draw,w=768,h=768){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;return tex;}
function mountain(ctx,w,h){ctx.fillStyle='#58b6c6';ctx.fillRect(0,0,w,h);const colors=['#ec4b55','#f6bd34','#497fc6','#973575','#f8df82','#1c839d'];for(let i=0;i<9;i++){ctx.beginPath();ctx.moveTo(-w*.2+i*w*.15,h);ctx.lineTo(w*.2+i*w*.12,h*.4+(i%3)*h*.1);ctx.lineTo(w*.7+i*w*.08,h);ctx.fillStyle=colors[i%colors.length];ctx.fill();}ctx.strokeStyle='#ede6c7';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(0,h*.8);ctx.lineTo(w*.4,h*.36);ctx.lineTo(w,h*.84);ctx.stroke();}
const mountainTexture=texture(mountain);
const portraitTexture=texture((ctx,w,h)=>{mountain(ctx,w,h);ctx.fillStyle='#f6ca16';ctx.beginPath();ctx.arc(w*.5,h*.22,w*.1,0,Math.PI*2);ctx.fill();for(let i=0;i<12;i++){const a=i*Math.PI/6;ctx.lineWidth=9;ctx.strokeStyle='#f6ca16';ctx.beginPath();ctx.moveTo(w*.5+Math.cos(a)*w*.14,h*.22+Math.sin(a)*w*.14);ctx.lineTo(w*.5+Math.cos(a)*w*.19,h*.22+Math.sin(a)*w*.19);ctx.stroke();}ctx.textAlign='center';ctx.font='bold 76px Arial';ctx.strokeStyle='#084a6b';ctx.lineWidth=9;ctx.strokeText('EXPOFOLK',w*.5,h*.48);ctx.fillStyle='#ffe045';ctx.fillText('EXPOFOLK',w*.5,h*.48);ctx.font='18px Arial';ctx.fillStyle='#17375b';ctx.fillText('MÚSICA · CULTURA · LUZ',w*.5,h*.55);},768,1050);
const sunTexture=texture((ctx,w,h)=>{ctx.fillStyle='#21778d';ctx.fillRect(0,0,w,h);for(let x=0;x<w;x+=12){ctx.fillStyle=x%24===0?'#70b9c5':'#4095ab';ctx.fillRect(x,0,3,h);}for(let y=0;y<h;y+=12){ctx.fillStyle='#b6d4db33';ctx.fillRect(0,y,w,2);}ctx.fillStyle='#ffdb19';ctx.beginPath();ctx.arc(w/2,h/2,w*.16,0,Math.PI*2);ctx.fill();for(let i=0;i<12;i++){const a=i*Math.PI/6;ctx.save();ctx.translate(w/2,h/2);ctx.rotate(a);ctx.beginPath();ctx.moveTo(w*.2,-w*.025);ctx.quadraticCurveTo(w*.25,-w*.075,w*.36,0);ctx.quadraticCurveTo(w*.24,w*.005,w*.2,w*.025);ctx.closePath();ctx.fill();ctx.restore();}});
const screenMats=[];
function display(w,h,x,y,z,tex,rotation=0){box(w+.14,h+.14,.2,x,y,z-.11,dark,screenGroup).rotation.z=rotation;const m=new T.MeshBasicMaterial({map:tex,color:'#798da0',side:T.DoubleSide});screenMats.push(m);const o=new T.Mesh(new T.PlaneGeometry(w,h),m);o.position.set(x,y,z);o.rotation.z=rotation;screenGroup.add(o);return o;}
const scr=layout.screens;
for(const side of [-1,1]){display(4,6,side*scr.sideX,scr.sideY,scr.sideZ,portraitTexture);display(4.35,4.35,side*scr.diamondX,scr.diamondY,scr.diamondZ,mountainTexture,Math.PI/4);}
const outline=scr.chakanaOutline;
const shape=new T.Shape(outline.map(([x,y])=>new T.Vector2(x,y)));const shapeGeometry=new T.ShapeGeometry(shape);const pos=shapeGeometry.attributes.position,uv=shapeGeometry.attributes.uv;for(let i=0;i<pos.count;i++)uv.setXY(i,(pos.getX(i)+2.8)/5.6,(pos.getY(i)+2.8)/5.6);
const sunMat=new T.MeshBasicMaterial({map:sunTexture,color:'#8b9ca8',side:T.DoubleSide});screenMats.push(sunMat);const chakana=new T.Mesh(shapeGeometry,sunMat);chakana.scale.setScalar(scr.chakanaScale);chakana.position.set(0,scr.centerY,scr.centerZ);screenGroup.add(chakana);
const chakanaBack=new T.Mesh(shapeGeometry,dark);chakanaBack.scale.copy(chakana.scale);chakanaBack.position.set(0,scr.centerY,scr.centerZ-.08);screenGroup.add(chakanaBack);
// Three zones of 16 uncut vertical 5 m bars. The center follows the same
// stepped outline and deeper screen plane as the chakana, without stacking.
const fixtures=[],curtain=layout.bars;
for(const side of [-1,1]){
 for(let col=0;col<curtain.barsPerZone;col++)fixtures.push({x:side*scr.diamondX+(col-(curtain.barsPerZone-1)/2)*curtain.diamondSpacing,y:scr.diamondY,z:scr.diamondZ-curtain.screenClearance,zone:side<0?'left':'right',row:0,col,length:curtain.barMeters});
}
function chakanaTop(x){
 const localX=x/scr.chakanaScale,heights=[];
 for(let i=0;i<outline.length;i++){
  const a=outline[i],b=outline[(i+1)%outline.length];
  if(a[1]===b[1]&&localX>=Math.min(a[0],b[0])&&localX<=Math.max(a[0],b[0]))heights.push(a[1]);
 }
 return scr.centerY+Math.max(...heights)*scr.chakanaScale;
}
for(let col=0;col<curtain.barsPerZone;col++){
 const x=(col-(curtain.barsPerZone-1)/2)*curtain.centerSpacing;
 fixtures.push({x,y:chakanaTop(x)+curtain.centerTopReveal-curtain.barMeters/2,z:scr.centerZ-curtain.screenClearance,zone:'center',row:1,col,length:curtain.barMeters});
}
const distribution={left:0,center:0,right:0};
for(const f of fixtures)distribution[f.zone]+=f.length;
const nominalMeters=fixtures.reduce((meters,f)=>meters+f.length,0);
if(fixtures.length!==48||nominalMeters!==240||Object.values(distribution).some(m=>m!==80)||fixtures.some(f=>f.length!==5||!Number.isFinite(f.y)||f.y-2.5<layout.deck))throw new Error('El reparto debe sumar 48 barras individuales de 5 m: 80 m por rombo y 80 m detrás de la chacana.');
const segments=60,total=fixtures.length*segments;
const led=new T.InstancedMesh(new T.CylinderGeometry(.037,.037,curtain.barMeters/segments*.92,5),new T.MeshBasicMaterial({color:'#ffffff',toneMapped:false}),total);led.instanceMatrix.setUsage(T.StaticDrawUsage);led.frustumCulled=false;
const glow=new T.InstancedMesh(new T.CylinderGeometry(.115,.115,curtain.barMeters,6),new T.MeshBasicMaterial({color:'#ffffff',transparent:true,opacity:.075,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false}),fixtures.length);glow.frustumCulled=false;
const housings=new T.InstancedMesh(new T.CylinderGeometry(.052,.052,curtain.barMeters+.04,6),new T.MeshBasicMaterial({color:'#282333',transparent:true,opacity:.14,depthWrite:false}),fixtures.length);housings.frustumCulled=false;
const wires=[];
fixtures.forEach((f,i)=>{temp.position.set(f.x,f.y,f.z);temp.updateMatrix();glow.setMatrixAt(i,temp.matrix);housings.setMatrixAt(i,temp.matrix);glow.setColorAt(i,color.set('#9e65ff'));for(let j=0;j<segments;j++){temp.position.set(f.x,f.y-f.length/2+(j+.5)*f.length/segments,f.z);temp.updateMatrix();led.setMatrixAt(i*segments+j,temp.matrix);led.setColorAt(i*segments+j,color.set('#9e65ff'));}wires.push(f.x,f.y+f.length/2+.02,f.z,f.x,f.y+f.length/2+.22,f.z);});
tubes.add(housings,glow,led,new T.LineSegments(new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(wires,3)),new T.LineBasicMaterial({color:'#3b3545',transparent:true,opacity:.5})));
// Full final lighting inventory. Positions registered from plan and front views.
const lightColors={mega:'#a8caff',spiider:'#b685ff',bmfl:'#69d9ed',strobe:'#d9e8ff',blinder:'#ffd394'};
const emitterMats=Object.fromEntries(Object.entries(lightColors).map(([k,v])=>[k,new T.MeshBasicMaterial({color:v,toneMapped:false})]));
const fixtureBatches=new Map();
function lightPart(geometry,material,position,rotation=[0,0,0]){
 const key=geometry.type+JSON.stringify(geometry.parameters)+material.uuid;
 if(!fixtureBatches.has(key))fixtureBatches.set(key,{geometry,material,matrices:[]});else geometry.dispose();
 temp.position.set(...position);temp.rotation.set(...rotation);temp.scale.set(1,1,1);temp.updateMatrix();fixtureBatches.get(key).matrices.push(temp.matrix.clone());
}
function lightBox(w,h,d,x,y,z,m=dark){lightPart(new T.BoxGeometry(w,h,d),m,[x,y,z]);}
function lens(r,x,y,z,m){lightPart(new T.CircleGeometry(r,12),m,[x,y,z]);}
for(const [i,f] of layout.lights.entries()){
 const [x,y,z]=f.position,em=emitterMats[f.type];
 if(f.type==='strobe'){
  lightBox(.43,.18,.16,x,y,z);lightBox(.38,.10,.02,x,y,z+.09,em);
  for(let j=0;j<5;j++)lightBox(.012,.12,.025,x-.15+j*.075,y,z+.105,steel);
 }else if(f.type==='blinder'){
  lightBox(.48,.42,.18,x,y,z);
  for(const dx of [-.12,.12])for(const dy of [-.10,.10])lens(.083,x+dx,y+dy,z+.10,em);
 }else{
  const scale=f.type==='bmfl'?1.3:1;
  lightBox(.42*scale,.14,.30*scale,x,y+.32,z);
  for(const side of [-1,1])lightBox(.055,.36,.1,x+side*.19*scale,y+.12,z,steel);
  lightPart(new T.SphereGeometry(.19*scale,10,8),dark,[x,y,z]);
  if(f.type==='spiider'){
   lens(.055,x,y,z+.20,em);
   for(let j=0;j<6;j++){const a=j*Math.PI/3;lens(.045,x+Math.cos(a)*.115,y+Math.sin(a)*.115,z+.20,em);}
  }else lens(.12*scale,x,y,z+.20*scale,em);
  const start=new T.Vector3(x,y,z+.22),end=new T.Vector3(x*.62,f.floor?9.6:layout.deck+.15,3.1+(i%3)*.45);
  const dir=start.clone().sub(end),len=dir.length();
  const m=new T.MeshBasicMaterial({color:lightColors[f.type],transparent:true,opacity:f.type==='mega'?.012:.007,side:T.DoubleSide,blending:T.AdditiveBlending,depthWrite:false});
  const cone=new T.Mesh(new T.ConeGeometry(f.type==='mega'?.32:1.05,len,8,1,true),m);cone.position.copy(start.clone().add(end).multiplyScalar(.5));cone.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),dir.normalize());beamGroup.add(cone);
 }
}
for(const b of fixtureBatches.values()){const mesh=new T.InstancedMesh(b.geometry,b.material,b.matrices.length);b.matrices.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.computeBoundingSphere();lightGroup.add(mesh);}
temp.rotation.set(0,0,0);
// Reference silhouette, for depth only. Overall scenic dimensions are provisional.
const humanMat=mat('#817681');box(.36,.7,.22,0,1.9,2.5,humanMat);rod([-.12,1.57,2.5],[-.15,1,2.5],.075,humanMat);rod([.12,1.57,2.5],[.15,1,2.5],.075,humanMat);const head=new T.Mesh(new T.SphereGeometry(.15,12,8),humanMat);head.position.set(0,2.4,2.5);scenery.add(head);rod([-.2,2.2,2.5],[-.4,1.8,2.5],.055,humanMat);rod([.2,2.2,2.5],[.4,1.8,2.5],.055,humanMat);
const floorPool=new T.PointLight('#8f4bb8',12,24,2);floorPool.position.set(0,5,2);scene.add(floorPool);
const state={effect:'cascade',palette:'violet',brightness:.8,speed:1,playing:!matchMedia('(prefers-reduced-motion: reduce)').matches,time:0,camera:'perspective'};
const palettes={violet:['#8f49ff','#f1d6ff'],amber:['#ff8c32','#ffe7ae'],mint:['#18c88d','#d0fff2'],white:['#b6c6e2','#ffffff']};
const descriptions={cascade:'Pulsos que descienden por los rombos y la chacana escalonada.',sweep:'Un barrido continuo por las tres zonas: rombos y chacana.',weave:'Tramas alternadas entre las tres zonas de 16 barras.',solid:'48 barras individuales de 5 m: 16 por rombo y 16 detrás de la chacana, 240 m en total.'};
let base=new T.Color(),accent=new T.Color(),last=performance.now(),frame=0;
function animateColors(){const [a,b]=palettes[state.palette];base.set(a);accent.set(b);let n=0;for(let i=0;i<fixtures.length;i++){const f=fixtures[i];let peak=.2;for(let j=0;j<segments;j++){const fy=f.y-f.length/2+(j+.5)*f.length/segments;let v;if(state.effect==='solid')v=.75;else if(state.effect==='cascade'){const phase=((fy*.2+state.time*.55+Math.abs(f.x)*.022)%1+1)%1;v=.12+Math.pow(Math.max(0,Math.sin(phase*Math.PI)),7)*.88;}else if(state.effect==='sweep'){const phase=f.x*.15+state.time*1.35+f.z*.12;v=.08+Math.pow(Math.max(0,Math.cos(phase)),8)*.92;}else{v=.12+Math.pow(Math.max(0,Math.sin(f.col*.8+f.row*1.8+state.time*2+fy*.9)),6)*.88;}peak=Math.max(peak,v);color.copy(base).lerp(accent,v*v*.8).multiplyScalar(v*state.brightness*1.7);led.setColorAt(n++,color);}glow.setColorAt(i,color.copy(base).multiplyScalar(peak*state.brightness));}led.instanceColor.needsUpdate=true;glow.instanceColor.needsUpdate=true;floorPool.color.copy(base);floorPool.intensity=state.brightness*9;}
function cameraView(name){state.camera=name;const portrait=host.clientWidth<600;const views={perspective:{pos:portrait?[36,22,61]:[23,16,36],target:[0,5,-1]},front:{pos:portrait?[0,10,70]:[0,6.4,43],target:[0,6.4,-2]},low:{pos:portrait?[0,1.2,65]:[0,1.2,32],target:[0,5,-3]},inside:{pos:[13,6.5,10],target:[0,5,-3]},plan:{pos:portrait?[0,69,.1]:[0,49,.1],target:[0,0,-1]}};const v=views[name];orbit.enableDamping=false;orbit.update();camera.position.set(...v.pos);orbit.target.set(...v.target);orbit.update();orbit.enableDamping=true;document.querySelectorAll('[data-camera]').forEach(el=>{const active=el.dataset.camera===name;el.classList.toggle('active',active);el.setAttribute('aria-pressed',active);});$('view-caption').textContent={perspective:'Perspectiva',front:'Frente',low:'Contrapicado',inside:'Dentro del escenario',plan:'Planta'}[name];}
function resize(){const w=host.clientWidth,h=host.clientHeight;if(w<1||h<1)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}new ResizeObserver(resize).observe(host);
function refreshPlay(){$('play').innerHTML=state.playing?'Pausar animación <span>Ⅱ</span>':'Reproducir <span>▶</span>';}
function layers(){const solo=$('solo').checked;scenery.visible=!solo;lightGroup.visible=!solo&&$('fixtures').checked;screenGroup.visible=!solo&&$('screens').checked;beamGroup.visible=!solo&&$('beams').checked;}
document.querySelectorAll('[data-camera]').forEach(el=>el.onclick=()=>cameraView(el.dataset.camera));
document.querySelectorAll('[data-effect]').forEach(el=>el.onclick=()=>{state.effect=el.dataset.effect;document.querySelectorAll('[data-effect]').forEach(b=>{const active=b===el;b.classList.toggle('active',active);b.setAttribute('aria-pressed',active);});$('effect-description').textContent=descriptions[state.effect];animateColors();});
document.querySelectorAll('[data-palette]').forEach(el=>el.onclick=()=>{state.palette=el.dataset.palette;document.querySelectorAll('[data-palette]').forEach(b=>{const active=b===el;b.classList.toggle('active',active);b.setAttribute('aria-pressed',active);});animateColors();});
$('brightness').oninput=e=>{state.brightness=+e.target.value/100;$('brightness-value').textContent=e.target.value+'%';animateColors();};$('speed').oninput=e=>{state.speed=+e.target.value/100;$('speed-value').textContent=Number(state.speed.toFixed(2))+'×';};
for(const id of ['screens','beams','fixtures','solo'])$(id).onchange=layers;
$('play').onclick=()=>{state.playing=!state.playing;refreshPlay();};
$('reset').onclick=()=>{state.effect='cascade';state.palette='violet';state.brightness=.8;state.speed=1;state.time=0;state.playing=true;for(const key of ['screens','beams','fixtures'])$(key).checked=true;$('solo').checked=false;$('brightness').value=80;$('brightness-value').textContent='80%';$('speed').value=100;$('speed-value').textContent='1×';document.querySelector('[data-effect="cascade"]').click();document.querySelector('[data-palette="violet"]').click();layers();cameraView('perspective');refreshPlay();};
$('fullscreen').onclick=async()=>{const wrap=host.parentElement;try{if(document.fullscreenElement)await document.exitFullscreen();else await wrap.requestFullscreen();}catch{wrap.classList.toggle('expanded');}};
document.addEventListener('visibilitychange',()=>last=performance.now());
function loop(now){requestAnimationFrame(loop);const dt=Math.min((now-last)/1000,.08);last=now;if(document.hidden)return;if(state.playing)state.time+=dt*state.speed;if(frame++%2===0&&state.playing)animateColors();orbit.update();renderer.render(scene,camera);}resize();cameraView('perspective');animateColors();refreshPlay();$('loading').hidden=true;requestAnimationFrame(loop);
window.amarantaStudy={state,nominalTubeCount:fixtures.length,nominalBarCount:fixtures.length,nominalMeters,distribution,placement:'behind-diamonds-and-stepped-chakana',curtain,layout,lightGroup,renderer,scene,camera,orbit,fixtures};
