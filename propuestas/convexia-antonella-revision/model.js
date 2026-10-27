(function(scope){
  const T=scope.THREE;
  const defaults={width:4.2,height:2.5,count:8,gap:0.5,tone:'warm',environment:'day',portico:true,human:true,dimensions:true};
  const tones={warm:0xffc47a,neutral:0xfff3dc,cool:0xc3e9ff};
  function material(color,extra={}){return new T.MeshStandardMaterial({color,roughness:.65,metalness:.15,...extra});}
  function box(root,name,w,h,d,x,y,z,mat){const m=new T.Mesh(new T.BoxGeometry(w,h,d),mat);m.name=name;m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;root.add(m);return m;}
  function rod(root,name,a,b,r,mat){const p=new T.Vector3(...a),q=new T.Vector3(...b),v=q.clone().sub(p);const m=new T.Mesh(new T.CylinderGeometry(r,r,v.length(),12),mat);m.name=name;m.position.copy(p.add(q).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());m.castShadow=true;root.add(m);return m;}
  function makeModel(s){
    const root=new T.Group();root.name='LIGHTMAN_Convexia_estudio_conceptual';root.userData={units:'metres',status:'conceptual',settings:s};
    const arches=new T.Group();arches.name='Arcos_LED_y_soportes_propuestos';root.add(arches);
    const dark=material(0x29373b,{roughness:.85});const led=material(tones[s.tone],{emissive:tones[s.tone],emissiveIntensity:s.environment==='day'?.65:1.8,roughness:.2,metalness:0});
    const points=[[-s.width/2,0],[-s.width*.32,s.height],[s.width*.32,s.height],[s.width/2,0]];
    for(let i=0;i<s.count;i++){
      const z=-.55-i*s.gap;const group=new T.Group();group.name='Arco_'+String(i+1).padStart(2,'0');arches.add(group);
      for(let j=0;j<3;j++){
        const a=[...points[j],z],b=[...points[j+1],z];rod(group,'Soporte_referencial',a,b,.022,dark);rod(group,'Difusor_LED_luz_fija',[a[0],a[1],z+.035],[b[0],b[1],z+.035],.017,led);
      }
      for(const x of [-s.width/2,s.width/2])box(group,'Base_esquematica_sujecion_por_validar',.3,.025,.42,x,.0125,z,dark);
    }
    if(s.portico){
      const context=new T.Group();context.name='Portico_cliente_contexto_NO_suministro';root.add(context);
      const poly=[[-3.6,0],[-3.6,2.8],[-2.1,3.7],[2.1,3.7],[3.6,2.8],[3.6,0],[2.1,0],[1.35,2.5],[-1.35,2.5],[-2.1,0]];
      const shape=new T.Shape();poly.forEach((p,i)=>i?shape.lineTo(...p):shape.moveTo(...p));shape.closePath();
      const body=new T.Mesh(new T.ExtrudeGeometry(shape,{depth:.27,bevelEnabled:false}),material(0xdfd4e1,{metalness:.3,roughness:.38}));body.name='Volumen_de_referencia_7p2_x_3p7m';body.castShadow=true;context.add(body);
      // Facets are a schematic interpretation of the supplied iridescent cladding.
      function facet(vertices,color){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices.flatMap(p=>[p[0],p[1],.279]),3));g.computeVertexNormals();const m=new T.Mesh(g,material(color,{side:T.DoubleSide,roughness:.28,metalness:.36}));m.name='Faceta_de_contexto';context.add(m);}
      const palette=[0xcfcde5,0xe9cbd5,0xf0dec6,0xbfdcdd,0xe6dcec,0xf7e9d9];
      for(const side of [-1,1]){
        const a=[side*3.6,0],b=[side*2.1,0],c=[side*1.35,2.5],d=[side*2.1,3.7],e=[side*3.6,2.8],p=[side*2.7,1.35],q=[side*2.7,2.8];
        [[a,b,p],[b,c,p],[c,q,p],[c,d,q],[d,e,q],[e,a,p],[e,p,q]].forEach((v,i)=>facet(v,palette[(i+(side===1?2:0))%palette.length]));
      }
      facet([[-2.1,3.7],[-1.35,2.5],[0,3.2]],0xf0dce2);facet([[-2.1,3.7],[0,3.2],[2.1,3.7]],0xe9dce2);facet([[2.1,3.7],[0,3.2],[1.35,2.5]],0xd7dfeb);facet([[-1.35,2.5],[1.35,2.5],[0,3.2]],0xebd1cf);
      box(context,'Cartel_referencial',2.7,.71,.035,0,3.17,.32,material(0xf5ede1,{roughness:.9,metalness:0}));
    }
    if(s.human){
      const human=new T.Group();human.name='Escala_humana_1p75m';root.add(human);human.position.set(.6,0,-2.5);const clothes=material(0x758a8d,{metalness:0}),skin=material(0xc7b49b,{metalness:0});
      rod(human,'Pierna_I',[-.1,.08,0],[-.09,.85,0],.075,clothes);rod(human,'Pierna_D',[.1,.08,.08],[.09,.85,0],.075,clothes);
      box(human,'Torso',.39,.5,.22,0,1.07,0,clothes);rod(human,'Brazo_I',[-.23,1.29,0],[-.27,.85,0],.045,skin);rod(human,'Brazo_D',[.23,1.29,0],[.27,.85,0],.045,skin);
      const head=new T.Mesh(new T.SphereGeometry(.13,16,12),skin);head.name='Cabeza';head.scale.y=1.2;head.position.y=1.594;human.add(head);
    }
    return root;
  }
  function quantities(s){const top=s.width*.64;const side=Math.hypot(s.height,(s.width-top)/2);return {top,side,perArch:2*side+top,total:s.count*(2*side+top),depth:(s.count-1)*s.gap};}
  function exportGLB(root,settings){
    root.updateMatrixWorld(true);let offset=0;const chunks=[],bufferViews=[],accessors=[],meshes=[],nodes=[],materials=[];const materialMap=new Map();
    function addArray(array,type,componentType,count,bounds){const pad=(4-offset%4)%4;if(pad){chunks.push(new Uint8Array(pad));offset+=pad;}const bytes=new Uint8Array(array.buffer,array.byteOffset,array.byteLength);const index=bufferViews.length;bufferViews.push({buffer:0,byteOffset:offset,byteLength:bytes.length});chunks.push(bytes);offset+=bytes.length;accessors.push({bufferView:index,componentType,count,type,...bounds});return accessors.length-1;}
    root.traverse(mesh=>{if(!mesh.isMesh||Array.isArray(mesh.material))return;const g=mesh.geometry.clone();g.applyMatrix4(mesh.matrixWorld);const p=g.getAttribute('position'),n=g.getAttribute('normal');g.computeBoundingBox();const pos=addArray(new Float32Array(p.array),'VEC3',5126,p.count,{min:g.boundingBox.min.toArray(),max:g.boundingBox.max.toArray()});const attrs={POSITION:pos};if(n)attrs.NORMAL=addArray(new Float32Array(n.array),'VEC3',5126,n.count);
      const prim={attributes:attrs};if(g.index)prim.indices=addArray(new Uint32Array(g.index.array),'SCALAR',5125,g.index.count);
      const m=mesh.material;if(!materialMap.has(m.uuid)){materialMap.set(m.uuid,materials.length);materials.push({name:m.name||'Material',pbrMetallicRoughness:{baseColorFactor:[m.color.r,m.color.g,m.color.b,1],metallicFactor:m.metalness??0,roughnessFactor:m.roughness??.7},emissiveFactor:m.emissive?m.emissive.toArray().map(v=>Math.min(1,v*(m.emissiveIntensity??1))):[0,0,0],doubleSided:m.side===T.DoubleSide});}prim.material=materialMap.get(m.uuid);meshes.push({name:mesh.name,primitives:[prim]});nodes.push({name:mesh.name,mesh:meshes.length-1});g.dispose();
    });
    const doc={asset:{version:'2.0',generator:'LIGHTMAN · Convexia estudio v02'},scene:0,scenes:[{nodes:nodes.map((_,i)=>i),extras:{units:'metres',conceptual:true,settings,notes:'Pórtico de contexto. 8 arcos y separación aproximada de 0.50 m confirmados. Geometría, separación entre ejes y fijaciones por validar.'}}],nodes,meshes,materials,accessors,bufferViews,buffers:[{byteLength:offset}]};
    let json=new TextEncoder().encode(JSON.stringify(doc));const jlen=Math.ceil(json.length/4)*4,blen=Math.ceil(offset/4)*4,total=12+8+jlen+8+blen;const out=new Uint8Array(total);const dv=new DataView(out.buffer);dv.setUint32(0,0x46546c67,true);dv.setUint32(4,2,true);dv.setUint32(8,total,true);dv.setUint32(12,jlen,true);dv.setUint32(16,0x4e4f534a,true);out.fill(32,20,20+jlen);out.set(json,20);dv.setUint32(20+jlen,blen,true);dv.setUint32(24+jlen,0x004e4942,true);let cursor=28+jlen;for(const c of chunks){out.set(c,cursor);cursor+=c.length;}return out;
  }
  function quote(s,rate=50){const q=quantities(s),metres=Math.round(q.total*100)/100,subtotal=Math.round(metres*rate*100)/100,igv=Math.round(subtotal*18)/100;return {...q,metres,rate,subtotal,igv,totalPrice:Math.round((subtotal+igv)*100)/100};}
  scope.Convexia={defaults,makeModel,quantities,exportGLB,quote};
})(typeof window!=='undefined'?window:globalThis);
