import {createScene} from './duo-scene.js?v=1.0.0';
import {createLedEngine} from './led-engine.js?v=1.8.2-apertura';
import {validateProject} from './engine.js?v=1.8.2-apertura';

// This client presentation has no editor, persistent edits or physical outputs.
// The original reference video is the single clock for picture, sound and 3D.
const video=document.getElementById('referenceVideo');
const status=document.getElementById('status');
let failed=false;
function fail(message){failed=true;status.hidden=false;status.textContent=message;}
try{
  const read=async url=>{const r=await fetch(url);if(!r.ok)throw Error('No se pudo cargar el show.');return r.json();};
  const [saved,fixture]=await Promise.all([
    read('assets/suite-show-cliente-urban-verde-blanco-show.json'),
    read('assets/jacket-patch.json')
  ]);
  const project=validateProject(saved);
  const scene=createScene(document.getElementById('stage'),fixture);
  const led=createLedEngine(fixture,scene.points);
  const tracks=project.tracks.filter(t=>t.type==='suit');
  let lastTime=-1,buffers=[],frontSet=false,lastDraw=0;
  const time=()=>Math.min(project.duration,Math.max(0,video.currentTime));
  function draw(now){
    requestAnimationFrame(draw);
    if(document.hidden||now-lastDraw<1000/30)return;
    lastDraw=now;
    const t=time();
    if(t!==lastTime){buffers=tracks.map(track=>led.render(project,track,t));lastTime=t;}
    scene.update(project,t,buffers);
    if(!frontSet){scene.view('front');frontSet=true;}
    if(scene.urban.ready&&!failed)status.hidden=true;
    else if(scene.urban.error)fail('No se pudo cargar el 3D. Recarga para volver a intentarlo.');
    if(video.currentTime>=project.duration&&!video.paused){video.pause();video.currentTime=project.duration;}
  }
  // 480px H.264/AAC video with its metadata at the start for mobile streaming.
  video.src='assets/smi-duo-mobile.mp4';
  video.volume=project.audio?.volume??1;
  video.addEventListener('seeking',()=>{lastDraw=0;});
  video.addEventListener('error',()=>fail('No se pudo cargar el video. Recarga para volver a intentarlo.'));
  document.addEventListener('visibilitychange',()=>{if(document.hidden)video.pause();});
  window.SMI_VIEW=Object.freeze({project,scene,performerCount:2,get time(){return time();},get renderedTime(){return lastTime;}});
  requestAnimationFrame(draw);
}catch(error){console.error(error);fail('No se pudo abrir el show. Revisa tu conexión y recarga.');}
