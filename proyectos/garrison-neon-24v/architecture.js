/* R03 · Geometría trazada desde las dos fotografías, sin escala medida. */
window.buildGarrisonArchitecture=function(ctx){
 const {THREE:T,group:G,accents:A,DATA:D,surfaceMaterial:P,glowPath:glow}=ctx;
 const V=(x,y,z)=>new T.Vector3(x,y,z),w=D.width,half=w/2,L=Math.max(24,9*D.spacing+4),front=L/2,back=-L/2;
 const basic=(c)=>P(c,.96);
 const metal=basic('#44464a'),black=basic('#17181b'),silver=basic('#a7a6a1'),rubber=basic('#111113'),red=basic('#951d29'),glass=basic('#1e292b');
 const mats={wall:P('#555357',.94),floor:P('#424246',.97),fascia:P('#676563',.94),dark:P('#151619',.90),steel:P('#4d5054',.84),pane:P('#303437',.94)};
 if(!mats.floor.map){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const c=canvas.getContext('2d'),img=c.createImageData(256,256);let seed=240610;
  for(let i=0;i<img.data.length;i+=4){seed=(1664525*seed+1013904223)>>>0;const n=70+(seed%65);img.data[i]=n;img.data[i+1]=n;img.data[i+2]=n+2;img.data[i+3]=255;}c.putImageData(img,0,0);
  c.strokeStyle='#333338';c.lineWidth=.6;for(let i=0;i<11;i++){c.beginPath();c.moveTo(i*25,0);c.lineTo(i*25+12,80);c.lineTo(i*25-8,140);c.lineTo(i*25+20,256);c.stroke();}
  const tex=new T.CanvasTexture(canvas);tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.repeat.set(4,20);mats.floor.map=tex;mats.floor.needsUpdate=true;
 }
 function box(x,y,z,sx,sy,sz,mat=metal,parent=G){const m=new T.Mesh(new T.BoxGeometry(sx,sy,sz),mat);m.position.set(x,y,z);parent.add(m);return m;}
 function rod(a,b,r=.02,mat=metal,parent=G){const delta=b.clone().sub(a),m=new T.Mesh(new T.CylinderGeometry(r,r,delta.length(),8),mat);m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(V(0,1,0),delta.normalize());parent.add(m);return m;}
 function sphere(x,y,z,sx,sy,sz,mat,parent=G){const m=new T.Mesh(new T.SphereGeometry(1,16,12),mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);parent.add(m);return m;}
 function tube(points,r,mat,parent=G){const m=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),Math.max(16,points.length*4),r,8,false),mat);parent.add(m);return m;}
 function line(points,col,r=.009){return glow(points,col,r,A);}
 function extrudedShape(shape,depth,mat,x,y,z,rotation=0){const m=new T.Mesh(new T.ExtrudeGeometry(shape,{depth,bevelEnabled:false,curveSegments:16}),mat);m.position.set(x,y,z);m.rotation.x=rotation;G.add(m);return m;}
 function roundedPlan(x0,x1,z0,z1,y,height,r,mat){
  const s=new T.Shape();s.moveTo(x0+r,z0);s.lineTo(x1-r,z0);s.quadraticCurveTo(x1,z0,x1,z0+r);s.lineTo(x1,z1-r);s.quadraticCurveTo(x1,z1,x1-r,z1);s.lineTo(x0+r,z1);s.quadraticCurveTo(x0,z1,x0,z1-r);s.lineTo(x0,z0+r);s.quadraticCurveTo(x0,z0,x0+r,z0);
  return extrudedShape(s,height,mat,0,y+height,0,Math.PI/2);
 }
 // Textura y volumen del asfalto, aceras y cerramiento posterior.
 box(0,-.12,0,w+8,.23,L+12,mats.floor);
 box(-half-.9,3.5,0,1.8,7.0,L,mats.wall);box(half+.9,3.9,0,1.8,7.8,L,mats.wall);
 box(-half+.28,.075,0,.56,.15,L,mats.floor);box(half-.37,.12,0,.74,.24,L,mats.floor);
 for(const s of [-1,1])line([V(s*(half-.07),.19,front),V(s*(half-.07),.19,back)],'#fff0d2',.013);
 // Juntas del pavimento, línea discontinua y paso peatonal del fondo.
 for(let z=front-2;z>back+3;z-=2.6)box(.02,.008,z,.08,.012,1.15,P('#b7b5ab',.97));
 for(let x=-half+1.1;x<half-.8;x+=.73)box(x,.01,back+4.7,.34,.015,1.4,P('#aeaca4',.95));
 const gateZ=back-.35;
 box(0,4.8,gateZ,w+2,3.6,.4,mats.dark);box(.65,1.9,gateZ+.08,w*.65,3.8,.16,mats.steel);
 for(let x=-half+.08;x<half-.1;x+=.19)box(x,1.95,gateZ+.21,.024,3.8,.035,black);
 box(-half+.55,2.1,gateZ+.29,1.0,4.1,.18,mats.dark);
 for(let k=0;k<12;k++)box(-half+.55,.16+k*.25,gateZ+1.45-k*.09,1.0,.12,.24,mats.steel);
 // Fachada izquierda: paños negros, puertas y cartelería de la fotografía.
 const panelCount=12,panelStep=L/panelCount;
 for(let i=0;i<panelCount;i++){
  const z=front-panelStep*(i+.5);
  box(-half+.035,1.62,z,.09,3.1,panelStep-.05,mats.dark);
  box(-half+.15,1.68,z-panelStep/2,.21,3.25,.13,mats.steel);
  box(-half+.16,3.03,z,.25,.13,panelStep,mats.steel);
  if(i<8){
   box(-half+.13,2.02,z-.18,.035,1.24,.69,P('#8e2334',.97));
   // Cuatro bordes finos del marco; la gráfica está fijada por UV a cada paño.
   for(const dz of [-.36,.36])box(-half+.16,2.02,z-.18+dz,.025,1.29,.018,silver);
  }
 }
 // Marquesina izquierda, fascia profunda con doble labio y frente curvo.
 const fasciaTop=[],fasciaBottom=[];
 for(let j=0;j<=80;j++){
  const z=back+L*j/80;const rise=.85*Math.exp(-Math.pow((z-(front-1.5))/2.0,2));
  fasciaTop.push(V(-half+.67,3.53+rise,z));fasciaBottom.push(V(-half+.67,3.13+rise,z));
 }
 const verts=[],indices=[];
 for(let j=0;j<80;j++){
  const z0=fasciaTop[j].z,z1=fasciaTop[j+1].z,yt0=fasciaTop[j].y,yt1=fasciaTop[j+1].y,yb0=fasciaBottom[j].y,yb1=fasciaBottom[j+1].y,x0=-half,x1=-half+.67,n=verts.length/3;
  verts.push(x0,yb0,z0,x1,yb0,z0,x1,yt0,z0,x0,yt0,z0,x0,yb1,z1,x1,yb1,z1,x1,yt1,z1,x0,yt1,z1);
  for(const q of [[0,1,2,3],[4,7,6,5],[0,4,5,1],[3,2,6,7],[1,5,6,2],[0,3,7,4]])indices.push(n+q[0],n+q[2],n+q[1],n+q[0],n+q[3],n+q[2]);
 }
 const fg=new T.BufferGeometry();fg.setAttribute('position',new T.Float32BufferAttribute(verts,3));fg.setIndex(indices);fg.computeVertexNormals();G.add(new T.Mesh(fg,new T.MeshStandardMaterial({color:'#686665',roughness:.55,metalness:.4})));line(fasciaTop,'#f3eee6',.012);line(fasciaBottom,'#f3eee6',.012);
 // Aleta vertical redondeada junto al extremo del bloque izquierdo.
 const finZ=back+5.3,fin=new T.Shape();
 fin.moveTo(-half+.02,3.2);fin.lineTo(-half+.02,6.1);fin.quadraticCurveTo(-half+.02,7.0,-half+.42,6.55);fin.lineTo(-half+.95,5.9);fin.lineTo(-half+.95,3.2);fin.closePath();
 extrudedShape(fin,1.25,mats.fascia,0,0,finZ);
 line([V(-half+.04,3.2,finZ+1.27),V(-half+.04,6.1,finZ+1.27),V(-half+.12,6.58,finZ+1.27),V(-half+.42,6.55,finZ+1.27),V(-half+.96,5.9,finZ+1.27),V(-half+.96,3.2,finZ+1.27)],'#fff0d9',.01);
 // Nueve cajas superiores: profundidad, aletas, zócalo luminoso y ménsulas.
 for(let i=0;i<9;i++){
  const z=front-1.1-i*(L-6)/8,y=6.7;
  box(-half+.42,y,z,.84,1.02,1.12,mats.dark);
  box(-half+.85,y+.01,z,.025,.88,.94,mats.steel);
  for(let k=0;k<12;k++)box(-half+.88,y-.4+k*.071,z,.028,.019,.90,black);
  box(-half+.43,y-.57,z,.95,.12,1.25,mats.steel);
  const bx=-half+.91,ix=-half+.04,yy=y-.59;
  line([V(ix,yy,z-.59),V(bx,yy,z-.59),V(bx,yy,z+.59),V(ix,yy,z+.59),V(ix,yy,z-.59)],'#fff0de',.012);
  for(const dz of [-.49,.49]){
   rod(V(-half+.04,y-1.4,z+dz),V(-half+.91,y-.65,z+dz),.027,silver);
   rod(V(-half+.04,y-1.4,z+dz),V(-half+.04,y+.2,z+dz),.018,silver);
   rod(V(-half+.04,y-.66,z+dz),V(-half+.91,y-.65,z+dz),.025,silver);
  }
 }
 // Derecha: vitrinas de piso a techo, marcos y dos puertas con manijas.
 const shopFront=front,shopBack=back+7.2,shopStep=2.7;
 for(let z=shopFront-1.3;z>shopBack;z-=shopStep){
  box(half-.05,1.66,z,.06,3.04,shopStep-.12,mats.pane);
  for(const dz of [-shopStep/2+.06,shopStep/2-.06]){
   box(half-.15,1.7,z+dz,.16,3.18,.085,mats.steel);
   line([V(half-.24,.21,z+dz),V(half-.24,3.18,z+dz)],'#f9f3e9',.009);
  }
  box(half-.14,3.24,z,.2,.12,shopStep,mats.steel);
  line([V(half-.24,3.21,z-shopStep/2+.05),V(half-.24,3.21,z+shopStep/2-.05)],'#fff8ed',.011);
  box(half-.16,1.65,z+.15,.08,3,.032,silver);
  rod(V(half-.29,1.1,z+.27),V(half-.29,1.6,z+.27),.016,black);
  rod(V(half-.16,1.1,z+.27),V(half-.29,1.1,z+.27),.012,black);
 }
 // Voladizo frontal de las vitrinas, con dos molduras de aluminio.
 box(half-.38,3.55,(shopFront+shopBack)/2,.88,.48,shopFront-shopBack,mats.fascia);
 for(const y of [3.34,3.73])line([V(half-.84,y,shopBack),V(half-.84,y,shopFront)],'#fff7e8',.013);
 // Balcón continuo alto y ventanas cálidas, barrotes negros, terraza sobre cubierta.
 box(half-.27,4.40,0,.62,.17,L,mats.fascia);
 for(let z=back+.8;z<front;z+=3.2){
  box(half-.035,5.25,z,.04,1.45,1.05,mats.wall);
  box(half-.09,5.25,z-.55,.08,1.6,.07,black);box(half-.09,5.25,z+.55,.08,1.6,.07,black);
  box(half-.09,4.48,z,.09,.07,1.2,black);
 }
 for(let z=back;z<=front;z+=.32)rod(V(half-.6,4.45,z),V(half-.6,5.58,z),.017,black);
 for(const y of [4.65,5.58])rod(V(half-.6,y,back),V(half-.6,y,front),.025,black);
 line([V(half-.13,7.0,back),V(half-.13,7.0,front)],'#fff0dc',.012);
 for(let z=back;z<front;z+=1.5)rod(V(half-.08,7.14,z),V(half-.08,8.05,z),.025,black);
 rod(V(half-.08,8.05,back),V(half-.08,8.05,front),.03,black);
 // Bar del fondo: esquina redondeada y tres bandas horizontales con luz.
 const bar0=back+2.0,bar1=back+7.6,bx0=half-1.75;
 roundedPlan(bx0,half+.3,bar0,bar1,.2,1.12,.65,mats.fascia);
 roundedPlan(bx0-.08,half+.35,bar0-.05,bar1+.1,1.29,.09,.68,black);
 for(const y of [3.2,3.56,3.96]){
  roundedPlan(bx0-.45,half+.3,bar0-.35,bar1+.25,y,.19,.75,mats.fascia);
  const znear=bar1+.25,zfar=bar0-.35,xedge=bx0-.45;
  line([V(half+.08,y+.18,znear),V(xedge+.7,y+.18,znear),V(xedge+.18,y+.18,znear-.18),V(xedge,y+.18,znear-.75),V(xedge,y+.18,zfar+.75),V(xedge+.18,y+.18,zfar+.18),V(xedge+.7,y+.18,zfar)],'#f7f1df',.014);
 }
 const counterPath=[V(half-.05,.28,bar1),V(bx0+.65,.28,bar1),V(bx0+.13,.28,bar1-.2),V(bx0,.28,bar1-.65),V(bx0,.28,bar0+.65)];line(counterPath,'#ffe0ab',.013);
 // Techo técnico sobre el fondo y cables de servicio.
 box(half+.5,7.0,back+2,2.1,2.5,3.2,mats.wall);
 tube([V(half-.05,7.3,back+4),V(half-.1,7.5,back+2),V(half-.7,7.0,back+1)],.018,black);
 // Escalón de entrada derecho y dos piezas de tela oscura.
 box(half-.75,.15,front-2.5,.9,.3,3,mats.floor);
 const cloth=box(half-.8,.33,front-2.3,.58,.055,.66,black);cloth.rotation.y=.15;cloth.rotation.z=.05;
 // Tapa de registro, aro y ranuras metálicas en el pavimento.
 const mh=new T.Group();mh.position.set(half*.37,.018,front-6);
 const disc=new T.Mesh(new T.CylinderGeometry(.41,.41,.025,48),metal);mh.add(disc);
 for(const rr of [.34,.395]){const ring=new T.Mesh(new T.TorusGeometry(rr,.012,6,48),silver);ring.rotation.x=Math.PI/2;ring.position.y=.017;mh.add(ring);}
 for(let x=-.27;x<=.27;x+=.09){const chord=Math.sqrt(.29*.29-x*x);box(x,.018,0,.018,.008,2*chord,black,mh);}
 G.add(mh);
 // Moto roja estacionada a la izquierda: ruedas, motor, depósito, asiento y espejos.
 const bike=new T.Group();bike.position.set(-half+1.0,.18,front-7.0);bike.rotation.y=-.17;
 for(const z of [-.62,.65]){
  const wheel=new T.Mesh(new T.TorusGeometry(.29,.075,12,32),rubber);wheel.rotation.y=Math.PI/2;wheel.position.set(0,.3,z);bike.add(wheel);
  const rim=new T.Mesh(new T.TorusGeometry(.20,.018,6,24),silver);rim.rotation.y=Math.PI/2;rim.position.copy(wheel.position);bike.add(rim);
  for(let k=0;k<8;k++){const ang=k*Math.PI/4;rod(V(0,.3,z),V(0,.3+Math.sin(ang)*.2,z+Math.cos(ang)*.2),.008,silver,bike);}
 }
 rod(V(0,.3,-.62),V(0,.74,.1),.038,black,bike);rod(V(0,.3,.65),V(0,.94,.44),.025,silver,bike);rod(V(0,.74,.1),V(0,.94,.44),.04,black,bike);
 sphere(0,.81,.15,.21,.20,.34,red,bike);box(0,.90,-.30,.35,.13,.62,black,bike);
 box(0,.52,-.04,.24,.28,.34,metal,bike);box(.16,.26,-.32,.10,.1,.56,silver,bike);
 const lamp=new T.Mesh(new T.SphereGeometry(.13,12,8),silver);lamp.position.set(0,.97,.58);lamp.scale.set(1,1,.5);bike.add(lamp);
 rod(V(-.36,1.11,.36),V(.36,1.11,.36),.022,black,bike);
 for(const side of [-1,1]){rod(V(side*.3,1.12,.36),V(side*.34,1.4,.36),.012,silver,bike);sphere(side*.34,1.42,.36,.10,.06,.025,black,bike);}
 sphere(0,.63,-.65,.24,.07,.25,red,bike);G.add(bike);
 // Persona al fondo, a escala, fuera del recorrido principal.
 const human=new T.Group();human.position.set(-half+.85,.18,back+6.7);
 sphere(0,1.62,0,.11,.13,.105,black,human);box(0,1.19,0,.36,.58,.23,basic('#71352d'),human);
 for(const side of [-1,1]){rod(V(side*.10,.91,0),V(side*.13,.09,.03),.065,black,human);rod(V(side*.2,1.42,0),V(side*.24,.85,.04),.045,black,human);}G.add(human);
 G.userData={revision:'R03',photoBased:false,uvMaterials:true,width:w,length:L,upperBoxes:9,features:['marquesina curva','aleta vertical','bar redondeado de tres bandas','vitrinas','balcones','ménsulas','moto','tapa de registro','paso peatonal','escalera y portón']};
 return G.userData;
};
