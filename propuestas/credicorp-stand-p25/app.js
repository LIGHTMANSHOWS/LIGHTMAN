import * as THREE from './vendor/three.module.js';
import { OrbitControls } from './vendor/OrbitControls.js';

// Metres, Y up. The P25 lattice is physically spaced at 0.025 m in X and Y.
const D = Object.freeze({width:5.70,depth:3.00,totalHeight:3.10,archHeight:2.60,flagHeight:2.44,flagTop:1.05,flagBottom:0.95,pitch:0.025,base:0.12});
const wrap=document.querySelector('#canvas-wrap');
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0x080e19);
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
wrap.appendChild(renderer.domElement);renderer.domElement.setAttribute('aria-label','Modelo 3D giratorio del stand con bandera LED P25');
const scene=new THREE.Scene();scene.fog=new THREE.FogExp2(0x080e19,0.034);
const camera=new THREE.PerspectiveCamera(39,1,0.02,90);
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.065;controls.minDistance=.45;controls.maxDistance=19;controls.maxPolarAngle=Math.PI*.49;controls.minPolarAngle=.12;controls.autoRotateSpeed=.35;
const hemi=new THREE.HemisphereLight(0xa5c4ff,0x101421,2.0);scene.add(hemi);
function spot(color,intensity,pos,target){const l=new THREE.SpotLight(color,intensity,22,Math.PI/4,.8,1.3);l.position.set(...pos);l.target.position.set(...target);l.castShadow=true;l.shadow.mapSize.set(1024,1024);scene.add(l,l.target);return l;}
spot(0xcadfff,75,[0,6,3],[0,1,0]);spot(0x4a9dff,35,[-5,4,1],[-1,1,0]);spot(0xdb68ff,32,[4,4,-1],[1,1,0]);
const dark=new THREE.MeshStandardMaterial({color:0x101b30,roughness:.43,metalness:.45});
// Printed vinyl: fixed navy, cyan, blue and magenta ribbons, separate from LEDs.
function makeVinyl(){
 const c=document.createElement('canvas');c.width=2048;c.height=1024;const ctx=c.getContext('2d');const W=c.width,H=c.height;
 const bg=ctx.createLinearGradient(0,0,W,H);bg.addColorStop(0,'#07142e');bg.addColorStop(.5,'#030b1d');bg.addColorStop(1,'#101329');ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
 for(const side of [-1,1]){
  ctx.save();if(side===1){ctx.translate(W,0);ctx.scale(-1,1);}
  const ribbon=ctx.createLinearGradient(W*.02,H*.9,W*.38,H*.08);ribbon.addColorStop(0,side<0?'#35ecff':'#fb34e2');ribbon.addColorStop(.4,side<0?'#00bbf4':'#a631f5');ribbon.addColorStop(.76,'#1763e3');ribbon.addColorStop(1,side<0?'#d936eb':'#21d7ff');
  for(let i=0;i<26;i++){
   const shift=(i-13)*.004;ctx.beginPath();ctx.moveTo(W*(.025+shift*.20),H*.995);ctx.bezierCurveTo(W*(.13+shift),H*.58,W*(.055+shift),H*.29,W*(.26+shift),H*.23);ctx.bezierCurveTo(W*(.32+shift),H*.20,W*.38,H*(.15+shift),W*.41,H*(.06+shift));
   ctx.lineWidth=i%6===0?4:1.5;ctx.strokeStyle=ribbon;ctx.globalAlpha=i%6===0?.95:.53;ctx.shadowBlur=i%6===0?15:3;ctx.shadowColor=side<0?'#0cceff':'#e02aff';ctx.stroke();
  }
  ctx.shadowBlur=0;ctx.globalAlpha=.6;
  const nodes=[[.04,.90],[.10,.72],[.06,.58],[.145,.52],[.10,.34],[.18,.28],[.21,.37],[.26,.21],[.30,.28],[.32,.15],[.36,.22],[.22,.10],[.16,.18],[.11,.26],[.17,.66],[.075,.81],[.13,.86]];
  for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++){const a=nodes[i],b=nodes[j];if(Math.hypot(a[0]-b[0],a[1]-b[1])<.19){ctx.beginPath();ctx.moveTo(a[0]*W,a[1]*H);ctx.lineTo(b[0]*W,b[1]*H);ctx.strokeStyle=side<0?'#1c80c0':'#7142c9';ctx.lineWidth=1.3;ctx.stroke();}}
  ctx.globalAlpha=1;for(const [x,y] of nodes){ctx.beginPath();ctx.arc(x*W,y*H,3.3,0,Math.PI*2);ctx.shadowBlur=12;ctx.shadowColor=side<0?'#18ccff':'#c43bff';ctx.fillStyle=side<0?'#3ee1ff':'#d453ff';ctx.fill();}
  ctx.restore();
 }
 const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());return texture;
}
const vinylTexture=makeVinyl();
const vinyl=new THREE.MeshStandardMaterial({map:vinylTexture,color:0xffffff,roughness:.52,metalness:.05,emissive:0xffffff,emissiveMap:vinylTexture,emissiveIntensity:.12});
const edgeDark=new THREE.MeshStandardMaterial({color:0x182338,roughness:.65,metalness:.25});
const fabric=new THREE.MeshStandardMaterial({color:0x07101a,roughness:.9,metalness:0});
const stand=new THREE.Group();scene.add(stand);
function box(w,h,d,x,y,z,material=dark,parent=stand){let m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
box(D.width,D.base,D.depth,0,D.base/2,0);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(42,42),new THREE.MeshStandardMaterial({color:0x111b29,roughness:.36,metalness:.28}));floor.rotation.x=-Math.PI/2;floor.position.y=-.006;floor.receiveShadow=true;scene.add(floor);
const grid=new THREE.GridHelper(30,30,0x23384b,0x172637);grid.position.y=.002;grid.material.transparent=true;grid.material.opacity=.35;scene.add(grid);
function slab(points,depth,z,material=dark){const shape=new THREE.Shape();points.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();const g=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelThickness:.012,bevelSize:.012,bevelSegments:1,steps:1});if(material===vinyl){const p=g.attributes.position,uv=g.attributes.uv;const minX=Math.min(...points.map(p=>p[0])),maxX=Math.max(...points.map(p=>p[0])),minY=Math.min(...points.map(p=>p[1])),maxY=Math.max(...points.map(p=>p[1]));for(let i=0;i<p.count;i++)uv.setXY(i,(p.getX(i)-minX)/(maxX-minX),(p.getY(i)-minY)/(maxY-minY));uv.needsUpdate=true;}const mesh=new THREE.Mesh(g,material===vinyl?[vinyl,edgeDark]:material);mesh.position.z=z;mesh.castShadow=true;mesh.receiveShadow=true;stand.add(mesh);return mesh;}
const outer=[[-2.78,.12],[-2.32,2.30],[-1.25,2.60],[1.25,2.60],[2.32,2.30],[2.78,.12]];
const inner=[[-2.48,.12],[-2.04,1.99],[-1.20,2.20],[1.20,2.20],[2.04,1.99],[2.48,.12]];
slab([...outer,...[...inner].reverse()],.38,.62,vinyl);
// Rear central support, cross member and raised cap; thicknesses are conceptual.
box(.075,2.44,.08,-.50,1.34,-.79,edgeDark);box(.075,2.44,.08,.50,1.34,-.79,edgeDark);
box(.95,.07,.10,0,.16,-.79,edgeDark);box(1.05,.07,.10,0,2.53,-.79,edgeDark);
box(.13,.22,1.72,-.37,2.77,-.03);box(.13,.22,1.72,.37,2.77,-.03);
slab([[-.64,2.88],[-.79,3.10],[.79,3.10],[.64,2.88]],.43,-.88,vinyl);
const ledGroup=new THREE.Group();stand.add(ledGroup);
const cyan=new THREE.MeshBasicMaterial({color:0x29dcff,toneMapped:false});const magenta=new THREE.MeshBasicMaterial({color:0xee29e8,toneMapped:false});
const showUniforms={time:{value:0},mode:{value:0},power:{value:.8}};
function animatedLed(halo=false){return new THREE.ShaderMaterial({uniforms:{...showUniforms,halo:{value:halo?1:0}},transparent:halo,depthWrite:!halo,blending:halo?THREE.AdditiveBlending:THREE.NormalBlending,toneMapped:false,vertexShader:`varying vec3 vP;void main(){vec4 p=modelMatrix*vec4(position,1.);vP=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}`,fragmentShader:`uniform float time;uniform float mode;uniform float power;uniform float halo;varying vec3 vP;void main(){vec3 c=mix(vec3(.015,.76,1.),vec3(.95,.035,.73),smoothstep(-2.,2.,vP.x));float flow=.38+.62*pow(.5+.5*sin(vP.y*5.-abs(vP.x)*3.-time*3.),3.);float pulse=.48+.52*(.5+.5*sin(time*2.5));float scan=.22+.78*pow(.5+.5*sin(vP.x*2.2+vP.y*2.8-time*3.2),9.);float a=mode<.5?flow:mode<1.5?pulse:mode<2.5?scan:1.;vec3 col=c*(.35+power*1.6)*a;gl_FragColor=vec4(col,halo>.5?.12:1.);#include <colorspace_fragment>}`.replace(';#include',';\n#include')});}
const ledCore=animatedLed(),ledHalo=animatedLed(true);
for(const mat of [ledCore,ledHalo])mat.fragmentShader=mat.fragmentShader.replace('<colorspace_fragment>}', '<colorspace_fragment>\n}');
function tube(points,color,radius=.009,parent=ledGroup){const path=new THREE.CurvePath();for(let i=1;i<points.length;i++)path.add(new THREE.LineCurve3(new THREE.Vector3(...points[i-1]),new THREE.Vector3(...points[i])));const mat=parent===ledGroup?ledCore:typeof color==='number'?new THREE.MeshBasicMaterial({color,toneMapped:false}):color;let m=new THREE.Mesh(new THREE.TubeGeometry(path,Math.max(2,(points.length-1)*4),radius,6,false),mat);parent.add(m);if(parent===ledGroup){const glow=new THREE.Mesh(new THREE.TubeGeometry(path,Math.max(2,(points.length-1)*4),radius*2.8,6,false),ledHalo);parent.add(glow);}return m;}
for(const path of [outer,inner]){tube(path.slice(0,3).map(p=>[...p,1.018]),cyan);tube(path.slice(3).map(p=>[...p,1.018]),magenta);tube([[-1.25,path===outer?2.60:2.20,1.018],[0,path===outer?2.60:2.20,1.018]],cyan);tube([[0,path===outer?2.60:2.20,1.018],[1.25,path===outer?2.60:2.20,1.018]],magenta);}
tube([[-2.84,.125,1.505],[0,.125,1.505]],cyan,.007);tube([[0,.125,1.505],[2.84,.125,1.505]],magenta,.007);
tube([[-.77,3.105,-.44],[.77,3.105,-.44]],magenta,.006);
// Extra contour detail: depth returns, inset ribbons, shoulder joints and platform perimeter.
for(const side of [-1,1]){
 const edge=outer.filter(p=>side*p[0]>=0);tube(edge.map(p=>[...p,.615]),cyan,.006);
 tube([[side*2.78,.13,1.01],[side*2.78,.13,.63]],cyan,.006);
 tube([[side*2.32,2.30,1.012],[side*2.04,1.99,1.012]],cyan,.005);
 tube([[side*1.25,2.60,1.012],[side*1.20,2.20,1.012]],cyan,.005);
 tube([[side*2.85,.125,1.49],[side*2.85,.125,-1.49]],cyan,.006);
 for(let ribbon=0;ribbon<2;ribbon++){
  const mix=.30+ribbon*.19;const pts=[];const indexes=side<0?[0,1,2]:[5,4,3];
  for(let i=0;i<3;i++){const j=indexes[i];pts.push([THREE.MathUtils.lerp(outer[j][0],inner[j][0],mix),THREE.MathUtils.lerp(outer[j][1],inner[j][1],mix),1.022]);}
  tube(pts,cyan,.0035);
 }
 // Discrete luminous ticks near each foot and on the sloping face.
 for(let i=0;i<5;i++){const y=.32+i*.13;const x=side*(2.72-(y-.12)*.205);tube([[x,y,1.025],[x-side*.065,y+.035,1.025]],cyan,.003);}
}
tube([[-2.85,.125,-1.49],[2.85,.125,-1.49]],cyan,.006);
tube([[-.79,3.10,-.445],[-.64,2.88,-.445],[.64,2.88,-.445],[.79,3.10,-.445]],cyan,.005);
function textPlane(text,w,h,x,y,z,font=70){const c=document.createElement('canvas');c.width=1024;c.height=256;const ctx=c.getContext('2d');ctx.clearRect(0,0,1024,256);ctx.fillStyle='#f3f7ff';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`600 ${font}px Arial`;ctx.fillText(text,512,133);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:t,transparent:true,depthWrite:false,toneMapped:false}));m.position.set(x,y,z);stand.add(m);return m;}
textPlane('CREDICORP',2.18,.52,0,2.40,1.027,115);
textPlane('IA, DATA & CIBERSEGURIDAD',1.35,.19,0,2.995,-.435,42);
textPlane('LIGHTMAN',.70,.15,1.98,.065,1.512,85);

// Open flexible LED cloth, not an opaque high-resolution LCD surface.
const flag=new THREE.Group();flag.position.z=-.70;stand.add(flag);
const positions=[],pixelXY=[];const halfMax=D.flagTop/2;
for(let row=0;row<98;row++){
 const yLocal=.0075+row*D.pitch;if(yLocal>D.flagHeight)continue;
 const half=(D.flagBottom+(D.flagTop-D.flagBottom)*yLocal/D.flagHeight)/2;
 for(let col=0;col<42;col++){const x=(col-20.5)*D.pitch;if(Math.abs(x)>half-.003)continue;positions.push(x,D.base+yLocal,.02);pixelXY.push([col,row]);}
}
const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));const colors=new Float32Array(positions.length);geo.setAttribute('color',new THREE.BufferAttribute(colors,3));
const dotCanvas=document.createElement('canvas');dotCanvas.width=32;dotCanvas.height=32;const dctx=dotCanvas.getContext('2d');const dg=dctx.createRadialGradient(16,16,0,16,16,16);dg.addColorStop(0,'#fff');dg.addColorStop(.54,'#fff');dg.addColorStop(.76,'rgba(255,255,255,.6)');dg.addColorStop(1,'rgba(255,255,255,0)');dctx.fillStyle=dg;dctx.fillRect(0,0,32,32);const dotTexture=new THREE.CanvasTexture(dotCanvas);
const dotMat=new THREE.PointsMaterial({size:.012,map:dotTexture,vertexColors:true,transparent:true,alphaTest:.06,depthWrite:false,toneMapped:false});
const pixels=new THREE.Points(geo,dotMat);flag.add(pixels);
const glowMat=new THREE.PointsMaterial({size:.030,map:dotTexture,vertexColors:true,transparent:true,opacity:.32,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false});const glow=new THREE.Points(geo,glowMat);flag.add(glow);
// Black threads and individual pixel housings make the open lattice readable from close up.
const wirePos=[];for(let row=0;row<98;row++){const yl=.0075+row*D.pitch;if(yl>D.flagHeight)continue;const hw=(D.flagBottom+(D.flagTop-D.flagBottom)*yl/D.flagHeight)/2;wirePos.push(-hw,D.base+yl,0,hw,D.base+yl,0);}
for(let col=0;col<42;col++){const x=(col-20.5)*D.pitch;let y0=0;if(Math.abs(x)>D.flagBottom/2)y0=(Math.abs(x)*2-D.flagBottom)/(D.flagTop-D.flagBottom)*D.flagHeight;wirePos.push(x,D.base+y0,0,x,D.base+D.flagHeight,0);}
const wireGeo=new THREE.BufferGeometry();wireGeo.setAttribute('position',new THREE.Float32BufferAttribute(wirePos,3));flag.add(new THREE.LineSegments(wireGeo,new THREE.LineBasicMaterial({color:0x293542,transparent:true,opacity:.35})));
const sockets=new THREE.Points(geo,new THREE.PointsMaterial({size:.012,map:dotTexture,color:0x15202a,transparent:true,alphaTest:.2,depthWrite:true}));sockets.position.z=-.004;flag.add(sockets);
const ledCanvas=document.createElement('canvas');ledCanvas.width=42;ledCanvas.height=98;const lctx=ledCanvas.getContext('2d',{willReadFrequently:true});
let effect='flow',intensity=.8,screenOn=true,paused=false,animTime=0,currentView='perspective',lightShow='flow',speed=1;
const color=new THREE.Color();const blue=new THREE.Color('#18bcff'),pink=new THREE.Color('#f22bdd');
function drawFlag(t){
 let img;
 if(effect==='text'){lctx.fillStyle='#000';lctx.fillRect(0,0,42,98);lctx.textAlign='center';lctx.textBaseline='middle';lctx.fillStyle='#56e5ff';lctx.font='bold 10px Arial';lctx.fillText('CREDI',21,22);lctx.fillText('CORP',21,35);lctx.fillStyle='#eb36df';lctx.font='bold 9px Arial';lctx.fillText('SUMMIT',21,61);lctx.fillStyle='#95dfff';lctx.font='bold 11px Arial';lctx.fillText('2026',21,76);img=lctx.getImageData(0,0,42,98).data;}
 for(let i=0;i<pixelXY.length;i++){
  const [col,row]=pixelXY[i];const u=col/41,v=row/97;
  if(img){const j=((97-row)*42+col)*4;color.setRGB(img[j]/255,img[j+1]/255,img[j+2]/255,THREE.SRGBColorSpace);}
  else if(effect==='solid'){color.copy(blue).lerp(pink,(Math.sin(t*.6)+1)/2);}
  else{const wave=Math.sin(v*11-u*6-t*1.15);const wave2=Math.sin(v*19+u*5-t*.65);const band=Math.pow((wave+1)/2,4)*.9+Math.pow((wave2+1)/2,14)*.5;const sparkle=Math.pow(Math.max(0,Math.sin(col*43.7+row*12.9+t*.8)),40)*.35;color.copy(blue).lerp(pink,(Math.sin(v*7+t*.35)+1)/2).multiplyScalar(.045+band+sparkle);}
  const k=i*3, power=screenOn?intensity*3:0;colors[k]=color.r*power;colors[k+1]=color.g*power;colors[k+2]=color.b*power;
 }
 geo.attributes.color.needsUpdate=true;pixels.visible=screenOn;glow.visible=screenOn;
}

// Laser fans start at the top of the arch and terminate on the illustrated roof.
const lasers=new THREE.Group();stand.add(lasers);const laserRays=[];
for(const side of [-1,1]){
 const x=side*1.48,y=2.57,z=.82;box(.22,.15,.20,x,y+.075,z,edgeDark);
 const lens=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,.016,16),cyan);lens.rotation.x=Math.PI/2;lens.position.set(x,y+.09,z+.108);stand.add(lens);
 const origin=new THREE.Vector3(x,y+.16,z-.02);
 for(let i=0;i<19;i++){
  const f=i/18;const target=new THREE.Vector3(x+(f-.5)*5.2,6.18,-2.5-(1-Math.abs(f-.5)*2)*.9);
  const c=new THREE.Color().lerpColors(blue,pink,f);
  const g=new THREE.BufferGeometry().setFromPoints([origin,target]);const m=new THREE.LineBasicMaterial({color:c,transparent:true,opacity:.75,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false});const line=new THREE.Line(g,m);lasers.add(line);laserRays.push(line);
  const dot=new THREE.Mesh(new THREE.SphereGeometry(.026,7,5),new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:.8,toneMapped:false}));dot.position.copy(target);lasers.add(dot);line.userData={origin:origin.clone(),side,index:i,f,dot};
 }
 // Very subtle triangular haze between the outer rays.
 const v=[origin.x,origin.y,origin.z,x-2.6,6.18,-2.5,x+2.6,6.18,-2.5];const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));lasers.add(new THREE.Mesh(g,new THREE.MeshBasicMaterial({color:side<0?0x259dff:0xc537ee,transparent:true,opacity:.035,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false})));
}
const washLights=[];
for(const side of [-1,1]){
 const light=new THREE.PointLight(side<0?0x16bcff:0xe52bd9,4,4,2);light.position.set(side*2.35,.38,1.30);stand.add(light);washLights.push(light);
 // Ground pools complement the real-time light; these are conceptual, not photometry.
 const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d');const grad=ctx.createRadialGradient(64,64,0,64,64,64);grad.addColorStop(0,side<0?'rgba(0,190,255,.45)':'rgba(235,20,210,.45)');grad.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=grad;ctx.fillRect(0,0,128,128);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
 const m=new THREE.Mesh(new THREE.PlaneGeometry(2.2,2.2),new THREE.MeshBasicMaterial({map:t,transparent:true,opacity:.6,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false}));m.rotation.x=-Math.PI/2;m.position.set(side*2.3,.007,1.55);ledGroup.add(m);
}
function updateShow(t){
 showUniforms.time.value=t;showUniforms.power.value=intensity;showUniforms.mode.value={flow:0,pulse:1,scan:2,static:3}[lightShow];
 for(let i=0;i<washLights.length;i++){const phase=lightShow==='static'?1:.65+.35*Math.sin(t*1.6+i*Math.PI);washLights[i].intensity=ledGroup.visible?intensity*5*phase:0;}
 for(const line of laserRays){const {origin,side,f,index,dot}=line.userData;const motion=lightShow==='static'?0:Math.sin(t*.5+side*.6)*.34;
  const spread=lightShow==='scan'?3.2+Math.sin(t*.8)*1.3:5.2;
  const x=origin.x+(f-.5)*spread+motion,z=-2.5-(1-Math.abs(f-.5)*2)*.9+(lightShow==='static'?0:Math.sin(t*.38)*.25);
  const a=line.geometry.attributes.position;a.setXYZ(1,x,6.18,z);a.needsUpdate=true;line.geometry.computeBoundingSphere();dot.position.set(x,6.18,z);
  line.material.opacity=lightShow==='pulse'?.3+.55*(.5+.5*Math.sin(t*2.5)):lightShow==='scan'?.28+.62*Math.pow(.5+.5*Math.sin(index*.45-t*2),2):.78;
 }
}
// Ceiling trusses provide context for the upward beam direction, not a venue survey.
const room=new THREE.Group();scene.add(room);const trussMat=new THREE.MeshStandardMaterial({color:0x243044,roughness:.8,metalness:.7});
for(let z=-6;z<=4;z+=2.5)box(16,.075,.065,0,6.25,z,trussMat,room);
for(let x=-7;x<=7;x+=2)box(.065,.075,11,x,6.30,-1,trussMat,room);
for(const x of [-6,6])box(.12,6.3,.12,x,3.15,-3.5,trussMat,room);
// P25 spacing marker is shown only in the close-up view.
const measure=new THREE.Group();measure.visible=false;stand.add(measure);
const annotation=new THREE.LineBasicMaterial({color:0xc1e9ff,depthTest:false,transparent:true,opacity:.85});
const mx=.36,my=1.895,mz=-.655;const mg=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(mx,my,mz),new THREE.Vector3(mx+.025,my,mz)]);measure.add(new THREE.Line(mg,annotation));
for(const x of [mx,mx+.025]){const g=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x,my-.007,mz),new THREE.Vector3(x,my+.007,mz)]);measure.add(new THREE.Line(g,annotation));}
const cameras={perspective:{pos:[4.85,3.65,10.2],target:[0,2.55,-.1]},front:{pos:[0,3.05,11],target:[0,2.75,0]},pixel:{pos:[1.04,1.93,.50],target:[.17,1.66,-.68]},top:{pos:[6,8.5,7.3],target:[0,1.3,0]}};
function setView(name){currentView=name;const v=cameras[name];camera.position.set(...v.pos);controls.target.set(...v.target);if(wrap.clientWidth<600 && name!=='pixel')camera.position.sub(controls.target).multiplyScalar(1.3).add(controls.target);controls.update();document.querySelectorAll('[data-view]').forEach(b=>{const on=b.dataset.view===name;b.classList.toggle('active',on);b.setAttribute('aria-pressed',on);});document.querySelector('#view-name').textContent={perspective:'PERSPECTIVA',front:'VISTA FRONTAL',pixel:'DETALLE · P25',top:'VISTA SUPERIOR'}[name];document.querySelector('#pixel-caption').hidden=name!=='pixel';measure.visible=name==='pixel';}
setView('perspective');
function resize(){const w=wrap.clientWidth,h=wrap.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();}new ResizeObserver(resize).observe(wrap);resize();
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
document.querySelectorAll('[data-effect]').forEach(b=>b.addEventListener('click',()=>{effect=b.dataset.effect;document.querySelectorAll('[data-effect]').forEach(x=>{const active=x===b;x.classList.toggle('active',active);x.setAttribute('aria-pressed',active);});drawFlag(animTime);}));
document.querySelectorAll('[data-show]').forEach(b=>b.addEventListener('click',()=>{lightShow=b.dataset.show;document.querySelectorAll('[data-show]').forEach(x=>{const active=x===b;x.classList.toggle('active',active);x.setAttribute('aria-pressed',active);});updateShow(animTime);}));
document.querySelector('#speed').addEventListener('input',e=>{speed=e.target.value/100;document.querySelector('#speed-value').textContent=`${speed.toFixed(1)}×`;});
document.querySelector('#arcs').addEventListener('change',e=>ledGroup.visible=e.target.checked);
document.querySelector('#screen').addEventListener('change',e=>{screenOn=e.target.checked;drawFlag(animTime);});
document.querySelector('#lasers').addEventListener('change',e=>lasers.visible=e.target.checked);
document.querySelector('#brightness').addEventListener('input',e=>{intensity=e.target.value/100;document.querySelector('#brightness-value').textContent=`${e.target.value}%`;drawFlag(animTime);});
document.querySelector('#pause').addEventListener('click',e=>{paused=!paused;e.target.textContent=paused?'Reproducir':'Pausar';e.target.setAttribute('aria-pressed',paused);});
document.querySelector('#rotate').addEventListener('click',e=>{controls.autoRotate=!controls.autoRotate;e.target.setAttribute('aria-pressed',controls.autoRotate);});
document.querySelector('#capture').addEventListener('click',()=>{renderer.render(scene,camera);const a=document.createElement('a');a.download='LIGHTMAN-Credicorp-stand-P25-3D.png';a.href=renderer.domElement.toDataURL('image/png');a.click();});
drawFlag(0);document.querySelector('#loading').remove();let last=performance.now(),frame=0;
function animate(now){requestAnimationFrame(animate);const dt=Math.min((now-last)/1000,.06);last=now;if(!paused)animTime+=dt*speed;controls.update(dt);if(frame++%2===0)drawFlag(animTime);updateShow(animTime);renderer.render(scene,camera);}requestAnimationFrame(animate);
// Read-only diagnostics for local QA; no network or external runtime dependencies.
window.standInfo=()=>({revision:3,vinyl:'navy-cyan-blue-magenta',dimensions:D,pixels:pixelXY.length,pitch:D.pitch,rows:98,effect,lightShow,speed,time:animTime,screenOn,arcs:ledGroup.visible,lasers:lasers.visible,paused,view:currentView,webgl:renderer.capabilities.isWebGL2,canvas:{width:renderer.domElement.width,height:renderer.domElement.height}});
