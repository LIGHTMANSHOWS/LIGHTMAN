import * as THREE from 'three';

const V=(x,y,z)=>new THREE.Vector3(x,y,z);
function polygon(points,material,parent){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(points.flatMap(p=>p.toArray()),3));g.setAttribute('uv',new THREE.Float32BufferAttribute(points.flatMap((_,i)=>[i%2,Math.floor(i/2)]),2));const ids=[];for(let i=1;i<points.length-1;i++)ids.push(0,i,i+1);g.setIndex(ids);g.computeVertexNormals();const m=new THREE.Mesh(g,material);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}

export function createUrbanCostume(c){
 const {group,bones,hipPos,chestPos,headPos,bind,mesh,tube,ledStrip,cloth,rubber,steel,green,orange,headGeometry,skinMaterial}=c;
 const y=chestPos.y,hip=hipPos.y;
 const front=(x,yy,offset=.012)=>{const rings=[[hip-.17,.19,.13],[hip-.06,.195,.14],[hip+.12,.20,.145],[y-.08,.218,.157],[y+.04,.248,.152],[y+.12,.218,.13],[y+.18,.075,.069]];let a=rings[0],b=rings.at(-1);for(let i=0;i<rings.length-1;i++)if(yy>=rings[i][0]&&yy<=rings[i+1][0]){a=rings[i];b=rings[i+1];break;}const f=THREE.MathUtils.clamp((yy-a[0])/(b[0]-a[0]),0,1),rx=THREE.MathUtils.lerp(a[1],b[1],f),rz=THREE.MathUtils.lerp(a[2],b[2],f);x=THREE.MathUtils.clamp(x,-rx*.98,rx*.98);return V(x,yy,.006+rz*Math.sqrt(Math.max(.01,1-x*x/(rx*rx)))+offset);};
 // A separate jacket shell has an actual opening down the front.
 const rings=[[hip-.17,.19,.13],[hip-.06,.195,.14],[hip+.12,.20,.145],[y-.08,.218,.157],[y+.04,.248,.152],[y+.12,.218,.13],[y+.18,.075,.069]];
 const positions=[],uvs=[],indices=[],N=48;
 for(let j=0;j<rings.length;j++){const [yy,rx,rz]=rings[j];for(let i=0;i<=N;i++){const a=i/N*Math.PI*2,fold=.0015*Math.sin(a*7+j*1.7);positions.push(Math.cos(a)*(rx+fold),yy,Math.sin(a)*(rz+fold)+.006);uvs.push(i/N,j/(rings.length-1));}}
 for(let j=0;j<rings.length-1;j++)for(let i=0;i<N;i++){const angle=(i+.5)/N*Math.PI*2;if(angle>Math.PI/2-.27&&angle<Math.PI/2+.27)continue;const n=j*(N+1)+i;indices.push(n,n+N+2,n+1,n,n+N+1,n+N+2);}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geo.setIndex(indices);geo.computeVertexNormals();const jacket=new THREE.Mesh(geo,cloth);jacket.castShadow=jacket.receiveShadow=true;bind(jacket,bones.Spine2,group);
 const details=new THREE.Group();
 const stitch=new THREE.MeshStandardMaterial({color:'#6e6247',roughness:.9});
 const fabricPanels=cloth.clone();fabricPanels.side=THREE.DoubleSide;
 for(const sign of [-1,1]){
  // Collar folds, shirt pockets and pocket flaps follow the front torso surface.
  const collar=[front(sign*.032,y+.17,.014),front(sign*.104,y+.08,.014),front(sign*.067,y+.025,.021),front(sign*.012,y+.092,.022)];
  polygon(collar,fabricPanels,details);tube([...collar,collar[0]],.0015,orange,details);
  const pocket=[front(sign*.085,y-.025,.013),front(sign*.167,y-.025,.013),front(sign*.166,y-.105,.013),front(sign*.088,y-.113,.013)];
  polygon(pocket,fabricPanels,details);tube([...pocket,pocket[0]],.0013,orange,details);
  const flap=[front(sign*.082,y-.022,.017),front(sign*.17,y-.022,.017),front(sign*.155,y-.05,.02),front(sign*.10,y-.05,.02)];polygon(flap,fabricPanels,details);tube(flap,.0014,orange,details);
  mesh(new THREE.SphereGeometry(.0035,8,6),steel,details,front(sign*.127,y-.042,.025));
  const edge=[front(sign*.04,y+.09,.02),front(sign*.047,y-.08,.018),front(sign*.064,hip+.08,.02),front(sign*.135,hip-.14,.018)];tube(edge,.0019,orange,details);
  const greenLine=[front(sign*.056,y+.07,.023),front(sign*.062,y-.075,.022),front(sign*.081,hip+.085,.024),front(sign*.146,hip-.12,.021)];
  ledStrip(greenLine,green,group,bones.Spine2,.021);
  // Jacket hem and shoulder stitching remain separate from the LED rows.
  tube([front(sign*.145,hip-.13,.018),front(sign*.185,hip-.15,.015),V(sign*.19,hip-.15,-.01)],.0016,orange,details);
  tube([front(sign*.216,y+.082,.017),front(sign*.183,y+.115,.016),front(sign*.11,y+.15,.016)],.0013,orange,details);
 }
 // Tie knot and the hanging tie are cloth geometry, outlined as in the catalogue.
 const knot=[front(-.016,y+.087,.025),front(.016,y+.087,.025),front(.012,y+.055,.027),front(-.012,y+.055,.027)];polygon(knot,fabricPanels,details);tube([...knot,knot[0]],.0012,orange,details);
 const tie=[front(-.01,y+.055,.027),front(.01,y+.055,.027),front(.024,y-.153,.026),front(0,y-.19,.028),front(-.024,y-.153,.026)];polygon(tie,fabricPanels,details);tube([...tie,tie[0]],.0014,orange,details);
 bind(details,bones.Spine2,group);

 for(const side of ['Left','Right']){
  const upper=bones[side+'Arm'].getWorldPosition(new THREE.Vector3()),elbow=bones[side+'ForeArm'].getWorldPosition(new THREE.Vector3()),hand=bones[side+'Hand'].getWorldPosition(new THREE.Vector3());
  const seam=new THREE.Group();tube([upper.clone().add(V(0,.047,.047)),upper.clone().lerp(elbow,.95).add(V(0,.036,.04))],.0014,orange,seam);bind(seam,bones[side+'Arm'],group);
  const cuff=new THREE.Group(),p=elbow.clone().lerp(hand,.93);tube([p.clone().add(V(0,-.026,.035)),p.clone().add(V(0,.026,.035))],.0018,orange,cuff);bind(cuff,bones[side+'ForeArm'],group);
  const foot=bones[side+'Foot'].getWorldPosition(new THREE.Vector3()),shoe=new THREE.Group();
  const ellipse=(yy,rx,rz)=>Array.from({length:41},(_,i)=>{const a=i/40*Math.PI*2;return foot.clone().add(V(Math.sin(a)*rx,yy,Math.cos(a)*rz+.045));});
  tube(ellipse(-.027,.067,.139),.0032,green,shoe);tube(ellipse(.008,.061,.128),.0012,orange,shoe);
  for(let n=0;n<4;n++){const z=.06+n*.021;tube([foot.clone().add(V(-.028,.041,z)),foot.clone().add(V(.028,.044,z+.015))],.0013,orange,shoe);tube([foot.clone().add(V(.028,.041,z)),foot.clone().add(V(-.028,.044,z+.015))],.0013,orange,shoe);}
  bind(shoe,bones[side+'Foot'],group);
 }

 // An anatomically detailed, textured reference head gives Urban an exposed human face.
 const head=new THREE.Group();mesh(headGeometry,skinMaterial,head);
 // Preserve the scan's anatomical neck and blend its lower edge into the collar.
 mesh(new THREE.CylinderGeometry(.066,.075,.035,32),cloth,head,V(0,-.189,-.012));
 const hatMat=new THREE.MeshPhysicalMaterial({color:'#111418',metalness:.12,roughness:.39,clearcoat:.25,envMapIntensity:.4});
 const dome=mesh(new THREE.SphereGeometry(1,36,22,0,Math.PI*2,0,Math.PI*.53),hatMat,head,V(0,.064,-.01));dome.scale.set(.111,.101,.113);
 const brim=mesh(new THREE.CylinderGeometry(.125,.125,.006,48),hatMat,head,V(0,.064,.002));brim.scale.z=1.09;
 tube(Array.from({length:49},(_,i)=>{const a=i/48*Math.PI*2;return V(Math.sin(a)*.126,.064,Math.cos(a)*.138+.002);}),.0017,orange,head);
 for(const x of [-.042,.042]){const radius=Math.sqrt(1-(x/.111)**2),line=Array.from({length:25},(_,i)=>{const a=i/24*Math.PI;return V(x,.064+Math.sin(a)*.101*radius,-.01+Math.cos(a)*.113*radius);});
  tube(line,.0033,green,head);tube(line.map(v=>v.clone().add(V(x>0?.007:-.007,0,0))),.0011,orange,head);
 }
 // Transparent glasses retain the face and nose silhouette instead of using a helmet visor.
 const glass=new THREE.MeshPhysicalMaterial({color:'#1a221b',transparent:true,opacity:.34,roughness:.12,metalness:.08,clearcoat:1,depthWrite:false});
 for(const sign of [-1,1]){const outline=[V(sign*.008,.023,.125),V(sign*.084,.02,.105),V(sign*.079,-.019,.11),V(sign*.022,-.024,.126),V(sign*.008,-.009,.13)];polygon(outline,glass,head);tube([...outline,outline[0]],.0018,orange,head);tube([V(sign*.082,.016,.105),V(sign*.10,.013,.056),V(sign*.102,.008,-.035)],.0015,orange,head);}
 tube([V(-.008,.012,.128),V(0,.018,.134),V(.008,.012,.128)],.0015,orange,head);
 head.position.copy(headPos).add(V(0,.07,.006));bind(head,bones.Head,group);
 return {head};
}
