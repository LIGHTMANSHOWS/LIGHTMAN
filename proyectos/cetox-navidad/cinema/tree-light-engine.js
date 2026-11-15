(function(root){'use strict';const FX=TreeChoreography;
const PALETTES={christmas:[[1,.025,.025],[.025,1,.14],[1,.65,.12]],gold:[[1,.68,.12],[1,.93,.65],[1,.22,.02]],ice:[[.025,.42,1],[.2,.86,1],[1,1,1]],candy:[[1,.015,.04],[1,.94,.88],[.02,1,.16]],multicolor:[[1,.015,.14],[.02,1,.25],[.015,.3,1],[.65,.06,1],[1,.65,.02]]};
const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));const fract=x=>x-Math.floor(x);const hash=x=>fract(Math.sin(x*127.1+311.7)*43758.5453);const mix=(a,b,t)=>a.map((x,i)=>x+(b[i]-x)*t);
PALETTES.midnight=[[.015,.12,1],[.4,.025,.85],[.06,.65,1]];PALETTES.aurora=[[.02,.9,.7],[.15,.08,1],[.75,.02,.5]];
PALETTES.sanfernando=[[1,.015,.035],[1,.96,.9],[.015,.27,1]];PALETTES.sfblue=[[.01,.12,.65],[.02,.45,1],[1,1,1]];
const EFFECTS=['intro','burst','spiral','ribbons','snow','waves','sparkle','rings','comet','fan','checker','finale',...FX.EFFECTS];
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

root.TreeEngine={PALETTES,EFFECTS,currentCue,currentTrack,lights};})(window);
