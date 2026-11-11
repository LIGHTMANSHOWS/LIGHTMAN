'use strict';

(() => {
  const byId = id => document.getElementById(id);
  const viewport = byId('viewport');
  const message = byId('viewer-message');
  const cameraButtons = [...document.querySelectorAll('[data-camera]')];
  const lookButtons = [...document.querySelectorAll('[data-look]')];
  const playButton = byId('play-show');
  const range = byId('show-position');
  const audio = new Audio();
  const demoLength = 36;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({antialias: true, alpha: false, preserveDrawingBuffer: true});
  } catch {
    message.textContent = 'El visor 3D requiere WebGL. Los planos y los renders están disponibles en esta página.';
    for (const button of [...cameraButtons, ...lookButtons, playButton, range, byId('save-image'), byId('reset-show'), byId('choose-audio')]) button.disabled = true;
    return;
  }
  renderer.setPixelRatio(Math.min(1.65, devicePixelRatio || 1));
  if ('outputColorSpace' in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;
  else renderer.outputEncoding = THREE.sRGBEncoding;
  viewport.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#110f1b');
  scene.fog = new THREE.FogExp2('#110f1b', .011);
  const camera = new THREE.PerspectiveCamera(43, 1, .1, 160);
  const rig = new THREE.Group();
  scene.add(rig);
  scene.add(new THREE.HemisphereLight('#e6ddff', '#44314f', 1.45));
  const key = new THREE.DirectionalLight('#ffedc8', 2.0);
  key.position.set(5, 18, 13);
  scene.add(key);
  const rim = new THREE.DirectionalLight('#a790ff', 1.3);
  rim.position.set(-15, 11, -9);
  scene.add(rim);

  const material = (color, metalness = 0, roughness = .76) => new THREE.MeshStandardMaterial({color, metalness, roughness});
  const stage = material('#292532');
  const stageEdge = material('#171420');
  const metal = material('#46404e', .55, .55);
  const darkMetal = material('#211d27', .42);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(140, 140), material('#171422'));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -.035;
  scene.add(ground);
  const grid = new THREE.GridHelper(66, 66, '#56516b', '#332e43');
  grid.position.y = -.017;
  grid.material.transparent = true;
  grid.material.opacity = .36;
  scene.add(grid);

  const unitBox = new THREE.BoxGeometry(1, 1, 1);
  function box(parent, x, y, z, w, h, d, surface) {
    const mesh = new THREE.Mesh(unitBox, surface);
    mesh.position.set(x, y, z);
    mesh.scale.set(w, h, d);
    parent.add(mesh);
    return mesh;
  }
  box(rig, 0, .76, -2.8, 17.99, 1.52, 10.28, stageEdge);
  box(rig, 0, 1.53, -2.8, 17.99, .09, 10.28, stage);
  box(rig, 0, 1.47, 2.39, 17.99, .09, .1, metal);
  for (const side of [-1, 1]) {
    for (let step = 0; step < 7; step++) box(rig, side * 8.32, .105 + .214 * step, 4.65 - .34 * step, 1.06, .21 + .214 * step, .35, darkMetal);
  }

  const trussMatrices = [];
  const unitY = new THREE.Vector3(0, 1, 0);
  const bar = new THREE.Object3D();
  function strut(a, b, radius = .027) {
    const start = new THREE.Vector3(...a);
    const end = new THREE.Vector3(...b);
    const direction = end.clone().sub(start);
    bar.position.copy(start).addScaledVector(direction, .5);
    bar.quaternion.setFromUnitVectors(unitY, direction.clone().normalize());
    bar.scale.set(radius, direction.length(), radius);
    bar.updateMatrix();
    trussMatrices.push(bar.matrix.clone());
  }
  function truss(start, end, size = .48, step = 1.27) {
    const a = new THREE.Vector3(...start);
    const b = new THREE.Vector3(...end);
    const axis = b.clone().sub(a);
    const segments = Math.ceil(axis.length() / step);
    const norm = axis.clone().normalize();
    const reference = Math.abs(norm.y) > .85 ? new THREE.Vector3(1, 0, 0) : unitY;
    const u = new THREE.Vector3().crossVectors(norm, reference).normalize().multiplyScalar(size / 2);
    const v = new THREE.Vector3().crossVectors(norm, u).normalize().multiplyScalar(size / 2);
    const corners = [[-1,-1], [1,-1], [1,1], [-1,1]];
    const point = (i, j) => a.clone().addScaledVector(axis, i / segments).addScaledVector(u, corners[j][0]).addScaledVector(v, corners[j][1]).toArray();
    for (let j = 0; j < 4; j++) strut(point(0, j), point(segments, j), .04);
    for (let i = 0; i <= segments; i++) {
      for (let j = 0; j < 4; j++) {
        const next = (j + 1) % 4;
        strut(point(i, j), point(i, next), .019);
        if (i < segments) strut(point(i, i % 2 ? j : next), point(i + 1, i % 2 ? next : j), .021);
      }
    }
  }
  truss([-14.12,14.17,1.65], [14.12,14.17,1.65], .55);
  truss([-8.995,14.17,-8.63], [8.995,14.17,-8.63], .55);
  truss([-7.1,10.16,-4.85], [7.1,10.16,-4.85], .41);
  for (const side of [-1, 1]) {
    const inner = side * 8.995;
    const outer = side * 14.135;
    for (const x of [inner, outer]) {
      truss([x,.09,1.65], [x,14.17,1.65], .49);
      truss([x,.09,-.92], [x,14.17,-.92], .46);
      truss([x,14.17,-.92], [x,14.17,1.65], .46);
    }
    truss([inner,14.17,1.65], [inner,14.17,-8.63], .53);
    truss([inner,.1,-8.63], [inner,14.17,-8.63], .49);
    for (const y of [.12, 3.16, 9.34, 11.66]) truss([inner,y,1.65], [outer,y,1.65], .29);
    for (const [bottom, top] of [[.2,3.1],[3.22,9.22],[9.4,11.64],[11.7,14.0]]) {
      strut([inner,bottom,1.66], [outer,top,1.66], .034);
      strut([outer,bottom,-.92], [inner,top,-.92], .033);
    }
    for (const x of [2.85, 5.45]) truss([side*x,13.94,1.65], [side*x,13.94,-8.5], .36);
    for (let i=0; i<10; i++) {
      const angle = .1 + i*.029;
      box(rig, side * 8.2, 5.25 + i*.42, .83, .67, .4, .68, darkMetal).rotation.x = angle;
    }
  }
  const display = document.createElement('canvas');
  display.width = 512;
  display.height = 256;
  const brush = display.getContext('2d');
  const texture = new THREE.CanvasTexture(display);
  if ('colorSpace' in texture) texture.colorSpace = THREE.SRGBColorSpace;
  else texture.encoding = THREE.sRGBEncoding;
  const screenArt = new THREE.MeshBasicMaterial({map:texture, side:THREE.DoubleSide});
  const accentScreen = new THREE.MeshBasicMaterial({color:'#f5bc4a', side:THREE.DoubleSide});
  function panel(x,y,z,w,h,yaw=0, art=false) {
    const group = new THREE.Group();
    group.position.set(x,y,z);
    group.rotation.y = yaw;
    rig.add(group);
    box(group, 0, 0, -.085, w+.08, h+.06, .17, darkMetal);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(w,h), art ? screenArt : accentScreen);
    face.position.z = .007;
    group.add(face);
  }
  const [mainScreen, outerScreen, innerScreen, sideFront, frontScreen, overhead] = project.screens;
  panel(0,7.0,-5.3,mainScreen.width,mainScreen.height,0,true);
  panel(0,2.5,2.65,frontScreen.width,frontScreen.height);
  for (const side of [-1,1]) {
    panel(side*11.565,6.2,1.83,outerScreen.height,outerScreen.width,0,true);
    for (const y of [6.33,9.37]) panel(side*7.1,y,-2.23,innerScreen.width,innerScreen.height,-side*.67, true);
    panel(side*6.5,2.94,1.05,sideFront.width,sideFront.height,-side*.53);
  }

  function overheadRibbon(x) {
    const positions = [];
    const indices = [];
    const steps = 28;
    for (let i=0; i<=steps; i++) {
      const t = i/steps;
      const z = 1.47 - 9.35*t;
      const y = 13.85 - 3.08 * (1 - Math.pow(1-t, 1.75));
      positions.push(x - overhead.width/2, y, z, x + overhead.width/2, y, z);
      if (i<steps) indices.push(i*2,i*2+2,i*2+1,i*2+1,i*2+2,i*2+3);
      if (i%7===0) strut([x-.80,y+.03,z],[x+.80,y+.03,z],.025);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions,3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    rig.add(new THREE.Mesh(geometry, accentScreen));
    for (const sign of [-1,1]) {
      const spine = [];
      for (let i=0; i<=steps; i++) {
        const t = i/steps;
        spine.push(new THREE.Vector3(x + sign*.767, 13.88 - 3.08*(1-Math.pow(1-t,1.75)), 1.47 - 9.35*t));
      }
      rig.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(spine),28,.022,5,false),darkMetal));
    }
  }
  for (const x of [-2.6,0,2.6]) overheadRibbon(x);
  const trussMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(1,1,1,5), metal, trussMatrices.length);
  trussMatrices.forEach((matrix, i) => trussMesh.setMatrixAt(i, matrix));
  rig.add(trussMesh);

  const glowMap = document.createElement('canvas');
  glowMap.width = 128;
  glowMap.height = 128;
  const glowBrush = glowMap.getContext('2d');
  const grad = glowBrush.createRadialGradient(64,64,0,64,64,64);
  grad.addColorStop(0,'rgba(255,255,255,0.9)');
  grad.addColorStop(.24,'rgba(255,255,255,0.40)');
  grad.addColorStop(1,'rgba(255,255,255,0)');
  glowBrush.fillStyle = grad;
  glowBrush.fillRect(0,0,128,128);
  const halo = new THREE.CanvasTexture(glowMap);
  const tubeGeo = new THREE.CylinderGeometry(.024,.024,2,8);
  const tubePoints = [];
  for (const side of [-1,1]) {
    for (const y of project.tubeBands) {
      for (let index=0; index<project.tubesPerTowerBand; index++) tubePoints.push([side*(9.05+index*.248),y,1.97]);
    }
  }
  for (let index=0; index<project.frontTubeCount; index++) {
    const x = (index - (project.frontTubeCount-1)/2)*.231;
    tubePoints.push([x,3.50,2.40-Math.max(0,Math.abs(x)-4.1)*.21]);
  }
  const tubes = new THREE.InstancedMesh(tubeGeo, new THREE.MeshBasicMaterial({color:0xffffff}), tubePoints.length);
  const tubeDummy = new THREE.Object3D();
  tubePoints.forEach(([x,y,z],i) => {
    tubeDummy.position.set(x,y,z);
    tubeDummy.updateMatrix();
    tubes.setMatrixAt(i,tubeDummy.matrix);
    tubes.setColorAt(i,new THREE.Color('#d984ff'));
  });
  rig.add(tubes);

  const lampShell = new THREE.CylinderGeometry(.098,.11,.15,10);
  const lampFace = new THREE.SphereGeometry(.075,8,6);
  const lampColors = [new THREE.MeshBasicMaterial({color:'#ffe58e'}),new THREE.MeshBasicMaterial({color:'#fbabff'})];
  const lampHalos = lampColors.map(({color}) => new THREE.SpriteMaterial({map:halo,color,blending:THREE.AdditiveBlending,transparent:true,depthWrite:false,opacity:.57}));
  function lamp(x,y,z,palette=0) {
    const mount = new THREE.Mesh(lampShell,darkMetal);
    mount.rotation.x = Math.PI/2;
    mount.position.set(x,y,z);
    rig.add(mount);
    const front = new THREE.Mesh(lampFace,lampColors[palette]);
    front.scale.z = .55;
    front.position.set(x,y,z+.097);
    rig.add(front);
    const sprite = new THREE.Sprite(lampHalos[palette]);
    sprite.position.set(x,y,z+.16);
    sprite.scale.setScalar(.65);
    rig.add(sprite);
  }
  for (const side of [-1,1]) {
    for (let i=0;i<10;i++) lamp(side*14.03,3.2+i*.72,1.98,i%2);
    for (let i=0;i<5;i++) {
      lamp(side*(9.52+i*1.03),12.02,1.98);
      lamp(side*(5.02+i*.83),5.34, -.73);
    }
    for (let i=0;i<3;i++) lamp(side*(3.8+i*.7),1.69,2.38,1);
    for (const x of [1.12,4.03]) for (let i=0;i<4;i++) lamp(side*x,12.8-i*.34,.55-i*1.13,i%2);
  }
  for (let i=0;i<14;i++) lamp(-6.3+i*.97,9.89,-4.49,i%2);

  const beamMaterial = new THREE.ShaderMaterial({
    uniforms:{tint:{value:new THREE.Color('#de86f6')},power:{value:.27}},
    vertexShader:'varying vec3 p; varying vec3 n; varying vec3 v; void main(){p=position; vec4 view=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);v=normalize(-view.xyz);gl_Position=projectionMatrix*view;}',
    fragmentShader:'uniform vec3 tint; uniform float power; varying vec3 p; varying vec3 n; varying vec3 v; void main(){float t=clamp(p.y+.5,0.,1.);float rim=pow(abs(dot(normalize(n),normalize(v))),.65);gl_FragColor=vec4(tint,power*rim*(1.-smoothstep(.1,1.,t)));}',
    transparent:true, blending:THREE.AdditiveBlending, side:THREE.DoubleSide, depthWrite:false
  });
  const beamGeometry = new THREE.CylinderGeometry(.79,.045,1,15,1,true);
  const beams = [];
  for (const side of [-1,1]) {
    for (let i=0;i<5;i++) {
      const start = new THREE.Vector3(side*(2.55+i*.8),11.35-i*.72,-4.2+i*.46);
      const mesh = new THREE.Mesh(beamGeometry,beamMaterial);
      mesh.frustumCulled = false;
      rig.add(mesh);
      beams.push({mesh,start,side,index:i});
    }
  }

  const palette = {
    ambar:['#ffd95e','#d48624','#38142b','#db82ff','#ef99fd'],
    violeta:['#f396fa','#7833b1','#251044','#ef9aff','#be70ff'],
    azul:['#92efff','#326cca','#102050','#58e9ff','#8dd5ff']
  };
  function palm(x,y,scale,flip) {
    brush.save();
    brush.translate(x,y);
    brush.scale(scale*flip,scale);
    brush.fillStyle='#241632';
    brush.beginPath();
    brush.moveTo(-4,0); brush.quadraticCurveTo(3,-35,9,-85); brush.lineTo(16,-85); brush.quadraticCurveTo(11,-35,4,0); brush.fill();
    for (const [dx,dy,m] of [[-64,8,-1],[-52,-23,-1],[-17,-53,-1],[22,-47,1],[55,-26,1],[65,5,1],[41,24,1],[-36,28,-1]]) {
      brush.beginPath();
      brush.moveTo(12,-85); brush.quadraticCurveTo(dx*.55,-112,12+dx,-85+dy);
      brush.quadraticCurveTo(12+dx*.55,-91+dy*.24,12+dx*.14,-80+m*3);
      brush.closePath(); brush.fill();
    }
    brush.restore();
  }
  let lastArtFrame = -1;
  let lastLook = '';
  const temporary = new THREE.Color();
  const vector = new THREE.Vector3();
  function lightScene(look,t,energy,animated) {
    const [hot,mid,shade,tubeColor,beamColor] = palette[look];
    const phase = animated ? Math.floor(t*9) : 0;
    if (phase !== lastArtFrame || look !== lastLook) {
      lastArtFrame = phase;
      lastLook = look;
      const gradient = brush.createLinearGradient(0,0,0,256);
      gradient.addColorStop(0,shade); gradient.addColorStop(.52,mid); gradient.addColorStop(.94,hot);
      brush.fillStyle=gradient; brush.fillRect(0,0,512,256);
      const glow = brush.createRadialGradient(256+Math.sin(t*.8)*70,154,8,256,154,238);
      glow.addColorStop(0,hot+'b8'); glow.addColorStop(1,hot+'00');
      brush.fillStyle=glow; brush.fillRect(0,0,512,256);
      palm(111,273,1.01,1); palm(391,281,.88,-1); palm(63,284,.59,-1); palm(455,284,.65,1);
      brush.fillStyle='#0d0a1b21';
      for (let y=0;y<256;y+=4) brush.fillRect(0,y,512,1);
      texture.needsUpdate = true;
    }
    accentScreen.color.set(hot).multiplyScalar(.86+energy*.18);
    lampColors[0].color.set(hot); lampColors[1].color.set(beamColor);
    lampHalos[0].color.set(hot); lampHalos[1].color.set(beamColor);
    beamMaterial.uniforms.tint.value.set(beamColor);
    beamMaterial.uniforms.power.value=.15+energy*.20;
    tubePoints.forEach(([x,y],i) => {
      const shimmer = animated ? .77+.17*Math.sin(t*3.9-x*.57-y*.32)+energy*.18 : .92;
      tubes.setColorAt(i,temporary.set(tubeColor).multiplyScalar(shimmer));
    });
    tubes.instanceColor.needsUpdate = true;
    for (const {mesh,start,side,index} of beams) {
      vector.set(-side*(4.5+index*.29)+Math.sin(t*(animated?1.28:0)+index*.72)*1.7, 1.8+index*.31+Math.cos(t*.8+index)*1.17, 7.1+index*.54);
      mesh.position.copy(start).addScaledVector(vector,.5);
      mesh.quaternion.setFromUnitVectors(unitY, vector.clone().normalize());
      mesh.scale.set(.74+index*.09,vector.length(),.74+index*.09);
    }
  }

  const presets = {
    perspectiva:{yaw:.33,pitch:.24,distance:31,target:[0,6.7,-1.9],label:'Perspectiva'},
    frontal:{yaw:0,pitch:.045,distance:32,target:[0,6.9,-1.0],label:'Frontal'},
    planta:{yaw:0,pitch:1.54,distance:32,target:[0,4,-2.15],label:'Planta'}
  };
  let orbit = {...presets.perspectiva};
  let needsRender = true;
  function selectCamera(name) {
    orbit={...presets[name]};
    byId('camera-label').textContent=presets[name].label;
    cameraButtons.forEach(button=>button.setAttribute('aria-pressed',button.dataset.camera===name));
    needsRender=true;
  }
  cameraButtons.forEach(button=>button.addEventListener('click',()=>selectCamera(button.dataset.camera)));
  function customCamera() {
    byId('camera-label').textContent='Vista libre';
    cameraButtons.forEach(button=>button.setAttribute('aria-pressed',false));
    needsRender=true;
  }
  function zoom(factor) {
    orbit.distance=THREE.MathUtils.clamp(orbit.distance*factor,14,86);
    customCamera();
  }
  function resize() {
    const {clientWidth:width,clientHeight:height}=viewport;
    if (!width || !height) return;
    camera.aspect=width/height;
    camera.updateProjectionMatrix();
    renderer.setSize(width,height,false);
    needsRender=true;
  }
  new ResizeObserver(resize).observe(viewport);
  resize();
  const pointers = new Map();
  viewport.addEventListener('pointerdown',event=>{
    if (event.button !== 0) return;
    viewport.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
  });
  function pinchDistance() {
    const [a,b]=pointers.values();
    return Math.hypot(a.x-b.x,a.y-b.y);
  }
  viewport.addEventListener('pointermove',event=>{
    const before=pointers.get(event.pointerId);
    if (!before) return;
    const previousDistance=pointers.size===2?pinchDistance():0;
    pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
    if (previousDistance>5) zoom(previousDistance/Math.max(5,pinchDistance()));
    else if (pointers.size===1) {
      orbit.yaw-=(event.clientX-before.x)*.008;
      orbit.pitch=THREE.MathUtils.clamp(orbit.pitch+(event.clientY-before.y)*.007,-.06,1.55);
      customCamera();
    }
  });
  for (const name of ['pointerup','pointercancel','lostpointercapture']) viewport.addEventListener(name,event=>pointers.delete(event.pointerId));
  viewport.addEventListener('wheel',event=>{event.preventDefault();zoom(Math.exp(event.deltaY*(event.deltaMode===1?.029:.001)));},{passive:false});
  viewport.addEventListener('keydown',event=>{
    const moves={ArrowLeft:[.13,0],ArrowRight:[-.13,0],ArrowUp:[0,.09],ArrowDown:[0,-.09]};
    if (moves[event.key]) {
      event.preventDefault();
      const [yaw,pitch]=moves[event.key]; orbit.yaw+=yaw; orbit.pitch=THREE.MathUtils.clamp(orbit.pitch+pitch,-.06,1.55);customCamera();
    } else if (['+','=','-'].includes(event.key)) {event.preventDefault();zoom(event.key==='-'?1.13:.89);}
  });
  const target=new THREE.Vector3();
  function draw() {
    const distance=orbit.distance*Math.max(1,1.68/camera.aspect);
    target.set(...orbit.target);
    camera.position.set(target.x+distance*Math.sin(orbit.yaw)*Math.cos(orbit.pitch),target.y+distance*Math.sin(orbit.pitch),target.z+distance*Math.cos(orbit.yaw)*Math.cos(orbit.pitch));
    camera.lookAt(target);
    renderer.render(scene,camera);
    needsRender=false;
  }
  byId('save-image').addEventListener('click',()=>{
    draw();
    renderer.domElement.toBlob(blob=>{
      if (!blob) return;
      const link=document.createElement('a');
      link.href=URL.createObjectURL(blob);link.download='circulo-militar-visor.png';link.click();
      setTimeout(()=>URL.revokeObjectURL(link.href),1000);
    },'image/png');
  });

  let activeLook='ambar';
  let playing=false;
  let previewTimeline=false;
  let position=0;
  let duration=demoLength;
  let startedAt=0;
  let audioUrl='';
  let hasAudio=false;
  let analyser;
  let context;
  let bins;
  const audioStatus=byId('audio-status');
  const volume=byId('audio-volume');
  audio.loop=true;
  audio.volume=Number(volume.value)/100;
  function clock(value) {
    const seconds=Math.floor(value);
    return `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;
  }
  function updateTime() {
    range.max=String(duration);
    range.value=String(position);
    byId('show-time').value=`${clock(position)} / ${clock(duration)}`;
  }
  function updateTransport() {
    updateTime();
    playButton.querySelector('span').textContent=playing?'Pausar show':'Reproducir show';
    playButton.firstChild.nodeValue=playing?'Ⅱ ':'▶ ';
    playButton.setAttribute('aria-pressed',playing);
  }
  function updateLook(name) {
    activeLook=name;
    lookButtons.forEach(button=>button.setAttribute('aria-pressed',button.dataset.look===name));
  }
  function renderShow(animate) {
    const looks=['ambar','violeta','azul','ambar'];
    const look=animate?looks[Math.floor(position/9)%looks.length]:activeLook;
    let energy=animate?.28+.22*(1+Math.sin(position*Math.PI*2*1.95)): .45;
    if (animate&&hasAudio&&analyser) {
      analyser.getByteFrequencyData(bins);
      const bass=bins.subarray(1,9);
      energy=.2+.8*bass.reduce((sum,value)=>sum+value,0)/(255*bass.length);
    }
    lightScene(look,position,energy,animate&&!reduceMotion);
    needsRender=true;
  }
  function pause() {
    playing=false;
    audio.pause();
    updateTransport();
  }
  function seek(seconds) {
    position=Math.min(duration,Math.max(0,seconds));
    if (hasAudio) audio.currentTime=position;
    startedAt=performance.now()-position*1000;
    updateTransport();
    renderShow(previewTimeline);
  }
  lookButtons.forEach(button=>button.addEventListener('click',()=>{
    pause();previewTimeline=false;updateLook(button.dataset.look);seek(0);
  }));
  range.addEventListener('input',()=>{previewTimeline=true;seek(Number(range.value));});
  byId('reset-show').addEventListener('click',()=>{pause();previewTimeline=false;seek(0);});
  playButton.addEventListener('click',async()=>{
    if (playing) {pause();return;}
    if (position>=duration) seek(0);
    if (hasAudio) {
      try {
        if (!context && window.AudioContext) {
          context=new AudioContext();
          analyser=context.createAnalyser();
          analyser.fftSize=256;
          bins=new Uint8Array(analyser.frequencyBinCount);
          context.createMediaElementSource(audio).connect(analyser).connect(context.destination);
        }
        if (context) await context.resume();
        await audio.play();
      } catch {
        audioStatus.textContent='No se pudo reproducir el archivo. Prueba con otro audio o quítalo para usar la secuencia visual.';
        return;
      }
    }
    startedAt=performance.now()-position*1000;
    previewTimeline=true;
    playing=true;
    updateTransport();
  });
  const audioInput=byId('audio-file');
  byId('choose-audio').addEventListener('click',()=>audioInput.click());
  function clearAudio() {
    pause();
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    audioUrl='';hasAudio=false;
    audio.onloadedmetadata=null;
    audio.removeAttribute('src');audio.load();
    duration=demoLength;audioInput.value='';
    previewTimeline=false;
    byId('volume-row').hidden=true;
    byId('show-mode').textContent='Secuencia visual';
    audioStatus.textContent='Opcional. El audio se reproduce desde tu dispositivo.';
    seek(0);
  }
  byId('clear-audio').addEventListener('click',clearAudio);
  audioInput.addEventListener('change',()=>{
    const file=audioInput.files[0];
    if (!file) return;
    clearAudio();
    audioUrl=URL.createObjectURL(file);
    audioStatus.textContent=`Cargando ${file.name}…`;
    audio.onloadedmetadata=()=>{
      if (audio.currentSrc!==audioUrl||!Number.isFinite(audio.duration)||audio.duration<=0) return;
      hasAudio=true;duration=audio.duration;
      audioStatus.textContent=file.name;
      byId('volume-row').hidden=false;
      byId('show-mode').textContent='Música local';
      seek(0);
    };
    audio.src=audioUrl;
  });
  audio.addEventListener('error',()=>{
    if (!audioUrl) return;
    clearAudio();
    audioStatus.textContent='El navegador no pudo abrir ese archivo de audio.';
  });
  volume.addEventListener('input',()=>{audio.volume=Number(volume.value)/100;});
  window.addEventListener('pagehide',()=>audio.pause());

  function tick(now) {
    if (playing) {
      position=hasAudio?audio.currentTime:((now-startedAt)/1000)%duration;
      updateTime();
      renderShow(true);
    }
    if (needsRender) draw();
    requestAnimationFrame(tick);
  }
  selectCamera('perspectiva');
  renderShow(false);
  draw();
  viewport.classList.add('ready');
  message.hidden=true;
  updateTransport();
  requestAnimationFrame(tick);
})();
