import {validateProject} from './engine.js';
import {zipFiles,unzipFiles} from './web-zip.js';

const originalFetch=globalThis.fetch.bind(globalThis),base=new URL('./',import.meta.url),audioUrls=new Map(),jobs=new Map();
const database=new Promise((resolve,reject)=>{
  const request=indexedDB.open('lightman-laserman-web-v1',1);
  request.onupgradeneeded=()=>request.result.createObjectStore('records');
  request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(Error('No se pudo abrir el almacenamiento del navegador.'));
});
async function read(key){const db=await database;return new Promise((resolve,reject)=>{const request=db.transaction('records').objectStore('records').get(key);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});}
async function write(key,value){const db=await database;return new Promise((resolve,reject)=>{const tx=db.transaction('records','readwrite');tx.objectStore('records').put(value,key);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('No se pudo guardar.'));});}
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
async function asset(url){const path=new URL(url,base).pathname,name=path.split('/').at(-1);if(name.startsWith('user-')){const stored=await read('audio/'+name);if(!stored)throw Error('La música importada no está en este navegador. Abre el ZIP del show o importa el audio.');return stored;}const response=await originalFetch(new URL(url,base));if(!response.ok)throw Error('No se pudo cargar la música.');return response.blob();}
export async function resolveAudioUrl(url){
  if(!url.split('/').at(-1).startsWith('user-'))return new URL(url,base).href;
  if(!audioUrls.has(url))audioUrls.set(url,URL.createObjectURL(await asset(url)));return audioUrls.get(url);
}
async function saveAudio(blob,name){
  if(blob.size>40_000_000)throw Error('El audio supera 40 MB.');
  const ext=(name.match(/\.(wav|mp3|ogg|m4a|flac|aac|webm)$/i)||[])[0]?.toLowerCase();if(!ext)throw Error('Formato de audio no admitido.');
  const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer()))].map(v=>v.toString(16).padStart(2,'0')).join('');
  const filename='user-'+hash.slice(0,20)+ext;await write('audio/'+filename,blob);return 'assets/'+filename;
}
async function route(request,url){
  const path=url.pathname.replace(/^.*\/api\//,'');
  if(path==='project'&&request.method==='GET'){const project=await read('project');return project?json({project}):json({error:'Todavía no hay un proyecto guardado.'},404);}
  if(path==='project/versions')return json({versions:(await read('versions')||[]).slice().reverse().map(({project,...entry})=>entry)});
  if(path==='project/version'){const id=url.searchParams.get('id'),entry=(await read('versions')||[]).find(v=>v.id===id);return entry?json({project:entry.project}):json({error:'Versión no encontrada.'},404);}
  if(path==='devices')return json({devices:[]});
  if(path==='outputs/status'||path==='outputs/stop')return json({enabled:false,error:null,fb3:{}});
  if(path.startsWith('outputs/'))return json({error:'Para emitir con FB3 o Art-Net utiliza LIGHTMAN LASERMAN Studio en el PC del montaje.'},409);
  if(path==='audio')return json({url:await saveAudio(await request.blob(),url.searchParams.get('name')||'audio.wav')});
  if(path==='import-show'){
    const files=await unzipFiles(await request.blob()),raw=files.get('project.laserman.json');if(!raw)throw Error('Falta el proyecto en el ZIP.');
    if(raw.length>5_000_000)throw Error('El proyecto supera 5 MB.');const project=validateProject(JSON.parse(new TextDecoder().decode(raw)));
    const name=project.audio?.url?.split('/').at(-1),audio=files.get('assets/'+name)||files.get('audio/'+name);
    if(audio)project.audio.url=await saveAudio(new Blob([audio]),name);
    return json({project});
  }
  if(path.startsWith('export/part/')){
    const [, ,id,name]=path.split('/'),job=jobs.get(id);if(!job||!/^[a-zA-Z0-9_.-]{1,70}$/.test(name))throw Error('Exportación no válida.');
    const blob=await request.blob();if(blob.size>100_000_000)throw Error('Archivo demasiado grande.');job.set(name,blob);return json({ok:true});
  }
  const body=request.method==='GET'?{}:await request.json();
  if(path==='project'){const project=validateProject(body.project);await write('project',project);return json({ok:true});}
  if(path==='project/archive'){
    const project=validateProject(body.project),versions=await read('versions')||[],id=crypto.randomUUID()+'.json';
    versions.push({id,name:project.name,saved:new Date().toLocaleString('es-PE'),project});await write('versions',versions.slice(-100));return json({ok:true,id});
  }
  if(path==='export/start'){const id=crypto.randomUUID();jobs.set(id,new Map());return json({job:id});}
  if(path==='export/finish'){
    const job=jobs.get(body.job);if(!job?.has('project.laserman.json'))throw Error('Falta el proyecto de exportación.');
    const project=validateProject(JSON.parse(await job.get('project.laserman.json').text()));
    job.set('assets/'+project.audio.url.split('/').at(-1),await asset(project.audio.url));
    job.set('patch/portion-x-jacket.json',await(await originalFetch(new URL('assets/jacket-patch.json',base))).blob());
    const blob=await zipFiles(job),url=URL.createObjectURL(blob);jobs.delete(body.job);setTimeout(()=>URL.revokeObjectURL(url),300_000);return json({url});
  }
  return json({error:'Operación no disponible.'},404);
}
export function installWebPlatform(){
  globalThis.fetch=async(input,init)=>{
    const url=new URL(typeof input==='string'||input instanceof URL?input:input.url,location.href);
    if(url.origin!==location.origin)return originalFetch(input,init);
    if(url.pathname.startsWith('/api/')||url.pathname.startsWith(base.pathname+'api/')){
      try{return await route(new Request(url,init||(input instanceof Request?input:undefined)),url);}catch(error){return json({error:error.message},409);}
    }
    if(url.pathname.startsWith(base.pathname+'assets/user-')){try{return new Response(await asset(url.href));}catch(error){return json({error:error.message},404);}}
    return originalFetch(input,init);
  };
}
