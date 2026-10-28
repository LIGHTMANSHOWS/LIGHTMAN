import * as THREE from 'three';
const V=(x,y,z)=>new THREE.Vector3(x,y,z);

// A frontal, perforated mask over a human head. No shell covers the ears or neck.
// The exact surface design remains a visual interpretation pending mask photos.
export function createTronMask(c){
 const {group,bones,headPos,headGeometry,skinMaterial,mesh,tube,bind,cloth,rubber,led}=c;
 const head=new THREE.Group(),faceGeometry=headGeometry.clone(),facePositions=faceGeometry.attributes.position,faceIndices=[];
 for(let i=0;i<faceGeometry.index.count;i+=3){const a=faceGeometry.index.getX(i),b=faceGeometry.index.getX(i+1),d=faceGeometry.index.getX(i+2);if(facePositions.getY(a)>-.125&&facePositions.getY(b)>-.125&&facePositions.getY(d)>-.125)faceIndices.push(a,b,d);}
 faceGeometry.setIndex(faceIndices);mesh(faceGeometry,skinMaterial,head);
 // Continue the scan into a clean neck/collar junction instead of exposing its cut edge.
 const neckColor=new THREE.Color('#c29673'),image=skinMaterial.map?.image;
 if(image){const swatch=document.createElement('canvas');swatch.width=image.width;swatch.height=image.height;const sx=swatch.getContext('2d',{willReadFrequently:true});sx.drawImage(image,0,0);const pixels=sx.getImageData(0,0,image.width,image.height).data,uv=headGeometry.attributes.uv;let r=0,g=0,b=0,n=0;for(let i=0;i<facePositions.count;i++)if(facePositions.getY(i)>-.13&&facePositions.getY(i)<-.10){const x=Math.min(image.width-1,Math.max(0,Math.round(uv.getX(i)*(image.width-1)))),y=Math.min(image.height-1,Math.max(0,Math.round((1-uv.getY(i))*(image.height-1)))),p=(y*image.width+x)*4;r+=pixels[p];g+=pixels[p+1];b+=pixels[p+2];n++;}if(n)neckColor.setRGB(r/n/255,g/n/255,b/n/255,THREE.SRGBColorSpace).multiply(skinMaterial.color);}
 const neckMaterial=new THREE.MeshStandardMaterial({color:neckColor,roughness:.83,bumpMap:cloth.bumpMap,bumpScale:.0003,envMapIntensity:.12});
 const neck=mesh(new THREE.CylinderGeometry(.051,.064,.09,36),neckMaterial,head,V(0,-.16,-.012));neck.scale.z=.88;
 const hairGeometry=headGeometry.clone(),hairPositions=hairGeometry.attributes.position,hairNormals=hairGeometry.attributes.normal,hairIndices=[];
 const inHair=i=>hairPositions.getY(i)>(hairPositions.getZ(i)<-.015?.012:.080);
 for(let i=0;i<hairGeometry.index.count;i+=3){const a=hairGeometry.index.getX(i),b=hairGeometry.index.getX(i+1),d=hairGeometry.index.getX(i+2);if(inHair(a)&&inHair(b)&&inHair(d))hairIndices.push(a,b,d);}
 hairGeometry.setIndex(hairIndices);for(let i=0;i<hairPositions.count;i++)hairPositions.setXYZ(i,hairPositions.getX(i)+hairNormals.getX(i)*.0015,hairPositions.getY(i)+hairNormals.getY(i)*.0015,hairPositions.getZ(i)+hairNormals.getZ(i)*.0015);
 mesh(hairGeometry,new THREE.MeshStandardMaterial({color:'#17120f',roughness:.95,bumpMap:cloth.bumpMap,bumpScale:.0005,envMapIntensity:.15}),head);
 mesh(new THREE.CylinderGeometry(.066,.075,.027,32),cloth,head,V(0,-.195,-.012));
 const mapCanvas=document.createElement('canvas');mapCanvas.width=mapCanvas.height=256;
 const ctx=mapCanvas.getContext('2d');ctx.fillStyle='#666b70';ctx.fillRect(0,0,256,256);
 for(let y=0;y<256;y+=8)for(let x=0;x<256;x+=8){ctx.fillStyle='#08090b';ctx.beginPath();ctx.arc(x+(y%16?4:0),y,2.25,0,Math.PI*2);ctx.fill();}
 const texture=new THREE.CanvasTexture(mapCanvas);texture.colorSpace=THREE.SRGBColorSpace;
 const material=new THREE.MeshStandardMaterial({color:'#15181d',map:texture,bumpMap:texture,bumpScale:.0013,roughness:.91,metalness:0,envMapIntensity:.12,side:THREE.DoubleSide});
 // Faceted brow, cheek and chin contours read as a mask rather than a helmet.
 const rows=[[.119,.073,.123],[.079,.093,.146],[.024,.095,.158],[-.038,.086,.163],[-.098,.068,.145],[-.139,.040,.117]];
 const positions=[],uv=[],indices=[],columns=[-1,-.62,0,.62,1];
 for(let y=0;y<rows.length;y++){const [yy,width,z]=rows[y];for(const u of columns){positions.push(u*width,yy,z-.052*Math.pow(Math.abs(u),1.5));uv.push((u+1)/2,1-y/(rows.length-1));}}
 for(let y=0;y<rows.length-1;y++)for(let x=0;x<columns.length-1;x++){const a=y*columns.length+x;indices.push(a,a+columns.length,a+1,a+1,a+columns.length,a+columns.length+1);}
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();mesh(geometry,material,head);
 const edgeMaterial=new THREE.MeshStandardMaterial({color:'#060709',roughness:.8});
 for(const sign of [-1,1])tube(rows.map(([y,w,z])=>V(sign*w,y,z-.052)),.0027,edgeMaterial,head);
 for(const row of [rows[0],rows.at(-1)]){const [y,w,z]=row;tube(columns.map(u=>V(u*w,y,z-.052*Math.pow(Math.abs(u),1.5))),.0027,edgeMaterial,head);}
 // A narrow elastic band sits above the ears; the sideburn/ear and neck stay exposed.
 tube([V(-.091,.065,.089),V(-.111,.065,.012),V(-.096,.065,-.067),V(0,.065,-.109),V(.096,.065,-.067),V(.111,.065,.012),V(.091,.065,.089)],.0045,rubber,head);
 for(const yy of [.023,.005])for(let n=0;n<22;n++){const x=-.071+n/21*.142,z=.165-.052*Math.pow(Math.abs(x)/.095,1.5);mesh(new THREE.SphereGeometry(.0032,8,6),led,head,V(x,yy,z));}
 head.position.copy(headPos).add(V(0,.07,.006));bind(head,bones.Head,group);return head;
}
