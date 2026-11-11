const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp'};
http.createServer((req,res)=>{
  let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400).end();return;}
  if(pathname==='/' )pathname='/index.html';
  const file=path.resolve(root,'.'+pathname);
  if(!file.startsWith(root+path.sep)||pathname.startsWith('/.git/')||pathname.startsWith('/tools/')){res.writeHead(403).end();return;}
  fs.readFile(file,(error,bytes)=>{if(error){res.writeHead(404).end('Not found');return;}res.writeHead(200,{'content-type':types[path.extname(file)]||'application/octet-stream'});res.end(bytes);});
}).listen(4174,'127.0.0.1',()=>console.log('Local preview: http://127.0.0.1:4174'));
