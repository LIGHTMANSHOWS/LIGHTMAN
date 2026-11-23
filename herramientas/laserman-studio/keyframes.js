// Serializable parameter curves shared by the editor, preview and exports.
import {mixColor} from './transitions.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const KEY_CURVES={linear:'Lineal',smooth:'Suave',easeIn:'Acelerar',easeOut:'Desacelerar',hold:'Mantener / corte'};
export const CHANNELS={
  panX:{label:'Posición horizontal · m',min:-3,max:3,step:.01,fallback:0,kind:'laser'},
  panZ:{label:'Posición en profundidad · m',min:-3,max:3,step:.01,fallback:0,kind:'laser'},
  size:{label:'Tamaño',min:.05,max:1,step:.01,fallback:.65,kind:'laser'},
  sizePulse:{label:'Impulso de tamaño',min:0,max:1,step:.01,fallback:0,kind:'laser'},
  rotation:{label:'Giro · grados',min:-720,max:720,step:1,fallback:0,kind:'laser'},
  opening:{label:'Apertura',min:0,max:1,step:.01,fallback:1,kind:'laser'},
  depthScale:{label:'Profundidad de la figura',min:0,max:2,step:.01,fallback:1,kind:'laser'},
  projectionHeight:{label:'Altura de la figura · m',min:0,max:12,step:.01,fallback:.035,kind:'laser'},
  effectSpeed:{label:'Velocidad interna del efecto · ×',min:0,max:4,step:.01,fallback:1,kind:'laser'},
  motionRate:{label:'Velocidad global del movimiento · ×',min:0,max:4,step:.01,fallback:1,kind:'both'},
  effectPhase:{label:'Fase del movimiento',min:-50000,max:50000,step:.01,fallback:0,kind:'laser'},
  laserIntensity:{label:'Brillo láser · %',min:0,max:100,step:1,fallback:100,kind:'laser'},
  beamCount:{label:'Cantidad de haces',min:3,max:32,step:1,fallback:8,kind:'laser',discrete:true},
  polygonSides:{label:'Número de lados',min:3,max:32,step:1,fallback:5,kind:'laser',discrete:true},
  pilotIntensity:{label:'Haz interior · brillo %',min:0,max:100,step:1,fallback:0,kind:'laser'},
  pilotWidth:{label:'Haz interior · apertura',min:0,max:1,step:.001,fallback:.04,kind:'laser'},
  pilotCenter:{label:'Haz interior · centro',min:-1,max:1,step:.001,fallback:0,kind:'laser'},
  pilotColor:{label:'Haz interior · color',type:'color',fallback:'#4cff1d',kind:'laser'},
  previewOrigin:{label:'Origen del haz',values:{projector:'Proyector superior','left-hand':'Mano izquierda','right-hand':'Mano derecha'},fallback:'projector',kind:'laser',discrete:true},
  color:{label:'Color',type:'color',fallback:'#00e5ff',kind:'both'},
  intensity:{label:'Intensidad LED · %',min:0,max:100,step:1,fallback:100,kind:'suit'},
  speed:{label:'Velocidad LED · ×',min:0,max:4,step:.01,fallback:1,kind:'suit'},
  videoCenter:{label:'Video · centro del haz',min:-1,max:1,step:.001,fallback:0,kind:'laser',video:1},
  videoWidth:{label:'Video · apertura medida',min:0,max:1,step:.001,fallback:.5,kind:'laser',video:2},
  videoPhase:{label:'Video · fase medida',min:-50000,max:50000,step:.01,fallback:0,kind:'laser',video:3}
};
export const localTime=(cue,time)=>time-cue.start+(cue.sourceOffset||0);
export const curveEase=(u,kind='linear')=>kind==='hold'?0:kind==='smooth'?u*u*(3-2*u):kind==='easeIn'?u*u:kind==='easeOut'?u*(2-u):u;
function primitive(u,kind){return kind==='hold'?0:kind==='smooth'?u**3-.5*u**4:kind==='easeIn'?u**3/3:kind==='easeOut'?u*u-u**3/3:u*u/2;}
export function curveAt(keys,time,fallback,spec={}){
  if(!keys?.length)return fallback;
  let lo=0,hi=keys.length-1;
  while(lo<hi){const mid=(lo+hi)>>1;if(keys[mid].at<time)lo=mid+1;else hi=mid;}
  const b=keys[lo],a=keys[Math.max(0,lo-1)];
  if(time>=b.at||a===b)return b.value;
  if(spec.discrete||a.easing==='hold')return a.value;
  const u=curveEase(clamp((time-a.at)/(b.at-a.at),0,1),a.easing);
  return spec.type==='color'?mixColor(a.value,b.value,u):a.value+(b.value-a.value)*u;
}
export function integralAt(keys,time,fallback=1){
  if(!keys?.length)return time*fallback;
  if(time<=0)return time*keys[0].value;
  let sum=Math.min(time,keys[0].at)*keys[0].value;
  for(let i=0;i<keys.length-1&&time>keys[i].at;i++){
    const a=keys[i],b=keys[i+1],span=b.at-a.at,u=clamp((time-a.at)/span,0,1);
    sum+=span*(a.value*u+(b.value-a.value)*primitive(u,a.easing));
  }
  const last=keys.at(-1);if(time>last.at)sum+=(time-last.at)*last.value;
  return sum;
}
export function animationClock(cue,time,key='effectSpeed'){
  const local=motionTime(cue,time),base=cue[key]??CHANNELS[key].fallback;
  return integralAt(cue.animation?.enabled!==false?cue.animation?.curves?.[key]:null,local,base);
}
export function motionTime(cue,time){
  return integralAt(cue.animation?.enabled!==false?cue.animation?.curves?.motionRate:null,localTime(cue,time),cue.motionRate??1);
}
export function parameterAt(cue,key,time){
  const spec=CHANNELS[key],local=key==='motionRate'?localTime(cue,time):motionTime(cue,time);
  let fallback=cue[key]??spec.fallback;
  if(key==='rotation')fallback=cue.rotation+(cue.rotationEnd-cue.rotation)*clamp(local/(cue.sourceDuration||cue.duration),0,1);
  if(key==='projectionHeight'&&cue[key]===undefined&&['hands','handPinch'].includes(cue.shape))fallback=1.235;
  return curveAt(cue.animation?.enabled!==false?cue.animation?.curves?.[key]:null,local,fallback,spec);
}
export function animatedCue(cue,time){
  if(!cue.animation||cue.animation.enabled===false)return cue;
  const out={...cue,animationBaseSpeed:cue.effectSpeed??1,animationBaseSize:cue.size};
  for(const key of Object.keys(cue.animation.curves))if(!CHANNELS[key].video){
    out[key]=parameterAt(cue,key,time);if(key==='rotation')out.rotationEnd=out.rotation;
  }
  if(['size','panX','panZ','rotation'].some(key=>cue.animation.curves[key]?.length))out.motionEnabled=false;
  return out;
}
export function newKey(at,value,easing='linear'){return {id:crypto.randomUUID(),at:Math.round(at*1e6)/1e6,value,easing};}
export function ensureAnimation(cue){return cue.animation??={version:1,enabled:true,curves:{}};}
export function upsertKey(cue,key,at,value,easing='linear'){
  const animation=ensureAnimation(cue),keys=animation.curves[key]??=[];animation.enabled=true;
  const existing=keys.find(k=>Math.abs(k.at-at)<.0005);
  if(existing){existing.value=value;existing.easing=easing;return existing;}
  const k=newKey(at,value,easing);keys.push(k);keys.sort((a,b)=>a.at-b.at);return k;
}
export function simplifyKeys(keys,tolerance){
  if(keys.length<3)return keys;
  const keep=new Set([0,keys.length-1]);
  for(let i=0;i<keys.length-1;i++)if(keys[i].easing!=='linear'){keep.add(i);keep.add(i+1);}
  const anchors=[...keep].sort((a,b)=>a-b),stack=anchors.slice(1).map((end,i)=>[anchors[i],end]);
  while(stack.length){
    const [start,end]=stack.pop(),a=keys[start],b=keys[end];let distance=tolerance,index=-1;
    for(let i=start+1;i<end;i++){
      const expected=a.value+(b.value-a.value)*(keys[i].at-a.at)/(b.at-a.at),error=Math.abs(keys[i].value-expected);
      if(error>distance){distance=error;index=i;}
    }
    if(index>=0){keep.add(index);stack.push([start,index],[index,end]);}
  }
  return keys.filter((_,i)=>keep.has(i));
}
export function validateAnimation(cue,kind){
  for(const key of ['sizePulse','opening','depthScale','laserIntensity','motionRate','pilotIntensity','pilotWidth','pilotCenter'])if(cue[key]!==undefined&&(!Number.isFinite(cue[key])||cue[key]<CHANNELS[key].min||cue[key]>CHANNELS[key].max))throw Error(CHANNELS[key].label+' no válido.');
  if(cue.pilotColor!==undefined&&!/^#[a-f0-9]{6}$/i.test(cue.pilotColor))throw Error('Color de haz interior no válido.');
  const a=cue.animation;if(a===undefined)return;
  if(kind==='hand'||!a||a.version!==1||typeof a.enabled!=='boolean'||!a.curves||Array.isArray(a.curves)||typeof a.curves!=='object')throw Error('Animación por fotogramas no válida.');
  const ids=new Set();let count=0;
  for(const [key,keys] of Object.entries(a.curves)){
    const spec=CHANNELS[key];
    if(!spec||![kind,'both'].includes(spec.kind)||!Array.isArray(keys)||!keys.length||keys.length>20000)throw Error('Canal de fotogramas no válido.');
    for(let i=0;i<keys.length;i++){
      const k=keys[i];
      if(++count>50000||!k||typeof k.id!=='string'||!k.id||k.id.length>80||ids.has(k.id)||
        !Number.isFinite(k.at)||k.at<0||k.at>1200||i>0&&k.at<=keys[i-1].at||!Object.hasOwn(KEY_CURVES,k.easing))throw Error('Fotograma no válido.');
      ids.add(k.id);
      const valid=spec.values?Object.hasOwn(spec.values,k.value):spec.type==='color'?/^#[a-f0-9]{6}$/i.test(k.value):
        Number.isFinite(k.value)&&k.value>=spec.min&&k.value<=spec.max&&(!spec.discrete||Number.isInteger(k.value));
      if(!valid)throw Error('Valor de fotograma fuera del rango de '+spec.label+'.');
    }
  }
}
