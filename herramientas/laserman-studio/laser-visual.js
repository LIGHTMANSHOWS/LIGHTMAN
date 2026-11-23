import * as THREE from './vendor/three.module.js';

// Preview-only light: the scan geometry and ILDA export stay in engine/laser.js.
// Screen-space ribbons give the core and its halo a stable width at any angle.
export function createLaserStroke({width=5,opacity=1}={}){
  const geometry=new THREE.InstancedBufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute([
    0,-1,0, 1,-1,0, 1,1,0, 0,-1,0, 1,1,0, 0,1,0
  ],3));
  geometry.instanceCount=0;
  const material=new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
    side:THREE.DoubleSide,toneMapped:false,
    uniforms:{viewport:{value:new THREE.Vector2(1,1)},width:{value:width},
      opacity:{value:opacity},tint:{value:new THREE.Color('#ffffff')}},
    vertexShader:`
      attribute vec3 beamStart;
      attribute vec3 beamEnd;
      attribute vec3 beamColor;
      uniform vec2 viewport;
      uniform float width;
      varying float across;
      varying vec3 lightColor;
      void main(){
        vec4 a=projectionMatrix*modelViewMatrix*vec4(beamStart,1.0);
        vec4 b=projectionMatrix*modelViewMatrix*vec4(beamEnd,1.0);
        // Clip crossing segments before division; orbits can place a hand
        // beam behind the near plane. Both hidden endpoints are discarded.
        float nearZ=projectionMatrix[3][2]/(projectionMatrix[2][2]-1.0);
        vec4 av=modelViewMatrix*vec4(beamStart,1.0);
        vec4 bv=modelViewMatrix*vec4(beamEnd,1.0);
        float plane=-nearZ*1.01;
        if(av.z>plane&&bv.z>plane){gl_Position=vec4(2.0,2.0,2.0,1.0);across=0.0;lightColor=vec3(0.0);return;}
        if(av.z>plane)av=mix(av,bv,(plane-av.z)/(bv.z-av.z));
        if(bv.z>plane)bv=mix(bv,av,(plane-bv.z)/(av.z-bv.z));
        a=projectionMatrix*av;b=projectionMatrix*bv;
        vec2 delta=(b.xy/b.w-a.xy/a.w)*viewport;
        vec2 normal=vec2(-delta.y,delta.x)/max(length(delta),0.0001);
        vec4 point=mix(a,b,position.x);
        point.xy+=normal*position.y*width*2.0/viewport*point.w;
        gl_Position=point;across=position.y;lightColor=beamColor;
      }`,
    fragmentShader:`
      uniform float opacity;
      uniform vec3 tint;
      varying float across;
      varying vec3 lightColor;
      void main(){
        float coreWidth=max(0.095,fwidth(across)*0.65);
        float core=exp(-pow(across/coreWidth,2.0));
        float halo=exp(-across*across*7.0)*0.19;
        vec3 rgb=lightColor*tint;
        // A small highlight on the core keeps saturated colours recognisable.
        gl_FragColor=vec4(mix(rgb,sqrt(max(rgb,vec3(0.0))),core*0.2),
          (core*0.88+halo)*opacity);
        #include <colorspace_fragment>
      }`
  });
  const mesh=new THREE.Mesh(geometry,material);mesh.frustumCulled=false;
  return mesh;
}

export function updateLaserStroke(mesh,positions,colors){
  const count=positions.length/6;let geometry=mesh.geometry;
  let start=geometry.getAttribute('beamStart');
  let allocated=0;
  if(!start||start.count<count){
    const capacity=2**Math.ceil(Math.log2(Math.max(32,count)));
    if(start){
      // Three caches the instancing limit on the geometry after its first
      // draw. Replacing attributes alone leaves that old limit in place and
      // clips longer contours. A fresh geometry also releases the old GPU
      // buffers rather than abandoning them on each capacity increase.
      const next=new THREE.InstancedBufferGeometry();
      next.setAttribute('position',geometry.getAttribute('position').clone());
      geometry.dispose();mesh.geometry=geometry=next;
    }
    for(const key of ['beamStart','beamEnd','beamColor']){
      geometry.setAttribute(key,new THREE.InstancedBufferAttribute(new Float32Array(capacity*3),3).setUsage(THREE.DynamicDrawUsage));
    }
    allocated=1;start=geometry.getAttribute('beamStart');
  }
  const end=geometry.getAttribute('beamEnd'),rgb=geometry.getAttribute('beamColor');
  for(let i=0;i<count;i++){
    const a=i*6,b=i*3;
    for(let k=0;k<3;k++){
      start.array[b+k]=positions[a+k];end.array[b+k]=positions[a+3+k];rgb.array[b+k]=colors[a+k];
    }
  }
  start.needsUpdate=end.needsUpdate=rgb.needsUpdate=true;
  geometry.instanceCount=count;
  return allocated;
}

// A scanned contour sweeps a translucent sheet through haze. It follows each
// lit segment separately, so blanked travel never creates a luminous bridge.
export function createLaserHaze(){
  const geometry=new THREE.BufferGeometry();
  const material=new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,side:THREE.DoubleSide,
    blending:THREE.AdditiveBlending,toneMapped:false,
    uniforms:{time:{value:0}},
    vertexShader:`
      attribute vec3 lightColor;
      attribute float travel;
      varying vec3 rgb;
      varying vec3 worldPoint;
      varying float distanceAlong;
      void main(){
        rgb=lightColor;distanceAlong=travel;
        vec4 world=modelMatrix*vec4(position,1.0);worldPoint=world.xyz;
        gl_Position=projectionMatrix*viewMatrix*world;
      }`,
    fragmentShader:`
      uniform float time;
      varying vec3 rgb;
      varying vec3 worldPoint;
      varying float distanceAlong;
      void main(){
        float density=0.91+0.09*sin(worldPoint.x*3.7+worldPoint.y*2.4+time*0.24)
          *sin(worldPoint.z*4.1-worldPoint.y*1.6-time*0.17);
        float falloff=smoothstep(0.0,0.09,distanceAlong)
          *exp(-distanceAlong*1.25)*(1.0-smoothstep(0.88,1.0,distanceAlong)*0.55);
        gl_FragColor=vec4(rgb,0.18*density*falloff);
        #include <colorspace_fragment>
      }`
  });
  const mesh=new THREE.Mesh(geometry,material);mesh.frustumCulled=false;
  return mesh;
}

export function updateLaserHaze(mesh,origin,segments,colors,time){
  const geometry=mesh.geometry,count=segments.length/6*3;
  let position=geometry.getAttribute('position'),allocated=0;
  if(!position||position.count<count){
    const capacity=2**Math.ceil(Math.log2(Math.max(256,count)));
    for(const key of ['position','lightColor'])geometry.setAttribute(key,
      new THREE.BufferAttribute(new Float32Array(capacity*3),3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('travel',new THREE.BufferAttribute(new Float32Array(capacity),1).setUsage(THREE.DynamicDrawUsage));
    position=geometry.getAttribute('position');allocated=1;
  }
  const rgb=geometry.getAttribute('lightColor'),travel=geometry.getAttribute('travel');
  for(let i=0;i<segments.length/6;i++){
    const s=i*6,v=i*9,t=i*3;
    position.array.set(origin,v);
    for(let k=0;k<6;k++)position.array[v+3+k]=segments[s+k];
    for(let j=0;j<3;j++)for(let k=0;k<3;k++)rgb.array[v+j*3+k]=colors[s+k];
    travel.array[t]=0;travel.array[t+1]=travel.array[t+2]=1;
  }
  position.needsUpdate=rgb.needsUpdate=travel.needsUpdate=true;
  geometry.setDrawRange(0,count);mesh.material.uniforms.time.value=time;
  return allocated;
}
