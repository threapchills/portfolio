/* ground.js — the page's own light, changing as you descend.
   A flat background colour under a scroll this long reads as a wall. This
   one is a gradient in time rather than in space: charcoal at the threshold,
   warming through burnt umber across the film, arriving at gold by the time
   the writing cube turns, and going back to charcoal behind the metal mark
   so the loop closes on the colour it opened with.

   Through the design chamber the fixed stops hand over to the work itself.
   Each board carries a tone taken from its own dominant mid-tone at build
   time (the most chromatic colour in the picture, mapped into a dark band),
   and the ground walks between neighbouring boards as they pass, so the room
   is always lit by whatever is hanging in it.

   Everything is damped toward its target, so no jump in scroll position can
   produce a jump in colour. */

import { clamp, damp, qs, qsa } from './util.js';

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

/* the fixed stops, in document order: [selector, fraction through it, colour] */
const STOPS = [
  ['#journey',      0.00, '#17181a'],   // charcoal, where it starts
  ['#journey',      0.62, '#241a12'],   // the first warmth, under the vortex
  ['#reading-wrap', 0.30, '#33200f'],
  ['#film',         0.02, '#4a2c12'],   // burnt umber through the reel
  ['#film',         0.65, '#8f6118'],
  ['#writing',      0.10, '#c9922a'],   // gold by the time the cube turns
  ['#writing',      0.92, '#b88423'],
  // #design is not listed: the work itself owns the ground there
  ['#fourth-door',  0.04, '#9c6a1e'],
  ['#outro',        0.10, '#3c2711'],
  ['#chrome',       0.20, '#17181a'],   // back to charcoal behind the mark
  ['#loop-gate',    0.50, '#17181a'],   // and holds, so the loop is seamless
];

export function initGround(tones) {
  const root = document.documentElement;
  const design = qs('#design');
  const pieces = qsa('.design-piece');

  /* Document positions are resolved once and on resize rather than per
     frame: a getBoundingClientRect for every stop on every tick is a lot of
     layout for a colour. */
  let marks = [];
  const measure = () => {
    marks = STOPS.map(([sel, f, c]) => {
      const el = qs(sel);
      if (!el) return null;
      const top = el.getBoundingClientRect().top + window.scrollY;
      return { y: top + el.offsetHeight * f, rgb: hex(c) };
    }).filter(Boolean).sort((a, b) => a.y - b.y);
  };
  measure();
  addEventListener('resize', measure);
  // the page grows as chambers build themselves, so re-measure once settled
  addEventListener('load', () => setTimeout(measure, 900));

  const mix = (a, b, t) => [0, 1, 2].map((i) => a[i] + (b[i] - a[i]) * t);

  /* inside the design chamber: walk between the boards' own tones */
  function designTone(mid) {
    if (!pieces.length || !tones || !tones.length) return null;
    let lo = 0;
    const centres = [];
    for (let i = 0; i < pieces.length; i++) {
      const r = pieces[i].getBoundingClientRect();
      centres.push(r.top + window.scrollY + r.height / 2);
    }
    if (mid <= centres[0]) return hex(tones[0]);
    if (mid >= centres[centres.length - 1]) return hex(tones[tones.length - 1]);
    while (lo < centres.length - 2 && centres[lo + 1] < mid) lo += 1;
    const t = clamp((mid - centres[lo]) / (centres[lo + 1] - centres[lo]), 0, 1);
    return mix(hex(tones[lo] || tones[0]), hex(tones[lo + 1] || tones[0]), t);
  }

  function targetAt(mid) {
    if (design) {
      const r = design.getBoundingClientRect();
      const top = r.top + window.scrollY;
      const bottom = top + design.offsetHeight;
      // a screen of overlap either side, so the handover is a blend and not a cut
      const fade = window.innerHeight * 0.9;
      if (mid > top - fade && mid < bottom + fade) {
        const dt = designTone(mid);
        if (dt) {
          const edge = mid < top ? (mid - (top - fade)) / fade
            : mid > bottom ? 1 - (mid - bottom) / fade : 1;
          return mix(fixedAt(mid), dt, clamp(edge, 0, 1));
        }
      }
    }
    return fixedAt(mid);
  }

  function fixedAt(mid) {
    if (!marks.length) return hex('#17181a');
    if (mid <= marks[0].y) return marks[0].rgb;
    const last = marks[marks.length - 1];
    if (mid >= last.y) return last.rgb;
    let i = 0;
    while (i < marks.length - 2 && marks[i + 1].y < mid) i += 1;
    const a = marks[i], b = marks[i + 1];
    const t = clamp((mid - a.y) / Math.max(b.y - a.y, 1), 0, 1);
    // smoothstep, so a stop is arrived at rather than run into
    return mix(a.rgb, b.rgb, t * t * (3 - 2 * t));
  }

  const srgb = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const lum = (c) => 0.2126 * srgb(c[0]) + 0.7152 * srgb(c[1]) + 0.0722 * srgb(c[2]);

  let litState = false;
  let cur = hex('#17181a');
  let last = performance.now();
  const paint = () => {
    const now = performance.now();
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    const mid = window.scrollY + window.innerHeight * 0.5;
    const want = targetAt(mid);
    cur = [0, 1, 2].map((i) => damp(cur[i], want[i], 4.5, dt));
    root.style.setProperty('--page-bg',
      `rgb(${cur[0].toFixed(1)} ${cur[1].toFixed(1)} ${cur[2].toFixed(1)})`);
    /* A gold this bright will not carry light text, so the few things that
       sit directly on the ground turn their ink over instead. Hysteresis,
       or the class chatters for a whole screen at the crossing point. */
    const y = lum(cur);
    if (!litState && y > 0.20) litState = true;
    else if (litState && y < 0.15) litState = false;
    document.body.classList.toggle('ground-lit', litState);
  };
  paint();
  gsap.ticker.add(paint);

  return { measure };
}
