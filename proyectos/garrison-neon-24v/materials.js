/* R04 · Materiales UV por superficie. Ninguna foto panorámica se proyecta sobre el edificio. */
window.makeGarrisonMaterials=function(T,scene){
 let seed=240610;const rand=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
 function noiseTexture(){const c=document.createElement('canvas');c.width=c.height=128;const cx=c.getContext('2d'),d=cx.createImageData(128,128);for(let i=0;i<d.data.length;i+=4){const n=190+rand()*60;d.data[i]=d.data[i+1]=d.data[i+2]=n;d.data[i+3]=255;}cx.putImageData(d,0,0);const tex=new T.CanvasTexture(c);tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.colorSpace=T.SRGBColorSpace;return tex;}
 const grain=noiseTexture();
 const cubeFaces=[];for(let j=0;j<6;j++){const c=document.createElement('canvas');c.width=c.height=128;const cx=c.getContext('2d'),grad=cx.createLinearGradient(0,0,0,128);grad.addColorStop(0,'#262936');grad.addColorStop(.55,'#101218');grad.addColorStop(1,'#08080b');cx.fillStyle=grad;cx.fillRect(0,0,128,128);for(let k=0;k<12;k++){cx.fillStyle=k%3?'#62635d':'#b7b7b0';cx.fillRect(rand()*128,25+rand()*65,1+rand()*4,10+rand()*26);}cubeFaces.push(c);}
 const env=new T.CubeTexture(cubeFaces);env.colorSpace=T.SRGBColorSpace;env.needsUpdate=true;scene.environment=env;
 const cache=new Map();
 function material(color){
  if(cache.has(color))return cache.get(color);
  const mat=new T.MeshStandardMaterial({color,map:grain,roughness:.78,metalness:.12,side:T.DoubleSide});
  if(['#a7a6a1','#4d5054','#44464a'].includes(color)){mat.metalness=.78;mat.roughness=.32;mat.envMapIntensity=.65;}
  if(color==='#303437'||color==='#1e292b'){
   mat.color.set('#141c22');mat.metalness=.72;mat.roughness=.16;mat.envMapIntensity=1.35;
  }
  if(color==='#951d29'){mat.roughness=.25;mat.metalness=.4;}
  if(color==='#8e2334'){
   mat.color.set('white');mat.map=new T.TextureLoader().load('assets/referencia-roja.jpg');
   // Recorte UV de un cartel, fijado a cada panel: nunca se mueve con la cámara.
   mat.map.colorSpace=T.SRGBColorSpace;mat.map.repeat.set(.065,.12);mat.map.offset.set(.02,.18);mat.roughness=.8;mat.emissive.set('#6e1523');mat.emissiveIntensity=.15;
  }
  cache.set(color,mat);return mat;
 }
 return material;
};

window.configureGarrisonNeon=function(material,index,shared){
 material.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,shared);shader.uniforms.uStrip={value:index};
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec2 vTubeUv;').replace('#include <project_vertex>','#include <project_vertex>\nvTubeUv=uv;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
   varying vec2 vTubeUv;uniform float uMusicTime;uniform float uVisualMode;uniform float uVisuals;uniform float uStrip;uniform float uSpeed;uniform float uMusicalFlash;

  `);
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   float along=vTubeUv.x;float tt=uMusicTime*uSpeed;float pattern=1.0;float mode=mod(uVisualMode,12.0);vec3 tint=vec3(1.0);
   if(uVisuals>.5){
    if(mode<.5)pattern=.15+.85*pow(.5+.5*sin(along*22.0-tt*15.0+uStrip*.6),3.0);
    else if(mode<1.5)pattern=step(.42,fract(along*9.0-tt*4.0+uStrip*.1));
    else if(mode<2.5)pattern=.08+.92*pow(.5+.5*cos(abs(along-.5)*35.0-tt*17.0),5.0);
    else if(mode<3.5)pattern=.28+.72*pow(.5+.5*sin(along*18.0-tt*22.0+uStrip),2.0);
    else if(mode<4.5)pattern=step(.75,sin(along*60.0-tt*10.0+uStrip*2.1));
    else if(mode<5.5)pattern=.12+.88*step(.5,fract(along*6.0+tt*3.0+mod(uStrip,2.0)*.5));
    else if(mode<6.5)pattern=pow(max(0.0,1.0-abs(along-fract(tt*1.6+uStrip*.1))*7.0),2.0);
    else if(mode<7.5)pattern=.15+.85*step(.35,abs(along-.5)+.3*sin(tt*13.0+uStrip));
    else if(mode<8.5)pattern=.04+.96*step(.75,fract(sin(floor(along*28.0)*78.2+floor(tt*14.0)*5.7+uStrip)*43758.54));
    else if(mode<9.5)pattern=.18+.82*step(.5,fract(along*5.0+tt*2.0+mod(uStrip,2.0)*.5));
    else if(mode<10.5)pattern=.1+.9*pow(.5+.5*sin(along*45.0+tt*22.0-uStrip),8.0);
    else pattern=.15+.85*step(.5,sin(along*20.0-tt*16.0)*cos(tt*9.0+uStrip));
   }
   pattern=mix(pattern,1.0,uMusicalFlash);diffuseColor.rgb*=tint*pattern;diffuseColor.a*=pattern;
  `);
 };
 material.customProgramCacheKey=()=> 'garrison-neon-uv-r04-'+index;
};
