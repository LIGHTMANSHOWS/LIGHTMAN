import {validateProjection} from './projection.js?v=1.8.0-urban';
import {validatePerformerSpace} from './performer-space.js?v=1.8.0-urban';
const finite=(v,a,b)=>Number.isFinite(v)&&v>=a&&v<=b;

export function validateSequence(project){
  if(project.colorPolicy!==undefined&&!['blue-white','green-white'].includes(project.colorPolicy?.mode))throw Error('Política de color no válida.');
  if(project.sequenceParts===undefined)return;
  if(!Array.isArray(project.sequenceParts)||!project.sequenceParts.length||project.sequenceParts.length>64)throw Error('Secuencia de shows no válida.');
  let end=0,previousStart=0,priorEnd=0;const ids=new Set();
  for(const part of project.sequenceParts){
    const c=part?.context;
    if(!part||typeof part.id!=='string'||ids.has(part.id)||!finite(part.start,0,project.duration)||!finite(part.end,0,project.duration)||!finite(part.overlap??0,0,2)||(Math.abs(part.start-(end-(part.overlap??0)))>.000001&&!(end===project.duration&&part.end===end&&part.start<end&&end-part.start<=(part.overlap??0)))||(ids.size===0&&(part.overlap??0)!==0)||(ids.size>0&&(part.start<=previousStart||part.end<end||(part.end===end&&end!==project.duration)))||part.end-part.start<=.000001||!c||!finite(c.bpm,40,240)||!c.stage||!finite(c.stage.width,4,30)||!finite(c.stage.depth,3,20)||!finite(c.stage.rigHeight,2,12)||!Array.isArray(c.tracks)||c.tracks.length!==6)throw Error('Contexto o límites de secuencia no válidos.');
    if(ids.size>1&&part.start<priorEnd-.000001)throw Error('No se admiten tres segmentos superpuestos.');
    ids.add(part.id);previousStart=part.start;priorEnd=end;end=part.end;
    const fields=new Set(['id','position','previewVisible','previewActorIndex','actorIndex','previewStart','previewWindows']);
    if(new Set(c.tracks.map(t=>t.id)).size!==6)throw Error('Pistas duplicadas en la secuencia.');
    for(const t of c.tracks){
      if(Object.keys(t).some(k=>!fields.has(k))||!project.tracks.some(x=>x.id===t.id)||!Array.isArray(t.position)||t.position.length!==3||t.position.some(v=>!finite(v,-30,30))||(t.previewVisible!==undefined&&typeof t.previewVisible!=='boolean'))throw Error('Posición de secuencia no válida.');
      for(const k of ['actorIndex','previewActorIndex'])if(t[k]!==undefined&&(!Number.isInteger(t[k])||!finite(t[k],0,2)))throw Error('Artista de secuencia no válido.');
      if(t.previewStart!==undefined&&!finite(t.previewStart,part.start,part.end))throw Error('Inicio visual de secuencia no válido.');
      if(t.previewWindows!=null&&(!Array.isArray(t.previewWindows)||t.previewWindows.some(w=>!Array.isArray(w)||w.length!==2||!finite(w[0],part.start,part.end)||!finite(w[1],w[0],part.end))))throw Error('Visibilidad de secuencia no válida.');
    }
    if(c.projection!==undefined)validateProjection(c.projection);
    if(c.laserScale!==undefined&&!finite(c.laserScale,.05,2))throw Error('Amplitud de secuencia no válida.');
    if(c.effectSpace!==undefined)validatePerformerSpace({...project,effectSpace:c.effectSpace});
    if(c.choreography){const ch=c.choreography,poses=['ready','cage','spread','lift','grabLeft','grabRight','slice','crouch','bow'];if(typeof ch.enabled!=='boolean'||!finite(ch.bpm,40,240)||!Array.isArray(ch.sections)||ch.sections.length>1024||ch.sections.some(s=>!finite(s.start,part.start,part.end)||!finite(s.end,s.start,part.end)||!poses.includes(s.pose)||!finite(s.energy,0,1)))throw Error('Coreografía de secuencia no válida.');}
  }
  if(Math.abs(end-project.duration)>.000001)throw Error('La secuencia no cubre la duración del show.');
}

// A short overlap uses two source contexts, keeping every cue on its own clock.
export function sequenceMix(project,time){
  if(!project?.sequenceParts)return null;
  const active=project.sequenceParts.filter(p=>time>=p.start&&time<p.end);
  if(active.length!==2)return null;
  const [from,to]=active;
  return {from,to,amount:Math.max(0,Math.min(1,(time-to.start)/(to.overlap??(from.end-to.start))))};
}
export function sequencePartProject(project,part){
  const c=part.context,keep=cue=>!cue.sequenceId||cue.sequenceId===part.id;
  return {...project,bpm:c.bpm,stage:c.stage,performerStyle:c.performerStyle,effectSpace:c.effectSpace,laserScale:c.laserScale,
    choreography:c.choreography,reference:{...project.reference,motion:c.referenceMotion},sequenceParts:undefined,sequenceTimeOrigin:part.start,sequencePartId:part.id,
    tracks:project.tracks.map(t=>({...t,...c.tracks.find(s=>s.id===t.id),cues:t.cues.filter(keep),
      ...(t.hands?{hands:Object.fromEntries(Object.entries(t.hands).map(([side,cues])=>[side,cues.filter(keep)]))}:{})}))};
}
export function sequenceProjectAt(project,time){
  if(!project?.sequenceParts)return project;
  const part=project.sequenceParts.findLast(p=>time>=p.start&&time<p.end)||project.sequenceParts.at(-1);
  return sequencePartProject(project,part);
}

export function allowedRgb(r,g,b,policy){
  if(!['blue-white','green-white'].includes(policy?.mode)||(policy.mode==='blue-white'?(r===g&&b>=r):(r===b&&g>=r)))return [r,g,b];
  const level=Math.max(r,g,b),white=level-Math.min(r,g,b)<=48||(r>g*1.15&&r>=b*1.1);
  return white?[level,level,level]:policy.mode==='green-white'?[0,level,0]:[0,0,level];
}
export function allowedColor(color,policy){
  return '#'+allowedRgb(...[1,3,5].map(i=>parseInt(color.slice(i,i+2),16)),policy).map(n=>n.toString(16).padStart(2,'0')).join('');
}
export function colorFrame(frame,policy){
  if(!['blue-white','green-white'].includes(policy?.mode))return frame;
  const result={paths:frame.paths.map(p=>({...p,color:allowedColor(p.color,policy)}))};
  if(frame.placement)Object.defineProperty(result,'placement',{value:frame.placement,configurable:true});return result;
}
export function colorPixels(pixels,policy){
  if(['blue-white','green-white'].includes(policy?.mode))for(let i=0;i<pixels.length;i+=3){const rgb=allowedRgb(pixels[i],pixels[i+1],pixels[i+2],policy);pixels[i]=rgb[0];pixels[i+1]=rgb[1];pixels[i+2]=rgb[2];}
  return pixels;
}
