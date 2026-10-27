/* A portable PDF with the exact configuration and live 3D view. No server required. */
(()=>{
 const bytes=s=>Uint8Array.from(s,c=>c.charCodeAt(0)&255);
 const join=parts=>{const n=parts.reduce((a,p)=>a+p.length,0),r=new Uint8Array(n);let at=0;for(const p of parts){r.set(p,at);at+=p.length;}return r;};
 const latin=s=>String(s).replace(/[–—−]/g,'-').replace(/[“”]/g,'"').replace(/[’‘]/g,"'").replace(/×/g,'x').replace(/[^\x20-\xFF]/g,' ');
 const literal=s=>'('+latin(s).replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)')+')';
 const amount=n=>'S/ '+n.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
 function create(d){
  const s=d.settings,q=d.quote,commands=[];
  function text(x,y,value,size=10,bold=false,color='0.12 0.18 0.21'){commands.push(`${color} rg BT /${bold?'F2':'F1'} ${size} Tf ${x} ${y} Td ${literal(value)} Tj ET`);}
  function rule(y){commands.push(`0.86 0.88 0.87 RG .5 w 34 ${y} m 561 ${y} l S`);}
  function wrap(value,max=105){const lines=[];let line='';for(const word of value.split(/\s+/)){if((line+' '+word).length>max&&line){lines.push(line);line=word;}else line+=(line?' ':'')+word;}if(line)lines.push(line);return lines;}
  function paragraph(value,y){for(const line of wrap(value)){text(34,y,line,8,false,'0.38 0.43 0.45');y-=12;}return y;}
  commands.push('0.065 0.10 0.13 rg 0 770 595.28 72 re f');
  text(34,810,'LIGHTMAN',24,true,'1 1 1');text(34,790,'STAGE & INSTALL - COTIZACIÓN CONFIGURADA',8,false,'1 1 1');
  text(425,810,d.date,9,false,'1 1 1');text(425,792,'CONVEXIA - REV. 04',8,false,'1 1 1');
  text(34,744,'Arcos LED para Convexia',20,true);text(34,724,'Proyecto X / Antonella | Instalación solicitada: 2 de noviembre de 2026',9);
  text(34,706,'Configuración elegida en el visor; importes en soles.',8,false,'0.38 0.43 0.45');
  const scale=Math.min(527/d.imageWidth,220/d.imageHeight),iw=d.imageWidth*scale,ih=d.imageHeight*scale;
  commands.push(`q ${iw.toFixed(3)} 0 0 ${ih.toFixed(3)} ${((595.28-iw)/2).toFixed(3)} ${(471+(220-ih)/2).toFixed(3)} cm /Im1 Do Q`);
  text(34,456,`${s.count} arcos | Ancho inferior ${s.width.toFixed(2)} m | Alto ${s.height.toFixed(2)} m`,11,true);
  text(34,438,`Separación entre ejes ${s.gap.toFixed(2)} m | Recorrido ${q.depth.toFixed(2)} m`,10);
  text(34,420,`Ancho superior de estudio ${(s.width*.64).toFixed(3)} m | Vista ${s.environment==='night'?'nocturna':s.environment==='day'?'diurna':'atardecer'} | Efecto: ${{rainbow:'arcoiris',wave:'onda',chase:'barrido',pulse:'pulso',solid:'fijo'}[s.effect]||'fijo'}`,9);
  rule(405);
  const option=q.rate===50?'LED con estructura':'Solo LED';
  text(34,386,'ALTERNATIVA',8,true);text(290,386,'METRAJE',8,true);text(390,386,'TARIFA / M',8,true);text(490,386,'SUBTOTAL',8,true);
  text(34,365,option,10,true);text(290,365,q.metres.toFixed(2)+' m',10);text(390,365,amount(q.rate),10);text(490,365,amount(q.subtotal),10);
  rule(348);text(370,329,'Subtotal sin IGV',10);text(485,329,amount(q.subtotal),10,true);
  text(370,309,'IGV 18%',10);text(485,309,amount(q.igv),10,true);
  commands.push('0.965 0.93 0.89 rg 34 258 527 35 re f');text(46,271,'TOTAL INCLUIDO IGV',11,true,'0.64 0.32 0.15');text(455,271,amount(q.totalPrice),14,true,'0.64 0.32 0.15');
  let y=239;
  y=paragraph('Metrado referencial: suma de los tres lados iluminados de cada arco trapezoidal, redondeada a 2 decimales. Ancho superior del modelo: 64% del inferior. Geometría y medidas sujetas a validación final.',y)-6;
  y=paragraph('La tarifa de S/50 por metro incluye LED y estructura; no se suma a la tarifa de S/40. El pórtico decorativo se muestra como contexto del cliente y no forma parte del suministro.',y)-6;
  y=paragraph('Efectos de la imagen: simulación visual; control dinámico por validar. Color, fijaciones, alimentación, montaje, retiro y condiciones de pago se coordinan antes de confirmar el servicio.',y)-6;
  text(34,y,'Visor: lightmanperu.com/propuestas/convexia-antonella-revision/',8,false,'0.64 0.32 0.15');
  rule(42);text(34,28,'LIGHTMAN Producciones | lightmanperu.com | +51 964 111 591',7,false,'0.4 0.45 0.47');text(552,28,'1',7);
  const jpeg=Uint8Array.from(atob(d.image.split(',')[1]),c=>c.charCodeAt(0));
  const content=bytes(commands.join('\n'));
  const objects=[
   bytes('<< /Type /Catalog /Pages 2 0 R >>'),
   bytes('<< /Type /Pages /Kids [3 0 R] /Count 1 >>'),
   bytes('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> /XObject << /Im1 6 0 R >> >> /Contents 7 0 R >>'),
   bytes('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'),
   bytes('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>'),
   join([bytes(`<< /Type /XObject /Subtype /Image /Width ${d.imageWidth} /Height ${d.imageHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`),jpeg,bytes('\nendstream')]),
   join([bytes(`<< /Length ${content.length} >>\nstream\n`),content,bytes('\nendstream')])
  ];
  const chunks=[bytes('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n')],offsets=[0];let position=chunks[0].length;
  objects.forEach((o,i)=>{offsets.push(position);const part=join([bytes(`${i+1} 0 obj\n`),o,bytes('\nendobj\n')]);chunks.push(part);position+=part.length;});
  const xref=position;let tail=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`;for(const n of offsets.slice(1))tail+=String(n).padStart(10,'0')+' 00000 n \n';tail+=`trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;chunks.push(bytes(tail));
  return new Blob(chunks,{type:'application/pdf'});
 }
 window.ConvexiaPDF={create};
})();
