import {laserFrame,trackEnabled} from './engine.js';
import {encodeFB3Frame} from './fb3-wire.js';
import {projectDrawing,testDrawing} from './projection.js';
import {compositeLaserFrame} from './laser-composite.js';

export function routedTracks(project,settings){
  return project.tracks.map(t=>({...t,patch:t.type==='laser'?{device:t.id===settings.trackId?settings.device:''}:{}}));
}
export function buildSharedFrame(project,time,playing,settings,testPattern=null){
  const track=project.tracks.find(t=>t.type==='laser'&&t.id===settings.trackId);
  if(!track)throw Error('La pista seleccionada no existe en este show.');
  const source=testPattern?testDrawing(testPattern):playing?compositeLaserFrame(project,time,track.id):{paths:[]};
  const drawing=projectDrawing(projectDrawing(source,project.projection),settings.projection);
  const intensity=testPattern==='orientation'?.5:testPattern==='pilot'?Math.min(settings.intensity,.1):settings.intensity;
  const bytes=encodeFB3Frame(drawing,{kpps:settings.kpps??15,scale:settings.scale,intensity,startBlankPoints:9});
  let raw='';for(const b of bytes)raw+=String.fromCharCode(b);
  return {frames:[{trackId:track.id,frame:btoa(raw)}],suits:[]};
}
