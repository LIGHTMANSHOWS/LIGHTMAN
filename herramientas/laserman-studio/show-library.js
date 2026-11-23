// Each show has its own disk file and IndexedDB record, including unsent edits.
export function createShowRepository({request,cache=browserCache()}){
  const queues=new Map(),revisions=new Map();
  async function refresh(id){
    const data=await request('show?id='+encodeURIComponent(id));revisions.set(id,data.revision);
    await cache.put(id,{project:data.project,dirty:false,revision:data.revision});return data.project;
  }
  return {
    revision(id){return revisions.get(id);},
    isSaving(id){return queues.has(id);},
    refresh,
    async load(id){
      const local=await cache.get(id);
      if(local?.dirty){revisions.set(id,local.revision);return structuredClone(local.project);}
      try{return await refresh(id);}
      catch(error){if(local?.project)return structuredClone(local.project);throw error;}
    },
    cache(id,project){return cache.put(id,{project:structuredClone(project),dirty:true,revision:revisions.get(id)});},
    save(id,project){
      const snapshot=structuredClone(project),previous=queues.get(id)||Promise.resolve();
      const cached=cache.put(id,{project:snapshot,dirty:true,revision:revisions.get(id)});
      const task=previous.catch(()=>{}).then(async()=>{
        await cached;
        const result=await request('show',{id,project:snapshot,baseRevision:revisions.get(id)});
        if(result?.revision)revisions.set(id,result.revision);
        const latest=await cache.get(id);
        if(latest&&JSON.stringify(latest.project)===JSON.stringify(snapshot))await cache.put(id,{project:snapshot,dirty:false,revision:revisions.get(id)});
      });
      queues.set(id,task);task.finally(()=>{if(queues.get(id)===task)queues.delete(id);}).catch(()=>{});return task;
    }
  };
}
function browserCache(){
  let db;
  async function open(){
    if(db)return db;
    db=await new Promise((resolve,reject)=>{const r=indexedDB.open('lightman-laserman-web-show-suite-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('shows');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});return db;
  }
  const memory=new Map();
  return {
    async get(id){try{const d=await open();return await new Promise((resolve,reject)=>{const r=d.transaction('shows').objectStore('shows').get(id);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}catch{return memory.get(id);}},
    async put(id,record){memory.set(id,record);try{const d=await open();await new Promise((resolve,reject)=>{const t=d.transaction('shows','readwrite');t.objectStore('shows').put(record,id);t.oncomplete=resolve;t.onerror=()=>reject(t.error);});}catch{}}
  };
}
