/* reel.js — "Twelve Worlds", Mike Whyle's showreel, drawn frame by frame.
   Every frame is a pure function of its index: render.mjs asks for frame f,
   this draws it, the driver photographs the canvas. 24 fps, 120 BPM, so a
   beat is exactly twelve frames and every cut lands on the music. */

const FPS = 24, SPB = 0.5;                 // seconds per beat (120 BPM)
const W = 1080, H = 1920;           // the vertical cut: 9:16 for the phone
const DPR = +(new URLSearchParams(location.search).get('dpr') || 2);
const TOTAL_BEATS = 174;
const TOTAL_FRAMES = Math.round(TOTAL_BEATS * SPB * FPS);

const cv = document.getElementById('c');
cv.width = W * DPR; cv.height = H * DPR;
const ctx = cv.getContext('2d', { alpha: false });

const C = {
  gold: '#cc913d', flare: '#f6bc56', moon: '#f6e6bb', bone: '#fef9eb',
  teal: '#6f9aa1', moth: '#d4622a', char: '#17181a', ink: '#0b0907', text: '#efe4cd',
};
const EMBER = [[246, 188, 86], [204, 145, 61], [214, 98, 42], [254, 249, 235]];

/* ---------- maths ---------- */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const seg = (v, a, b) => clamp((v - a) / (b - a), 0, 1);
const eo3 = (t) => 1 - Math.pow(1 - t, 3);
const eo5 = (t) => 1 - Math.pow(1 - t, 5);
const ei3 = (t) => t * t * t;
const eio = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const eoBack = (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
function rng(seed) {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
const T = (b) => b * SPB;               // beats to seconds

/* ---------- images ---------- */
const cache = new Map();
const pending = new Set();
function img(url) {
  let e = cache.get(url);
  if (e) {
    if (e.ok) { cache.delete(url); cache.set(url, e); return e.bad ? null : e.im; }
    pending.add(e.p); return null;
  }
  const im = new Image();
  im.src = url;
  e = { im, ok: false, bad: false };
  e.p = im.decode().then(() => { e.ok = true; }).catch(() => { e.ok = true; e.bad = true; console.warn('bad image', url); });
  cache.set(url, e);
  pending.add(e.p);
  while (cache.size > 120) cache.delete(cache.keys().next().value);
  return null;
}
const COUNTS = {
  'ice-tea': 480, kalimba: 480, mythopoeic: 624, 'nobody-wears-it-better': 473, ramses: 480,
  'tale-of-twins': 480, vanta: 480, 'vast-island': 480, 'weekend-thuggery': 663, wishfish: 358,
};
const pad4 = (n) => String(n).padStart(4, '0');
const clipURL = (name, sec) => `src/${name}/${pad4(clamp(Math.floor(sec * FPS + 1e-6), 0, COUNTS[name] - 1) + 1)}.jpg`;
const seqURL = (name, sec) => `video/${name}/frames/f_${pad4(clamp(Math.floor(sec * 12 + 1e-6), 0, 316) + 1)}.webp`;

/* draw an image to cover a rect, zoomed and panned within its overscan */
function cover(im, o = {}) {
  if (!im) return;
  const { x = 0, y = 0, w = W, h = H, zoom = 1, px = 0, py = 0, alpha = 1 } = o;
  const iw = im.naturalWidth, ih = im.naturalHeight;
  const s = Math.max(w / iw, h / ih) * zoom;
  const dw = iw * s, dh = ih * s;
  const dx = x + (w - dw) / 2 + px * (dw - w) / 2;
  const dy = y + (h - dh) / 2 + py * (dh - h) / 2;
  ctx.globalAlpha = alpha;
  ctx.drawImage(im, dx, dy, dw, dh);
  ctx.globalAlpha = 1;
}
function contain(im, o = {}) {
  if (!im) return;
  const { x = 0, y = 0, w = W, h = H, zoom = 1, alpha = 1 } = o;
  const s = Math.min(w / im.naturalWidth, h / im.naturalHeight) * zoom;
  const dw = im.naturalWidth * s, dh = im.naturalHeight * s;
  ctx.globalAlpha = alpha;
  ctx.drawImage(im, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  ctx.globalAlpha = 1;
}
/* a clip at a source time; slow motion blends neighbouring frames */
function clip(name, sec, o = {}) {
  const f = sec * FPS, f0 = Math.floor(f + 1e-6), fr = f - f0;
  const a = img(clipURL(name, f0 / FPS));
  cover(a, o);
  if (o.blend && fr > 0.04) {
    const b = img(clipURL(name, (f0 + 1) / FPS));
    if (b) cover(b, { ...o, alpha: (o.alpha ?? 1) * fr });
  }
}
function seq(name, sec, o = {}) {
  const f = sec * 12, f0 = Math.floor(f + 1e-6), fr = f - f0;
  cover(img(seqURL(name, f0 / 12)), o);
  // the 12 fps sequences are blended through their in-betweens for a 24 fps glide
  if (o.blend !== false && fr > 0.04 && f0 < 316) {
    const b = img(seqURL(name, (f0 + 1) / 12));
    if (b) cover(b, { ...o, alpha: (o.alpha ?? 1) * fr });
  }
}
function clipRect(x, y, w, h, fn) {
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); fn(); ctx.restore();
}

/* ---------- type ---------- */
function fontStr(o) {
  return `${o.italic ? 'italic ' : ''}${o.weight || 500} ${o.size}px "${o.family || 'Cormorant Garamond'}"`;
}
/* kinetic type: each letter rises out of a mask, sharpening as it lands,
   and leaves the same way. lt is seconds since the line began. */
function kText(str, x, y, lt, o = {}) {
  if (lt < 0) return;
  const size = o.size || 100;
  const s = o.upper ? str.toUpperCase() : str;
  const lsPx = (o.ls || 0) * size;
  const stagger = o.stagger ?? 0.028, dur = o.dur ?? 0.75, rise = (o.rise ?? 0.42) * size;
  const exitAt = o.exitAt ?? Infinity, exitDur = o.exitDur ?? 0.5;
  ctx.save();
  ctx.font = fontStr(o);
  ctx.textBaseline = 'alphabetic';
  ctx.letterSpacing = '0px';
  const chars = [...s];
  const xs = []; let acc = '';
  for (let i = 0; i < chars.length; i++) { xs.push(ctx.measureText(acc).width + i * lsPx); acc += chars[i]; }
  const total = ctx.measureText(s).width + (chars.length - 1) * lsPx;
  const x0 = o.align === 'left' ? x : o.align === 'right' ? x - total : x - total / 2;
  if (o.mask) { ctx.beginPath(); ctx.rect(x0 - size, y - size * 1.15, total + size * 2, size * 1.45); ctx.clip(); }
  const color = o.color || C.bone;
  ctx.fillStyle = color;
  for (let i = 0; i < chars.length; i++) {
    if (chars[i] === ' ') continue;
    const ti = lt - i * stagger;
    const p = eo5(clamp(ti / dur, 0, 1));
    if (p <= 0) continue;
    const q = isFinite(exitAt) ? eio(clamp((lt - exitAt - i * stagger * 0.5) / exitDur, 0, 1)) : 0;
    const a = (o.alpha ?? 1) * p * (1 - q);
    if (a <= 0.002) continue;
    const dy = (1 - p) * rise - q * rise * 0.7;
    const bl = ((1 - p) * 1.4 + q) * (o.blur ?? 9);
    ctx.filter = bl > 0.15 ? `blur(${(bl * DPR).toFixed(2)}px)` : 'none';
    ctx.globalAlpha = a;
    if (o.glow) { ctx.shadowColor = o.glowColor || color; ctx.shadowBlur = o.glow * DPR; }
    ctx.fillText(chars[i], x0 + xs[i], y + dy);
  }
  ctx.restore();
  return total;
}
/* plain line with a fade and a slow drift */
function line(str, x, y, a, o = {}) {
  if (a <= 0.002) return;
  ctx.save();
  ctx.font = fontStr(o);
  ctx.letterSpacing = `${(o.ls || 0) * o.size}px`;
  ctx.textAlign = o.align || 'center';
  ctx.globalAlpha = a;
  ctx.fillStyle = o.color || C.bone;
  if (o.glow) { ctx.shadowColor = o.glowColor || o.color; ctx.shadowBlur = o.glow * DPR; }
  if (o.blur) ctx.filter = `blur(${(o.blur * DPR).toFixed(2)}px)`;
  ctx.fillText(o.upper ? str.toUpperCase() : str, x, y);
  ctx.restore();
}
function scrim(x, y, rx, ry, a) {
  if (a <= 0) return;
  ctx.save();
  ctx.translate(x, y); ctx.scale(1, ry / rx);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, `rgba(8,6,4,${0.72 * a})`);
  g.addColorStop(0.55, `rgba(8,6,4,${0.42 * a})`);
  g.addColorStop(1, 'rgba(8,6,4,0)');
  ctx.fillStyle = g; ctx.fillRect(-rx, -rx, rx * 2, rx * 2);
  ctx.restore();
}
function headScrim(a) {
  if (a <= 0) return;
  const g = ctx.createLinearGradient(0, 0, 0, H * 0.5);
  g.addColorStop(0, `rgba(8,6,4,${0.78 * a})`);
  g.addColorStop(1, 'rgba(8,6,4,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H * 0.5);
}
function footScrim(a) {
  if (a <= 0) return;
  const g = ctx.createLinearGradient(0, H * 0.45, 0, H);
  g.addColorStop(0, 'rgba(8,6,4,0)');
  g.addColorStop(1, `rgba(8,6,4,${0.78 * a})`);
  ctx.fillStyle = g; ctx.fillRect(0, H * 0.45, W, H * 0.55);
}

/* a chapter card: numeral and name, a gold rule, the role in display type */
function chapter(lt, num, name, role, o = {}) {
  if (lt < 0) return;
  const exitAt = o.exitAt ?? 99;
  const out = eio(seg(lt, exitAt, exitAt + 0.6));
  const x = o.x ?? 72, y = o.y ?? (o.top ? 360 : H - 230);
  if (o.top) headScrim((1 - out) * seg(lt, 0, 0.4) * (o.scrim ?? 1));
  else footScrim((1 - out) * seg(lt, 0, 0.4) * (o.scrim ?? 1));
  kText(`${num} · ${name}`, x, y - 112, lt, {
    family: 'Space Grotesk', weight: 500, size: 17, ls: 0.42, upper: true, align: 'left',
    color: C.flare, stagger: 0.016, dur: 0.6, rise: 0.8, blur: 4, exitAt, exitDur: 0.45,
  });
  const rw = 150 * eo5(seg(lt, 0.15, 0.95)) * (1 - out);
  ctx.save();
  ctx.fillStyle = C.gold; ctx.globalAlpha = 0.85;
  ctx.fillRect(x, y - 92, rw, 1.5);
  ctx.restore();
  ctx.save(); ctx.font = fontStr({ size: 100, weight: 500 });
  const fit = Math.min(o.size || 112, 100 * (W - x * 2) / ctx.measureText(role).width);
  ctx.restore();
  kText(role, x - 4, y + 8, lt - 0.18, {
    size: fit, weight: 500, align: 'left', color: C.bone, stagger: 0.034, dur: 0.85,
    rise: 0.55, mask: true, blur: 6, exitAt: exitAt - 0.18, exitDur: 0.55, glow: 18, glowColor: 'rgba(0,0,0,0.55)',
  });
  if (o.sub) {
    line(o.sub, x, y + 62, eo3(seg(lt, 0.7, 1.4)) * (1 - out), {
      family: 'Space Grotesk', weight: 400, size: 19, ls: 0.16, align: 'left', color: C.moon,
    });
  }
}

/* ---------- atmosphere ---------- */
function embers(t, o = {}) {
  const { seed = 7, n = 50, cx = W / 2, cy = H * 0.9, w = W, h = 160, rise = 70, size = 1, alpha = 1, life = [2.4, 4.6] } = o;
  if (alpha <= 0) return;
  const r = rng(seed);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const lf = life[0] + r() * (life[1] - life[0]);
    const off = r() * lf, x0 = cx + (r() - 0.5) * w, y0 = cy + (r() - 0.5) * h;
    const sp = rise * (0.55 + r() * 0.9), amp = 8 + r() * 34, fr = 0.5 + r() * 1.4, ph = r() * 6.283;
    const rad = (0.7 + r() * 1.9) * size;
    const [cr, cg, cb] = EMBER[(r() * 4) | 0];
    const age = (t + off) % lf, k = age / lf;
    const x = x0 + Math.sin(ph + age * fr) * amp, y = y0 - age * sp;
    const a = alpha * Math.sin(Math.PI * k) * (0.68 + 0.32 * Math.sin(ph + t * 11));
    if (a <= 0.01) continue;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad * 5);
    g.addColorStop(0, `rgba(${cr},${cg},${cb},${(a * 0.9).toFixed(3)})`);
    g.addColorStop(0.32, `rgba(${cr},${cg},${cb},${(a * 0.24).toFixed(3)})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - rad * 5, y - rad * 5, rad * 10, rad * 10);
  }
  ctx.restore();
}
/* sparks thrown from a point at a moment: closed-form ballistics */
function burst(t, t0, cx, cy, o = {}) {
  const lt = t - t0;
  if (lt < 0 || lt > 2.4) return;
  const r = rng(o.seed || 3);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < (o.n || 70); i++) {
    const ang = r() * 6.283, v = (o.v || 520) * (0.3 + r() * 0.9), lf = 0.7 + r() * 1.5;
    const [cr, cg, cb] = EMBER[(r() * 4) | 0];
    const rad = 0.8 + r() * 2.2;
    const k = lt / lf; if (k >= 1) continue;
    const drag = (1 - Math.exp(-2.2 * lt)) / 2.2;
    const x = cx + Math.cos(ang) * v * drag * (o.sx || 1);
    const y = cy + Math.sin(ang) * v * drag * 0.7 - 40 * lt * lt;
    const a = (1 - k) * (1 - k);
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad * 5);
    g.addColorStop(0, `rgba(${cr},${cg},${cb},${a.toFixed(3)})`);
    g.addColorStop(0.35, `rgba(${cr},${cg},${cb},${(a * 0.25).toFixed(3)})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(x - rad * 5, y - rad * 5, rad * 10, rad * 10);
  }
  ctx.restore();
}
function flash(a, col = '255,244,222') {
  if (a <= 0.003) return;
  ctx.save(); ctx.fillStyle = `rgba(${col},${a.toFixed(3)})`; ctx.fillRect(0, 0, W, H); ctx.restore();
}
function dim(a) { if (a > 0.003) { ctx.fillStyle = `rgba(0,0,0,${a.toFixed(3)})`; ctx.fillRect(0, 0, W, H); } }

/* slice glitch: horizontal bands of the frame shoved sideways, with a
   red and cyan ghost; a few frames at most, on the hardest hits */
function glitch(f, strength) {
  if (strength <= 0) return;
  const r = rng(1000 + f);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const n = 7 + ((r() * 6) | 0);
  for (let i = 0; i < n; i++) {
    const y = r() * cv.height, h = (8 + r() * 70) * DPR, dx = (r() - 0.5) * 140 * DPR * strength;
    ctx.drawImage(cv, 0, y, cv.width, h, dx, y, cv.width, h);
  }
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = 0.22 * strength;
  ctx.drawImage(cv, 10 * DPR * strength, 0);
  ctx.restore();
}

let grainTiles = null;
function grain(f, a = 0.07) {
  if (!grainTiles) {
    grainTiles = [0, 1, 2, 3].map((k) => {
      const c = document.createElement('canvas'); c.width = c.height = 384;
      const g = c.getContext('2d'); const d = g.createImageData(384, 384); const r = rng(77 + k);
      for (let i = 0; i < d.data.length; i += 4) { const v = 128 + (r() - 0.5) * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
      g.putImageData(d, 0, 0); return c;
    });
  }
  const r = rng(5000 + f);
  const tile = grainTiles[f % 4], ox = (r() * 384) | 0, oy = (r() * 384) | 0;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = a;
  for (let y = -oy; y < cv.height; y += 384) for (let x = -ox; x < cv.width; x += 384) ctx.drawImage(tile, x, y);
  ctx.restore();
}
function vignette(a = 0.5) {
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 1.05);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${a})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
function letterbox(k) {
  if (k <= 0) return;
  const h = 132 * k;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, h); ctx.fillRect(0, H - h, W, h);
}

/* ---------- the wordmark ---------- */
const LOGO = 'assets/brand/mikey-logo-hi.webp';
let logoDeep = null;    // the deepest point inside a stroke: where the zoom dives through
function findDeep(im) {
  const c = document.createElement('canvas'); c.width = 450; c.height = 253;
  const g = c.getContext('2d'); g.drawImage(im, 0, 0, 450, 253);
  const d = g.getImageData(0, 0, 450, 253).data;
  const A = (x, y) => (x < 0 || y < 0 || x >= 450 || y >= 253) ? 0 : d[(y * 450 + x) * 4 + 3];
  let best = null, bestR = 0;
  for (let y = 20; y < 233; y += 2) for (let x = 60; x < 390; x += 2) {
    if (A(x, y) < 220) continue;
    let r = 1;
    outer: for (; r < 40; r++) {
      for (let k = 0; k < 16; k++) { const a = k * Math.PI / 8; if (A(Math.round(x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r)) < 128) break outer; }
    }
    // prefer strokes near the middle of the mark
    const score = r - Math.abs(x - 225) * 0.012;
    if (score > bestR) { bestR = score; best = [x / 450, y / 253]; }
  }
  return best || [0.5, 0.5];
}
let plateCanvas = null;
/* the ink plate with the wordmark punched through it, scaled about the
   deep point so the camera dives through a letter into the film */
function stencilPlate(scale, alpha = 1) {
  const im = img(LOGO); if (!im) return;
  if (!logoDeep) logoDeep = findDeep(im);
  if (!plateCanvas) { plateCanvas = document.createElement('canvas'); plateCanvas.width = cv.width; plateCanvas.height = cv.height; }
  const g = plateCanvas.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = 'source-over';
  g.clearRect(0, 0, plateCanvas.width, plateCanvas.height);
  g.fillStyle = '#0b0907'; g.fillRect(0, 0, plateCanvas.width, plateCanvas.height);
  g.globalCompositeOperation = 'destination-out';
  const lw = 980 * scale, lh = lw * im.naturalHeight / im.naturalWidth;
  // anchor: at scale 1 the mark is centred; as it grows, the deep point drifts to centre
  const k = clamp((scale - 1) / 3, 0, 1);
  const ax = lerp(0.5, logoDeep[0], k), ay = lerp(0.5, logoDeep[1], k);
  const x = W / 2 - lw * ax, y = H / 2 - lh * ay;
  g.setTransform(DPR, 0, 0, DPR, 0, 0);
  g.drawImage(im, x, y, lw, lh);
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = alpha;
  ctx.drawImage(plateCanvas, 0, 0);
  ctx.restore();
  // a hairline of flare around the letters while the plate is whole
  if (scale < 1.6) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.18 * (1 - seg(scale, 1, 1.6)) * alpha;
    ctx.filter = `blur(${6 * DPR}px)`;
    ctx.drawImage(im, x, y, lw, lh);
    ctx.restore();
  }
}
let goldCanvas = null;
/* the wordmark cast in gold, a highlight travelling across it */
function goldLogo(cx, cy, width, a, sweep, glow = 1) {
  const im = img(LOGO); if (!im || a <= 0) return;
  const lw = width, lh = lw * im.naturalHeight / im.naturalWidth;
  if (!goldCanvas) goldCanvas = document.createElement('canvas');
  goldCanvas.width = Math.ceil(lw * DPR); goldCanvas.height = Math.ceil(lh * DPR);
  const g = goldCanvas.getContext('2d');
  const gr = g.createLinearGradient(0, 0, goldCanvas.width, goldCanvas.height * 0.6);
  gr.addColorStop(0, '#6d4514'); gr.addColorStop(0.3, '#cc913d'); gr.addColorStop(0.55, '#f6bc56'); gr.addColorStop(0.8, '#8d5f24'); gr.addColorStop(1, '#5a3a10');
  g.fillStyle = gr; g.fillRect(0, 0, goldCanvas.width, goldCanvas.height);
  // the travelling glint
  const sx = (sweep * 1.6 - 0.3) * goldCanvas.width;
  const hl = g.createLinearGradient(sx - 260 * DPR, 0, sx + 260 * DPR, goldCanvas.height * 0.4);
  hl.addColorStop(0, 'rgba(255,250,235,0)'); hl.addColorStop(0.5, 'rgba(255,250,235,0.95)'); hl.addColorStop(1, 'rgba(255,250,235,0)');
  g.fillStyle = hl; g.globalCompositeOperation = 'lighter'; g.fillRect(0, 0, goldCanvas.width, goldCanvas.height);
  g.globalCompositeOperation = 'destination-in';
  g.drawImage(im, 0, 0, goldCanvas.width, goldCanvas.height);
  g.globalCompositeOperation = 'source-over';
  ctx.save();
  ctx.globalAlpha = a;
  ctx.shadowColor = 'rgba(246,188,86,0.55)'; ctx.shadowBlur = 40 * DPR * glow;
  ctx.drawImage(goldCanvas, cx - lw / 2, cy - lh / 2, lw, lh);
  ctx.shadowBlur = 0;
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.25 * a * glow;
  ctx.filter = `blur(${18 * DPR}px)`;
  ctx.drawImage(goldCanvas, cx - lw / 2, cy - lh / 2, lw, lh);
  ctx.restore();
}

/* ---------- the cube, orthographic, as on the site ---------- */
const PANELS = ['council', 'goat', 'deities', 'anubis', 'baobab', 'eclipse'].map((n) => `assets/cube/${n}.webp`);
const FACES = [
  { n: [0, 0, 1], r: [1, 0, 0], d: [0, -1, 0], p: 0 },
  { n: [1, 0, 0], r: [0, 0, -1], d: [0, -1, 0], p: 1 },
  { n: [0, 0, -1], r: [-1, 0, 0], d: [0, -1, 0], p: 2 },
  { n: [-1, 0, 0], r: [0, 0, 1], d: [0, -1, 0], p: 3 },
  { n: [0, 1, 0], r: [1, 0, 0], d: [0, 0, 1], p: 4 },
  { n: [0, -1, 0], r: [1, 0, 0], d: [0, 0, -1], p: 5 },
];
function rot(v, ax, ay) {
  // yaw about Y, then pitch about X
  const ca = Math.cos(ay), sa = Math.sin(ay), cb = Math.cos(ax), sb = Math.sin(ax);
  const x1 = v[0] * ca + v[2] * sa, z1 = -v[0] * sa + v[2] * ca, y1 = v[1];
  return [x1, y1 * cb - z1 * sb, y1 * sb + z1 * cb];
}
function cube(cx, cy, L, ay, ax, a = 1) {
  const k = L / 2;
  const P = (v) => [cx + v[0] * k, cy - v[1] * k];
  const light = [-0.35, 0.6, 0.72];
  const vis = [];
  for (const F of FACES) {
    const n = rot(F.n, ax, ay);
    if (n[2] <= 0.001) continue;
    vis.push({ F, n });
  }
  vis.sort((p, q) => p.n[2] - q.n[2]);
  for (const { F, n } of vis) {
    const im = img(PANELS[F.p]); if (!im) continue;
    const o3 = [F.n[0] - F.r[0] - F.d[0], F.n[1] - F.r[1] - F.d[1], F.n[2] - F.r[2] - F.d[2]];
    const o = P(rot(o3, ax, ay));
    const rr = rot(F.r, ax, ay), dd = rot(F.d, ax, ay);
    const ex = [rr[0] * 2 * k, -rr[1] * 2 * k], ey = [dd[0] * 2 * k, -dd[1] * 2 * k];
    const iw = im.naturalWidth, ih = im.naturalHeight;
    ctx.save();
    ctx.setTransform(ex[0] / iw * DPR, ex[1] / iw * DPR, ey[0] / ih * DPR, ey[1] / ih * DPR, o[0] * DPR, o[1] * DPR);
    ctx.globalAlpha = a;
    ctx.drawImage(im, 0, 0);
    // the nine tiles' seams, as on the site
    ctx.strokeStyle = 'rgba(10,7,3,0.75)'; ctx.lineWidth = iw * 0.006;
    for (let i = 1; i < 3; i++) {
      ctx.beginPath(); ctx.moveTo(iw * i / 3, 0); ctx.lineTo(iw * i / 3, ih); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, ih * i / 3); ctx.lineTo(iw, ih * i / 3); ctx.stroke();
    }
    const lit = 0.55 + 0.45 * Math.max(0, n[0] * light[0] + n[1] * light[1] + n[2] * light[2]);
    ctx.fillStyle = `rgba(0,0,0,${(1 - lit) * 0.75})`; ctx.fillRect(0, 0, iw, ih);
    ctx.strokeStyle = 'rgba(204,145,61,0.55)'; ctx.lineWidth = iw * 0.004; ctx.strokeRect(0, 0, iw, ih);
    ctx.restore();
  }
}

/* ---------- the edit ---------- */
/* a cut: [beat, beats, kind, source, in, opts] */
function drawCut(c, t) {
  const [b0, nb, kind, src, at, o = {}] = c;
  const lt = t - T(b0), dur = T(nb);
  const sp = o.speed ?? 1;
  const punch = o.punch ?? 0.06;
  const z0 = o.z ? o.z[0] : 1.0, z1 = o.z ? o.z[1] : 1.045;
  const zoom = (1 + punch * (1 - eo3(seg(lt, 0, 0.32)))) * lerp(z0, z1, eio(clamp(lt / dur, 0, 1)));
  const pxv = o.px ? lerp(o.px[0], o.px[1], lt / dur) : 0;
  const pyv = o.py ? lerp(o.py[0], o.py[1], lt / dur) : 0;
  const opts = { zoom, px: pxv, py: pyv, blend: sp < 0.95 || o.blend, alpha: o.alpha ?? 1 };
  if (kind === 'clip') clip(src, at + lt * sp, opts);
  else if (kind === 'seq') seq(src, at + lt * sp, opts);
  else if (kind === 'still') cover(img(src), opts);
  else if (kind === 'fitseq') {
    // the whole frame, full width, over a blurred copy of itself
    ctx.save(); ctx.filter = `blur(${30 * DPR}px) brightness(0.5)`; seq(src, at + lt * sp, { zoom: 1.3, blend: false }); ctx.restore();
    const bh = W * 9 / 16 * zoom, bw = W * zoom;
    seq(src, at + lt * sp, { x: (W - bw) / 2, y: (H - bh) / 2, w: bw, h: bh });
  }
  else if (kind === 'fit') {
    const im = img(src);
    if (im) {
      ctx.save(); ctx.filter = `blur(${28 * DPR}px) brightness(0.55)`; cover(im, { zoom: 1.2 }); ctx.restore();
      contain(im, { zoom: 0.92 * zoom, y: 0, h: H });
    }
  }
}
function montage(cuts, t, f, o = {}) {
  const bt = t / SPB;
  let i = cuts.length - 1;
  while (i > 0 && bt < cuts[i][0]) i--;
  const c = cuts[i];
  const xf = c[5] && c[5].xf;
  if (xf && i > 0 && bt < c[0] + xf) {
    drawCut(cuts[i - 1], t);
    const k = eio(seg(bt, c[0], c[0] + xf));
    drawCut([c[0], c[1], c[2], c[3], c[4], { ...c[5], alpha: k }], t);
  } else drawCut(c, t);
  const lt = t - T(c[0]);
  if (c[5] && c[5].flash) flash(c[5].flash * (1 - seg(lt, 0, 0.16)));
  if (c[5] && c[5].glitch && lt < 0.13) glitch(f, 1 - lt / 0.13);
  return { cut: c, lt };
}

const ACT1 = [
  [28, 2, 'clip', 'ramses', 9.0, { z: [1.0, 1.06] }],
  [30, 2, 'clip', 'vast-island', 3.3, { px: [-0.75, -0.6] }],
  [32, 2, 'clip', 'tale-of-twins', 6.9, {}],
  [34, 2, 'clip', 'vanta', 3.2, {}],
  [36, 1, 'clip', 'kalimba', 6.05, { flash: 0.25 }],
  [37, 1, 'clip', 'kalimba', 9.3, {}],
  [38, 2, 'clip', 'weekend-thuggery', 5.1, {}],
  [40, 2, 'clip', 'nobody-wears-it-better', 1.0, {}],
  [42, 2, 'clip', 'mythopoeic', 10.1, {}],
  [44, 2, 'clip', 'ice-tea', 3.2, {}],
  [46, 1, 'clip', 'tale-of-twins', 17.1, { flash: 0.3 }],
  [47, 1, 'clip', 'vanta', 9.0, { flash: 0.2 }],
  [48, 2, 'clip', 'vast-island', 8.5, {}],
  [50, 2, 'clip', 'nobody-wears-it-better', 3.1, {}],
  [52, 2, 'clip', 'weekend-thuggery', 11.4, {}],
  [54, 2, 'clip', 'ice-tea', 15.1, { glitch: true }],
  [56, 4, 'clip', 'ramses', 15.4, { speed: 2.05, z: [1.0, 1.18], punch: 0.02 }],
];
const ACT2 = [
  [72, 6, 'clip', 'mythopoeic', 2.6, { punch: 0, z: [1.0, 1.08] }],
  [78, 4, 'clip', 'mythopoeic', 14.0, { speed: 0.5, punch: 0, z: [1.04, 1.0], xf: 0.5 }],
  [82, 2, 'still', 'images/design/desert-swag/withcar.webp', { punch: 0, z: [1.1, 1.0], px: [-0.6, 0.6], xf: 0.35 }],
  [84, 2, 'still', 'images/design/desert-swag/rearview-beige.webp', { punch: 0, z: [1.0, 1.12], xf: 0.35 }],
  [86, 2, 'clip', 'mythopoeic', 18.0, { punch: 0, xf: 0.35 }],
  [88, 2, 'still', 'images/mythopoeic/product-erf---rings.webp', { punch: 0, z: [1.14, 1.0], xf: 0.35 }],
  [90, 2, 'clip', 'mythopoeic', 10.3, { punch: 0, xf: 0.35 }],
  [92, 2, 'still', 'images/healthtech-design0B.webp', { punch: 0, z: [1.0, 1.1], xf: 0.35 }],
  [94, 2, 'fit', 'images/design/lookbookv2.webp', { punch: 0, z: [0.96, 1.02], xf: 0.35 }],
  [96, 8, 'clip', 'mythopoeic', 23.8, { speed: 0.5, punch: 0, z: [1.0, 1.12], xf: 0.35 }],
];
const ACT5 = [
  [136, 2, 'seq', 'mikey', 0.9, { speed: 1.4, flash: 0.5 }],
  [138, 1, 'seq', 'mikey', 13.7, { flash: 0.22, px: [-0.3, -0.3] }],
  [139, 1, 'clip', 'ramses', 6.0, { flash: 0.22 }],
  [140, 1, 'seq', 'mikey', 17.4, { glitch: true }],
  [141, 1, 'clip', 'tale-of-twins', 17.3, { flash: 0.22 }],
  [142, 2, 'seq', 'mikey', 19.2, { speed: 1.2 }],
  [144, 1, 'clip', 'vanta', 18.3, { flash: 0.25 }],
  [145, 1, 'clip', 'vast-island', 4.6, { flash: 0.22 }],
  [146, 2, 'seq', 'mikey', 21.1, { speed: 1.2 }],
  [148, 1, 'clip', 'kalimba', 6.2, { glitch: true }],
  [149, 1, 'clip', 'ice-tea', 17.4, { flash: 0.25 }],
  [150, 2, 'seq', 'mikey', 22.9, {}],
  [152, 2, 'seq', 'header', 25.0, { z: [1.0, 1.12] }],
  [154, 4, 'fitseq', 'mikey', 24.75, { speed: 0.8, z: [1.12, 1.0], punch: 0.03 }],
];
/* the wall: twelve worlds at once */
const GRID = [
  ['clip', 'vast-island', 8.4], ['clip', 'tale-of-twins', 0.9], ['clip', 'vanta', 17.8], ['clip', 'weekend-thuggery', 5.0],
  ['clip', 'ramses', 9.2], ['clip', 'mythopoeic', 0], ['clip', 'ice-tea', 3.0], ['seq', 'mikey', 13.6],
  ['clip', 'kalimba', 9.0], ['clip', 'nobody-wears-it-better', 1.0], ['clip', 'wishfish', 0.2], ['seq', 'header', 24.6],
];
const GRID_ORDER = [5, 0, 10, 3, 7, 1, 8, 11, 2, 6, 4, 9];
const ISSUES = ["What's in a name?", 'Proof of Life', 'Pax Silica', 'Soul in the Machine', 'Memory Serves',
  'Jagged', 'Thinking Out the Box', 'Signed, sealed and watermarked', 'Category Collapse', 'A Drop in the Ocean'];
const WORD_SPOTS = [
  [80, 330, 84], [330, 440, 58], [120, 550, 70], [420, 640, 52], [70, 730, 62],
  [300, 815, 54], [110, 200, 50], [520, 250, 44], [160, 900, 50], [600, 540, 44],
];
const SIGILS = [
  { src: 'assets/journey/moon-5.webp', name: 'SLUMBR' },
  { src: 'assets/journey/mask-hires.webp', name: 'Afrikan Tarot' },
  { src: 'assets/journey/moth-full.webp', name: 'Mystik Skies' },
  { src: 'assets/journey/land-03-tower.webp', name: 'Magic Carpet Wizard' },
  { src: 'assets/journey/owl1.webp', name: 'Manuscript Maker', medallion: true },
];
const MOONS = [1, 2, 3, 4, 5].map((i) => `assets/journey/moon-${i}.webp`);

/* letterbox state across the piece */
function lbAt(bt) {
  return 0;
  if (bt < 26) return 0;
  if (bt < 28) return eio(seg(bt, 26, 28));
  if (bt < 60) return 1;
  if (bt < 62) return 1 - eio(seg(bt, 60, 61.5));
  if (bt < 136) return 0;
  if (bt < 158) return eio(seg(bt, 136, 136.5));
  return 0;
}

function frame(f) {
  const t = f / FPS, bt = t / SPB;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.filter = 'none';
  ctx.fillStyle = C.ink; ctx.fillRect(0, 0, W, H);

  if (bt < 16) {
    /* ---- the summoning ---- */
    const lt = t;
    // the ember, breathing on the heartbeat
    const beatPhase = (bt % 2) / 2;
    const pulse = Math.exp(-beatPhase * 9) * seg(bt, 0.8, 2);
    const ea = eo3(seg(bt, 0.6, 2.4)) * (1 - seg(bt, 14.5, 16));
    const ex = W / 2, ey = H / 2 + 150 - eo3(seg(bt, 0, 16)) * 40;
    if (ea > 0) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const rad = 46 + pulse * 30;
      const g = ctx.createRadialGradient(ex, ey, 0, ex, ey, rad * 3);
      g.addColorStop(0, `rgba(254,249,235,${0.95 * ea})`); g.addColorStop(0.08, `rgba(246,188,86,${0.85 * ea})`);
      g.addColorStop(0.25, `rgba(214,98,42,${0.35 * ea})`); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(ex - rad * 3, ey - rad * 3, rad * 6, rad * 6);
      ctx.restore();
    }
    embers(t, { seed: 11, n: Math.round(14 + 40 * seg(bt, 2, 14)), cx: ex, cy: ey, w: 200, h: 30, rise: 80, alpha: ea });
    // the two lines
    kText('Everything you are about to see', W / 2, H / 2 - 60, t - T(4), {
      italic: true, weight: 300, size: 68, color: C.moon, stagger: 0.03, dur: 1.1, rise: 0.3, blur: 10, exitAt: T(14.6) - T(4), exitDur: 0.7,
    });
    kText('was ', W / 2 - 170, H / 2 + 46, t - T(10), { italic: true, weight: 300, size: 68, color: C.moon, stagger: 0.05, dur: 1, exitAt: T(14.6) - T(10), exitDur: 0.7 });
    kText('conjured.', W / 2 + 80, H / 2 + 46, t - T(10.6), {
      italic: true, weight: 500, size: 108, color: C.flare, stagger: 0.06, dur: 1.2, glow: 26, glowColor: 'rgba(214,98,42,0.75)',
      exitAt: T(14.6) - T(10.6), exitDur: 0.7,
    });
    // the five moons, one to a beat, as on the threshold
    for (let i = 0; i < 5; i++) {
      const im = img(MOONS[i]); if (!im) continue;
      const on = seg(bt, 12 + i * 0.5, 12.5 + i * 0.5);
      const a = eo3(seg(bt, 11.2, 12)) * (1 - seg(bt, 14.6, 15.6));
      if (a <= 0) continue;
      const h = 84, w = h * im.naturalWidth / im.naturalHeight;
      const x = W / 2 + (i - 2) * 92 - w / 2, y = H / 2 + 150;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.filter = `grayscale(${1 - on}) brightness(${0.28 + on * 0.85})`;
      if (on > 0) { ctx.shadowColor = 'rgba(246,188,86,0.7)'; ctx.shadowBlur = 24 * on * DPR; }
      ctx.drawImage(im, x, y, w, h);
      ctx.restore();
    }
  } else if (bt < 24) {
    /* ---- the council ---- */
    const lt = t - T(16);
    if (bt < 22) {
      seq('header', lt * 1.75, { zoom: 1.0 + 0.12 * eio(seg(bt, 16, 22)) });
      dim(0.55 * (1 - seg(bt, 16, 17.5)) + 0.12);
    } else {
      // the eyes catch fire
      const k = seg(bt, 22, 24);
      seq('header', 24.8 + (bt - 22) * 0.6, { zoom: 1.0 + 0.35 * ei3(k) });
      const ff = Math.sin(bt * 31) * 0.5 + 0.5;
      flash(0.05 * ff * k, '246,188,86');
    }
    scrim(W / 2, H / 2, 760, 210, (1 - seg(bt, 21.6, 22)) * seg(bt, 16.6, 17.4));
    kText('Mike Whyle', W / 2, H / 2 + 14, t - T(16.8), {
      family: 'Space Grotesk', weight: 500, size: 46, ls: 0.62, upper: true, color: C.bone, stagger: 0.05, dur: 1, blur: 8,
      exitAt: T(21.4) - T(16.8), exitDur: 0.45,
    });
    line('A showreel  ·  2026', W / 2, H / 2 + 76, eo3(seg(bt, 18, 19.2)) * (1 - seg(bt, 21.2, 21.8)), {
      family: 'Space Grotesk', weight: 400, size: 17, ls: 0.5, upper: true, color: C.flare,
    });
    embers(t, { seed: 21, n: 40, cy: H * 0.95, rise: 90, alpha: 0.8 });
    flash(ei3(seg(bt, 23.3, 24)) * 0.85);
  } else if (bt < 28) {
    /* ---- the drop: through the letters ---- */
    const lt = t - T(24);
    clip('ramses', 5.0 + lt, { zoom: 1.12 - 0.08 * eo3(seg(bt, 24, 28)) });
    const k = seg(bt, 25, 27.6);
    const scale = 1.02 + 0.04 * seg(bt, 24, 25) + Math.pow(k, 3.2) * 46;
    if (bt < 27.6) stencilPlate(scale);
    flash(0.55 * (1 - seg(bt, 24, 24.35)));
  } else if (bt < 60) {
    /* ---- i · human being ---- */
    montage(ACT1, t, f);
    chapter(t - T(27.6), 'i', 'Human Being', 'GenAI Filmmaker', { exitAt: T(33.4) - T(27.6) });
    if (bt > 56) { // the dust wall parts: light gathers before the wall of worlds
      flash(ei3(seg(bt, 59.2, 60)) * 0.5, '246,224,186');
    }
  } else if (bt < 72) {
    /* ---- twelve worlds ---- */
    const lt = t - T(60);
    const gap = 8, tw = (W - gap * 4) / 3, th = (H - gap * 5) / 4;
    const ex = eio(seg(bt, 68, 72));             // the expansion into the eye
    const textDim = eo3(seg(bt, 63.6, 64.6)) * (1 - seg(bt, 67.4, 68.4));
    const hero = 5;
    for (let n = 0; n < 12; n++) {
      if (n === hero) continue;
      drawTile(n, lt, bt, gap, tw, th, ex, textDim);
    }
    drawTile(hero, lt, bt, gap, tw, th, ex, textDim);
    kText('Twelve worlds.', W / 2, H / 2 - 10, t - T(64), {
      size: 104, weight: 500, color: C.bone, stagger: 0.035, dur: 0.9, glow: 30, glowColor: 'rgba(0,0,0,0.7)',
      exitAt: T(67.2) - T(64), exitDur: 0.55,
    });
    kText('One imagination.', W / 2, H / 2 + 88, t - T(65.2), {
      italic: true, weight: 400, size: 64, color: C.flare, stagger: 0.03, dur: 0.9, glow: 24, glowColor: 'rgba(0,0,0,0.7)',
      exitAt: T(67.2) - T(65.2), exitDur: 0.55,
    });
  } else if (bt < 104) {
    /* ---- ii · human doing ---- */
    montage(ACT2, t, f);
    chapter(t - T(72.6), 'ii', 'Human Doing', 'Creative Director', { exitAt: T(78.6) - T(72.6), top: true });
    const lt = t - T(96.6);
    footScrim(eo3(seg(bt, 96.6, 97.4)) * (1 - seg(bt, 101.6, 102.4)));
    kText('Brands that never existed,', W / 2, H - 300, lt, {
      italic: true, weight: 400, size: 62, glow: 20, glowColor: 'rgba(0,0,0,0.8)',
      stagger: 0.022, dur: 1.0, exitAt: T(101.6) - T(96.6), exitDur: 0.6,
    });
    kText('conjured whole.', W / 2, H - 222, lt - 0.5, {
      italic: true, weight: 400, size: 62, glow: 20, glowColor: 'rgba(0,0,0,0.8)', color: C.flare, color: C.moon, stagger: 0.022, dur: 1.0, exitAt: T(101.6) - T(96.6), exitDur: 0.6,
    });
    dim(eio(seg(bt, 102, 104)));
  } else if (bt < 124) {
    /* ---- iii · human thinking ---- */
    const lt = t - T(104);
    const g = ctx.createRadialGradient(W * 0.5, H * 0.62, 40, W * 0.5, H * 0.62, 1100);
    g.addColorStop(0, '#3a270b'); g.addColorStop(0.5, '#1b130a'); g.addColorStop(1, '#0b0907');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const into = eo3(seg(bt, 104, 106)), outro = ei3(seg(bt, 122, 124));
    const ay = (24 + lt * 13 + outro * 140) * Math.PI / 180, ax = -21 * Math.PI / 180;
    cube(W * 0.5, H * 0.6, 560 * (0.86 + 0.14 * into) * (1 + outro * 0.6), ay, ax, into * (1 - outro));
    embers(t, { seed: 31, n: 36, cx: W * 0.5, cy: H * 0.95, w: 1000, rise: 70, alpha: 0.6 });
    for (let i = 0; i < ISSUES.length; i++) {
      const b0 = 105.5 + i * 0.95;
      if (bt < b0) continue;
      const [x, y, s] = WORD_SPOTS[i];
      const newer = Math.max(0, bt - (b0 + 0.95));
      const fadeTo = 0.4 + 0.6 * Math.exp(-newer * 0.8);
      kText(ISSUES[i], x, y, t - T(b0), {
        italic: i % 3 !== 1, weight: i % 3 === 1 ? 500 : 400, size: s, align: 'left', color: i % 4 === 0 ? C.flare : C.moon,
        stagger: 0.018, dur: 0.7, alpha: fadeTo, exitAt: T(115.2) - T(b0) + i * 0.03, exitDur: 0.6,
      });
    }
    chapter(t - T(115.8), 'iii', 'Human Thinking', 'Writer', {
      exitAt: T(122.6) - T(115.8), sub: 'Commentary  ·  Essays  ·  The News Drop', scrim: 0.6,
    });
  } else if (bt < 136) {
    /* ---- iv · the fourth door ---- */
    const lt = t - T(124);
    const g = ctx.createRadialGradient(W * 0.6, H * 0.45, 30, W * 0.6, H * 0.45, 1000);
    g.addColorStop(0, '#2c444a'); g.addColorStop(0.5, '#142024'); g.addColorStop(1, '#080b0b');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const implode = ei3(seg(bt, 131.5, 135.8));
    const cx = W * 0.5, cy = H * 0.38;
    // orbit lines
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(-8 * Math.PI / 180);
    ctx.strokeStyle = `rgba(111,154,161,${0.28 * (1 - implode) * seg(bt, 124, 125)})`; ctx.lineWidth = 1;
    for (const [rx, ry] of [[350, 130], [270, 100]]) { ctx.beginPath(); ctx.ellipse(0, 0, rx * (1 - implode), ry * (1 - implode), 0, 0, 6.283); ctx.stroke(); }
    ctx.restore();
    const spin = lt * 0.42 + implode * 7;
    const items = SIGILS.map((s, i) => {
      const th = i * 6.283 / 5 + spin;
      const rx = 350 * (1 - implode), ry = 130 * (1 - implode);
      const x0 = Math.cos(th) * rx, y0 = Math.sin(th) * ry;
      const a8 = -8 * Math.PI / 180;
      const x = cx + x0 * Math.cos(a8) - y0 * Math.sin(a8), y = cy + x0 * Math.sin(a8) + y0 * Math.cos(a8);
      const depth = (Math.sin(th) + 1) / 2;   // front of the orbit is lower and nearer
      return { s, i, x, y, depth };
    }).sort((p, q) => p.depth - q.depth);
    for (const it of items) {
      const im = img(it.s.src); if (!im) continue;
      const pop = eoBack(seg(bt, 124.2 + it.i * 0.5, 125.2 + it.i * 0.5));
      if (pop <= 0) continue;
      const sc = (0.62 + 0.5 * it.depth) * pop * (1 - implode * 0.6);
      const a = clamp(pop, 0, 1) * (0.45 + 0.55 * it.depth);
      const h = 180 * sc;
      ctx.save(); ctx.globalAlpha = a;
      ctx.shadowColor = 'rgba(246,188,86,0.35)'; ctx.shadowBlur = 30 * DPR * (0.4 + implode);
      if (it.s.medallion) {
        ctx.beginPath(); ctx.arc(it.x, it.y, h * 0.5, 0, 6.283); ctx.save(); ctx.clip();
        ctx.drawImage(im, it.x - h * 0.55, it.y - h * 0.55, h * 1.1, h * 1.1); ctx.restore();
        ctx.strokeStyle = C.gold; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(it.x, it.y, h * 0.5, 0, 6.283); ctx.stroke();
      } else {
        const w = h * im.naturalWidth / im.naturalHeight;
        ctx.drawImage(im, it.x - w / 2, it.y - h / 2, w, h);
      }
      ctx.restore();
      // the names keep clear of the narrow frame's edges as the orbit swings
      ctx.save(); ctx.font = '500 17px "Space Grotesk"'; ctx.letterSpacing = `${0.26 * 17}px`;
      const lw2 = ctx.measureText(it.s.name.toUpperCase()).width / 2; ctx.restore();
      line(it.s.name, clamp(it.x, 36 + lw2, W - 36 - lw2), it.y + h * 0.5 + 38, a * (1 - implode), {
        family: 'Space Grotesk', weight: 500, size: 17, ls: 0.26, upper: true, color: C.moon,
      });
    }
    embers(t, { seed: 41, n: 50, cx, cy: cy + 80, w: 1000, h: 400, rise: 50, alpha: 0.5 + implode });
    chapter(t - T(124.8), 'iv', 'The Fourth Door', 'Creative Technologist', {
      exitAt: T(131.4) - T(124.8), size: 104, sub: 'Apps, games and worlds you can step into', scrim: 0.8,
    });
    flash(ei3(seg(bt, 134.6, 136)) * 0.95);
  } else if (bt < 158) {
    /* ---- the finale ---- */
    montage(ACT5, t, f);
    if (bt >= 157.6) dim(1);
  } else if (bt < 160) {
    /* ---- a breath of black ---- */
    const ea = seg(bt, 159.2, 160);
    if (ea > 0) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(W / 2, H / 2 - 60, 0, W / 2, H / 2 - 60, 90 * ea);
      g.addColorStop(0, `rgba(254,249,235,${ea})`); g.addColorStop(0.2, `rgba(246,188,86,${0.7 * ea})`); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
    }
  } else {
    /* ---- the mark ---- */
    const lt = t - T(160);
    const fade = 1 - seg(bt, 171, 174);
    const g = ctx.createRadialGradient(W / 2, H * 0.42, 20, W / 2, H * 0.42, 1100);
    g.addColorStop(0, `rgba(58,39,11,${0.75 * fade})`); g.addColorStop(1, 'rgba(11,9,7,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    embers(t, { seed: 51, n: 70, cy: H * 1.02, rise: 75, alpha: 0.85 * fade });
    const ign = eo3(seg(bt, 160, 161.2));
    ctx.save();
    if (ign < 1) ctx.filter = `blur(${((1 - ign) * 18 * DPR).toFixed(2)}px)`;
    goldLogo(W / 2, H * 0.42, 860 * (1.06 - 0.06 * ign), ign * fade, seg(bt, 160.4, 164.4), 1 + (1 - ign) * 1.5);
    ctx.restore();
    burst(t, T(160), W / 2, H * 0.42, { n: 90, v: 560, sx: 1.0 });
    kText('Mike Whyle', W / 2, H * 0.6, t - T(162), {
      family: 'Space Grotesk', weight: 500, size: 34, ls: 0.7, upper: true, color: C.bone, stagger: 0.045, dur: 1, alpha: fade,
    });
    line('GenAI Creative Director  ·  Writer', W / 2, H * 0.6 + 64,
      eo3(seg(bt, 163, 164.4)) * fade, { family: 'Space Grotesk', weight: 400, size: 22, ls: 0.28, upper: true, color: C.flare });
    line('Creative Technologist  ·  Filmmaker', W / 2, H * 0.6 + 104,
      eo3(seg(bt, 163.3, 164.7)) * fade, { family: 'Space Grotesk', weight: 400, size: 22, ls: 0.28, upper: true, color: C.flare });
    line('portfolio.mikewhyle.com', W / 2, H * 0.6 + 200, eo3(seg(bt, 165, 166.4)) * fade, {
      italic: true, weight: 400, size: 40, color: C.moon,
    });
    line('mikewhyle@gmail.com', W / 2, H * 0.6 + 246, eo3(seg(bt, 165.6, 167)) * fade * 0.8, {
      family: 'Space Grotesk', weight: 400, size: 16, ls: 0.28, color: C.text,
    });
    flash(0.9 * (1 - seg(bt, 160, 160.5)), '255,236,200');
  }

  // the unifying grade
  letterbox(lbAt(bt));
  vignette(0.42);
  grain(f, 0.075);
  // the first and last frames rest on black
  if (bt < 0.6) dim(1 - seg(bt, 0, 0.6));
  if (bt > 173.2) dim(seg(bt, 173.2, 174));
}

/* one tile of the wall, and its flight into the hero tile's world */
function drawTile(n, lt, bt, gap, tw, th, ex, textDim) {
  const col = n % 3, row = (n / 3) | 0;
  const k = GRID_ORDER.indexOf(n);
  const ap = eo5(seg(bt, 60 + k * 0.25, 61.2 + k * 0.25));
  if (ap <= 0) return;
  let x = gap + col * (tw + gap), y = gap + row * (th + gap), w = tw, h = th;
  const [kind, src, at] = GRID[n];
  const hero = n === 5;
  let a = ap;
  if (hero) {
    x = lerp(x, 0, ex); y = lerp(y, 0, ex); w = lerp(w, W, ex); h = lerp(h, H, ex);
  } else if (ex > 0) {
    // the others are flung outward as the hero fills the frame
    const dx = (x + w / 2 - W / 2), dy = (y + h / 2 - H / 2);
    x += dx * ex * 1.4; y += dy * ex * 1.4; a *= 1 - ex;
  }
  const sc = 0.86 + 0.14 * ap;
  const cx = x + w / 2, cy = y + h / 2; const sw = w * sc, sh = h * sc;
  const rx = cx - sw / 2, ry = cy - sh / 2;
  clipRect(rx, ry, sw, sh, () => {
    const sec = hero ? (bt < 68 ? 0.35 + (bt - 60) * 0.03 : 0.6 + (bt - 68) * SPB) : at + lt;
    const o = { x: rx, y: ry, w: sw, h: sh, alpha: a, zoom: 1.0 };
    if (kind === 'clip') clip(src, sec, o); else seq(src, sec, o);
    const d = textDim * 0.62 * (hero ? 1 - ex : 1);
    if (d > 0) { ctx.fillStyle = `rgba(0,0,0,${d * a})`; ctx.fillRect(rx, ry, sw, sh); }
  });
  if (!hero || ex < 1) {
    ctx.save(); ctx.strokeStyle = `rgba(204,145,61,${0.5 * a * (hero ? 1 - ex : 1)})`; ctx.lineWidth = 1;
    ctx.strokeRect(rx + 0.5, ry + 0.5, sw - 1, sh - 1); ctx.restore();
  }
  // a glint as each tile lands
  const gl = 1 - seg(bt, 60 + k * 0.25, 60.6 + k * 0.25);
  if (gl > 0 && gl < 1) { ctx.fillStyle = `rgba(255,240,210,${0.35 * gl})`; ctx.fillRect(rx, ry, sw, sh); }
}

/* ---------- the driver's hooks ---------- */
async function ready() {
  const faces = ['300 58px "Cormorant Garamond"', 'italic 300 58px "Cormorant Garamond"', 'italic 400 58px "Cormorant Garamond"',
    'italic 500 58px "Cormorant Garamond"', '500 58px "Cormorant Garamond"', '400 20px "Space Grotesk"', '500 20px "Space Grotesk"'];
  await Promise.all(faces.map((f) => document.fonts.load(f)));
  return TOTAL_FRAMES;
}
async function render(f) {
  for (let pass = 0; pass < 6; pass++) {
    pending.clear();
    frame(f);
    if (!pending.size) return true;
    await Promise.all([...pending]);
  }
  frame(f);
  return false;
}
window.reel = { ready, render, TOTAL_FRAMES };
