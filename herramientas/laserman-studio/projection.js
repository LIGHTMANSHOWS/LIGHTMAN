// Coordinates describe DAC space, not measured optical angles.
export const DEFAULT_PROJECTION={corners:[[-1,1],[1,1],[1,-1],[-1,-1]]};
export function validateProjection(value=DEFAULT_PROJECTION){
  const p=structuredClone(value);
  if(!p || !Array.isArray(p.corners)||p.corners.length!==4)throw Error('El encuadre necesita cuatro esquinas.');
  for(const point of p.corners)if(!Array.isArray(point)||point.length!==2||point.some(v=>!Number.isFinite(v)||Math.abs(v)>1))throw Error('Las esquinas deben estar dentro de la zona de salida.');
  // Preserve orientation and forbid crossed, collapsed or concave zones.
  for(let i=0;i<4;i++){
    const a=p.corners[i],b=p.corners[(i+1)%4],c=p.corners[(i+2)%4];
    if((b[0]-a[0])*(c[1]-b[1])-(b[1]-a[1])*(c[0]-b[0])>=-0.0001)throw Error('El encuadre debe ser convexo, sin esquinas cruzadas ni superpuestas.');
  }
  return {corners:p.corners};
}
export function projectPoint([x,y],projection){
  const {corners:[tl,tr,br,bl]}=projection;
  const u=(Math.max(-1,Math.min(1,x))+1)/2,v=(1-Math.max(-1,Math.min(1,y)))/2;
  return [0,1].map(i=>(1-u)*(1-v)*tl[i]+u*(1-v)*tr[i]+u*v*br[i]+(1-u)*v*bl[i]);
}
export function projectDrawing(drawing,projection){
  if(!projection)return drawing;
  const p=validateProjection(projection);
  return {...drawing,paths:drawing.paths.map(path=>({...path,points:path.points.map(point=>projectPoint(point,p))}))};
}
export function testDrawing(pattern){
  const path=points=>({points,color:pattern==='orientation'?'#00ff00':'#00ff80',closed:false});
  if(pattern==='orientation')return {paths:[path([[-1,1],[1,1],[1,-1],[-1,-1],[-1,1]]),path([[-1,0],[1,0]]),path([[0,-1],[0,1]]),path(Array.from({length:65},(_,i)=>[.7*Math.cos(i*Math.PI/32),.7*Math.sin(i*Math.PI/32)]))]};
  if(pattern==='outline')return {paths:[path([[-1,1],[1,1],[1,-1],[-1,-1],[-1,1]])]};
  if(pattern==='axes')return {paths:[path([[-1,0],[1,0]]),path([[0,-1],[0,1]])]};
  if(pattern==='circle'||pattern==='pilot')return {paths:[path(Array.from({length:33},(_,i)=>{const a=(i%32)*Math.PI/16,r=pattern==='pilot'?.2:1;return [r*Math.cos(a),r*Math.sin(a)];}))]};
  throw Error('Patrón de prueba no válido.');
}
