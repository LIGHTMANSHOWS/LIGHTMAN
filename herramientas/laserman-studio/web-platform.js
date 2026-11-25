import {validateProject} from './engine.js?v=1.8.2-apertura';
import {validateProjection} from './projection.js?v=1.8.2-apertura';
import {applyCommands,COMMAND_SCHEMA} from './commands.js?v=1.8.2-apertura';
import {zipFiles,unzipFiles} from './web-zip.js?v=1.8.2-apertura';

const originalFetch=globalThis.fetch.bind(globalThis),base=new URL('./',import.meta.url),mediaUrls=new Map(),jobs=new Map(),queues=new Map();
const database=new Promise((resolve,reject)=>{
  const request=indexedDB.open('lightman-laserman-web-v1',1);
  request.onupgradeneeded=()=>request.result.createObjectStore('records');
  request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(Error('No se pudo abrir el almacenamiento del navegador.'));
});
async function read(key){const db=await database;return new Promise((resolve,reject)=>{const r=db.transaction('records').objectStore('records').get(key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
async function write(key,value){const db=await database;return new Promise((resolve,reject)=>{const t=db.transaction('records','readwrite');t.objectStore('records').put(value,key);t.oncomplete=resolve;t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error||Error('No se pudo guardar.'));});}
function serial(key,operation){const task=(queues.get(key)||Promise.resolve()).catch(()=>{}).then(operation);queues.set(key,task);task.finally(()=>{if(queues.get(key)===task)queues.delete(key);}).catch(()=>{});return task;}
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
const conflict=()=>Object.assign(Error('El show cambió desde su lectura. Revisa los cambios antes de guardar.'),{conflict:true});
async function digest(data){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',data))].map(n=>n.toString(16).padStart(2,'0')).join('');}
const revision=project=>digest(new TextEncoder().encode(JSON.stringify(project)));
const catalogPromise=originalFetch(new URL('assets/show-catalog.json',base),{cache:'no-store'}).then(r=>r.json());
async function catalog(){return {...await catalogPromise,shows:[...(await catalogPromise).shows,...(await read('local-catalog')||[])]};}
async function renamePublishedUrban(id,current){
  if(id!=='show-cliente-urban-verde-blanco')return current;
  const old='LIGHTMAN · Show cliente · Urban verde y blanco',rename=current.project.name===old,firstApertureUpdate=!current.smiApertureUpdated;
  if(!rename&&!firstApertureUpdate)return current;
  const identity=JSON.stringify(current.project.projection?.corners)===JSON.stringify([[-1,1],[1,1],[1,-1],[-1,-1]]);
  const project={...current.project,...(rename?{name:'SMI'}:{}),...(firstApertureUpdate&&identity?{projection:{corners:[[-.5,.5],[.5,.5],[.5,-.5],[-.5,-.5]]}}:{})};
  const next={...current,project,smiApertureUpdated:true,revision:await revision(project)},db=await database;
  return new Promise((resolve,reject)=>{const t=db.transaction('records','readwrite'),store=t.objectStore('records'),r=store.get('show/'+id);let result=current;
    r.onsuccess=()=>{result=r.result||current;if(result.revision!==current.revision)return;
      store.put(current.project,'backup/smi-aperture-'+current.revision);store.put(next,'show/'+id);store.put(next.revision,'revision/'+id);result=next;};
    t.oncomplete=()=>resolve(result);t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error||Error('No se pudo actualizar SMI.'));
  });
}
async function state(id){
  const existing=await read('show/'+id);if(existing)return renamePublishedUrban(id,existing);
  const entry=(await catalog()).shows.find(s=>s.id===id);if(!entry)throw Error('Show no encontrado.');
  const project=validateProject(await(await originalFetch(new URL(entry.project,base))).json());
  const seed={project,revision:await revision(project),...(id==='show-cliente-urban-verde-blanco'?{smiApertureUpdated:true}:{})};
  const db=await database;return new Promise((resolve,reject)=>{const t=db.transaction('records','readwrite'),store=t.objectStore('records'),r=store.get('show/'+id);let result;
    r.onsuccess=()=>{result=r.result||seed;if(!r.result)store.put(seed,'show/'+id);store.put(result.revision,'revision/'+id);};t.oncomplete=()=>resolve(result);t.onerror=()=>reject(t.error);
  });
}
async function save(id,project,expected,command){
  const current=await state(id),next={...current,project:validateProject(project),revision:await revision(project)};
  const db=await database;return new Promise((resolve,reject)=>{const t=db.transaction('records','readwrite'),store=t.objectStore('records'),r=store.get('show/'+id);let failure;
    r.onsuccess=()=>{if(!r.result||r.result.revision!==expected){failure=conflict();t.abort();return;}store.put(next,'show/'+id);store.put(next.revision,'revision/'+id);
      if(command){store.put(r.result.project,'backup/'+command.id);store.put(command,'command/'+command.id);store.put(command.id,'last-command/'+id);}
    };t.oncomplete=()=>resolve(next);t.onerror=()=>reject(failure||t.error);t.onabort=()=>reject(failure||t.error||Error('No se pudo guardar.'));
  });
}
async function asset(url){
  const name=new URL(url,base).pathname.split('/').at(-1);
  if(name.startsWith('user-')){const stored=await read('audio/'+name);if(stored)return stored;}
  const r=await originalFetch(new URL(url,base));if(!r.ok)throw Error('No se pudo cargar el medio. Abre el ZIP del show o importa el archivo.');return r.blob();
}
export async function resolveMediaUrl(url){
  if(!url.split('/').at(-1).startsWith('user-'))return new URL(url,base).href;
  if(!mediaUrls.has(url))mediaUrls.set(url,URL.createObjectURL(await asset(url)));return mediaUrls.get(url);
}
async function saveMedia(blob,name){
  if(blob.size>200_000_000)throw Error('El medio supera 200 MB.');
  const ext=name.match(/\.(wav|mp3|ogg|m4a|flac|aac|webm|mp4)$/i)?.[0]?.toLowerCase();if(!ext)throw Error('Formato de medio no admitido.');
  const filename='user-'+(await digest(await blob.arrayBuffer())).slice(0,20)+ext;await write('audio/'+filename,blob);return 'assets/'+filename;
}
const defaults={device:'',trackId:'laser-1',keepConnected:false,scale:1,intensity:.5,autoConnect:false,kpps:15,projection:{corners:[[-1,1],[1,1],[1,-1],[-1,-1]]}};
async function settings(){return {...defaults,...await read('suite-settings'),device:'',autoConnect:false};}
async function archive(project){const versions=await read('versions')||[],id=crypto.randomUUID()+'.json';versions.push({id,name:project.name,saved:new Date().toLocaleString('es-PE'),project});await write('versions',versions.slice(-100));return id;}
async function route(request,url){
  const path=url.pathname.replace(/^.*\/api\//,'');
  if(path==='catalog')return json(await catalog());
  if(path==='devices')return json({devices:[]});
  if(['outputs/status','outputs/stop','outputs/release','outputs/test/stop'].includes(path))return json({enabled:false,error:null,fb3:{},artnetEnabled:false});
  if(path.startsWith('outputs/'))return json({error:'La emisión FB3 requiere el operador local del PC del montaje.'},409);
  if(path==='show'&&request.method==='GET')return json(await state(url.searchParams.get('id')));
  if(path==='show-revisions'){
    const shows={};for(const s of (await catalog()).shows){const rev=await read('revision/'+s.id)||(await state(s.id)).revision,last=await read('last-command/'+s.id);shows[s.id]={revision:rev,command:last?await read('command/'+last):null};}return json({shows});
  }
  if(path==='commands/schema')return json(COMMAND_SCHEMA);
  if(path==='commands/status'){const entry=await read('command/'+url.searchParams.get('id'));return entry?json(entry):json({error:'Comando no encontrado.'},404);}
  if(path==='project/versions')return json({versions:(await read('versions')||[]).slice().reverse().map(({project,...v})=>v)});
  if(path==='project/version'){const entry=(await read('versions')||[]).find(v=>v.id===url.searchParams.get('id'));return entry?json({project:entry.project}):json({error:'Versión no encontrada.'},404);}
  if(path==='audio')return json({url:await saveMedia(await request.blob(),url.searchParams.get('name')||'audio.wav')});
  if(path==='import-show'){
    const files=await unzipFiles(await request.blob()),raw=files.get('project.laserman.json');if(!raw||raw.length>20_000_000)throw Error('Falta el proyecto o supera 20 MB.');
    const project=validateProject(JSON.parse(new TextDecoder().decode(raw)));
    for(const field of ['audio','reference']){const url=project[field]?.url;if(!url)continue;const name=url.split('/').at(-1),data=files.get('assets/'+name)||files.get('audio/'+name);if(data)project[field].url=await saveMedia(new Blob([data]),name);}
    return json({project});
  }
  if(path.startsWith('export/part/')){const [,,id,name]=path.split('/'),job=jobs.get(id);if(!job||!/^[a-zA-Z0-9_.-]{1,70}$/.test(name))throw Error('Exportación no válida.');const blob=await request.blob();if(blob.size>200_000_000)throw Error('Archivo demasiado grande.');job.set(name,blob);return json({ok:true});}
  const body=request.method==='GET'?{}:await request.json();
  if(path==='suite/settings'){
    if(request.method==='GET')return json(await settings());
    const next={...await settings(),...body,device:'',autoConnect:false};validateProjection(next.projection);
    if(!Number.isInteger(next.kpps)||next.kpps<8||next.kpps>15||!Number.isFinite(next.intensity)||next.intensity<0||next.intensity>1)throw Error('Ajustes fuera de rango.');
    await write('suite-settings',next);return json(next);
  }
  if(path==='show')return serial(body.id,async()=>{const next=await save(body.id,body.project,body.baseRevision);return json({ok:true,revision:next.revision});});
  if(path==='commands')return serial(body.showId,async()=>{
    const current=await state(body.showId);if(current.revision!==body.baseRevision)throw conflict();
    const result=applyCommands(current.project,body.commands),view={};
    if(body.previewAt!==undefined){if(!Number.isFinite(body.previewAt)||body.previewAt<0||body.previewAt>result.project.duration)throw Error('Tiempo de vista previa no válido.');view.seek=body.previewAt;}
    if(body.focusCueId)view.cueId=body.focusCueId==='$last'?result.results.findLast(r=>r.cueId)?.cueId:body.focusCueId;
    if(body.dryRun)return json({ok:true,dryRun:true,revision:current.revision,results:result.results});
    const record={id:crypto.randomUUID(),showId:body.showId,revision:await revision(result.project),results:result.results,view,state:'saved',editorApplied:false,created:Date.now()/1000};
    await save(body.showId,result.project,body.baseRevision,record);return json({ok:true,...record});
  });
  if(path==='commands/ack'){
    const record=await read('command/'+body.id);if(!record||record.revision!==body.revision||!['applied','conflict'].includes(body.state))throw Error('Confirmación de comando no válida.');
    record.state=body.state;record.editorApplied=body.state==='applied';await write('command/'+body.id,record);return json({ok:true});
  }
  if(path==='project/archive')return json({ok:true,id:await archive(validateProject(body.project))});
  if(path==='export/start'){const id=crypto.randomUUID();jobs.set(id,new Map());return json({job:id});}
  if(path==='export/finish'){
    const job=jobs.get(body.job);if(!job?.has('project.laserman.json'))throw Error('Falta el proyecto de exportación.');const project=validateProject(JSON.parse(await job.get('project.laserman.json').text()));
    for(const field of ['audio','reference']){const url=project[field]?.url;if(url)job.set('assets/'+url.split('/').at(-1),await asset(url));}
    job.set('patch/portion-x-jacket.json',await(await originalFetch(new URL('assets/jacket-patch.json',base))).blob());
    const result=URL.createObjectURL(await zipFiles(job));jobs.delete(body.job);setTimeout(()=>URL.revokeObjectURL(result),300_000);return json({url:result});
  }
  return json({error:'Operación no disponible.'},404);
}
export function installWebPlatform(){
  globalThis.fetch=async(input,init)=>{
    const url=new URL(typeof input==='string'||input instanceof URL?input:input.url,location.href);
    if(url.origin!==location.origin)return originalFetch(input,init);
    try{
      if(url.pathname.startsWith('/api/')||url.pathname.startsWith(base.pathname+'api/'))return await route(new Request(url,init||(input instanceof Request?input:undefined)),url);
      if(url.pathname===new URL('assets/show-catalog.json',base).pathname)return json(await catalog());
      if(url.pathname.startsWith(base.pathname+'assets/user-'))return new Response(await asset(url.href));
      return originalFetch(input,init);
    }catch(error){return json({error:error.message,conflict:!!error.conflict},409);}
  };
  window.LASERMAN_COMMANDS={
    schema:()=>structuredClone(COMMAND_SCHEMA),
    getShow:id=>state(id),
    async addShow(project){
      const p=validateProject(project),id='local-'+crypto.randomUUID();p.suiteShowId=id;
      const rev=await revision(p);await write('show/'+id,{project:p,revision:rev});await write('revision/'+id,rev);
      await serial('catalog',async()=>{const local=await read('local-catalog')||[];local.push({id,label:p.name.slice(0,45),name:p.name,duration:p.duration,demo:!p.reference?.hasVideo,fps:p.reference?.fps||30});await write('local-catalog',local);});return id;
    },
    async apply(showId,commands,options={}){const current=await state(showId);const response=await fetch('/api/commands',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({showId,commands,baseRevision:options.baseRevision??current.revision,...options})});const data=await response.json();if(!response.ok)throw Error(data.error);return data;}
  };
  // Archive the pre-library web project once; never silently replace a user's edit.
  read('migrated-1.4').then(async done=>{if(done)return;const old=await read('project');if(old){try{await archive(validateProject(old));}catch{}}await write('migrated-1.4',true);});
}
