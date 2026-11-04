export function jacketPixels(fixture){
  const points=[];
  const paths={
    BackPackRight:[[.18,1.38,-.18],[.18,.94,-.18]],BackPackLeft:[[-.18,1.38,-.18],[-.18,.94,-.18]],
    'Head Right':[[0,1.79,.15],[.13,1.76,.17],[.16,1.64,.20],[.12,1.52,.20],[0,1.5,.19]],
    'Head Left':[[0,1.79,.15],[-.13,1.76,.17],[-.16,1.64,.20],[-.12,1.52,.20],[0,1.5,.19]],
    MBodyRightUp:[[.05,1.48,.16],[.22,1.43,.16],[.2,1.15,.17],[.035,1.15,.17]],
    MBodyRightDown:[[.035,1.15,.17],[.2,1.15,.17],[.22,.93,.16],[.035,.93,.16]],
    MBodyLeftUp:[[-.05,1.48,.16],[-.22,1.43,.16],[-.2,1.15,.17],[-.035,1.15,.17]],
    MBodyLeftDown:[[-.035,1.15,.17],[-.2,1.15,.17],[-.22,.93,.16],[-.035,.93,.16]],
    ArmRightFront:[[.26,1.43,.13],[.39,1.22,.16],[.52,1.11,.17]],
    ArmLeftFront:[[-.26,1.43,.13],[-.39,1.22,.16],[-.52,1.11,.17]],
    HandRight:[[.52,1.11,.15],[.57,1.15,.15],[.59,1.08,.15],[.53,1.07,.15]],
    HandLeft:[[-.52,1.11,.15],[-.57,1.15,.15],[-.59,1.08,.15],[-.53,1.07,.15]],
    ArmRightUp:[[.28,1.46,-.07],[.41,1.23,-.03],[.53,1.11,.02]],
    ArmLeftUp:[[-.28,1.46,-.07],[-.41,1.23,-.03],[-.53,1.11,.02]],
    LegRight:[[.04,.94,.14],[.2,.94,.14],[.18,.6,.12],[.21,.15,.13],[.1,.15,.14],[.08,.58,.15],[.04,.94,.14]],
    LegLeft:[[-.04,.94,.14],[-.2,.94,.14],[-.18,.6,.12],[-.21,.15,.13],[-.1,.15,.14],[-.08,.58,.15],[-.04,.94,.14]],
    FootRight:[[.08,.12,.18],[.08,.06,.3],[.23,.06,.3],[.23,.12,.18]],
    FootLeft:[[-.08,.12,.18],[-.08,.06,.3],[-.23,.06,.3],[-.23,.12,.18]]};
  for(const z of fixture.zones){
    const path=paths[z.name];if(!path)throw Error('Zona de chaqueta no reconocida: '+z.name);
    const lengths=path.slice(1).map((p,i)=>Math.hypot(...p.map((v,j)=>v-path[i][j]))),total=lengths.reduce((a,b)=>a+b,0);
    for(let i=0;i<z.count;i++){
      let d=total*i/Math.max(1,z.count-1),edge=0;
      while(edge<lengths.length-1&&d>lengths[edge])d-=lengths[edge++];
      const f=d/lengths[edge];points.push(path[edge].map((v,j)=>v+(path[edge+1][j]-v)*f));
    }
  }
  if(points.length!==fixture.totalLeds)throw Error('El patch del traje no coincide.');
  return points;
}

