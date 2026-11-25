import {newCue,uid,clamp} from './engine.js?v=1.8.1-smi';
import {replaceWindow} from './timeline-model.js?v=1.8.1-smi';

export const LASER_REFERENCE={
  url:'https://www.youtube.com/shorts/9Xt6s-nYO7M',
  name:'Laser Assassin · efectos del video',duration:24
};

// Visual reconstruction of the supplied short, rounded to a 24 s phrase.
// Timings are approximate; the soundtrack remains the project's own audio.
const sequence=[
  [0,2.25,'orbitSquare','#39ff14',{size:.58}],
  [2.25,4.25,'blade','#39ff14',{size:.78,projectionHeight:1.18,effectSpeed:1.3}],
  [4.25,6.25,'orbitSquare','#39ff14',{size:.58,effectSpeed:.5}],
  [6.25,8.75,'beamCage','#ae4dff',{size:.72,beamCount:8}],
  [8.75,10.25,'needle','#dec6ff',{size:.75,effectSpeed:.55}],
  [10.25,12,'splitBeams','#39ff14',{size:.8,effectSpeed:.75}],
  [12,14.25,'handPinch','#39ff14',{size:.62,projectionHeight:1.235,effectSpeed:.7}],
  [14.25,16.5,'splitBeams','#39ff14',{size:.65,effectSpeed:1.2}],
  [16.5,18.75,'blade','#39ff14',{size:.65,panX:.45,effectSpeed:.7}],
  [18.75,21.25,'blade','#39ff14',{size:.8,projectionHeight:.95,effectSpeed:1.4}],
  [21.25,23.5,'needle','#39ff14',{size:.62,effectSpeed:.35}]
];

export function insertLaserReference(project,at=0){
  const start=clamp(at,0,project.duration),duration=Math.min(LASER_REFERENCE.duration,project.duration-start);
  if(duration<.5)throw Error('Deja al menos medio segundo libre antes del final del show.');
  const scale=duration/LASER_REFERENCE.duration;
  for(const [i,track] of project.tracks.filter(t=>t.type==='laser').entries()){
    // Trim the full phrase first, including its final half-second blackout.
    const mask={...newCue('laser',start,duration),enabled:false};
    const retained=replaceWindow(track.cues,mask).filter(c=>c.id!==mask.id);
    const cues=sequence.map(([from,to,shape,color,settings])=>({
      ...newCue('laser',start+from*scale,(to-from)*scale),shape,color,
      beamCount:8,projectionHeight:.035,...settings,
      effectSpeed:clamp((settings.effectSpeed??1)/scale,.1,4),
      // Mirrors the outside performers; all three keep the reference's cuts.
      rotation:i===1?0:(i-1)*8,rotationEnd:i===1?0:(i-1)*8,
      name:({orbitSquare:'Cuadrado verde',beamCage:'Corona violeta',needle:'Haz móvil',splitBeams:'Doble haz',blade:'Cuchilla verde',handPinch:'Pinza a las manos'})[shape]
    }));
    track.cues=[...retained,...cues].sort((a,b)=>a.start-b.start);
  }
  const marker={id:uid(),name:LASER_REFERENCE.name,start,end:start+duration,color:'#39ff14',kind:'range'};
  project.markers??=[];project.markers.push(marker);
  return {start,end:start+duration,marker};
}
