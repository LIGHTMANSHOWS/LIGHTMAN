import * as THREE from './vendor/three.module.js';
import { OrbitControls } from './vendor/OrbitControls.js';
import { sampleEffect, effectDescriptions, gradientPresets } from './effects.js';

const host = document.querySelector('#viewer');
let renderer;
try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' }); }
catch (error) { window.dispatchEvent(new Event('morada-viewer-error')); throw error; }
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.domElement.setAttribute('aria-label', 'Stand Morada: arrastra para girar y usa los controles para cambiar la vista y la escena de luz');
host.appendChild(renderer.domElement);
document.querySelector('#loading').hidden = true;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
camera.position.set(6.2, 2.4, 8.8);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1.45, 0);
controls.enableDamping = true;
controls.dampingFactor = .075;
controls.minDistance = 5;
controls.maxDistance = 17;
controls.minPolarAngle = .08;
controls.maxPolarAngle = Math.PI / 2.03;
controls.enablePan = false;
controls.autoRotate = true;
controls.autoRotateSpeed = .25;
controls.update();

const model = new THREE.Group();
scene.add(model);
const mat = (color, roughness = .72) => new THREE.MeshStandardMaterial({ color, roughness, metalness: .07 });
const ivory = mat('#ede8e2'), purple = mat('#3e1a62'), dark = mat('#30262e'), wood = mat('#9b7258'), floorMat = mat('#635d60');
const posterMat = mat('#e4dfd9');
function box(w, h, d, x, y, z, material = ivory, parent = model) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
function textTexture(text, background, color = '#ffffff', width = 1024, height = 256, font = 'bold 150px Arial') {
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d'); ctx.fillStyle = background; ctx.fillRect(0,0,width,height);
  ctx.fillStyle = color; ctx.font = font; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, width/2, height/2 + 5);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8); return texture;
}
function panel(w, h, x, y, z, texture, rotation = 0) {
  const material = new THREE.MeshStandardMaterial({ map:texture, roughness:.65, side:THREE.DoubleSide });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(w,h),material);
  plane.position.set(x,y,z);plane.rotation.y = rotation;model.add(plane);return plane;
}

// Conceptual model: 5 m front, 3 m depth, 3 m overall height.
box(5.16,.08,3.16,0,-.04,0,floorMat);
box(5,2.35,.08,0,1.175,-1.5);
box(.08,2.35,3,-2.5,1.175,0);
for (const x of [-2.5,2.5]) for(const z of [-1.5,1.5]) box(.13,2.35,.13,x,1.175,z);
// The purple fascia is a band at the top of the structure, not a lighted floor.
box(5.13,.64,.16,0,2.68,1.5,purple);
box(5.13,.64,.16,0,2.68,-1.5,purple);
box(.16,.64,3,2.5,2.68,0,purple);
box(.16,.64,3,-2.5,2.68,0,purple);
const ceiling=box(5,.055,3,0,2.33,0,new THREE.MeshStandardMaterial({color:'#f5f1ec',emissive:'#eae4dc',emissiveIntensity:.32,roughness:.9}));
// Keep the white canopy shown in the reference; open it only for the plan view.
// Existing illuminated Morada lettering: white, fixed and outside our service.
// It never enters the addressable LED or colour-bounce update lists.
function logoTexture(glow=false) {
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=256;
  const ctx=canvas.getContext('2d');ctx.font='bold 230px Arial';ctx.textAlign='center';ctx.textBaseline='middle';
  if(glow){ctx.shadowColor='#fff7ff';ctx.shadowBlur=28;ctx.fillStyle='#ffffffb0';}
  else ctx.fillStyle='#ffffff';
  ctx.fillText('morada',512,134);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  texture.anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),8);return texture;
}
const logoWhite=logoTexture(),logoGlow=logoTexture(true);
function illuminatedLogo(width,x,y,z,rotation=0){
  const group=new THREE.Group();group.name='Existing Morada logo · independent white light';
  group.position.set(x,y,z);group.rotation.y=rotation;
  const halo=new THREE.Mesh(new THREE.PlaneGeometry(width,width/4),new THREE.MeshBasicMaterial({map:logoGlow,transparent:true,opacity:.45,depthWrite:false,toneMapped:false}));
  const letters=new THREE.Mesh(new THREE.PlaneGeometry(width,width/4),new THREE.MeshBasicMaterial({map:logoWhite,transparent:true,depthWrite:false,toneMapped:false}));
  letters.position.z=.003;group.add(halo,letters);model.add(group);
}
illuminatedLogo(2.05,1.18,2.68,1.587);
illuminatedLogo(1.85,2.587,2.68,0,Math.PI/2);

// Rear display: a graphic placeholder, not an equipment specification.
const displayCanvas = document.createElement('canvas');displayCanvas.width=1400;displayCanvas.height=580;
const ctx=displayCanvas.getContext('2d');
const bg=ctx.createLinearGradient(0,0,1400,580);bg.addColorStop(0,'#b4aaa2');bg.addColorStop(1,'#76615e');ctx.fillStyle=bg;ctx.fillRect(0,0,1400,580);
for(let x=570;x<1400;x+=115){ctx.fillStyle=x%2 ? '#9d9187':'#b5a69a';ctx.fillRect(x,40,100,540);for(let y=70;y<560;y+=90){ctx.fillStyle='#525055';ctx.fillRect(x+14,y,70,48);ctx.fillStyle='#c2b0a0';ctx.fillRect(x+14,y+43,70,5);}}
ctx.fillStyle='#261e27b8';ctx.fillRect(0,0,800,580);ctx.fillStyle='#6d2e91';ctx.fillRect(0,0,1400,65);ctx.fillStyle='#ffffff';ctx.font='24px Arial';ctx.textAlign='center';ctx.fillText('SAN ISIDRO  /  BARRANCO  /  MIRAFLORES',700,43);ctx.textAlign='left';ctx.font='52px Arial';ctx.fillText('Tu próximo espacio.',65,240);ctx.fillText('Tu nueva morada.',65,315);ctx.font='bold 35px Arial';ctx.fillText('morada',65,480);
const displayTexture = new THREE.CanvasTexture(displayCanvas);displayTexture.colorSpace=THREE.SRGBColorSpace;
box(3.7,1.20,.06,0,1.53,-1.41,dark);const rearDisplay=panel(3.62,1.12,0,1.53,-1.375,displayTexture);
// UV windows reuse the supplied image as architectural reference textures.
// They represent existing graphics, not LIGHTMAN deliverables.
const referenceLoader=new THREE.TextureLoader();
function referenceTexture(rect,onLoad){
  referenceLoader.load('assets/morada-frontal-referencia.png',texture=>{
    texture.colorSpace=THREE.SRGBColorSpace;texture.repeat.set(rect[2]/517,rect[3]/400);
    texture.offset.set(rect[0]/517,(400-rect[1]-rect[3])/400);
    texture.anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),8);onLoad(texture);
  });
}
referenceTexture([129,173,247,87],texture=>{rearDisplay.material.map=texture;rearDisplay.material.needsUpdate=true;});
box(4.55,.06,.42,0,.58,-1.19,wood);
box(4.35,.42,.35,0,.34,-1.22,mat('#8c7d70'));
for(const x of [-1.5,1.5]) box(.9,.045,.23,x,1.02,-1.32,ivory);

// Abstract posters on the side wall and the corner pillar.
const sidePoster=textTexture('morada', '#e4dfd9','#6b348e',512,1024,'bold 70px Arial');
const leftPoster=panel(.65,1.57,-2.448,1.35,.7,sidePoster,Math.PI/2);
box(.55,2.32,.12,2.23,1.16,1.43,posterMat);
const rightPoster=panel(.47,1.57,2.23,1.35,1.496,sidePoster);
referenceTexture([38,153,30,171],texture=>{leftPoster.material.map=texture;leftPoster.material.needsUpdate=true;});
referenceTexture([449,158,25,164],texture=>{rightPoster.material.map=texture;rightPoster.material.needsUpdate=true;});

// Meeting table, six chairs and simple service objects.
box(4.1,.09,.62,0,.665,.48,purple);
for(const x of [-1.82,1.82]) for(const z of [.29,.67]) box(.045,.62,.045,x,.31,z,dark);
for(let i=0;i<6;i++) {
  const x=-1.72+i*.69;
  box(.44,.045,.43,x,.36,1.13,wood);
  box(.44,.16,.045,x,.59,1.36,wood);
  for(const dx of [-.19,.19]) box(.028,.26,.03,x+dx,.48,1.36,wood);
  for(const dx of [-.17,.17]) for(const dz of [-.16,.16]) box(.028,.35,.028,x+dx,.175,1.13+dz,wood);
}
box(.25,.19,.2,-.6,.71,-1.15,dark);
box(.14,.17,.12,-.22,.7,-1.18,mat('#e7ded3'));
const leafMat=mat('#395c39'), potMat=mat('#d2c3ae');
for(const x of [-.72,.72]){
  box(.18,.17,.18,x,1.13,-1.26,potMat);
  for(let i=0;i<7;i++){
    const leaf=new THREE.Mesh(new THREE.SphereGeometry(.11,8,6),leafMat);leaf.scale.set(.45,.8,.45);leaf.position.set(x+Math.sin(i*2.4)*.09,1.25+Math.cos(i*1.1)*.035,-1.24+Math.cos(i*2.4)*.07);leaf.rotation.z=Math.sin(i)*.6;model.add(leaf);
  }
}

// White existing ceiling strip, shown separately from addressable LED lines.
const whiteLED = new THREE.MeshBasicMaterial({color:'#fff5eb'});
box(4.75,.018,.018,0,2.30,1.36,whiteLED);
box(4.75,.018,.018,0,2.30,-1.36,whiteLED);
box(.018,.018,2.72,-2.36,2.30,0,whiteLED);
box(.018,.018,2.72,2.36,2.30,0,whiteLED);

scene.add(new THREE.HemisphereLight('#f6eaff','#292035',1.7));
const key = new THREE.DirectionalLight('#fff4e8',2.2);key.position.set(3,7,5);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-6;key.shadow.camera.right=6;key.shadow.camera.top=6;key.shadow.camera.bottom=-6;key.shadow.normalBias=.04;scene.add(key);
const fill = new THREE.DirectionalLight('#b69bff',1.8);fill.position.set(-4,4,-2);scene.add(fill);
const roomLight = new THREE.PointLight('#fff1df',10,7,2);roomLight.position.set(0,2.2,0);scene.add(roomLight);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(200,200),mat('#131218'));floor.rotation.x=-Math.PI/2;floor.position.y=-.09;floor.receiveShadow=true;scene.add(floor);
const grid = new THREE.GridHelper(28,28,'#302439','#211c27');grid.position.y=-.085;grid.material.transparent=true;grid.material.opacity=.6;scene.add(grid);

// Vertex-coloured continuous LED bars. Bloom is emulated with transparent outer bars.
const ledSegments=[];
const colour=new THREE.Color();
function ledLine(a,b,phase){
  const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),length=start.distanceTo(end);
  const geometry=new THREE.BoxGeometry(.025,length,.025,1,Math.max(8,Math.ceil(length*12)),1);
  const position=geometry.attributes.position;
  const colours=new Float32Array(position.count*3);
  geometry.setAttribute('color',new THREE.BufferAttribute(colours,3));
  const material=new THREE.MeshBasicMaterial({vertexColors:true,toneMapped:false});
  const mesh=new THREE.Mesh(geometry,material);mesh.position.copy(start).add(end).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),end.clone().sub(start).normalize());model.add(mesh);
  const halo=new THREE.Mesh(new THREE.BoxGeometry(.09,length,.09),new THREE.MeshBasicMaterial({color:'#b259ff',transparent:true,opacity:.18,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false}));halo.position.copy(mesh.position);halo.quaternion.copy(mesh.quaternion);model.add(halo);
  ledSegments.push({mesh,halo,phase,length,span:length/16,position,colours});
}
const x=2.59,z=1.59;
for(const y of [2.36,3.005]) {
  ledLine([-x,y,z],[x,y,z],0);
  ledLine([x,y,z],[x,y,-z],5/16);
  ledLine([x,y,-z],[-x,y,-z],.5);
  ledLine([-x,y,-z],[-x,y,z],13/16);
}
// Vertical light runs stop at the fascia. No LED line is added to the floor.
for(const [lx,lz,phase] of [[-2.55,1.57,0],[2.55,1.57,5/16],[-2.55,-1.46,13/16],[2.55,-1.46,8/16]]) ledLine([lx,.03,lz],[lx,2.34,lz],phase);
// Fascia corners connect the two horizontal contours.
for(const [lx,lz,phase] of [[-x,z,0],[x,z,5/16],[x,-z,8/16],[-x,-z,13/16]]) ledLine([lx,2.36,lz],[lx,3.005,lz],phase);

const colourBounces=[];
for(const [lx,lz,phase] of [[-2.3,1.3,0],[2.3,1.3,5/16],[2.3,-1.3,8/16],[-2.3,-1.3,13/16]]) {
  const light=new THREE.PointLight('#a62bff',1.4,3,2);light.position.set(lx,2.35,lz);scene.add(light);colourBounces.push({light,phase});
}

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
// The user explicitly requested automatic motion on opening; pause remains available.
let mode='gradient', gradientPreset='morada', speed=1, intensity=.8, paused=false, elapsed=0, previous=0, visible=true;
const pauseButton=document.querySelector('#pause');
function renderPause(){pauseButton.textContent=paused?'▶':'Ⅱ';pauseButton.setAttribute('aria-label',paused?'Reanudar animación':'Pausar animación');pauseButton.setAttribute('aria-pressed',String(paused));}
renderPause();
pauseButton.addEventListener('click',()=>{paused=!paused;renderPause();});
document.querySelector('#intensity').addEventListener('input',event=>{intensity=Number(event.target.value)/100;});
function updateEffectUI(){
  document.querySelector('#effect-description').textContent=mode==='gradient'?gradientPresets[gradientPreset].description:effectDescriptions[mode];
  document.querySelector('#effect-swatch').dataset.effect=mode;
  document.querySelector('#effect-swatch').style.background=mode==='gradient'?gradientPresets[gradientPreset].css:'';
  document.querySelector('#gradient-options').hidden=mode!=='gradient';
  document.querySelectorAll('[data-scene]').forEach(item=>{const selected=item.dataset.scene===mode;item.classList.toggle('selected',selected);item.setAttribute('aria-pressed',String(selected));});
  document.querySelectorAll('[data-gradient]').forEach(item=>{const selected=item.dataset.gradient===gradientPreset;item.classList.toggle('selected',selected);item.setAttribute('aria-pressed',String(selected));});
}
function setMode(next){
  mode=next;
  // Explicitly selecting a dynamic scene resumes its preview after a pause.
  if(mode!=='static' && !reducedMotion){paused=false;renderPause();}
  updateEffectUI();
}
document.querySelectorAll('[data-scene]').forEach(button=>button.addEventListener('click',()=>setMode(button.dataset.scene)));
document.querySelectorAll('[data-gradient]').forEach(button=>button.addEventListener('click',()=>{
  gradientPreset=button.dataset.gradient;setMode('gradient');
}));
document.querySelector('#speed').addEventListener('input',event=>{
  speed=Number(event.target.value);
  controls.autoRotateSpeed=.25*speed;
  document.querySelector('#speed-value').value=`${new Intl.NumberFormat('es-PE',{maximumFractionDigits:2}).format(speed)}×`;
});
updateEffectUI();
document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>{
  const view=button.dataset.view;
  ceiling.visible=view!=='top';
  if(view==='front'){camera.position.set(0,1.55,8.8);controls.target.set(0,1.5,0);}
  else if(view==='top'){camera.position.set(.01,12,.01);controls.target.set(0,0,0);}
  else{camera.position.set(6.2,2.4,8.8);controls.target.set(0,1.45,0);}
  controls.update();
  document.querySelectorAll('[data-view]').forEach(item=>{item.classList.toggle('selected',item===button);item.setAttribute('aria-pressed',String(item===button));});
}));
const rotateButton=document.querySelector('#rotate');
rotateButton.addEventListener('click',()=>{controls.autoRotate=!controls.autoRotate;rotateButton.setAttribute('aria-pressed',String(controls.autoRotate));});
controls.addEventListener('start',()=>{document.querySelectorAll('[data-view]').forEach(button=>{button.classList.remove('selected');button.setAttribute('aria-pressed','false');});});
function resize(){const width=host.clientWidth,height=host.clientHeight;renderer.setSize(width,height);camera.aspect=width/height;camera.zoom=Math.min(1.65,Math.max(.85,camera.aspect*.8));camera.updateProjectionMatrix();}
new ResizeObserver(resize).observe(host);resize();
new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;},{rootMargin:'100px'}).observe(host);
renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();window.dispatchEvent(new Event('morada-viewer-error'));});
function draw(time){
  requestAnimationFrame(draw);
  const dt=previous?Math.min((time-previous)/1000,.06):0;previous=time;
  if(!visible||document.hidden)return;
  if(!paused)elapsed+=dt*speed;
  for(const segment of ledSegments){
    const {mesh,halo,phase,span,length,position,colours}=segment;
    for(let i=0;i<position.count;i++){
      const t=(position.getY(i)/length+.5)*span+phase;
      const sample=sampleEffect(mode,t,elapsed,gradientPreset);
      colour.setRGB(...sample.rgb,THREE.SRGBColorSpace).multiplyScalar(intensity*sample.gain);
      colours[i*3]=colour.r;colours[i*3+1]=colour.g;colours[i*3+2]=colour.b;
    }
    mesh.geometry.attributes.color.needsUpdate=true;
    const centre=sampleEffect(mode,phase+span/2,elapsed,gradientPreset);
    halo.material.color.setRGB(...centre.rgb,THREE.SRGBColorSpace);
    halo.material.opacity=.22*intensity*centre.gain;
  }
  for(const {light,phase} of colourBounces){const sample=sampleEffect(mode,phase,elapsed,gradientPreset);light.color.setRGB(...sample.rgb,THREE.SRGBColorSpace);light.intensity=1.7*intensity*sample.gain;}
  const rotate=controls.autoRotate; if(paused)controls.autoRotate=false;controls.update(dt);controls.autoRotate=rotate;
  renderer.render(scene,camera);
}
requestAnimationFrame(draw);
