import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const [,, dir, out, from, to, cols = '4', w = '1600'] = process.argv;
const files = fs.readdirSync(dir).filter(f => f.endsWith('.jpg')).sort().slice(+from, +to);
const html = `<body style="margin:0;background:#fff;display:grid;grid-template-columns:repeat(${cols},1fr);gap:4px;font:13px sans-serif">${files.map(f=>`<div><img style="width:100%;display:block" src="data:image/jpeg;base64,${fs.readFileSync(dir+'/'+f).toString('base64')}"><b>f${+f.slice(0,5)} b${(+f.slice(0,5)/12).toFixed(1)}</b></div>`).join('')}</body>`;
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: +w, height: 400 } });
await p.setContent(html); await p.screenshot({ path: out, fullPage: true }); await b.close();
