/* Facade projection of the published LIGHTMAN tree choreography.
   The unchanged TreeChoreography.pattern supplies the 24 seasonal patterns.
   Normalized a = facade width, h = facade height. All motion uses audio time. */
window.HolidayFacade = class HolidayFacade {
 constructor(T,scene){
  this.T=T;this.width=64;this.height=192;
  this.palettes={christmas:[[1,.025,.025],[.025,1,.14],[1,.65,.12]],gold:[[1,.68,.12],[1,.93,.65],[1,.22,.02]],ice:[[.025,.42,1],[.2,.86,1],[1,1,1]],candy:[[1,.015,.04],[1,.94,.88],[.02,1,.16]],multicolor:[[1,.015,.14],[.02,1,.25],[.015,.3,1],[.65,.06,1],[1,.65,.02]],midnight:[[.015,.12,1],[.4,.025,.85],[.06,.65,1]],aurora:[[.02,.9,.7],[.15,.08,1],[.75,.02,.5]]};
  this.bytes=new Uint8Array(this.width*this.height*4);this.texture=new T.DataTexture(this.bytes,this.width,this.height,T.RGBAFormat);this.texture.magFilter=T.LinearFilter;this.texture.minFilter=T.LinearFilter;this.texture.needsUpdate=true;
  this.points=[];for(let y=0;y<this.height;y++)for(let x=0;x<this.width;x++)this.points.push({a:x/(this.width-1),h:y/(this.height-1),strand:x,pixel:y});
  const canvas=document.createElement('canvas');canvas.width=this.width;canvas.height=this.height;const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.textAlign='center';ctx.font='bold 12px Arial';ctx.fillText('FELIZ',32,148);ctx.font='bold 10px Arial';ctx.fillText('NAVIDAD',32,162);this.messageMask=ctx.getImageData(0,0,this.width,this.height).data;
  this.snowSeeds=[];const position=new Float32Array(720*3);let seed=73019;const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296};for(let i=0;i<720;i++)this.snowSeeds.push([random()*40-20,random(),random()*30-14,.5+random(),random()*6.28]);
  this.snowGeometry=new T.BufferGeometry();this.snowGeometry.setAttribute('position',new T.BufferAttribute(position,3));this.snowMaterial=new T.ShaderMaterial({uniforms:{opacity:{value:.4}},vertexShader:'void main(){vec4 p=modelViewMatrix*vec4(position,1.);gl_PointSize=clamp(80./max(1.,-p.z),1.,3.7);gl_Position=projectionMatrix*p;}',fragmentShader:'uniform float opacity;void main(){float d=length(gl_PointCoord-.5)*2.;if(d>1.)discard;gl_FragColor=vec4(.78,.88,1.,pow(1.-d,1.3)*opacity);}',transparent:true,depthWrite:false,blending:T.AdditiveBlending});this.snow=new T.Points(this.snowGeometry,this.snowMaterial);this.snow.frustumCulled=false;scene.add(this.snow);
 }
 frame(cue,p,beat,t,track){
  const pal=this.palettes[cue.palette]||this.palettes.christmas,fract=x=>x-Math.floor(x),clamp=x=>Math.max(0,Math.min(1,x));
  if(cue.effect==='intro'){const progress=clamp(t/track.ignitionAt);return {color:pal[0],gain:.02+.78*clamp((progress*1.12-p.h)*7)*(.55+.45*Math.exp(-fract(beat)*5))}}
  if(cue.effect==='burst')return {color:[1,.94,.8],gain:1};
  if(cue.effect==='snow'){const v=fract(p.h+beat*.15+fract(Math.sin(p.strand*635.5)*43758.5)*.7);return {color:pal[pal.length-1],gain:.15+.85*Math.pow(.5+.5*Math.sin(v*Math.PI*14),12)}}
  return TreeChoreography.pattern(cue.effect,p,pal,beat);
 }
 update(t,track,state){
  let index=track.cues.findIndex(c=>t>=c.start&&t<c.end);if(index<0)index=track.cues.length-1;const cue=track.cues[index],previous=track.cues[Math.max(0,index-1)],beat=t*track.bpm/60;let blend=Math.max(0,Math.min(1,(t-cue.start)/.55));blend=blend*blend*(3-2*blend);
  this.message=state.messages&&t>track.ignitionAt+8&&beat%64>48&&(state.concept===1||state.concept===3);
  const messageMix=this.message?Math.min(1,(beat%64-48)/2,(64-beat%64)/2):0;
  const motionBeat=beat*state.speed/.4;
  for(let i=0;i<this.points.length;i++){const p=this.points[i],current=this.frame(cue,p,motionBeat,t,track),old=blend<1?this.frame(previous,p,motionBeat,t,track):current;const mask=this.messageMask[((this.height-1-p.pixel)*this.width+p.strand)*4+3]/255;
   for(let k=0;k<3;k++){let v=(old.color[k]*old.gain*(1-blend)+current.color[k]*current.gain*blend);if(this.message&&p.h<.36)v=v*(1-messageMix*.88)+mask*messageMix*(k===2?.5:1);this.bytes[i*4+k]=Math.max(0,Math.min(255,Math.round(v*255)))}this.bytes[i*4+3]=255;
  }this.texture.needsUpdate=true;
  const pos=this.snowGeometry.attributes.position.array;for(let i=0;i<this.snowSeeds.length;i++){const s=this.snowSeeds[i];pos[i*3]=s[0]+Math.sin(t*.12+s[4])*.8;pos[i*3+1]=34-((s[1]+t*.022*s[3])%1)*34;pos[i*3+2]=s[2]};this.snowGeometry.attributes.position.needsUpdate=true;this.snow.visible=state.snow&&!state.blackout;this.snowMaterial.uniforms.opacity.value=state.day?.18:.5;
  return {cue,beat,level:cue.effect==='intro'?.18+.55*Math.min(1,t/track.ignitionAt):.82+.18*cue.energy};
 }
};

