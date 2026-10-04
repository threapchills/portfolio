import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const root = process.argv[2], port = +process.argv[3];
const T = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.webp':'image/webp', '.png':'image/png', '.jpg':'image/jpeg', '.ttf':'font/ttf' };
http.createServer((q, r) => {
  let u = decodeURIComponent(q.url.split('?')[0]); if (u.endsWith('/')) u += 'index.html';
  const f = path.join(root, u);
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': T[path.extname(f)] || 'application/octet-stream', 'cache-control': 'max-age=3600' }); r.end(d); });
}).listen(port);
