const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
function upperBound(list,t,value=x=>x){let a=0,b=list.length;while(a<b){const m=(a+b)>>>1;if(value(list[m])<=t)a=m+1;else b=m;}return a;}

// Absolute audio time determines every pose, including after seeks and loops.
export function createRhythmEngine(data){
 const beats=data.beats,hits=data.hits,step=data.envelopeStep;
 function sample(time){
  const t=clamp(time,0,data.duration),next=upperBound(beats,t),prev=Math.max(0,next-1);
  const left=next?beats[prev]:beats[0]-(beats[1]-beats[0]),right=beats[next]??beats.at(-1)+(beats.at(-1)-beats.at(-2));
  const beat=(next-1)+clamp((t-left)/Math.max(.1,right-left));
  const f=t/step,i=Math.min(data.envelope.length-1,Math.floor(f)),j=Math.min(i+1,data.envelope.length-1),u=f-i;
  const envelope=data.envelope[i].map((v,k)=>v+(data.envelope[j][k]-v)*u);
  const impulse={};for(const role of ['bombo','repique','tarola']){
   const list=hits[role],at=upperBound(list,t,x=>x[0])-1,hit=list[at];impulse[role]=hit?Math.exp(-(t-hit[0])/.085)*clamp(hit[1]):0;
  }
  return {time:t,beat,phase:beat%1,energy:clamp(envelope[0]),bass:clamp(envelope[1]),mid:clamp(envelope[2]),high:clamp(envelope[3]),kick:impulse.bombo,snare:impulse.tarola,repique:impulse.repique,accent:Math.max(...Object.values(impulse)),bpm:60/Math.max(.1,right-left)};
 }
 function stroke(role,t,hand,player=0){
  const list=hits[role]||hits.repique,pos=upperBound(list,t,x=>x[0]);let last=null,next=null;const parity=(hand+player)%2;
  for(let i=pos-1;i>=Math.max(0,pos-5);i--)if(i%2===parity){last=list[i];break;}
  for(let i=pos;i<Math.min(list.length,pos+5);i++)if(i%2===parity){next=list[i];break;}
  let lift=.35;const after=last?t-last[0]:Infinity,before=next?next[0]-t:Infinity;
  if(before<.10)lift=smooth(before/.10);
  else if(after<.10)lift=.95*smooth(after/.10);
  else if(before<.23)lift=.35+.65*smooth((.23-before)/.13);
  else if(after<.24)lift=.95-(.95-.35)*smooth((after-.10)/.14);
  return {lift:clamp(lift),strength:last?clamp(last[1]):0,impact:last?Math.exp(-(t-last[0])/.055)*clamp(last[1]):0,last:last?.[0]??-1,next:next?.[0]??-1};
 }
 return {sample,stroke,duration:data.duration};
}
