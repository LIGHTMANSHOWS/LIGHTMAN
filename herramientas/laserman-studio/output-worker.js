import {packetForAge} from './output-packet.js?v=1.5.0-client';
let active=false,packet=null,updated=0,posting=false,generation=0,lastTest=false;
self.onmessage=({data})=>{
  if(data.type==='stop'){active=false;packet=null;generation++;return;}
  if(data.type==='start'){active=true;generation++;}
  if(data.packet){packet=data.packet;updated=performance.now();}
};
setInterval(async()=>{
  if(!active||!packet||posting)return;
  posting=true;const version=generation;
  try{
    const response=await fetch('/api/outputs/frame',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(packetForAge(packet,performance.now()-updated))});
    const result=await response.json();
    if(!response.ok)throw Error(result.error||'Error de salida FB3.');
    const test=Object.values(result.fb3||{}).some(s=>s.testActive);
    if(test!==lastTest){lastTest=test;self.postMessage({type:'test',active:test});}
  }catch(error){if(version===generation&&active){active=false;self.postMessage({type:'error',message:error.message});}}
  finally{posting=false;}
},1000/30);
