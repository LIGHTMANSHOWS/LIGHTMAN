import {activeCue,trackEnabled} from './engine.js?v=1.8.2-apertura';
import {compositeLaserFrame} from './laser-composite.js?v=1.8.2-apertura';
import {projectDrawing} from './projection.js?v=1.8.2-apertura';
// Presentation convention: three performers share one complete programmed image.
// Never copy timeline layers or multiply samples in the physical DAC stream.
export function performerLayout(project,time,composition=project){
  const suits=project.tracks.filter(t=>t.type==='suit'),lasers=project.tracks.filter(t=>t.type==='laser');
  const source=suits.find(t=>t.id===project.effectSpace?.actorTrackId)||suits[0];
  const center=source.position,spacing=2.6,spread=project.stage.rigHeight*.53;
  const offset=[(center[0]-lasers[0].position[0])/spread,(center[2]-lasers[0].position[2])/spread];
  const frame=compositeLaserFrame(composition,time,lasers[0].id);
  const paths=frame.paths.map(path=>({...path,points:path.points.map(p=>[p[0]-offset[0],p[1]-offset[1]])}));
  let maximum=1;for(const path of paths)for(const p of path.points)for(const v of p)maximum=Math.max(maximum,Math.abs(v));
  const drawing=projectDrawing({paths:paths.map(path=>({...path,points:path.points.map(p=>p.map(v=>v/maximum))}))},project.projection);
  const first=lasers.filter(t=>trackEnabled(project,t)).map(t=>activeCue(t.cues,time)).find(Boolean);
  const discrete=drawing.paths.length>0&&drawing.paths.every(path=>{
    const [a]=path.points;return path.points.every(p=>Math.hypot(p[0]-a[0],p[1]-a[1])<.02);
  });
  return {positions:Array.from({length:3},(_,i)=>[center[0]+(i-1)*spacing,center[1],center[2]]),
    // Ceiling mounts are fixed in stage space, independent of the body pose.
    projectors:Array.from({length:3},(_,i)=>[(i-1)*spacing,project.stage.rigHeight,-.3]),spread,
    sourceSuitIndex:suits.indexOf(source),drawing,discrete,
    height:first?.projectionHeight??(['hands','handPinch'].includes(first?.shape)?1.235:.035),
    lit:drawing.paths.some(p=>p.color!=='#000000'&&p.points.length>1)};
}
