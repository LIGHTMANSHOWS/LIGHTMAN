(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.LedBrand=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const W=32,H=96,cache=new WeakMap(),icon=new Float32Array(W*H*3),bandBrandMask=new Uint8Array(64*7);let brandReady=false,ribbonTape,marqueeTape;
const font={A:['01110','10001','10001','11111','10001','10001','10001'],D:['11110','10001','10001','10001','10001','10001','11110'],E:['11111','10000','10000','11110','10000','10000','11111'],F:['11111','10000','10000','11110','10000','10000','10000'],I:['11111','00100','00100','00100','00100','00100','11111'],L:['10000','10000','10000','10000','10000','10000','11111'],N:['10001','11001','11001','10101','10011','10011','10001'],O:['01110','10001','10001','10001','10001','10001','01110'],R:['11110','10001','10001','11110','10100','10010','10001'],S:['01111','10000','10000','01110','00001','00001','11110'],V:['10001','10001','10001','10001','10001','01010','00100'],Z:['11111','00001','00010','00100','01000','10000','11111']};
const compact={A:['010','101','101','111','101','101','101'],D:['110','101','101','101','101','101','110'],E:['111','100','100','110','100','100','111'],F:['111','100','100','110','100','100','100'],I:['111','010','010','010','010','010','111'],L:['100','100','100','100','100','100','111'],N:['101','101','111','111','111','101','101'],O:['010','101','101','101','101','101','010'],R:['110','101','101','110','101','101','101'],S:['111','100','100','111','001','001','111'],V:['101','101','101','101','101','101','010'],Z:['111','001','001','010','100','100','111']};
const lineWidth=line=>line.length*(line.length>5?4:6)-1;
const bandFont={
A:['01110','10001','11111','10001','10001'],B:['11110','10001','11110','10001','11110'],C:['01111','10000','10000','10000','01111'],D:['11110','10001','10001','10001','11110'],E:['11111','10000','11110','10000','11111'],F:['11111','10000','11110','10000','10000'],G:['01111','10000','10111','10001','01110'],H:['10001','10001','11111','10001','10001'],I:['11111','00100','00100','00100','11111'],J:['00111','00010','00010','10010','01100'],L:['10000','10000','10000','10000','11111'],M:['10001','11011','10101','10001','10001'],N:['10001','11001','10101','10011','10001'],O:['01110','10001','10001','10001','01110'],P:['11110','10001','11110','10000','10000'],R:['11110','10001','11110','10010','10001'],S:['01111','10000','01110','00001','11110'],T:['11111','00100','00100','00100','00100'],U:['10001','10001','10001','10001','01110'],V:['10001','10001','10001','01010','00100'],Y:['10001','01010','00100','00100','00100'],Z:['11111','00010','00100','01000','11111']};
const ribbonEffects=['COMETAS','ONDAS','CASCADA','PULSOS','DESTELLOS'];
const ribbonPhrases=['FELIZ NAVIDAD','PAZ Y AMOR','FELICES FIESTAS','UNIDOS EN FAMILIA','LUZ Y ESPERANZA','COMPARTE ALEGRIA','SONRIE ES NAVIDAD','GRACIAS POR ESTAR','CELEBREMOS JUNTOS','VIVE LA MAGIA','UNA GRAN FAMILIA','AMOR EN CADA LUZ'];
const logo=()=>({word:null,lines:null,direction:'orbit',beats:24,label:'ISOTIPOS OPUESTOS · GIRO 360°'});
const text=(lines,beats=32)=>({word:lines.join(' '),lines,brand:lines.join(' ')==='SAN FERNANDO',direction:'orbit',beats,label:lines.join(' ')+' · HORIZONTAL · GIRO 360°'});
// Horizontal text makes two full turns per scene; the isotipos retain their pace.
const scenes=[logo(),{...text(['FELIZ NAVIDAD LES DESEA SAN FERNANDO'],112),marquee:true}];
const cycle=scenes.reduce((n,s)=>n+s.beats,0);
function state(t,track,preview=false,option=1){let beat=(t-track.ignitionAt)*track.bpm/60;if(preview)beat=t*track.bpm/60;const active=preview||(beat>=0&&t<track.duration);if(!active)return {active:false,strength:0,label:'',direction:'orbit',index:-1};let local=((beat%cycle)+cycle)%cycle,index=0;while(local>=scenes[index].beats){local-=scenes[index].beats;index++;}const s=scenes[index],progress=local/s.beats,width=s.brand?60:s.lines?Math.max(...s.lines.map(lineWidth)):W,ribbon=option===2&&(preview||!!s.lines);
return {active:true,strength:1,label:ribbon?'ESPIRAL · FRASES CONTINUAS':s.marquee?'FELIZ NAVIDAD · LETRERO 360°':s.label,subtitle:ribbon?ribbonEffects[Math.floor(beat/8)%ribbonEffects.length]+' · BORDES A COLOR · TEXTO BLANCO':s.lines?'SALUDO CONTINUO · GIRO 360°':'ISOTIPOS OPUESTOS · GIRO 360°',direction:s.direction,index,word:s.word,lines:s.lines,marquee:s.marquee,brand:s.brand,ribbon,beat,progress,orbit:s.brand?26-progress*128:progress*(s.lines?128:64),width,local,pulse:.94+.06*Math.exp(-(beat-Math.floor(beat))*6)};}
function load(){loadBrandLettering();const image=new Image();image.onload=()=>{const c=document.createElement('canvas');c.width=W;c.height=H;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,33,19,165,202,2,23,28,64);const data=ctx.getImageData(0,0,W,H).data;for(let y=0;y<H;y++)for(let x=0;x<W;x++){const k=(y*W+x)*4,r=data[k]/255,g=data[k+1]/255,b=data[k+2]/255;if(data[k+3]<80)continue;const out=(y*W+x)*3;if(r>.45&&r>g*1.8&&r>b*1.4)icon.set([1,.01,.03],out);else if(Math.min(r,g,b)>.55)icon.set([1,1,1],out);}};image.src='assets/san-fernando-isotipo.png';}
function loadBrandLettering(){const image=new Image();image.onload=()=>{
const band=document.createElement('canvas');band.width=64;band.height=7;const bandCtx=band.getContext('2d',{willReadFrequently:true});bandCtx.drawImage(image,0,0,image.naturalWidth,image.naturalHeight,0,0,64,7);const bandData=bandCtx.getImageData(0,0,64,7).data;
for(let i=0;i<bandBrandMask.length;i++)bandBrandMask[i]=Math.min(bandData[i*4],bandData[i*4+1],bandData[i*4+2])>165?1:0;
brandReady=true;buildRibbonTape();buildMarqueeTape();
};image.src='assets/san-fernando-nombre-continuo.png';}
function buildMarqueeTape(){
// One bitmap column maps to one of the model's 64 existing LED strands.
const message='FELIZ NAVIDAD LES DESEA SAN FERNANDO',advance=8,width=message.length*advance+16,rows=Array.from({length:7},()=>new Uint8Array(width));
for(let c=0;c<message.length;c++){const glyph=font[message[c]];if(!glyph)continue;for(let y=0;y<7;y++)for(let x=0;x<7;x++)rows[y][c*advance+x]=glyph[y][[0,0,1,2,3,4,4][x]]==='1'?1:0;}
marqueeTape={width,rows};
}
function applyModelMarquee(rgb,points,s,brightness){
if(!marqueeTape)buildMarqueeTape();
const scroll=Math.floor(s.local*3),level=s.pulse*brightness;
for(let i=0;i<points.length;i++){
const p=points[i],k=i*3;if(p.star)continue;
if(p.feature==='ornament'){for(let c=0;c<3;c++)rgb[k+c]*=.4;continue;}
const strand=((p.strand+32)%64)-32,row=Math.floor((4.5-p.y)/.35),column=((strand+12+scroll)%marqueeTape.width+marqueeTape.width)%marqueeTape.width;
const on=row>=0&&row<7&&marqueeTape.rows[row][column];
for(let c=0;c<3;c++)rgb[k+c]=on?level:rgb[k+c]*.035;
}
return 1;
}
function sample(s,x,y){
if(s.lines){
const lineIndex=Math.floor((y-40)/28),row=Math.floor((y-40-lineIndex*28)/3);
if(lineIndex<0||lineIndex>=s.lines.length||row<0||row>=7)return null;
const line=s.lines[lineIndex],glyphs=line.length>5?compact:font,glyphWidth=line.length>5?3:5,advance=glyphWidth+1,width=lineWidth(line),col=Math.floor(x-(64-width)/2),char=Math.floor(col/advance),cx=col%advance;
return col>=0&&col<width&&cx<glyphWidth&&glyphs[line[char]][row][cx]==='1'?[1,1,1]:null;
}
x=Math.floor(x);y=Math.floor(y);if(x<0||x>=W||y<0||y>=H)return null;
const k=(y*W+x)*3;return icon[k]||icon[k+1]||icon[k+2]?[icon[k],icon[k+1],icon[k+2]]:null;}
function buildRibbonTape(){
// One uninterrupted strip: the same glyph pitch and phrase gap everywhere.
const phrases=['FELIZ NAVIDAD LES DESEA',...ribbonPhrases.slice(1)],gap=12,width=64+6+phrases.reduce((n,phrase)=>n+phrase.length*6+gap,0),rows=Array.from({length:7},()=>new Uint8Array(width)),map=[0,1,1,2,3,3,4];
let offset=0;
for(let i=0;i<phrases.length;i++){const phrase=phrases[i];for(let char=0;char<phrase.length;char++){const glyph=bandFont[phrase[char]];if(!glyph)continue;for(let y=0;y<7;y++)for(let x=0;x<5;x++)rows[y][offset+char*6+x]=glyph[map[y]][x]==='1'?1:0;}offset+=phrase.length*6;
if(i===0){offset+=6;if(brandReady)for(let y=0;y<7;y++)for(let x=0;x<64;x++)rows[y][offset+x]=bandBrandMask[y*64+x];offset+=64;}offset+=gap;}
ribbonTape={width,rows};
}
function applyRibbon(rgb,points,s,samples,brightness){
if(!ribbonTape)buildRibbonTape();
const beat=s.beat,scroll=beat*100/16,mode=Math.floor(beat/8)%5,fract=x=>x-Math.floor(x),pulse=Math.exp(-fract(beat)*6),textLevel=brightness*(.94+.06*pulse);
for(let i=0;i<points.length;i++){
const point=points[i];if(point.star)continue;const k=i*3,p=samples[i],column=p.distance/p.pitch;
let effect;
switch(mode){
case 0:effect=Math.pow(fract(column/100-beat/4),12);break;
case 1:effect=Math.pow(.5+.5*Math.sin(point.h*16-beat*Math.PI/2+point.a*Math.PI*2),2);break;
case 2:effect=Math.exp(-fract(point.h+beat/8)*8);break;
case 3:effect=(Math.floor(point.ribbonProgress*12+beat)%2?.35:1)*(.25+.75*pulse);break;
default:{const seed=Math.sin(Math.floor(column)*127.1+Math.floor(beat*2)*73.7)*43758.5453;effect=fract(seed)>.91?1:.12+.35*pulse;}
}
// Keep the bottom edge independent; on the top edge the white letters win.
const row=7-p.row,col=((Math.floor(column+scroll)%ribbonTape.width)+ribbonTape.width)%ribbonTape.width,lit=p.row!==0&&!!ribbonTape.rows[row][col],edge=point.feature==='edge';
for(let c=0;c<3;c++)rgb[k+c]=lit?textLevel:Math.min(1,rgb[k+c]*(edge?.55+1.9*effect:.025+.11*effect));
}
return 1;
}
function apply(rgb,points,t,track,preview=false,brightness=1){const ribbon=points[0]&&points[0].ribbonProgress!==undefined,s=state(t,track,preview,ribbon?2:1);if(!s.active)return 0;let samples=cache.get(points);if(!samples){samples=points.map((p,i)=>{const a=p.feature==='foliage'?((p.strand+32)%64-32)/64:Math.atan2(p.x,p.z)/(Math.PI*2),column=p.ribbonProgress===undefined?0:Math.round(p.ribbonProgress*1199);return {a:a*64,y:(1-p.h)*H,distance:p.ribbonDistance??column,pitch:p.ribbonStep??1,row:p.ribbonRow??i%8};});cache.set(points,samples);}if(s.ribbon)return applyRibbon(rgb,points,s,samples,brightness);if(s.marquee)return applyModelMarquee(rgb,points,s,brightness);for(let i=0;i<points.length;i++){if(points[i].star)continue;const j=i*3;if(points[i].feature==='ornament')continue;const p=samples[i],period=s.lines?64:32,angle=((p.a-s.orbit+period/2)%period+period)%period-period/2,x=(s.marquee?p.a+32:angle+(s.lines?32:W/2)),c=sample(s,x,p.y);for(let channel=0;channel<3;channel++){const background=rgb[j+channel];rgb[j+channel]=c?Math.max(background*.15,c[channel]*s.pulse):background*(s.lines?.10:.25);}}return 1;}
return {load,apply,state,scenes,ribbonPhrases,amount:(t,track,preview)=>state(t,track,preview).strength};
});
