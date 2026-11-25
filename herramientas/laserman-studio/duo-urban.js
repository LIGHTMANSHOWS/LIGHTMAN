import * as THREE from './vendor/three.module.js';
import {GLTFLoader} from './vendor/addons/loaders/GLTFLoader.js';
import {clone} from './vendor/addons/utils/SkeletonUtils.js';
import {createUrbanCostume} from './urban-costume.js?v=1.8.2-apertura';

const V=(x,y,z)=>new THREE.Vector3(x,y,z);
const world=bone=>bone.getWorldPosition(new THREE.Vector3());
function alignBone(bone,child,target){
  const a=world(bone),current=world(child).sub(a).normalize(),desired=target.clone().sub(a).normalize();
  const delta=new THREE.Quaternion().setFromUnitVectors(current,desired),q=bone.getWorldQuaternion(new THREE.Quaternion());
  q.premultiply(delta);bone.quaternion.copy(bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(q));bone.updateWorldMatrix(false,true);
}
function ik(human,side,part,target,pole){
  const b=human.bones,upper=b[side+(part==='arm'?'Arm':'UpLeg')],lower=b[side+(part==='arm'?'ForeArm':'Leg')],end=b[side+(part==='arm'?'Hand':'Foot')];
  const a=world(upper),middle=world(lower),last=world(end),l1=a.distanceTo(middle),l2=middle.distanceTo(last),delta=target.clone().sub(a);
  const d=Math.max(.001,Math.min(delta.length(),l1+l2-.0005)),direction=delta.normalize(),cos=THREE.MathUtils.clamp((l1*l1+d*d-l2*l2)/(2*l1*d),-1,1);
  const poleDirection=pole.clone().sub(a).addScaledVector(direction,-pole.clone().sub(a).dot(direction)).normalize();
  const elbow=a.clone().addScaledVector(direction,l1*cos).addScaledVector(poleDirection,l1*Math.sqrt(1-cos*cos));
  alignBone(upper,lower,elbow);alignBone(lower,end,target);
}

// The original Batucada mannequin, garment shells, head and Urban accessories
// are reused. The jacket patch remains the existing 530-channel timeline.
export function createUrbanLayer(scene){
  const avatars=[],groups=[],cloth=new THREE.MeshStandardMaterial({color:'#11151c',roughness:.95}),rubber=new THREE.MeshStandardMaterial({color:'#06080b',roughness:.82});
  const steel=new THREE.MeshStandardMaterial({color:'#8d9aa4',metalness:.9,roughness:.25});
  let pending=null,ready=false,error=null;
  function mesh(geo,mat,parent,pos){const m=new THREE.Mesh(geo,mat);if(pos)m.position.copy(pos);parent.add(m);return m;}
  function tube(points,r,material,parent){const curve=new THREE.CatmullRomCurve3(points.map(p=>Array.isArray(p)?V(...p):p));return mesh(new THREE.TubeGeometry(curve,Math.max(10,points.length*7),r,7,false),material,parent);}
function garment(a,b,r0,r1){const len=a.distanceTo(b),segments=26,sides=18,pos=[],uv=[],idx=[];for(let j=0;j<=segments;j++){const t=j/segments,r=THREE.MathUtils.lerp(r0,r1,t)*(1+.011*Math.sin(t*17)+.007*Math.sin(t*31));for(let i=0;i<=sides;i++){const ang=i/sides*Math.PI*2,fold=.0009*Math.sin(i*3+t*23);pos.push(Math.cos(ang)*(r+fold),t*len,Math.sin(ang)*(r+fold)*.87);uv.push(i/sides,t);}}
 for(let j=0;j<segments;j++)for(let i=0;i<sides;i++){const n=j*(sides+1)+i;idx.push(n,n+sides+2,n+1,n,n+sides+1,n+sides+2);}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();const obj=new THREE.Mesh(g,cloth);obj.position.copy(a);obj.quaternion.setFromUnitVectors(V(0,1,0),b.clone().sub(a).normalize());obj.castShadow=obj.receiveShadow=true;return obj;}
function shirt(hipY,chestY){const rings=[[hipY-.09,.17,.12],[hipY+.01,.18,.13],[hipY+.16,.19,.135],[chestY-.08,.21,.145],[chestY+.04,.24,.14],[chestY+.11,.21,.12],[chestY+.16,.13,.08],[chestY+.18,.067,.064]],pos=[],uv=[],idx=[],N=36;for(let j=0;j<rings.length;j++){const [y,rx,rz]=rings[j];for(let i=0;i<=N;i++){const a=i/N*Math.PI*2,fold=.0025*Math.sin(a*8+j*1.2);pos.push(Math.cos(a)*(rx+fold),y,Math.sin(a)*(rz+fold)+.006);uv.push(i/N,j/(rings.length-1));}}for(let j=0;j<rings.length-1;j++)for(let i=0;i<N;i++){const n=j*(N+1)+i;idx.push(n,n+N+2,n+1,n,n+N+1,n+N+2);}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();const m=new THREE.Mesh(g,cloth);m.castShadow=m.receiveShadow=true;return m;}
function bind(obj,bone,group){group.add(obj);group.updateMatrixWorld(true);bone.attach(obj);return obj;}

  async function load(){
    if(pending)return pending;
    pending=(async()=>{
      const loader=new GLTFLoader(),textures=new THREE.TextureLoader();
      const [body,head,diffuse,normal]=await Promise.all([
        loader.loadAsync('assets/urban-performer.glb'),loader.loadAsync('assets/urban-head.glb'),
        textures.loadAsync('assets/urban-face-color.jpg'),textures.loadAsync('assets/urban-face-normal.jpg')]);
      const source=body.scene;source.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(source),height=bounds.max.y-bounds.min.y;
      let originalHead;head.scene.traverse(o=>{if(o.isMesh)originalHead=o;});const headGeometry=originalHead.geometry.clone(),hp=headGeometry.attributes.position,old=headGeometry.index.array,keep=[];
      for(let i=0;i<old.length;i+=3)if(hp.getY(old[i])>-1.4&&hp.getY(old[i+1])>-1.4&&hp.getY(old[i+2])>-1.4)keep.push(old[i],old[i+1],old[i+2]);
      headGeometry.setIndex(keep);for(let i=0;i<hp.count;i++)hp.setXYZ(i,hp.getX(i)*.055,(hp.getY(i)-1.6)*.055,(hp.getZ(i)-.3)*.055);hp.needsUpdate=true;headGeometry.computeBoundingSphere();
      diffuse.colorSpace=THREE.SRGBColorSpace;const skinMaterial=new THREE.MeshStandardMaterial({map:diffuse,color:'#cbb29c',normalMap:normal,normalScale:new THREE.Vector2(.55,.55),roughness:.78});
      // Same clothed-body preparation as Batucada: retain the skinned gloves.
      source.traverse(o=>{if(!o.isSkinnedMesh)return;const geo=o.geometry.clone(),si=geo.attributes.skinIndex,sw=geo.attributes.skinWeight,ids=geo.index?.array;if(!ids)return;
        const handIds=new Set(o.skeleton.bones.map((b,i)=>/Hand/.test(b.name)?i:-1).filter(i=>i>=0));
        const isHand=i=>{let total=0;for(let k=0;k<4;k++)if(handIds.has(si.array[i*4+k]))total+=sw.array[i*4+k];return total>.45;};
        const keep=[];for(let i=0;i<ids.length;i+=3)if(Number(isHand(ids[i]))+Number(isHand(ids[i+1]))+Number(isHand(ids[i+2]))>=2)keep.push(ids[i],ids[i+1],ids[i+2]);geo.setIndex(keep);o.geometry=geo;});
      for(let index=0;index<2;index++){
        const group=new THREE.Group();group.visible=false;scene.add(group);groups.push(group);
        const model=clone(source);group.add(model);model.scale.multiplyScalar(1.79/height);model.position.y-=bounds.min.y*1.79/height;group.updateMatrixWorld(true);
        model.traverse(o=>{if(o.isMesh)o.material=cloth;});
        const bones={};model.traverse(o=>{if(o.isBone)bones[o.name.replace('mixamorig','').replace(':','')]=o;});
        const headPos=world(bones.Head),hipPos=world(bones.Hips),chestPos=world(bones.Spine2),strips=[];
        const green=new THREE.MeshStandardMaterial({color:'#002d00',emissive:'#00ff00',emissiveIntensity:1.2,roughness:.4});
        const white=new THREE.MeshStandardMaterial({color:'#8c999b',emissive:'#dce9ec',emissiveIntensity:.7,roughness:.4});
        function ledStrip(points,mat,parent,bone,width=.024){
          const curve=new THREE.CatmullRomCurve3(points),n=Math.max(2,Math.ceil(curve.getLength()/.018)),holder=new THREE.Group();tube(points,.009,rubber,holder);
          const inst=new THREE.InstancedMesh(new THREE.BoxGeometry(width,.011,.007),new THREE.MeshBasicMaterial({color:'#ffffff',toneMapped:false}),n+1),o=new THREE.Object3D();
          for(let i=0;i<=n;i++){const point=curve.getPoint(i/n);o.position.copy(point).add(V(0,0,.011));o.quaternion.setFromUnitVectors(V(0,1,0),curve.getTangent(i/n));o.updateMatrix();inst.setMatrixAt(i,o.matrix);inst.setColorAt(i,new THREE.Color('#00ff00'));}
          inst.instanceColor.setUsage(THREE.DynamicDrawUsage);holder.add(inst);strips.push({inst,count:n+1,bone:bone.name,side:points[0].x>=0?'Right':'Left'});return bind(holder,bone,parent);
        }
        for(const side of ['Left','Right']){
          for(const [a,b,r0,r1] of [['Arm','ForeArm',.077,.062],['ForeArm','Hand',.062,.04],['UpLeg','Leg',.108,.088],['Leg','Foot',.088,.053]])bind(garment(world(bones[side+a]),world(bones[side+b]),r0,r1),bones[side+a],group);
          for(const [joint,rx,ry,rz]of [['Arm',.078,.077,.072],['Leg',.083,.095,.078],['ForeArm',.06,.066,.056]]){const cover=mesh(new THREE.SphereGeometry(1,16,12),cloth,new THREE.Group());cover.scale.set(rx,ry,rz);cover.position.copy(world(bones[side+joint]));bind(cover,bones[side+joint],group);}
          const foot=world(bones[side+'Foot']),shoe=new THREE.Group();mesh(new THREE.SphereGeometry(1,16,12),rubber,shoe).scale.set(.065,.055,.145);shoe.position.copy(foot).add(V(0,-.008,.045));bind(shoe,bones[side+'Foot'],group);
          for(const [a,b,r]of [['UpLeg','Leg',.093],['Leg','Foot',.066]]){const start=world(bones[side+a]),end=world(bones[side+b]),sign=start.x>=0?1:-1;ledStrip([start.clone().lerp(end,.15).add(V(sign*r*.6,0,r*.9)),start.clone().lerp(end,.45).add(V(sign*r*.6,0,r*.9)),start.clone().lerp(end,.9).add(V(sign*r*.6,0,r*.9))],green,group,bones[side+a],.018);}
        }
        bind(shirt(hipPos.y,chestPos.y),bones.Spine2,group);
        const waist=mesh(new THREE.SphereGeometry(1,20,16),cloth,new THREE.Group());waist.scale.set(.19,.16,.14);waist.position.set(0,hipPos.y-.085,.005);bind(waist,bones.Hips,group);
        createUrbanCostume({group,bones,hipPos,chestPos,headPos,bind,mesh,tube,ledStrip,cloth,rubber,steel,green,orange:white,headGeometry,skinMaterial});
        const rest=Object.fromEntries(Object.entries(bones).map(([key,b])=>[key,{q:b.quaternion.clone(),p:b.position.clone()}]));
        avatars.push({group,model,bones,rest,strips,green,white,signs:Object.fromEntries(['Left','Right'].map(side=>[side,Math.sign(world(bones[side+'Arm']).x)||1]))});
      }
      ready=true;
    })().catch(e=>{error=e;throw e;});return pending;
  }
  const color=new THREE.Color(),delta=new THREE.Quaternion();
  function update(controllers,fixture,buffer){
    const zones=new Map(fixture.zones.map(z=>[z.name,z]));
    for(let index=0;index<avatars.length;index++){
      const a=avatars[index],controller=controllers[index],rig=controller.rig;
      a.group.position.copy(controller.group.position);a.group.quaternion.copy(controller.group.quaternion);
      for(const [key,rest]of Object.entries(a.rest)){a.bones[key].quaternion.copy(rest.q);a.bones[key].position.copy(rest.p);}
      a.bones.Spine2.quaternion.premultiply(delta.setFromEuler(rig.joints.body.node.rotation));a.group.updateMatrixWorld(true);
      for(const side of ['Left','Right']){
        const sign=a.signs[side],arm=rig.joints[sign>0?'rightArm':'leftArm'],leg=rig.joints[sign>0?'rightLeg':'leftLeg'];
        const target=(p,joint)=>V(...p).applyMatrix4(joint.deform).applyMatrix4(a.group.matrixWorld);
        ik(a,side,'arm',target([sign*.56,1.10,.08],arm),target([sign*.55,1.2,-.25],arm));
        ik(a,side,'leg',target([sign*.16,.09,.06],leg),target([sign*.17,.6,.6],leg));
      }
      for(const strip of a.strips){
        const zone=zones.get(/Leg/.test(strip.bone)?'Leg'+strip.side:'MBody'+strip.side+'Up');
        for(let j=0;j<strip.count;j++){const k=((zone?.start||0)+Math.min((zone?.count||1)-1,Math.floor(j/strip.count*(zone?.count||1))))*3;strip.inst.setColorAt(j,color.setRGB(buffer[k]/255,buffer[k+1]/255,buffer[k+2]/255,THREE.SRGBColorSpace));}
        strip.inst.instanceColor.needsUpdate=true;
      }
      const head=zones.get('Head Right');let r=0,g=0,b=0;
      for(let j=0;j<head.count;j++){const k=(head.start+j)*3;r+=buffer[k];g+=buffer[k+1];b+=buffer[k+2];}
      color.setRGB(r/head.count/255,g/head.count/255,b/head.count/255,THREE.SRGBColorSpace);a.green.color.copy(color);a.green.emissive.copy(color);
      a.group.updateMatrixWorld(true);
    }
  }
  return {load,update,avatars,groups,get ready(){return ready;},get error(){return error;}};
}
