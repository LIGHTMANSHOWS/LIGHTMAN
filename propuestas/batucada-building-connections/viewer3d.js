import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createTronMask } from './tron-mask.js?v=5.7';
import { createUrbanCostume } from './urban-costume.js?v=5.7';
import { createPixelEffects } from './pixel-effects.js?v=5.7';
import { setupMusic } from './music.js?v=5.7';

const $=s=>document.querySelector(s),canvas=$('#stage');
document.querySelectorAll('[data-count],[data-view],[data-format]').forEach(b=>b.disabled=true);
const state={count:10,brand:'Building Connections',color:'#54f2cb',effect:'pulse',pixelEffect:'chase',pixelSpeed:1,flagScale:.8,screenScale:.8,logo:null,paused:matchMedia('(prefers-reduced-motion:reduce)').matches,time:0,view:'ensemble',light:'event'};
const pixels=createPixelEffects(state),music=setupMusic();
const scene=new THREE.Scene();scene.background=new THREE.Color('#11161d');scene.fog=new THREE.FogExp2('#11161d',.024);
const camera=new THREE.PerspectiveCamera(38,1,.05,90);camera.position.set(7,3.6,11.6);
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
const controls=new OrbitControls(camera,canvas);controls.target.set(0,1.1,0);controls.enableDamping=true;controls.dampingFactor=.07;controls.minDistance=1.2;controls.maxDistance=24;controls.maxPolarAngle=Math.PI*.49;controls.minPolarAngle=.1;
const env=new THREE.PMREMGenerator(renderer);scene.environment=env.fromScene(new RoomEnvironment(),.025).texture;env.dispose();
const hemi=new THREE.HemisphereLight('#d9eaff','#444648',.75);scene.add(hemi);
const key=new THREE.DirectionalLight('#fff1df',2.5);key.position.set(3.5,7,5);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-7,right:7,top:5,bottom:-6,near:.1,far:25});key.shadow.normalBias=.025;key.shadow.bias=-.00015;scene.add(key);
const rim=new THREE.DirectionalLight('#82aeff',2.7);rim.position.set(-5,4,-3);scene.add(rim);
const fill=new THREE.DirectionalLight('#8be7d0',.8);fill.position.set(-5,2,4);scene.add(fill);
const composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));const bloom=new UnrealBloomPass(new THREE.Vector2(900,600),.35,.55,1.15);composer.addPass(bloom);composer.addPass(new OutputPass());
const avatars=[],surfaces=[],dynamicFabrics=[],emitMaterials=[];
const clock=new THREE.Clock();let source=null,headGeometry=null,skinMaterial=null,sourceHeight=1,sourceMinY=0,transition=null,ready=false,lastRender=0,lastMobile=null;
const q1=new THREE.Quaternion(),q2=new THREE.Quaternion(),v1=new THREE.Vector3(),v2=new THREE.Vector3();
const V=(x,y,z)=>new THREE.Vector3(x,y,z);

function weaveTexture(){const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d');const im=x.createImageData(256,256);let seed=31;for(let i=0;i<im.data.length;i+=4){seed=(seed*1664525+1013904223)>>>0;const j=i/4,u=j%256,v=Math.floor(j/256);let n=72+(seed%22)+(u%3===0?12:0)-(v%3===0?10:0);im.data.set([n,n,n,255],i);}x.putImageData(im,0,0);const tex=new THREE.CanvasTexture(c);tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.repeat.set(10,10);return tex;}
const fabricMap=weaveTexture();
const cloth=new THREE.MeshStandardMaterial({color:'#07090d',roughness:.95,metalness:0,bumpMap:fabricMap,bumpScale:.0018,envMapIntensity:.25});
const rubber=new THREE.MeshStandardMaterial({color:'#06080b',roughness:.82,metalness:.05,envMapIntensity:.3});
const steel=new THREE.MeshStandardMaterial({color:'#8d9aa4',metalness:.92,roughness:.23});
const blackMetal=new THREE.MeshStandardMaterial({color:'#181e26',metalness:.68,roughness:.32});
const brass=new THREE.MeshStandardMaterial({color:'#d6ac4c',metalness:.9,roughness:.21});
const headSkin=new THREE.MeshStandardMaterial({color:'#080b0e',roughness:.92,bumpMap:fabricMap,bumpScale:.001,envMapIntensity:.25});
function mesh(geo,mat,parent,pos){const m=new THREE.Mesh(geo,mat);if(pos)m.position.copy(pos);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function tube(points,r,material,parent){const curve=new THREE.CatmullRomCurve3(points.map(p=>Array.isArray(p)?V(...p):p));return mesh(new THREE.TubeGeometry(curve,Math.max(10,points.length*7),r,7,false),material,parent);}
function rod(a,b,r,mat,parent){const d=b.clone().sub(a),m=mesh(new THREE.CylinderGeometry(r,r,d.length(),10),mat,parent,a.clone().add(b).multiplyScalar(.5));m.quaternion.setFromUnitVectors(V(0,1,0),d.normalize());return m;}
function roundedBox(w,h,d,r=.025){const s=new THREE.Shape();const x=-w/2,y=-h/2;const rr=Math.min(r,w/2,h/2);s.moveTo(x+rr,y);s.lineTo(x+w-rr,y);s.quadraticCurveTo(x+w,y,x+w,y+rr);s.lineTo(x+w,y+h-rr);s.quadraticCurveTo(x+w,y+h,x+w-rr,y+h);s.lineTo(x+rr,y+h);s.quadraticCurveTo(x,y+h,x,y+h-rr);s.lineTo(x,y+rr);s.quadraticCurveTo(x,y,x+rr,y);const g=new THREE.ExtrudeGeometry(s,{depth:d,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:Math.min(rr*.3,.006),bevelThickness:.003,curveSegments:6});g.translate(0,0,-d/2);return g;}
function emissive(color,intensity=2){const m=new THREE.MeshStandardMaterial({color:new THREE.Color(color).multiplyScalar(.3),emissive:color,emissiveIntensity:intensity,roughness:.4,metalness:.1});emitMaterials.push(m);return m;}
const ledGreen=emissive(state.color,1.35),ledOrange=emissive('#ff992b',.9);

// Woven PBR shells sit above a skinned human mesh and follow its bones.
function garment(a,b,r0,r1){const len=a.distanceTo(b),segments=26,sides=18,pos=[],uv=[],idx=[];for(let j=0;j<=segments;j++){const t=j/segments,r=THREE.MathUtils.lerp(r0,r1,t)*(1+.011*Math.sin(t*17)+.007*Math.sin(t*31));for(let i=0;i<=sides;i++){const ang=i/sides*Math.PI*2,fold=.0009*Math.sin(i*3+t*23);pos.push(Math.cos(ang)*(r+fold),t*len,Math.sin(ang)*(r+fold)*.87);uv.push(i/sides,t);}}
 for(let j=0;j<segments;j++)for(let i=0;i<sides;i++){const n=j*(sides+1)+i;idx.push(n,n+sides+2,n+1,n,n+sides+1,n+sides+2);}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();const obj=new THREE.Mesh(g,cloth);obj.position.copy(a);obj.quaternion.setFromUnitVectors(V(0,1,0),b.clone().sub(a).normalize());obj.castShadow=obj.receiveShadow=true;return obj;}
function shirt(hipY,chestY){const rings=[[hipY-.09,.17,.12],[hipY+.01,.18,.13],[hipY+.16,.19,.135],[chestY-.08,.21,.145],[chestY+.04,.24,.14],[chestY+.11,.21,.12],[chestY+.16,.13,.08],[chestY+.18,.067,.064]],pos=[],uv=[],idx=[],N=36;for(let j=0;j<rings.length;j++){const [y,rx,rz]=rings[j];for(let i=0;i<=N;i++){const a=i/N*Math.PI*2,fold=.0025*Math.sin(a*8+j*1.2);pos.push(Math.cos(a)*(rx+fold),y,Math.sin(a)*(rz+fold)+.006);uv.push(i/N,j/(rings.length-1));}}for(let j=0;j<rings.length-1;j++)for(let i=0;i<N;i++){const n=j*(N+1)+i;idx.push(n,n+N+2,n+1,n,n+N+1,n+N+2);}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();const m=new THREE.Mesh(g,cloth);m.castShadow=m.receiveShadow=true;return m;}
function bind(obj,bone,group){group.add(obj);group.updateMatrixWorld(true);bone.attach(obj);return obj;}
function ledStrip(points,mat,group,bone,width=.024){const curve=new THREE.CatmullRomCurve3(points);const len=curve.getLength(),n=Math.ceil(len/.018);const holder=new THREE.Group();tube(points,.009,rubber,holder);const geo=new THREE.BoxGeometry(width,.011,.007);const inst=new THREE.InstancedMesh(geo,pixels.material,n+1);const o=new THREE.Object3D(),diodes=[];for(let i=0;i<=n;i++){const u=i/n,p=curve.getPoint(u),t=curve.getTangent(u);diodes.push(p.clone());o.position.copy(p).add(V(0,0,.011));o.quaternion.setFromUnitVectors(V(0,1,0),t);o.updateMatrix();inst.setMatrixAt(i,o.matrix);}pixels.register(inst,diodes);holder.add(inst);return bind(holder,bone,group);}

// One physical, see-through LED plane: its back naturally shows the same image mirrored.
let lastTexture=0;const displayVariants=[];
function surfaceMaterial(cols,rows,kind='screen'){
 const c=document.createElement('canvas');c.width=cols*8;c.height=rows*8;
 const source=document.createElement('canvas');source.width=cols;source.height=rows;
 const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
 displayVariants.push({c,ctx:c.getContext('2d'),source,srcCtx:source.getContext('2d',{willReadFrequently:true}),tex,cols,rows,kind});
 return new THREE.MeshStandardMaterial({map:tex,emissiveMap:tex,emissive:'#ffffff',emissiveIntensity:1.35,roughness:.56,metalness:.05,side:kind!=='screen'?THREE.DoubleSide:THREE.FrontSide,transparent:kind!=='screen',depthWrite:kind==='screen',forceSinglePass:true});
}
function updateBrand(t=0,rhythm=music.sample(t)){
 const col=new THREE.Color(state.color),violet=new THREE.Color('#bd55ff'),pulse=state.effect==='pulse'?.65+.35*rhythm.accent:1;
 for(const d of displayVariants){const {cols,rows,ctx,srcCtx,kind}=d,flag=kind==='flag',sheer=kind!=='screen';
  srcCtx.clearRect(0,0,cols,rows);
  if(state.logo){const scale=flag?state.flagScale:state.screenScale,r=Math.min((cols-4)/state.logo.width,(rows-4)/state.logo.height)*scale;srcCtx.drawImage(state.logo,(cols-state.logo.width*r)/2,(rows-state.logo.height*r)/2,state.logo.width*r,state.logo.height*r);}
  const data=srcCtx.getImageData(0,0,cols,rows).data;
  ctx.clearRect(0,0,d.c.width,d.c.height);if(!sheer){ctx.fillStyle='#010304';ctx.fillRect(0,0,d.c.width,d.c.height);}
  for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
   const i=(y*cols+x)*4,alpha=data[i+3]/255,sweep=state.effect==='sweep'?Math.pow(Math.max(0,Math.cos(x/cols*7-rhythm.beat*Math.PI*2+y*.03)),12):0,base=sheer?violet:col;
   const gain=(sheer?.45:.10)+sweep*.45;let r=base.r*255*gain,g=base.g*255*gain,b=base.b*255*gain;
   if(alpha>.01){r=r*(1-alpha)+data[i]*alpha;g=g*(1-alpha)+data[i+1]*alpha;b=b*(1-alpha)+data[i+2]*alpha;}
   if(x===0||y===0||x===cols-1||y===rows-1){r=base.r*190;g=base.g*190;b=base.b*190;}
   ctx.fillStyle=`rgb(${r*pulse},${g*pulse},${b*pulse})`;ctx.beginPath();ctx.arc(x*8+4,y*8+4,2.15,0,Math.PI*2);ctx.fill();
  }d.tex.needsUpdate=true;
 }
}
const panelMat=surfaceMaterial(120,80,'flag'),capeMat=surfaceMaterial(80,120,'cape'),drumMat=surfaceMaterial(128,40);updateBrand();
function clothPanel(w,h,type,phase,display=true){const group=new THREE.Group();const geo=new THREE.PlaneGeometry(w,h,type==='cape'?30:32,24);const base=geo.attributes.position.array.slice();const front=new THREE.Mesh(geo,display?(type==='cape'?capeMat:panelMat):cloth);front.castShadow=false;front.receiveShadow=false;group.add(front);dynamicFabrics.push({geo,base,w,h,type,phase});return group;}

function drum(role){const g=new THREE.Group();const radius=role==='bombo'?.245:role==='tarola'?.19:.155,height=role==='bombo'?.34:role==='tarola'?.15:.29;const body=mesh(new THREE.CylinderGeometry(radius,radius,height,48,1,true),blackMetal,g);body.position.y=-height/2;
 const skin=new THREE.MeshStandardMaterial({color:'#c9c4b7',roughness:.82,metalness:.02});mesh(new THREE.CylinderGeometry(radius*.96,radius*.96,.008,48),skin,g,V(0,.003,0));
 for(const yy of [.009,-height]){const ring=mesh(new THREE.TorusGeometry(radius,.009,8,48),steel,g,V(0,yy,0));ring.rotation.x=Math.PI/2;}
 for(let i=0;i<8;i++){const a=i/8*Math.PI*2,x=Math.sin(a)*(radius+.008),z=Math.cos(a)*(radius+.008);rod(V(x,-.018,z),V(x,-height+.02,z),.004,steel,g);mesh(new THREE.SphereGeometry(.009,7,5),steel,g,V(x,-.025,z));}
 const ledGeo=new THREE.CylinderGeometry(radius+.012,radius+.012,height*.85,70,1,true,-Math.PI*.7,Math.PI*1.4);ledGeo.scale(-1,1,1);ledGeo.computeVertexNormals();
 // Cylinder normals face outward. The UV wrap follows the curved drum shell.
 const display=new THREE.Mesh(new THREE.CylinderGeometry(radius+.012,radius+.012,height*.85,64,1,true,-Math.PI*.67,Math.PI*1.34),drumMat);display.position.y=-height*.5;g.add(display);surfaces.push(display);
 const strapMat=new THREE.MeshStandardMaterial({color:'#181c22',roughness:.9});tube([[-.18,.4,-.27],[-.2,.22,-.05],[-radius,-.05,.02]],.013,strapMat,g);tube([[.18,.4,-.27],[.2,.22,-.05],[radius,-.05,.02]],.013,strapMat,g);
 return g;
}
function trumpet(){const g=new THREE.Group();
 tube([[0,0,0],[0,0,.1],[.01,-.045,.18],[.015,-.07,.34],[.015,-.04,.49],[.015,.015,.52],[.015,.03,.3],[.015,.03,.18]],.009,brass,g);
 rod(V(0,0,.03),V(0,0,.48),.013,brass,g);
 const pts=[V(.014,0,0),V(.016,.04,0),V(.019,.08,0),V(.028,.12,0),V(.052,.16,0),V(.095,.195,0)];const bell=mesh(new THREE.LatheGeometry(pts,40),brass,g,V(0,0,.46));bell.rotation.x=Math.PI/2;
 const mouth=mesh(new THREE.CylinderGeometry(.014,.009,.02,14),steel,g,V(0,0,0));mouth.rotation.x=Math.PI/2;
 for(let i=0;i<3;i++){const z=.19+i*.045;rod(V(-.02,-.035,z),V(-.02,.055,z),.009,brass,g);mesh(new THREE.CylinderGeometry(.015,.015,.006,14),steel,g,V(-.02,.059,z));}
 return g;
}

function skeletonNodes(model){const out={};model.traverse(o=>{if(o.isBone)out[o.name.replace('mixamorig','').replace(':','')]=o;});return out;}
function world(b){return b.getWorldPosition(new THREE.Vector3());}
function makeAvatar(role,index,costume='tron'){
 const group=new THREE.Group();scene.add(group);const model=clone(source);group.add(model);model.updateMatrixWorld(true);model.scale.multiplyScalar(1.79/sourceHeight);model.position.y-=sourceMinY*1.79/sourceHeight;model.updateMatrixWorld(true);
 model.traverse(o=>{if(o.isMesh){o.material=o.material.name.includes('Joint')?rubber:cloth;o.castShadow=true;o.receiveShadow=true;}});
 const bones=skeletonNodes(model);const rest={};Object.entries(bones).forEach(([n,b])=>rest[n]={q:b.quaternion.clone(),p:b.position.clone()});
 const root=new THREE.Group();group.add(root);const human={group,model,bones,rest,role,index,costume,props:root,base:new THREE.Vector3(),phase:index*.8,footBase:{Left:bones.LeftFoot.getWorldQuaternion(new THREE.Quaternion()),Right:bones.RightFoot.getWorldQuaternion(new THREE.Quaternion())}};
 const headPos=world(bones.Head),hipPos=world(bones.Hips),chestPos=world(bones.Spine2);
 // Cloth volumes cover the mannequin joints with tailored sleeves and trousers.
 for(const side of ['Left','Right']){
  for(const [a,b,r0,r1] of [['Arm','ForeArm',.077,.062],['ForeArm','Hand',.062,.04],['UpLeg','Leg',.108,.088],['Leg','Foot',.088,.053]]){const pa=world(bones[side+a]),pb=world(bones[side+b]);bind(garment(pa,pb,r0,r1),bones[side+a],group);}
  for(const [joint,rx,ry,rz] of [['Arm',.078,.077,.072],['Leg',.083,.095,.078],['ForeArm',.06,.066,.056]]){const p=world(bones[side+joint]);const cover=mesh(new THREE.SphereGeometry(1,22,16),cloth,new THREE.Group());cover.scale.set(rx,ry,rz);cover.position.copy(p);bind(cover,bones[side+joint],group);}
  const foot=world(bones[side+'Foot']);const shoe=new THREE.Group();mesh(new THREE.SphereGeometry(1,20,12),rubber,shoe).scale.set(.065,.055,.145);shoe.position.copy(foot).add(V(0,-.008,.045));bind(shoe,bones[side+'Foot'],group);
  const sole=mesh(roundedBox(.13,.025,.26,.025),rubber,new THREE.Group());sole.position.copy(foot).add(V(0,-.04,.045));bind(sole,bones[side+'Foot'],group);
  const arm0=world(bones[side+'Arm']),arm1=world(bones[side+'ForeArm']),hand=world(bones[side+'Hand']);const sign=side==='Left'?1:-1;
  if(costume==='tron'){
  const upper=[arm0.clone().add(V(0,0,.06)),arm0.clone().lerp(arm1,.8).add(V(0,0,.06))];ledStrip(upper,ledGreen,group,bones[side+'Arm'],.028);
  ledStrip([arm1.clone().lerp(hand,.17).add(V(0,0,.045)),arm1.clone().lerp(hand,.85).add(V(0,0,.04))],ledGreen,group,bones[side+'ForeArm'],.027);
  }
  for(const [a,b,r] of [['UpLeg','Leg',.093],['Leg','Foot',.066]]){const start=world(bones[side+a]),end=world(bones[side+b]);ledStrip([start.clone().lerp(end,.15).add(V(sign*r*.6,0,r*.9)),start.clone().lerp(end,.45).add(V(sign*r*.6,0,r*.9)),start.clone().lerp(end,.9).add(V(sign*r*.6,0,r*.9))],ledGreen,group,bones[side+a],costume==='urban'?.018:.028);}
  // Fingers curl around sticks, horn or pole, rather than remaining in a T pose.
  for(const finger of ['Index','Middle','Ring','Pinky'])for(let k=1;k<=3;k++){const b=bones[side+'Hand'+finger+k];if(b){b.rotation.z=(side==='Left'?-1:1)*.65;rest[side+'Hand'+finger+k].q.copy(b.quaternion);}}
 }
 const chest=shirt(hipPos.y,chestPos.y);bind(chest,bones.Spine2,group);
 const waist=mesh(new THREE.SphereGeometry(1,28,20),cloth,new THREE.Group());waist.scale.set(.19,.16,.14);waist.position.set(0,hipPos.y-.085,.005);bind(waist,bones.Hips,group);
 if(costume==='tron'){
 for(const sign of [-1,1]){
  const y=chestPos.y;
  const onShirt=(x,yy)=>{const rings=[[hipPos.y-.09,.17,.12],[hipPos.y+.01,.18,.13],[hipPos.y+.16,.19,.135],[y-.08,.21,.145],[y+.04,.24,.14],[y+.11,.21,.12],[y+.16,.13,.08],[y+.18,.067,.064]];let a=rings[0],z=rings.at(-1);for(let i=0;i<rings.length-1;i++)if(yy>=rings[i][0]&&yy<=rings[i+1][0]){a=rings[i];z=rings[i+1];break;}const f=THREE.MathUtils.clamp((yy-a[0])/(z[0]-a[0]),0,1),rx=THREE.MathUtils.lerp(a[1],z[1],f),rz=THREE.MathUtils.lerp(a[2],z[2],f);x=THREE.MathUtils.clamp(x,-rx*.96,rx*.96);return V(x,yy,.016+rz*Math.sqrt(Math.max(0,1-x*x/(rx*rx))));};
  // Tron catalogue: diagonal shoulders, two central stems, then lateral waist branches.
  ledStrip([onShirt(sign*.215,y+.075),onShirt(sign*.13,y+.015),onShirt(sign*.044,y-.065),onShirt(sign*.044,y-.18)],ledGreen,group,bones.Spine2,.041);
  ledStrip([onShirt(sign*.044,y-.18),onShirt(sign*.11,y-.185),onShirt(sign*.18,y-.205),onShirt(sign*.176,y-.28)],ledGreen,group,bones.Spine2,.036);
  const wristA=world(bones[(sign>0?'Left':'Right')+'ForeArm']),wristB=world(bones[(sign>0?'Left':'Right')+'Hand']);
  ledStrip([wristA.clone().lerp(wristB,.92).add(V(0,-.025,.035)),wristA.clone().lerp(wristB,.92).add(V(0,.025,.035))],ledGreen,group,bones[(sign>0?'Left':'Right')+'ForeArm'],.025);
 }
 createTronMask({group,bones,headPos,headGeometry,skinMaterial,mesh,tube,bind,cloth,rubber,led:ledGreen});
 }else{createUrbanCostume({group,bones,hipPos,chestPos,headPos,bind,mesh,tube,ledStrip,cloth,rubber,steel,green:ledGreen,orange:ledOrange,headGeometry,skinMaterial});}
 human.headY=headPos.y+.07;human.hipY=hipPos.y;
 if(role==='bandera'){
  const pole=new THREE.Group();rod(V(0,-.65,0),V(0,1.55,0),.012,steel,pole);
  const flag=clothPanel(1.50,1.00,'flag',index);flag.position.set(.77,1.00,0);pole.add(flag);
  for(let n=0;n<7;n++){const ring=mesh(new THREE.TorusGeometry(.017,.0025,6,10),steel,pole,V(.02,.53+n*.155,0));ring.rotation.y=Math.PI/2;}
  root.add(pole);human.instrument=pole;
 }else if(role==='viento'){
  const horn=trumpet();root.add(horn);human.instrument=horn;
 }else{
  const instrument=drum(role);root.add(instrument);human.instrument=instrument;
  human.sticks=[];for(let i=0;i<2;i++){const stick=new THREE.Group();root.add(stick);rod(V(0,0,0),V(0,0,.32),.0045,new THREE.MeshStandardMaterial({color:'#c4a079',roughness:.7}),stick);mesh(new THREE.SphereGeometry(role==='bombo'?.014:.006,10,8),role==='bombo'?rubber:steel,stick,V(0,0,.32));human.sticks.push(stick);}
  // The video also shows luminous capes on percussionists.
  const cape=clothPanel(1.00,1.50,'cape',index);cape.position.set(0,.94,-.165);cape.rotation.y=Math.PI;root.add(cape);human.cape=cape;
 }
 const heightVariation=[.99,1.025,.975,1.01,1.035,.985,1.015,.98,1.025,1][index%10];group.scale.setScalar(heightVariation);
 avatars.push(human);return human;
}

function alignBone(bone,child,target){const a=world(bone),current=world(child).sub(a).normalize(),desired=target.clone().sub(a).normalize();const delta=new THREE.Quaternion().setFromUnitVectors(current,desired),qw=bone.getWorldQuaternion(new THREE.Quaternion());qw.premultiply(delta);const parentQ=bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert();bone.quaternion.copy(parentQ.multiply(qw));bone.updateWorldMatrix(false,true);}
function ik(human,side,part,target,pole){const b=human.bones,upper=b[side+(part==='arm'?'Arm':'UpLeg')],lower=b[side+(part==='arm'?'ForeArm':'Leg')],end=b[side+(part==='arm'?'Hand':'Foot')];const a=world(upper),bpos=world(lower),c=world(end),l1=a.distanceTo(bpos),l2=bpos.distanceTo(c);const delta=target.clone().sub(a),d=Math.min(delta.length(),l1+l2-.0005);const dir=delta.normalize(),cos=THREE.MathUtils.clamp((l1*l1+d*d-l2*l2)/(2*l1*d),-1,1);const poleDir=pole.clone().sub(a);poleDir.addScaledVector(dir,-poleDir.dot(dir)).normalize();const elbow=a.clone().addScaledVector(dir,l1*cos).addScaledVector(poleDir,l1*Math.sqrt(1-cos*cos));alignBone(upper,lower,elbow);alignBone(lower,end,target);}
function pose(h,t,rhythm=music.sample(t)){
 const {bones:b,rest,group,role,phase}=h;Object.entries(rest).forEach(([n,r])=>{b[n].quaternion.copy(r.q);b[n].position.copy(r.p);});
 const pulse=rhythm.beat,activity=Math.min(1,rhythm.energy*1.5),sway=Math.sin(pulse*Math.PI+phase*.08)*activity;
 group.position.copy(h.base);group.rotation.y=Math.sin(pulse*Math.PI*.5+phase*.12)*.028*activity+(h.base.x>2?-.09:h.base.x<-2?.09:0);
 b.Spine.rotation.z+=sway*.024;b.Spine1.rotation.x+=.02+rhythm.kick*.035;b.Head.rotation.x+=rhythm.accent*.025;b.Head.rotation.y+=Math.sin(pulse*Math.PI*.25+phase*.1)*.025*activity;group.updateMatrixWorld(true);
 const toWorld=(x,y,z)=>group.localToWorld(V(x,y,z));
 for(const side of ['Left','Right']){const sign=side==='Left'?1:-1;ik(h,side,'leg',toWorld(sign*.145,.065,.015+sign*sway*.012),toWorld(sign*.25,.55,.28));const foot=b[side+'Foot'],desired=group.getWorldQuaternion(new THREE.Quaternion()).multiply(h.footBase[side]);foot.quaternion.copy(foot.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(desired));foot.updateWorldMatrix(false,true);}
 if(role==='bandera'){
  h.instrument.position.set(.06,1.28,.31);h.instrument.rotation.set(.1,.12*Math.sin(pulse*Math.PI*.5+phase*.1),Math.sin(pulse*Math.PI*.5+phase*.1)*.2-.12);h.instrument.updateMatrixWorld(true);
  const left=h.instrument.localToWorld(V(.032,.14,0)),right=h.instrument.localToWorld(V(-.032,-.29,0));ik(h,'Left','arm',left,toWorld(.55,1.3,.35));ik(h,'Right','arm',right,toWorld(-.48,1.1,.32));
  for(const side of ['Left','Right']){const pole=h.instrument.localToWorld(V(0,side==='Left'?.14:-.29,0));alignBone(b[side+'Hand'],b[side+'HandMiddle1'],pole.add(V(0,.025,.01)));}
 }else if(role==='viento'){
  h.instrument.position.set(0,h.headY-.06,.12);h.instrument.rotation.set(.10+rhythm.accent*.018,0,sway*.018);h.instrument.updateMatrixWorld(true);
  ik(h,'Left','arm',h.instrument.localToWorld(V(.025,-.03,.25)),toWorld(.48,1.28,.26));ik(h,'Right','arm',h.instrument.localToWorld(V(-.04,.04,.25)),toWorld(-.48,1.28,.26));
  for(let i=0;i<3;i++){const finger=b['RightHand'+['Index','Middle','Ring'][i]+'1'];if(finger)finger.rotation.z+=Math.sin(pulse*Math.PI*4+i*1.4)*.13*activity;}
 }else{
  h.instrument.position.set(0,1.02,.30);h.instrument.rotation.x=-.1+rhythm.kick*.006;h.instrument.updateMatrixWorld(true);
  for(let hand=0;hand<2;hand++){
   const sign=hand===0?1:-1,stroke=music.stroke(role,t,hand,h.index%2),lift=stroke.lift;
   const tip=group.worldToLocal(h.instrument.localToWorld(V(sign*.08,.006,.055)));
   const contactDirection=V(-sign*.22,Math.sin(-.38),Math.cos(-.38)).normalize();
   const grip=tip.clone().addScaledVector(contactDirection,-.32).add(V(0,lift*.08,-lift*.025));
   const direction=V(-sign*.22,Math.sin(-.38+lift*1.1),Math.cos(-.38+lift*1.1)).normalize();
   const side=hand===0?'Left':'Right',worldGrip=group.localToWorld(grip.clone()),worldTip=group.localToWorld(grip.clone().addScaledVector(direction,.32));
   ik(h,side,'arm',worldGrip,toWorld(sign*.46,1.15,.06));alignBone(b[side+'Hand'],b[side+'HandMiddle1'],worldTip);
   h.sticks[hand].position.copy(grip);h.sticks[hand].quaternion.setFromUnitVectors(V(0,0,1),direction);
  }
 }
 group.updateMatrixWorld(true);
}

const FORMATIONS={
 10:[
  {role:'bombo',costume:'tron',x:0,z:1.7,cape:true},
  {role:'tarola',costume:'tron',x:-1.45,z:1.05},
  {role:'repique',costume:'tron',x:1.55,z:.92},
  {role:'bombo',costume:'tron',x:-2.5,z:-.15},
  {role:'tarola',costume:'tron',x:-.45,z:-.45},
  {role:'bombo',costume:'tron',x:1.35,z:-.52},
  {role:'viento',costume:'urban',x:2.65,z:-1.42},
  {role:'viento',costume:'urban',x:.1,z:-1.65},
  {role:'bandera',costume:'urban',x:-2.45,z:-2.55},
  {role:'bandera',costume:'urban',x:1.25,z:-2.75}
 ],
 7:[
  {role:'bombo',costume:'tron',x:-.65,z:1.32,cape:true},
  {role:'bombo',costume:'tron',x:1.25,z:.72},
  {role:'tarola',costume:'tron',x:-2.12,z:.02},
  {role:'repique',costume:'tron',x:.05,z:-.45},
  {role:'viento',costume:'urban',x:2.05,z:-1.3},
  {role:'bandera',costume:'urban',x:-2.05,z:-2.13},
  {role:'bandera',costume:'urban',x:.45,z:-2.45}
 ]
};
function setFormation(n){state.count=n;avatars.forEach(h=>{h.group.visible=false;h.active=false;});const available={};avatars.forEach(h=>(available[h.role+':'+h.costume]??=[]).push(h));
 FORMATIONS[n].forEach((entry,i)=>{const key=entry.role+':'+entry.costume;let h=available[key]?.shift();if(!h)h=makeAvatar(entry.role,avatars.length,entry.costume);h.active=true;h.group.visible=true;h.base.set(entry.x,0,entry.z);h.phase=i*.65;h.capeActive=!!entry.cape;if(h.cape)h.cape.visible=!!entry.cape;pose(h,music.time(state.time));});
 document.querySelectorAll('[data-count]').forEach(b=>{const on=Number(b.dataset.count)===n;b.classList.toggle('active',on);b.setAttribute('aria-pressed',on);});
 const tron=FORMATIONS[n].filter(x=>x.costume==='tron').length,urban=n-tron;
 canvas.setAttribute('aria-label',`Escena 3D de ${n} artistas: ${tron} Tron en percusión y ${urban} Urban en vientos y banderas. Arrastra para girar.`);
 canvas.dataset.flagWidth='1.50';canvas.dataset.flagHeight='1.00';canvas.dataset.tronHead='frontal-mask-exposed-ears-neck';
 canvas.dataset.cast=JSON.stringify(FORMATIONS[n].map(x=>({role:x.role,costume:x.costume,cape:!!x.cape})));
 if($('#wardrobe-summary'))$('#wardrobe-summary').textContent=`${tron} TRON · ${urban} URBAN`;
 setView('ensemble');
}
function setView(view){state.view=view;let p,target;const mobile=canvas.clientWidth<600;
 if(view==='ensemble'){avatars.forEach(h=>h.group.visible=!!h.active);p=state.count===10?V(mobile?7:3.3,2.65,mobile?16:10.4):V(mobile?6:3,2.4,mobile?14:9.4);target=V(0,1.1,-.25);}
 else{const role=view==='detail'?'bombo':view.startsWith('flag')?'bandera':view==='horn'?'viento':'bombo';const h=avatars.find(h=>h.role===role&&h.active);avatars.forEach(v=>v.group.visible=v===h);const center=h?.base||V(0,0,0);target=center.clone().add(view==='mask'?V(0,h.headY,0):view.startsWith('flag')?V(mobile?.65:.45,mobile?1.7:1.48,0):V(0,1.05,0));p=center.clone().add(view==='mask'?V(.62,h.headY+.08,1.14):view==='flag-back'?V(mobile?-2.2:-1.8,mobile?2.7:2.2,mobile?-7:-5):view==='flag'?V(mobile?2.2:1.8,mobile?2.7:2.2,mobile?7:5):view==='horn'?V(1.5,1.65,2.6):view==='cape-front'?V(1.5,1.7,3):view==='cape'?V(-1.4,1.6,-3):V(1.55,1.55,2.9));}
 const scoreTime=music.time(state.time);avatars.forEach(h=>{if(h.group.visible)pose(h,scoreTime);});animateFabrics(music.sample(scoreTime).beat*.55);
 transition={from:camera.position.clone(),to:p,start:performance.now(),fromTarget:controls.target.clone(),toTarget:target};document.querySelectorAll('[data-view]').forEach(b=>{const on=b.dataset.view===view;b.classList.toggle('active',on);b.setAttribute('aria-pressed',on);});if($('#stage-caption'))$('#stage-caption').textContent=view==='ensemble'?`${state.count} ARTISTAS · 3D INTERACTIVO`:view==='mask'?'TRON · MÁSCARA FRONTAL':view==='flag-back'?'BANDERAS · REVERSO EN ESPEJO':view==='flag'?'BANDERAS · 1,50 × 1,00 M':view==='horn'?'URBAN · VIENTO':view==='cape-front'?'CAPA TRANSPARENTE · CARA INTERIOR':view==='cape'?'TRON · CAPA LED CENTRAL':'TRON · PERCUSIÓN';if($('#detail-view')){$('#detail-view').textContent=view==='ensemble'?'Acercar la marca ↗':'Ver elenco completo ↗';$('#detail-view').setAttribute('aria-pressed',view!=='ensemble');}}

// Event-like floor, shadows, floor markings and rear truss provide scale cues.
const floorCanvas=document.createElement('canvas');floorCanvas.width=floorCanvas.height=512;const fcx=floorCanvas.getContext('2d');fcx.fillStyle='#171819';fcx.fillRect(0,0,512,512);let seed=31;for(let i=0;i<25000;i++){seed=(seed*1664525+1013904223)>>>0;const x=seed%512;seed=(seed*1664525+1013904223)>>>0;const y=seed%512;fcx.fillStyle=`rgba(20,24,28,${(seed%15)/100})`;fcx.fillRect(x,y,1,1);}fcx.strokeStyle='#060708';fcx.lineWidth=5;fcx.strokeRect(0,0,512,512);fcx.strokeStyle='#26282a';fcx.lineWidth=1;fcx.strokeRect(4,4,504,504);const floorTex=new THREE.CanvasTexture(floorCanvas);floorTex.colorSpace=THREE.SRGBColorSpace;floorTex.wrapS=floorTex.wrapT=THREE.RepeatWrapping;floorTex.repeat.set(40,40);const floor=mesh(new THREE.PlaneGeometry(50,50),new THREE.MeshPhysicalMaterial({map:floorTex,color:'#383838',bumpMap:floorTex,bumpScale:.004,roughness:.9,metalness:0,envMapIntensity:.02,specularIntensity:.08,fog:false}),scene);floor.rotation.x=-Math.PI/2;floor.position.y=-.018;floor.receiveShadow=true;floor.castShadow=false;
// Subtle grout catches the light, while the black tile stays dark under the event rig.
const grout=[];for(let p=-25;p<=25;p+=1.25)grout.push(-25,-.016,p,25,-.016,p,p,-.016,-25,p,-.016,25);
const groutGeometry=new THREE.BufferGeometry();groutGeometry.setAttribute('position',new THREE.Float32BufferAttribute(grout,3));scene.add(new THREE.LineSegments(groutGeometry,new THREE.LineBasicMaterial({color:'#33363a',transparent:true,opacity:.32})));
const truss=new THREE.Group();scene.add(truss);for(const x of [-6,6]){for(const z of [-4.5,-4.2])rod(V(x,0,z),V(x,4,z),.035,steel,truss);for(let y=.3;y<4;y+=.4)rod(V(x,y,-4.5),V(x,y+.35,-4.2),.018,steel,truss);}for(const y of [3.7,4])rod(V(-6,y,-4.4),V(6,y,-4.4),.035,steel,truss);for(let x=-6;x<6;x+=.5)rod(V(x,3.7,-4.4),V(x+.5,4,-4.4),.018,steel,truss);
for(const x of [-4,0,4]){const can=mesh(new THREE.CylinderGeometry(.11,.11,.26,18),blackMetal,truss,V(x,3.55,-4.25));can.rotation.x=.5;mesh(new THREE.CircleGeometry(.095,20),emissive(x===0?'#78c6ff':'#f5dfad',1),truss,V(x,3.45,-4.1)).rotation.x=-.4;}

function animateFabrics(t){for(const f of dynamicFabrics){const a=f.geo.attributes.position.array;for(let i=0;i<a.length;i+=3){const x=f.base[i],y=f.base[i+1],cape=f.type==='cape',edge=cape?(f.h/2-y)/f.h:(x/f.w+.5);a[i]=x*(cape?.65+.45*edge:1)+(cape?.012*Math.sin(y*7+t*2+f.phase)*edge:0);a[i+1]=y+(cape?-.065*Math.pow(Math.abs(x)/(f.w/2),1.4)*(1-edge)+.012*Math.sin(x*18+t)*edge*edge:.025*Math.sin(x*8-t*2+f.phase));a[i+2]=edge*(.055*Math.sin(x*8-t*3+f.phase)+.026*Math.sin(y*9+t*2))+(cape?.08*edge*edge+.065*Math.cos(x/f.w*Math.PI*2)+.026*Math.sin(x*25+f.phase)*(.2+.8*edge):0);}f.geo.attributes.position.needsUpdate=true;f.geo.computeVertexNormals();}}
function resize(){const r=canvas.getBoundingClientRect();if(!r.width||!r.height)return;renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();composer.setSize(r.width,r.height);const mobile=r.width<600;if(lastMobile!==null&&lastMobile!==mobile&&ready)setView(state.view);lastMobile=mobile;}
new ResizeObserver(resize).observe(canvas);resize();
let lastPixels=-1,lastPoseTime=NaN,lastMusicRevision=-1;
function animate(ms){
 requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.05);if(document.hidden)return;
 if(!state.paused&&!music.linked)state.time+=dt;
 const scoreTime=music.time(state.time),rhythm=music.sample(scoreTime),changed=scoreTime!==lastPoseTime||music.revision!==lastMusicRevision;
 if((!state.paused||music.linked)&&changed){
  avatars.forEach(h=>{if(h.group.visible)pose(h,scoreTime,rhythm);});animateFabrics(rhythm.beat*.55);
  if(Math.abs(scoreTime-lastTexture)>.035||music.revision!==lastMusicRevision){updateBrand(scoreTime,rhythm);lastTexture=scoreTime;}
  if(ms-lastPixels>30||music.revision!==lastMusicRevision){pixels.update(scoreTime,rhythm.energy,rhythm);lastPixels=ms;}
  lastPoseTime=scoreTime;lastMusicRevision=music.revision;
  canvas.dataset.scoreTime=scoreTime.toFixed(4);canvas.dataset.syncMode=music.linked?'audio':'preview';canvas.dataset.beat=rhythm.beat.toFixed(4);
 }
 if(transition){const u=THREE.MathUtils.clamp((ms-transition.start)/800,0,1),s=u*u*(3-2*u);camera.position.lerpVectors(transition.from,transition.to,s);controls.target.lerpVectors(transition.fromTarget,transition.toTarget,s);if(u===1)transition=null;}
 controls.update();composer.render();
}
requestAnimationFrame(animate);
controls.addEventListener('start',()=>transition=null);

document.querySelectorAll('[data-count]').forEach(b=>b.addEventListener('click',()=>{if(ready){setFormation(Number(b.dataset.count));if(innerWidth<681)$('.viewer-area')?.scrollIntoView({behavior:'smooth'});}}));
document.querySelectorAll('[data-format]').forEach(b=>b.addEventListener('click',()=>{if(ready)setFormation(Number(b.dataset.format));$('#simulador')?.scrollIntoView({behavior:'smooth'});}));
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{if(ready)setView(b.dataset.view);}));
$('#detail-view')?.addEventListener('click',()=>setView(state.view==='ensemble'?'detail':'ensemble'));
$('#camera-reset')?.addEventListener('click',()=>setView('ensemble'));
$('#full-view')?.addEventListener('click',()=>{const element=$('.viewer-area')||$('.stage-wrap');if(document.fullscreenElement)document.exitFullscreen();else element.requestFullscreen?.();});
document.querySelectorAll('[data-color]').forEach(b=>b.addEventListener('click',()=>{state.color=b.dataset.color;ledGreen.color.set(state.color).multiplyScalar(.3);ledGreen.emissive.set(state.color);document.querySelectorAll('[data-color]').forEach(v=>{const on=v===b;v.classList.toggle('active',on);v.setAttribute('aria-pressed',on);});pixels.update(music.time(state.time),music.energy(),music.sample(music.time(state.time)));updateBrand(music.time(state.time));}));
$('#pixel-effect')?.addEventListener('change',e=>{state.pixelEffect=e.target.value;pixels.update(music.time(state.time),music.energy(),music.sample(music.time(state.time)));});
$('#pixel-speed')?.addEventListener('input',e=>{state.pixelSpeed=Number(e.target.value)/100;$('#pixel-speed-value').value=state.pixelSpeed.toFixed(1)+'×';pixels.update(music.time(state.time),music.energy(),music.sample(music.time(state.time)));});
$('#effect')?.addEventListener('change',e=>{state.effect=e.target.value;updateBrand(music.time(state.time));});
for(const [id,key,out] of [['flag-scale','flagScale','flag-scale-value'],['screen-scale','screenScale','screen-scale-value']])$('#'+id)?.addEventListener('input',e=>{state[key]=Number(e.target.value)/100;$('#'+out).value=e.target.value+'%';updateBrand(music.time(state.time));});
function syncPause(){const b=$('#pause'),paused=music.linked?!music.playing:state.paused;b.textContent=paused?'Reanudar movimiento ▶':'Pausar movimiento Ⅱ';b.setAttribute('aria-pressed',String(paused));}
$('#pause')?.addEventListener('click',()=>{if(music.linked){if(music.playing)music.pause();else music.play()?.catch(console.error);}else state.paused=!state.paused;syncPause();});music.onChange(()=>{if(music.playing)state.paused=false;syncPause();});syncPause();
$('#lighting')?.addEventListener('change',e=>{state.light=e.target.value;const studio=state.light==='studio';hemi.intensity=studio?1.6:.75;key.intensity=studio?3.3:2.5;fill.intensity=studio?1.2:.8;renderer.toneMappingExposure=studio?1.2:1.15;scene.background.set(studio?'#29333f':'#11161d');scene.fog.color.copy(scene.background);});
let previewUrl=null;
$('#logo-input')?.addEventListener('change',e=>{const file=e.target.files[0],error=$('#file-error');error.textContent='';if(!file)return;if(!['image/png','image/jpeg','image/webp','image/svg+xml'].includes(file.type)||file.size>8*1024*1024){error.textContent='Usa PNG, JPG, WebP o SVG de hasta 8 MB.';return;}const url=URL.createObjectURL(file),im=new Image();im.onload=()=>{if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl=url;state.logo=im;updateBrand(music.time(state.time));$('#image-preview').src=url;$('#image-preview').hidden=false;$('#image-placeholder').hidden=true;$('#image-filename').textContent=file.name;$('#brand-status').textContent='Imagen aplicada en banderas y pantallas';$('#reset-logo').hidden=false;};im.onerror=()=>{error.textContent='No se pudo abrir la imagen.';URL.revokeObjectURL(url);};im.src=url;});
$('#reset-logo')?.addEventListener('click',()=>{state.logo=null;$('#logo-input').value='';$('#reset-logo').hidden=true;$('#image-preview').hidden=true;$('#image-preview').removeAttribute('src');$('#image-placeholder').hidden=false;$('#image-filename').textContent='Sin imagen cargada';$('#brand-status').textContent='Banderas transparentes · luz violeta por ambos lados';if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl=null;updateBrand(music.time(state.time));});
$('#catalogue-open')?.addEventListener('click',()=>$('#catalogue-dialog').showModal());
$('#catalogue-close')?.addEventListener('click',()=>$('#catalogue-dialog').close());
document.querySelectorAll('[data-catalogue]').forEach(b=>b.addEventListener('click',()=>{const type=b.dataset.catalogue;$('#catalogue-image').src=`assets/references/${type}.png`;$('#catalogue-image').alt=`Traje ${type==='tron'?'Tron':'Urban'} del Catálogo Full IA`;document.querySelectorAll('[data-catalogue]').forEach(x=>{const on=x===b;x.classList.toggle('active',on);x.setAttribute('aria-pressed',on);});}));
$('#export')?.addEventListener('click',()=>{composer.render();const out=document.createElement('canvas');out.width=canvas.width;out.height=canvas.height+90;const c=out.getContext('2d');c.fillStyle='#11161d';c.fillRect(0,0,out.width,out.height);c.drawImage(canvas,0,0);c.fillStyle='#e1edf3';c.font='16px Arial';c.fillText(`LIGHTMAN × ${state.brand} · ${state.count} artistas`,22,out.height-52);c.fillStyle='#9bb0c3';c.font='12px Arial';c.fillText('Recreación 3D de vestuario e instrumentos. Logo y distribución por validar.',22,out.height-25);out.toBlob(blob=>{const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`Lightman-3D-${state.count}-artistas.png`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1200);});});

try{
 const loader=new GLTFLoader(),tl=new THREE.TextureLoader();
 const [gltf,headGltf,diffuse,normal]=await Promise.all([
  loader.loadAsync('assets/models/performer.glb'),loader.loadAsync('assets/models/urban-head/LeePerrySmith.glb'),
  tl.loadAsync('assets/models/urban-head/Map-COL.jpg'),tl.loadAsync('assets/models/urban-head/Infinite-Level_02_Tangent_SmoothUV.jpg')
 ]);
 source=gltf.scene;source.updateMatrixWorld(true);const sourceBox=new THREE.Box3().setFromObject(source);sourceHeight=sourceBox.max.y-sourceBox.min.y;sourceMinY=sourceBox.min.y;
 let referenceHead;headGltf.scene.traverse(o=>{if(o.isMesh)referenceHead=o;});headGeometry=referenceHead.geometry.clone();
 const hp=headGeometry.attributes.position,old=headGeometry.index.array,keep=[];
 for(let i=0;i<old.length;i+=3)if(hp.getY(old[i])>-1.4&&hp.getY(old[i+1])>-1.4&&hp.getY(old[i+2])>-1.4)keep.push(old[i],old[i+1],old[i+2]);
 headGeometry.setIndex(keep);for(let i=0;i<hp.count;i++)hp.setXYZ(i,hp.getX(i)*.055,(hp.getY(i)-1.6)*.055,(hp.getZ(i)-.3)*.055);hp.needsUpdate=true;headGeometry.computeBoundingBox();headGeometry.computeBoundingSphere();
 diffuse.colorSpace=THREE.SRGBColorSpace;skinMaterial=new THREE.MeshStandardMaterial({map:diffuse,color:'#cbb29c',normalMap:normal,normalScale:new THREE.Vector2(.55,.55),roughness:.78,metalness:0,envMapIntensity:.12});
 // Keep the articulated gloved hands. All other visible anatomy is clothed geometry,
 // so robot plates and mechanical joints cannot show through the costumes.
 source.traverse(o=>{if(!o.isSkinnedMesh)return;const geo=o.geometry.clone(),si=geo.attributes.skinIndex,sw=geo.attributes.skinWeight,ids=geo.index?.array;if(!ids)return;const handIds=new Set(o.skeleton.bones.map((b,i)=>/Hand/.test(b.name)?i:-1).filter(i=>i>=0));const isHand=i=>{let total=0;for(let k=0;k<4;k++)if(handIds.has(si.array[i*4+k]))total+=sw.array[i*4+k];return total>.45;};const keep=[];for(let i=0;i<ids.length;i+=3){const a=ids[i],b=ids[i+1],c=ids[i+2];if(Number(isHand(a))+Number(isHand(b))+Number(isHand(c))>=2)keep.push(a,b,c);}geo.setIndex(keep);o.geometry=geo;});
 ready=true;setFormation(10);avatars.forEach(h=>pose(h,0));animateFabrics(0);document.querySelectorAll('[data-count],[data-view],[data-format]').forEach(b=>b.disabled=false);$('#loading-3d')?.remove();canvas.dataset.ready='true';
}catch(error){console.error(error);if($('#loading-3d'))$('#loading-3d').textContent='No se pudo cargar el modelo 3D. Recarga esta página.';}
