/* R04 · Resplandor selectivo de los neones. El local se renderiza sin cambios. */
window.makeGarrisonNeonBloom=function(T,renderer){
 const options={minFilter:T.LinearFilter,magFilter:T.LinearFilter,depthBuffer:false,stencilBuffer:false};
 const source=new T.WebGLRenderTarget(1,1,options),ping=new T.WebGLRenderTarget(1,1,options),pong=new T.WebGLRenderTarget(1,1,options);
 source.depthBuffer=true;
 const quadScene=new T.Scene(),quadCamera=new T.OrthographicCamera(-1,1,1,-1,0,1);
 const vertex='varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';
 const blur=new T.ShaderMaterial({uniforms:{tMap:{value:null},direction:{value:new T.Vector2()}},vertexShader:vertex,fragmentShader:`
 varying vec2 vUv;uniform sampler2D tMap;uniform vec2 direction;
 void main(){vec3 c=texture2D(tMap,vUv).rgb*.227027;
 c+=(texture2D(tMap,vUv+direction*1.384615).rgb+texture2D(tMap,vUv-direction*1.384615).rgb)*.316216;
 c+=(texture2D(tMap,vUv+direction*3.230769).rgb+texture2D(tMap,vUv-direction*3.230769).rgb)*.070270;
 gl_FragColor=vec4(c,1.);}`,depthTest:false,depthWrite:false,toneMapped:false});
 const add=new T.ShaderMaterial({uniforms:{tMap:{value:pong.texture},strength:{value:1.15}},vertexShader:vertex,fragmentShader:'varying vec2 vUv;uniform sampler2D tMap;uniform float strength;void main(){gl_FragColor=vec4(texture2D(tMap,vUv).rgb*strength,1.);}',transparent:true,blending:T.AdditiveBlending,depthTest:false,depthWrite:false,toneMapped:false});
 const quad=new T.Mesh(new T.PlaneGeometry(2,2),blur);quadScene.add(quad);
 const depthMask=new T.MeshBasicMaterial({color:0x000000,colorWrite:false,depthWrite:true,depthTest:true,fog:false,toneMapped:false});
 const size=new T.Vector2(),clearColor=new T.Color();let width=0,height=0;
 function pass(input,target,x,y){blur.uniforms.tMap.value=input;blur.uniforms.direction.value.set(x,y);quad.material=blur;renderer.setRenderTarget(target);renderer.render(quadScene,quadCamera);}
 return {render(scene,camera,flash=false,active=false){
  renderer.getSize(size);const w=Math.max(1,Math.ceil(size.x/2)),h=Math.max(1,Math.ceil(size.y/2));
  if(w!==width||h!==height){width=w;height=h;for(const target of [source,ping,pong])target.setSize(w,h);}
  const mask=camera.layers.mask,background=scene.background,override=scene.overrideMaterial,auto=renderer.autoClear,shadowUpdate=renderer.shadowMap.autoUpdate;
  renderer.getClearColor(clearColor);const alpha=renderer.getClearAlpha();
  scene.background=null;renderer.setClearColor(0x000000,0);renderer.shadowMap.autoUpdate=false;
  renderer.setRenderTarget(source);camera.layers.set(2);scene.overrideMaterial=depthMask;renderer.render(scene,camera);
  scene.overrideMaterial=override;camera.layers.set(1);renderer.autoClear=false;renderer.render(scene,camera);renderer.autoClear=auto;
  camera.layers.mask=mask;scene.background=background;renderer.shadowMap.autoUpdate=shadowUpdate;renderer.setClearColor(clearColor,alpha);
  pass(source.texture,ping,1.6/w,0);pass(ping.texture,pong,0,1.6/h);
  pass(pong.texture,ping,2.5/w,0);pass(ping.texture,pong,0,2.5/h);
  renderer.setRenderTarget(null);renderer.render(scene,camera);
  renderer.autoClear=false;quad.material=add;add.uniforms.strength.value=flash?3.4:active?1.55:1.0;renderer.render(quadScene,quadCamera);renderer.autoClear=auto;
 }};
};
