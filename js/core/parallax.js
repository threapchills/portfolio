/* parallax.js — the layered world of Acts I to III.
   A virtual camera (cx, cy, zoom in base-image coordinates) maps every
   layer to a translate3d + scale; depth drives parallax rate and the fuzz.

   Layer positions were recovered by template-matching each cutout against
   the base scan, so the reconstructed scene sits pixel-true on the artwork. */

import { asset, clamp, fromRoot, smoothstep, IS_MOBILE, REDUCED_MOTION } from './util.js';

const BASE_AR = 4160 / 3120;
const OVERSCAN = 1.06;          // idle drift must never reveal a world edge
const FUZZ_K = IS_MOBILE ? 3.2 : 5.5;
const MAX_BLURRED = IS_MOBILE ? 2 : 3;

/* x, y, w: normalised rect on the base canvas. depth: 0 = base plane,
   1 = touching the lens. drift: idle sine amplitude px / period s. */
const LAYERS = [
  { id: 'base',       src: 'assets/journey/land-00-base.webp',       x: 0,      y: 0,      w: 1,      depth: 0,    drift: [3, 20] },
  { id: 'moon-1',     src: 'assets/journey/moon-1.webp',             x: 0.1077, y: 0.0385, w: 0.1084, depth: 0.05, drift: [4, 17], moon: true },
  { id: 'moon-2',     src: 'assets/journey/moon-2.webp',             x: 0.2433, y: 0.0385, w: 0.1382, depth: 0.05, drift: [4, 14], moon: true },
  { id: 'moon-3',     src: 'assets/journey/moon-3.webp',             x: 0.3644, y: 0.0,    w: 0.3312, depth: 0.06, drift: [5, 19], moon: true },
  { id: 'moon-4',     src: 'assets/journey/moon-4.webp',             x: 0.7077, y: 0.0231, w: 0.1325, depth: 0.05, drift: [4, 15], moon: true },
  { id: 'moon-5',     src: 'assets/journey/moon-5.webp',             x: 0.8308, y: 0.0167, w: 0.1103, depth: 0.05, drift: [4, 18], moon: true },
  { id: 'hills-far',  src: 'assets/journey/land-01-hills-far.webp',  x: 0,      y: 0.5167, w: 1,      depth: 0.10, drift: [4, 16] },
  { id: 'tower',      src: 'assets/journey/land-03-tower.webp',      x: 0.4298, y: 0.3077, w: 0.1918, depth: 0.15, drift: [4, 21] },
  { id: 'hill-main',  src: 'assets/journey/land-02-hill-main.webp',  x: 0,      y: 0.5462, w: 1,      depth: 0.18, drift: [4, 18] },
  { id: 'goddess',    src: 'assets/journey/goddess-full-m.webp',     x: 0.4225, y: 0.575,  w: 0.055,  depth: 0.20, drift: [2, 12], goddess: true },
  { id: 'moth',       src: 'assets/journey/moth-full.webp',          x: 0.385,  y: 0.72,   w: 0.17,   depth: 0.42, drift: [5, 9], moth: true },
  { id: 'flora-mid',  src: 'assets/journey/land-04-flora-mid.webp',  x: -0.04,  y: 0.6756, w: 0.62,   depth: 0.62, drift: [6, 13] },
  { id: 'flora-fore', src: 'assets/journey/land-05-flora-fore.webp', x: 0,      y: 0.7141, w: 1,      depth: 0.85, drift: [8, 11] },
];

const PARALLAX_BETA = 0.55;     // near layers outrun the base by z^(beta * depth)

export class World {
  constructor(container) {
    this.el = container;
    this.cam = { cx: 0.5, cy: 0.52, z: 1 };
    this.focus = 0;
    this.mothPose = null;        // { dx, dy, rot, opacity } world-relative crawl
    this.layers = [];
    this.blurSteps = new Map();
    this.build();
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  build() {
    for (const cfg of LAYERS) {
      const wrap = document.createElement('div');
      wrap.className = 'world-layer';
      wrap.dataset.layer = cfg.id;
      const img = document.createElement('img');
      img.src = fromRoot(asset(cfg.src));
      img.alt = '';
      img.draggable = false;
      if (cfg.goddess) {
        // the drawing has no feet; her hem dissolves into the hill's glow
        // instead of ending in a cropped edge
        img.style.webkitMaskImage = img.style.maskImage =
          'linear-gradient(to bottom, black 84%, transparent 99%)';
      }
      wrap.appendChild(img);
      if (cfg.moon) {
        const glow = document.createElement('div');
        glow.className = 'moon-glow';
        // pulse on the compositor, never from the frame loop
        glow.style.animationDuration = `${cfg.drift[1]}s`;
        glow.style.animationDelay = `${-Math.random() * cfg.drift[1]}s`;
        wrap.insertBefore(glow, img);
        cfg.glowEl = glow;
      }
      this.el.appendChild(wrap);
      this.layers.push({ cfg, wrap, img, phase: Math.random() * Math.PI * 2 });
    }
  }

  resize() {
    const vw = this.el.clientWidth || window.innerWidth;
    const vh = this.el.clientHeight || window.innerHeight;
    this.vw = vw; this.vh = vh;
    this.W = Math.max(vw, vh * BASE_AR) * OVERSCAN;
    this.H = this.W / BASE_AR;
    for (const l of this.layers) {
      const { cfg, img, wrap } = l;
      wrap.style.width = `${this.W}px`;
      wrap.style.height = `${this.H}px`;
      img.style.left = `${cfg.x * this.W}px`;
      img.style.top = `${cfg.y * this.H}px`;
      img.style.width = `${cfg.w * this.W}px`;
      if (cfg.glowEl) {
        cfg.glowEl.style.left = `${cfg.x * this.W}px`;
        cfg.glowEl.style.top = `${cfg.y * this.H}px`;
        cfg.glowEl.style.width = `${cfg.w * this.W}px`;
        cfg.glowEl.style.height = `${cfg.w * this.W}px`;
      }
    }
  }

  setCamera(cx, cy, z) {
    // clamp so the base layer's edges never cross into the viewport
    const s = Math.max(z, 1);
    const mx = this.vw / (2 * this.W * s);
    const my = this.vh / (2 * this.H * s);
    this.cam.cx = clamp(cx, mx, 1 - mx);
    this.cam.cy = clamp(cy, my, 1 - my);
    this.cam.z = z;
  }

  setFocus(depth) { this.focus = depth; }
  setMothPose(pose) { this.mothPose = pose; }
  setGoddessOpacity(o) { this.goddessOpacity = o; }

  /* Called every frame. time in seconds for the idle drift. */
  render(time) {
    const { cx, cy, z } = this.cam;
    const zoomFactor = clamp(z - 0.9, 0, 3.2);
    // pick the MAX_BLURRED most defocused layers; everything else stays sharp
    const wanted = this.layers
      .map((l) => ({ l, blur: FUZZ_K * Math.abs(l.cfg.depth - this.focus) * zoomFactor }))
      .filter((e) => e.blur > 0.6)
      .sort((a, b) => b.blur - a.blur)
      .slice(0, MAX_BLURRED);
    const blurIds = new Map(wanted.map((e) => [e.l.cfg.id, e.blur]));

    // near layers dissolve as the push passes them, before their scaled
    // textures grow monstrous enough to make the GPU stutter
    const nearFade = 1 - smoothstep(3.4, 4.6, z);

    for (const l of this.layers) {
      const { cfg, wrap, img } = l;
      const s = Math.pow(z, 1 + PARALLAX_BETA * cfg.depth);
      const tx = this.vw / 2 - cx * this.W * s;
      const ty = this.vh / 2 - cy * this.H * s;

      const fade = cfg.depth >= 0.4 ? nearFade : 1;

      // cull: hide layers scaled fully outside the viewport, faded out,
      // or magnified beyond what any GPU should be asked to rasterise
      const left = tx + cfg.x * this.W * s;
      const top = ty + cfg.y * this.H * s;
      const w = cfg.w * this.W * s;
      const h = w * (img.naturalHeight / (img.naturalWidth || 1));
      const off = left > this.vw || top > this.vh || left + w < 0 ||
        (h > 0 && top + h < 0) || fade < 0.01 || s > 24;
      wrap.style.visibility = off ? 'hidden' : 'visible';
      if (off) continue;

      let drift = '';
      if (!REDUCED_MOTION) {
        const [amp, period] = cfg.drift;
        const dx = Math.sin(time * 2 * Math.PI / period + l.phase) * amp;
        const dy = Math.cos(time * 2 * Math.PI / (period * 1.3) + l.phase) * amp * 0.6;
        drift = ` translate3d(${dx.toFixed(2)}px, ${dy.toFixed(2)}px, 0)`;
      }

      if (cfg.moth && this.mothPose) {
        const { dx, dy, rot, opacity } = this.mothPose;
        wrap.style.opacity = (opacity * fade).toFixed(3);
        img.style.transform = `translate3d(${dx * this.W * s}px, ${dy * this.H * s}px, 0) rotate(${rot}deg)` + drift;
      } else {
        const g = cfg.goddess ? (this.goddessOpacity ?? 1) : 1;
        wrap.style.opacity = (fade * g).toFixed(3);
        if (!REDUCED_MOTION) img.style.transform = drift || 'none';
      }

      wrap.style.transform = `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0) scale(${s.toFixed(4)})`;

      // the fuzz: quantised so the GPU never animates a live blur radius
      const blur = blurIds.get(cfg.id) || 0;
      const step = Math.round(blur * 2) / 2;
      if (this.blurSteps.get(cfg.id) !== step) {
        this.blurSteps.set(cfg.id, step);
        wrap.style.filter = step > 0 ? `blur(${step}px)` : 'none';
      }
    }
  }
}
