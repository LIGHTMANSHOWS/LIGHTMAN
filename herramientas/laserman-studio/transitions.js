export const TRANSITION_TYPES={cut:'Corte',morph:'Transformar figura',fade:'Fundido cruzado',color:'Color gradual',wipe:'Barrido'};
export const TRANSITION_CURVES={linear:'Lineal',smooth:'Suave',easeIn:'Acelerar',easeOut:'Desacelerar'};
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
export function curveValue(value,curve='smooth'){
  const t=clamp(value);return curve==='linear'?t:curve==='easeIn'?t*t:curve==='easeOut'?1-(1-t)*(1-t):t*t*(3-2*t);
}
export function transitionSeconds(cue,bpm=128){
  if(!cue||!cue.transition||cue.transition==='cut')return 0;
  const value=cue.transitionDuration??(cue.transition==='morph'?(cue.sourceDuration||cue.duration)*.12:.6);
  return Math.min(cue.sourceDuration||cue.duration,value*(cue.transitionUnit==='beats'?60/bpm:1));
}
export function transitionWindow(cue,bpm=128){
  const remaining=Math.max(0,transitionSeconds(cue,bpm)-(cue.sourceOffset||0));
  return {start:cue.start,end:cue.start+Math.min(cue.duration,remaining)};
}
export function previousCue(track,cue){
  // A gap is a blackout, not a request to resurrect an earlier effect.
  return track.cues.filter(c=>c.id!==cue.id&&c.enabled!==false&&!c.layer&&(!cue.sequenceId||c.sequenceId===cue.sequenceId)&&c.start<cue.start&&c.start+c.duration>=cue.start-1e-6)
    .sort((a,b)=>b.start-a.start)[0]||null;
}
export function transitionState(track,cue,time,bpm=128){
  const seconds=transitionSeconds(cue,bpm),local=time-cue.start+(cue.sourceOffset||0);
  const progress=seconds>0?clamp(local/seconds):1;
  const active=seconds>0&&local>=0&&local<seconds;
  return {previous:active?previousCue(track,cue):null,seconds,progress,amount:curveValue(progress,cue.transitionCurve||'linear'),active};
}
export function mixColor(a,b,t){
  const x=parseInt(a.slice(1),16),y=parseInt(b.slice(1),16);
  return '#'+[16,8,0].map(shift=>Math.round(((x>>shift)&255)*(1-t)+((y>>shift)&255)*t).toString(16).padStart(2,'0')).join('');
}
function dim(frame,amount){
  return amount<=0?[]:frame.paths.map(path=>({...path,color:mixColor('#000000',path.color,amount)}));
}
function measure(points){
  const lengths=[0];for(let i=1;i<points.length;i++)lengths.push(lengths.at(-1)+Math.hypot(points[i][0]-points[i-1][0],points[i][1]-points[i-1][1]));
  return {points,lengths,total:lengths.at(-1)};
}
function pointAt(path,fraction){
  const distance=clamp(fraction)*path.total;
  let low=1,high=path.lengths.length-1;
  while(low<high){const middle=(low+high)>>1;if(path.lengths[middle]<distance)low=middle+1;else high=middle;}
  const j=low;
  const from=path.points[j-1],to=path.points[j]||from,span=path.lengths[j]-path.lengths[j-1],t=span>1e-12?(distance-path.lengths[j-1])/span:0;
  return [from[0]+(to[0]-from[0])*t,from[1]+(to[1]-from[1])*t];
}
function split(frame,count){
  if(!frame.paths.length)return [];
  const parts=frame.paths.map(path=>({...path,arc:measure(path.points),divisions:1}));
  for(let n=parts.length;n<count;n++){
    const largest=parts.reduce((a,b)=>a.arc.total/a.divisions>=b.arc.total/b.divisions?a:b);largest.divisions++;
  }
  return parts.flatMap(path=>Array.from({length:path.divisions},(_,i)=>{
    const from=i/path.divisions,to=(i+1)/path.divisions;
    const centre=pointAt(path.arc,(from+to)/2);
    return {color:path.color,arc:path.arc,from,to,centre};
  }));
}
function pathCapacity(cue){
  if(!cue)return 1;
  if(cue.shape==='custom')return Math.max(1,...cue.customFrames.map(frame=>frame.paths.length));
  return ['beamCage','beamFan'].includes(cue.shape)?cue.beamCount??8:cue.shape==='prism'?7:['handPinch','splitBeams'].includes(cue.shape)?2:1;
}
function match(a,b){
  const remaining=new Set(b.map((_,i)=>i));
  return a.map(part=>{
    let choice=-1,distance=Infinity;
    for(const j of remaining){const q=b[j].centre,d=Math.hypot(q[0]-part.centre[0],q[1]-part.centre[1]);if(d<distance){choice=j;distance=d;}}
    remaining.delete(choice);return choice;
  });
}
function alignment(a,b){
  const closed=part=>part.from===0&&part.to===1&&Math.hypot(part.arc.points[0][0]-part.arc.points.at(-1)[0],part.arc.points[0][1]-part.arc.points.at(-1)[1])<1e-6;
  const loop=closed(a)&&closed(b),steps=loop?32:1;
  let best={reverse:false,offset:0,loop},cost=Infinity;
  for(const reverse of [false,true])for(let k=0;k<steps;k++){
    let distance=0;
    for(let j=0;j<8;j++){
      const f=j/7,p=pointAt(a.arc,a.from+(a.to-a.from)*f);
      const t=loop?((k/steps+(reverse?-f:f))%1+1)%1:(reverse?1-f:f);
      const q=pointAt(b.arc,b.from+(b.to-b.from)*t);distance+=(p[0]-q[0])**2+(p[1]-q[1])**2;
    }
    if(distance<cost){cost=distance;best={reverse,offset:k/steps,loop};}
  }
  return best;
}
export function blendLaserFrames(from,to,amount,type,sourceCue,targetCue,anchors={from,to}){
  const u=clamp(amount);
  if(u>=1)return to;if(u<=0)return from;
  if(!from.paths.length)return {paths:dim(to,u)};
  if(!to.paths.length)return {paths:dim(from,1-u)};
  if(type==='fade')return {paths:[...dim(from,1-u),...dim(to,u)]};
  if(type==='color')return {paths:to.paths.map((p,i)=>({...p,color:mixColor(from.paths[i%from.paths.length].color,p.color,u)}))};
  if(type==='wipe'){
    const paths=[];
    for(const [frame,incoming] of [[from,false],[to,true]])for(const path of frame.paths){
      let run=[];
      const flush=()=>{if(run.length>=2)paths.push({color:path.color,points:run});run=[];};
      for(let i=1;i<path.points.length;i++){
        const a=path.points[i-1],b=path.points[i],edge=-1+2*u;
        const keepA=incoming?a[0]<=edge:a[0]>edge,keepB=incoming?b[0]<=edge:b[0]>edge;
        const cross=()=>{const f=(edge-a[0])/(b[0]-a[0]);return [edge,a[1]+(b[1]-a[1])*f];};
        if(keepA&&!run.length)run.push(a);
        if(keepA&&keepB)run.push(b);
        else if(keepA&&!keepB){run.push(cross());flush();}
        else if(!keepA&&keepB){run.push(cross(),b);}
      }
      flush();
    }
    return {paths};
  }
  const count=Math.max(pathCapacity(sourceCue),pathCapacity(targetCue),from.paths.length,to.paths.length);
  const a=split(from,count),b=split(to,count);
  // Correspondence is anchored at the join, so rotating effects cannot swap
  // partners from one frame to the next. Disconnected strokes stay blanked.
  const anchorA=split(anchors.from.paths.length?anchors.from:from,count),anchorB=split(anchors.to.paths.length?anchors.to:to,count);
  const order=match(anchorA,anchorB),samples=Math.max(4,Math.min(128,Math.floor(512/count)));
  return {paths:a.map((part,i)=>{
    const choice=order[i]??i,target=b[choice],align=alignment(anchorA[i],anchorB[choice]);
    return {color:mixColor(part.color,target.color,u),points:Array.from({length:samples},(_,j)=>{
      const f=j/(samples-1),t=align.loop?((align.offset+(align.reverse?-f:f))%1+1)%1:align.reverse?1-f:f;
      const x=pointAt(part.arc,part.from+(part.to-part.from)*f),y=pointAt(target.arc,target.from+(target.to-target.from)*t);
      return [clamp(x[0]+(y[0]-x[0])*u,-1,1),clamp(x[1]+(y[1]-x[1])*u,-1,1)];
    })};
  })};
}
