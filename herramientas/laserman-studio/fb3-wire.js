import {sampleFrame} from './laser.js';

export const FB3_MAX_KPPS = 15;

// Move the seam off a corner. Vary the distance between moving samples to
// ease through a turn at a fixed DAC rate, without dwelling at a lit vertex.
function planQuad(points,coordinate) {
  if(points.length!==5 || Math.hypot(points[4][0]-points[0][0],points[4][1]-points[0][1])>1e-9) return null;
  const corners=points.slice(0,4);
  let first=0, longest=0, winding=0;
  for(let i=0;i<4;i++){
    const a=corners[i],b=corners[(i+1)%4],c=corners[(i+2)%4];
    const dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);
    const turn=dx*(c[1]-b[1])-dy*(c[0]-b[0]);
    if(Math.abs(turn)<1e-12 || (winding && Math.sign(turn)!==winding)) return null;
    winding=Math.sign(turn);
    if(length>longest+1e-9){first=i;longest=length;}
  }
  const a=corners[first],b=corners[(first+1)%4];
  const seam=[(a[0]+b[0])/2,(a[1]+b[1])/2];
  const contour=[seam];
  const ramp=[.12,.35,.65,.9];
  function edge(from,to,slowStart,slowEnd) {
    const dx=to[0]-from[0],dy=to[1]-from[1];
    const steps=Math.max(6,Math.ceil(Math.hypot(dx,dy)/.025))+(slowStart?3:0)+(slowEnd?3:0);
    const weights=Array.from({length:steps},(_,i)=>Math.min(slowStart?(ramp[i]??1):1,slowEnd?(ramp[steps-1-i]??1):1));
    const total=weights.reduce((sum,w)=>sum+w,0);
    let distance=0;
    for(let i=0;i<steps;i++){
      distance+=weights[i];
      const p=i===steps-1 ? to : [from[0]+dx*distance/total,from[1]+dy*distance/total];
      const prev=contour.at(-1);
      if(coordinate(prev[0])!==coordinate(p[0]) || coordinate(prev[1])!==coordinate(p[1])) contour.push(p);
      else if(i===steps-1) contour[contour.length-1]=p;
    }
  }
  edge(seam,b,false,true);
  // Keep two moving samples past the seam, ending before the next corner.
  const overlap=contour.slice(1,Math.min(3,contour.length-1));
  for(let i=1;i<4;i++) edge(corners[(first+i)%4],corners[(first+i+1)%4],true,true);
  edge(a,seam,true,false);
  contour.push(...overlap);
  return contour;
}

// Candidate direct-feed format recovered from the client packer. Device-level
// frame acceptance is deliberately separate from this binary serialization.
export function encodeFB3Frame(frame,{format=1,kpps=FB3_MAX_KPPS,scale=0.2,intensity=0.1,startBlankPoints=8}={}) {
  if(![0,1].includes(format))throw Error('Formato FB3 no válido.');
  if(!Number.isInteger(kpps)||kpps<8||kpps>FB3_MAX_KPPS)throw Error('Velocidad FB3 fuera de rango (8–15 kpps).');
  if(!Number.isFinite(scale)||scale<=0||scale>1||!Number.isFinite(intensity)||intensity<0||intensity>1)throw Error('Escala o intensidad no válidas.');
  if(!Number.isInteger(startBlankPoints)||startBlankPoints<2||startBlankPoints>20)
    throw Error('El retardo de encendido debe estar entre 2 y 20 puntos enteros.');
  const coordinate=v=>Math.max(0,Math.min(4095,Math.round(2048+v*scale*(v<0?2048:2047))));
  const points=sampleFrame(frame,{startBlankPoints,endBlankPoints:6,projectContour:pts=>planQuad(pts,coordinate)});
  const bytes=new Uint8Array((points.length+1)*8);
  bytes[0]=2;bytes[1]=kpps;
  points.forEach((point,i)=>{
    const offset=(i+1)*8;
    const x=coordinate(point.x),y=coordinate(point.y);
    const value=parseInt(point.color.slice(1),16);
    const rgb=point.blank?[0,0,0]:[(value>>>16)&255,(value>>>8)&255,value&255].map(v=>Math.round(v*intensity));
    const gate=rgb.some(v=>v!==0)?255:0;
    bytes.set([1,x&255,y&255,((x>>>8)<<4)|(y>>>8)],offset);
    bytes.set(format===1?[gate,...rgb]:[...rgb,gate],offset+4);
  });
  return bytes;
}
