// Portable ZIP packaging. Browser compression is optional for writing.
const encoder=new TextEncoder(),decoder=new TextDecoder();
const table=Uint32Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
export function crc32(bytes){let crc=0xffffffff;for(const b of bytes)crc=table[(crc^b)&255]^(crc>>>8);return(crc^0xffffffff)>>>0;}
async function bytes(value){return value instanceof Uint8Array?value:new Uint8Array(await new Blob([value]).arrayBuffer());}
export async function zipFiles(entries){
  const parts=[],directory=[];let offset=0,centralSize=0;
  for(const [name,value]of entries){
    const raw=await bytes(value),filename=encoder.encode(name),checksum=crc32(raw);let data=raw,method=0;
    try{const compressed=new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer());if(compressed.length<raw.length){data=compressed;method=8;}}catch{}
    const local=new Uint8Array(30+filename.length),lv=new DataView(local.buffer);
    lv.setUint32(0,0x04034b50,true);lv.setUint16(4,20,true);lv.setUint16(6,0x800,true);lv.setUint16(8,method,true);lv.setUint16(12,33,true);lv.setUint32(14,checksum,true);lv.setUint32(18,data.length,true);lv.setUint32(22,raw.length,true);lv.setUint16(26,filename.length,true);local.set(filename,30);
    const central=new Uint8Array(46+filename.length),cv=new DataView(central.buffer);
    cv.setUint32(0,0x02014b50,true);cv.setUint16(4,20,true);cv.setUint16(6,20,true);cv.setUint16(8,0x800,true);cv.setUint16(10,method,true);cv.setUint16(14,33,true);cv.setUint32(16,checksum,true);cv.setUint32(20,data.length,true);cv.setUint32(24,raw.length,true);cv.setUint16(28,filename.length,true);cv.setUint32(42,offset,true);central.set(filename,46);
    parts.push(local,data);directory.push(central);offset+=local.length+data.length;centralSize+=central.length;
  }
  const end=new Uint8Array(22),ev=new DataView(end.buffer);ev.setUint32(0,0x06054b50,true);ev.setUint16(8,directory.length,true);ev.setUint16(10,directory.length,true);ev.setUint32(12,centralSize,true);ev.setUint32(16,offset,true);
  return new Blob([...parts,...directory,end],{type:'application/zip'});
}
export async function unzipFiles(value){
  const data=await bytes(value),view=new DataView(data.buffer,data.byteOffset,data.byteLength);let end=-1;
  for(let i=data.length-22;i>=Math.max(0,data.length-65557);i--)if(view.getUint32(i,true)===0x06054b50){end=i;break;}
  if(end<0)throw Error('El archivo no es un ZIP válido.');
  const count=view.getUint16(end+10,true);let cursor=view.getUint32(end+16,true),total=0;const out=new Map();
  if(count>64)throw Error('Demasiados archivos en el paquete.');
  for(let i=0;i<count;i++){
    if(cursor+46>data.length||view.getUint32(cursor,true)!==0x02014b50)throw Error('Índice ZIP incompleto.');
    const flags=view.getUint16(cursor+8,true),method=view.getUint16(cursor+10,true),checksum=view.getUint32(cursor+16,true),compressed=view.getUint32(cursor+20,true),size=view.getUint32(cursor+24,true),nameLength=view.getUint16(cursor+28,true),extra=view.getUint16(cursor+30,true),comment=view.getUint16(cursor+32,true),local=view.getUint32(cursor+42,true);
    total+=size;if(total>150_000_000||size>100_000_000||flags&1)throw Error('Paquete demasiado grande o cifrado.');
    if(cursor+46+nameLength+extra+comment>data.length||local+30>data.length||view.getUint32(local,true)!==0x04034b50)throw Error('Cabecera ZIP incompleta.');
    const name=decoder.decode(data.subarray(cursor+46,cursor+46+nameLength));cursor+=46+nameLength+extra+comment;
    const start=local+30+view.getUint16(local+26,true)+view.getUint16(local+28,true);if(start+compressed>data.length)throw Error('Datos ZIP incompletos.');
    let raw=data.slice(start,start+compressed);
    if(method===8){
      const reader=new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader(),chunks=[];let length=0;
      try{for(;;){const chunk=await reader.read();if(chunk.done)break;length+=chunk.value.length;if(length>size){await reader.cancel();throw Error('Tamaño ZIP inconsistente.');}chunks.push(chunk.value);}}finally{reader.releaseLock();}
      raw=new Uint8Array(length);let at=0;for(const chunk of chunks){raw.set(chunk,at);at+=chunk.length;}
    }else if(method!==0)throw Error('Compresión ZIP no compatible.');
    if(raw.length!==size||crc32(raw)!==checksum)throw Error('El paquete tiene un archivo dañado.');
    if(out.has(name))throw Error('Archivo duplicado en el paquete.');out.set(name,raw);
  }
  return out;
}
