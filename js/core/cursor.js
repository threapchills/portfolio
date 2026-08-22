/* cursor.js — the pointer as a carried light.
   The old cursor spoke in RGB split and horizontal tearing, which was the
   right dialect when the image planes were being warped by GL. This world
   is lit by torches, so the pointer carries one: a small ember core, a
   ring that opens over anything that answers, and a wake of sparks that
   fall behind the hand, drift upward and go out. Fine pointers only. */

import { clamp, damp, REDUCED_MOTION } from './util.js';

/* the fire's own range, sampled off the film: deep ember through to flare */
const EMBER = [
  [246, 188, 86],
  [204, 145, 61],
  [214, 98, 42],
  [254, 249, 235],
];

export function initCursor() {
  if (window.matchMedia('(pointer: coarse)').matches) return;
  document.documentElement.classList.add('has-custom-cursor');

  const core = document.createElement('div');
  core.className = 'mw-cursor-core';
  const ring = document.createElement('div');
  ring.className = 'mw-cursor-ring';
  document.body.append(ring, core);

  let px = innerWidth / 2, py = innerHeight / 2;   // the hand
  let rx = px, ry = py;                            // the ring, trailing
  let lx = px, ly = py;                            // last emission point
  let speed = 0;
  let seen = false;

  let canvas, ctx, dpr = 1;
  const sparks = [];
  const MAX = 220;

  if (!REDUCED_MOTION) {
    canvas = document.createElement('canvas');
    canvas.id = 'mw-trail';
    document.body.appendChild(canvas);
    ctx = canvas.getContext('2d');
    const size = () => {
      dpr = Math.min(devicePixelRatio || 1, 2);
      canvas.width = innerWidth * dpr;
      canvas.height = innerHeight * dpr;
    };
    size();
    addEventListener('resize', size);
  }

  /* Sparks are struck along the path rather than at the pointer, so a fast
     sweep leaves a continuous wake instead of a dotted line. */
  function strike(x0, y0, x1, y1) {
    const d = Math.hypot(x1 - x0, y1 - y0);
    const n = clamp(Math.round(d / 7), 1, 14);
    for (let i = 0; i < n; i++) {
      if (sparks.length >= MAX) sparks.shift();
      const t = (i + 1) / n;
      const c = EMBER[(Math.random() * EMBER.length) | 0];
      sparks.push({
        x: x0 + (x1 - x0) * t + (Math.random() - 0.5) * 6,
        y: y0 + (y1 - y0) * t + (Math.random() - 0.5) * 6,
        // thrown loosely along the direction of travel, then buoyant
        vx: (x1 - x0) * 0.06 + (Math.random() - 0.5) * 22,
        vy: (y1 - y0) * 0.06 + (Math.random() - 0.5) * 22,
        life: 0.55 + Math.random() * 0.85,
        age: 0,
        r: 0.7 + Math.random() * 1.7,
        c,
        phase: Math.random() * 6.283,
      });
    }
  }

  addEventListener('pointermove', (e) => {
    const nx = e.clientX, ny = e.clientY;
    speed = Math.min(Math.hypot(nx - px, ny - py), 90);
    px = nx; py = ny;
    if (!seen) { lx = nx; ly = ny; }
    seen = true;
    if (ctx) { strike(lx, ly, nx, ny); lx = nx; ly = ny; }
  }, { passive: true });

  document.addEventListener('pointerleave', () => { seen = false; });

  /* the ring opens over anything that answers to a click */
  const HOT = 'a, button, [role="button"], .card, .cube-face, .cube-cell.is-titled, .film-banner, .artefact';
  document.addEventListener('pointerover', (e) => {
    ring.classList.toggle('is-active', !!e.target.closest(HOT));
  });
  document.addEventListener('pointerdown', () => ring.classList.add('is-down'));
  document.addEventListener('pointerup', () => ring.classList.remove('is-down'));

  let last = performance.now();
  const loop = (now) => {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;

    rx = damp(rx, px, 13, dt);
    ry = damp(ry, py, 13, dt);
    const vis = seen ? 1 : 0;
    core.style.opacity = ring.style.opacity = vis;
    core.style.transform = `translate3d(${px - 5}px, ${py - 5}px, 0)`;
    ring.style.transform = `translate3d(${rx - 17}px, ${ry - 17}px, 0) rotate(${(now * 0.02).toFixed(1)}deg)`;
    // the core swells with pace, the way a carried flame leans and brightens
    core.style.setProperty('--heat', (1 + clamp(speed * 0.012, 0, 0.7)).toFixed(3));
    speed *= 0.9;

    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = 'lighter';
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.age += dt;
        if (s.age >= s.life) { sparks.splice(i, 1); continue; }
        const k = s.age / s.life;
        // buoyancy: embers slow, then rise, wandering as they cool
        s.vy += (-46 - s.vy * 1.5) * dt;
        s.vx += (-s.vx * 1.6 + Math.sin(s.phase + s.age * 5) * 14) * dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        const flicker = 0.72 + 0.28 * Math.sin(s.phase + s.age * 22);
        const a = (1 - k) * (1 - k) * flicker;
        const rad = s.r * (1 - k * 0.45) * dpr;
        const [r, g, b] = s.c;
        const gx = s.x * dpr, gy = s.y * dpr;
        const grad = ctx.createRadialGradient(gx, gy, 0, gx, gy, rad * 5);
        grad.addColorStop(0, `rgba(${r},${g},${b},${(a * 0.85).toFixed(3)})`);
        grad.addColorStop(0.35, `rgba(${r},${g},${b},${(a * 0.22).toFixed(3)})`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(gx, gy, rad * 5, 0, 6.283);
        ctx.fill();
      }
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
