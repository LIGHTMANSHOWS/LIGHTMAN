import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.mp4':'video/mp4','.ico':'image/x-icon','.xml':'application/xml'};
http.createServer((req,res)=>{try{
 const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
 if(!file.startsWith(root+path.sep)||pathname.includes('/.git')||pathname.includes('/_v2')){res.writeHead(403);res.end();return;}
 const stat=fs.statSync(file);if(!stat.isFile())throw new Error('Not a file');
 const type=mime[path.extname(file)]||'application/octet-stream';
 const range=req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
 if(range){const start=Number(range[1]),end=Math.min(range[2]?Number(range[2]):stat.size-1,stat.size-1);if(start>end){res.writeHead(416);res.end();return;}res.writeHead(206,{'Content-Type':type,'Content-Length':end-start+1,'Content-Range':`bytes ${start}-${end}/${stat.size}`,'Accept-Ranges':'bytes'});fs.createReadStream(file,{start,end}).pipe(res);return;}
 res.writeHead(200,{'Content-Type':type,'Content-Length':stat.size,'Accept-Ranges':'bytes','Cache-Control':'no-store'});fs.createReadStream(file).pipe(res);
}catch{res.writeHead(404);res.end('Not found');}}).listen(8792,'127.0.0.1',()=>console.log('Lightman V2: http://127.0.0.1:8792/'));
