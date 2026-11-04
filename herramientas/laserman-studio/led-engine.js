import * as core from './vendor/ldp-core.js';
import {activeCue,trackEnabled,sourceTime} from './engine.js';

export function createLedEngine(fixture,positions){
  const tree={id:'suit',name:'Jacket',type:'group',pixelStart:0,pixelCount:fixture.totalLeds,children:fixture.zones.map(z=>({id:z.name,name:z.name,type:'group',compact:true,pixelStart:z.start,pixelCount:z.count,children:[]}))};
  const groups=core.b(tree),children=core.d(tree),gradients=core.z(core.B);
  const gradientLUT=Object.fromEntries(core.B.map(g=>[g.id,core.c(g)]));
  const curveLUT=Object.fromEntries(core.N.map(c=>[c.id,core.j(c)]));
  const xy=new Float32Array(positions.flatMap(p=>[(p[0]+.55)/1.1,1-p[1]/1.85]));
  const buffers=new Map(),scratch=new Uint8Array(fixture.totalLeds*3);let last=-1;
  return {reset(){core.a();last=-1;},render(project,track,time){
    if(time<last)core.a();last=time;
    if(!buffers.has(track.id))buffers.set(track.id,new Uint8Array(fixture.totalLeds*3));
    const out=buffers.get(track.id);out.fill(0);
    if(!trackEnabled(project,track))return out;
    const active=track.cues.filter(c=>c.enabled!==false&&time>=c.start&&time<c.start+c.duration);
    const base=activeCue(active.filter(c=>!c.layer),time);
    for(const c of [...(base?[base]:[]),...active.filter(c=>c.layer)]){
      const e={id:c.id,effectType:c.effect,startTime:0,duration:(c.sourceDuration||c.duration)*1000,color:c.color,intensity:c.intensity,
        params:{...core.ah(c.effect),...(c.effect==='fade'?{curve:'constant'}:{})},curve:'constant',curveId:'constant',blendMode:'add',
        targetNodeIds:c.targets.includes('all')?['suit']:c.targets,mappingMode:'location',locationShape:'vertical',gradientMode:'space'};
      const ranges=core.e([e],groups,fixture.totalLeds);scratch.fill(0);
      core.f([e],ranges,sourceTime(c,time)*1000*c.speed,scratch,fixture.totalLeds,groups,gradients,xy,gradientLUT,curveLUT,children);
      for(let i=0;i<out.length;i++)out[i]=Math.min(255,out[i]+scratch[i]);
    }
    return out;
  }};
}
