export function mountReferenceVideo({seek,stop,setPlaying=()=>{}}) {
  const get=id=>document.getElementById(id),video=get('referenceVideo'),follow=get('referenceFollow'),offset=get('referenceOffset');
  get('referenceCompare').onchange=()=>document.querySelector('.preview-pair').classList.toggle('compare-3d',get('referenceCompare').checked);
  follow.checked=true;follow.disabled=true;follow.title='Video, audio, editor y 3D comparten el mismo tiempo';
  let last=-Infinity,internalTarget=null,externalTarget=null,externalBusy=false,revision=0;
  let playRequested=false,pauseRequested=false,loading=!video.readyState,pointerActive=false;
  const fps=()=>Number(video.dataset.fps)||30,delta=()=>Number(offset.value)||0;
  const bounded=t=>Math.max(0,Math.min(Number.isFinite(video.duration)?video.duration:0,t));
  function mediaPause(){if(!video.paused){pauseRequested=true;video.pause();}}
  function jump(t){
    if(!video.readyState||!Number.isFinite(video.duration))return;
    const target=bounded(t);if(Math.abs(video.currentTime-target)<.000001)return;
    internalTarget=target;video.currentTime=target;
  }
  function reset(){
    revision++;internalTarget=null;externalTarget=null;externalBusy=false;
    playRequested=false;pauseRequested=false;pointerActive=false;last=-Infinity;loading=true;
  }
  async function acceptVideoTime(t){
    externalTarget=bounded(t);internalTarget=null;
    if(externalBusy)return;
    const generation=revision;externalBusy=true;mediaPause();
    try{
      await stop();
      if(generation===revision&&externalTarget!==null)seek(externalTarget-delta());
    }finally{
      if(generation===revision){externalBusy=false;externalTarget=null;last=-Infinity;}
    }
  }
  video.addEventListener('seeking',()=>{
    if(loading||!video.readyState)return;
    // Playback may advance between setting currentTime and receiving seeking.
    // A native control gesture clears this marker before its own seek fires.
    if(internalTarget!==null)return;
    void acceptVideoTime(video.currentTime);
  });
  video.addEventListener('seeked',()=>{
    internalTarget=null;
  });
  video.addEventListener('pointerdown',()=>{pointerActive=true;internalTarget=null;});
  video.addEventListener('pointerup',()=>{pointerActive=false;});
  video.addEventListener('pointercancel',()=>{pointerActive=false;});
  document.addEventListener?.('pointerup',()=>{pointerActive=false;},true);
  document.addEventListener?.('pointercancel',()=>{pointerActive=false;},true);
  video.addEventListener('keydown',()=>{internalTarget=null;});
  video.addEventListener('loadedmetadata',()=>{loading=false;internalTarget=null;last=-Infinity;});
  video.addEventListener('play',()=>{
    if(playRequested){playRequested=false;return;}
    if(!loading&&!externalBusy)void setPlaying(true);
  });
  video.addEventListener('pause',()=>{
    if(pauseRequested){pauseRequested=false;return;}
    if(!loading&&!externalBusy)void stop();
  });
  for(const [id,direction] of [['referenceBack',-1],['referenceForward',1]])get(id).onclick=async()=>{
    const target=bounded(video.currentTime+direction/fps());
    await acceptVideoTime(target);jump(target);
  };
  get('referenceToEditor').onclick=()=>acceptVideoTime(video.currentTime);
  video.ontimeupdate=()=>{get('referenceTime').textContent=video.currentTime.toFixed(3)+' s';};
  return {reset,update(time,playing,rate){
    follow.checked=true;
    if(loading||!video.readyState||externalBusy||pointerActive)return;
    const now=performance.now();if(now-last<50)return;last=now;
    const target=bounded(time+delta());
    if(Math.abs(video.currentTime-target)>(playing?.06:.004))jump(target);
    if(video.playbackRate!==rate)video.playbackRate=rate;
    if(playing&&video.paused&&!playRequested){
      playRequested=true;
      video.play().catch(()=>{}).finally(()=>{playRequested=false;});
    }else if(!playing&&!video.paused)mediaPause();
  }};
}
