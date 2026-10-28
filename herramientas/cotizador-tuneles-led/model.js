(function(scope){
 const T=scope.THREE,TUBE=1.2;
 const defaults={shape:'hexagon',modules:1,widthModules:3,count:8,gap:.5,tone:'cyan',environment:'night',effect:'rainbow',speed:1,brightness:1,human:true,dimensions:true};
 const names={hexagon:'Hexagonal',square:'Cuadrado',triangle:'Triangular',rectangle:'Rectangular'};
 function profile(s){
  const a=s.modules*TUBE,w=s.widthModules*TUBE;
  if(s.shape==='triangle')return [[-a/2,0],[0,a*Math.sqrt(3)/2],[a/2,0]];
  if(s.shape==='hexagon')return [[-a/2,0],[-a,a*Math.sqrt(3)/2],[-a/2,a*Math.sqrt(3)],[a/2,a*Math.sqrt(3)],[a,a*Math.sqrt(3)/2],[a/2,0]];
  const width=s.shape==='rectangle'?w:a;
  return [[-width/2,0],[-width/2,a],[width/2,a],[width/2,0]];
 }
 function quantities(s){
  const points=profile(s),width=Math.max(...points.map(p=>p[0]))-Math.min(...points.map(p=>p[0])),height=Math.max(...points.map(p=>p[1]));
  const edges=points.slice(1).map((b,i)=>{const a=points[i],length=Math.hypot(b[0]-a[0],b[1]-a[1]);return {a,b,length,tubes:Math.round(length/TUBE)};});
  const perFrame=edges.reduce((v,e)=>v+e.tubes,0),tubes=perFrame*s.count;
  return {points,edges,width,height,footprint:Math.abs(points.at(-1)[0]-points[0][0]),perFrame,tubes,total:Math.round(tubes*TUBE*100)/100,depth:Math.round((s.count-1)*s.gap*100)/100,junctionsPerFrame:perFrame-1};
 }
 function quote(s,rate){const q=quantities(s),subtotal=Math.round(q.total*rate*100)/100,igv=Math.round(subtotal*18)/100;return {...q,rate,subtotal,igv,totalPrice:Math.round((subtotal+igv)*100)/100};}
 function rod(root,name,a,b,r,mat){const p=new T.Vector3(...a),q=new T.Vector3(...b),v=q.clone().sub(p),m=new T.Mesh(new T.CylinderGeometry(r,r,v.length(),8),mat);m.name=name;m.position.copy(p.add(q).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());root.add(m);return m;}
 function makeModel(s){
  const root=new T.Group(),q=quantities(s);root.name='LIGHTMAN_Tunel_'+s.shape;
  const support=new T.MeshStandardMaterial({color:0x364052,metalness:.5,roughness:.5});
  for(let i=0;i<s.count;i++){
   const group=new T.Group();group.name='Marco_'+(i+1);root.add(group);const z=-.55-i*s.gap;
   q.edges.forEach((e,j)=>{
    rod(group,'Estructura', [...e.a,z],[...e.b,z],.025,support);
    for(let k=0;k<e.tubes;k++){
     // Each separated luminous segment is one complete 1.20 m tube; dark gaps depict joints.
     const point=t=>[e.a[0]+(e.b[0]-e.a[0])*t,e.a[1]+(e.b[1]-e.a[1])*t,z+.04];
     const a=point((k+.008)/e.tubes),b=point((k+1-.008)/e.tubes);
     const core=rod(group,'Tubo_LED_1p20m',a,b,.018,new T.MeshBasicMaterial({color:0x27dfff,toneMapped:false}));core.userData.led={arch:i,edge:j};
     const halo=rod(group,'Halo',a,b,.065,new T.MeshBasicMaterial({color:0x27dfff,transparent:true,opacity:.13,toneMapped:false,blending:T.AdditiveBlending,depthWrite:false}));halo.userData.glow={arch:i,edge:j};
    }
   });
   for(const p of [q.points[0],q.points.at(-1)]){const base=new T.Mesh(new T.BoxGeometry(.32,.025,.40),support);base.name='Base_referencial';base.position.set(p[0],.0125,z);group.add(base);}
  }
  if(s.human){
   const h=new T.Group();root.add(h);h.position.set(0,0,-.55-q.depth*.5);
   const mat=new T.MeshStandardMaterial({color:0x9eacba,roughness:.8});
   rod(h,'Pierna',[-.1,.08,0],[-.1,.85,0],.065,mat);rod(h,'Pierna',[.1,.08,0],[.1,.85,0],.065,mat);
   const torso=new T.Mesh(new T.BoxGeometry(.36,.48,.2),mat);torso.position.y=1.08;h.add(torso);
   rod(h,'Brazo',[-.22,1.28,0],[-.25,.85,0],.045,mat);rod(h,'Brazo',[.22,1.28,0],[.25,.85,0],.045,mat);
   const head=new T.Mesh(new T.SphereGeometry(.13,12,8),mat);head.scale.y=1.2;head.position.y=1.594;h.add(head);
  }
  return root;
 }
 scope.Tunnel={TUBE,defaults,names,profile,quantities,quote,makeModel};
})(typeof window!=='undefined'?window:globalThis);
