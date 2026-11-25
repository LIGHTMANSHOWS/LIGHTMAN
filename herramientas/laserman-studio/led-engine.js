import * as core from './vendor/ldp-core.js';
import {activeCue,trackEnabled,sourceTime} from './engine.js?v=1.8.2-apertura';
import {transitionState} from './transitions.js?v=1.8.2-apertura';
import {animatedCue,animationClock} from './keyframes.js?v=1.8.2-apertura';
import {sequenceProjectAt,sequenceMix,sequencePartProject,colorPixels} from './sequence-context.js?v=1.8.2-apertura';

export function createLedEngine(fixture,positions){
  const tree={id:'suit',name:'Jacket',type:'group',pixelStart:0,pixelCount:fixture.totalLeds,children:fixture.zones.map(z=>({id:z.name,name:z.name,type:'group',compact:true,pixelStart:z.start,pixelCount:z.count,children:[]}))};
  const groups=core.b(tree),children=core.d(tree),gradients=core.z(core.B);
  const gradientLUT=Object.fromEntries(core.B.map(g=>[g.id,core.c(g)]));
  const curveLUT=Object.fromEntries(core.N.map(c=>[c.id,core.j(c)]));
  const xy=new Float32Array(positions.flatMap(p=>[(p[0]+.55)/1.1,1-p[1]/1.85]));
  const buffers=new Map(),scratch=new Uint8Array(fixture.totalLeds*3),transitionBuffers=[];let last=-1;
  function renderCue(c,time,target){
    target.fill(0);if(!c)return;
    c=animatedCue(c,time);
    const e={id:c.id,effectType:c.effect,startTime:0,duration:(c.sourceDuration||c.duration)*1000,color:c.color,intensity:c.intensity,
      params:{...core.ah(c.effect),...(c.effect==='fade'?{curve:'constant'}:{})},curve:'constant',curveId:'constant',blendMode:'add',
      targetNodeIds:c.targets.includes('all')?['suit']:c.targets,mappingMode:'location',locationShape:'vertical',gradientMode:'space'};
    const ranges=core.e([e],groups,fixture.totalLeds);
    const elapsed=animationClock(c,time,'speed')*1000;
    // The timeline owns the gate. Accelerating a pattern must repeat it rather
    // than let the underlying effect's source-duration gate black it out.
    const phase=((elapsed%e.duration)+e.duration)%e.duration;
    core.f([e],ranges,phase,target,fixture.totalLeds,groups,gradients,xy,gradientLUT,curveLUT,children);
  }
  function renderBase(track,cue,time,bpm,target,depth=0){
    renderCue(cue,time,target);if(!cue)return;
    const state=transitionState(track,cue,time,bpm);
    if(!state.active||state.amount>=1-1e-6||depth>=24)return;
    const previous=state.previous,prior=transitionBuffers[depth]??=new Uint8Array(target.length);
    renderBase(track,previous,previous?Math.min(cue.start-1e-7,previous.start+previous.duration-1e-7):time,bpm,prior,depth+1);
    for(let i=0;i<target.length;i++){
      const u=cue.transition==='wipe'?Math.max(0,Math.min(1,(state.amount-xy[Math.floor(i/3)*2])/.08+.5)):state.amount;
      target[i]=Math.round(prior[i]*(1-u)+target[i]*u);
    }
  }
  const api={reset(){core.a();last=-1;},render(project,track,time){
    const mix=sequenceMix(project,time);
    if(mix){
      const from=sequencePartProject(project,mix.from),to=sequencePartProject(project,mix.to);
      const a=api.render(from,from.tracks.find(t=>t.id===track.id),time).slice();
      const b=api.render(to,to.tracks.find(t=>t.id===track.id),time);
      for(let i=0;i<b.length;i++)b[i]=Math.round(a[i]*(1-mix.amount)+b[i]*mix.amount);
      return b;
    }
    if(project.sequenceParts){project=sequenceProjectAt(project,time);track=project.tracks.find(t=>t.id===track.id);}
    if(time<last)core.a();last=time;
    if(!buffers.has(track.id))buffers.set(track.id,new Uint8Array(fixture.totalLeds*3));
    const out=buffers.get(track.id);out.fill(0);
    if(!trackEnabled(project,track))return out;
    const active=track.cues.filter(c=>c.enabled!==false&&time>=c.start&&time<c.start+c.duration);
    const base=activeCue(active.filter(c=>!c.layer),time);
    renderBase(track,base,time,project.bpm,out);
    for(const c of active.filter(c=>c.layer)){
      renderCue(c,time,scratch);
      for(let i=0;i<out.length;i++)out[i]=Math.min(255,out[i]+scratch[i]);
    }
    return colorPixels(out,project.colorPolicy);
  }};
  return api;
}
