// Optional playback corrections; the measured video and authored keys stay saved.
export function validateLaserQuality(value){
  if(value===undefined)return;
  if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Perfil de trazado no válido.');
  for(const key of ['stabilizeRecorded','steadyRecordedBrightness'])if(value[key]!==undefined&&typeof value[key]!=='boolean')throw Error('Perfil de trazado no válido.');
}
export function qualityCue(cue,profile){
  if(!profile)return cue;
  const result={...cue};
  if(profile.stabilizeRecorded&&['needle','splitBeams','beamFan'].includes(cue.shape))result.recorded=true;
  if(!cue.videoMotion||cue.videoMotionEnabled===false)return result;
  result.stabilizeVideo=profile.stabilizeRecorded===true;
  if(profile.steadyRecordedBrightness&&cue.animation?.curves?.laserIntensity){
    const curves={...cue.animation.curves};delete curves.laserIntensity;
    result.animation={...cue.animation,curves};
  }
  return result;
}
export function roundBeamSpots(frame,radius=.004){
  // Only isolated beams, not a high-count dotted pattern or a short line in a logo.
  if(frame.paths.length>6)return frame;
  return {paths:frame.paths.map(path=>{
    const xs=path.points.map(p=>p[0]),ys=path.points.map(p=>p[1]);
    const left=Math.min(...xs),right=Math.max(...xs),bottom=Math.min(...ys),top=Math.max(...ys);
    if(Math.hypot(right-left,top-bottom)>.015)return path;
    const x=(left+right)/2,y=(top+bottom)/2;
    const r=Math.min(radius,1-Math.abs(x),1-Math.abs(y));
    if(r<.001)return path;
    return {...path,points:Array.from({length:13},(_,i)=>[x+r*Math.cos(i*Math.PI/6),y+r*Math.sin(i*Math.PI/6)])};
  })};
}
