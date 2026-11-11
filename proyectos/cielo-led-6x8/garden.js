/* LIGHTMAN R02. Adapted concert architecture: one transport, deterministic cues,
   projected pixel maps, coordinated spill, seeded audience and orbit cameras.
   Local Three.js version retained from plano-a-conciert. */
window.createGarden=function(canvas){
const T=THREE, scene=new T.Scene(), renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,preserveDrawingBuffer:true});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.7));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
scene.background=new T.Color('#101725');scene.fog=new T.FogExp2('#141a26',.018);
const camera=new T.PerspectiveCamera(43,1,.05,200),target=new T.Vector3(0,1.3,0);let yaw=.61,pitch=.39,distance=15.8,view='perspective',drag=null;
const environment=new T.Group(),ground=new T.Group(),structure=new T.Group(),pixelGroup=new T.Group(),crowd=new T.Group();scene.add(environment,ground,structure,pixelGroup,crowd);
let seed=9127;function rand(){seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;}
const mat=(color,roughness=.7,metalness=0)=>new T.MeshStandardMaterial({color,roughness,metalness});
const materials={wood:mat('#705039'),darkWood:mat('#302821'),metal:mat('#242a29',.35,.72),gold:mat('#a18b5f',.4,.6),stone:mat('#a4937b'),wall:mat('#a89c88'),black:mat('#101717'),glass:new T.MeshPhysicalMaterial({color:'#b4c5bd',roughness:.13,metalness:.25,transparent:true,opacity:.30}),leaf:mat('#42653a',.95),leaf2:mat('#254735',.9),skin:mat('#ba8868'),cream:mat('#d6c7a9'),candle:new T.MeshStandardMaterial({color:'#ffe3ac',emissive:'#ffad45',emissiveIntensity:2})};
const geo={box:new T.BoxGeometry(1,1,1),sphere:new T.SphereGeometry(1,12,9),cylinder:new T.CylinderGeometry(1,1,1,12),cone:new T.ConeGeometry(1,1,12)};
function mesh(kind,size,pos,material,parent=environment){const m=new T.Mesh(geo[kind],material);m.scale.set(...size);m.position.set(...pos);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function box(size,pos,m,parent){return mesh('box',size,pos,m,parent);}
function sphere(size,pos,m,parent){return mesh('sphere',size,pos,m,parent);}
function cylinder(radius,height,pos,m,parent){return mesh('cylinder',[radius,height,radius],pos,m,parent);}
function rod(a,b,r,m,parent=environment){const av=new T.Vector3(...a),bv=new T.Vector3(...b),d=bv.clone().sub(av),obj=cylinder(r,d.length(),av.clone().add(bv).multiplyScalar(.5).toArray(),m,parent);obj.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());return obj;}
function texture(type){const c=document.createElement('canvas');c.width=c.height=512;const x=c.getContext('2d');x.fillStyle=type==='grass'?'#526043':'#a49981';x.fillRect(0,0,512,512);for(let i=0;i<30000;i++){let q=rand(),v=type==='grass'?Math.floor(30+q*58):Math.floor(110+q*65);x.fillStyle=type==='grass'?`rgb(${v*.8},${v},${v*.55})`:`rgb(${v+12},${v+6},${v-8})`;x.fillRect(rand()*512,rand()*512,type==='grass'?1:2,type==='grass'?2+rand()*5:1);}if(type!=='grass'){x.strokeStyle='#7e796a';x.lineWidth=2;for(let n=0;n<=4;n++){x.beginPath();x.moveTo(n*128,0);x.lineTo(n*128,512);x.stroke();x.beginPath();x.moveTo(0,n*128);x.lineTo(512,n*128);x.stroke();}}const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(type==='grass'?12:4,type==='grass'?12:4);t.colorSpace=T.SRGBColorSpace;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());return t;}
const lawn=new T.Mesh(new T.PlaneGeometry(65,65),new T.MeshStandardMaterial({map:texture('grass'),roughness:1}));lawn.rotation.x=-Math.PI/2;lawn.position.y=-.035;lawn.receiveShadow=true;ground.add(lawn);
const terrace=new T.Mesh(new T.PlaneGeometry(11.4,8.2),new T.MeshStandardMaterial({map:texture('stone'),roughness:.74}));terrace.rotation.x=-Math.PI/2;terrace.position.set(0,.012,-.55);terrace.receiveShadow=true;ground.add(terrace);
// A broad twilight sky, with the horizon kept warm like the supplied photograph.
const sky=new T.Mesh(new T.SphereGeometry(90,36,18),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,uniforms:{top:{value:new T.Color('#090e1c')},horizon:{value:new T.Color('#554855')}},vertexShader:'varying vec3 p;void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec3 p;uniform vec3 top;uniform vec3 horizon;void main(){float h=clamp(normalize(p).y*2.5,0.,1.);gl_FragColor=vec4(mix(horizon,top,pow(h,.55)),1.);}'}));scene.add(sky);
scene.add(new T.HemisphereLight('#b6c5ea','#6d673b',.28));
const sunset=new T.DirectionalLight('#ffce9d',.32);sunset.position.set(-9,15,-12);sunset.castShadow=true;sunset.shadow.mapSize.set(1024,1024);sunset.shadow.camera.left=-13;sunset.shadow.camera.right=13;sunset.shadow.camera.top=13;sunset.shadow.camera.bottom=-13;sunset.shadow.normalBias=.04;sunset.shadow.bias=-.0003;scene.add(sunset);
const fill=new T.DirectionalLight('#94a7db',.16);fill.position.set(8,8,12);scene.add(fill);
function warmLight(x,y,z,power=6,d=6){const l=new T.PointLight('#ffc17b',power*.55,d,2);l.position.set(x,y,z);scene.add(l);return l;}
// Contextual pavilion: plaster, black window frames and an amber back bar.
box([14,3.6,.25],[0,1.8,-6.05],materials.wall);box([14.6,.23,4.0],[0,3.6,-6.8],materials.darkWood);
for(let i=-6;i<=6;i+=2){box([1.88,2.7,.07],[i,1.7,-5.88],new T.MeshStandardMaterial({color:'#34403d',emissive:'#47311e',emissiveIntensity:.25,roughness:.22,metalness:.35}));box([.065,2.9,.09],[i-1,1.65,-5.78],materials.metal);box([1.98,.07,.10],[i,.3,-5.78],materials.metal);}
box([8.0,.98,.72],[-.7,.51,-4.9],materials.darkWood);box([8.2,.09,.88],[-.7,1.04,-4.9],materials.wood);box([7.8,.045,.055],[-.7,.90,-4.5],materials.candle);
for(let n=0;n<20;n++){const x=-4.25+n*.38;box([.045,.72,.015],[x,.48,-4.53],materials.wood);}
for(let i=0;i<16;i++){const m=mat(['#203d2e','#705334','#374841'][i%3],.2,.3);cylinder(.045,.25,[-3.8+i*.4,1.22,-4.9],m);cylinder(.018,.11,[-3.8+i*.4,1.39,-4.9],m);}
warmLight(-3,1.5,-4.6,10,5);warmLight(2,1.5,-4.6,10,5);
// Distant hills are scenery, with no assumed dimensions from the photograph.
for(let layer=0;layer<2;layer++){
 const p=[],n=25;for(let i=0;i<n;i++){const x=-48+i*4,y=1.5+Math.sin(i*.78+layer)*1.7+rand()*2.3,z=-30-layer*9;p.push(x,y,z,x,-2,z);}
 const indices=[];for(let i=0;i<n-1;i++)indices.push(i*2,i*2+1,i*2+2,i*2+1,i*2+3,i*2+2);const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(indices);g.computeVertexNormals();const ridge=new T.Mesh(g,new T.MeshStandardMaterial({color:layer?'#65707b':'#535c64',roughness:1,side:T.DoubleSide}));environment.add(ridge);
}
// Tree trunks, branches and curved leaf cards, instanced to keep the scene responsive.
function foliage(cx,cy,cz,spread,count,color){
 const leafGeo=new T.SphereGeometry(1,5,3),leaves=new T.InstancedMesh(leafGeo,mat('#ffffff'),count),dummy=new T.Object3D(),col=new T.Color();
 for(let i=0;i<count;i++){const u=rand()*Math.PI*2,v=Math.acos(2*rand()-1),r=Math.cbrt(rand());dummy.position.set(cx+Math.cos(u)*Math.sin(v)*spread*r,cy+Math.cos(v)*spread*.65*r,cz+Math.sin(u)*Math.sin(v)*spread*r);dummy.scale.set(.13+rand()*.17,.025+rand()*.04,.06+rand()*.09);dummy.rotation.set(rand()*3,rand()*6,rand()*3);dummy.updateMatrix();leaves.setMatrixAt(i,dummy.matrix);col.set(color).multiplyScalar(.65+rand()*.7);leaves.setColorAt(i,col);}
 leaves.castShadow=true;leaves.receiveShadow=true;environment.add(leaves);
}
function tree(x,z,h=5){rod([x,0,z],[x+.15,h*.77,z],.13,materials.darkWood);for(let i=0;i<5;i++){const a=i*2.399,end=[x+Math.cos(a)*1.3,h*.65+rand(),z+Math.sin(a)*1.3];rod([x,h*.45,z],end,.055,materials.wood);foliage(...end,1.18,180,i%2?'#476239':'#385b36');}warmLight(x,.3,z,7,5);}
tree(-7,-2,5);tree(-8,4,4.8);tree(7,-2,5.5);tree(8,4.5,4.7);tree(-5,-9,5.3);tree(6,-9,5.2);
function palm(x,z,h){rod([x,0,z],[x+.35,h,z],.17,materials.wood);for(let i=0;i<10;i++){const a=i*Math.PI/5;for(let j=0;j<8;j++){const f=j/7,px=x+.35+Math.cos(a)*f*2.1,pz=z+Math.sin(a)*f*2.1,py=h+Math.sin(f*Math.PI)*.5-f*.6;const leaf=sphere([.35*(1-f)+.08,.045,.12],[px,py,pz],materials.leaf2);leaf.rotation.y=-a;leaf.rotation.z=f*.4;}}}
palm(-10,-4,7);palm(10,-6,7.5);
for(let side of [-1,1])for(let i=0;i<7;i++){let x=side*(6.0+rand()),z=-4+i*1.35;foliage(x,.4,z,.58,70,i%2?'#3b5932':'#52633a');if(i%2===0){cylinder(.35,.4,[x,.2,z],materials.stone);for(let n=0;n<7;n++)sphere([.075,.055,.075],[x+(rand()-.5)*.5,.55+rand()*.25,z+(rand()-.5)*.5],mat(n%2?'#bd496c':'#e8a38f'));}}
// Seeded grass fringe and path lanterns.
const bladeGeometry=new T.PlaneGeometry(.025,.15),grass=new T.InstancedMesh(bladeGeometry,new T.MeshStandardMaterial({color:'#53643a',side:T.DoubleSide,roughness:1}),5000),dummy=new T.Object3D();
for(let i=0;i<5000;i++){let x=(rand()-.5)*28,z=(rand()-.5)*24;if(Math.abs(x)<5.9&&z>-4.8&&z<3.7)x=(x<0?-1:1)*(6+rand()*5);dummy.position.set(x,.045,z);dummy.scale.setScalar(.6+rand()*1.2);dummy.rotation.y=rand()*6.3;dummy.updateMatrix();grass.setMatrixAt(i,dummy.matrix);}ground.add(grass);
for(const x of [-5.5,5.5])for(const z of [0,3.4,6.4]){box([.09,.6,.09],[x,.3,z],materials.metal);box([.12,.12,.12],[x,.64,z],materials.candle);warmLight(x,.68,z,2.5,3);}
function chair(x,z,angle){const group=new T.Group();group.position.set(x,0,z);group.rotation.y=angle;environment.add(group);box([.48,.055,.45],[0,.48,0],materials.wood,group);for(const xx of [-.19,.19])for(const zz of [-.17,.17])rod([xx,0,zz],[xx,.48,zz],.022,materials.metal,group);for(const xx of [-.21,.21])rod([xx,.47,-.2],[xx,.99,-.23],.021,materials.metal,group);for(let yy=.67;yy<.99;yy+=.10)box([.45,.06,.045],[0,yy,-.22],materials.wood,group);}
function table(x,z){cylinder(.51,.055,[x,.77,z],materials.wood);cylinder(.065,.73,[x,.38,z],materials.metal);cylinder(.32,.035,[x,.025,z],materials.metal);cylinder(.045,.12,[x,.86,z],materials.candle);for(let i=0;i<2;i++){cylinder(.035,.12,[x+(i?-.22:.22),.85,z+.1],materials.glass);}}
for(const [x,z]of [[-2.5,-1.65],[1.55,-1.6],[-2.5,1.5],[1.7,1.55]]){table(x,z);for(let a=0;a<3;a++){const angle=a*Math.PI*2/3+.2;chair(x+Math.sin(angle)*.95,z+Math.cos(angle)*.95,angle);}}
// Articulated guests: dimensional clothing, hair, faces and shoes; subtle lounge motion.
const guests=[];
function guest(x,z,rot,index){const root=new T.Group(),body=new T.Group();root.position.set(x,0,z);root.rotation.y=rot;root.add(body);crowd.add(root);const skin=mat(['#c49476','#9e7053','#deb393','#ae7d5f'][index%4]),shirt=mat(['#d5c5af','#263b42','#708073','#8d5762','#212528','#a89c86'][index%6]),pants=mat(index%2?'#34383a':'#263137'),hair=mat(index%3===0?'#6c4f37':'#282322');
 const skirt=index%4===0;
 sphere([.20,.28,.13],[0,1.05,0],shirt,body);if(skirt)mesh('cone',[.255,.48,.20],[0,.69,0],shirt,body);
 sphere([.17,.105,.13],[0,.79,0],skirt?shirt:pants,body);rod([-.08,.78,0],[-.10,.38,.02],.062,skirt?skin:pants,body);rod([.08,.78,0],[.12,.38,-.02],.062,skirt?skin:pants,body);rod([-.10,.38,.02],[-.11,.08,.04],.05,skirt?skin:pants,body);rod([.12,.38,-.02],[.13,.08,.03],.05,skirt?skin:pants,body);
 sphere([.07,.055,.14],[-.11,.055,.08],materials.black,body);sphere([.07,.055,.14],[.13,.055,.08],materials.black,body);cylinder(.055,.11,[0,1.32,0],skin,body);sphere([.102,.137,.096],[0,1.49,.005],skin,body);sphere([.105,.065,.099],[0,1.58,-.01],hair,body);sphere([.016,.023,.023],[0,1.49,.099],skin,body);
 for(const xx of [-.043,.043])sphere([.006,.0035,.002],[xx,1.515,.092],materials.black,body);
 if(index%3===0)sphere([.105,.17,.064],[0,1.47,-.06],hair,body);
 const arms=[];for(const side of [-1,1]){const pivot=new T.Group();pivot.position.set(side*.19,1.2,0);body.add(pivot);rod([0,0,0],[side*.055,-.27,.025],.052,shirt,pivot);rod([side*.055,-.27,.025],[side*.04,-.44,.12],.038,skin,pivot);sphere([.039,.05,.035],[side*.04,-.44,.12],skin,pivot);arms.push(pivot);}
 if(index%3===1)cylinder(.028,.13,[.23,.91,.15],materials.glass,body);
 const scale=.99+(index%5)*.035;root.scale.setScalar(scale);guests.push({root,body,arms,phase:index*1.87});
}
const layout=[[-.7,.6,.7],[.1,.9,-.7],[.8,-.2,.2],[-.5,-1.8,2],[3.0,.9,-1],[3.5,-1.9,-1.5],[-3.6,-.4,1.2],[-1.5,2.7,-.2],[.0,3.8,.5],[2.5,3.5,-.7],[-4.8,2.5,1.1],[4.5,2.4,-1.1],[.5,-3.7,2.4],[-2.3,-3.6,2]];layout.forEach((p,i)=>guest(...p,i));
// Merge static context per material. Vegetation instances remain independent.
function batchStatic(root){root.updateMatrixWorld(true);const buckets=new Map(),remove=[];root.traverse(o=>{if(!o.isMesh||o.isInstancedMesh||Array.isArray(o.material))return;const key=o.material.uuid+'|'+o.castShadow+'|'+o.receiveShadow;let b=buckets.get(key);if(!b){b={material:o.material,p:[],n:[],u:[],cast:o.castShadow,receive:o.receiveShadow};buckets.set(key,b);}const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(o.matrixWorld);b.p.push(g.attributes.position.array);b.n.push(g.attributes.normal.array);b.u.push(g.attributes.uv?.array||new Float32Array(g.attributes.position.count*2));remove.push(o);g.dispose();});for(const o of remove)o.parent.remove(o);for(const b of buckets.values()){function concat(arr){const x=new Float32Array(arr.reduce((a,v)=>a+v.length,0));let i=0;for(const v of arr){x.set(v,i);i+=v.length;}return x;}const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(concat(b.p),3));g.setAttribute('normal',new T.BufferAttribute(concat(b.n),3));g.setAttribute('uv',new T.BufferAttribute(concat(b.u),2));const m=new T.Mesh(g,b.material);m.castShadow=b.cast;m.receiveShadow=b.receive;root.add(m);}}
batchStatic(environment);
let h=3,spacing=.15,columnSpec=null,roofPoints=null,columnPoints=null,roofEntries=[],columnEntries=[];
const pixelMaterial=new T.ShaderMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending,vertexColors:true,uniforms:{power:{value:.8},pixelRatio:{value:Math.min(devicePixelRatio||1,1.7)}},vertexShader:'attribute float size;varying vec3 c;uniform float pixelRatio;void main(){c=color;vec4 v=modelViewMatrix*vec4(position,1.);gl_PointSize=clamp(size*430.*pixelRatio/-v.z,6.5*pixelRatio,28.*pixelRatio);gl_Position=projectionMatrix*v;}',fragmentShader:'varying vec3 c;uniform float power;void main(){float d=length(gl_PointCoord-.5)*2.;if(d>1.)discard;float core=exp(-d*d*24.);float inner=exp(-d*d*7.);float halo=exp(-d*d*3.8)*(1.-smoothstep(.65,1.,d));gl_FragColor=vec4(c*(1.6+core*1.5)+vec3(core*.10),min(1.,core+inner*.44+halo*.20)*power);}'});
function makePixels(entries){const p=new Float32Array(entries.length*3),c=new Float32Array(entries.length*3),s=new Float32Array(entries.length);entries.forEach((v,i)=>{p.set([v.x,v.y,v.z],i*3);s[i]=.20;});const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(p,3));g.setAttribute('color',new T.BufferAttribute(c,3).setUsage(T.DynamicDrawUsage));g.setAttribute('size',new T.BufferAttribute(s,1));const points=new T.Points(g,pixelMaterial);points.frustumCulled=false;points.renderOrder=2;pixelGroup.add(points);return points;}
function geometry(newSpacing,spec){spacing=newSpacing;columnSpec=spec;h=spec?.h||3;for(const obj of [...structure.children]){structure.remove(obj);if(obj.userData.dispose)obj.geometry.dispose();}for(const p of [...pixelGroup.children]){pixelGroup.remove(p);p.geometry.dispose();}roofEntries=[];columnEntries=[];
 const posts=[];for(const x of [-4,0,4])for(const z of [-3,3]){posts.push([x,z]);box([.105,h,.105],[x,h/2,z],materials.darkWood,structure);box([.24,.045,.24],[x,.025,z],materials.metal,structure);}
 for(const z of [-3,3])box([8.2,.18,.13],[0,h+.05,z],materials.darkWood,structure);for(const x of [-4,0,4])box([.10,.13,6.1],[x,h,-.0],materials.darkWood,structure);
 const lines=Math.round(6/spacing),ledsPerLine=Math.floor(8/spacing+1e-9),wire=[];for(let row=0;row<lines;row++){const z=(row-(lines-1)/2)*spacing;wire.push(-4,h-.09,z,4,h-.09,z);for(let p=0;p<ledsPerLine;p++){const x=(p-(ledsPerLine-1)/2)*spacing;roofEntries.push({x,y:h-.04,z,u:(x+4)/8,v:(z+3)/6});}}
 const wg=new T.BufferGeometry();wg.setAttribute('position',new T.Float32BufferAttribute(wire,3));const wires=new T.LineSegments(wg,new T.LineBasicMaterial({color:'#18221f',transparent:true,opacity:.55,depthWrite:false}));wires.userData.dispose=true;structure.add(wires);
 for(const [x,z]of posts){const turns=spec?.turns||18,c=spec?.c||.5,n=spec?.pixels||Math.ceil(Math.hypot(c*turns,h)/spacing),r=c/(2*Math.PI)+.012;for(let p=0;p<n;p++){const f=p/Math.max(1,n-1),a=f*turns*Math.PI*2;columnEntries.push({x:x+r*Math.cos(a),y:f*h,z:z+r*Math.sin(a),u:(x+4)/8,v:f});}}
 roofPoints=makePixels(roofEntries);columnPoints=makePixels(columnEntries);
}
// Screen-style visuals sampled on the actual pixel matrix, never an opaque screen.
const effects=['Plasma multicolor','Túnel de anillos','Lluvia digital','Onda arcoíris','Damero en movimiento','Espiral cromática','Ondas de agua','Cintas diagonales','Aurora boreal','Flores de neón','Fuego líquido','Constelación'];
const fract=x=>x-Math.floor(x),smooth=x=>x*x*(3-2*x),temp=new T.Color(),colorA=new T.Color(),colorB=new T.Color();
function sample(index,u,v,t,out){let x=(u-.5)*2,y=(v-.5)*2,r=Math.hypot(x,y),a=Math.atan2(y,x),hue=0,val=.9,sat=.88;const phase=index*.071;
 switch(index%12){
 case 0:hue=.57+.22*Math.sin(x*3+t)+.18*Math.sin(y*5-t*.8)+.12*Math.sin(r*5-t*1.5);val=.55+.45*Math.sin(x*4+y*3-t)**2;break;
 case 1:hue=r*.65-t*.2;val=.18+.82*Math.pow(.5+.5*Math.cos(r*18-t*6),3);break;
 case 2:{const col=Math.floor(u*28),trail=fract(v*1.6+t*.65+Math.sin(col*34.4)*8);hue=.34+col*.037;val=.06+.94*Math.pow(trail,8);break;}
 case 3:hue=u*.8+v*.3-t*.2;val=.6+.4*Math.sin(y*7+t*3)**2;break;
 case 4:{const check=(Math.floor(u*12+t*.7)+Math.floor(v*8-t*.6))%2;hue=check?.84:.51;val=check?.9:.22;break;}
 case 5:hue=a/6.283+r*.65-t*.3;val=.2+.8*Math.pow(.5+.5*Math.sin(a*3+r*10-t*5),2);break;
 case 6:hue=.5+r*.26+.1*Math.sin(t);val=.12+.88*Math.pow(.5+.5*Math.cos(r*21-t*6),4);break;
 case 7:hue=x*.7+y*.7-t*.27;val=.2+.8*Math.pow(.5+.5*Math.sin((x+y)*10-t*5),3);break;
 case 8:hue=.38+.24*Math.sin(x*3+t*.8)+.12*Math.cos(y*4-t);val=.25+.75*Math.pow(.5+.5*Math.sin(y*6+Math.sin(x*5+t)*2),2);break;
 case 9:hue=.8+.16*Math.sin(a*6+t);val=.12+.88*Math.pow(.5+.5*Math.cos(r*13-Math.sin(a*6+t*2)*2-t*2),3);break;
 case 10:hue=.03+.10*Math.sin(y*4+t+Math.sin(x*5+t));val=.2+.8*Math.pow(.5+.5*Math.sin(y*9-t*5+Math.sin(x*7+t*2)),2);break;
 default:{const cellX=Math.floor(u*80),cellY=Math.floor(v*36),hash=fract(Math.sin(cellX*127.1+cellY*311.7)*43758.545);hue=hash+.6;val=.04+.96*Math.pow(.5+.5*Math.sin(hash*30+t*2.8),18);sat=.5;}
 }out.setHSL(fract(hue+phase),sat,val*.50);return out;
}

// Lounge: pearl whites, amber and marine blues; slow movement within each 2 s cue.
const loungeEffects=['Ondas cálidas','Estrellas blancas','Mar azul','Constelación polar','Mareas doradas','Perlas de luz','Reflejos del mar','Bokeh champagne','Estrellas marinas','Aurora de nácar','Seda cálida','Noche de plata'];
const loungeWhite=new T.Color('#fff2da'),loungeWarm=new T.Color('#ffb659'),loungeBlue=new T.Color('#7ecbff'),loungeSea=new T.Color('#339dc7');
function loungeSample(index,u,v,t,out){const x=u*2-1,y=v*2-1,r=Math.hypot(x,y),a=Math.atan2(y,x),wave=.5+.5*Math.sin(x*4+y*2-t*.75),hash=fract(Math.sin(Math.floor(u*160)*127.1+Math.floor(v*60)*311.7)*43758.545);let val=.5;
 switch(index%12){
 case 0:val=.25+.7*(.5+.5*Math.sin(y*7+Math.sin(x*3-t*.5)-t*.9));out.copy(loungeWarm).lerp(loungeWhite,wave*.45);break;
 case 1:val=.025+.975*Math.pow(.5+.5*Math.sin(hash*40+t*.85),14);out.copy(loungeWhite);break;
 case 2:val=.18+.75*(.5+.5*Math.sin(y*8+Math.sin(x*5-t*.55)*1.7-t*.7));out.copy(loungeSea).lerp(loungeBlue,wave);break;
 case 3:val=.025+.975*Math.pow(.5+.5*Math.sin(hash*33+t*.7),16);out.copy(loungeBlue).lerp(loungeWhite,hash*.7);break;
 case 4:val=.22+.72*(.5+.5*Math.cos(r*12-t*1.2));out.copy(loungeWarm).lerp(loungeWhite,(.5+.5*Math.sin(r*5-t*.6))*.45);break;
 case 5:val=.04+.90*Math.pow(.5+.5*Math.cos(x*15+y*10-t*.7),6);out.copy(loungeWhite).lerp(loungeBlue,.18);break;
 case 6:val=.12+.75*Math.pow(.5+.5*Math.sin(x*9-t*.65+Math.sin(y*7+t*.5)),2);out.copy(loungeBlue).lerp(loungeWhite,wave*.5);break;
 case 7:val=.06+.94*Math.pow(.5+.5*Math.sin(hash*22+t*.6),8);out.copy(loungeWarm).lerp(loungeWhite,hash*.65);break;
 case 8:val=.03+.96*Math.pow(.5+.5*Math.sin(hash*41+t*.8+Math.sin(a*5)),13);out.copy(loungeSea).lerp(loungeWhite,hash);break;
 case 9:val=.2+.70*(.5+.5*Math.sin(y*5+Math.sin(x*4-t*.4)*2));out.copy(loungeBlue).lerp(loungeWhite,wave*.8);break;
 case 10:val=.2+.75*(.5+.5*Math.sin(x*6+y*5-t*.65));out.copy(loungeWarm).lerp(loungeWhite,.55+wave*.3);break;
 default:val=.03+.97*Math.pow(.5+.5*Math.sin(hash*36+t*.75),12);out.copy(loungeWhite).lerp(loungeBlue,hash*.35);
 }return out.multiplyScalar(val*.85);
}
function visual(u,v,t,mode,level,out){if(mode==='lounge'){const i=Math.floor(t/2)%12,p=smooth(Math.min(1,(t%2)/.65));loungeSample((i+11)%12,u,v,t,colorA);loungeSample(i,u,v,t,colorB);return out.copy(colorA).lerp(colorB,p).multiplyScalar(.9+level*.12);}if(mode==='warm')return out.setRGB(1,.49,.13);if(mode==='stars'){const p=.2+.8*Math.pow(.5+.5*Math.sin(u*331+v*277+t*2),12);return out.setRGB(p,p*.72,p*.35);}if(mode==='wave')return sample(3,u,v,t,out);if(mode!=='music')return sample(Number(mode.slice(3)),u,v,t,out);const cue=Math.floor(t/2),i=cue%12,previous=(i+11)%12,p=smooth(Math.min(1,(t%2)/.22));sample(previous,u,v,t,colorA);sample(i,u,v,t,colorB);return out.copy(colorA).lerp(colorB,p).multiplyScalar(.78+level*.42);}
// Broad color wash falling onto the paving, plus four real lights for people/props.
const spillCanvas=document.createElement('canvas');spillCanvas.width=128;spillCanvas.height=96;const sx=spillCanvas.getContext('2d'),spillTexture=new T.CanvasTexture(spillCanvas);spillTexture.colorSpace=T.SRGBColorSpace;
const spill=new T.Mesh(new T.PlaneGeometry(8.9,6.9),new T.MeshBasicMaterial({map:spillTexture,transparent:true,opacity:.18,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide}));spill.rotation.x=-Math.PI/2;spill.position.y=.022;scene.add(spill);
const rgbLights=[];for(const x of [-2,2])for(const z of [-1.5,1.5]){const l=new T.PointLight('#a86aff',2.6,7,2);l.position.set(x,2.6,z);scene.add(l);rgbLights.push(l);}
let lastSpill=-1,lastSpillKey="";function update(t,mode,level,power,showColumns){
 pixelMaterial.uniforms.power.value=power*1.25;columnPoints.visible=showColumns;
 for(const [object,entries,isColumn]of [[roofPoints,roofEntries,false],[columnPoints,columnEntries,true]]){const colors=object.geometry.attributes.color.array;for(let i=0;i<entries.length;i++){const v=entries[i];visual(v.u,v.v,t,mode,level,temp);if(isColumn)temp.multiplyScalar(.8);colors[i*3]=temp.r;colors[i*3+1]=temp.g;colors[i*3+2]=temp.b;}object.geometry.attributes.color.needsUpdate=true;}
 const spillKey=mode+":"+power;if(Math.abs(t-lastSpill)>.05||lastSpill<0||spillKey!==lastSpillKey){lastSpill=t;lastSpillKey=spillKey;const image=sx.createImageData(32,24);for(let y=0;y<24;y++)for(let x=0;x<32;x++){visual((x+.5)/32,1-(y+.5)/24,t,mode,level,temp);const k=(y*32+x)*4;image.data[k]=Math.min(255,temp.r*255*power);image.data[k+1]=Math.min(255,temp.g*255*power);image.data[k+2]=Math.min(255,temp.b*255*power);image.data[k+3]=255;}const small=document.createElement('canvas');small.width=32;small.height=24;small.getContext('2d').putImageData(image,0,0);sx.imageSmoothingEnabled=true;sx.clearRect(0,0,128,96);sx.drawImage(small,0,0,128,96);spillTexture.needsUpdate=true;rgbLights.forEach((l,i)=>{visual(i<2?.25:.75,i%2?.75:.25,t,mode,level,temp);l.color.copy(temp);l.intensity=power*(2.4+level*2.5);});}
 const beat=t*90/60*Math.PI*2;for(const p of guests){p.body.rotation.z=Math.sin(beat*.5+p.phase)*(.014+level*.016);p.body.position.y=Math.sin(beat+p.phase)*.006;p.arms[0].rotation.x=.12+Math.sin(beat*.5+p.phase)*.09;p.arms[1].rotation.x=-.14+Math.sin(beat*.5+p.phase+1)*.1;p.root.rotation.y=p.root.userData.rot??p.root.rotation.y;if(p.root.userData.rot===undefined)p.root.userData.rot=p.root.rotation.y;}
 const cameraDistance=distance*Math.max(1,Math.min(1.3,.95/camera.aspect));camera.position.set(target.x+cameraDistance*Math.cos(pitch)*Math.sin(yaw),target.y+cameraDistance*Math.sin(pitch),target.z+cameraDistance*Math.cos(pitch)*Math.cos(yaw));camera.lookAt(target);const belowGround=camera.position.y<0;ground.visible=!belowGround;spill.visible=!belowGround;renderer.render(scene,camera);
 return {effect:mode==='lounge'?loungeEffects[Math.floor(t/2)%12]:mode==='music'?effects[Math.floor(t/2)%12]:mode.startsWith('fx-')?effects[Number(mode.slice(3))]:mode==='warm'?'Ámbar cálido':mode==='stars'?'Champagne':effects[3],cue:Math.floor(t/2),time:t,next:2-t%2,drawCalls:renderer.info.render.calls,pixels:roofEntries.length,belowGround,cameraHeight:camera.position.y,distance};
}
function preset(name){view=name;if(name==='plan'){pitch=1.565;yaw=0;distance=15.5;target.set(0,0,0);}else if(name==='under'){pitch=-.13;yaw=.28;distance=8.5;target.set(0,2.2,-.8);}else if(name==='environment'){pitch=.23;yaw=.62;distance=23;target.set(0,1.4,-1);}else{pitch=.39;yaw=.61;distance=15.8;target.set(0,1.3,0);}fit();}
function fit(){const w=canvas.clientWidth,h=canvas.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
new ResizeObserver(fit).observe(canvas);fit();
// One pointer orbits; two pointers pinch the camera distance without rotating.
const pointers=new Map();let pinch=null;
const zoomBy=factor=>{distance=Math.max(6,Math.min(40,distance*factor));};
function beginGesture(){
 const pts=[...pointers.values()];
 if(pts.length>=2){const separation=Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y);pinch=separation>0?{separation,distance}:null;drag=null;}
 else{pinch=null;drag=pts.length?{...pts[0]}:null;}
}
canvas.addEventListener('pointerdown',e=>{
 if(e.pointerType==='mouse'&&e.button!==0)return;
 pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});canvas.setPointerCapture(e.pointerId);beginGesture();
});
canvas.addEventListener('pointermove',e=>{
 if(!pointers.has(e.pointerId))return;
 pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(pointers.size>=2){
  const [a,b]=[...pointers.values()],separation=Math.hypot(a.x-b.x,a.y-b.y);
  if(pinch&&separation>0)distance=Math.max(6,Math.min(40,pinch.distance*pinch.separation/separation));
  else beginGesture();
  return;
 }
 if(!drag)return;
 yaw-=(e.clientX-drag.x)*.006;pitch=Math.max(-1.565,Math.min(1.565,pitch+(e.clientY-drag.y)*.005));drag={x:e.clientX,y:e.clientY};view='perspective';
});
function endPointer(e){
 if(!pointers.delete(e.pointerId))return;
 if(e.type!=='lostpointercapture'&&canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);
 beginGesture();
}
canvas.addEventListener('pointerup',endPointer);canvas.addEventListener('pointercancel',endPointer);canvas.addEventListener('lostpointercapture',endPointer);
window.addEventListener('blur',()=>{pointers.clear();pinch=null;drag=null;});
canvas.addEventListener('wheel',e=>{e.preventDefault();zoomBy(Math.exp(e.deltaY*.001));},{passive:false});
canvas.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-'].includes(e.key))e.preventDefault();if(e.key==='ArrowLeft')yaw-=.1;if(e.key==='ArrowRight')yaw+=.1;if(e.key==='ArrowUp')pitch=Math.min(1.565,pitch+.1);if(e.key==='ArrowDown')pitch=Math.max(-1.565,pitch-.1);if(e.key==='+')distance=Math.max(6,distance*.9);if(e.key==='-')distance=Math.min(40,distance*1.1);});
geometry(.15,null);return{geometry,update,preset,zoomBy,effects,renderer,scene,camera,get view(){return view;}};
};
