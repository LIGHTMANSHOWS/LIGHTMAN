// ILDA IDTF revision 011, format 5 (2D true color). No USB/output code.
export const MAX_FRAMES = 240;
export function validateProject(value) {
  if (!value || value.version !== 1 || !Array.isArray(value.frames) || !value.frames.length || value.frames.length > MAX_FRAMES) throw Error('Proyecto no válido: de 1 a 240 fotogramas.');
  if (typeof value.name !== 'string' || value.name.length > 80 || !Number.isFinite(value.fps) || value.fps < 1 || value.fps > 60) throw Error('Nombre o velocidad de proyecto no válidos.');
  const frames = value.frames.map(frame => {
    if (!frame || !Array.isArray(frame.paths) || frame.paths.length > 128) throw Error('Máximo 128 trazos por fotograma.');
    return {paths:frame.paths.map(path => {
      if (!path || !/^#[a-f0-9]{6}$/i.test(path.color) || !Array.isArray(path.points) || path.points.length < 2 || path.points.length > 2048) throw Error('Trazo no válido.');
      const points = path.points.map(p => {
        if (!Array.isArray(p) || p.length !== 2 || p.some(v => !Number.isFinite(v) || Math.abs(v) > 1)) throw Error('Coordenadas fuera del área de dibujo.');
        return [...p];
      });
      if (!points.some(p => Math.hypot(p[0]-points[0][0],p[1]-points[0][1]) > 0.001)) throw Error('El trazo necesita dos posiciones distintas.');
      return {color:path.color,points};
    })};
  });
  return {version:1,name:value.name,fps:Math.round(value.fps),frames};
}
export function demoFrame() {
  const ring = Array.from({length:65},(_,i) => [Math.cos(i*Math.PI/32)*0.62,Math.sin(i*Math.PI/32)*0.62]);
  const diamond = [[0,0.4],[0.4,0],[0,-0.4],[-0.4,0],[0,0.4]];
  return {paths:[{color:'#4de0ff',points:ring},{color:'#c4ff63',points:diamond}]};
}
export function rotateFrame(frame,angle) {
  const c=Math.cos(angle),s=Math.sin(angle);
  return {paths:frame.paths.map(p => ({color:p.color,points:p.points.map(([x,y]) => [x*c-y*s,x*s+y*c])}))};
}
export function sampleFrame(frame, {startBlankPoints=2, endBlankPoints=1, projectContour}={}) {
  const records=[];
  let previous=[0,0];
  const push=(p,color,blank=false) => {
    if (records.length >= 8192) throw Error('Demasiados puntos: simplifica los trazos (máximo 8192 por fotograma).');
    records.push({x:p[0],y:p[1],color:blank ? '#000000':color,blank});
  };
  const travel=(from,to,color,blank) => {
    const steps=Math.max(1,Math.ceil(Math.hypot(to[0]-from[0],to[1]-from[1])/0.025));
    for(let i=1;i<steps;i++) push([from[0]+(to[0]-from[0])*i/steps,from[1]+(to[1]-from[1])*i/steps],color,blank);
    push(to,color,blank);
  };
  push(previous,'#000000',true);
  for(const path of frame.paths) {
    const contour=projectContour?.(path.points);
    const start=contour ? contour[0] : path.points[0];
    // Blank both ends and interpolate travel between disconnected shapes.
    travel(previous,start,'#000000',true);
    // Travel already emitted the first blank sample at this exact position.
    for(let i=1;i<startBlankPoints;i++) push(start,'#000000',true);
    push(start,path.color);
    if(contour){
      for(let i=1;i<contour.length;i++) push(contour[i],path.color);
      previous=contour.at(-1);
    }else{
      for(let i=1;i<path.points.length;i++) travel(path.points[i-1],path.points[i],path.color,false);
      previous=path.points.at(-1);
      push(previous,path.color);
    }
    for(let i=0;i<endBlankPoints;i++) push(previous,'#000000',true);
  }
  travel(previous,[0,0],'#000000',true);
  return records;
}
export function encodeILDA(project) {
  const clean=validateProject(project);
  const frames=clean.frames.map(frame=>sampleFrame(frame));
  const bytes=new Uint8Array(frames.reduce((n,p)=>n+32+p.length*8,32));
  const view=new DataView(bytes.buffer);
  const ascii=(offset,text,length) => {
    const safe=text.normalize('NFKD').replace(/[^\x20-\x7e]/g,'');
    for(let i=0;i<Math.min(length,safe.length);i++) bytes[offset+i]=safe.charCodeAt(i);
  };
  const header=(offset,count,index) => {
    ascii(offset,'ILDA',4); bytes[offset+7]=5;
    ascii(offset+8,clean.name,8); ascii(offset+16,'LIGHTMAN',8);
    view.setUint16(offset+24,count,false); view.setUint16(offset+26,index,false);
    view.setUint16(offset+28,count ? frames.length : 0,false);
  };
  let offset=0;
  frames.forEach((points,index) => {
    header(offset,points.length,index); offset+=32;
    points.forEach((p,i) => {
      const coord=v => Math.max(-32768,Math.min(32767,Math.round(v*(v<0?32768:32767))));
      view.setInt16(offset,coord(p.x),false); view.setInt16(offset+2,coord(p.y),false);
      bytes[offset+4]=(p.blank ? 0x40 : 0) | (i === points.length-1 ? 0x80 : 0);
      const rgb=parseInt(p.color.slice(1),16);
      bytes[offset+5]=rgb & 255; bytes[offset+6]=(rgb>>>8)&255; bytes[offset+7]=(rgb>>>16)&255;
      offset+=8;
    });
  });
  header(offset,0,0);
  return bytes;
}
