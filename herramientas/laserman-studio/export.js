import {encodeFB3Frame} from './fb3-wire.js';
import {laserFrame,trackEnabled,activeCue} from './engine.js';
import {createLedEngine} from './led-engine.js';
import * as core from './vendor/ldp-core.js';

const pause=()=>new Promise(resolve=>setTimeout(resolve,0));
export function ildFrame(track,time,index,total,height=4){
  const wire=encodeFB3Frame(laserFrame(track,time,height),{kpps:15,scale:1,intensity:1,startBlankPoints:9});
  const count=(wire.length-8)/8,frame=new Uint8Array(32+count*8),view=new DataView(frame.buffer);
  frame.set([73,76,68,65,0,0,0,5]);
  const title=new TextEncoder().encode(track.id.slice(0,8));frame.set(title,8);
  frame.set(new TextEncoder().encode('LIGHTMAN'),16);
  view.setUint16(24,count,false);view.setUint16(26,index,false);view.setUint16(28,total,false);
  for(let i=0;i<count;i++){
    const source=8+i*8,target=32+i*8,x=wire[source+1]+((wire[source+3]>>4)<<8),y=wire[source+2]+((wire[source+3]&15)<<8);
    const signed=v=>Math.max(-32768,Math.min(32767,Math.round((v-2048)*(v<2048?16:32767/2047))));
    view.setInt16(target,signed(x),false);view.setInt16(target+2,signed(y),false);
    frame[target+4]=(wire[source+4]?0:64)|(i===count-1?128:0);
    frame.set([wire[source+7],wire[source+6],wire[source+5]],target+5);
  }
  return frame;
}
export function handEvents(cues){
  const times=[...new Set(cues.filter(c=>c.enabled!==false).flatMap(c=>[c.start,c.start+c.duration]))].sort((a,b)=>a-b);
  let state=0;const out=[];
  for(const time of times){const value=activeCue(cues,time+1e-7)?255:0;if(value!==state){out.push([time,value]);state=value;}}
  return out;
}
async function jsonRequest(path,body){const r=await fetch('/api/export/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const d=await r.json();if(!r.ok)throw Error(d.error);return d;}
async function part(job,name,data){const r=await fetch('/api/export/part/'+job+'/'+name,{method:'POST',headers:{'Content-Type':'application/octet-stream'},body:data});if(!r.ok)throw Error((await r.json()).error);}

export function ldpBackup(project,fixture,positions){
  const items=[],instances=[];
  for(const [i,t] of project.tracks.filter(t=>t.type==='suit').entries()){
    const root='laserman-'+t.id,id='gear-'+root;
    const hierarchy={name:t.name,isGroup:true,_defUID:root,children:fixture.zones.map(z=>({name:z.name,isGroup:true,_defUID:root+'/'+z.name,children:[]}))};
    const zones=fixture.zones.map(z=>({...z,_defUID:root+'/'+z.name}));
    const tree=core.A(hierarchy,t.name,true,zones);
    const gear={...structuredClone(fixture),id,name:t.name,source:'user',hierarchy,zones,elementTree:tree,
      physicalSize:{width:1.18,height:1.85},pixelPositions:positions.flatMap(p=>[(p[0]+.59)/1.18,1-p[1]/1.85]),pixelPositions3D:positions.flat(),
      stripData:{zones:Object.fromEntries(zones.map(z=>[z.name,{strips:[{id:root+'/'+z.name,type:'strip',ledCount:z.count,waypoints3D:positions.slice(z.start,z.start+z.count)}]}]))},description:'Porciones oficiales del Jacket; geometría escénica reconstruida para LASERMAN.'};
    items.push({id,local_id:id,type:'gear',name:t.name,data_json:gear,file_refs:[]});
    instances.push({gearId:id,instanceId:root,name:t.name,totalLeds:fixture.totalLeds,position:{x:.2+i*.3,y:.5},rotation:0,scale:1});
  }
  const previewId='preview-laserman';
  items.push({id:previewId,local_id:previewId,type:'preview',name:project.name,data_json:{id:previewId,name:project.name,version:1,source:'user',gears:instances,totalLeds:1590,gearCount:3},file_refs:[]});
  const effects=[];
  project.tracks.filter(t=>t.type==='suit').forEach((t,i)=>{
    for(const c of t.cues){
      if(!trackEnabled(project,t)||c.enabled===false)continue;
      const root='laserman-'+t.id;
      const params={...core.ah(c.effect),...(c.effect==='fade'?{curve:'constant'}:{})};
      if(typeof params.speed==='number')params.speed*=c.speed;
      effects.push({id:c.id,effectType:c.effect,startTime:c.start*1000,duration:c.duration*1000,color:c.color,intensity:c.intensity,
        params,curve:'constant',curveId:'constant',blendMode:'add',
        targetNodeIds:c.targets.includes('all')?[`grp-${root}/${t.name}`]:c.targets.map(n=>`grp-${root}/${n}`),
        targetUids:c.targets.includes('all')?[`grp-${root}/${root}`]:c.targets.map(n=>`grp-${root}/${root}/${n}`),
        mappingMode:'location',locationShape:'vertical',gradientMode:'space'});
    }
  });
  const seq={id:'sequence-laserman',name:project.name,version:1,source:'user',previewId,previewName:project.name,effects,
    duration:project.duration*1000,bpm:project.bpm,audioFileName:project.audio?.name,viewState:{workspace:'sequencing',timelineZoom:1,trackHeight:32}};
  items.push({id:seq.id,local_id:seq.id,type:'sequence',name:seq.name,data_json:seq,file_refs:[]});
  return {format:'lightman-studio-backup-v1',items};
}

export async function buildExport(source,fixture,positions,fps,onProgress){
  const project=structuredClone(source),job=(await jsonRequest('start',{})).job;
  await part(job,'project.laserman.json',JSON.stringify(project,null,2));
  const count=Math.ceil(project.duration*fps),tracks=project.tracks.filter(t=>t.type==='laser');
  for(let trackIndex=0;trackIndex<3;trackIndex++){
    const track=tracks[trackIndex],frames=[];let size=32;
    for(let index=0;index<count;index++){
      const sourceTrack=trackEnabled(project,track)?track:{...track,cues:[]};
      const frame=ildFrame(sourceTrack,index/fps,index,count,project.stage.rigHeight);frames.push(frame);size+=frame.length;
      if(index%40===0){onProgress((trackIndex+index/count)/6,`ILDA ${trackIndex+1}/3 · ${Math.round(index/count*100)} %`);await pause();}
    }
    const combined=new Uint8Array(size);let cursor=0;for(const frame of frames){combined.set(frame,cursor);cursor+=frame.length;}
    combined.set([73,76,68,65,0,0,0,5],cursor);await part(job,track.id+'.ild',combined);
  }
  const led=createLedEngine(fixture,positions),ledFps=30,ledFrames=Math.ceil(project.duration*ledFps),suits=project.tracks.filter(t=>t.type==='suit');
  for(let suit=0;suit<3;suit++){
    const pixels=new Uint8Array(ledFrames*fixture.totalLeds*3);led.reset();
    for(let index=0;index<ledFrames;index++){
      pixels.set(led.render(project,suits[suit],index/ledFps),index*fixture.totalLeds*3);
      if(index%60===0){onProgress(.5+(suit+index/ledFrames)/6,`RGB ${suit+1}/3 · ${Math.round(index/ledFrames*100)} %`);await pause();}
    }
    await part(job,suits[suit].id+'.rgb',pixels);
  }
  const rows=['track,hand,time_s,value'];
  for(const t of suits)if(trackEnabled(project,t))for(const side of ['left','right'])for(const [at,value]of handEvents(t.hands[side]))rows.push(`${t.id},${side},${at.toFixed(6)},${value}`);
  await part(job,'hands.csv',rows.join('\n'));
  const csv=value=>'"'+String(value??'').replaceAll('"','""')+'"';
  await part(job,'markers.csv',['name,start_s,end_s,color',...(project.markers||[]).map(m=>[csv(m.name),m.start.toFixed(6),m.end==null?'':m.end.toFixed(6),csv(m.color)].join(','))].join('\n'));
  await part(job,'led-ldp-backup.json',JSON.stringify(ldpBackup(project,fixture,positions),null,2));
  await part(job,'manifest.json',JSON.stringify({format:'lightman-laserman-export',version:1,applicationVersion:'1.1.0',edition:project.edition,duration:project.duration,markers:(project.markers||[]).length,
    ild:{format:5,fps,frames:count,coordinates:'signed-16-bit-big-endian',color:'BGR888',pps:'Se configura en el reproductor; máximo del proyecto 15000.'},
    led:{fps:ledFps,frames:ledFrames,pixelsPerSuit:530,encoding:'RGB888',startTime:0},handValues:[0,255],
    tracks:project.tracks.map(t=>({id:t.id,type:t.type,cues:t.cues.length,patch:t.patch})),audio:project.audio},null,2));
  await part(job,'LEEME.txt','LASERMAN / LIGHTMAN\n\nLos ILDA son tres salidas independientes en formato 5. PPS no forma parte del archivo ILDA; configura como máximo 15.000 pps en el reproductor.\nLos .rgb son RGB888, 530 píxeles por traje, 30 frames/s desde t=0.\nhands.csv contiene eventos binarios de manos. led-ldp-backup.json se importa en la adaptación local LIGHTMAN del editor LDP mediante /api/local/import.\nEl proyecto completo se abre en LASERMAN Studio. El audio va en assets/. Abre el ZIP en LASERMAN Studio para importar también la música.\nLa vista 3D y la salida física necesitan calibración de cada proyector y su patch.\n');
  const result=await jsonRequest('finish',{job});onProgress(1,'Paquete completo');
  const a=document.createElement('a');a.href=result.url;a.download='LIGHTMAN-LASERMAN-show.zip';a.click();
  return result.url;
}
