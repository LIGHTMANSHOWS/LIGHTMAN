// Source: MORADA - Planimetria General Corregida, sheets A-01 through A-05.
// Only dimensional data is served; the private source plan stays outside this site.
export const MODEL_DIMENSIONS={nominalWidth:5,nominalDepth:3,nominalHeight:5,status:'plano final A-01 a A-05'};
export const HEIGHT_DELTA=2;
export const PLAN={wallThickness:.15,fasciaHeight:1,fasciaBottom:4,archBackZ:-.9,archFrontZ:.1,archWidth:1,archHeight:4,ceilingWidth:4.7,ceilingDepth:2.7,screenWidth:4,screenHeight:1,screenBottom:2.2,tableWidth:4.6,tableDepth:.6,tableHeight:.9,tableTopThickness:.15};
// Widths and height levels from A-01/A-02; depth follows the drawn three-grid run.
export const shelves=[
 {x:-1.6,y:1.575,bottom:1.55,z:-1.2,w:.8,d:.3},
 {x:0,y:1.675,bottom:1.65,z:-1.2,w:.8,d:.3},
 {x:1.6,y:1.575,bottom:1.55,z:-1.2,w:.8,d:.3}
];
export const ledPaths=[];
function add(zone,a,b){ledPaths.push({zone,a,b,length:Math.hypot(...a.map((v,i)=>b[i]-v))})}
const X=2.5,Z=1.5;
// Front and both side friezes, with four corner/end joins. No rear frieze.
for(const y of [4,5]){add(0,[-X,y,Z],[X,y,Z]);add(0,[-X,y,Z],[-X,y,-Z]);add(0,[X,y,Z],[X,y,-Z])}
for(const x of [-X,X])for(const z of [-Z,Z])add(0,[x,4,z],[x,5,z]);
for(const x of [-X,X])for(const z of [-Z,Z])add(1,[x,0,z],[x,4,z]);
// Arch tape is centered on the 0.15 m reveal, separate from outer frieze and inner ceiling.
for(const x of [-2.425,2.425]){for(const z of [PLAN.archBackZ,PLAN.archFrontZ])add(2,[x,0,z],[x,4,z]);add(2,[x,4,PLAN.archBackZ],[x,4,PLAN.archFrontZ])}
// Clear ceiling: nominal plan minus 0.15 m walls on each side.
const roofY=3.99;
add(3,[-2.35,roofY,1.35],[2.35,roofY,1.35]);add(3,[2.35,roofY,1.35],[2.35,roofY,-1.35]);add(3,[2.35,roofY,-1.35],[-2.35,roofY,-1.35]);add(3,[-2.35,roofY,-1.35],[-2.35,roofY,1.35]);
// Three concealed rear shelf runs, no LED on the credenza or shelf front.
shelves.forEach(s=>add(4,[s.x-s.w/2,s.y,-1.342],[s.x+s.w/2,s.y,-1.342]));
export const metresByZone=Array.from({length:5},(_,zone)=>Number(ledPaths.filter(p=>p.zone===zone).reduce((n,p)=>n+p.length,0).toFixed(2)));
export const totalMetres=Number(metresByZone.reduce((a,b)=>a+b,0).toFixed(2));
