// node render.mjs <outDir> <dpr> <workers> [frameSpec]
// frameSpec: "all" | "a-b" | "a-b/step" | comma list of beats "b:12,b:24.5"
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const [,, out, dprS = '1', workersS = '4', spec = 'all', pageArg = 'reel.html'] = process.argv;
const dpr = +dprS, workers = +workersS;
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--disable-gpu-vsync', '--force-color-profile=srgb'] });
const vp = pageArg.includes('_v') ? { width: 1080, height: 1920 } : { width: 1920, height: 1080 };
const probe = await browser.newPage({ viewport: vp, deviceScaleFactor: dpr });
await probe.goto(`http://localhost:8777/${pageArg}?dpr=${dpr}`);
const total = await probe.evaluate(() => window.reel.ready());
await probe.close();
let frames = [];
if (spec === 'all') frames = [...Array(total).keys()];
else if (spec.startsWith('b:')) frames = spec.split(',').map(s => Math.round(parseFloat(s.slice(2)) * 12));
else { const [range, step = '1'] = spec.split('/'); const [a, b] = range.split('-').map(Number); for (let f = a; f < Math.min(b, total); f += +step) frames.push(f); }
console.log('frames', frames.length, 'of', total);
const t0 = Date.now(); let done = 0;
// one-second blocks dealt round the workers, so the heavy passages are shared
await Promise.all([...Array(workers).keys()].map(async (w) => {
  const mine = frames.filter((f) => Math.floor(f / 24) % workers === w);
  if (!mine.length) return;
  let page = null, used = 0;
  const fresh = async () => {
    if (page) await page.close();
    page = await browser.newPage({ viewport: vp, deviceScaleFactor: dpr });
    page.on('console', m => { if (m.type() === 'warning' || m.type() === 'error') console.log(`[w${w}]`, m.text()); });
    page.on('pageerror', e => console.log(`[w${w}] ERR`, e.message));
    await page.goto(`http://localhost:8777/${pageArg}?dpr=${dpr}`);
    await page.evaluate(() => window.reel.ready());
    used = 0;
  };
  await fresh();
  for (const f of mine) {
    // a long-lived page slows as it ages; a fresh one every 150 frames keeps the pace
    if (used++ >= 150) await fresh();
    await page.evaluate((f) => window.reel.render(f), f);
    await page.screenshot({ path: `${out}/${String(f).padStart(5, '0')}.jpg`, type: 'jpeg', quality: dpr > 1 ? 93 : 88 });
    if (++done % 100 === 0) console.log(`${done}/${frames.length}  ${((Date.now() - t0) / done).toFixed(0)} ms/frame`);
  }
  await page.close();
}));
console.log('done', frames.length, 'frames in', ((Date.now() - t0) / 1000).toFixed(1), 's');
await browser.close();
