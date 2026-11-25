import {createScene} from './scene.js?v=1.8.2-apertura';
import {createLedEngine} from './led-engine.js?v=1.8.2-apertura';
import {validateProject} from './engine.js?v=1.8.2-apertura';

// One media element owns picture, clean music, seeking and the 3D clock.
// This presentation never imports the editor, device transport or saved projects.
const video=document.getElementById('referenceVideo');
const status=document.getElementById('status');
let failed=false;
const fail=message=>{failed=true;status.hidden=false;status.textContent=message;};
try{
  const read=async url=>{const r=await fetch(url,{cache:'no-cache'});if(!r.ok)throw Error('No se pudo cargar '+url);return r.json();};
  const [saved,fixture]=await Promise.all([
    read('assets/suite-show-cliente-urban-verde-blanco-show.json'),
    read('assets/jacket-patch.json')
  ]);
  const project=validateProject(saved),scene=createScene(document.getElementById('stage'),fixture);
  const led=createLedEngine(fixture,scene.points),tracks=project.tracks.filter(t=>t.type==='suit');
  let lastTime=-1,buffers=[],frontSet=false,lastDraw=0;
  const time=()=>Math.min(project.duration,Math.max(0,video.currentTime));
  function draw(now){
    requestAnimationFrame(draw);
    // 30 simulation frames per second, with direct updates for native seeking.
    if(!video.paused&&!video.seeking&&now-lastDraw<1000/30)return;
    lastDraw=now;
    const t=time();
    if(t!==lastTime){buffers=tracks.map(track=>led.render(project,track,t));lastTime=t;}
    scene.update(project,t,buffers);
    if(!frontSet){scene.view('front');frontSet=true;}
    if(scene.urban.ready&&!failed)status.hidden=true;
    else if(scene.urban.error)fail('No se pudo cargar el 3D. Recarga para volver a intentarlo.');
    if(video.currentTime>=project.duration&&!video.paused){video.pause();video.currentTime=project.duration;}
  }
  video.src='assets/smi-mobile-reference.mp4';
  video.volume=project.audio?.volume??1;
  video.addEventListener('error',()=>fail('No se pudo cargar el video. Recarga para volver a intentarlo.'));
  document.addEventListener('visibilitychange',()=>{if(document.hidden)video.pause();});
  // Read-only inspection surface for verifying the published presentation.
  window.SMI_VIEW=Object.freeze({project,scene,get time(){return time();},get renderedTime(){return lastTime;}});
  requestAnimationFrame(draw);
}catch(error){console.error(error);fail('No se pudo abrir SMI. Revisa tu conexión y recarga.');}
