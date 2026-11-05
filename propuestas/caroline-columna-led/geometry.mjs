// One shared geometry definition for the 3D, labels and development lengths.
export const defaults={height:4,ribs:14,diameter:2.4,baseRadius:0.28,ring:true};
export const proposalHeights=[4,5];
export function pointAt(t,p=defaults){
  const u=1-t,r=p.diameter/2;
  return [u*u*u*p.baseRadius+3*u*u*t*p.baseRadius+3*u*t*t*r*.50+t*t*t*r,
    3*u*u*t*p.height*.58+3*u*t*t*p.height*.93+t*t*t*p.height];
}
export function measure(p=defaults){
  let length=0,prev=pointAt(0,p);
  for(let i=1;i<=2000;i++){const q=pointAt(i/2000,p);length+=Math.hypot(q[0]-prev[0],q[1]-prev[1]);prev=q;}
  const curves=length*p.ribs,ring=p.ring?Math.PI*p.diameter:0;
  return {single:length,curves,ring,total:curves+ring};
}
