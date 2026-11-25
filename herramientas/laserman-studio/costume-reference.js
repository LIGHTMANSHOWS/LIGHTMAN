export function mountCostumeReference(getProject){
  const button=document.createElement('button');button.id='costumeReference';button.textContent='Traje Urban';button.hidden=true;
  document.querySelector('.stagebar>div').append(button);
  const dialog=document.createElement('dialog');dialog.id='costumeReferenceDialog';dialog.className='costume-reference-dialog';
  const title=document.createElement('h2');title.textContent='Urban · Catálogo Full IA';
  const image=document.createElement('img');image.src='assets/urban-catalog.png';image.alt='Fotografía original del traje Urban del Catálogo Full IA de LIGHTMAN';image.loading='lazy';
  const caption=document.createElement('p');caption.textContent='Referencia original del catálogo. En esta versión del show, la iluminación del traje se adapta a verde y blanco.';
  const close=document.createElement('button');close.textContent='Cerrar';close.onclick=()=>dialog.close();const credits=document.createElement('a');credits.href='docs/urban-procedencia.md';credits.target='_blank';credits.rel='noopener';credits.textContent='Créditos del vestuario 3D';dialog.append(title,image,caption,credits,close);document.body.append(dialog);
  button.onclick=()=>dialog.showModal();
  return {update(){button.hidden=getProject().performerCostume!=='urban';}};
}
