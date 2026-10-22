(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.TreeEngine=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const FX=typeof module==='object'&&module.exports?require('./choreography.js'):TreeChoreography;
const SPEC={height:12,coneHeight:10.9,diameter:7.5,strands:64,pixelsPerStrand:150,starPixels:96,starCenter:11.45,starRadius:.55,totalPixels:9696,voltage:12,wattPerPixel:.6,universes:65,fps:40};
const OPTIONS=[{id:1,name:'Píxel 360°',description:'Líneas de luz sobre un cono interior opaco.',type:'pixel',reference:null},{id:2,name:'Espiral de luz',description:'Cinta helicoidal de 12 franjas con mensajes navideños, bordes RGB independientes y cono interior opaco.',type:'ribbon',reference:'assets/references/espiral-referencia.png'},{id:3,name:'Bosque de Navidad',description:'40 copos luminosos inclinados y adheridos a la superficie del árbol.',type:'ornaments',reference:'assets/references/copos-referencia.png'}];
const PALETTES={christmas:[[1,.025,.025],[.025,1,.14],[1,.65,.12]],gold:[[1,.68,.12],[1,.93,.65],[1,.22,.02]],ice:[[.025,.42,1],[.2,.86,1],[1,1,1]],candy:[[1,.015,.04],[1,.94,.88],[.02,1,.16]],multicolor:[[1,.015,.14],[.02,1,.25],[.015,.3,1],[.65,.06,1],[1,.65,.02]]};
const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));const fract=x=>x-Math.floor(x);const hash=x=>fract(Math.sin(x*127.1+311.7)*43758.5453);const mix=(a,b,t)=>a.map((x,i)=>x+(b[i]-x)*t);
PALETTES.midnight=[[.015,.12,1],[.4,.025,.85],[.06,.65,1]];PALETTES.aurora=[[.02,.9,.7],[.15,.08,1],[.75,.02,.5]];
PALETTES.sanfernando=[[1,.015,.035],[1,.96,.9],[.015,.27,1]];PALETTES.sfblue=[[.01,.12,.65],[.02,.45,1],[1,1,1]];
const EFFECTS=['intro','burst','spiral','ribbons','snow','waves','sparkle','rings','comet','fan','checker','finale',...FX.EFFECTS];
function addStar(points){const v=[];for(let i=0;i<10;i++){const a=Math.PI/2+i*Math.PI/5,r=i%2===0?.55:.242;v.push({x:Math.cos(a)*r,y:11.45+Math.sin(a)*r,z:0});}for(let i=0;i<96;i++){const u=i/96*10,j=Math.floor(u),f=u-j,a=v[j],b=v[(j+1)%10];points.push({x:a.x+(b.x-a.x)*f,y:a.y+(b.y-a.y)*f,z:0,strand:64,pixel:i,h:1,a:i/96,star:true,feature:'star'});}}
function geometry(option=1){option=Number(option);const points=[];
if(option===2){
// Equal distances along the helix keep the physical LED/text pitch uniform.
const divisions=9600,lengths=new Float64Array(divisions+1),center=f=>{const y=.32+f*10.28,r=3.75*(1-y/10.9)+.045,a=f*Math.PI*24;return {x:Math.sin(a)*r,y,z:Math.cos(a)*r};};
let previous=center(0);for(let j=1;j<=divisions;j++){const p=center(j/divisions);lengths[j]=lengths[j-1]+Math.hypot(p.x-previous.x,p.y-previous.y,p.z-previous.z);previous=p;}
const total=lengths[divisions],pitch=total/1199;let cursor=1;
for(let i=0;i<1200;i++){const distance=i*pitch;while(cursor<divisions&&lengths[cursor]<distance)cursor++;const f=(cursor-1+(distance-lengths[cursor-1])/(lengths[cursor]-lengths[cursor-1]))/divisions,angle=f*Math.PI*24,y=.32+f*10.28;
for(let row=0;row<8;row++){const yy=Math.max(.02,y+(row/7-.5)*.7),r=3.75*(1-yy/10.9)+.045;points.push({x:Math.sin(angle)*r,y:yy,z:Math.cos(angle)*r,strand:Math.floor((i*8+row)/150),pixel:(i*8+row)%150,h:y/10.9,a:fract(angle/(Math.PI*2)),star:false,feature:row===0||row===7?'edge':'ribbon',ribbonProgress:f,ribbonDistance:distance,ribbonStep:pitch,ribbonRow:row});}
}}
else if(option===3){for(let s=0;s<64;s++)for(let p=0;p<120;p++){const h=p/119,a=s/64,angle=a*Math.PI*2,r=3.75*(1-h);points.push({x:Math.sin(angle)*r,y:h*10.9,z:Math.cos(angle)*r,strand:s,pixel:p,h,a:fract(a),star:false,feature:'foliage'});}
// Snowflakes follow the slope and curvature of the cone, 3.5 cm above its surface.
const levels=[{h:.10,count:11},{h:.26,count:9},{h:.42,count:8},{h:.58,count:6},{h:.74,count:4},{h:.89,count:2}],slope=3.75/10.9,verticalScale=1/Math.sqrt(1+slope*slope);let ornament=0;
for(let levelIndex=0;levelIndex<levels.length;levelIndex++){const level=levels[levelIndex];for(let j=0;j<level.count;j++){
const a=fract((j+(levelIndex%2?.5:0))/level.count+.035*levelIndex),angle=a*Math.PI*2,centerY=level.h*10.9,centerRadius=3.75*(1-level.h)+.035,center={x:Math.sin(angle)*centerRadius,y:centerY,z:Math.cos(angle)*centerRadius},radius=.48*(1-level.h*.35);
for(let spoke=0;spoke<6;spoke++){const aa=Math.PI/2+spoke*Math.PI/3;for(let k=0;k<8;k++){let u,v;
if(k<4){const d=(k+1)/4*radius;u=Math.cos(aa)*d;v=Math.sin(aa)*d;}
else{const sign=k<6?1:-1,d=((k%2)+1)/2*radius*.36;u=Math.cos(aa)*radius*.5+Math.cos(aa+sign*Math.PI/3)*d;v=Math.sin(aa)*radius*.5+Math.sin(aa+sign*Math.PI/3)*d;}
const y=centerY+v*verticalScale,theta=angle+u/centerRadius,r=3.75*(1-y/10.9)+.035,idx=points.length;
points.push({x:Math.sin(theta)*r,y,z:Math.cos(theta)*r,strand:Math.floor(idx/150),pixel:idx%150,h:y/10.9,a:fract(theta/(Math.PI*2)),star:false,feature:'ornament',ornament,...(spoke===0&&k===0?{ornamentCenter:center}:{} )});
}}ornament++;}}}
else{for(let s=0;s<64;s++){const angle=s/64*Math.PI*2;for(let p=0;p<150;p++){const h=p/149,r=3.75*(1-h)+.04*h;points.push({x:Math.sin(angle)*r,y:h*10.9,z:Math.cos(angle)*r,strand:s,pixel:p,h,a:s/64,star:false,feature:'pixel'});}}}addStar(points);return points;}
function currentCue(track,t){return track.cues.find(c=>t>=c.start&&t<c.end)||track.cues[track.cues.length-1];}
function currentTrack(show,t){return show.tracks?show.tracks.find(c=>t>=(c.start||0)&&t<c.end)||show.tracks[0]:show;}
function lights(points,t,track,brightness=.85,option=1,edgeSettings={}){const cue=currentCue(track,t),beat=t*track.bpm/60,pulse=Math.exp(-fract(beat)*5),pal=PALETTES[cue.palette]||PALETTES.christmas,result=new Float32Array(points.length*3),ignition=track.ignitionAt||0,flash=t>=ignition&&t<ignition+.48?Math.exp(-(t-ignition)*6):0,tail=clamp((track.duration-t)/1.5);let q=0;for(let i=0;i<points.length;i++){const p=points[i],h=p.h,a=p.a;let c,gain=.9;
if(p.star){c=PALETTES.gold[1];gain=t<ignition?.12+.35*clamp(t/Math.max(1,ignition)):.8+.2*pulse;}
else{switch(cue.effect){case 'intro':{const progress=clamp(t/Math.max(.1,ignition));c=pal[0];gain=.025+.65*clamp((progress*1.12-h)*7)*(.4+.6*pulse);break;}
case 'spiral':{const v=fract(a*3+h*4-beat/4);c=pal[Math.floor(v*pal.length)%pal.length];gain=.3+.7*Math.pow(.5+.5*Math.sin(v*Math.PI*2),2);break;}
case 'ribbons':{const v=fract(a*5+h*1.3-beat/8);c=pal[Math.floor(v*pal.length)%pal.length];gain=.6+.4*pulse;break;}
case 'snow':{c=mix(pal[0],pal[pal.length-1],h);const f=fract(h+beat*.15+hash(p.strand*5)*.7);gain=.35+.65*Math.pow(.5+.5*Math.sin(f*Math.PI*14),12);break;}
case 'waves':{const v=.5+.5*Math.sin(h*13-a*10+beat*Math.PI);c=mix(pal[0],pal[1],v);gain=.35+.65*v;break;}
case 'sparkle':{const s=hash(i+Math.floor(beat*2)*17);c=pal[Math.floor(hash(p.strand+p.pixel*7)*pal.length)];gain=.3+.7*Math.pow(s,6);break;}
case 'rings':{const v=fract(h*8-beat/2);c=pal[Math.floor(fract(h*3+beat/16)*pal.length)];gain=.24+.76*Math.pow(.5+.5*Math.sin(v*Math.PI*2),3);break;}
case 'burst':{const v=fract(h-beat/4);c=pal[Math.floor(fract(a*2+beat/8)*pal.length)];gain=.45+.55*Math.pow(.5+.5*Math.cos(v*Math.PI*2),2);break;}
case 'comet':{const v=fract(h+beat/4+a*2);c=pal[Math.floor(fract(a*3+beat/16)*pal.length)];gain=.18+.82*Math.pow(v,6);break;}
case 'fan':{const v=fract(a*8+beat/6);c=pal[Math.floor(fract(a*5+beat/16)*pal.length)];gain=.2+.8*Math.pow(.5+.5*Math.sin(v*Math.PI*2),2);break;}
case 'checker':{c=pal[(Math.floor(h*10)+Math.floor(a*12)+Math.floor(beat/2))%pal.length];gain=.55+.45*pulse;break;}
case 'finale':{c=pal[Math.floor(fract(h*3+a*4-beat/6)*pal.length)];gain=.7+.3*pulse;break;}default:{const frame=FX.pattern(cue.effect,p,pal,beat);c=frame.color;gain=frame.gain;}}
if(option===2&&p.feature==='edge'&&cue.effect!=='intro'){const frame=FX.edge(p,cue,beat,PALETTES,edgeSettings);c=frame.color;gain=frame.gain;}
if(option===3&&p.feature==='ornament'&&cue.effect!=='intro'){const chase=.5+.5*Math.sin(p.ornament*.9-beat*Math.PI/2);c=mix(c,pal[(p.ornament+Math.floor(beat/4))%pal.length],.55);c=mix(c,[.8,.95,1],.32+.28*pulse);gain=.42+.32*pulse+.26*chase;}if(option===3&&p.feature==='foliage'&&cue.effect!=='intro'){gain=Math.max(gain,.42);c=mix(c,PALETTES.multicolor[Math.floor(hash(i)*5)],.08);}}
if(flash>0){c=mix(c,[1,1,1],flash);gain=Math.max(gain,flash);}const edgeLevel=option===2&&p.feature==='edge'?(edgeSettings.brightness??1):1;for(let j=0;j<3;j++)result[q++]=clamp(c[j]*gain*brightness*tail*edgeLevel);}if(t>=track.duration)result.fill(0);return result;}
function patch(option=1){const outputs=[];for(let i=0;i<64;i++)outputs.push({model:OPTIONS[Number(option)-1].name,block:i+1,strand:i+1,controller:Math.floor(i/8)+1,ip:'10.10.10.'+(101+Math.floor(i/8)),output:i%8+1,universe0:i,universe1:i+1,channelStart:1,channelEnd:450,pixels:150,firstPixel:i*150+1,lastPixel:(i+1)*150,startChannel:i*450+1,endChannel:(i+1)*450,direction:option===1?'base → punta':'orden del modelo 3D; definir cableado en montaje'});outputs.push({model:'Estrella',block:65,strand:65,controller:9,ip:'10.10.10.109',output:1,universe0:64,universe1:65,channelStart:1,channelEnd:288,pixels:96,firstPixel:9601,lastPixel:9696,startChannel:28801,endChannel:29088,direction:'perímetro antihorario'});return {schema:'lightman/tree-pixel-patch/v2',option:Number(option),status:'propuesta; validar cableado, controladores y orden RGB en montaje',spec:SPEC,artnet:{universe_base:0,first_universe:0,last_universe:64,total_universes:65,channels:29088,pixel_order:'RGB',fps:40,transport:'unicast',port:6454,network:'10.10.10.0/24',show_pc:'10.10.10.10'},outputs};}
function pack(rgb){const all=[];for(let u=0;u<65;u++){const len=u===64?288:450,bytes=new Uint8Array(len);for(let i=0;i<len;i++)bytes[i]=Math.round(clamp(rgb[u*450+i])*255);all.push(bytes);}return all;}
function artDmx(universe,bytes,seq=1){if(!Number.isInteger(universe)||universe<0||universe>32767)throw Error('Universo inválido');if(bytes.length<2||bytes.length>512||bytes.length%2)throw Error('Payload ArtDMX inválido');const a=new Uint8Array(18+bytes.length);a.set([65,114,116,45,78,101,116,0,0,0x50,0,14,seq%256,0,universe&255,universe>>8,bytes.length>>8,bytes.length&255]);a.set(bytes,18);return a;}
return {SPEC,OPTIONS,PALETTES,EFFECTS,geometry,currentCue,currentTrack,lights,patch,pack,artDmx};
});
