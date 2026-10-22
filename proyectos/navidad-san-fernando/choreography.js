(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.TreeChoreography=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x)),fract=x=>x-Math.floor(x),hash=x=>fract(Math.sin(x*127.1+311.7)*43758.5453),mix=(a,b,t)=>a.map((x,i)=>x+(b[i]-x)*t);
const EFFECTS=['candyChase','bellBounce','sleigh','giftBoxes','peppermint','bellPeal','confetti','jingleFinale','garland','weave','fanDance','diamonds','carousel','partyWaves','rainbowChase','deckFinale','cathedral','aurora','vortex','meteorStorm','iceCrystal','organPulse','nova','carolFinale'];
function rainbow(h){h=fract(h)*6;const n=Math.floor(h),f=h-n;return [[1,f,0],[1-f,1,0],[0,1,f],[0,1-f,1],[f,0,1],[1,0,1-f]][n];}
function pattern(effect,p,pal,b){const h=p.h,a=p.a,pulse=Math.exp(-fract(b)*5);let color=pal[0],gain=.8,v=0;
switch(effect){
case 'sanRibbons':v=fract(a*3+h*3-b/12);color=pal[Math.floor(v*pal.length)];gain=.48+.52*Math.pow(.5+.5*Math.cos(v*Math.PI*2),2);break;
case 'sanWings':v=Math.abs(Math.sin(a*Math.PI*2))*2+h*4-b/6;color=pal[Math.floor(fract(v/3)*pal.length)];gain=.16+.84*Math.exp(-fract(v)*5);break;
case 'sanFamily':v=Math.abs(h-(.48+.25*Math.sin(b/8)));color=mix(pal[0],pal[2],.5+.5*Math.sin(a*6.283+b/12));gain=.25+.75*Math.exp(-v*8)*(.65+.35*pulse);break;
case 'candyChase':v=fract(a*4+h*5-b/6);color=pal[Math.floor(v*pal.length)];gain=.4+.6*Math.pow(.5+.5*Math.cos(v*Math.PI*2),2);break;
case 'bellBounce':v=Math.abs(fract(b/4+a*2)*2-1);color=pal[Math.floor(fract(h*3+a)*pal.length)];gain=.13+.87*Math.exp(-Math.pow((h-v)*9,2));break;
case 'sleigh':v=fract(a-h*.6-b/8);color=pal[Math.floor(fract(h*2+b/24)*pal.length)];gain=.18+.82*Math.pow(v,7);break;
case 'giftBoxes':v=(Math.floor(a*8)+Math.floor(h*8)+Math.floor(b/2))%pal.length;color=pal[v];gain=(Math.floor(a*8)+Math.floor(h*8)+Math.floor(b))%2?.95:.35;break;
case 'peppermint':v=fract(a*8+h*.6-b/12);color=pal[Math.floor(v*pal.length)];gain=.85;break;
case 'bellPeal':v=fract(h*5-b/4);color=pal[Math.floor(fract(h+b/32)*pal.length)];gain=.16+.84*Math.exp(-v*6);break;
case 'confetti':v=hash(p.strand*151+p.pixel+Math.floor(b)*73);color=pal[Math.floor(hash(p.pixel*9+Math.floor(b/4))*pal.length)];gain=.15+.85*Math.pow(v,3);break;
case 'jingleFinale':v=fract(a*6-h*3+b/12);color=pal[Math.floor(v*pal.length)];gain=.68+.32*pulse;break;
case 'garland':v=fract(a*2+h*5+b/16);color=pal[Math.floor(v*pal.length)];gain=.42+.58*Math.pow(.5+.5*Math.sin(v*Math.PI*2),2);break;
case 'weave':{const x=Math.sin(a*4*Math.PI+h*9+b*.55),y=Math.cos(a*4*Math.PI-h*9+b*.55);v=(x+y+2)/4;color=mix(pal[0],pal[1],v);gain=.3+.7*Math.max(Math.abs(x),Math.abs(y));break;}
case 'fanDance':v=fract(a*10+b/8);color=pal[(Math.floor(a*10)+Math.floor(b/4))%pal.length];gain=.2+.8*Math.pow(Math.max(0,Math.cos((v-.5)*Math.PI)),4);break;
case 'diamonds':{const x=Math.abs(fract(a*8+b/32)*2-1),y=Math.abs(fract(h*8-b/16)*2-1);v=Math.abs(x+y-1);color=pal[Math.floor(fract(a*3+h*3)*pal.length)];gain=.15+.85*Math.exp(-v*12);break;}
case 'carousel':v=fract(a-b/16);color=pal[Math.floor(v*pal.length)];gain=.6+.4*Math.sin(h*Math.PI);break;
case 'partyWaves':v=.5+.5*Math.sin(h*16+b*.8)*Math.cos(a*6*Math.PI-b*.35);color=mix(pal[0],pal[1],v);gain=.35+.65*v;break;
case 'rainbowChase':v=fract(a+h*2-b/16);color=rainbow(v);gain=.5+.5*pulse;break;
case 'deckFinale':v=fract(h*6-b/4);color=rainbow(a+b/32);gain=.5+.5*Math.pow(.5+.5*Math.sin(v*Math.PI*2),2);break;
case 'cathedral':v=(Math.floor(a*16)+Math.floor(b/4))%4;color=pal[v%pal.length];gain=.18+.82*clamp((.5+.5*Math.sin(b/2+a*8))*1.4-h*.7);break;
case 'aurora':v=.5+.5*Math.sin(a*9+h*5+Math.sin(b/8)*3);color=mix(pal[0],pal[1],v);gain=.35+.65*(.5+.5*Math.sin(h*6-b/6+a*5));break;
case 'vortex':v=fract(a*3-h*5+b/5);color=pal[Math.floor(v*pal.length)];gain=.13+.87*Math.pow(.5+.5*Math.cos(v*Math.PI*2),3);break;
case 'meteorStorm':v=fract(h+b/5+hash(p.strand)*.9);color=pal[Math.floor(hash(p.strand*31+Math.floor(b/4))*pal.length)];gain=.08+.92*Math.pow(v,12);break;
case 'iceCrystal':{const x=Math.abs(fract(a*6)*2-1),y=Math.abs(fract(h*6-b/24)*2-1);v=Math.min(Math.abs(x-y),Math.abs(x+y-1));color=pal[Math.floor(fract(h*3+b/32)*pal.length)];gain=.16+.84*Math.exp(-v*18);break;}
case 'organPulse':v=(Math.floor(a*24)+Math.floor(b))%6;color=pal[v%pal.length];gain=.18+.82*clamp((1-v/7)*(1+.35*pulse)-h*.65);break;
case 'nova':v=fract((1-h)*3-b/4);color=mix(pal[0],pal[1],h);gain=.16+.84*Math.exp(-v*9);break;
case 'carolFinale':v=.5+.5*Math.sin((1-h)*14+a*12-b/2);color=mix(pal[0],pal[1],v);gain=.7+.3*pulse;break;
}return {color,gain};}
function edge(p,cue,beat,palettes,settings={}){const pal=palettes[settings.palette||cue.edgePalette||cue.palette]||palettes.christmas,progress=p.ribbonProgress||p.h,side=(p.strand*150+p.pixel)%8===0?0:.5,b=beat*(cue.edgeSpeed||1)*(cue.edgeDirection||1),q=fract(progress*6-b/10+side);let color,gain;
switch(cue.edgeEffect||'chase'){case 'alternate':{const phase=Math.floor(progress*8)+Math.floor(b/2)+(side?1:0);color=pal[((phase%pal.length)+pal.length)%pal.length];gain=.65+.35*Math.exp(-fract(Math.abs(b))*5);break;}case 'wave':{const f=.5+.5*Math.sin(progress*13+b/5+side*Math.PI);color=mix(pal[0],pal[1],f);gain=.5+.5*f;break;}case 'echo':color=pal[Math.floor(fract(progress*3+b/24+side)*pal.length)];gain=.22+.78*Math.exp(-fract(progress*6-b/4+side)*5);break;default:color=pal[Math.floor(fract(progress*5-b/12+side)*pal.length)];gain=.3+.7*Math.pow(q,3);}
return {color,gain};}
return {EFFECTS,pattern,edge};
});
