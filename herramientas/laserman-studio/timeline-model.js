import {clamp,cueList,newCue,uid} from './engine.js';

export function markerSpan(project,marker){
  if(!marker)return null;
  const boundary=(project.markers||[]).flatMap(m=>[m.start,m.end]).filter(t=>t!=null&&t>marker.start+1e-7).sort((a,b)=>a-b)[0];
  const end=marker.end??boundary??project.duration;
  return end>marker.start+.024?{start:marker.start,end,name:marker.name,id:marker.id}:null;
}

export function rangeAt(project,time){
  return (project.markers||[]).map(marker=>({marker,span:markerSpan(project,marker)}))
    .filter(({span})=>span&&time>=span.start-1e-7&&time<span.end)
    .sort((a,b)=>(a.marker.end==null)-(b.marker.end==null)||b.span.start-a.span.start)[0]?.span||null;
}

export function snapTime(time,{quantum=0,markers=[],tolerance=0,duration=Infinity}={}){
  let result=quantum>0?Math.round(time/quantum)*quantum:time;
  let nearest=tolerance;
  for(const marker of markers)for(const edge of [marker.start,marker.end]){
    if(edge==null)continue;
    const distance=Math.abs(time-edge);
    if(distance<=nearest){nearest=distance;result=edge;}
  }
  return clamp(result,0,duration);
}

// Trims both sides of an overwrite without changing the surviving animation's
// source time. Filling a range never stacks hidden, competing cue fragments.
export function replaceWindow(list,insert){
  const start=insert.start,end=start+insert.duration,result=[];
  for(const cue of list){
    if(cue.id===insert.id)continue;
    const finish=cue.start+cue.duration;
    if(finish<=start+1e-7||cue.start>=end-1e-7){result.push(cue);continue;}
    const sourceDuration=cue.sourceDuration??cue.duration,sourceOffset=cue.sourceOffset||0;
    if(cue.start<start-.024)result.push({...cue,duration:start-cue.start,sourceDuration,sourceOffset});
    if(finish>end+.024)result.push({...cue,id:cue.start<start-.024?uid():cue.id,start:end,duration:finish-end,
      sourceDuration,sourceOffset:sourceOffset+end-cue.start});
  }
  result.push(insert);return result.sort((a,b)=>a.start-b.start);
}

export function fillRange(project,rowId,span,template={}){
  const [trackId,hand]=rowId.split('/'),track=project.tracks.find(t=>t.id===trackId);
  if(!track||!span||span.end-span.start<.025)throw Error('Selecciona un rango con duración.');
  const kind=hand?'hand':track.type;
  if(template.kind&&template.kind!==kind)throw Error('Este efecto corresponde a otra clase de pista.');
  const cue={...newCue(kind,span.start,span.end-span.start),...template,id:uid(),start:span.start,duration:span.end-span.start};
  delete cue.kind;delete cue.sourceDuration;delete cue.sourceOffset;
  const list=cueList(project,rowId),updated=replaceWindow(list,cue);
  list.splice(0,list.length,...updated);return cue;
}

export function makeMarker(project,start,end=null,name=''){
  start=clamp(start,0,project.duration);
  if(end!=null){end=clamp(end,0,project.duration);[start,end]=[Math.min(start,end),Math.max(start,end)];if(end-start<.025)end=null;}
  return {id:uid(),name:name||'Marcador '+String((project.markers?.length||0)+1).padStart(2,'0'),start,end,color:'#65d4c4',kind:end==null?'point':'range'};
}
