import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const routes=JSON.parse(fs.readFileSync(path.join(root,'_v2/routes.json')));let references=0;
for(const route of routes){
 const html=fs.readFileSync(path.join(root,route),'utf8');
 assert.equal((html.match(/<h1(?:\s|>)/g)||[]).length,1,route+' must have one h1');
 assert(!html.includes('{{')&&!html.includes('{%'),route+' contains unrendered template');
 assert(html.includes('name="lightman-version" content="2"'));
 assert(!html.includes('51964111591'),'Personal number should not be used');
 for(const match of html.matchAll(/(?:href|src)="([^"<>]+)"/g)){
  const raw=match[1];if(!raw.startsWith('/')&&!raw.startsWith('#'))continue;
  const u=new URL(raw,'https://lightmanperu.com/'+route);const target=path.join(root,decodeURIComponent(u.pathname==='/'?'/index.html':u.pathname));
  assert(fs.existsSync(target),route+' missing target '+raw);references++;
  if(u.hash&&target.endsWith('.html')){const targetHtml=fs.readFileSync(target,'utf8');assert(targetHtml.includes('id="'+u.hash.slice(1)+'"'),route+' missing anchor '+raw);}
 }
 for(const match of html.matchAll(/<img\b[^>]*>/g))assert(/alt="[^"]*"/.test(match[0]),route+' missing image alt');
}
const gallery=fs.readFileSync(path.join(root,'galeria.html'),'utf8');
assert.equal((gallery.match(/<video\s/g)||[]).length,6);
assert(gallery.includes('DPzSY7wkkmz.mp4#t=186'));
assert(!gallery.includes('<iframe'));
const flags=fs.readFileSync(path.join(root,'productos/banderas-led.html'),'utf8');
assert.equal((flags.match(/src="\/assets\/img\/referencias-banderas/g)||[]).length,5);
assert(flags.includes('utilizado con autorización'));
console.log(JSON.stringify({pages:routes.length,localReferences:references,videos:6,startSeconds:186,authorizedPhotos:5,passed:true},null,2));
