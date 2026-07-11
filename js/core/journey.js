/* journey.js — orchestration of the index page.
   Act I: the Mikey wordmark, its letters full of film, slides off west.
   Acts II to V: the story film itself, decoded to frames at build time
   and scrubbed by scroll — the whole world-building push-in baked into
   pixels, so nothing can glitch.
   Act VI: the film's last frame (the goddess offering her open hands)
   holds beneath the reading while the ink breathes in and her three
   cards rise out of her palms onto the table. */

import { clamp, damp, seg, easeInOut, qs, qsa, IS_MOBILE, REDUCED_MOTION, PARAMS } from './util.js';
import { FrameScrubber } from './sequence.js';
import { audio } from './audio.js';

/* the film, decoded at build time (ffmpeg, 12fps from mainheader.mp4) */
const FRAMES = { dir: 'video/header/frames', dirMobile: 'video/header/frames-720', count: 257 };
const FIRST_CHUNK = 48;            // the threshold gates on these; the rest stream in behind

/* scroll choreography across the journey's sticky travel */
const VEIL = [0.02, 0.115];        // the wordmark plate slides off left
const SCRUB = [0.115, 0.965];      // the film plays; the last band holds the offering
const ROLES_OUT = [0.015, 0.06];   // the roles line dissolves at first scroll

/* keyboard beats: the film's own moments (owl, cosmos, tower, goddess,
   the cards, the offering) as journey progress. No scroll snapping here:
   the scrub runs free, the way the film chamber does. */
const BEATS = [0, 0.115, 0.30, 0.49, 0.67, 0.85, 1];

/* Act VI: the reading walks its three cards one by one. Each band lifts
   a card while its siblings step back; the beats are the band centres. */
const READING_BANDS = [
  { in: [0.10, 0.22], out: [0.34, 0.44] },
  { in: [0.36, 0.46], out: [0.58, 0.68] },
  { in: [0.60, 0.70], out: [0.82, 0.92] },
];
const READING_CARD_BEATS = [0.28, 0.52, 0.76];
const READING_BEATS = [0, ...READING_CARD_BEATS, 1];
const INK_IN = [0, 0.09];          // the room dims over the offered hands

/* Audio: spacey in the void, air and water through the cosmos, earth
   and fire as the goddess and her reading near. The steps are deliberate
   and the shorter easing in audio.js lets each shift land like a cut. */
const MIX = {
  act1:    { sky: 0.55, sea: 0.12, earth: 0.00, fire: 0.00 },  // the owl in the void
  act2:    { sky: 0.38, sea: 0.45, earth: 0.00, fire: 0.00 },  // the cosmos: air and water
  act3:    { sky: 0.15, sea: 0.30, earth: 0.42, fire: 0.06 },  // the tower: land nears
  act4:    { sky: 0.05, sea: 0.10, earth: 0.50, fire: 0.28 },  // the goddess rises
  act5:    { sky: 0.00, sea: 0.00, earth: 0.35, fire: 0.50 },  // the cards, the offering
  reading: { sky: 0.00, sea: 0.00, earth: 0.28, fire: 0.30 },
  coding:  { sea: 0.15, fire: 0.00, sky: 0.25, earth: 0.00 },
  outro:   { sea: 0.00, fire: 0.00, sky: 0.00, earth: 0.00 },
};
const mixAt = (p) => {
  if (p < 0.22) return MIX.act1;   // the owl in the void
  if (p < 0.43) return MIX.act2;   // the cosmos
  if (p < 0.57) return MIX.act3;   // the tower under red moons
  if (p < 0.81) return MIX.act4;   // the goddess rises
  return MIX.act5;                 // the cards, the offering
};

export function initJourney() {
  const lenis = new Lenis({
    lerp: window.matchMedia('(pointer: coarse)').matches ? 0.12 : 0.09,
    smoothWheel: true,
  });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  window.__lenis = lenis;

  /* ---- the film: one canvas full-bleed, one small canvas in the letters ---- */
  const scrubber = new FrameScrubber(qs('#hero-canvas'), {
    dir: IS_MOBILE ? FRAMES.dirMobile : FRAMES.dir,
    count: FRAMES.count,
  });
  let chunkDone;
  const firstChunk = new Promise((r) => { chunkDone = r; });
  scrubber.preload((p) => { if (p * FRAMES.count >= FIRST_CHUNK) chunkDone(); })
    .then(() => { chunkDone(); scrubber.draw(true); });

  /* the veil is a stencil: its letter-holes are cut in CSS (mask-composite),
     so the film behind needs no second canvas and never moves with the plate */
  const veil = qs('#logo-veil');
  const roles = qs('.hero-roles');
  const hint = qs('.hero-hint');

  /* ---- the seam: the reading's ground carries the film's final frame ---- */
  const groundFrame = qs('#ground-frame');
  if (groundFrame) {
    const dir = IS_MOBILE ? FRAMES.dirMobile : FRAMES.dir;
    groundFrame.src = `${dir}/f_${String(FRAMES.count).padStart(4, '0')}.webp`;
  }
  const groundInk = qs('#reading-ground .ground-ink');

  if (PARAMS.has('dbg')) {
    window.__dbg = { scrubber, VEIL, SCRUB, BEATS, READING_BANDS, seg, easeInOut };
  }

  /* the Reading: the pool of light drifts after the visitor's hand */
  const readingEl = qs('#reading');
  let lightX = 50, lightY = 46, lightTX = 50, lightTY = 46;
  readingEl?.addEventListener('pointermove', (e) => {
    const r = readingEl.getBoundingClientRect();
    lightTX = clamp((e.clientX - r.left) / r.width * 100, 0, 100);
    lightTY = clamp((e.clientY - r.top) / r.height * 100, 0, 100);
  }, { passive: true });

  /* the journey scrub runs free: no snapping, the film chamber's feel */
  let progress = 0;
  ScrollTrigger.create({
    trigger: '#journey',
    start: 'top top',
    end: 'bottom bottom',
    scrub: true,
    onUpdate: (self) => { progress = self.progress; },
  });

  /* the reading's own scrub: one band per card, snap per card */
  let readingP = 0;
  let cardEls = [];
  ScrollTrigger.create({
    trigger: '#reading-wrap',
    start: 'top top',
    end: 'bottom bottom',
    scrub: true,
    snap: (PARAMS.get('autoscroll') === 'off' || REDUCED_MOTION) ? undefined : {
      snapTo: (value) => {
        let best = value, dist = 0.045;
        for (const b of READING_BEATS) {
          const d = Math.abs(value - b);
          if (d < dist) { best = b; dist = d; }
        }
        return best;
      },
      duration: { min: 0.4, max: 0.9 },
      ease: 'power2.inOut',
      delay: 0.15,
    },
    onUpdate: (self) => { readingP = self.progress; },
  });

  /* the loop gate: the film's first frame returns behind the plate as it
     slides back in from the east; at rest the view equals the top of the
     page, and the scroll quietly teleports home */
  const gatePlate = qs('#gate-plate');
  const gateCanvas = qs('#gate-canvas');
  const gctx = gateCanvas ? gateCanvas.getContext('2d') : null;
  let gateP = 0, gatePainted = false, looping = false;
  const sizeGate = () => {
    if (!gateCanvas) return;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    gateCanvas.width = gateCanvas.clientWidth * dpr;
    gateCanvas.height = gateCanvas.clientHeight * dpr;
    gatePainted = false;
  };
  if (gateCanvas) { sizeGate(); addEventListener('resize', sizeGate); }
  const paintGate = () => {
    const img = scrubber.images[0];
    if (gatePainted || !gctx || !img || !img.naturalWidth) return;
    const cw = gateCanvas.width, ch = gateCanvas.height;
    const s = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
    const w = img.naturalWidth * s, h = img.naturalHeight * s;
    gctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
    gatePainted = true;
  };
  if (gatePlate) {
    ScrollTrigger.create({
      trigger: '#loop-gate',
      start: 'top top',
      end: 'bottom bottom',
      scrub: true,
      onUpdate: (self) => { gateP = self.progress; },
    });
  }

  /* the paper room: the fixed chrome flips while Vibe-Coding owns the frame */
  ScrollTrigger.create({
    trigger: '#fourth-door',
    start: 'top 45%',
    end: 'bottom 55%',
    onToggle: (self) => document.body.classList.toggle('mode-light', self.isActive),
  });

  /* ---- per-frame render ---- */
  const stageEl = qs('#journey .stage');
  let sVel = 0;
  let lastNow = performance.now();
  gsap.ticker.add(() => {
    const now = performance.now();
    const dt = Math.min((now - lastNow) / 1000, 0.1);
    lastNow = now;
    const p = progress;

    /* the invisible cut: once the reading's ground has pinned (showing the
       same offered-hands frame), the stage steps aside behind it */
    if (stageEl) stageEl.style.visibility = readingP > 0.0001 ? 'hidden' : '';

    /* velocity warp on the stage: scroll momentum stretches and shears,
       the same dialect the film chamber's banners speak */
    if (!REDUCED_MOTION && stageEl) {
      sVel = damp(sVel, lenis.velocity || 0, 8, dt);
      const stretch = clamp(Math.abs(sVel) * 0.0011, 0, 0.038);
      const shear = clamp(sVel * 0.045, -1.4, 1.4);
      stageEl.style.transform =
        `scaleY(${(1 + stretch).toFixed(4)}) skewX(${shear.toFixed(3)}deg)`;
    }

    /* the wordmark plate slides off west; its letters keep the film alive */
    const v = seg(p, VEIL[0], VEIL[1], easeInOut);
    const veilGone = v >= 1;
    veil.style.display = veilGone ? 'none' : '';
    if (!veilGone) {
      veil.style.transform = `translate3d(${(-112 * v).toFixed(3)}%, 0, 0)`;
      const fade = 1 - seg(p, ROLES_OUT[0], ROLES_OUT[1]);
      if (roles) roles.style.opacity = fade.toFixed(3);
      if (hint) hint.style.opacity = fade.toFixed(3);
    }

    /* the film under the scroll; past the end it lands exactly on the
       offering so the seam into the reading is pixel-identical */
    scrubber.setProgress(seg(p, SCRUB[0], SCRUB[1]));
    if (p > 0.975) scrubber.progress = scrubber.target;
    scrubber.tick(dt);

    /* the room dims over the offered hands as the reading takes the frame */
    if (groundInk) groundInk.style.opacity = seg(readingP, INK_IN[0], INK_IN[1]).toFixed(3);

    /* the table only materialises at the seam, so the film's own cards
       never share the frame with the real ones; the window opens just as
       the deal fires (top 15%), so her cards are seen rising, not risen */
    if (readingEl) {
      const rr = readingEl.getBoundingClientRect();
      const rise = 1 - clamp(rr.top / window.innerHeight, 0, 1);
      const reveal = seg(rise, 0.82, 0.96);
      readingEl.style.opacity = reveal.toFixed(3);
      readingEl.style.pointerEvents = reveal > 0.5 ? '' : 'none';
    }

    /* the loop gate: world back first, then the plate; then home */
    if (gatePlate) {
      paintGate();
      gateCanvas.style.opacity = seg(gateP, 0.05, 0.3).toFixed(3);
      const gx = 112 - 112 * seg(gateP, 0.3, 0.85, easeInOut);
      gatePlate.style.transform = `translate3d(${gx.toFixed(3)}%, 0, 0)`;
      if (gateP >= 0.985 && !looping) {
        looping = true;
        scrubber.progress = 0; scrubber.target = 0; scrubber.draw(true);
        lenis.scrollTo(0, { immediate: true });
        ScrollTrigger.update();
        setTimeout(() => { looping = false; }, 300);
      }
    }

    /* the reading's pool of light follows, dreamily late */
    if (readingEl) {
      lightX = damp(lightX, lightTX, 5, dt);
      lightY = damp(lightY, lightTY, 5, dt);
      readingEl.style.setProperty('--mx', `${lightX.toFixed(2)}%`);
      readingEl.style.setProperty('--my', `${lightY.toFixed(2)}%`);
    }

    /* card focus: the vars live on .card-3d so the deal (GSAP owns .card)
       and the hover tilt keep their own lanes */
    if (!cardEls.length) cardEls = qsa('#card-table .card');
    if (cardEls.length) {
      const fs = READING_BANDS.map((b) =>
        seg(readingP, b.in[0], b.in[1]) * (1 - seg(readingP, b.out[0], b.out[1])));
      const F = Math.max(...fs);
      cardEls.forEach((el, i) => {
        const fi = fs[i] ?? 0;
        const back = F - fi;             // how far this card stands behind the chosen one
        const inner = el.querySelector('.card-3d');
        inner.style.setProperty('--fs', (1 + 0.24 * fi - 0.08 * back).toFixed(4));
        inner.style.setProperty('--fy', `${(-3.2 * fi).toFixed(2)}vh`);
        inner.style.opacity = (1 - 0.5 * back).toFixed(3);
        inner.style.filter = back > 0.001 ? `brightness(${(1 - 0.32 * back).toFixed(3)})` : '';
        el.classList.toggle('is-focus', fi > 0.5);
      });
    }

    /* audio: the film's moments, then the page sections below */
    if (audio.started) {
      const rest = sectionProgress();
      audio.setMix(rest || mixAt(p));
    }
  });

  /* Which post-journey section owns the viewport (for the audio mix)? */
  function sectionProgress() {
    const vh = window.innerHeight;
    const probe = (id) => {
      const el = qs(id);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return r.top < vh * 0.5 && r.bottom > vh * 0.5 ? r : null;
    };
    if (probe('#loop-gate')) return MIX.outro;
    if (probe('#outro')) return MIX.outro;
    if (probe('#fourth-door')) return MIX.coding;
    if (probe('#reading-wrap')) return MIX.reading;
    return null;
  }

  /* ---- keyboard: arrows step between beats; the mysterious register
     keeps its usability underneath ---- */
  const beatPositions = () => {
    const j = qs('#journey');
    const jTop = j.offsetTop;
    const jLen = j.offsetHeight - window.innerHeight;
    const pts = BEATS.map((b) => jTop + b * jLen);
    const reading = qs('#reading-wrap');
    if (reading) {
      const rLen = reading.offsetHeight - window.innerHeight;
      for (const b of READING_CARD_BEATS) pts.push(reading.offsetTop + b * rLen);
    }
    const fourth = qs('#fourth-door');
    if (fourth) pts.push(fourth.offsetTop - window.innerHeight * 0.1);
    const outro = qs('#outro');
    if (outro) pts.push(outro.offsetTop);
    const gate = qs('#loop-gate');
    if (gate) pts.push(gate.offsetTop + (gate.offsetHeight - window.innerHeight) * 0.95);
    return pts;
  };
  window.addEventListener('keydown', (e) => {
    if (e.target.closest('input, textarea, [contenteditable]')) return;
    if (!['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp'].includes(e.key)) return;
    e.preventDefault();
    const pts = beatPositions();
    const y = window.scrollY;
    const fwd = e.key === 'ArrowDown' || e.key === 'PageDown';
    const next = fwd
      ? pts.find((pt) => pt > y + 4)
      : [...pts].reverse().find((pt) => pt < y - 4);
    if (next !== undefined) lenis.scrollTo(next, { duration: 1.1, easing: easeInOut });
  });

  /* Returning from a chamber lands on the Reading, never back at Act 0.
     Land past the ink-in so the table is already lit and wide. */
  if (location.hash === '#reading' || sessionStorage.getItem('mw-return') === '1') {
    sessionStorage.removeItem('mw-return');
    requestAnimationFrame(() => {
      const reading = qs('#reading-wrap');
      if (reading) {
        const travel = reading.offsetHeight - window.innerHeight;
        lenis.scrollTo(reading.offsetTop + travel * INK_IN[1], { immediate: true });
        ScrollTrigger.refresh();
      }
    });
  }

  return { lenis, scrubber, firstChunk };
}
