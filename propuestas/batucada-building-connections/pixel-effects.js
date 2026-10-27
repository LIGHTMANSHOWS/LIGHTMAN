import * as THREE from 'three';

// Instance colors modulate emission as well as the diode's diffuse material.
// Ordinary instanceColor alone leaves MeshStandardMaterial's LEDs uniformly lit.
export function createPixelEffects(state){
 const strips=[],material=new THREE.MeshStandardMaterial({color:'#555555',emissive:'#ffffff',emissiveIntensity:1.65,roughness:.4,metalness:.05});
 material.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
 #if defined(USE_COLOR) || defined(USE_COLOR_ALPHA)
 totalEmissiveRadiance *= vColor.rgb;
 #endif`);};
 material.customProgramCacheKey=()=> 'lightman-pixel-emission-v1';
 const color=new THREE.Color(),base=new THREE.Color();
 function register(inst,points){
  strips.push({inst,points,phase:strips.length*.71});
  base.set(state.color);for(let i=0;i<inst.count;i++)inst.setColorAt(i,base);
  inst.instanceColor.setUsage(THREE.DynamicDrawUsage);
 }
 function update(t,energy=0,rhythm=null){
  base.set(state.color);
  const beat=rhythm?.beat??t*1.8,accent=rhythm?.accent??0;
  for(const s of strips){for(let i=0;i<s.inst.count;i++){
   const p=s.points[i],flow=p.y*5-beat*state.pixelSpeed*Math.PI*2;
   let gain=1;
   if(state.pixelEffect==='chase')gain=.12+.88*Math.pow(.5+.5*Math.cos(flow),6);
   else if(state.pixelEffect==='spark'){
    const step=Math.floor(beat*state.pixelSpeed*4),hash=Math.sin(i*127.1+s.phase*311.7+step*74.7)*43758.5453;
    gain=(hash-Math.floor(hash))>.85?(.45+.55*accent):.07;
   }else if(state.pixelEffect==='rainbow'){
    color.setHSL(((p.y*.32-beat*state.pixelSpeed*.10)%1+1)%1,1,.5);
    gain=.65+.35*Math.sin(flow);
   }else if(state.pixelEffect==='pulse')gain=.13+.87*accent;
   if(state.pixelEffect!=='rainbow')color.copy(base);
   const attack=.6+.65*accent+.15*energy;color.multiplyScalar(gain*attack);s.inst.setColorAt(i,color);
  }s.inst.instanceColor.needsUpdate=true;}
 }
 return {material,register,update};
}
