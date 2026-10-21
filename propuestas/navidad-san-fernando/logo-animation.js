(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.BrandAnimation=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const clamp=x=>Math.max(0,Math.min(1,x));
  const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
  // Every property is derived from the audio clock, including seek, pause and repeat.
  function frame(time,track,preview=false,reduced=false){
    const elapsed=time-track.ignitionAt;
    if(preview)return {visible:true,opacity:.9,scale:1,y:4.8,rotation:0,glow:.12};
    if(elapsed<0||time>=track.duration)return {visible:false,opacity:0,scale:.65,y:4.45,rotation:0,glow:0};
    const reveal=smooth(elapsed/.65),fade=smooth((track.duration-time)/1.5);
    // Music and choreography share this same BPM phase.
    const beat=elapsed*track.bpm/60,phase=beat-Math.floor(beat),pulse=Math.exp(-phase*7);
    const entrance=Math.exp(-elapsed*2.2)*Math.sin(elapsed*9);
    return {visible:true,opacity:reveal*fade,scale:reduced?1:(.68+.32*reveal+.22*entrance+.085*pulse),y:reduced?4.8:4.45+.35*reveal,rotation:reduced?0:.025*Math.sin(beat*Math.PI/2)*reveal,glow:reduced?.12:(.18+.42*pulse+.35*Math.exp(-elapsed*2))*reveal*fade};
  }
  return {frame};
});
