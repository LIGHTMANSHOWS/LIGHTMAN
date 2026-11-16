import * as THREE from './vendor/three.module.js';

const pivots={body:[0,.92,0],leftArm:[-.22,1.43,0],rightArm:[.22,1.43,0],leftLeg:[-.115,.92,0],rightLeg:[.115,.92,0]};
const keyFor=name=>/^(Arm|Hand)/.test(name)?(/Right/.test(name)?'rightArm':'leftArm'):
  /^(Leg|Foot)/.test(name)?(/Right/.test(name)?'rightLeg':'leftLeg'):'body';

export function rigPerformer(group,fixture,points,leds){
  const parts=group.children.filter(child=>child.userData.joint),joints={};
  for(const [key,pivot] of Object.entries(pivots)){
    const joint=new THREE.Group();joint.position.set(...pivot);group.add(joint);joints[key]={node:joint};
    for(const part of parts.filter(part=>part.userData.joint===key))joint.attach(part);
  }
  joints.body.node.attach(joints.leftArm.node);joints.body.node.attach(joints.rightArm.node);
  group.updateWorldMatrix(true,true);
  const rootInverse=new THREE.Matrix4().copy(group.matrixWorld).invert();
  for(const joint of Object.values(joints)){
    joint.bindInverse=new THREE.Matrix4().multiplyMatrices(rootInverse,joint.node.matrixWorld).invert();
    joint.deform=new THREE.Matrix4();
  }
  const pixelJoints=Array(points.length);
  for(const zone of fixture.zones)for(let i=zone.start;i<zone.start+zone.count;i++)pixelJoints[i]=joints[keyFor(zone.name)];
  leds.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  return {joints,pixelJoints,points,rootInverse,vector:new THREE.Vector3(),matrix:new THREE.Matrix4(),posed:false};
}

const patterns={
  ready:{leftArm:0,rightArm:0,body:0,knee:.04},
  cage:{leftArm:-.48,rightArm:.48,body:0,knee:.12},
  spread:{leftArm:-.82,rightArm:.82,body:0,knee:.10},
  lift:{leftArm:-1.9,rightArm:1.9,body:0,knee:.08},
  grabLeft:{leftArm:-1.95,rightArm:.25,body:.12,knee:.18},
  grabRight:{leftArm:-.25,rightArm:1.95,body:-.12,knee:.18},
  slice:{leftArm:-.9,rightArm:.2,body:.22,knee:.2},
  crouch:{leftArm:-.4,rightArm:.4,body:.16,knee:.34},
  bow:{leftArm:-.1,rightArm:.1,body:.36,knee:.15}
};
export function posePerformer(actor,project,time,index){
  const rig=actor.rig,settings=project.choreography;
  if(!settings?.enabled&&!rig.posed)return;
  const sections=settings?.sections||[],section=sections.find(s=>time>=s.start&&time<s.end);
  const enabled=!!settings?.enabled,pose=patterns[section?.pose||'ready']||patterns.ready;
  const base=enabled?pose:patterns.ready;
  const previous=sections.filter(s=>s.end<=time).at(-1),from=patterns[previous?.pose||'ready']||patterns.ready;
  const t=enabled&&section?Math.min(1,(time-section.start)/.24):1,mix=t*t*(3-2*t);
  const procedural=enabled&&!project.reference?.motion;
  const beat=60/(settings?.bpm||150),pulse=procedural?Math.sin(time/beat*Math.PI*2):0;
  const energy=procedural?(section?.energy??.55):0;
  const mirror=settings?.mirrorOutside&&index===2?-1:1;
  const armLeft=from.leftArm+(base.leftArm-from.leftArm)*mix;
  const armRight=from.rightArm+(base.rightArm-from.rightArm)*mix;
  const sway=Math.sin(time/beat*Math.PI)*.055*energy;
  rig.joints.leftArm.node.rotation.set(Math.sin(time*.8)*.08*energy,0,(mirror>0?armLeft:-armRight)+pulse*.09*energy);
  rig.joints.rightArm.node.rotation.set(-Math.sin(time*.8)*.08*energy,0,(mirror>0?armRight:-armLeft)-pulse*.09*energy);
  const lean=from.body+(base.body-from.body)*mix;
  rig.joints.body.node.rotation.set(enabled?lean:0,enabled?Math.sin(time*.9)*.1:0,sway);
  const knee=enabled?base.knee:0;
  rig.joints.leftLeg.node.rotation.set(pulse*.1*energy,0,knee+sway);
  rig.joints.rightLeg.node.rotation.set(-pulse*.1*energy,0,-knee+sway);
  actor.group.position.y-=enabled?Math.abs(pulse)*.035*energy+(section?.pose==='crouch'?.10:0):0;
  actor.group.updateWorldMatrix(true,true);rig.rootInverse.copy(actor.group.matrixWorld).invert();
  for(const joint of Object.values(rig.joints))joint.deform.multiplyMatrices(rig.rootInverse,joint.node.matrixWorld).multiply(joint.bindInverse);
  for(let i=0;i<rig.points.length;i++){
    rig.vector.fromArray(rig.points[i]).applyMatrix4(rig.pixelJoints[i].deform);
    rig.matrix.makeTranslation(rig.vector.x,rig.vector.y,rig.vector.z);actor.leds.setMatrixAt(i,rig.matrix);
  }
  actor.leds.instanceMatrix.needsUpdate=true;rig.posed=enabled;
}
