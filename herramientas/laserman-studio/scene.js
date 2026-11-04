import * as THREE from './vendor/three.module.js';
import {OrbitControls} from './vendor/addons/controls/OrbitControls.js';
import {activeCue,trackEnabled,laserFrame} from './engine.js';
import {sampleFrame} from './laser.js';

import {jacketPixels} from './jacket.js';

export function createScene(canvas,fixture){
  const scene=new THREE.Scene();scene.background=new THREE.Color('#080b12');scene.fog=new THREE.Fog('#080b12',13,32);
  const camera=new THREE.PerspectiveCamera(39,1,.05,70);camera.position.set(4.8,3.5,7.3);
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;
  const controls=new OrbitControls(camera,canvas);controls.target.set(0,1.9,0);controls.enableDamping=true;controls.minDistance=3;controls.maxDistance=24;controls.maxPolarAngle=Math.PI*.49;
  scene.add(new THREE.HemisphereLight('#9cbbff','#181c23',1.5));
  const light=new THREE.DirectionalLight('#abc4ff',2.7);light.position.set(0,7,5);scene.add(light);
  const rim=new THREE.DirectionalLight('#9d66f3',1.2);rim.position.set(-5,3,-4);scene.add(rim);
  const cloth=new THREE.MeshStandardMaterial({color:'#10131b',roughness:.94,metalness:.04});
  const shadow=new THREE.MeshStandardMaterial({color:'#020305',roughness:1});
  const metal=new THREE.MeshStandardMaterial({color:'#313e52',roughness:.6,metalness:.6});
  const floor=new THREE.Mesh(new THREE.BoxGeometry(10,.14,6),new THREE.MeshStandardMaterial({color:'#101620',roughness:.8}));floor.position.y=-.1;scene.add(floor);
  const grid=new THREE.GridHelper(10,20,'#2d3850','#192333');grid.position.y=.001;scene.add(grid);
  const rig=new THREE.Group();scene.add(rig);
  const cube=(parent,w,h,d,x,y,z,mat=cloth)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);parent.add(m);return m;};
  function rod(parent,a,b,r,mat=metal){const v=new THREE.Vector3(...a),end=new THREE.Vector3(...b),axis=end.clone().sub(v);const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,axis.length(),10),mat);m.position.copy(v.add(end).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),axis.normalize());parent.add(m);return m;}
  for(const z of [-.4,-.2])rod(rig,[-4.3,4,z],[4.3,4,z],.035);
  for(const x of [-4.3,4.3]){rod(rig,[x,0,-.3],[x,4,-.3],.035);cube(rig,.5,.07,.5,x,0,-.3,metal);}
  const actors=[],lasers=[],points=jacketPixels(fixture),matrix=new THREE.Matrix4(),color=new THREE.Color();
  for(let i=0;i<3;i++){
    const group=new THREE.Group();group.position.x=(i-1)*2.4;scene.add(group);
    const torso=new THREE.Mesh(new THREE.CylinderGeometry(.245,.21,.58,12),cloth);torso.scale.z=.68;torso.position.y=1.22;group.add(torso);
    cube(group,.39,.17,.25,0,.92,0);
    const hood=new THREE.Mesh(new THREE.SphereGeometry(.185,18,14),cloth);hood.scale.set(.92,1.16,.95);hood.position.set(0,1.63,.015);group.add(hood);
    const face=new THREE.Mesh(new THREE.SphereGeometry(.125,16,12),shadow);face.scale.set(1,1.14,.32);face.position.set(0,1.63,.173);group.add(face);
    cube(group,.24,.085,.045,0,1.575,.17,cloth);
    for(const sign of [-1,1]){
      rod(group,[sign*.22,1.43,0],[sign*.38,1.22,.04],.075,cloth);
      rod(group,[sign*.38,1.22,.04],[sign*.55,1.11,.08],.065,cloth);
      cube(group,.085,.11,.11,sign*.56,1.10,.08,shadow);
      rod(group,[sign*.115,.92,0],[sign*.14,.56,.015],.105,cloth);
      rod(group,[sign*.14,.56,.015],[sign*.16,.17,.045],.078,cloth);
      cube(group,.18,.115,.3,sign*.16,.09,.12,shadow);
      cube(group,.025,.11,.045,sign*.56,1.19,.1,metal);
    }
    const ledMat=new THREE.MeshBasicMaterial({color:0xffffff,toneMapped:false});
    const leds=new THREE.InstancedMesh(new THREE.SphereGeometry(.012,5,4),ledMat,points.length);
    points.forEach((p,j)=>{matrix.makeTranslation(...p);leds.setMatrixAt(j,matrix);leds.setColorAt(j,color.set('#000000'));});
    leds.instanceColor.setUsage(THREE.DynamicDrawUsage);group.add(leds);
    const glow=new THREE.InstancedMesh(new THREE.SphereGeometry(.026,4,3),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.15,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}),points.length);
    glow.instanceMatrix=leds.instanceMatrix;glow.instanceColor=leds.instanceColor;group.add(glow);
    const hands=['left','right'].map((side,j)=>{
      const geometry=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3((j?1:-1)*.56,1.23,.1),new THREE.Vector3((j?1:-1)*.56,4.6,.1)]);
      const beam=new THREE.Line(geometry,new THREE.LineBasicMaterial({color:'#00e5ff',transparent:true,opacity:.95,toneMapped:false}));group.add(beam);
      return beam;
    });
    actors.push({group,leds,hands});
    const head=cube(scene,.32,.2,.3,(i-1)*2.4,3.84,-.3,metal);
    const geometry=new THREE.BufferGeometry(),pathGeo=new THREE.BufferGeometry();
    const beam=new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({color:'#ffffff',vertexColors:true,transparent:true,opacity:.16,depthWrite:false,toneMapped:false}));
    const path=new THREE.LineSegments(pathGeo,new THREE.LineBasicMaterial({color:'#ffffff',vertexColors:true,transparent:true,opacity:.95,toneMapped:false}));scene.add(beam,path);
    lasers.push({head,beam,path});
  }
  const labelCanvas=document.createElement('canvas');labelCanvas.width=512;labelCanvas.height=96;const ctx=labelCanvas.getContext('2d');ctx.fillStyle='#7794b6';ctx.font='600 28px sans-serif';ctx.textAlign='center';ctx.fillText('L I G H T M A N  /  L A S E R M A N',256,54);const sign=new THREE.Mesh(new THREE.PlaneGeometry(5.5,1),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(labelCanvas),transparent:true}));sign.position.set(0,2.9,-2.85);scene.add(sign);
  let width=0,height=0,lastTime=NaN,lastRevision=-1,needsRender=true;const world=[];
  const stats={renders:0,simulationUpdates:0,bufferAllocations:0};
  function updateLine(line,positions,colors){
    const count=positions.length/3;
    let position=line.geometry.getAttribute('position'),rgb=line.geometry.getAttribute('color');
    if(!position||position.count<count){
      const capacity=2**Math.ceil(Math.log2(Math.max(256,count)));
      position=new THREE.BufferAttribute(new Float32Array(capacity*3),3).setUsage(THREE.DynamicDrawUsage);
      rgb=new THREE.BufferAttribute(new Float32Array(capacity*3),3).setUsage(THREE.DynamicDrawUsage);
      line.geometry.setAttribute('position',position);line.geometry.setAttribute('color',rgb);line.frustumCulled=false;stats.bufferAllocations++;
    }
    position.array.set(positions);rgb.array.set(colors);position.needsUpdate=true;rgb.needsUpdate=true;
    line.geometry.setDrawRange(0,count);
  }
  function update(project,time,ledBuffers,revision=0){
    const simulationChanged=time!==lastTime||revision!==lastRevision;
    if(simulationChanged){
    lastTime=time;lastRevision=revision;stats.simulationUpdates++;
    floor.scale.set(project.stage.width/10,1,project.stage.depth/6);rig.position.y=project.stage.rigHeight-4;
    const suitTracks=project.tracks.filter(t=>t.type==='suit'),laserTracks=project.tracks.filter(t=>t.type==='laser');
    actors.forEach((a,i)=>{
      const t=suitTracks[i];a.group.position.set(...t.position);a.group.rotation.y=Math.sin(time*.4+i)*.08;
      const buf=ledBuffers[i];for(let j=0;j<points.length;j++){color.setRGB(buf[j*3]/255,buf[j*3+1]/255,buf[j*3+2]/255,THREE.SRGBColorSpace);a.leds.setColorAt(j,color);}a.leds.instanceColor.needsUpdate=true;
      a.hands.forEach((beam,j)=>{const c=trackEnabled(project,t)&&activeCue(t.hands[j?'right':'left'],time);beam.visible=!!c;if(c)beam.material.color.set(c.color);});
    });
    lasers.forEach((l,i)=>{
      const t=laserTracks[i],c=trackEnabled(project,t)&&activeCue(t.cues,time);l.head.position.set(t.position[0],project.stage.rigHeight-.16,t.position[2]);l.beam.visible=l.path.visible=!!c;
      if(!c)return;
      const frame=laserFrame(t,time,project.stage.rigHeight),origin=[t.position[0],project.stage.rigHeight-.28,t.position[2]],spread=project.stage.rigHeight*.53;
      world.length=0;const rays=[],pathColors=[],rayColors=[];let previous=null,index=0;
      const y=c.shape==='hands'?1.235:.035;
      for(const point of sampleFrame(frame)){
        if(point.blank){previous=null;continue;}
        const p=[t.position[0]+point.x*spread,y,t.position[2]+point.y*spread];
        const rgb=color.set(point.color).toArray();
        if(previous){world.push(...previous,...p);pathColors.push(...rgb,...rgb);}
        if(index++%5===0){rays.push(...origin,...p);rayColors.push(...rgb,...rgb);}
        previous=p;
      }
      updateLine(l.path,world,pathColors);updateLine(l.beam,rays,rayColors);
    });
    }
    const w=canvas.clientWidth,h=canvas.clientHeight,resized=w!==width||h!==height;
    if(resized){width=w;height=h;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
    const moved=controls.update();
    if(simulationChanged||resized||moved||needsRender){renderer.render(scene,camera);stats.renders++;needsRender=false;}
  }
  function view(name){const views={front:[0,2.3,7.3],perspective:[4.8,3.5,7.3],jackets:[0,1.4,5.4],top:[0,11,.01],side:[9,3,0]};camera.position.set(...views[name]);controls.target.set(0,name==='jackets'?1:1.9,0);controls.update();needsRender=true;}
  return {points,update,view,renderer,actors,lasers,scene,stats};
}
