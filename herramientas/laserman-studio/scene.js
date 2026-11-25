import * as THREE from './vendor/three.module.js';
import {OrbitControls} from './vendor/addons/controls/OrbitControls.js';
import {activeCue,trackEnabled} from './engine.js?v=1.8.2-apertura';
import {sequenceProjectAt,allowedColor} from './sequence-context.js?v=1.8.2-apertura';
import {sampleFrame} from './laser.js?v=1.8.2-apertura';
import {createLaserStroke,updateLaserStroke,createLaserHaze,updateLaserHaze} from './laser-visual.js?v=1.8.2-apertura';
import {rigPerformer,posePerformer} from './performer.js?v=1.8.2-apertura';

import {jacketPixels} from './jacket.js?v=1.8.2-apertura';
import {performerLayout} from './performer-layout.js?v=1.8.2-apertura';
import {createUrbanLayer} from './urban-performer.js?v=1.8.2-apertura';

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
  const roundFloor=new THREE.Mesh(new THREE.CylinderGeometry(2.6,2.6,.14,96),new THREE.MeshStandardMaterial({color:'#101620',roughness:.8}));roundFloor.position.y=-.1;roundFloor.visible=false;scene.add(roundFloor);
  const performerGuides=new THREE.Group();performerGuides.visible=false;scene.add(performerGuides);
  const guideMaterial=new THREE.LineBasicMaterial({color:'#67a3ca',transparent:true,opacity:.5});
  const centerGuide=new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints([[-.16,0,0],[.16,0,0],[0,0,-.16],[0,0,.16]].map(p=>new THREE.Vector3(...p))),guideMaterial);performerGuides.add(centerGuide);
  const frontGuide=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-1,0,0),new THREE.Vector3(1,0,0)]),guideMaterial);performerGuides.add(frontGuide);
  function guideLabel(text){const canvas=document.createElement('canvas');canvas.width=384;canvas.height=64;const ctx=canvas.getContext('2d');ctx.font='600 30px sans-serif';ctx.textAlign='center';ctx.fillStyle='#8cc6ec';ctx.fillText(text,192,43);const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(canvas),transparent:true,depthWrite:false}));sprite.scale.set(1.7,.28,1);return sprite;}
  const centerLabel=guideLabel('CENTRO'),frontLabel=guideLabel('L1 · FRENTE');performerGuides.add(centerLabel,frontLabel);centerLabel.position.set(.65,.08,0);
  const rig=new THREE.Group();scene.add(rig);
  const cube=(parent,w,h,d,x,y,z,mat=cloth)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);parent.add(m);return m;};
  function rod(parent,a,b,r,mat=metal){const v=new THREE.Vector3(...a),end=new THREE.Vector3(...b),axis=end.clone().sub(v);const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,axis.length(),10),mat);m.position.copy(v.add(end).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),axis.normalize());parent.add(m);return m;}
  for(const z of [-.4,-.2])rod(rig,[-4.3,4,z],[4.3,4,z],.035);
  for(const x of [-4.3,4.3]){rod(rig,[x,0,-.3],[x,4,-.3],.035);cube(rig,.5,.07,.5,x,0,-.3,metal);}
  const urban=createUrbanLayer(scene);let urbanStarted=false;
  const actors=[],lasers=[],points=jacketPixels(fixture),matrix=new THREE.Matrix4(),color=new THREE.Color();
  const mark=(mesh,joint)=>{mesh.userData.joint=joint;return mesh;};
  const glowCanvas=document.createElement('canvas');glowCanvas.width=glowCanvas.height=64;
  const glowContext=glowCanvas.getContext('2d'),gradient=glowContext.createRadialGradient(32,32,0,32,32,32);
  gradient.addColorStop(0,'rgba(255,255,255,1)');gradient.addColorStop(.12,'rgba(255,255,255,.85)');
  gradient.addColorStop(.32,'rgba(255,255,255,.22)');gradient.addColorStop(1,'rgba(255,255,255,0)');
  glowContext.fillStyle=gradient;glowContext.fillRect(0,0,64,64);
  const lensTexture=new THREE.CanvasTexture(glowCanvas);
  function lens(parent,position,size){
    const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:lensTexture,color:'#ffffff',
      transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));
    sprite.position.set(...position);sprite.scale.set(size,size,1);parent.add(sprite);return sprite;
  }
  for(let i=0;i<3;i++){
    const group=new THREE.Group();group.position.x=(i-1)*2.4;scene.add(group);
    const torso=new THREE.Mesh(new THREE.CylinderGeometry(.245,.21,.58,12),cloth);torso.scale.z=.68;torso.position.y=1.22;group.add(mark(torso,'body'));
    cube(group,.39,.17,.25,0,.92,0);
    const hood=new THREE.Mesh(new THREE.SphereGeometry(.185,18,14),cloth);hood.scale.set(.92,1.16,.95);hood.position.set(0,1.63,.015);group.add(mark(hood,'body'));
    const face=new THREE.Mesh(new THREE.SphereGeometry(.125,16,12),shadow);face.scale.set(1,1.14,.32);face.position.set(0,1.63,.173);group.add(mark(face,'body'));
    mark(cube(group,.24,.085,.045,0,1.575,.17,cloth),'body');
    const hat=new THREE.Mesh(new THREE.ConeGeometry(.34,.17,32),new THREE.MeshBasicMaterial({color:'#6078ed'}));
    hat.position.set(0,1.91,0);hat.visible=false;group.add(mark(hat,'body'));
    for(const sign of [-1,1]){
      const arm=sign<0?'leftArm':'rightArm',leg=sign<0?'leftLeg':'rightLeg';
      mark(rod(group,[sign*.22,1.43,0],[sign*.38,1.22,.04],.075,cloth),arm);
      mark(rod(group,[sign*.38,1.22,.04],[sign*.55,1.11,.08],.065,cloth),arm);
      mark(cube(group,.085,.11,.11,sign*.56,1.10,.08,shadow),arm);
      mark(rod(group,[sign*.115,.92,0],[sign*.14,.56,.015],.105,cloth),leg);
      mark(rod(group,[sign*.14,.56,.015],[sign*.16,.17,.045],.078,cloth),leg);
      mark(cube(group,.18,.115,.3,sign*.16,.09,.12,shadow),leg);
      mark(cube(group,.025,.11,.045,sign*.56,1.19,.1,metal),arm);
    }
    const ledMat=new THREE.MeshBasicMaterial({color:0xffffff,toneMapped:false});
    const leds=new THREE.InstancedMesh(new THREE.SphereGeometry(.012,5,4),ledMat,points.length);
    points.forEach((p,j)=>{matrix.makeTranslation(...p);leds.setMatrixAt(j,matrix);leds.setColorAt(j,color.set('#000000'));});
    leds.instanceColor.setUsage(THREE.DynamicDrawUsage);group.add(leds);
    const glow=new THREE.InstancedMesh(new THREE.SphereGeometry(.026,4,3),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.15,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}),points.length);
    glow.instanceMatrix=leds.instanceMatrix;glow.instanceColor=leds.instanceColor;group.add(glow);
    const hands=['left','right'].map((side,j)=>{
      const beam=createLaserStroke({width:4.5,opacity:.95});group.add(beam);
      updateLaserStroke(beam,[(j?1:-1)*.56,1.23,.1,(j?1:-1)*.56,4.6,.1],[1,1,1,1,1,1]);
      beam.userData.lens=lens(group,[(j?1:-1)*.56,1.23,.1],.11);
      mark(beam,j?'rightArm':'leftArm');mark(beam.userData.lens,j?'rightArm':'leftArm');
      return beam;
    });
    const rigged=rigPerformer(group,fixture,points,leds);actors.push({group,leds,hands,hat,rig:rigged});
    const head=cube(scene,.18,.10,.18,(i-1)*2.4,4,-.3,metal);
    const beam=createLaserStroke({width:2.2,opacity:.075}),path=createLaserStroke({width:5,opacity:1});
    const haze=createLaserHaze(),aperture=lens(scene,[(i-1)*2.4,3.72,-.3],.19);
    haze.renderOrder=1;beam.renderOrder=2;path.renderOrder=3;
    const tips=Array.from({length:35},()=>{const tip=lens(scene,[0,0,0],.10);tip.visible=false;return tip;});
    scene.add(haze,beam,path);lasers.push({head,beam,path,haze,aperture,tips});
  }
  const labelCanvas=document.createElement('canvas');labelCanvas.width=512;labelCanvas.height=96;const ctx=labelCanvas.getContext('2d');ctx.fillStyle='#7794b6';ctx.font='600 28px sans-serif';ctx.textAlign='center';ctx.fillText('L I G H T M A N  /  L A S E R M A N',256,54);const sign=new THREE.Mesh(new THREE.PlaneGeometry(5.5,1),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(labelCanvas),transparent:true}));sign.position.set(0,2.9,-2.85);scene.add(sign);
  let width=0,height=0,lastTime=NaN,lastRevision=-1,needsRender=true,cinematic=false;const world=[];
  const stats={renders:0,simulationUpdates:0,bufferAllocations:0};
  function update(project,time,ledBuffers,revision=0){
    const composition=project;project=sequenceProjectAt(project,time);const poseTime=time-(project.sequenceTimeOrigin||0);
    const simulationChanged=time!==lastTime||revision!==lastRevision;
    if(simulationChanged){
    lastTime=time;lastRevision=revision;stats.simulationUpdates++;
    floor.visible=project.stage.shape!=='circle';roundFloor.visible=project.stage.shape==='circle';grid.visible=project.stage.shape!=='circle';floor.scale.set(project.stage.width/10,1,project.stage.depth/6);rig.position.y=project.stage.rigHeight-4;
    if(cinematic!==(['arius','reference'].includes(project.performerStyle))){cinematic=['arius','reference'].includes(project.performerStyle);view('perspective');}
    cloth.color.set(['arius','reference'].includes(project.performerStyle)?'#5974b8':'#10131b');
    const suitTracks=project.tracks.filter(t=>t.type==='suit'),laserTracks=project.tracks.filter(t=>t.type==='laser');
    const formation=performerLayout(project,time,composition),isUrban=project.performerCostume==='urban';rig.visible=true;
    canvas.dataset.costume=isUrban?'urban':'classic';canvas.dataset.urbanReady=String(urban.ready);
    if(isUrban&&!urbanStarted){urbanStarted=true;urban.load().then(()=>{lastRevision=-1;needsRender=true;canvas.dataset.urbanReady='true';}).catch(e=>{console.error(e);canvas.dataset.urbanError='No se pudo cargar el traje Urban.';});}
    urban.groups.forEach(g=>g.visible=isUrban&&urban.ready);
    canvas.setAttribute('aria-label',isUrban?'Escenario 3D con tres artistas Urban y proyectores de techo a cuatro metros':'Escenario 3D LASERMAN con tres artistas');
    floor.scale.x=Math.max(project.stage.width,8.2)/10;roundFloor.scale.x=1.8;
    performerGuides.visible=!!project.effectSpace;
    if(project.effectSpace){const actor=suitTracks.find(t=>t.id===project.effectSpace.actorTrackId),distance=project.effectSpace.l1Distance;performerGuides.position.set(actor.position[0],.008,actor.position[2]);frontGuide.position.z=distance;frontGuide.scale.x=distance;frontLabel.position.set(0,.08,distance+.13);}
    actors.forEach((a,i)=>{
      const t=suitTracks[i];a.group.visible=!isUrban;a.group.position.set(...formation.positions[i]);a.group.rotation.y=project.reference?.motion?0:Math.sin(poseTime*.4)*.08;
      a.hat.visible=['arius','reference','reel'].includes(project.performerStyle);posePerformer(a,project,time,0);
      const buf=ledBuffers[formation.sourceSuitIndex];for(let j=0;j<points.length;j++){color.setRGB(buf[j*3]/255,buf[j*3+1]/255,buf[j*3+2]/255,THREE.SRGBColorSpace);a.leds.setColorAt(j,color);}a.leds.instanceColor.needsUpdate=true;
      a.hands.forEach((beam,j)=>{
        const c=trackEnabled(project,t)&&activeCue(t.hands[j?'right':'left'],time);
        beam.visible=false;beam.userData.lens.visible=!!c;
        if(c){const color=allowedColor(c.color,project.colorPolicy);beam.material.uniforms.tint.value.set(color);beam.userData.lens.material.color.set(color);}
      });
    });
    if(isUrban&&urban.ready)urban.update(actors,fixture,ledBuffers[formation.sourceSuitIndex]);
    lasers.forEach((l,i)=>{
      const mount=formation.projectors[i];l.head.visible=true;l.head.position.set(...mount);l.head.quaternion.identity();
      const origin=[mount[0],mount[1]-.06,mount[2]];
      l.beam.visible=l.path.visible=l.haze.visible=l.aperture.visible=formation.lit;
      for(const tip of l.tips)tip.visible=false;
      if(!formation.lit)return;
      const frame=formation.drawing,spread=formation.spread;
      const discrete=formation.discrete;
      l.beam.material.uniforms.opacity.value=discrete?.86:.075;
      l.aperture.position.set(...origin);l.aperture.material.color.set(frame.paths[0]?.color||'#ffffff');
      world.length=0;const rays=[],pathColors=[],rayColors=[],samples=sampleFrame(frame);
      const stride=Math.max(1,Math.ceil(samples.filter(p=>!p.blank).length/28));let previous=null,index=0,tipIndex=0;
      const y=formation.positions[i][1]+formation.height;
      for(const point of samples){
        if(point.blank){previous=null;continue;}
        const p=[formation.positions[i][0]+point.x*spread,y,formation.positions[i][2]+point.y*spread];
        const rgb=color.set(point.color).toArray();
        if(previous){world.push(...previous,...p);pathColors.push(...rgb,...rgb);}
        if(discrete ? previous===null : previous===null||index++%stride===0){
          rays.push(...origin,...p);rayColors.push(...rgb,...rgb);
          if(discrete&&l.tips[tipIndex]){const tip=l.tips[tipIndex++];tip.position.set(...p);tip.material.color.set(point.color);tip.visible=true;}
        }
        previous=p;
      }
      stats.bufferAllocations+=updateLaserStroke(l.path,world,pathColors)+updateLaserStroke(l.beam,rays,rayColors)
        +updateLaserHaze(l.haze,origin,world,pathColors,time);
    });
    }
    const w=canvas.clientWidth,h=canvas.clientHeight,resized=w!==width||h!==height;
    if(resized){
      width=w;height=h;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
      for(const l of lasers)for(const stroke of [l.beam,l.path])stroke.material.uniforms.viewport.value.set(w,h);
      for(const a of actors)for(const stroke of a.hands)stroke.material.uniforms.viewport.value.set(w,h);
    }
    const moved=controls.update();
    if(simulationChanged||resized||moved||needsRender){renderer.render(scene,camera);stats.renders++;needsRender=false;}
  }
  function view(name){const views=cinematic?{front:[0,3,11],perspective:[6.8,4.2,10],jackets:[0,1.8,6.6],top:[0,13,.01],side:[11,4,0]}:{front:[0,2.3,7.3],perspective:[4.8,3.5,7.3],jackets:[0,1.4,5.4],top:[0,11,.01],side:[9,3,0]};camera.position.set(...views[name]);controls.target.set(0,name==='jackets'?1:cinematic?2.4:1.9,0);controls.update();needsRender=true;}
  return {points,update,view,renderer,actors,lasers,scene,stats,urban};
}
