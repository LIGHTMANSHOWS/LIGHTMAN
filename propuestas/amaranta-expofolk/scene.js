import * as T from './vendor/three.module.js';
import { OrbitControls } from './vendor/OrbitControls.js';

const $=id=>document.getElementById(id),host=$('viewer');
let renderer;
try{renderer=new T.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true,powerPreference:'low-power'});}catch(e){$('loading').hidden=true;$('viewer-error').hidden=false;throw e;}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.65));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;
renderer.domElement.setAttribute('aria-label','Escenario Amaranta / ExpoFolk: 48 barras LED de 5 m en cuatro bloques de 12 detrás de los rombos; arrastra para girar');host.appendChild(renderer.domElement);
const scene=new T.Scene();scene.fog=new T.FogExp2('#090910',.013);
const camera=new T.PerspectiveCamera(40,1,.1,180);
const orbit=new OrbitControls(camera,renderer.domElement);orbit.enableDamping=true;orbit.enablePan=true;orbit.dampingFactor=.075;orbit.minDistance=13;orbit.maxDistance=85;orbit.maxPolarAngle=Math.PI*.49;
scene.add(new T.HemisphereLight('#bac2e7','#16131c',.6));const key=new T.DirectionalLight('#d7e1ff',1.3);key.position.set(4,16,15);scene.add(key);
const mat=(color,metalness=.1)=>new T.MeshStandardMaterial({color,roughness:.8,metalness});
const stageMat=mat('#171820'),steel=mat('#404454',.6),dark=mat('#08080d'),edge=mat('#32323d');
const scenery=new T.Group(),screenGroup=new T.Group(),beamGroup=new T.Group(),tubes=new T.Group();scene.add(scenery,screenGroup,beamGroup,tubes);
const temp=new T.Object3D(),color=new T.Color();
function box(w,h,d,x,y,z,m=stageMat,parent=scenery){const o=new T.Mesh(new T.BoxGeometry(w,h,d),m);o.position.set(x,y,z);parent.add(o);return o;}
function rod(a,b,r=.045,m=steel,parent=scenery){const start=new T.Vector3(...a),end=new T.Vector3(...b),dir=end.clone().sub(start);const o=new T.Mesh(new T.CylinderGeometry(r,r,dir.length(),6),m);o.position.copy(start.add(end).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),dir.normalize());parent.add(o);return o;}
box(27,1,9,0,.35,-.2);box(27,.1,9,0,.91,-.2,edge);box(5,.32,2,0,1.12,3.35);box(6,.2,1.15,0,.05,4.82);box(5.3,.22,.8,0,.27,4.28);
const floor=new T.Mesh(new T.PlaneGeometry(140,110),mat('#0d0d13'));floor.rotation.x=-Math.PI/2;floor.position.y=-.2;scenery.add(floor);
const rails=[];
function line(a,b){rails.push(...a,...b);}
function truss(a,b,size=.3){const A=new T.Vector3(...a),B=new T.Vector3(...b),dir=B.clone().sub(A),len=dir.length(),n=dir.clone().normalize();let u=new T.Vector3(0,0,1);if(Math.abs(n.dot(u))>.9)u.set(1,0,0);let v=new T.Vector3().crossVectors(n,u).normalize();u.crossVectors(v,n).normalize();const offsets=[u.clone().add(v).multiplyScalar(size*.5),u.clone().sub(v).multiplyScalar(size*.5),u.clone().add(v).multiplyScalar(-size*.5),u.clone().sub(v).multiplyScalar(-size*.5)];for(const off of offsets)line(A.clone().add(off).toArray(),B.clone().add(off).toArray());const steps=Math.max(1,Math.ceil(len/.9));for(let j=0;j<steps;j++){const p=A.clone().addScaledVector(dir,j/steps),q=A.clone().addScaledVector(dir,(j+1)/steps);for(let k=0;k<4;k++){line(p.clone().add(offsets[k]).toArray(),p.clone().add(offsets[(k+1)%4]).toArray());line(p.clone().add(offsets[k]).toArray(),q.clone().add(offsets[(k+1)%4]).toArray());}}}
for(const side of [-1,1]){
 truss([side*15,.9,-5],[side*15,10.3,-5]);truss([side*15,.9,1.7],[side*15,8.8,1.7]);truss([side*15,8.8,1.7],[side*15,10.3,-5]);
 truss([side*15,10.3,-5],[side*5.6,10.3,-5]);truss([side*8.1,8.3,-5],[side*5.6,11.1,-5]);
 truss([side*15,8.8,1.7],[side*9,8.8,1.7]);box(1,.12,1,side*15,.96,-5,dark);box(1,.12,1,side*15,.96,1.7,dark);
}
truss([-5.6,11.1,-5],[5.6,11.1,-5]);truss([-8.1,8.3,-5],[8.1,8.3,-5]);truss([-8.1,6,-4.8],[8.1,6,-4.8]);
truss([-7,8.5,-1.4],[-5.5,10,-4.8]);truss([7,8.5,-1.4],[5.5,10,-4.8]);
const lattice=new T.LineSegments(new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(rails,3)),new T.LineBasicMaterial({color:'#444451',transparent:true,opacity:.7}));scenery.add(lattice);
function texture(draw,w=768,h=768){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;return tex;}
function mountain(ctx,w,h){ctx.fillStyle='#58b6c6';ctx.fillRect(0,0,w,h);const colors=['#ec4b55','#f6bd34','#497fc6','#973575','#f8df82','#1c839d'];for(let i=0;i<9;i++){ctx.beginPath();ctx.moveTo(-w*.2+i*w*.15,h);ctx.lineTo(w*.2+i*w*.12,h*.4+(i%3)*h*.1);ctx.lineTo(w*.7+i*w*.08,h);ctx.fillStyle=colors[i%colors.length];ctx.fill();}ctx.strokeStyle='#ede6c7';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(0,h*.8);ctx.lineTo(w*.4,h*.36);ctx.lineTo(w,h*.84);ctx.stroke();}
const mountainTexture=texture(mountain);
const portraitTexture=texture((ctx,w,h)=>{mountain(ctx,w,h);ctx.fillStyle='#f6ca16';ctx.beginPath();ctx.arc(w*.5,h*.22,w*.1,0,Math.PI*2);ctx.fill();for(let i=0;i<12;i++){const a=i*Math.PI/6;ctx.lineWidth=9;ctx.strokeStyle='#f6ca16';ctx.beginPath();ctx.moveTo(w*.5+Math.cos(a)*w*.14,h*.22+Math.sin(a)*w*.14);ctx.lineTo(w*.5+Math.cos(a)*w*.19,h*.22+Math.sin(a)*w*.19);ctx.stroke();}ctx.textAlign='center';ctx.font='bold 76px Arial';ctx.strokeStyle='#084a6b';ctx.lineWidth=9;ctx.strokeText('EXPOFOLK',w*.5,h*.48);ctx.fillStyle='#ffe045';ctx.fillText('EXPOFOLK',w*.5,h*.48);ctx.font='18px Arial';ctx.fillStyle='#17375b';ctx.fillText('MÚSICA · CULTURA · LUZ',w*.5,h*.55);},768,1050);
const sunTexture=texture((ctx,w,h)=>{ctx.fillStyle='#21778d';ctx.fillRect(0,0,w,h);for(let x=0;x<w;x+=12){ctx.fillStyle=x%24===0?'#70b9c5':'#4095ab';ctx.fillRect(x,0,3,h);}for(let y=0;y<h;y+=12){ctx.fillStyle='#b6d4db33';ctx.fillRect(0,y,w,2);}ctx.fillStyle='#ffdb19';ctx.beginPath();ctx.arc(w/2,h/2,w*.16,0,Math.PI*2);ctx.fill();for(let i=0;i<12;i++){const a=i*Math.PI/6;ctx.save();ctx.translate(w/2,h/2);ctx.rotate(a);ctx.beginPath();ctx.moveTo(w*.2,-w*.025);ctx.quadraticCurveTo(w*.25,-w*.075,w*.36,0);ctx.quadraticCurveTo(w*.24,w*.005,w*.2,w*.025);ctx.closePath();ctx.fill();ctx.restore();}});
const screenMats=[];
function display(w,h,x,y,z,tex,rotation=0){box(w+.14,h+.14,.2,x,y,z-.11,dark,screenGroup).rotation.z=rotation;const m=new T.MeshBasicMaterial({map:tex,color:'#798da0',side:T.DoubleSide});screenMats.push(m);const o=new T.Mesh(new T.PlaneGeometry(w,h),m);o.position.set(x,y,z);o.rotation.z=rotation;screenGroup.add(o);return o;}
for(const side of [-1,1]){display(4,6,side*12,4.9,-1.1,portraitTexture);display(4.35,4.35,side*6.5,4.45,-2.1,mountainTexture,Math.PI/4);}
const outline=[[-.8,2.8],[.8,2.8],[.8,2.15],[1.5,2.15],[1.5,1.5],[2.15,1.5],[2.15,.8],[2.8,.8],[2.8,-.8],[2.15,-.8],[2.15,-1.5],[1.5,-1.5],[1.5,-2.15],[.8,-2.15],[.8,-2.8],[-.8,-2.8],[-.8,-2.15],[-1.5,-2.15],[-1.5,-1.5],[-2.15,-1.5],[-2.15,-.8],[-2.8,-.8],[-2.8,.8],[-2.15,.8],[-2.15,1.5],[-1.5,1.5],[-1.5,2.15],[-.8,2.15]];
const shape=new T.Shape(outline.map(([x,y])=>new T.Vector2(x,y)));const shapeGeometry=new T.ShapeGeometry(shape);const pos=shapeGeometry.attributes.position,uv=shapeGeometry.attributes.uv;for(let i=0;i<pos.count;i++)uv.setXY(i,(pos.getX(i)+2.8)/5.6,(pos.getY(i)+2.8)/5.6);
const sunMat=new T.MeshBasicMaterial({map:sunTexture,color:'#8b9ca8',side:T.DoubleSide});screenMats.push(sunMat);const chakana=new T.Mesh(shapeGeometry,sunMat);chakana.position.set(0,4.2,-2.7);screenGroup.add(chakana);
const fixtures=[];
// Four blocks of 12 continuous 5 m bars: two stacked behind each diamond.
// Audience faces -Z: the screens are at z=-2.1 and their opaque backs at -2.31.
// Spacing, bottom clearance and supports remain illustrative pending the rigging plan.
const curtain={blocksPerSide:2,barsPerBlock:12,barMeters:5,columnSpacing:.58,blockGap:.1,bottom:1,z:-3.2};
for(const side of [-1,1]){
 for(let block=0;block<curtain.blocksPerSide;block++)for(let col=0;col<curtain.barsPerBlock;col++)fixtures.push({x:side*6.5+(col-(curtain.barsPerBlock-1)/2)*curtain.columnSpacing,y:curtain.bottom+curtain.barMeters/2+block*(curtain.barMeters+curtain.blockGap),z:curtain.z,zone:side<0?'left':'right',block,row:block,col,length:curtain.barMeters});
}
const distribution={left:0,right:0};
for(const f of fixtures)distribution[f.zone]+=f.length;
const nominalMeters=fixtures.reduce((meters,f)=>meters+f.length,0);
if(fixtures.length!==48||nominalMeters!==240||distribution.left!==120||distribution.right!==120)throw new Error('El reparto debe sumar 48 barras de 5 m: 2 bloques de 12 por lado, 240 m');
const segments=60,total=fixtures.length*segments;
const led=new T.InstancedMesh(new T.CylinderGeometry(.037,.037,curtain.barMeters/segments*.92,5),new T.MeshBasicMaterial({color:'#ffffff',toneMapped:false}),total);led.instanceMatrix.setUsage(T.StaticDrawUsage);led.frustumCulled=false;
const glow=new T.InstancedMesh(new T.CylinderGeometry(.115,.115,curtain.barMeters,6),new T.MeshBasicMaterial({color:'#ffffff',transparent:true,opacity:.075,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false}),fixtures.length);glow.frustumCulled=false;
const housings=new T.InstancedMesh(new T.CylinderGeometry(.052,.052,curtain.barMeters+.04,6),new T.MeshBasicMaterial({color:'#282333',transparent:true,opacity:.14,depthWrite:false}),fixtures.length);housings.frustumCulled=false;
const wires=[];
fixtures.forEach((f,i)=>{temp.position.set(f.x,f.y,f.z);temp.updateMatrix();glow.setMatrixAt(i,temp.matrix);housings.setMatrixAt(i,temp.matrix);glow.setColorAt(i,color.set('#9e65ff'));for(let j=0;j<segments;j++){temp.position.set(f.x,f.y-f.length/2+(j+.5)*f.length/segments,f.z);temp.updateMatrix();led.setMatrixAt(i*segments+j,temp.matrix);led.setColorAt(i*segments+j,color.set('#9e65ff'));}wires.push(f.x,f.y+f.length/2+.02,f.z,f.x,f.y+f.length/2+.22,f.z);});
tubes.add(housings,glow,led,new T.LineSegments(new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(wires,3)),new T.LineBasicMaterial({color:'#3b3545',transparent:true,opacity:.5})));
const fixturePositions=[];
for(let i=0;i<10;i++)fixturePositions.push([-12+i*2.65,8.8,-4.5]);for(const side of [-1,1])for(let i=0;i<5;i++)fixturePositions.push([side*(4+i*2.1),1.2,3.5]);
const lampMat=new T.MeshBasicMaterial({color:'#bbc5da',toneMapped:false});
fixturePositions.forEach((p,i)=>{const casing=box(.44,.28,.44,...p,dark);const disk=new T.Mesh(new T.CircleGeometry(.13,10),lampMat);disk.position.set(p[0],p[1]+.02,p[2]+.23);scenery.add(disk);if(i%2===0){const start=new T.Vector3(...p),end=new T.Vector3(p[0]*.2,i<10?.8:10,-1);const dir=start.clone().sub(end),len=dir.length();const m=new T.MeshBasicMaterial({color:i%4===0?'#b7a360':'#7ab5c0',transparent:true,opacity:.035,side:T.DoubleSide,blending:T.AdditiveBlending,depthWrite:false});const cone=new T.Mesh(new T.ConeGeometry(1.4,len,18,1,true),m);cone.position.copy(start.clone().add(end).multiplyScalar(.5));cone.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),dir.normalize());beamGroup.add(cone);}});
// Reference silhouette, for depth only. Overall scenic dimensions are provisional.
const humanMat=mat('#817681');box(.36,.7,.22,0,1.9,2.5,humanMat);rod([-.12,1.57,2.5],[-.15,1,2.5],.075,humanMat);rod([.12,1.57,2.5],[.15,1,2.5],.075,humanMat);const head=new T.Mesh(new T.SphereGeometry(.15,12,8),humanMat);head.position.set(0,2.4,2.5);scenery.add(head);rod([-.2,2.2,2.5],[-.4,1.8,2.5],.055,humanMat);rod([.2,2.2,2.5],[.4,1.8,2.5],.055,humanMat);
const floorPool=new T.PointLight('#8f4bb8',12,24,2);floorPool.position.set(0,5,2);scene.add(floorPool);
const state={effect:'cascade',palette:'violet',brightness:.8,speed:1,playing:!matchMedia('(prefers-reduced-motion: reduce)').matches,time:0,camera:'perspective'};
const palettes={violet:['#8f49ff','#f1d6ff'],amber:['#ff8c32','#ffe7ae'],mint:['#18c88d','#d0fff2'],white:['#b6c6e2','#ffffff']};
const descriptions={cascade:'Pulsos que descienden por los dos bloques superpuestos de cada rombo.',sweep:'Un barrido continuo entre las barras detrás de los dos rombos.',weave:'Tramas alternadas entre los cuatro bloques de 12 barras.',solid:'48 barras de 5 m: dos bloques superpuestos de 12 por lado, 240 m en total.'};
let base=new T.Color(),accent=new T.Color(),last=performance.now(),frame=0;
function animateColors(){const [a,b]=palettes[state.palette];base.set(a);accent.set(b);let n=0;for(let i=0;i<fixtures.length;i++){const f=fixtures[i];let peak=.2;for(let j=0;j<segments;j++){const fy=f.y-f.length/2+(j+.5)*f.length/segments;let v;if(state.effect==='solid')v=.75;else if(state.effect==='cascade'){const phase=((fy*.2+state.time*.55+Math.abs(f.x)*.022)%1+1)%1;v=.12+Math.pow(Math.max(0,Math.sin(phase*Math.PI)),7)*.88;}else if(state.effect==='sweep'){const phase=f.x*.15+state.time*1.35+f.z*.12;v=.08+Math.pow(Math.max(0,Math.cos(phase)),8)*.92;}else{v=.12+Math.pow(Math.max(0,Math.sin(f.col*.8+f.row*1.8+state.time*2+fy*.9)),6)*.88;}peak=Math.max(peak,v);color.copy(base).lerp(accent,v*v*.8).multiplyScalar(v*state.brightness*1.7);led.setColorAt(n++,color);}glow.setColorAt(i,color.copy(base).multiplyScalar(peak*state.brightness));}led.instanceColor.needsUpdate=true;glow.instanceColor.needsUpdate=true;floorPool.color.copy(base);floorPool.intensity=state.brightness*9;}
function cameraView(name){state.camera=name;const portrait=host.clientWidth<600;const views={perspective:{pos:portrait?[36,22,61]:[22,13.5,33],target:[0,5,-1]},front:{pos:portrait?[0,10,70]:[0,9,43],target:[0,5,-2]},inside:{pos:[13,6.5,10],target:[0,5,-3]},plan:{pos:portrait?[0,69,.1]:[0,49,.1],target:[0,0,-1]}};const v=views[name];camera.position.set(...v.pos);orbit.target.set(...v.target);orbit.update();document.querySelectorAll('[data-camera]').forEach(el=>{const active=el.dataset.camera===name;el.classList.toggle('active',active);el.setAttribute('aria-pressed',active);});$('view-caption').textContent={perspective:'Perspectiva',front:'Frente',inside:'Dentro del escenario',plan:'Planta'}[name];}
function resize(){const w=host.clientWidth,h=host.clientHeight;if(w<1||h<1)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}new ResizeObserver(resize).observe(host);
function refreshPlay(){$('play').innerHTML=state.playing?'Pausar animación <span>Ⅱ</span>':'Reproducir <span>▶</span>';}
function layers(){const solo=$('solo').checked;scenery.visible=!solo;screenGroup.visible=!solo&&$('screens').checked;beamGroup.visible=!solo&&$('beams').checked;}
document.querySelectorAll('[data-camera]').forEach(el=>el.onclick=()=>cameraView(el.dataset.camera));
document.querySelectorAll('[data-effect]').forEach(el=>el.onclick=()=>{state.effect=el.dataset.effect;document.querySelectorAll('[data-effect]').forEach(b=>{const active=b===el;b.classList.toggle('active',active);b.setAttribute('aria-pressed',active);});$('effect-description').textContent=descriptions[state.effect];animateColors();});
document.querySelectorAll('[data-palette]').forEach(el=>el.onclick=()=>{state.palette=el.dataset.palette;document.querySelectorAll('[data-palette]').forEach(b=>{const active=b===el;b.classList.toggle('active',active);b.setAttribute('aria-pressed',active);});animateColors();});
$('brightness').oninput=e=>{state.brightness=+e.target.value/100;$('brightness-value').textContent=e.target.value+'%';animateColors();};$('speed').oninput=e=>{state.speed=+e.target.value/100;$('speed-value').textContent=Number(state.speed.toFixed(2))+'×';};
for(const id of ['screens','beams','solo'])$(id).onchange=layers;
$('play').onclick=()=>{state.playing=!state.playing;refreshPlay();};
$('reset').onclick=()=>{state.effect='cascade';state.palette='violet';state.brightness=.8;state.speed=1;state.time=0;state.playing=true;for(const key of ['screens','beams'])$(key).checked=true;$('solo').checked=false;$('brightness').value=80;$('brightness-value').textContent='80%';$('speed').value=100;$('speed-value').textContent='1×';document.querySelector('[data-effect="cascade"]').click();document.querySelector('[data-palette="violet"]').click();layers();cameraView('perspective');refreshPlay();};
$('fullscreen').onclick=async()=>{const wrap=host.parentElement;try{if(document.fullscreenElement)await document.exitFullscreen();else await wrap.requestFullscreen();}catch{wrap.classList.toggle('expanded');}};
document.addEventListener('visibilitychange',()=>last=performance.now());
function loop(now){requestAnimationFrame(loop);const dt=Math.min((now-last)/1000,.08);last=now;if(document.hidden)return;if(state.playing)state.time+=dt*state.speed;if(frame++%2===0&&state.playing)animateColors();orbit.update();renderer.render(scene,camera);}resize();cameraView('perspective');animateColors();refreshPlay();$('loading').hidden=true;requestAnimationFrame(loop);
window.amarantaStudy={state,nominalTubeCount:fixtures.length,nominalBarCount:fixtures.length,nominalMeters,distribution,placement:'behind-diamond-screens',curtain,renderer,scene,camera,fixtures};
