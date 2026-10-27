import { createRhythmEngine } from './rhythm-engine.js?v=5.3';
export function setupMusic(){
 const audio=document.querySelector('#batucada-audio'),button=document.querySelector('#music-toggle'),status=document.querySelector('#music-status'),listeners=[];
 let engine=null,started=false,revision=0;
 const fallback=t=>({time:t,beat:t*1.8,phase:(t*1.8)%1,energy:.4,bass:0,mid:0,high:0,kick:0,snare:0,repique:0,accent:0});
 const ready=fetch('assets/audio/rhythm.json').then(r=>{if(!r.ok)throw Error('Rhythm map unavailable');return r.json();}).then(data=>{engine=createRhythmEngine(data);revision++;if(status)status.textContent='Ritmo preparado · pulsa reproducir';}).catch(error=>{console.error(error);if(status)status.textContent='No se pudo cargar la sincronización. Recarga el visor.';});
 if(audio){
  audio.volume=.55;
  button.addEventListener('click',async()=>{if(!audio.paused){audio.pause();return;}try{await ready;await audio.play();}catch(error){status.textContent='No se pudo iniciar el audio. Usa el reproductor para volver a intentarlo.';}});
  for(const event of ['play','pause','seeking','seeked','ended'])audio.addEventListener(event,()=>{
   if(event==='play')started=true;revision++;
   const playing=!audio.paused;button.textContent=playing?'Pausar batucada Ⅱ':'Reproducir batucada ▶';button.setAttribute('aria-pressed',String(playing));
   status.textContent=audio.seeking?'Ajustando al punto de la pista…':playing?'Sincronización activa · golpes y píxeles':started?'Música y músicos en pausa':'Ritmo preparado · pulsa reproducir';listeners.forEach(fn=>fn());
  });
  audio.addEventListener('error',()=>{status.textContent='No se pudo cargar la música. Recarga el visor.';});
 }
 return {ready,get linked(){return started;},get playing(){return !!audio&&!audio.paused;},get revision(){return revision;},time:fallbackTime=>started?audio.currentTime:fallbackTime,sample:t=>engine?engine.sample(t):fallback(t),stroke:(role,t,hand,player)=>engine?engine.stroke(role,t,hand,player):{lift:.35,strength:0,impact:0},energy:()=>engine&&started?engine.sample(audio.currentTime).energy:0,onChange:fn=>listeners.push(fn),pause:()=>audio?.pause(),play:()=>audio?.play()};
}
