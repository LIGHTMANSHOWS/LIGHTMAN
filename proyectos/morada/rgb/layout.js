// Conceptual geometry inherited from the reference model, in metres.
// Cintia confirmed 3 x 5 m and 5 m overall height on 2026-10-27 at 11:19.
// The detailed frieze, arch and shelf dimensions remain model-based allowances.
export const MODEL_DIMENSIONS={nominalWidth:5,nominalDepth:3,nominalHeight:5,status:'planta y altura confirmadas; detalles según modelo'};
export const HEIGHT_DELTA=MODEL_DIMENSIONS.nominalHeight-3;
export const shelves=[
 {x:0,y:.62,z:-1.18,w:4.45,d:.43},
 {x:-1.63,y:1.04,z:-1.29,w:1.0,d:.26},
 {x:1.63,y:1.04,z:-1.29,w:1.0,d:.26}
];
export const ledPaths=[];
function add(zone,a,b){const lift=p=>[p[0],zone<4&&p[1]>2?p[1]+HEIGHT_DELTA:p[1],p[2]];a=lift(a);b=lift(b);ledPaths.push({zone,a,b,length:Math.hypot(...a.map((v,i)=>b[i]-v))})}
const X=2.59,Z=1.59;
for(const y of [2.36,3.005]){add(0,[-X,y,Z],[X,y,Z]);add(0,[-X,y,Z],[-X,y,-Z]);add(0,[X,y,Z],[X,y,-Z])}
for(const x of [-X,X])for(const z of [-Z,Z])add(0,[x,2.36,z],[x,3.005,z]);
for(const x of [-2.565,2.565])for(const z of [-1.565,1.565])add(1,[x,.045,z],[x,2.33,z]);
for(const x of [-2.478,2.478]){for(const z of [-1.22,1.22])add(2,[x,.045,z],[x,2.23,z]);add(2,[x,2.23,-1.22],[x,2.23,1.22])}
const roofY=2.286;
add(3,[-2.34,roofY,1.32],[2.34,roofY,1.32]);add(3,[2.34,roofY,1.32],[2.34,roofY,-1.32]);add(3,[2.34,roofY,-1.32],[-2.34,roofY,-1.32]);add(3,[-2.34,roofY,-1.32],[-2.34,roofY,1.32]);
// One concealed rear run per shelf; no extra front or bottom run is counted.
shelves.forEach(s=>add(4,[s.x-s.w/2+.025,s.y-.012,-1.432],[s.x+s.w/2-.025,s.y-.012,-1.432]));
export const metresByZone=Array.from({length:5},(_,zone)=>Number(ledPaths.filter(p=>p.zone===zone).reduce((n,p)=>n+p.length,0).toFixed(2)));
export const totalMetres=Number(metresByZone.reduce((a,b)=>a+b,0).toFixed(2));
