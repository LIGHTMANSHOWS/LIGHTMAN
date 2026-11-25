// Structured editing operations. No executable expressions or hardware commands.
import {validateProject,newCue,SHAPE_NAMES} from './engine.js?v=1.8.1-smi';
import {CHANNELS,newKey} from './keyframes.js?v=1.8.1-smi';
import {replaceWindow} from './timeline-model.js?v=1.8.1-smi';
const uid=()=>crypto.randomUUID();
const cueFields=new Set(['name','start','duration','color','enabled','shape','size','rotation','rotationEnd','panX','panZ','transition','transitionDuration','transitionUnit','transitionCurve','effectSpeed','effectPhase','effectClock','motionRate','motionEnabled','videoMotionEnabled','opening','depthScale','projectionHeight','previewOrigin','previewRays','laserIntensity','beamCount','polygonSides','effect','targets','speed','intensity','layer','customFps','customFrames','effectAnchor','sourceOffset','sourceDuration','videoMotion','animation','sequenceId','sequenceStart']);
function fields(values,allowed){
  if(!values||typeof values!=='object'||Array.isArray(values))throw Error('Falta un objeto de valores.');
  for(const key of Object.keys(values))if(!allowed.has(key))throw Error('Campo no admitido: '+key);
  return structuredClone(values);
}
export function applyCommands(source,commands){
  const project=validateProject(source),results=[];let lastId;
  if(!Array.isArray(commands)||!commands.length||commands.length>100)throw Error('Envía entre 1 y 100 comandos.');
  function track(id){const t=project.tracks.find(t=>t.id===id);if(!t)throw Error('Pista no encontrada: '+id);return t;}
  function find(id){
    id=id==='$last'?lastId:id;
    for(const t of project.tracks)for(const list of [t.cues,...(t.type==='suit'?[t.hands.left,t.hands.right]:[])]){
      const cue=list.find(c=>c.id===id);if(cue)return {track:t,list,cue};
    }
    throw Error('Bloque no encontrado: '+id);
  }
  for(const command of commands){
    if(!command||typeof command.op!=='string')throw Error('Comando no válido.');
    let result={op:command.op};
    switch(command.op){
      case 'cue.replace':
      case 'cue.add':{
        const t=track(command.trackId),v=fields(command.cue,cueFields);
        const c={...newCue(t.type,v.start,v.duration),...v};
        if(command.cueId!==undefined){if(typeof command.cueId!=='string'||!command.cueId)throw Error('Identificador de bloque no válido.');c.id=command.cueId;}
        if(!v.name)c.name=t.type==='laser'?SHAPE_NAMES[c.shape]||c.shape:c.name;
        if(command.op==='cue.replace')t.cues=replaceWindow(t.cues,c);
        else t.cues.push(c);
        lastId=c.id;result={...result,cueId:c.id,trackId:t.id};break;
      }
      case 'cue.update':{
        const x=find(command.cueId),v=fields(command.values,cueFields);
        Object.assign(x.cue,v);
        result={...result,cueId:x.cue.id,trackId:x.track.id};break;
      }
      case 'cue.remove':{
        const x=find(command.cueId);x.list.splice(x.list.indexOf(x.cue),1);
        result={...result,cueId:x.cue.id,trackId:x.track.id};break;
      }
      case 'cue.move':{
        const x=find(command.cueId);x.cue.start=command.start;
        if(command.trackId&&command.trackId!==x.track.id){
          const dest=track(command.trackId);
          if(dest.type!==x.track.type||x.list!==x.track.cues)throw Error('Solo se pueden mover bloques entre pistas del mismo tipo.');
          x.list.splice(x.list.indexOf(x.cue),1);dest.cues.push(x.cue);x.track=dest;
        }
        result={...result,cueId:x.cue.id,trackId:x.track.id};break;
      }
      case 'cue.copy':{
        const x=find(command.cueId),dest=command.trackId?track(command.trackId):x.track;
        if(dest.type!==x.track.type||x.list!==x.track.cues)throw Error('Copia entre pistas no compatible.');
        const copy=structuredClone(x.cue);copy.id=uid();copy.start=command.start??copy.start;
        for(const keys of Object.values(copy.animation?.curves||{}))for(const k of keys)k.id=uid();
        dest.cues.push(copy);lastId=copy.id;result={...result,cueId:copy.id,trackId:dest.id};break;
      }
      case 'curve.set':{
        const x=find(command.cueId);
        if(!Object.hasOwn(CHANNELS,command.channel)||!Array.isArray(command.keys)||command.keys.length>20000)throw Error('Canal o claves no válidos.');
        x.cue.animation??={version:1,enabled:true,curves:{}};
        x.cue.animation.enabled=true;
        x.cue.animation.curves[command.channel]=command.keys.map(k=>newKey(k.at,k.value,k.easing||'linear'));
        result={...result,cueId:x.cue.id,trackId:x.track.id};break;
      }
      case 'curve.remove':{
        const x=find(command.cueId);if(!Object.hasOwn(CHANNELS,command.channel))throw Error('Canal no válido.');
        if(x.cue.animation)delete x.cue.animation.curves[command.channel];
        result={...result,cueId:x.cue.id,trackId:x.track.id};break;
      }
      case 'track.update':{
        const t=track(command.trackId);Object.assign(t,fields(command.values,new Set(['name','enabled','solo','position','previewVisible'])));
        result={...result,trackId:t.id};break;
      }
      case 'marker.add':{
        const marker={id:uid(),name:command.name,start:command.start,color:command.color||'#55e1d3'};
        if(command.end!==undefined)marker.end=command.end;
        project.markers.push(marker);result={...result,markerId:marker.id};break;
      }
      case 'marker.remove':{
        const i=project.markers.findIndex(m=>m.id===command.markerId);if(i<0)throw Error('Marcador no encontrado.');
        project.markers.splice(i,1);result={...result,markerId:command.markerId};break;
      }
      case 'project.update':{
        Object.assign(project,fields(command.values,new Set(['name','bpm','duration','effectSpace','laserScale'])));break;
      }
      case 'project.trim':{
        const end=command.end;
        if(!Number.isFinite(end)||end<1||end>project.duration)throw Error('Final de corte no válido.');
        const trim=list=>list.filter(c=>c.start<end-.024999).map(c=>{
          if(c.start+c.duration<=end)return c;
          return {...c,duration:end-c.start,sourceDuration:c.sourceDuration??c.duration};
        });
        for(const t of project.tracks){t.cues=trim(t.cues);if(t.type==='suit')for(const side of ['left','right'])t.hands[side]=trim(t.hands[side]);}
        project.markers=(project.markers||[]).filter(m=>m.start<end&&(m.end==null||end-m.start>=.025)).map(m=>m.end==null?m:{...m,end:Math.min(m.end,end)});
        if(project.sections)project.sections=project.sections.filter(s=>s.time<=end);
        if(project.choreography)project.choreography.sections=project.choreography.sections.filter(s=>s.start<end).map(s=>({...s,end:Math.min(s.end,end)}));
        if(project.sequenceParts)project.sequenceParts=project.sequenceParts.filter(p=>p.start<end).map(p=>({...p,end:Math.min(p.end,end),context:{...p.context,
          tracks:p.context.tracks.map(t=>({...t,previewStart:Math.min(t.previewStart??p.start,end),previewWindows:t.previewWindows?t.previewWindows.filter(w=>w[0]<end).map(([a,b])=>[a,Math.min(b,end)]):null})),
          choreography:p.context.choreography?{...p.context.choreography,sections:p.context.choreography.sections.filter(s=>s.start<end).map(s=>({...s,end:Math.min(s.end,end)}))}:undefined}}));
        project.duration=end;result={...result,duration:end};break;
      }
      default:throw Error('Operación no admitida: '+command.op);
    }
    results.push(result);
  }
  return {project:validateProject(project),results};
}
export const COMMAND_SCHEMA={version:1,operations:['cue.add','cue.replace','cue.update','cue.remove','cue.move','cue.copy','curve.set','curve.remove','track.update','marker.add','marker.remove','project.update','project.trim'],shapes:SHAPE_NAMES,channels:Object.keys(CHANNELS),cueFields:[...cueFields]};
