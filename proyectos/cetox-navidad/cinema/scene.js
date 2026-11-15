/* LIGHTMAN · CETOX R05. New photo-based architectural reconstruction.
   Y up. Dimensions are estimated, not surveyed. */
window.createCetoxScene=function(T,renderer){
 const scene=new T.Scene(),architecture=new T.Group(),context=new T.Group(),decor=new T.Group();scene.add(architecture,context,decor);scene.background=new T.Color('#06101d');scene.fog=new T.FogExp2('#06101d',.0045);
 let seed=5179;const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296};
 function texture(kind){const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d'),im=x.createImageData(256,256);for(let y=0;y<256;y++)for(let q=0;q<256;q++){const i=(y*256+q)*4;let v=kind==='concrete'?180+random()*45:kind==='asphalt'?80+random()*65:180+random()*35;im.data[i]=v;im.data[i+1]=v;im.data[i+2]=v;im.data[i+3]=255}x.putImageData(im,0,0);if(kind==='concrete'){x.strokeStyle='rgba(50,55,50,.12)';x.lineWidth=1;for(let k=0;k<20;k++){x.beginPath();x.moveTo(random()*256,random()*256);x.lineTo(random()*256,random()*256);x.stroke()}}const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(kind==='asphalt'?18:4,kind==='asphalt'?18:7);return t}
 const plaster=texture('concrete'),roadTexture=texture('asphalt');const faces=[];
 for(let i=0;i<6;i++){const c=document.createElement('canvas');c.width=c.height=512;const x=c.getContext('2d'),g=x.createLinearGradient(0,0,0,512);g.addColorStop(0,'#8babc8');g.addColorStop(.38,'#314d69');g.addColorStop(.68,'#172a3c');g.addColorStop(1,'#486275');x.fillStyle=g;x.fillRect(0,0,512,512);for(let k=0;k<27;k++){const h=35+random()*150,xx=k*22-30;x.fillStyle=k%3?'#344b5b':'#152b3d';x.fillRect(xx,330-h,18,h+180);for(let yy=335-h;yy<512;yy+=14){x.fillStyle=random()>.8?'#c2aa7a':'#71899d';x.globalAlpha=.35;x.fillRect(xx+4,yy,3,5);x.globalAlpha=1}}faces.push(c)}
 const env=new T.CubeTexture(faces);env.colorSpace=T.SRGBColorSpace;env.needsUpdate=true;
 const mat={};function material(key,color,rough=.8,metal=.02,extra={}){mat[key]=new T.MeshStandardMaterial({color,roughness:rough,metalness:metal,...extra});return mat[key]}
 material('green','#4a773d',.78,.02,{map:plaster});material('greenDark','#1f453a',.43,.45);material('concrete','#8e9189',.94,.01,{map:plaster});material('white','#dbddd4',.70,.04,{map:plaster});material('frame','#18272c',.27,.7);material('silver','#839595',.26,.85);material('seal','#101a1e',.9,0);material('glass','#6b99b0',.11,.35,{envMap:env,envMapIntensity:1.05,transparent:true,opacity:.74,depthWrite:false});material('darkglass','#203d4e',.12,.45,{envMap:env,envMapIntensity:.8});material('inside','#394449',.9,.02);material('ceiling','#757d79',.85,.02);material('gate','#593a2d',.42,.54);material('gateDark','#35271f',.57,.42);material('lamp','#ece5d1',.26,.18,{emissive:'#ffc77c',emissiveIntensity:2.7});material('roomLamp','#e4d5ae',.7,0,{emissive:'#ffce91',emissiveIntensity:1.1});material('rail','#34464d',.38,.68);material('curb','#a3aaa4',.88,.04);material('neighbor','#727b70',.94,.01,{map:plaster});material('neighbor2','#7c8077',.95,.01,{map:plaster});material('plant','#244833',.84,.01);material('trunk','#443a31',.91,.02);material('planter','#4b5557',.75,.2);material('car','#3b4351',.24,.8,{envMap:env,envMapIntensity:.65});material('tire','#0b1015',.9,.02);material('carLight','#c9e2e7',.18,.1,{emissive:'#b5e9ff',emissiveIntensity:1.6});
 const batches=new Map(),cylinders=new Map(),entities=[];
 const q=new T.Quaternion(),up=new T.Vector3(0,1,0),boxGeometry=new T.BoxGeometry(1,1,1),cylinderGeometry=new T.CylinderGeometry(.5,.5,1,8);
 function box(name,p,size,m='concrete',parent=architecture,rotation){const key=m+'|'+parent.uuid;const a=batches.get(key)||{m,parent,items:[]};a.items.push({p,size,rotation});batches.set(key,a);entities.push({name,p,size,material:m,rotation});}
 function beam(name,a,b,width=.035,m='rail',parent=architecture){const va=new T.Vector3(...a),vb=new T.Vector3(...b),d=vb.clone().sub(va),length=d.length();q.setFromUnitVectors(up,d.normalize());const key=m+'|'+parent.uuid;const list=cylinders.get(key)||{m,parent,items:[]};list.items.push({p:va.add(vb).multiplyScalar(.5).toArray(),size:[width,length,width],rotation:q.toArray()});cylinders.set(key,list);entities.push({name,a,b,width,material:m});}
 const W=10,H=29,D=14;
 // True hollow shell, floor slabs and deep window reveals.
 box('Muro lateral izquierdo',[-4.98,14.5,-7],[.24,29,14.3]);box('Muro lateral derecho',[4.98,14.5,-7],[.24,29,14.3]);box('Muro posterior',[0,14.5,-14],[10,29,.24]);box('Cubierta de azotea',[0,29.03,-7],[10.15,.20,14.25]);
 for(let floor=0;floor<=8;floor++){const y=floor===8?28.9:floor*3.5+.12;box('Losa entre niveles',[0,y,-7],[9.85,.18,13.9],'ceiling')}
 const bays=[[-4.63,.04],[3.28,4.65]];
 box('Jamba izquierda',[-4.83,14.5,.03],[.34,29,.42],'green');box('Pilar central',[1.66,14.5,.02],[3.1,29,.46],'green');box('Jamba derecha',[4.83,14.5,.03],[.34,29,.42],'green');
 box('Remate de cubierta',[0,28.78,.03],[10,.42,.5],'green');
 for(let group=0;group<4;group++){
  const bottom=.55+group*7,band=bottom+3.5;
  for(let b=0;b<bays.length;b++){
   const [a,z]=bays[b],cx=(a+z)/2,w=z-a;box('Antepecho blanco',[cx,band,.02],[w,1.02,.44],'white');box('Goterón metálico',[cx,band-.55,.22],[w,.045,.22],'silver');
   if(group<3)box('Franja verde entre módulos',[cx,bottom+6.65,.03],[w,.66,.46],'green');
   for(let row=0;row<2;row++){
    const lo=row===0?bottom:band+.56,hi=row===0?band-.56:bottom+6.32,cy=(lo+hi)/2,hh=hi-lo;
    if(group===0&&row===0){box('Paño de acceso',[cx,cy,.03],[w,hh,.44],'green');if(b===0){box('Puerta de servicio',[-.92,1.6,.30],[1.18,2.63,.12],'silver');for(let k=0;k<9;k++)box('Paños puerta de servicio',[-.92,.45+k*.28,.37],[1.15,.025,.035],'frame')}else{box('Hueco rejilla',[cx,cy,.30],[w,hh,.08],'seal');for(let k=0;k<20;k++)box('Lamas de ventilación',[cx,lo+.08+k*(hh-.14)/20,.36],[w-.06,.042,.14],'frame')}continue}
    // Reveal jambs extend into the office; glass sits in front of the interior.
    for(const x of [a,z])box('Revelado de ventana',[x,cy,-.30],[.09,hh,.85],'white');
    for(const y of [lo,hi])box('Perfil horizontal',[cx,y,.09],[w,.065,.15],'frame');
    for(const x of [a,z])box('Perfil vertical',[x,cy,.09],[.062,hh,.15],'frame');
    const columns=b===0?3:1;
    for(let k=0;k<columns;k++){const xx=a+w*(k+.5)/columns;box('Cristal de fachada',[xx,cy,.125],[w/columns-.055,hh-.055,.025],'glass');if(k<columns-1)box('Montante aluminio',[a+w*(k+1)/columns,cy,.15],[.055,hh,.11],'frame')}
    const transom=lo+hh*.65;box('Travesaño aluminio',[cx,transom,.15],[w,.055,.11],'frame');
    box('Cielo raso interior',[cx,hi-.10,-2.1],[w-.14,.09,3.7],'ceiling');box('Tabique interior',[cx,cy,-3.85],[w,.95*hh,.07],'inside');
    if((group+row+b)%3===0){for(const xx of b===0?[cx-.95,cx+.8]:[cx])box('Panel de luz interior',[xx,hi-.17,-1.65],[.58,.032,.40],'roomLamp');box('Escritorio visible',[cx,lo+.75,-1.5],[Math.min(w-.25,2.3),.075,.85],'inside');}
    if((group+b+row)%4===1)for(let k=0;k<11;k++)box('Persiana interior',[cx,hi-.18-k*.075,-.14],[w-.12,.025,.035],'ceiling');
   }
  }
 }
 box('Ventana central',[1.54,26.08,.245],[.72,.55,.035],'darkglass');for(const x of [1.16,1.92])box('Marco ventana central',[x,26.08,.27],[.035,.60,.06],'frame');
 // Concrete weathering joints, roof edge, railings and corner conduit.
 for(let y=3.5;y<29;y+=3.5)box('Junta de hormigón lateral',[-5.113,y,-7],[.012,.018,14],'inside');
 for(const z of [-.08,-14]){for(const y of [29.26,29.64])beam('Baranda azotea',[-4.99,y,z],[4.99,y,z],.038);for(let i=0;i<10;i++)beam('Balaustre azotea',[-4.99+i*9.98/9,29.12,z],[-4.99+i*9.98/9,29.64,z],.027)}
 for(const x of [-4.99,4.99]){for(const y of [29.26,29.64])beam('Baranda lateral',[x,y,0],[x,y,-14],.038);for(let i=0;i<14;i++)beam('Balaustre lateral',[x,29.12,-i*14/13],[x,29.64,-i*14/13],.027)}
 beam('Conducción lateral',[-5.14,.8,-12.9],[-5.14,28.5,-12.9],.055,'silver');
 // Gate, corrugated rolling shutters, stainless handles and wall lamps.
 box('Dintel de ingreso',[0,3.12,3.8],[12.7,.56,.40],'greenDark');for(const x of [-6.24,-1.85,.20,6.20])box('Marco portón',[x,1.52,3.81],[.20,3.12,.4],'greenDark');
 for(const [x,w]of [[-4.06,4.03],[-.83,1.83],[3.18,5.65]]){box('Paño de portón',[x,1.48,3.77],[w,2.80,.16],'gate');for(let j=0;j<33;j++){box('Relieve portón',[x,.11+j*.084,3.865],[w-.05,.026,.035],j%2?'gate':'gateDark');}box('Guía portón',[x-w/2+.035,1.48,3.90],[.04,2.8,.055],'frame')}
 box('Tirador de ingreso',[-.18,1.40,3.99],[.04,.51,.055],'silver');box('Cerradura',[-.18,1.19,3.995],[.08,.12,.04],'silver');
 for(const x of [-6.48,6.43])box('Pilar de lindero',[x,1.75,3.8],[.28,3.5,.62],'white');
 const practicalLights=[];
 for(const x of [-4.7,4.65]){const lamp=new T.Mesh(new T.CylinderGeometry(.10,.10,.075,8),mat.lamp);lamp.rotation.x=Math.PI/2;lamp.position.set(x,3.14,4.045);architecture.add(lamp);const light=new T.PointLight('#ffce93',3.5,5.2,2);light.position.set(x,3.14,4.28);scene.add(light);practicalLights.push(light)}
 // Solid extruded letter shapes, built without a flat label over the facade.
 function letterShape(letter){const s=new T.Shape(),poly=points=>{s.moveTo(...points[0]);for(const p of points.slice(1))s.lineTo(...p);s.closePath()};if(letter==='E')poly([[0,0],[.63,0],[.63,.17],[.19,.17],[.19,.43],[.55,.43],[.55,.60],[.19,.60],[.19,.83],[.63,.83],[.63,1],[0,1]]);if(letter==='T')poly([[.25,0],[.45,0],[.45,.81],[.71,.81],[.71,1],[0,1],[0,.81],[.25,.81]]);if(letter==='X')poly([[0,0],[.22,0],[.36,.34],[.53,0],[.76,0],[.49,.51],[.74,1],[.53,1],[.37,.67],[.22,1],[0,1],[.25,.50]]);if(letter==='O'){s.absellipse(.36,.5,.36,.5,0,Math.PI*2,false);const hole=new T.Path();hole.absellipse(.36,.5,.17,.31,0,Math.PI*2,true);s.holes.push(hole)}if(letter==='C'){const pts=[];for(let i=0;i<=32;i++){const a=(42+i*276/32)*Math.PI/180;pts.push([.36+Math.cos(a)*.36,.5+Math.sin(a)*.5])}for(let i=32;i>=0;i--){const a=(42+i*276/32)*Math.PI/180;pts.push([.36+Math.cos(a)*.17,.5+Math.sin(a)*.30])}poly(pts)}return s}
 const letterMat=new T.MeshStandardMaterial({color:'#146451',roughness:.34,metalness:.45});
 function cetox(parent,scale=1){const g=new T.Group();let xx=0;for(const l of 'CETOX'){const mesh=new T.Mesh(new T.ExtrudeGeometry(letterShape(l),{depth:.13,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.014,bevelThickness:.012,curveSegments:20}),letterMat);mesh.position.x=xx;mesh.castShadow=true;g.add(mesh);xx+=(l==='E'?.75:.83)}g.scale.setScalar(scale);parent.add(g);return g}
 const frontSign=cetox(architecture,.90);frontSign.position.set(-4.12,10.62,.255);const sideSign=cetox(architecture,.80);sideSign.rotation.y=-Math.PI/2;sideSign.position.set(-5.145,26.7,-6.8);
 const ringMat=new T.MeshStandardMaterial({color:'#ccd6cf',roughness:.7,metalness:.15});for(const r of [1.05,.76,.40]){const ring=new T.Mesh(new T.TorusGeometry(r,.065,8,64),ringMat);ring.rotation.y=Math.PI/2;ring.position.set(-5.16,27.35,-3);architecture.add(ring)}
 function label(text,w,h,color='#e6ebe4',font='700 100px Arial'){const c=document.createElement('canvas');c.width=1024;c.height=256;const x=c.getContext('2d');x.font=font;x.fillStyle=color;x.textAlign='center';x.textBaseline='middle';x.fillText(text,512,138,990);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;return new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:t,transparent:true,depthWrite:false}))}
 const gateSign=label('CETOX',1.15,.30);gateSign.position.set(.75,3.16,4.045);architecture.add(gateSign);
 // Restrained street context, modeled to support the real frontage.
 box('Vereda',[0,-.13,-1.5],[45,.24,16],'curb',context);box('Sardinel',[0,-.08,6.5],[90,.32,.30],'curb',context);for(let x=-21;x<22;x+=2)box('Junta de vereda',[x,-.002,2],[.012,.01,8.7],'inside',context);
 box('Vecino izquierdo',[-10.2,2.55,-6.8],[9.5,5.1,14.6],'neighbor',context);box('Pretil vecino izquierdo',[-10.2,5.16,-6.8],[9.7,.20,14.9],'neighbor2',context);box('Vecino derecho',[10.1,2.32,-6],[9.1,4.64,14.8],'neighbor2',context);box('Pretil vecino derecho',[10.1,4.76,-6],[9.3,.19,15],'neighbor2',context);
 for(const x of [-12.5,-9.5,-7.0,7.5,10.3,13.2]){box('Hueco vecino',[x,2.65,1.48],[1.4,1.7,.09],'darkglass',context);for(const xx of [x-.72,x+.72])box('Marco vecino',[xx,2.65,1.54],[.05,1.8,.06],'white',context)}
 for(let i=0;i<14;i++){const x=i<7?-26-(i%7)*9:26+(i%7)*9,h=4+random()*10,z=-14-random()*20;box('Volumen urbano distante',[x,h/2,z],[6+random()*4,h,8+random()*9],'neighbor',context)}
 beam('Poste de calle',[-15,0,5.3],[-15,12,5.1],.15,'concrete',context);beam('Brazo de calle',[-15,11.5,5.1],[-12.8,11.7,5.3],.08,'rail',context);box('Luminaria vial',[-12.8,11.65,5.3],[.6,.12,.23],'lamp',context);const streetLight=new T.SpotLight('#ffc891',34,28,.62,.8,1.3);streetLight.position.set(-12.8,11.5,5.3);streetLight.target.position.set(-9,0,12);scene.add(streetLight,streetLight.target);
 const wireMaterial=new T.MeshStandardMaterial({color:'#14212b',roughness:.7});for(let k=0;k<7;k++){const y=6.7+k*.20,curve=new T.CatmullRomCurve3([new T.Vector3(-38,y+.8,5.2),new T.Vector3(-4,y-.15,5.2),new T.Vector3(34,y+.7,5.2)]);const mesh=new T.Mesh(new T.TubeGeometry(curve,24,.009,4,false),wireMaterial);mesh.visible=false;context.add(mesh)}
 for(const x of [-6.9,7.1]){box('Jardinera',[x,.36,2.7],[.95,.72,.95],'planter',context);beam('Tronco ornamental',[x,.7,2.7],[x,1.8,2.7],.09,'trunk',context);for(let k=0;k<7;k++){const leaf=new T.Mesh(new T.IcosahedronGeometry(.56,1),mat.plant);leaf.position.set(x+Math.cos(k*2.4)*.27,1.5+k*.08,2.7+Math.sin(k*2.4)*.27);context.add(leaf)}}
 const car=new T.Group();car.position.set(11,0,10);car.rotation.y=.15;context.add(car);box('Carrocería auto',[0,.65,0],[4.4,.65,1.83],'car',car);box('Cabina auto',[0,1.12,0],[2.3,.64,1.7],'darkglass',car);for(const x of [-1.44,1.4])for(const z of [-.9,.9]){const wheel=new T.Mesh(new T.CylinderGeometry(.34,.34,.2,20),mat.tire);wheel.rotation.x=Math.PI/2;wheel.position.set(x,.34,z);car.add(wheel);const rim=new T.Mesh(new T.CylinderGeometry(.2,.2,.22,12),mat.silver);rim.rotation.x=Math.PI/2;rim.position.copy(wheel.position);car.add(rim)}for(const z of [-.6,.6])box('Faro auto',[2.22,.72,z],[.025,.17,.37],'carLight',car);
 // Flush every repeated architectural component into instanced draws.
 const matrix=new T.Matrix4();for(const collections of [batches,cylinders])for(const {m,parent,items}of collections.values()){const mesh=new T.InstancedMesh(collections===batches?boxGeometry:cylinderGeometry,mat[m],items.length);for(let i=0;i<items.length;i++){const it=items[i];matrix.compose(new T.Vector3(...it.p),it.rotation?new T.Quaternion(...it.rotation):new T.Quaternion(),new T.Vector3(...it.size));mesh.setMatrixAt(i,matrix)}mesh.castShadow=!['glass','lamp','roomLamp'].includes(m);mesh.receiveShadow=parent!==context&&m!=='glass';mesh.frustumCulled=false;parent.add(mesh)}
 // Soft overhead light preserves architectural depth; warm practicals anchor the street.
 const hemi=new T.HemisphereLight('#9fc5eb','#1c2528',.68);scene.add(hemi);const key=new T.DirectionalLight('#b8d3f1',1.05);key.position.set(-19,42,27);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-25,right:25,top:38,bottom:-13,near:1,far:100});key.shadow.bias=-.0008;key.shadow.normalBias=.03;key.target.position.set(0,12,-4);scene.add(key,key.target);const rim=new T.DirectionalLight('#3d6f9e',.75);rim.position.set(20,32,-17);scene.add(rim);
 const washes=[];for(const x of [-4.72,.50,2.73,4.76]){const spot=new T.SpotLight('#ffd39a',16,32,.25,.9,1.25);spot.position.set(x,.42,.8);spot.target.position.set(x,15,-.05);scene.add(spot,spot.target);washes.push(spot);const base=new T.Mesh(new T.CylinderGeometry(.10,.14,.22,12),mat.frame);base.position.set(x,.13,.80);architecture.add(base)}
 return {scene,architecture,context,decor,mat,env,hemi,key,rim,washes,practicalLights,streetLight,roadTexture,entities,estimated:{width:10,height:29,depth:14,status:'estimated from photographs'},label};
};
