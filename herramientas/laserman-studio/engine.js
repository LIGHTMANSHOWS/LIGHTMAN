import {effectTime,recordedMotionAt,placeRecordedFrame,validateRecordedMotion} from './timed-motion.js';
import {animatedCue,animationClock,motionTime,validateAnimation} from './keyframes.js';
import {TRANSITION_TYPES,TRANSITION_CURVES,transitionState,blendLaserFrames} from './transitions.js';
import {validateProject as validateLaserProject} from './laser.js';
import {validateProjection} from './projection.js';
import {validatePerformerSpace,validateEffectAnchor,anchorDrawing} from './performer-space.js';
import {sequenceProjectAt,validateSequence,colorFrame} from './sequence-context.js';
export const BPM=128;
export const BEAT=60/BPM;
export const DURATION=180;
export const COLORS=['#00e5ff','#b55cff','#4aff9c','#ff4545','#ffbe39'];
export const LASER_SHAPES=['line','fan','ring','square','wave','tunnel','hands'];
export const REFERENCE_SHAPES=['orbitSquare','beamCage','needle','splitBeams','blade','handPinch','beamFan','prism'];
export const SHAPE_NAMES={line:'Línea',fan:'Abanico',ring:'Anillo',square:'Cuadrado',triangle:'Triángulo',diamond:'Diamante',pentagon:'Pentágono',hexagon:'Hexágono',polygon:'Polígono regular',wave:'Onda',tunnel:'Túnel',hands:'Hacia las manos',orbitSquare:'Cuadrado giratorio',beamCage:'Corona de haces',needle:'Haz móvil',splitBeams:'Doble haz',blade:'Cuchilla de luz',handPinch:'Pinza a las manos',beamFan:'Abanico de rayos',prism:'Túnel prisma RGB',custom:'Fotogramas de Laser Studio'};
export const EFFECTS={fade:'Color fijo',wave:'Onda',wipe:'Barrido',meteor:'Meteoro',pulse:'Pulso',bars:'Barras',twinkle:'Destellos',confetti:'Confeti',strobe:'Estrobo'};
export const SECTIONS=[{time:0,name:'Entrada'},{time:30,name:'Geometría'},{time:60,name:'Primer drop'},{time:90,name:'Diálogo'},{time:120,name:'Segundo drop'},{time:150,name:'Final'}];
export const uid=()=>globalThis.crypto.randomUUID();
export const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const finite=(v,a,b)=>Number.isFinite(v)&&v>=a&&v<=b;

export function demoProject(){
  const tracks=[];
  for(let i=0;i<3;i++){
    const cues=[];
    for(let bar=0;bar<96;bar+=4){
      const phase=Math.floor(bar/16),start=bar*4*BEAT;
      cues.push({id:uid(),name:SHAPE_NAMES[LASER_SHAPES[(bar/4+i+phase)%7]],start,duration:16*BEAT-(phase===0?BEAT:0),
        shape:LASER_SHAPES[(bar/4+i+phase)%7],color:COLORS[(phase+i)%COLORS.length],enabled:true,
        size:.5+(phase%3)*.12,rotation:i*12,rotationEnd:i*12+(phase%2?90:-90),panX:0,panZ:0,
        transition:phase>0?'morph':'cut'});
    }
    tracks.push({id:'laser-'+(i+1),name:'Láser superior '+(i+1),type:'laser',enabled:true,solo:false,color:COLORS[i],
      position:[(i-1)*2.4,4,-.3],cues,patch:{device:''}});
  }
  for(let i=0;i<3;i++){
    const cues=[],hands={left:[],right:[]};
    for(let bar=0;bar<96;bar+=2){
      const section=Math.floor(bar/16),effect=['wave','wipe','meteor','bars','pulse','confetti'][section];
      cues.push({id:uid(),name:EFFECTS[effect],start:bar*4*BEAT,duration:8*BEAT,effect,color:COLORS[(section+i)%5],
        targets:['all'],speed:1,intensity:100,enabled:true});
      for(const [side,offset] of [['left',0],['right',1]]){
        const at=(bar*4+((i+offset)%3))*BEAT;
        hands[side].push({id:uid(),name:side==='left'?'Mano izquierda':'Mano derecha',start:at,
          duration:(section===2||section===4?3:1)*BEAT,color:i===1?'#00ff66':'#00e5ff',enabled:true});
      }
    }
    tracks.push({id:'suit-'+(i+1),name:'Traje ninja '+(i+1),type:'suit',enabled:true,solo:false,color:COLORS[i],
      position:[(i-1)*2.4,0,0],cues,hands,patch:{ip:'',universe:i*4,handUniverse:20,handLeft:i*2+1,handRight:i*2+2}});
  }
  return {format:'lightman-laserman',version:1,name:'LASERMAN · Neon Protocol',duration:DURATION,bpm:BPM,markers:[],
    stage:{width:10,depth:6,rigHeight:4},audio:{url:'assets/neon-protocol.wav',name:'NEON PROTOCOL · Original LIGHTMAN',offset:0},tracks};
}

export function validateProject(p){
  if(p?.laserScale!==undefined&&!finite(p.laserScale,.05,2))throw Error('Amplitud general del láser no válida.');
  if(p?.projection!==undefined)validateProjection(p.projection);
  if(!p||p.format!=='lightman-laserman'||p.version!==1||!Array.isArray(p.tracks)||p.tracks.length!==6)throw Error('Proyecto LASERMAN no válido.');
  if(typeof p.name!=='string'||p.name.length>100||!finite(p.duration,1,1200)||!finite(p.bpm,40,240))throw Error('Duración, nombre o BPM no válidos.');
  if(p.audio&&(!/^assets\/[a-zA-Z0-9_.-]+$/.test(p.audio.url)||typeof p.audio.name!=='string'||p.audio.name.length>200||!finite(p.audio.offset??0,-1200,1200)))throw Error('Referencia de audio no válida.');
  if(p.audio?.volume!==undefined&&!finite(p.audio.volume,0,1))throw Error('Volumen de audio no válido.');
  if(p.analysis?.url!==undefined&&!/^assets\/[a-zA-Z0-9_.-]+\.json$/.test(p.analysis.url))throw Error('Referencia de análisis no válida.');
  if(p.sections!==undefined&&(!Array.isArray(p.sections)||p.sections.length>512||p.sections.some((s,i)=>!s||!finite(s.time,0,p.duration)||typeof s.name!=='string'||s.name.length>100||(i>0&&s.time<p.sections[i-1].time))))throw Error('Secciones del show no válidas.');
  if(p.choreography!==undefined){
    const c=p.choreography,poses=['ready','cage','spread','lift','grabLeft','grabRight','slice','crouch','bow'];
    if(!c||typeof c.enabled!=='boolean'||!finite(c.bpm,40,240)||!Array.isArray(c.sections)||c.sections.length>1024||c.sections.some(s=>!s||!finite(s.start,0,p.duration)||!finite(s.end,s.start,p.duration)||s.end<=s.start||!poses.includes(s.pose)||!finite(s.energy,0,1)))throw Error('Coreografía no válida.');
  }
  if(!p.stage||!finite(p.stage.width,4,30)||!finite(p.stage.depth,3,20)||!finite(p.stage.rigHeight,2,12))throw Error('Dimensiones de escenario no válidas.');
  const ids=new Set();let count=0;
  for(const t of p.tracks){
    if(!['laser','suit'].includes(t.type)||typeof t.id!=='string'||ids.has(t.id)||typeof t.name!=='string'||t.name.length>80)throw Error('Pista no válida o duplicada.');
    ids.add(t.id);
    if(!Array.isArray(t.position)||t.position.length!==3||t.position.some(v=>!finite(v,-30,30))||!Array.isArray(t.cues))throw Error('Posición o secuencia no válida.');
    const lists=t.type==='suit'?[t.cues,t.hands?.left,t.hands?.right]:[t.cues];
    for(const list of lists){
      if(!Array.isArray(list))throw Error('Falta una pista de mano.');
      for(const c of list){
        if(++count>12000||!c||typeof c.id!=='string'||ids.has(c.id)||!finite(c.start,0,p.duration)||!finite(c.duration,.025,p.duration)||c.start+c.duration>p.duration+.001||!/^#[0-9a-f]{6}$/i.test(c.color))throw Error('Bloque de tiempo no válido.');
        ids.add(c.id);
        if(c.layer!==undefined&&typeof c.layer!=='boolean')throw Error('Capa LED no válida.');
        if(c.transition!==undefined&&!Object.hasOwn(TRANSITION_TYPES,c.transition))throw Error('Transición no válida.');
        if(c.transitionDuration!==undefined&&!finite(c.transitionDuration,.01,1200))throw Error('Duración de transición no válida.');
        if(c.transitionUnit!==undefined&&!['seconds','beats'].includes(c.transitionUnit))throw Error('Unidad de transición no válida.');
        if(c.transitionCurve!==undefined&&!Object.hasOwn(TRANSITION_CURVES,c.transitionCurve))throw Error('Curva de transición no válida.');
        if(c.motionStrength!==undefined&&!finite(c.motionStrength,0,1))throw Error('Fuerza del movimiento no válida.');
        validateRecordedMotion(c);validateAnimation(c,list===t.cues?t.type:'hand');validateEffectAnchor(c.effectAnchor);
        if(c.effectSpeed!==undefined&&!finite(c.effectSpeed,0,4))throw Error('Velocidad láser no válida.');
        if(c.beamCount!==undefined&&(!Number.isInteger(c.beamCount)||!finite(c.beamCount,3,32)))throw Error('Cantidad de haces no válida.');
        if(c.polygonSides!==undefined&&(!Number.isInteger(c.polygonSides)||!finite(c.polygonSides,3,32)))throw Error('El polígono debe tener entre 3 y 32 lados.');
        if(c.projectionHeight!==undefined&&!finite(c.projectionHeight,0,12))throw Error('Altura de figura no válida.');
        if(c.previewOrigin!==undefined&&!['projector','left-hand','right-hand'].includes(c.previewOrigin))throw Error('Origen visual no válido.');
        if(c.previewRays!==undefined&&typeof c.previewRays!=='boolean')throw Error('Visibilidad de haces no válida.');
        if(c.motionEnabled!==undefined&&typeof c.motionEnabled!=='boolean')throw Error('Estado de movimiento no válido.');
        if(c.motionBase!==undefined&&(!finite(c.motionBase.size,.05,1)||!finite(c.motionBase.rotation,-720,720)||!finite(c.motionBase.rotationEnd,-720,720)||!finite(c.motionBase.panX,-3,3)||!finite(c.motionBase.panZ,-3,3)))throw Error('Base del movimiento no válida.');
        if(c.sourceOffset!==undefined&&!finite(c.sourceOffset,0,1200))throw Error('Recorte de bloque no válido.');
        if(c.sourceDuration!==undefined&&!finite(c.sourceDuration,.025,1200))throw Error('Duración original no válida.');
        if(c.sequenceStart!==undefined&&!finite(c.sequenceStart,0,p.duration))throw Error('Origen temporal de secuencia no válido.');
        if(c.sequenceId!==undefined&&(typeof c.sequenceId!=='string'||c.sequenceId.length>100))throw Error('Tramo de secuencia no válido.');
        if(c.motion!==undefined&&(!Array.isArray(c.motion)||c.motion.length>1024||c.motion.some((k,i)=>!finite(k.at,0,1200)||(i>0&&k.at<c.motion[i-1].at)||!finite(k.size,.05,1)||!finite(k.rotation,-720,720)||!finite(k.panX,-3,3)||!finite(k.panZ,-3,3))))throw Error('Movimiento láser no válido.');
        if(list===t.cues&&t.type==='laser'&&(!Object.hasOwn(SHAPE_NAMES,c.shape)||!finite(c.size,.05,1)||!finite(c.rotation,-720,720)||!finite(c.rotationEnd,-720,720)||!finite(c.panX,-3,3)||!finite(c.panZ,-3,3)||!Object.hasOwn(TRANSITION_TYPES,c.transition)))throw Error('Animación láser no válida.');
        if(list===t.cues&&t.type==='laser'&&c.shape==='custom')validateLaserProject({version:1,name:'Clip',fps:c.customFps,frames:c.customFrames});
        if(list===t.cues&&t.type==='suit'&&(!Object.hasOwn(EFFECTS,c.effect)||!Array.isArray(c.targets)||!c.targets.length||!finite(c.speed,.1,4)||!finite(c.intensity,0,100)))throw Error('Efecto LED no válido.');
      }
    }
  }
  if(p.tracks.filter(t=>t.type==='laser').length!==3)throw Error('Se necesitan tres láseres y tres trajes.');
  if(p.markers!==undefined&&(!Array.isArray(p.markers)||p.markers.length>1024))throw Error('Demasiados marcadores.');
  for(const m of p.markers||[]){
    if(typeof m.id!=='string'||ids.has(m.id)||typeof m.name!=='string'||m.name.length>100||!finite(m.start,0,p.duration)||(m.end!=null&&(!finite(m.end,0,p.duration)||m.end-m.start<.025))||!/^#[a-f0-9]{6}$/i.test(m.color))throw Error('Marcador no válido.');
    ids.add(m.id);
  }
  validatePerformerSpace(p);
  validateSequence(p);
  return {...structuredClone(p),markers:structuredClone(p.markers||[])};
}

export function activeCue(cues,time){
  let selected=null;
  for(const c of cues)if(c.enabled!==false&&time>=c.start&&time<c.start+c.duration&&(!selected||c.start>=selected.start))selected=c;
  return selected;
}
export function trackEnabled(project,track){
  return track.enabled!==false&&(!project.tracks.some(t=>t.solo)||track.solo===true);
}
export function sourceTime(cue,time){return time-cue.start+(cue.sourceOffset||0);}
export function progress(cue,time){return clamp(motionTime(cue,time)/(cue.sourceDuration||cue.duration),0,1);}
function motionValue(cue,time){
  const points=cue.motion;if(!points?.length)return null;
  const local=motionTime(cue,time);let left=points[0],right=points.at(-1);
  for(let i=1;i<points.length;i++)if(points[i].at>=local){left=points[i-1];right=points[i];break;}
  const t=right.at>left.at?clamp((local-left.at)/(right.at-left.at),0,1):0;
  return Object.fromEntries(['size','rotation','panX','panZ'].map(k=>[k,left[k]+(right[k]-left[k])*t]));
}
function baseShape(shape,n=96,polygonSides=5){
  const sides={triangle:3,diamond:4,pentagon:5,hexagon:6,polygon:polygonSides}[shape];
  if(sides){const vertices=Array.from({length:sides},(_,i)=>{const a=Math.PI/2+i*Math.PI*2/sides;return [Math.cos(a),Math.sin(a)];});return [...vertices,[...vertices[0]]];}
  if(shape==='line')return Array.from({length:n},(_,i)=>[-1+2*i/(n-1),0]);
  if(shape==='square')return Array.from({length:n+1},(_,i)=>{const s=(i%n)/n*4,j=Math.floor(s),f=s-j;return [[-1+2*f,-1],[1,-1+2*f],[1-2*f,1],[-1,1-2*f]][j];});
  if(shape==='fan')return Array.from({length:24},(_,i)=>[-1+2*i/23,Math.abs(Math.sin(i*Math.PI))*.01]);
  if(shape==='hands')return Array.from({length:n},(_,i)=>[-1+2*i/(n-1),0]);
  return Array.from({length:n+1},(_,i)=>{const a=i/n*Math.PI*2;return shape==='wave'?[Math.cos(a),Math.sin(3*a)*.45]:[Math.cos(a),Math.sin(a)];});
}
export function rawLaserFrame(c,time,height=4,position=[0,4,-.3]){
  c=animatedCue(c,time);
  if(c.sizePulse)c={...c,size:Math.min(1,c.size+c.sizePulse)};
  const sample=recordedMotionAt(c,time);
  if(!sample)return finishKeyframeFrame(proceduralLaserFrame(c,time,height,position),c);
  const neutral={...c,size:1,rotation:0,rotationEnd:0,panX:0,panZ:0,motionEnabled:false,
    animation:undefined,effectClock:'clip',effectSpeed:0,effectPhase:sample.phase+(c.effectPhase||0),recorded:true};
  const frame=proceduralLaserFrame(neutral,time,height,position);
  return finishKeyframeFrame(placeRecordedFrame(frame,c,{...sample,local:motionTime(c,time)},height),c);
}
function finishKeyframeFrame(frame,cue){
  const opening=cue.opening??1,depth=cue.depthScale??1,intensity=(cue.laserIntensity??100)/100;
  const forceColor=cue.animation?.enabled!==false&&cue.animation?.curves?.color?.length;
  const pilot=(cue.pilotIntensity??0)/100;
  if(opening===1&&depth===1&&intensity===1&&!forceColor&&pilot===0)return frame;
  let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity;
  for(const path of frame.paths)for(const [x,z] of path.points){minX=Math.min(minX,x);maxX=Math.max(maxX,x);minZ=Math.min(minZ,z);maxZ=Math.max(maxZ,z);}
  const cx=(minX+maxX)/2,cz=(minZ+maxZ)/2;
  const paths=frame.paths.map(path=>({color:dimColor(forceColor?cue.color:path.color,intensity),
    points:path.points.map(([x,z])=>[clamp(cx+(x-cx)*opening,-1,1),clamp(cz+(z-cz)*depth,-1,1)])}));
  if(pilot>0&&Number.isFinite(cx))for(const offset of [-1,0,1]){
    const x=clamp((cue.pilotCenter??cx)+offset*(cue.pilotWidth??.04),-.998,.998);
    paths.push({color:dimColor(cue.pilotColor??'#4cff1d',pilot),points:[[x-.002,cz],[x+.002,cz]]});
  }
  return {paths};
}
function dimColor(color,amount){return '#'+[1,3,5].map(i=>Math.round(parseInt(color.slice(i,i+2),16)*amount).toString(16).padStart(2,'0')).join('');}
function proceduralLaserFrame(c,time,height=4,position=[0,4,-.3]){
  if(c.shape==='hands'){
    const spread=height*.53,z=(.1-position[2])/spread;
    let points=[[-.56/spread,z],[.56/spread,z]];
    if(c.animation?.enabled!==false&&c.animation){
      const curves=c.animation.curves,a=curves.rotation?c.rotation*Math.PI/180:0,size=curves.size?c.size/c.animationBaseSize:1;
      points=points.map(([x,y])=>[clamp((x*Math.cos(a)-y*Math.sin(a))*size+(curves.panX?c.panX/spread:0),-1,1),clamp((x*Math.sin(a)+y*Math.cos(a))*size+(curves.panZ?c.panZ/spread:0),-1,1)]);
    }
    return {paths:[{color:c.color,points}]};
  }
  const p=progress(c,time),motion=c.motionEnabled===false?null:motionValue(c,time),base=c.motionBase||c;
  const strength=c.motionStrength??1;
  const rotation=c.rotation+(c.rotationEnd-c.rotation)*p;
  const baseRotation=base.rotation+(base.rotationEnd-base.rotation)*p;
  const a=(rotation+(motion?(motion.rotation-baseRotation)*strength:0))*Math.PI/180;
  const panX=c.panX+(motion?(motion.panX-base.panX)*strength:0),panZ=c.panZ+(motion?(motion.panZ-base.panZ)*strength:0);
  const baseSize=c.size+(motion?(motion.size-base.size)*strength:0);
  const spread=height*.53;
  const transform=([x,y])=>[clamp((x*Math.cos(a)-y*Math.sin(a))*baseSize+panX/spread,-1,1),clamp((x*Math.sin(a)+y*Math.cos(a))*baseSize+panZ/spread,-1,1)];
  if(c.shape==='custom'){
    const index=((Math.floor(animationClock(c,time)*c.customFps)%c.customFrames.length)+c.customFrames.length)%c.customFrames.length;
    return {paths:c.customFrames[index].paths.map(path=>({color:path.color,points:path.points.map(transform)}))};
  }
  if(REFERENCE_SHAPES.includes(c.shape)){
    const phase=effectTime(c,time),paths=[];
    const path=points=>paths.push({color:c.color,points:points.map(transform)});
    // A very short lit stroke represents an individual beam; disconnected
    // paths retain scanner blanking instead of drawing an unwanted polygon.
    const spot=(x,y)=>path([[x-.002,y],[x+.002,y]]);
    if(c.shape==='orbitSquare'){
      const turn=phase*.32,cos=Math.cos(turn),sin=Math.sin(turn);
      path([[-1,-1],[1,-1],[1,1],[-1,1],[-1,-1]].map(([x,y])=>[x*cos-y*sin,x*sin+y*cos]));
    }else if(c.shape==='beamCage'){
      const count=c.beamCount??8;
      for(let i=0;i<count;i++){const angle=i/count*Math.PI*2+phase*.32;spot(Math.cos(angle),Math.sin(angle));}
    }else if(c.shape==='beamFan'){
      const count=c.beamCount??8;
      for(let i=0;i<count;i++)spot(-1+2*i/(count-1),c.recorded?0:Math.sin(phase*.8)*.2);
    }else if(c.shape==='prism'){
      const palette=['#ff334b','#ffb83d','#caff35','#24ff7c','#31dfff','#825cff','#ff4eda'];
      const segments=palette.length;
      for(let i=0;i<segments;i++){
        const points=Array.from({length:15},(_,j)=>{const angle=(i+j/14)/segments*Math.PI*2+phase*.35;return [Math.cos(angle),Math.sin(angle)];});
        paths.push({color:palette[i],points:points.map(transform)});
      }
    }else if(c.shape==='needle'){
      if(c.recorded)spot(0,0);else spot(Math.sin(phase*1.3)*.75,Math.cos(phase*.9)*.65);
    }else if(c.shape==='splitBeams'){
      const gap=c.recorded?1:.30+.40*(.5+.5*Math.sin(phase*1.6)),z=c.recorded?0:Math.sin(phase*.8)*.35;
      spot(-gap,z);spot(gap,z);
    }else if(c.shape==='blade'){
      const angle=c.recorded?0:Math.sin(phase*.9)*1.1,z=c.recorded?0:Math.sin(phase*1.5)*.55;
      path([[-Math.cos(angle),z-Math.sin(angle)*.45],[Math.cos(angle),z+Math.sin(angle)*.45]]);
    }else if(c.shape==='handPinch'){
      const spread=height*.53,reach=(.56/spread)/Math.max(.05,c.size),z=(.1-position[2])/spread/Math.max(.05,c.size);
      // Converges from a broad sheet to two disconnected hand-height beams.
      const closure=.5-.5*Math.cos(phase*Math.PI),gap=reach+(1-closure)*.65;
      if(closure<.94)path([[-gap,z],[gap,z]]);else{spot(-gap,z);spot(gap,z);}
    }
    return {paths};
  }
  let points=baseShape(c.shape,96,c.polygonSides??5);
  const clockProgress=clamp(animationClock(c,time)/(c.sourceDuration||c.duration),0,1);
  const size=c.shape==='tunnel'?baseSize*(.65+.25*Math.sin(clockProgress*Math.PI*4)):baseSize;
  if(c.shape==='square')points=[[-1,-1],[1,-1],[1,1],[-1,1],[-1,-1]];
  points=points.map(([x,y])=>[clamp((x*Math.cos(a)-y*Math.sin(a))*size+panX/spread,-1,1),clamp((x*Math.sin(a)+y*Math.cos(a))*size+panZ/spread,-1,1)]);
  return {paths:[{color:c.color,points}]};
}

function laserPlacement(cue,frame){
  const origin=cue?.previewOrigin||'projector';
  const customDots=cue?.shape==='custom'&&frame.paths.length>0&&frame.paths.every(p=>p.points.every(q=>Math.hypot(q[0]-p.points[0][0],q[1]-p.points[0][1])<.015));
  const discrete=!!cue&&(customDots||['beamCage','beamFan','needle','splitBeams'].includes(cue.shape)||(cue.shape==='handPinch'&&frame.paths.length>1));
  return {height:cue?.projectionHeight??(['hands','handPinch'].includes(cue?.shape)?1.235:.035),
    weights:{projector:origin==='projector'?1:0,'left-hand':origin==='left-hand'?1:0,'right-hand':origin==='right-hand'?1:0},
    discrete,rayOpacity:discrete?.86:.075};
}
export function laserFrame(track,time,height=4,bpm=128,project=null){
  if(project?.sequenceParts){project=sequenceProjectAt(project,time);track={...project.tracks.find(t=>t.id===track.id),cues:track.cues};height=project.stage.rigHeight;bpm=project.bpm;}
  const cue=activeCue(track.cues,time);if(!cue)return {paths:[]};
  const frame=evaluateLaserCue(track,cue,time,height,bpm,0,project);
  if(!project?.laserScale||project.laserScale===1||project.effectSpace)return colorFrame(frame,project?.colorPolicy);
  const maximum=Math.max(0,...frame.paths.flatMap(path=>path.points.flatMap(p=>p.map(Math.abs))));
  const scale=Math.min(project.laserScale,maximum>0?.98/maximum:project.laserScale);
  const result={paths:frame.paths.map(path=>({...path,points:path.points.map(p=>p.map(v=>v*scale))}))};
  Object.defineProperty(result,'placement',{value:frame.placement,configurable:true});return colorFrame(result,project?.colorPolicy);
}
function evaluateLaserCue(track,cue,time,height,bpm,depth,project){
  const current=anchorDrawing(rawLaserFrame(cue,time,height,track.position),track,cue,height,project),target=laserPlacement(animatedCue(cue,time),current);
  const state=transitionState(track,cue,time,bpm);
  if(!state.active||state.amount>=1-1e-6||depth>=24){Object.defineProperty(current,'placement',{value:target,configurable:true});return current;}
  const previous=state.previous,priorTime=previous?Math.min(cue.start-1e-7,previous.start+previous.duration-1e-7):cue.start;
  // Freeze the actual outgoing image at the join, including any unfinished
  // transition in an overlapping clip, rather than jumping to its raw shape.
  const prior=previous?evaluateLaserCue(track,previous,priorTime,height,bpm,depth+1,project):{paths:[]};
  const source=previous?(prior.placement||laserPlacement(previous,prior)):target;
  const anchors={from:prior,
    to:anchorDrawing(rawLaserFrame(cue,cue.start,height,track.position),track,cue,height,project)};
  const frame=blendLaserFrames(prior,current,state.amount,cue.transition,previous,cue,anchors);
  const u=state.amount;
  const placement={height:source.height+(target.height-source.height)*u,
    weights:Object.fromEntries(Object.keys(target.weights).map(key=>[key,source.weights[key]*(1-u)+target.weights[key]*u])),
    discrete:u<=1e-9?source.discrete:source.discrete&&target.discrete,
    rayOpacity:source.rayOpacity+(target.rayOpacity-source.rayOpacity)*u};
  if(placement.discrete&&frame.paths.length){
    placement.rayOpacity*=((prior.paths.length||1)*(1-u)+current.paths.length*u)/frame.paths.length;
  }else if(source.discrete!==target.discrete){
    placement.rayOpacity=(source.rayOpacity*(source.discrete?prior.paths.length:28)*(1-u)+target.rayOpacity*(target.discrete?current.paths.length:28)*u)/28;
  }
  Object.defineProperty(frame,'placement',{value:placement,configurable:true});
  return frame;
}

export function cueList(project,row){
  const [id,hand]=row.split('/'),t=project.tracks.find(t=>t.id===id);
  return hand?t.hands[hand]:t.cues;
}
export function timelineRows(project,expanded){
  return project.tracks.flatMap(t=>[{id:t.id,track:t,label:t.name,type:t.type,cues:t.cues},
    ...(t.type==='suit'&&expanded.has(t.id)?['left','right'].map(h=>({id:t.id+'/'+h,track:t,label:h==='left'?'Mano izquierda':'Mano derecha',type:'hand',cues:t.hands[h]})):[])]);
}
export function newCue(type,start,duration=4*BEAT){
  const c={id:uid(),name:type==='hand'?'Encendido':type==='laser'?'Anillo':'Onda',start,duration,color:'#00e5ff',enabled:true};
  if(type==='laser')Object.assign(c,{shape:'ring',size:.65,rotation:0,rotationEnd:0,panX:0,panZ:0,transition:'cut',transitionDuration:.6,transitionUnit:'seconds',transitionCurve:'smooth'});
  if(type==='suit')Object.assign(c,{effect:'wave',targets:['all'],speed:1,intensity:100});
  return c;
}
