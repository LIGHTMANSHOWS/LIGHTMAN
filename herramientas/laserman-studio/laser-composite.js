import {laserFrame,trackEnabled} from './engine.js?v=1.8.1-smi';
import {sequenceProjectAt,sequenceMix,sequencePartProject} from './sequence-context.js?v=1.8.1-smi';
import {blendLaserFrames} from './transitions.js?v=1.8.1-smi';

export function compositeLaserFrame(project,time,targetId){
  const mix=sequenceMix(project,time);
  if(mix)return blendLaserFrames(compositeLaserFrame(sequencePartProject(project,mix.from),time,targetId),
    compositeLaserFrame(sequencePartProject(project,mix.to),time,targetId),mix.amount,'fade');
  project=sequenceProjectAt(project,time);
  const target=project.tracks.find(t=>t.type==='laser'&&t.id===targetId);
  if(!target)throw Error('No existe la salida láser seleccionada.');
  const spread=project.stage.rigHeight*.53,paths=[];
  for(const track of project.tracks.filter(t=>t.type==='laser'&&trackEnabled(project,t))){
    const frame=laserFrame(track,time,project.stage.rigHeight,project.bpm,project);
    const offset=[(track.position[0]-target.position[0])/spread,(track.position[2]-target.position[2])/spread];
    for(const path of frame.paths)paths.push({...path,points:path.points.map(p=>p.map((v,i)=>v+offset[i]))});
  }
  // A single DAC receives every layer. Fit uniformly if projectors in an older
  // reconstruction used different scene positions; never cut polygon corners.
  let maximum=1;for(const path of paths)for(const point of path.points)for(const value of point)maximum=Math.max(maximum,Math.abs(value));
  const drawing=maximum===1?paths:paths.map(path=>({...path,points:path.points.map(p=>p.map(v=>v/maximum))}));
  if(drawing.length<8||!drawing.every(path=>path.points.length===2&&Math.hypot(path.points[1][0]-path.points[0][0],path.points[1][1]-path.points[0][1])<.015))return {paths:drawing};
  // Visit nearby dots consecutively. Geometry, color, blanking delays and
  // scanner rate stay unchanged; only dark travel distance is reduced.
  const remaining=drawing.slice(),ordered=[];let position=[0,0];
  while(remaining.length){
    let best=0,distance=Infinity,reverse=false;
    for(let i=0;i<remaining.length;i++)for(const end of [0,1]){
      const point=remaining[i].points[end],d=Math.hypot(point[0]-position[0],point[1]-position[1]);
      if(d<distance){best=i;distance=d;reverse=end===1;}
    }
    const path=remaining.splice(best,1)[0],next=reverse?{...path,points:path.points.slice().reverse()}:path;
    ordered.push(next);position=next.points.at(-1);
  }
  return {paths:ordered};
}
