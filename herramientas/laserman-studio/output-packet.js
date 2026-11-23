export const DARK_FRAME='Ag8AAAAAAAABAACIAAAAAA==';
// A busy rendering thread must never freeze a visible laser drawing.
export function packetForAge(packet,ageMs){
  if(ageMs<=350)return packet;
  return {...packet,frames:packet.frames.map(f=>({trackId:f.trackId,frame:DARK_FRAME})),suits:[]};
}
