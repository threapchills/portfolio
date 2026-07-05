/* sequence.js — the frame-sequence scrubber for the Mikey hero film.
   Never scrubs a <video>; the film is decoded to WebP frames at build
   time and drawn to canvas keyed to smoothed scroll progress. */

import { clamp, damp } from './util.js';

export class FrameScrubber {
  constructor(canvas, { dir, count, pad = 4 }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.dir = dir;
    this.count = count;
    this.pad = pad;
    this.images = [];
    this.current = -1;
    this.progress = 0;
    this.target = 0;
    this.resize();
    window.addEventListener('resize', () => { this.resize(); this.draw(true); });
  }

  resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    this.canvas.width = this.canvas.clientWidth * dpr;
    this.canvas.height = this.canvas.clientHeight * dpr;
  }

  src(i) {
    return `${this.dir}/f_${String(i + 1).padStart(this.pad, '0')}.webp`;
  }

  /* Loads every frame; reports progress 0..1 to the micro-loader. */
  preload(onProgress) {
    let done = 0;
    const jobs = [];
    for (let i = 0; i < this.count; i++) {
      jobs.push(new Promise((resolve) => {
        const img = new Image();
        const fin = () => { done += 1; onProgress?.(done / this.count); resolve(); };
        img.onload = fin;
        img.onerror = fin;   // a missing frame must not stall the chamber
        img.src = this.src(i);
        this.images[i] = img;
      }));
    }
    return Promise.all(jobs).then(() => {
      // decode the opening frames so the first paint is instant
      return Promise.allSettled(this.images.slice(0, 6).map((im) => im.decode?.() ?? 0));
    });
  }

  setProgress(p) { this.target = clamp(p, 0, 1); }

  /* Per-frame tick: eases toward the target so the scrub feels weighted. */
  tick(dt) {
    this.progress = damp(this.progress, this.target, 10, dt);
    this.draw();
  }

  draw(force = false) {
    const idx = clamp(Math.round(this.progress * (this.count - 1)), 0, this.count - 1);
    if (idx === this.current && !force) return;
    this.current = idx;
    const img = this.images[idx];
    if (!img || !img.naturalWidth) return;
    // hint the decoder along the direction of travel
    for (let k = 1; k <= 3; k++) {
      const n = this.images[idx + (this.target >= this.progress ? k : -k)];
      n?.decode?.().catch(() => {});
    }
    const { width: cw, height: ch } = this.canvas;
    const s = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
    const w = img.naturalWidth * s, h = img.naturalHeight * s;
    this.ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
  }
}
