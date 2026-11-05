import * as THREE from './vendor/three.module.js';
import {OrbitControls} from './vendor/OrbitControls.js';
import {defaults,pointAt,measure} from './geometry.mjs';
const $=id=>document.getElementById(id),fmt=n=>n.toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2});
const p={...defaults};let measured=measure(p);
function updateMetrics(){measured=measure(p);$('total').textContent=fmt(measured.total);$('rib-caption').textContent=p.ribs+' parantes curvos';$('rib-length').textContent=fmt(measured.curves)+' m';$('ring-length').textContent=fmt(measured.ring)+' m';$('single-length').textContent=fmt(measured.single)+' m';$('ribs-out').textContent=p.ribs;$('diameter-out').textContent=fmt(p.diameter)+' m';}
updateMetrics();
$('download').onclick=()=>{const data={proyecto:'Caroline - columna LED',revision:4,estado:'Cantidad de referencia confirmada: 14 parantes; geometría y metraje pendientes de validación',parametros:p,metrado_m:measured,criterio:'Longitud iluminada; no incluye reservas, cableado ni redondeo a tramos comerciales.'};const a=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));a.href=url;a.download='Caroline-metrado-columna.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
try{
const host=$('scene'),mobile=matchMedia('(max-width:760px)').matches,reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
const scene=new THREE.Scene();scene.background=new THREE.Color('#101510');scene.fog=new THREE.Fog('#101510',12,30);
const renderer=new THREE.WebGLRenderer({antialias:!mobile,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(devicePixelRatio,mobile?1.35:1.6));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;host.appendChild(renderer.domElement);
const camera=new THREE.PerspectiveCamera(38,1,.05,60),controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,2,0);controls.enableDamping=true;controls.minDistance=3;controls.maxDistance=16;controls.maxPolarAngle=Math.PI*.51;controls.autoRotate=false;controls.autoRotateSpeed=.45;
scene.add(new THREE.AmbientLight('#cad7bd',1.2));const lamp=new THREE.PointLight('#ffdba0',17,12,2);lamp.position.set(0,2.5,0);scene.add(lamp);const light=new THREE.DirectionalLight('#e8e9d6',2);light.position.set(3,6,3);scene.add(light);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(60,60),new THREE.MeshStandardMaterial({color:'#182019',roughness:.97}));ground.rotation.x=-Math.PI/2;ground.position.y=-.055;scene.add(ground);
const grid=new THREE.GridHelper(12,24,'#344535','#223023');grid.position.y=-.05;grid.material.transparent=true;grid.material.opacity=.32;scene.add(grid);
const model=new THREE.Group(),dimensions=new THREE.Group(),numbers=new THREE.Group();scene.add(model,dimensions,numbers);dimensions.visible=$('dimensions').checked;numbers.visible=$('numbers').checked;
const shared={uTime:{value:0},uMode:{value:0},uIntensity:{value:.8},uSpeed:{value:.5}};
const vertexShader=`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;
const fragmentShader=`uniform float uTime,uMode,uIntensity,uSpeed,uPhase,uPixels,uGlow;varying vec2 vUv;
vec3 hsv(vec3 c){vec3 p=abs(fract(c.xxx+vec3(0.,.66667,.33333))*6.-3.);return c.z*mix(vec3(1.),clamp(p-1.,0.,1.),c.y);}
void main(){float t=uTime*uSpeed;float cell=fract(vUv.x*uPixels);float pixel=smoothstep(.04,.16,cell)*(1.-smoothstep(.80,.96,cell));vec3 col;float power;
if(uMode<.5){float wave=.5+.5*sin(6.28318*(vUv.x*.8-t*.12+uPhase*.16));power=.60+.40*pow(wave,6.);col=vec3(1.,.62,.27);pixel=mix(.78,1.,pixel);}
else{float hue=fract(vUv.x*.8-t*.12+uPhase);col=hsv(vec3(hue,.92,1.));float comet=pow(.5+.5*sin(6.28318*(vUv.x-t*.24-uPhase*.5)),8.);power=.55+.45*comet;pixel=mix(.35,1.,pixel);}
float strength=power*pixel*uIntensity;float alpha=uGlow>.5?strength*.22:mix(.65,1.,strength);gl_FragColor=vec4(col*(uGlow>.5?1.:.65+strength*1.25),alpha);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`;
function makeMaterial(phase,pixels,halo){return new THREE.ShaderMaterial({uniforms:{...shared,uPhase:{value:phase},uPixels:{value:pixels},uGlow:{value:halo?1:0}},vertexShader,fragmentShader,transparent:true,depthWrite:false,blending:halo?THREE.AdditiveBlending:THREE.NormalBlending});}
function strip(curve,phase,length){const pixels=Math.max(1,Math.round(length*30));for(const halo of[false,true])model.add(new THREE.Mesh(new THREE.TubeGeometry(curve,64,halo ? .055 : .018,6,false),makeMaterial(phase,pixels,halo)));}
function clear(group){for(const o of [...group.children]){group.remove(o);o.traverse(x=>{x.geometry?.dispose();if(x.material)for(const m of(Array.isArray(x.material)?x.material:[x.material])){m.map?.dispose();m.dispose();}});}}
function label(s,pos){const cv=document.createElement('canvas');cv.width=512;cv.height=128;const ctx=cv.getContext('2d');ctx.fillStyle='#122018';ctx.fillRect(0,0,512,128);ctx.strokeStyle='#63785b';ctx.strokeRect(2,2,508,124);ctx.fillStyle='#e9d5ae';ctx.font='500 54px Segoe UI';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(s,256,64);const map=new THREE.CanvasTexture(cv);map.colorSpace=THREE.SRGBColorSpace;const sp=new THREE.Sprite(new THREE.SpriteMaterial({map,depthTest:false}));sp.position.copy(pos);sp.scale.set(1.05,.263,1);dimensions.add(sp);}
function dimline(a,b){dimensions.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...a),new THREE.Vector3(...b)]),new THREE.LineBasicMaterial({color:'#83967b',transparent:true,opacity:.8})));}
function numberBadge(n,angle,r){const cv=document.createElement('canvas');cv.width=cv.height=96;const ctx=cv.getContext('2d');ctx.fillStyle='#e9c68d';ctx.beginPath();ctx.arc(48,48,43,0,Math.PI*2);ctx.fill();ctx.fillStyle='#172017';ctx.font='bold 48px Segoe UI';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(n),48,49);const map=new THREE.CanvasTexture(cv);map.colorSpace=THREE.SRGBColorSpace;const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map,depthTest:false}));sprite.scale.set(.27,.27,1);sprite.position.set((r+.37)*Math.cos(angle),4.02,(r+.37)*Math.sin(angle));numbers.add(sprite);}
function rebuild(){clear(model);clear(dimensions);clear(numbers);const r=p.diameter/2,m=measure(p);const base=new THREE.Mesh(new THREE.CylinderGeometry(.43,.48,.08,32),new THREE.MeshStandardMaterial({color:'#555b50',metalness:.6,roughness:.45}));base.position.y=-.005;model.add(base);
for(let i=0;i<p.ribs;i++){const angle=i/p.ribs*Math.PI*2,pts=[];for(let k=0;k<=80;k++){const [radius,y]=pointAt(k/80,p);pts.push(new THREE.Vector3(radius*Math.cos(angle),y,radius*Math.sin(angle)));}strip(new THREE.CatmullRomCurve3(pts),i/p.ribs,m.single);numberBadge(i+1,angle,r);}
if(p.ring){const pts=[];for(let i=0;i<=120;i++){const a=i/120*Math.PI*2;pts.push(new THREE.Vector3(r*Math.cos(a),p.height,r*Math.sin(a)));}strip(new THREE.CatmullRomCurve3(pts),0,m.ring);}
const x=-r-.65;dimline([x,0,0],[x,4,0]);for(const y of[0,4])dimline([x-.1,y,0],[x+.1,y,0]);label('4,00 m',new THREE.Vector3(x-.12,2,0));dimline([-r,4.4,0],[r,4.4,0]);for(const xx of[-r,r])dimline([xx,4.3,0],[xx,4.5,0]);label('Ø '+fmt(p.diameter)+' m',new THREE.Vector3(0,4.67,0));updateMetrics();}
let playing=!reduced,clockTime=0,lastFrame=0,inView=true;
function playState(){$('play').textContent=playing?'Pausar efectos':'Reanudar efectos';$('play').setAttribute('aria-pressed',String(!playing));}
$('play').onclick=()=>{playing=!playing;playState();};playState();
function setMode(mode){const party=mode==='party';shared.uMode.value=party?1:0;document.querySelectorAll('[data-mode]').forEach(b=>{const active=b.dataset.mode===mode;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});$('mode-status').textContent=party?'Fiesta · color y píxel':'Minimalista · píxel cálido';$('mode-title').textContent=party?'Color para celebrar':'Calidez en movimiento';$('mode-description').textContent=party?'Barridos de color, arcoíris y cometas píxel recorren los 14 parantes y la corona.':'Píxeles cálidos con una onda suave que recorre la columna. Un ambiente sereno para recibir.';lamp.color.set(party?'#b69cff':'#ffdba0');shared.uSpeed.value=party?.9:.5;$('speed').value=party?'90':'50';$('speed-out').textContent=party?'Media':'Suave';document.body.dataset.mode=mode;}
document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>setMode(b.dataset.mode));
$('intensity').oninput=()=>{shared.uIntensity.value=Number($('intensity').value)/100;lamp.intensity=17*shared.uIntensity.value;$('intensity-out').textContent=$('intensity').value+' %';};
$('speed').oninput=()=>{shared.uSpeed.value=Number($('speed').value)/100;$('speed-out').textContent=Number($('speed').value)<65?'Suave':Number($('speed').value)<110?'Media':'Rápida';};
function view(kind){controls.autoRotate=false;$('rotate').checked=false;document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===kind));controls.target.set(0,2,0);camera.up.set(0,1,0);if(kind==='front')camera.position.set(0,2.5,10);else if(kind==='top')camera.position.set(.001,11,.001);else camera.position.set(6,4.6,8);controls.update();}
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>view(b.dataset.view));$('reset').onclick=()=>view('perspective');
for(const id of['ribs','diameter'])$(id).oninput=()=>{p[id]=Number($(id).value);rebuild();};$('ring').onchange=()=>{p.ring=$('ring').checked;rebuild();};$('dimensions').onchange=()=>dimensions.visible=$('dimensions').checked;$('numbers').onchange=()=>numbers.visible=$('numbers').checked;$('rotate').onchange=()=>controls.autoRotate=$('rotate').checked;
rebuild();view('perspective');setMode('minimal');
function resize(){const {width,height}=host.getBoundingClientRect();renderer.setSize(width,height);camera.aspect=width/height;camera.fov=camera.aspect<.8?40:38;camera.updateProjectionMatrix();}new ResizeObserver(resize).observe(host);resize();
new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;lastFrame=0;},{rootMargin:'80px'}).observe(host);
renderer.setAnimationLoop(now=>{if(document.hidden||!inView){lastFrame=0;return;}if(lastFrame&&now-lastFrame<1000/30)return;const delta=lastFrame?Math.min((now-lastFrame)/1000,.1):0;lastFrame=now;if(playing)clockTime+=delta;shared.uTime.value=clockTime;controls.update();renderer.render(scene,camera);});
}catch(e){$('error').hidden=false;console.error(e);}
