(()=>{
 const $=id=>document.getElementById(id),T=THREE,C=Tunnel,s={...C.defaults};
 let rate=50; const rates={structure:50,led:40}; const money=n=>new Intl.NumberFormat('es-PE',{style:'currency',currency:'PEN',minimumFractionDigits:2}).format(n);
 const canvas=$('scene'),host=canvas.parentElement,scene=new T.Scene();let renderer;
 try{renderer=new T.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true});}catch(e){$('scene-error').hidden=false;$('scene-status').textContent='WebGL no disponible';renderer={setPixelRatio(){},shadowMap:{},setSize(){},render(){}};}
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
 const camera=new T.PerspectiveCamera(40,1,.1,150),target=new T.Vector3(0,1.35,-2.0);let azimuth=.7,elevation=.36,radius=12.5,view='perspective';
 const hemi=new T.HemisphereLight(0xffffff,0xa1a59b,1.8);scene.add(hemi);const sun=new T.DirectionalLight(0xfff6e6,2.7);sun.position.set(-5,12,6);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-12,right:12,top:12,bottom:-12,near:1,far:35});sun.shadow.bias=-.0003;scene.add(sun);
 const floor=new T.Mesh(new T.PlaneGeometry(60,60),new T.MeshStandardMaterial({color:0xd0d2cb,roughness:.95}));floor.rotation.x=-Math.PI/2;floor.position.y=-.025;floor.receiveShadow=true;scene.add(floor);
 const grid=new T.GridHelper(30,30,0xb7bdb8,0xc2c7c1);grid.position.y=-.02;grid.material.transparent=true;grid.material.opacity=.35;scene.add(grid);
 let model,dimensionsGroup,labels=[],leds=[],halos=[],effectTime=0,lastFrame=0,paused=false,visible=true;
 const effectNames={solid:'luz fija',rainbow:'arcoíris',wave:'onda cian/magenta',chase:'barrido',pulse:'pulso suave'};
 const baseColors={warm:0xffc47a,neutral:0xfff3dc,cool:0xc3e9ff,cyan:0x27dfff,magenta:0xff40be,blue:0x466eff};
 const spillA=new T.PointLight(0x21cfff,1.4,12,2),spillB=new T.PointLight(0xff30b8,1.1,10,2);spillA.position.set(0,1.4,-1);spillB.position.set(0,1.5,-3.4);scene.add(spillA,spillB);
 const rim=new T.DirectionalLight(0x92b6ff,.65);rim.position.set(-4,7,-7);scene.add(rim);
 function effectColor(arch,edge,time){const c=new T.Color(baseColors[s.tone]);let intensity=1;const phase=arch/Math.max(1,s.count-1);
   if(s.effect==='rainbow')c.setHSL((phase*.75-time*.10+edge*.025+10)%1,1,.52);
   else if(s.effect==='wave')c.setHSL(.50+(Math.sin(phase*5-time*1.7+edge*.3)+1)*.17,1,.53);
   else if(s.effect==='chase'){const center=(time*2.5)%(s.count+2)-1;intensity=.07+.93*Math.exp(-Math.pow((arch-center)/1.15,2));}
   else if(s.effect==='pulse')intensity=.30+.70*(.5+.5*Math.sin(time*1.7-phase*1.2));
   return {color:c,intensity:intensity*s.brightness};
 }
 function applyEffect(){for(const m of leds){const f=effectColor(m.userData.led.arch,m.userData.led.edge,effectTime);m.material.color.copy(f.color).multiplyScalar(Math.min(1.4,Math.max(.015,f.intensity)));}
   for(const m of halos){const f=effectColor(m.userData.glow.arch,m.userData.glow.edge,effectTime);m.material.color.copy(f.color);m.material.opacity=(s.environment==='day'?.045:.17)*f.intensity;}
   spillA.color.copy(effectColor(0,0,effectTime).color);spillB.color.copy(effectColor(s.count-1,0,effectTime).color);spillA.intensity=(s.environment==='night'?2.2:.5)*s.brightness;spillB.intensity=(s.environment==='night'?1.8:.4)*s.brightness;
 }
 function animate(now){requestAnimationFrame(animate);if(!lastFrame){lastFrame=now;return;}if(now-lastFrame<40)return;const dt=Math.min(.1,(now-lastFrame)/1000);lastFrame=now;if(document.hidden||!visible)return;if(!paused)effectTime+=dt*s.speed;if(s.effect!=='solid'&&!paused){applyEffect();render();}}
 new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;}).observe(host);
 requestAnimationFrame(animate);
 function dispose(root){root.traverse(o=>{o.geometry?.dispose();if(o.material&&!Array.isArray(o.material))o.material.dispose();});scene.remove(root);}
 function label(text,position){const el=document.createElement('span');el.className='dim';el.textContent=text;$('dimension-labels').append(el);labels.push({el,p:new T.Vector3(...position)});}
 function line(a,b){const mat=new T.LineBasicMaterial({color:0x947a51,transparent:true,opacity:.75});const l=new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(...a),new T.Vector3(...b)]),mat);dimensionsGroup.add(l);}
 function dimensions(){if(dimensionsGroup)dispose(dimensionsGroup);dimensionsGroup=new T.Group();scene.add(dimensionsGroup);$('dimension-labels').replaceChildren();labels=[];if(!s.dimensions)return;
   const w=s.width/2,z=.78;line([-w,.035,z],[w,.035,z]);for(const x of [-w,w])line([x,.035,z-.12],[x,.035,z+.12]);label(s.width.toFixed(2)+' m', [0,.035,z+.15]);
   const x=w+.4;line([x,0,-.55],[x,s.height,-.55]);for(const y of [0,s.height])line([x-.1,y,-.55],[x+.1,y,-.55]);label(s.height.toFixed(2)+' m',[x+.15,s.height*.55,-.55]);
   const d=C.quantities(s).depth;line([-w-.5,.035,-.55],[-w-.5,.035,-.55-d]);for(const zz of [-.55,-.55-d])line([-w-.62,.035,zz],[-w-.38,.035,zz]);label(d.toFixed(2)+' m',[-w-.6,.035,-.55-d/2]);
 }

 const n=(x,d=2)=>x.toLocaleString('es-PE',{minimumFractionDigits:d,maximumFractionDigits:d});
 const descriptions={hexagon:'Cinco lados LED de un hexágono regular; base abierta.',square:'Dos laterales y un techo de igual longitud; base abierta.',triangle:'Dos lados LED de un triángulo equilátero; base abierta.',rectangle:'Altura y techo modulares independientes; base abierta.',trapezoid:'Modelo del proyecto base adaptado a tubos completos. Laterales inclinados 15° respecto de la vertical.'};
 function update(){
  const q=C.quantities(s);s.width=q.width;s.height=q.height;
  if(model)dispose(model);model=C.makeModel(s);scene.add(model);leds=[];halos=[];
  model.traverse(m=>{if(m.userData.led)leds.push(m);if(m.userData.glow)halos.push(m);});dimensions();
  const night=s.environment==='night';scene.background=new T.Color(night?0x040711:0xe6eaeb);floor.material.color.set(night?0x0b1322:0xd0d2cb);floor.material.roughness=night?.4:.95;grid.material.opacity=night?.07:.35;hemi.intensity=night?.32:1.8;sun.intensity=night?.18:2.7;rim.intensity=night?.75:.1;applyEffect();
  $('modules-out').textContent=s.modules+' × 1,20 m';$('widthModules-out').textContent=s.widthModules+' × 1,20 m';$('count-out').textContent=s.count;$('gap-out').textContent=n(s.gap)+' m';
  const separateRoof=['rectangle','trapezoid'].includes(s.shape);$('width-control').hidden=!separateRoof;$('modules-label').textContent=separateRoof?'Tubos por lateral':'Tubos por lado';$('shape-description').textContent=descriptions[s.shape];
  document.querySelectorAll('[data-shape]').forEach(b=>{const active=b.dataset.shape===s.shape;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
  updateQuote();render();
 }
 function updateQuote(){
  const q=C.quote(s,rate);$('config-name').textContent='Túnel '+C.names[s.shape].toLowerCase();
  $('size-out').textContent=n(q.width)+' × '+n(q.height)+' m';$('depth-out').textContent=n(q.depth)+' m';$('tubes-out').textContent=q.tubes;$('metres-out').textContent=n(q.total)+' m';
  $('formula').textContent=`${s.count} marcos × ${q.perFrame} tubos por marco = ${q.tubes} tubos × 1,20 m = ${n(q.total)} m LED`;
  $('passage-note').textContent=`Base abierta: ${n(q.footprint)} m entre apoyos. Ancho y alto máximos entre ejes; no equivalen a la altura libre en todo el paso.`;
  $('quote-subtotal').textContent=money(q.subtotal);$('quote-tax').textContent=money(q.igv);$('quote-total').textContent=money(q.totalPrice);
  $('scene-status').textContent=s.count+' marcos · '+effectNames[s.effect];$('viewer-price').textContent=money(q.totalPrice)+' con IGV';
 }
 function setView(v){
  view=v;document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===v));
  const q=C.quantities(s),extent=Math.max(q.width,q.height),aspect=host.clientWidth/Math.max(1,host.clientHeight),fit=Math.max(extent,q.width/aspect);
  target.set(0,q.height*.48,-.55-q.depth*.38);
  if(v==='front'){azimuth=0;elevation=.005;radius=Math.max(7,fit*1.8);}
  else if(v==='plan'){target.set(0,0,-.55-q.depth/2);azimuth=0;elevation=1.565;radius=Math.max(9,(q.depth+2)*1.6,q.width/aspect*1.6);}
  else if(v==='inside'){target.set(0,Math.min(1.6,q.height*.55),-.55-q.depth/2);azimuth=0;elevation=0;radius=q.depth/2+1.3;}
  else{azimuth=.65;elevation=.3;radius=Math.max(8.5,fit*1.8,q.depth*1.2+3.5);}
  render();
 }
 function render(){const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();camera.position.set(target.x+radius*Math.sin(azimuth)*Math.cos(elevation),target.y+radius*Math.sin(elevation),target.z+radius*Math.cos(azimuth)*Math.cos(elevation));camera.lookAt(target);renderer.render(scene,camera);for(const l of labels){const p=l.p.clone().project(camera);l.el.style.left=((p.x+1)*w/2)+'px';l.el.style.top=((-p.y+1)*h/2)+'px';l.el.hidden=p.z>1||p.z< -1||Math.abs(p.x)>1||Math.abs(p.y)>1;}}
 const pointers=new Map();let pinch=0;
 canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,[e.clientX,e.clientY]);if(pointers.size===2){const p=[...pointers.values()];pinch=Math.hypot(p[0][0]-p[1][0],p[0][1]-p[1][1]);}});
 canvas.addEventListener('pointermove',e=>{const prev=pointers.get(e.pointerId);if(!prev)return;pointers.set(e.pointerId,[e.clientX,e.clientY]);if(pointers.size===2){const p=[...pointers.values()],dist=Math.hypot(p[0][0]-p[1][0],p[0][1]-p[1][1]);if(dist>0)radius=T.MathUtils.clamp(radius*pinch/dist,1,85);pinch=dist;}else{azimuth-=(e.clientX-prev[0])*.006;elevation=T.MathUtils.clamp(elevation+(e.clientY-prev[1])*.006,-.04,1.565);}render();});
 for(const name of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(name,e=>pointers.delete(e.pointerId));
 canvas.addEventListener('wheel',e=>{e.preventDefault();radius=T.MathUtils.clamp(radius+e.deltaY*.012,1,85);render();},{passive:false});
 document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));
 const presets={hexagon:1,square:2,triangle:3,rectangle:2,trapezoid:2};
 document.querySelectorAll('[data-shape]').forEach(b=>b.onclick=()=>{s.shape=b.dataset.shape;s.modules=presets[s.shape];$('modules').value=s.modules;update();});
 for(const key of ['modules','widthModules','count','gap'])$(key).oninput=e=>{s[key]=+e.target.value;update();};
 for(const key of ['environment','effect','tone'])$(key).onchange=e=>{s[key]=e.target.value;update();};
 for(const key of ['dimensions','human'])$(key).onchange=e=>{s[key]=e.target.checked;update();};
 for(const key of ['speed','brightness'])$(key).oninput=e=>{s[key]=+e.target.value;$(key+'-out').textContent=key==='speed'?n(s.speed,1)+'×':Math.round(s.brightness*100)+'%';applyEffect();render();};
 $('pause-effects').onclick=()=>{paused=!paused;$('pause-effects').textContent=paused?'Reanudar efectos':'Pausar efectos';$('pause-effects').setAttribute('aria-pressed',String(paused));};
 $('quote-option').onchange=e=>{rate=rates[e.target.value];$('rate').value=rate;updateQuote();};
 $('rate').oninput=e=>{const input=e.target;if(!input.validity.valid||input.value===''){input.setAttribute('aria-invalid','true');return;}input.removeAttribute('aria-invalid');rate=+input.value;rates[$('quote-option').value]=rate;updateQuote();};
 $('reset').onclick=()=>{Object.assign(s,C.defaults);Object.assign(rates,{structure:50,led:40});rate=50;$('quote-option').value='structure';$('rate').value=rate;$('rate').removeAttribute('aria-invalid');for(const key of ['modules','widthModules','count','gap','environment','effect','tone','speed','brightness'])$(key).value=s[key];for(const key of ['dimensions','human'])$(key).checked=s[key];paused=false;$('pause-effects').textContent='Pausar efectos';$('pause-effects').setAttribute('aria-pressed','false');$('speed-out').textContent='1,0×';$('brightness-out').textContent='100%';update();setView('perspective');};
 $('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await host.closest('.viewer').requestFullscreen();}catch(e){$('scene-status').textContent='Amplía la ventana para ver más detalle';}};
 function download(blob,name){const a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);}
 $('save-image').onclick=()=>{render();canvas.toBlob(b=>{if(b)download(b,'LIGHTMAN-tunel-'+s.shape+'.png');},'image/png');};
 $('save-summary').onclick=()=>{
  const q=C.quote(s,rate),option=$('quote-option').selectedOptions[0].textContent;
  const lines=['LIGHTMAN · CONFIGURACIÓN DE TÚNEL LED','Estimación referencial · '+new Date().toLocaleDateString('es-PE'),'','Modelo: '+C.names[s.shape],'Base abierta, sin LED en el suelo','Tubo modular: 1,20 m',`Ancho máximo: ${n(q.width)} m | Alto máximo: ${n(q.height)} m`,`Ancho entre apoyos: ${n(q.footprint)} m`,`Marcos: ${s.count} | Separación entre ejes: ${n(s.gap)} m | Recorrido: ${n(q.depth)} m`,`Tubos por marco: ${q.perFrame} | Total tubos: ${q.tubes}`,`LED total: ${n(q.total)} m`,'',`Alcance: ${option}`,`Tarifa sin IGV: ${money(rate)} por metro`,`Subtotal: ${money(q.subtotal)}`,`IGV 18%: ${money(q.igv)}`,`TOTAL: ${money(q.totalPrice)}`,'','Dimensiones entre ejes de tubos. Conectores, bases y tolerancias por validar.','Traslado, montaje, alimentación, control y condiciones comerciales por definir.','La simulación de efectos no modifica el precio base.',''];
  download(new Blob(['\ufeff'+lines.join('\r\n')],{type:'text/plain;charset=utf-8'}),'LIGHTMAN-tunel-'+s.shape+'-configuracion.txt');
 };
 new ResizeObserver(render).observe(host);document.addEventListener('fullscreenchange',render);update();setView('perspective');
})();
