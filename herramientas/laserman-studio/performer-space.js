// World-space reference shared by preview, live output and ILDA rendering.
export function validatePerformerSpace(project){
  const space=project.effectSpace;if(space===undefined)return;
  if(!space||typeof space!=='object')throw Error('Referencia del personaje no válida.');
  const actor=project.tracks?.find(t=>t.id===space.actorTrackId&&t.type==='suit');
  if(!space||space.version!==1||!actor||!Number.isFinite(space.scale)||space.scale<.05||space.scale>2||!Number.isFinite(space.l1Distance)||space.l1Distance<0||space.l1Distance>5)throw Error('Referencia del personaje o línea L1 no válida.');
}
export function validateEffectAnchor(anchor){
  if(anchor===undefined)return;
  if(!anchor||!['center','L1'].includes(anchor.origin)||!Array.isArray(anchor.reference)||anchor.reference.length!==2||anchor.reference.some(x=>!Number.isFinite(x)||Math.abs(x)>2)||(anchor.scale!==undefined&&(!Number.isFinite(anchor.scale)||anchor.scale<.05||anchor.scale>2)))throw Error('Anclaje de efecto no válido.');
}
export function anchorDrawing(frame,track,cue,height,project){
  const space=project?.effectSpace,anchor=cue.effectAnchor;
  if(!space||!anchor||!frame.paths.length)return frame;
  const actor=project.tracks.find(t=>t.id===space.actorTrackId),spread=height*.53;
  const center=[(actor.position[0]-track.position[0])/spread,(actor.position[2]-track.position[2])/spread];
  if(center.some(x=>Math.abs(x)>=.98))return {paths:[]};
  const scale=anchor.scale??space.scale,l1=anchor.origin==='L1'?space.l1Distance/spread:0;
  const local=frame.paths.map(path=>({...path,points:path.points.map(([x,y])=>[(x-anchor.reference[0])*scale,(y-anchor.reference[1])*scale+l1])}));
  // Fit the entire drawing uniformly instead of clipping individual vertices.
  let fit=1;
  for(const path of local)for(const point of path.points)for(let axis=0;axis<2;axis++){
    const v=point[axis];if(v>0)fit=Math.min(fit,(.98-center[axis])/v);else if(v<0)fit=Math.min(fit,(-.98-center[axis])/v);
  }
  return {paths:local.map(path=>({...path,points:path.points.map(p=>p.map((value,axis)=>center[axis]+value*fit))}))};
}
