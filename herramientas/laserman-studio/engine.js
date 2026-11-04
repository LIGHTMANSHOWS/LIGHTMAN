import {validateProject as validateLaserProject} from './laser.js';
export const BPM=128;
export const BEAT=60/BPM;
export const DURATION=180;
export const COLORS=['#00e5ff','#b55cff','#4aff9c','#ff4545','#ffbe39'];
export const LASER_SHAPES=['line','fan','ring','square','wave','tunnel','hands'];
export const SHAPE_NAMES={line:'Línea',fan:'Abanico',ring:'Anillo',square:'Cuadrado',wave:'Onda',tunnel:'Túnel',hands:'Hacia las manos',custom:'Fotogramas de Laser Studio'};
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
  if(!p||p.format!=='lightman-laserman'||p.version!==1||!Array.isArray(p.tracks)||p.tracks.length!==6)throw Error('Proyecto LASERMAN no válido.');
  if(typeof p.name!=='string'||p.name.length>100||!finite(p.duration,1,1200)||!finite(p.bpm,40,240))throw Error('Duración, nombre o BPM no válidos.');
  if(p.audio&&(!/^assets\/[a-zA-Z0-9_.-]+$/.test(p.audio.url)||typeof p.audio.name!=='string'||p.audio.name.length>200||!finite(p.audio.offset??0,-1200,1200)))throw Error('Referencia de audio no válida.');
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
        if(c.motionStrength!==undefined&&!finite(c.motionStrength,0,1))throw Error('Fuerza del movimiento no válida.');
        if(c.motionEnabled!==undefined&&typeof c.motionEnabled!=='boolean')throw Error('Estado de movimiento no válido.');
        if(c.motionBase!==undefined&&(!finite(c.motionBase.size,.05,1)||!finite(c.motionBase.rotation,-720,720)||!finite(c.motionBase.rotationEnd,-720,720)||!finite(c.motionBase.panX,-3,3)||!finite(c.motionBase.panZ,-3,3)))throw Error('Base del movimiento no válida.');
        if(c.sourceOffset!==undefined&&!finite(c.sourceOffset,0,1200))throw Error('Recorte de bloque no válido.');
        if(c.sourceDuration!==undefined&&!finite(c.sourceDuration,.025,1200))throw Error('Duración original no válida.');
        if(c.motion!==undefined&&(!Array.isArray(c.motion)||c.motion.length>1024||c.motion.some((k,i)=>!finite(k.at,0,1200)||(i>0&&k.at<c.motion[i-1].at)||!finite(k.size,.05,1)||!finite(k.rotation,-720,720)||!finite(k.panX,-3,3)||!finite(k.panZ,-3,3))))throw Error('Movimiento láser no válido.');
        if(list===t.cues&&t.type==='laser'&&(!Object.hasOwn(SHAPE_NAMES,c.shape)||!finite(c.size,.05,1)||!finite(c.rotation,-720,720)||!finite(c.rotationEnd,-720,720)||!finite(c.panX,-3,3)||!finite(c.panZ,-3,3)||!['cut','morph'].includes(c.transition)))throw Error('Animación láser no válida.');
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
export function progress(cue,time){return clamp(sourceTime(cue,time)/(cue.sourceDuration||cue.duration),0,1);}
function motionValue(cue,time){
  const points=cue.motion;if(!points?.length)return null;
  const local=sourceTime(cue,time);let left=points[0],right=points.at(-1);
  for(let i=1;i<points.length;i++)if(points[i].at>=local){left=points[i-1];right=points[i];break;}
  const t=right.at>left.at?clamp((local-left.at)/(right.at-left.at),0,1):0;
  return Object.fromEntries(['size','rotation','panX','panZ'].map(k=>[k,left[k]+(right[k]-left[k])*t]));
}
function baseShape(shape,n=96){
  if(shape==='line')return Array.from({length:n},(_,i)=>[-1+2*i/(n-1),0]);
  if(shape==='square')return Array.from({length:n+1},(_,i)=>{const s=(i%n)/n*4,j=Math.floor(s),f=s-j;return [[-1+2*f,-1],[1,-1+2*f],[1-2*f,1],[-1,1-2*f]][j];});
  if(shape==='fan')return Array.from({length:24},(_,i)=>[-1+2*i/23,Math.abs(Math.sin(i*Math.PI))*.01]);
  if(shape==='hands')return Array.from({length:n},(_,i)=>[-1+2*i/(n-1),0]);
  return Array.from({length:n+1},(_,i)=>{const a=i/n*Math.PI*2;return shape==='wave'?[Math.cos(a),Math.sin(3*a)*.45]:[Math.cos(a),Math.sin(a)];});
}
export function laserFrame(track,time,height=4){
  const c=activeCue(track.cues,time);if(!c)return {paths:[]};
  if(c.shape==='hands'){
    const spread=height*.53,z=(.1-track.position[2])/spread;
    return {paths:[{color:c.color,points:[[-.56/spread,z],[.56/spread,z]]}]};
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
    const index=Math.floor(sourceTime(c,time)*c.customFps)%c.customFrames.length;
    return {paths:c.customFrames[index].paths.map(path=>({color:path.color,points:path.points.map(transform)}))};
  }
  let points=baseShape(c.shape);
  if(c.transition==='morph'&&p<.12){
    const prior=track.cues.filter(x=>x.start<c.start&&x.enabled!==false).sort((x,y)=>y.start-x.start)[0];
    if(prior&&prior.shape!=='custom'){const old=baseShape(prior.shape),f=p/.12;points=points.map(([x,y],i)=>{const q=old[Math.round(i/(points.length-1)*(old.length-1))];return [q[0]+(x-q[0])*f,q[1]+(y-q[1])*f];});}
  }
  const size=c.shape==='tunnel'?baseSize*(.65+.25*Math.sin(p*Math.PI*4)):baseSize;
  if(c.shape==='square'&&(c.transition==='cut'||p>=.12))points=[[-1,-1],[1,-1],[1,1],[-1,1],[-1,-1]];
  points=points.map(([x,y])=>[clamp((x*Math.cos(a)-y*Math.sin(a))*size+panX/spread,-1,1),clamp((x*Math.sin(a)+y*Math.cos(a))*size+panZ/spread,-1,1)]);
  return {paths:[{color:c.color,points}]};
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
  if(type==='laser')Object.assign(c,{shape:'ring',size:.65,rotation:0,rotationEnd:0,panX:0,panZ:0,transition:'cut'});
  if(type==='suit')Object.assign(c,{effect:'wave',targets:['all'],speed:1,intensity:100});
  return c;
}
