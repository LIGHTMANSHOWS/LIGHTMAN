// Metres. Every LED quantity and displayed model uses these same centreline paths.
export const CYAN='#00e5ff', MAGENTA='#ff1bac';
export const roundPath=(w,h,r,cy,z)=>{
 const p=[];for(const [cx,y,a] of [[w/2-r,cy+h/2-r,0],[-w/2+r,cy+h/2-r,90],[-w/2+r,cy-h/2+r,180],[w/2-r,cy-h/2+r,270]])for(let j=0;j<=32;j++){const t=(a+j*90/32)*Math.PI/180;p.push([cx+r*Math.cos(t),y+r*Math.sin(t),z]);}p.push([...p[0]]);return p;
};
const arc=(r,cy,z)=>{const a=Math.asin(-cy/r);return Array.from({length:257},(_,i)=>{const t=a+i*(Math.PI-2*a)/256;return [r*Math.cos(t),cy+r*Math.sin(t),z];});};
const rect=(w,d,y)=>[[-w/2,y,-d/2],[w/2,y,-d/2],[w/2,y,d/2],[-w/2,y,d/2],[-w/2,y,-d/2]];
export const lengthOf=p=>p.slice(1).reduce((s,v,i)=>s+Math.hypot(...v.map((x,j)=>x-p[i][j])),0);
function trace(name,points,color,formula,status='provisional'){return {name,points,color,formula,status,length:lengthOf(points)};}
// Exact CAD polyline points from AGAMA stage 1 V2. Calibrated to the 15.86 m width.
const cadLeft=[[-436.97882,683.16995],[-432.61472,687.94622],[-428.0321,692.51327],[-423.24103,696.86114],[-418.25195,700.98031],[-413.07578,704.86178],[-407.72385,708.49704],[-402.20782,711.87817],[-396.70691,714.89834],[-391.0704,717.67785],[-385.31354,720.19859],[-379.44812,722.45532],[-373.48633,724.4434],[-367.44037,726.15873],[-360.59494,727.75651],[-353.67722,729.00457],[-346.70505,729.89973],[-339.69641,730.43966],[-332.66937,730.62297]];
const scale=15.86/(13.40448+436.97882),mid=(-436.97882+13.40448)/2;
const left=cadLeft.map(([x,y])=>[(x-mid)*scale,2.44+(y-730.62297)*scale]);
export const stage1Front=[...left,...left.slice().reverse().map(([x,z])=>[-x,z])];
const stageFront=(w,y)=>stage1Front.map(([x,z])=>[x*w/15.86,y,z]);
// Only the 2.80 x 2.80 x 2.40 m envelope is dimensioned in the reference.
// Internal proportions, radii and proposed LED runs remain review estimates.
export const mazeSpec={
 width:2.8,depth:2.8,height:2.4,frontZ:-1.02,frameDepth:.28,
 floorY:.26,outerRadius:.18,innerLeft:-.92,innerRight:1.12,innerTop:1.98,innerRadius:.10,
 lower:{w:2.8,d:2.8,r:.18,y:0,h:.10,ledY:.09},
 upper:{w:2.64,d:2.64,r:.16,y:.10,h:.16,ledY:.24}
};
export function mazeArch(x0,x1,bottom,top,r,z){
 const p=[[x0,bottom,z],[x0,top-r,z]];
 for(let i=1;i<=48;i++){const a=Math.PI-i*Math.PI/96;p.push([x0+r+r*Math.cos(a),top-r+r*Math.sin(a),z]);}
 p.push([x1-r,top,z]);
 for(let i=1;i<=48;i++){const a=Math.PI/2-i*Math.PI/96;p.push([x1-r+r*Math.cos(a),top-r+r*Math.sin(a),z]);}
 p.push([x1,bottom,z]);return p;
}
export const roundedPlan=(w,d,r,y)=>roundPath(w,d,r,0,0).map(([x,z])=>[x,y,z]);
// Width/height confirmed by Sonny on 15/11; internal arch retains the previous
// visual proportions, so its ellipse and the 2 m depth remain provisional.
export const foodSpec={w:2.5,h:3,d:2,rx:1.18*2.5/3.1,ry:1.18*3/2.2,spring:.95*3/2.2};
export const types={
 presenting:{name:'Presenting Partner',short:'Presenting',count:5,w:5.70,d:3,h:3.10,category:'Stands',dimensions:'5,70 × 3,00 m · alto total 3,10 m',source:'Ficha técnica Presenting del 14/11 + imagen con delineado verde.',image:'ficha-presenting.png',status:'provisional',note:'Espacio nominal 6 × 3 m. Estructura principal a 2,60 m. La referencia marca doble contorno del portal y perímetro de la base; la credenza se mantiene del alcance previo. Vértices inclinados y radio de credenza por validar.',details:[['Frente construido','5,70 m'],['Profundidad','3,00 m'],['Altura estructura','2,60 m'],['Altura total','3,10 m'],['Tramo superior','2,50 m'],['Credenza','1,80 × 0,90 m']],traces:()=>[
 trace('Portal · contorno exterior',[[-2.85,.08,1.34],[-2.30,2.33,1.34],[-1.25,2.60,1.34],[1.25,2.60,1.34],[2.30,2.33,1.34],[2.85,.08,1.34]],MAGENTA,'2 patas inclinadas + 2 hombros + 2,50 m superior'),
 trace('Portal · contorno interior',[[-2.60,.08,1.355],[-2.04,1.98,1.355],[-1.25,2.20,1.355],[1.25,2.20,1.355],[2.04,1.98,1.355],[2.60,.08,1.355]],CYAN,'2 patas interiores + 2 hombros + 2,50 m superior'),
 trace('Tarima · perímetro completo',rect(5.70,3,.085),CYAN,'2 × (5,70 + 3,00)'),
 trace('Credenza · contorno frontal',roundPath(1.80,.90,.30,.53,1.04),MAGENTA,'2 × (1,80 + 0,90 − 4r) + 2πr; r = 0,30 m propuesto')
 ]},
 innovation:{name:'Innovation Experience',short:'Innovation',count:11,w:4,d:2,h:2.5,category:'Stands',dimensions:'4,00 × 2,00 m · alto 2,50 m',source:'Stand Innovation A-01 (antecedente). Cantidad actual: resumen de reunión 14/11.',image:'plano-innovation.png',status:'provisional',note:'Cantidad actualizada a 11. Línea LED inferior de 4,00 m solo en el frente de cada stand, confirmada por Fernando en R02. Arcos con radios acotados de 1,825 y 1,725 m y centro a 0,675 m. Laterales y credenza conservan el trazado previo; deben contrastarse con la ficha nueva no recuperada.',details:[['Frente','4,00 m'],['Fondo','2,00 m'],['Altura','2,50 m'],['Radios de arcos','1,825 / 1,725 m'],['Centro del arco','0,675 m'],['Credenza anterior','1,20 × 0,50 × 0,80 m']],traces:()=>[
 trace('Arco exterior',arc(1.825,.675,-.91),MAGENTA,'R × (π + 2 asin(0,675/R)); R = 1,825 m','calculado'),
 trace('Arco interior',arc(1.725,.675,-.89),CYAN,'R × (π + 2 asin(0,675/R)); R = 1,725 m','calculado'),
 ...[-1,1].map((s,i)=>trace('Lateral '+(i?'derecho':'izquierdo'),[[s*1.90,.02,.5],[s*1.90,1.65,.5],[s*1.90,1.90,.4],[s*1.90,2,-.05],[s*1.90,2,-.9]],CYAN,'Suma de los 4 segmentos del lateral (trazado previo)')),
 trace('Credenza · contorno frontal',roundPath(1.18,.78,.25,.4,.86),MAGENTA,'Contorno redondeado; radio 0,25 m propuesto'),
 trace('Tarima · frente inferior',[[-2,.025,1.013],[2,.025,1.013]],CYAN,'1 × 4,00 m; solo frente inferior','calculado')
 ]},
 food:{name:'Módulo de alimentos',short:'Alimentos',count:8,w:foodSpec.w,d:foodSpec.d,h:foodSpec.h,category:'Alimentos',dimensions:'2,50 m de frente · alto 3,00 m',source:'Sonny confirmó alimentos de 2,50 m de ancho × 3,00 m de alto el 15/11 a las 00:06. Aplicación indicada por Fernando en R08.',image:null,status:'provisional',note:'Ancho de 2,50 m y altura de 3,00 m confirmados. Se conservan 8 unidades: 3 en piso 7, 2 en hall piso 8 y 3 en sala de experiencia. El contorno exterior sigue la nueva envolvente. El arco interior conserva las proporciones del modelo anterior al ajustar ancho y alto, por lo que ahora es una semielipse referencial; sus cotas de fabricación y el fondo de 2,00 m siguen pendientes de confirmar.',details:[['Frente confirmado','2,50 m'],['Altura confirmada','3,00 m'],['Cantidad','8 unidades'],['Fondo propuesto','2,00 m'],['Arco interior','Semielipse proporcional · referencial'],['Semiejes del arco','0,952 × 1,609 m · estimados'],['Arranque del arco','1,295 m · estimado']],traces:()=>{
 const s=foodSpec,arch=[[-s.rx,0,1.035],[-s.rx,s.spring,1.035]];
 for(let i=0;i<=512;i++){const t=Math.PI-i*Math.PI/512;arch.push([s.rx*Math.cos(t),s.spring+s.ry*Math.sin(t),1.035]);}arch.push([s.rx,0,1.035]);
 return [trace('Máscara · contorno exterior',[[-s.w/2,0,1.03],[-s.w/2,s.h,1.03],[s.w/2,s.h,1.03],[s.w/2,0,1.03]],MAGENTA,'2 × 3,00 + 2,50 = 8,50 m','calculado'),trace('Máscara · arco interior referencial',arch,CYAN,'2 × 1,29545 + longitud de semielipse (a = 0,95161; b = 1,60909 m); cotas estimadas')];}},
 analytic:{name:'MR Analityc',short:'MR Analityc',count:1,w:1.8,d:1.8,h:2,category:'Experiencias',dimensions:'Tarima Ø 1,80 m · altura máxima 2,00 m',source:'Presentación anterior: tarima Ø 1,80 m. Altura máxima de 2,00 m confirmada por Fernando en R03.',image:null,status:'provisional',note:'Partida independiente de los tótems. Altura máxima total de 2,00 m desde el piso, confirmada por Fernando. Se reducen a 2,00 m las dos barras que superaban ese límite; las demás conservan sus alturas. Las 11 barras y la tarima de 0,20 m siguen como propuesta visual. No se suma iluminación al perímetro circular.',details:[['Diámetro de tarima','1,80 m'],['Barras propuestas','11'],['Altura máxima confirmada','2,00 m'],['Alto de tarima propuesto','0,20 m']],traces:()=>[.8,1.2,1.6,1.9,2,2,1.9,1.7,1.4,1.1,.8].map((h,i)=>trace('Barra '+String(i+1).padStart(2,'0'),[[-.85+i*.17,.05,-.65],[-.85+i*.17,h,-.65]],i%2?MAGENTA:CYAN,'Altura del modelo '+h.toFixed(2)+' − inicio 0,05 m; máximo total 2,00 m'))},
 totem:{name:'Tótem',short:'Tótem',count:4,w:.4,d:.4,h:1.5,category:'Tótems',dimensions:'Tapa 0,40 × 0,40 m · LED superior',source:'Detalle anterior de tótem. Cantidad 4: instrucción directa de Fernando 14/11.',image:null,status:'provisional',note:'LED únicamente en el perímetro superior: 1,60 m por tótem. Altura de 1,50 m referencial. Cada unidad se mantiene identificada y metrada por separado; posición definitiva por confirmar.',details:[['Ancho de tapa','0,40 m'],['Fondo de tapa','0,40 m'],['Altura referencial','1,50 m'],['Cantidad actual','4 unidades independientes']],traces:()=>[trace('Tapa · perímetro superior',rect(.4,.4,1.505),MAGENTA,'4 × 0,40 m','calculado')]},
 dataMaze:{name:'Data Maze',short:'Data Maze',count:1,w:mazeSpec.width,d:mazeSpec.depth,h:mazeSpec.height,category:'Experiencias',dimensions:'2,80 × 2,80 m · alto total 2,40 m',source:'Referencia original acotada enviada por Sonny 14/11. Reconstrucción visual R07 desde esa imagen.',image:'data-maze-referencia.jpg',status:'provisional',note:'Marco redondeado con columna izquierda ancha y marca CREDICORP vertical, cabecera Data Maze y plataforma de dos niveles. Solo la envolvente de 2,80 × 2,80 × 2,40 m está acotada. Anchos internos, radios, espesores y niveles son estimados visuales. Se proponen contornos exterior e interior del portal y perímetros completos de ambas bases; el interior y los tramos posteriores requieren confirmar alcance. La gráfica de circuitos, el laberinto, el texto y el cuadrado del piso no se cuentan como LED.',details:[['Frente general','2,80 m'],['Fondo general','2,80 m'],['Altura total','2,40 m'],['Portal','Doble contorno propuesto'],['Columna izquierda / derecha','0,48 / 0,28 m · estimados'],['Base inferior / superior','2,80 / 2,64 m · estimados'],['Radios de base','0,18 / 0,16 m · estimados'],['Nivel de piso','0,26 m · estimado']],traces:()=>[
 trace('Portal · contorno exterior redondeado',mazeArch(-1.4,1.4,mazeSpec.floorY,2.4,mazeSpec.outerRadius,mazeSpec.frontZ+.025),CYAN,'2 × (2,40 − 0,26) + 2,80 + (π − 4) × 0,18; radios estimados'),
 trace('Portal · contorno interior propuesto',mazeArch(mazeSpec.innerLeft,mazeSpec.innerRight,mazeSpec.floorY,mazeSpec.innerTop,mazeSpec.innerRadius,mazeSpec.frontZ+.025),MAGENTA,'2 × (1,98 − 0,26) + 2,04 + (π − 4) × 0,10; validar alcance'),
 trace('Base · perímetro superior redondeado',roundedPlan(mazeSpec.upper.w,mazeSpec.upper.d,mazeSpec.upper.r,mazeSpec.upper.ledY),MAGENTA,'4 × 2,64 + (2π − 8) × 0,16; perímetro completo propuesto'),
 trace('Base · perímetro inferior redondeado',roundedPlan(mazeSpec.lower.w,mazeSpec.lower.d,mazeSpec.lower.r,mazeSpec.lower.ledY),CYAN,'4 × 2,80 + (2π − 8) × 0,18; perímetro completo propuesto')
 ]},
 stageA:{name:'Escenario 1',short:'Escenario 1',count:1,w:15.86,d:4.88,h:1,category:'Escenarios',dimensions:'15,86 × 4,88 m · tarima 1,00 m',source:'AGAMA A5 · Estructura escenario 1 · V2 · 27/10. Una sola línea frontal confirmada por Fernando en R05.',image:'plano-escenario1.png',status:'calculado',note:'Una sola línea LED en el frente curvo. Contorno extraído del vector CAD y calibrado a la cota 15,86 m; no se suman laterales ni posterior.',details:[['Ancho total acotado','15,86 m'],['Fondo: 4 × 1,22 m','4,88 m'],['Altura de tarima','1,00 m'],['LED','1 línea solo frente']],traces:()=>[trace('Frente curvo · línea única',stageFront(15.86,1.02),CYAN,'Σ longitud de segmentos CAD × escala de cota 15,86 m','calculado')]},
 stageB:{name:'Escenario 2',short:'Escenario 2',count:1,w:12,d:4.8,h:.5,category:'Escenarios',dimensions:'12,00 × 4,80 m · altura por confirmar',source:'Plano de producción piso 8. Una sola línea frontal confirmada por Fernando en R05; falta detalle estructural específico.',image:'planta-piso8.png',status:'provisional',note:'Una sola línea LED en el frente. Ancho y fondo según plano de distribución. Curvatura referencial adaptada del escenario 1 a 12 m; no es el metrado definitivo del escenario 2. Altura 0,50 m visual.',details:[['Frente nominal','12,00 m'],['Fondo nominal','4,80 m'],['Altura','Por confirmar'],['LED','1 línea solo frente'],['Curvatura','Referencial']],traces:()=>[trace('Frente curvo · línea única',stageFront(12,.52),CYAN,'Contorno de referencia adaptado a 12,00 m; validar plano')]}
};
export const pieces=[];
const add=(type,n,name,zone,x,z,rotation=0,placement='referencia')=>{const t=types[type];pieces.push({id:type+'-'+String(n).padStart(2,'0'),type,n,name,zone,x,z,rotation,placement,traces:t.traces()});};
// Display layout follows the production plan; positions are calibrated, not survey points.
for(let i=1;i<=11;i++){const leftSide=i<=6,j=leftSide?i-1:i-7;add('innovation',i,'Innovation '+String(i).padStart(2,'0'),'Sala de experiencia · piso 8',leftSide?-13:13,-14+j*5.2,leftSide?90:-90);}
for(const [n,x,z,r] of [[1,-6,-3,90],[2,-6,7,90],[3,6,-3,-90],[4,6,7,-90],[5,0,-15,0]])add('presenting',n,n===5?'Presenting 05 · Credicorp':'Presenting '+String(n).padStart(2,'0'),'Sala de experiencia · piso 8',x,z,r);
for(let n=1;n<=8;n++){const zone=n<=3?'Piso 7 · ubicación pendiente':n<=5?'Hall · piso 8':'Sala de experiencia · piso 8';const x=n<=3?24+(n-1)*4:n<=5?-17+(n-4)*10:-7+(n-6)*7,z=n<=3?21:n<=5?30:22;add('food',n,'Alimentos '+String(n).padStart(2,'0'),zone,x,z,180,n<=3?'pendiente':'referencia');}
add('analytic',1,'MR Analityc','Hall · piso 8',-11.5,30);
for(let n=1;n<=4;n++)add('totem',n,'Tótem '+String(n).padStart(2,'0'),'Ubicación pendiente · unidad independiente',24+(n-1)*2,-13,0,'pendiente');
add('dataMaze',1,'Data Maze','Sala de experiencia · piso 8',8,-24);
add('stageA',1,'Escenario 1','Auditorio · piso 8',-52,-20);
add('stageB',1,'Escenario 2','Auditorio · piso 8',-31,-20);
export const pieceLength=p=>p.traces.reduce((s,t)=>s+t.length,0);
export const totalLength=pieces.reduce((s,p)=>s+pieceLength(p),0);
export const measuredLength=pieces.reduce((s,p)=>s+p.traces.filter(t=>t.status==='calculado').reduce((a,t)=>a+t.length,0),0);
