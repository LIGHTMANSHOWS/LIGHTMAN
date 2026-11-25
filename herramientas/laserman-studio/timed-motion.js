// All clocks are functions of show time: seek, looping and export have no
// integrator state to reset or accumulate differently from the audio clock.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const finite=(v,a,b)=>Number.isFinite(v)&&v>=a&&v<=b;
import {animationClock,curveAt,CHANNELS} from './keyframes.js?v=1.7.0-roof';

export function effectTime(cue,time){
  const base=cue.animationBaseSpeed??cue.effectSpeed??1;
  const origin=cue.effectClock==='show'?(cue.start-(cue.sourceOffset||0)-(cue.sequenceStart||0))*base:0;
  return (cue.effectPhase||0)+origin+animationClock(cue,time);
}

export function validateRecordedMotion(cue){
  if(cue.effectClock!==undefined&&!['clip','show'].includes(cue.effectClock))throw Error('Reloj del efecto no válido.');
  if(cue.effectPhase!==undefined&&!finite(cue.effectPhase,-50000,50000))throw Error('Fase de efecto no válida.');
  if(cue.videoMotionEnabled!==undefined&&typeof cue.videoMotionEnabled!=='boolean')throw Error('Estado de movimiento del video no válido.');
  const recording=cue.videoMotion;if(recording===undefined)return;
  if(!recording||recording.version!==1||typeof recording.shape!=='string'||
    !finite(recording.baseSize,.05,1)||!finite(recording.fps,1,60)||
    !Array.isArray(recording.frames)||recording.frames.length<2||recording.frames.length>20000||
    recording.frames.some((f,i)=>!Array.isArray(f)||f.length!==4||!finite(f[0],0,1200)||
      i>0&&f[0]<=recording.frames[i-1][0]||!finite(f[1],-1,1)||!finite(f[2],0,1)||!finite(f[3],-50000,50000)))
    throw Error('Movimiento registrado del video no válido.');
}

export function recordedMotionAt(cue,time){
  const recording=cue.videoMotion;
  if(!recording||recording.shape!==cue.shape||cue.videoMotionEnabled===false)return null;
  const frames=recording.frames;
  const local=animationClock(cue,time);
  let lo=0,hi=frames.length-1;
  while(lo<hi){const mid=(lo+hi)>>1;if(frames[mid][0]<local)lo=mid+1;else hi=mid;}
  const b=frames[lo],a=frames[Math.max(0,lo-1)];
  const u=b[0]>a[0]?clamp((local-a[0])/(b[0]-a[0]),0,1):0;
  const curves=cue.animation?.enabled!==false?cue.animation?.curves:null;
  if(cue.stabilizeVideo){
    const median=i=>{const values=[frames[Math.max(0,i-1)][2],frames[i][2],frames[Math.min(frames.length-1,i+1)][2]].sort((x,y)=>x-y);return values[1];};
    return {center:0,width:median(Math.max(0,lo-1))*(1-u)+median(lo)*u,
      phase:curveAt(curves?.videoPhase,local,a[3]+(b[3]-a[3])*u,CHANNELS.videoPhase)};
  }
  return {center:curveAt(curves?.videoCenter,local,a[1]+(b[1]-a[1])*u,CHANNELS.videoCenter),
    width:curveAt(curves?.videoWidth,local,a[2]+(b[2]-a[2])*u,CHANNELS.videoWidth),
    phase:curveAt(curves?.videoPhase,local,a[3]+(b[3]-a[3])*u,CHANNELS.videoPhase)};
}

export function placeRecordedFrame(frame,cue,sample,height){
  if(!frame.paths.length)return frame;
  let min=Infinity,max=-Infinity;
  for(const path of frame.paths)for(const point of path.points){min=Math.min(min,point[0]);max=Math.max(max,point[0]);}
  const center=(min+max)/2,radius=(max-min)/2;
  const rotation=(cue.rotation+(cue.rotationEnd-cue.rotation)*clamp(sample.local/(cue.sourceDuration||cue.duration),0,1))*Math.PI/180;
  const cos=Math.cos(rotation),sin=Math.sin(rotation),scale=cue.size/cue.videoMotion.baseSize,spread=height*.53;
  return {paths:frame.paths.map(path=>({...path,points:path.points.map(([x,z])=>{
    // The film measures the lateral ray envelope. Keep the figure's existing
    // depth, explicitly estimated, rather than inventing a depth from pixels.
    const xx=radius>.005?(x-center)/radius*Math.max(.002,sample.width):x-center;
    const zz=z*cue.videoMotion.baseSize;
    return [clamp(sample.center+(xx*cos-zz*sin)*scale+cue.panX/spread,-1,1),
      clamp((xx*sin+zz*cos)*scale+cue.panZ/spread,-1,1)];
  })}))};
}
