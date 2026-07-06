/* cursor.js — the custom cursor and its glitch trail.
   A moon dot rides the pointer; a slower ring hunts it; behind them a
   canvas trail decays, splitting into gold and teal at speed and
   occasionally slicing sideways: the cursor speaking the same warped
   dialect as the image planes. Fine pointers only. */

import { clamp, damp, fromRoot, REDUCED_MOTION } from './util.js';

export function initCursor() {
  if (window.matchMedia('(pointer: coarse)').matches) return;
  document.documentElement.classList.add('has-custom-cursor');

  /* the pointer is one of the artwork's own moons, made small */
  const dot = document.createElement('img');
  dot.className = 'mw-cursor-moon';
  dot.src = fromRoot('assets/journey/moon-3.webp');
  dot.alt = '';
  const ring = document.createElement('div');
  ring.className = 'mw-cursor-ring';
  document.body.append(ring, dot);

  let px = innerWidth / 2, py = innerHeight / 2;   // pointer
  let rx = px, ry = py;                            // ring, damped
  let speed = 0;
  let seen = false;

  /* the trail */
  let canvas, ctx, dpr = 1;
  const points = [];
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

  addEventListener('pointermove', (e) => {
    const nx = e.clientX, ny = e.clientY;
    speed = Math.min(Math.hypot(nx - px, ny - py), 90);
    px = nx; py = ny;
    seen = true;
    if (ctx) {
      points.push({ x: nx, y: ny });
      if (points.length > 36) points.shift();
    }
  }, { passive: true });

  document.addEventListener('pointerleave', () => { seen = false; });

  /* the ring answers interactive things */
  const HOT = 'a, button, [role="button"], .card, .cube-face, .film-plane, .artefact';
  document.addEventListener('pointerover', (e) => {
    ring.classList.toggle('is-active', !!e.target.closest(HOT));
  });
  document.addEventListener('pointerdown', () => ring.classList.add('is-down'));
  document.addEventListener('pointerup', () => ring.classList.remove('is-down'));

  let last = performance.now();
  let glitchClock = 0;
  const loop = (now) => {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    rx = damp(rx, px, 14, dt);
    ry = damp(ry, py, 14, dt);
    const vis = seen ? 1 : 0;
    dot.style.opacity = ring.style.opacity = vis;
    const spin = REDUCED_MOTION ? 0 : (now * 0.008) % 360;
    dot.style.transform = `translate3d(${px - 11}px, ${py - 11}px, 0) rotate(${spin.toFixed(1)}deg)`;
    ring.style.transform = `translate3d(${rx - 17}px, ${ry - 17}px, 0)`;
    speed *= 0.9;

    if (ctx) {
      // decay what came before
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.16)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = 'lighter';
      if (points.length > 2 && seen) {
        const split = clamp(speed * 0.06, 0, 4);   // rgb split grows with pace
        const passes = split > 0.4
          ? [['rgba(196, 146, 42, 0.35)', -split, 0],
             ['rgba(61, 138, 138, 0.32)', split, split * 0.5],
             ['rgba(242, 226, 160, 0.28)', 0, -split * 0.4]]
          : [['rgba(242, 226, 160, 0.3)', 0, 0]];
        for (const [colour, ox, oy] of passes) {
          ctx.strokeStyle = colour;
          ctx.lineWidth = 1.4 * dpr;
          ctx.lineCap = 'round';
          ctx.beginPath();
          points.forEach((pt, i) => {
            const jx = (Math.random() - 0.5) * split * 0.8;
            const x = (pt.x + ox + jx) * dpr;
            const y = (pt.y + oy) * dpr;
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
          });
          ctx.stroke();
        }
        // the slice: at pace, a band of the trail tears sideways
        glitchClock -= dt;
        if (speed > 26 && glitchClock <= 0) {
          glitchClock = 0.35 + Math.random() * 0.5;
          const bh = (8 + Math.random() * 22) * dpr;
          const by = clamp((py + (Math.random() - 0.5) * 120) * dpr, 0, canvas.height - bh);
          const shove = (Math.random() - 0.5) * 46 * dpr;
          ctx.globalCompositeOperation = 'source-over';
          ctx.drawImage(canvas, 0, by, canvas.width, bh, shove, by, canvas.width, bh);
        }
      }
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
