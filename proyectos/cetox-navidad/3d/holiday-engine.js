/* Facade projection of the published LIGHTMAN tree choreography.
   TreeEngine.lights, TreeChoreography and LedBrand are copied from the published tree.
   Normalized a = facade width, h = facade height. All motion uses audio time. */
window.HolidayFacade = class HolidayFacade {
 constructor(T,scene){
  this.T=T;this.width=64;this.height=192;
  this.palettes=TreeEngine.PALETTES;LedBrand.load();
  this.bytes=new Uint8Array(this.width*this.height*4);this.texture=new T.DataTexture(this.bytes,this.width,this.height,T.RGBAFormat);this.texture.magFilter=T.LinearFilter;this.texture.minFilter=T.LinearFilter;this.texture.needsUpdate=true;
  this.points=[];for(let y=0;y<this.height;y++)for(let x=0;x<this.width;x++)this.points.push({a:x/this.width,h:y/(this.height-1),strand:x,pixel:y,y:y/(this.height-1)*10.9,x:Math.sin(x/this.width*Math.PI*2),z:Math.cos(x/this.width*Math.PI*2),feature:'foliage',star:false});
  const canvas=document.createElement('canvas');canvas.width=this.width;canvas.height=this.height;const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.textAlign='center';ctx.font='bold 12px Arial';ctx.fillText('FELIZ',32,148);ctx.font='bold 10px Arial';ctx.fillText('NAVIDAD',32,162);this.messageMask=ctx.getImageData(0,0,this.width,this.height).data;
  this.snowSeeds=[];const position=new Float32Array(720*3);let seed=73019;const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296};for(let i=0;i<720;i++)this.snowSeeds.push([random()*40-20,random(),random()*30-14,.5+random(),random()*6.28]);
  this.snowGeometry=new T.BufferGeometry();this.snowGeometry.setAttribute('position',new T.BufferAttribute(position,3));this.snowMaterial=new T.ShaderMaterial({uniforms:{opacity:{value:.4}},vertexShader:'void main(){vec4 p=modelViewMatrix*vec4(position,1.);gl_PointSize=clamp(80./max(1.,-p.z),1.,3.7);gl_Position=projectionMatrix*p;}',fragmentShader:'uniform float opacity;void main(){float d=length(gl_PointCoord-.5)*2.;if(d>1.)discard;gl_FragColor=vec4(.78,.88,1.,pow(1.-d,1.3)*opacity);}',transparent:true,depthWrite:false,blending:T.AdditiveBlending});this.snow=new T.Points(this.snowGeometry,this.snowMaterial);this.snow.frustumCulled=false;scene.add(this.snow);
 }
 update(t,track,state){
  const sourceCue=TreeEngine.currentCue(track,t),cue={...sourceCue,effect:state.treeEffect==='auto'||state.treeEffect==='ribbon-source'?sourceCue.effect:state.treeEffect,palette:state.treePalette==='auto'?sourceCue.palette:state.treePalette};
  const displayTrack={...track,bpm:track.bpm*state.speed/.4,cues:[{...cue,start:0,end:track.duration}]},beat=t*track.bpm/60;
  const ribbon=state.treeEffect==='ribbon-source';
  if(ribbon&&!this.ribbonPoints)this.ribbonPoints=this.points.map(p=>{const row=p.pixel%8,column=Math.floor(p.pixel/8)*this.width+p.strand;return {...p,feature:row===0||row===7?'edge':'ribbon',ribbonRow:row,ribbonProgress:column/(this.width*this.height/8-1),ribbonDistance:column,ribbonStep:1}});
  const field=ribbon?this.ribbonPoints:this.points,rgb=TreeEngine.lights(field,t,displayTrack,1,ribbon?2:1);

  this.message=false;if(ribbon||state.messages&&(state.concept===1||state.concept===3)){const content=LedBrand.state(t,track,false,ribbon?2:1);LedBrand.apply(rgb,field,t,track,false,1);this.message=content.active&&content.marquee;if(ribbon){const labels=['Cometas de la cinta','Ondas de la cinta','Cascada de la cinta','Pulsos de la cinta','Destellos de la cinta'];cue.name=labels[Math.floor(Math.max(0,(t-track.ignitionAt)*track.bpm/60)/8)%5];cue.effect='ribbon-source';this.message=false}}
  for(let i=0;i<this.points.length;i++){for(let k=0;k<3;k++)this.bytes[i*4+k]=Math.max(0,Math.min(255,Math.round(rgb[i*3+k]*255)));this.bytes[i*4+3]=255}this.texture.needsUpdate=true;
  const pos=this.snowGeometry.attributes.position.array;for(let i=0;i<this.snowSeeds.length;i++){const s=this.snowSeeds[i];pos[i*3]=s[0]+Math.sin(t*.12+s[4])*.8;pos[i*3+1]=34-((s[1]+t*.022*s[3])%1)*34;pos[i*3+2]=s[2]};this.snowGeometry.attributes.position.needsUpdate=true;this.snow.visible=state.snow&&!state.blackout;this.snowMaterial.uniforms.opacity.value=state.day?.18:.5;
  return {cue,beat,level:cue.effect==='intro'?.18+.55*Math.min(1,t/track.ignitionAt):.82+.18*cue.energy};
 }
};

