// Colour language interpreted from the four still-image scene references.
// RGB values are display-space sRGB; the renderer converts them to linear space.
const violet = [166/255, 43/255, 1];
const magenta = [239/255, 66/255, 245/255];
const blue = [100/255, 94/255, 1];
const white = [244/255, 233/255, 1];
const lilac = [209/255, 135/255, 1];
const mix = (a,b,t) => a.map((v,i)=>v+(b[i]-v)*t);
const fract = x => x - Math.floor(x);
export const gradientPresets = {
  morada: {name:'Morada original',stops:[violet,magenta,lilac,white,blue,violet],css:'linear-gradient(90deg,#a62bff,#ef42f5,#d187ff,#f4e9ff,#645eff)',description:'Morada original: un recorrido completo de morado, magenta, lila, blanco y azul violeta.'},
  magenta: {name:'Morado · magenta',stops:[violet,magenta,violet],css:'linear-gradient(90deg,#a62bff,#ef42f5,#a62bff)',description:'Morado y magenta: un degradado intenso entre los dos tonos principales de la marca.'},
  violet: {name:'Azul · violeta',stops:[blue,violet,lilac,blue],css:'linear-gradient(90deg,#645eff,#a62bff,#d187ff,#645eff)',description:'Azul y violeta: una transición fría con matices lilas, dentro de la paleta Morada.'},
  lilac: {name:'Lila · blanco',stops:[lilac,white,lilac],css:'linear-gradient(90deg,#d187ff,#f4e9ff,#d187ff)',description:'Lila y blanco: luz suave y luminosa, con transiciones de bajo contraste.'},
  pink: {name:'Magenta · blanco',stops:[magenta,lilac,white,magenta],css:'linear-gradient(90deg,#ef42f5,#d187ff,#f4e9ff,#ef42f5)',description:'Magenta y blanco: acentos claros sobre una base magenta con paso por el lila.'},
  white: {name:'Morado · blanco',stops:[violet,lilac,white,lilac,violet],css:'linear-gradient(90deg,#a62bff,#d187ff,#f4e9ff,#d187ff,#a62bff)',description:'Morado y blanco: un degradado simétrico que destaca la geometría del delineado.'}
};
function gradient(t,preset) {
  const palette=(gradientPresets[preset] || gradientPresets.morada).stops;
  const scaled=fract(t)*(palette.length-1),index=Math.floor(scaled);
  const amount=scaled-index;
  return mix(palette[index],palette[index+1],amount*amount*(3-2*amount));
}
function distance(a,b) { const d=Math.abs(fract(a)-fract(b)); return Math.min(d,1-d); }
export const effectDescriptions = {
  static: 'Morado uniforme y continuo en la cenefa y las aristas. Una presencia de luz estable.',
  gradient: 'Degradados suaves entre morado, magenta, lila y blanco, con acentos azul violeta.',
  pulse: 'Una respiración de luz sincronizada: sube y baja suavemente en morado y magenta.',
  flow: 'Recorrido de luz con acentos magenta, azul violeta y blanco sobre una base morada.'
};
export function sampleEffect(mode, position, seconds, gradientPreset='morada') {
  if(mode==='gradient') return {rgb:gradient(position+seconds/26,gradientPreset),gain:1};
  if(mode==='pulse') {
    const breathe=.5-.5*Math.cos(seconds*Math.PI*2/4.8);
    return {rgb:mix(violet,magenta,breathe*.7),gain:.2+.8*breathe};
  }
  if(mode==='flow') {
    const head=fract(seconds/8);
    const highlight=Math.exp(-Math.pow(distance(position,head)/.075,2));
    const trail=Math.exp(-Math.pow(distance(position,head-.11)/.17,2));
    const blueAccent=Math.exp(-Math.pow(distance(position,head+.10)/.14,2));
    const base=mix(violet,blue,blueAccent*.8);
    return {rgb:mix(mix(base,magenta,trail*.8),white,highlight*.88),gain:.45+.55*Math.max(highlight,trail)};
  }
  return {rgb:violet.slice(),gain:1};
}
