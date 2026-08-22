/* journey.js — orchestration of the index page.
   Act I: the Mikey wordmark, its letters full of film, slides off west.
   Acts II to V: the story film itself, decoded to frames at build time
   and scrubbed by scroll — the council, the vortex, the spirit animals,
   the savannah, the masks, and the long push into the oracle, all baked
   into pixels so nothing can glitch.
   Act VI: the film's last frame (the oracle's lit gaze under the moon)
   holds beneath the reading while the ink breathes in and three cards
   rise into the light she is looking through. */

import { clamp, damp, seg, easeInOut, qs, qsa, IS_MOBILE, REDUCED_MOTION, PARAMS } from './util.js';
import { FrameScrubber } from './sequence.js';
import { audio } from './audio.js';

/* the film, decoded at build time (ffmpeg, 12fps from WebsiteJourneyUpscale.mkv,
   through a centred 16:9 window out of its 2.32:1 master) */
const FRAMES = { dir: 'video/header/frames', dirMobile: 'video/header/frames-720', count: 317 };
const FIRST_CHUNK = 48;            // the threshold gates on these; the rest stream in behind

/* scroll choreography across the journey's sticky travel */
const VEIL = [0.03, 0.135];        // the wordmark opens and the film comes through it
const SCRUB = [0.115, 0.965];      // the film plays; the last band holds the oracle
const ROLES_OUT = [0.006, 0.042];  // the roles line dissolves at first scroll
const OPEN_ZOOM = 15;              // how far the letterforms widen before they clear
const PUSH_IN = 0.055;             // the film sits a touch large and settles as you enter

/* keyboard beats: the film's own moments (the council, the vortex, the
   savannah, the masks, the torches, the oracle) as journey progress. No
   scroll snapping here: the scrub runs free, the way the film chamber does. */
const BEATS = [0, 0.115, 0.36, 0.49, 0.67, 0.82, 1];

/* Act VI: the reading. The oracle's face gives up the wordmark, which
   blooms out of her own light, settles into a painted panel, and is then
   divided in three. Each column turns on its axis and the card that was
   always standing behind it comes into the room. */
const INK_IN       = [0, 0.07];      // the room dims over her lit gaze
const SEGUE_BLOOM  = [0.05, 0.18];   // the wordmark screens out of her light
const SEGUE_SOLID  = [0.15, 0.26];   // the panel lands opaque
const SEGUE_GROW   = [0.24, 0.35];   // the panel grows until it owns the room
const SEGUE_OUT    = [0.355, 0.385]; // the triptych takes it over, invisibly
const TRI_IN       = 0.35;
/* one turn per column, each waiting for the last to finish */
const TRI_FLIPS = [[0.40, 0.55], [0.55, 0.70], [0.70, 0.85]];

/* the card behind each column comes forward as its panel opens, and steps
   back when its neighbour's turn comes; by the end the three stand level */
const READING_BANDS = [
  { in: [0.44, 0.56], out: [0.60, 0.70] },
  { in: [0.59, 0.71], out: [0.75, 0.85] },
  { in: [0.74, 0.86], out: [0.92, 1.0] },
];
const READING_CARD_BEATS = [0.48, 0.63, 0.78];
const READING_BEATS = [0, 0.26, ...READING_CARD_BEATS, 1];

/* Audio: the bed follows the film's own weather. It opens on ground and
   firelight because the council is already lit; the trance lifts it into
   air and water; the savannah puts it back on the earth; the masks and
   the torches burn it down to fire. The steps are deliberate and the
   shorter easing in audio.js lets each shift land like a cut. */
const MIX = {
  act1:    { sky: 0.10, sea: 0.00, earth: 0.46, fire: 0.34 },  // the council under the gold moon
  act2:    { sky: 0.42, sea: 0.38, earth: 0.06, fire: 0.00 },  // the vortex; animals in blue light
  act3:    { sky: 0.16, sea: 0.10, earth: 0.52, fire: 0.10 },  // the savannah, the feeding
  act4:    { sky: 0.06, sea: 0.00, earth: 0.34, fire: 0.42 },  // the masks, the beast head
  act5:    { sky: 0.00, sea: 0.00, earth: 0.30, fire: 0.55 },  // torches lit, the oracle
  reading: { sky: 0.00, sea: 0.00, earth: 0.28, fire: 0.30 },
  film:    { sky: 0.00, sea: 0.08, earth: 0.00, fire: 0.20 },  // chamber i: embers
  writing: { sky: 0.18, sea: 0.00, earth: 0.06, fire: 0.00 },  // chamber ii: thin air
  design:  { sky: 0.06, sea: 0.00, earth: 0.20, fire: 0.00 },  // chamber iii: ground
  coding:  { sea: 0.15, fire: 0.00, sky: 0.25, earth: 0.00 },
  outro:   { sea: 0.00, fire: 0.00, sky: 0.00, earth: 0.00 },
};
const mixAt = (p) => {
  if (p < 0.36) return MIX.act1;   // the council under the gold moon
  if (p < 0.49) return MIX.act2;   // the vortex; the animals in blue light
  if (p < 0.67) return MIX.act3;   // the savannah, the feeding
  if (p < 0.82) return MIX.act4;   // the masks
  return MIX.act5;                 // the torches, the oracle
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
  const preloadDone = scrubber.preload((p) => { if (p * FRAMES.count >= FIRST_CHUNK) chunkDone(); })
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
  const segueBloom = qs('#segue .is-bloom');
  const segueSolid = qs('#segue .is-solid');
  const triptych = qs('#triptych');
  const triInners = qsa('#triptych .tri-inner');
  const heroCanvas = qs('#hero-canvas');

  /* The segue and the triptych have to agree to the pixel, so both are laid
     out from the same measured box rather than from viewport units: 100vw
     counts the scrollbar and a sticky child does not, and that difference
     alone is enough to make the handover visible as a jump. */
  const SEGUE_AR = 4900 / 2108;
  let growTo = 1;
  const measureSegue = () => {
    if (!triptych || !segueSolid) return;
    const cw = triptych.clientWidth;
    const ch = triptych.clientHeight;
    const cover = Math.max(cw, ch * SEGUE_AR);
    triptych.style.setProperty('--iw', `${cover}px`);
    triptych.style.setProperty('--x0', `${(cw - cover) / 2}px`);
    triptych.style.setProperty('--colw', `${cw / 3}px`);
    // the plate's own unscaled width, read back with any scale divided out
    const scale = +segueSolid.style.getPropertyValue('--grow') || 1;
    const natural = segueSolid.getBoundingClientRect().width / scale;
    growTo = natural > 0 ? cover / natural : 1;
  };
  const segueGrowTo = () => growTo;
  measureSegue();
  addEventListener('resize', measureSegue);

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

    /* The wordmark opens rather than leaving. Its letterforms are holes in
       the plate, so widening the mask widens the holes: the strokes travel
       outward past the edge of the frame and the film arrives through the
       word. The plate fades over the back half so the exit is clean no
       matter which counter the centre lands in. */
    const v = seg(p, VEIL[0], VEIL[1], easeInOut);
    const veilGone = v >= 1;
    veil.style.display = veilGone ? 'none' : '';
    if (veilGone) {
      veil.style.opacity = '0';      // never come back holding a stale value
    } else {
      // held still, the word breathes; once it goes, it rushes
      const idle = REDUCED_MOTION ? 0 : Math.sin(now * 0.0011) * 0.004;
      const zoom = 1 + idle + (v * v) * OPEN_ZOOM;
      veil.style.setProperty('--mask-scale', zoom.toFixed(4));
      veil.style.opacity = (1 - seg(v, 0.62, 1)).toFixed(3);
      const fade = 1 - seg(p, ROLES_OUT[0], ROLES_OUT[1]);
      if (roles) roles.style.opacity = fade.toFixed(3);
      if (hint) hint.style.opacity = fade.toFixed(3);
    }
    /* the film sits fractionally large behind the word and settles as the
       word opens: the frame you fall into meets you halfway */
    if (heroCanvas && !REDUCED_MOTION) {
      heroCanvas.style.transform = `scale(${(1 + PUSH_IN * (1 - v)).toFixed(4)})`;
    }

    /* the film under the scroll; past the end it lands exactly on the
       offering so the seam into the reading is pixel-identical */
    scrubber.setProgress(seg(p, SCRUB[0], SCRUB[1]));
    if (p > 0.975) scrubber.progress = scrubber.target;
    scrubber.tick(dt);

    if (!cardEls.length) cardEls = qsa('#card-table .card');

    /* the room dims over her lit gaze as the reading takes the frame */
    if (groundInk) groundInk.style.opacity = seg(readingP, INK_IN[0], INK_IN[1]).toFixed(3);

    /* the segue: screen first, so the wordmark is lit by her and not laid
       on top of her; then the solid copy lands it; then the triptych takes
       the panel over at identical geometry, which reads as no change at all */
    if (segueBloom) {
      const handover = seg(readingP, SEGUE_OUT[0], SEGUE_OUT[1]);
      const bloom = seg(readingP, SEGUE_BLOOM[0], SEGUE_BLOOM[1]);
      const solid = seg(readingP, SEGUE_SOLID[0], SEGUE_SOLID[1]);
      segueBloom.style.opacity = (bloom * (1 - handover)).toFixed(3);
      segueSolid.style.opacity = (solid * (1 - handover)).toFixed(3);
      /* the plate grows from its frame to exactly the width the triptych
         reassembles, so when one hands over to the other nothing moves */
      const grow = 1 + (segueGrowTo() - 1) * seg(readingP, SEGUE_GROW[0], SEGUE_GROW[1], easeInOut);
      segueBloom.style.setProperty('--grow', grow.toFixed(4));
      segueSolid.style.setProperty('--grow', grow.toFixed(4));
    }
    if (triptych) {
      const live = readingP >= TRI_IN - 0.001 && readingP < 0.995;
      triptych.classList.toggle('is-live', live);
      if (live) {
        triInners.forEach((el, i) => {
          const t = seg(readingP, TRI_FLIPS[i][0], TRI_FLIPS[i][1], easeInOut);
          // the board leans out toward the room as it turns, then lies back
          const lean = Math.sin(t * Math.PI);
          el.style.setProperty('--turn', `${(-180 * t).toFixed(2)}deg`);
          el.style.setProperty('--z', `${(lean * 90).toFixed(1)}px`);
          // the card behind turns with its panel, a little later, so the
          // glyph is arriving just as the painting finishes getting out of
          // the way. Same band, eased late; scrubbed, so it reverses.
          const card = cardEls[i];
          if (card) {
            const ct = clamp((t - 0.3) / 0.7, 0, 1);
            card.querySelector('.card-3d')
              ?.style.setProperty('--turn', `${(180 * ct).toFixed(2)}deg`);
            card.classList.toggle('is-turned', ct > 0.5);
          }
        });
      }
    }

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
    if (probe('#design')) return MIX.design;
    if (probe('#writing')) return MIX.writing;
    if (probe('#film')) return MIX.film;
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
    // document-absolute top: offsetTop lies for elements inside a
    // positioned section, the rect never does
    const docTop = (el) => el.getBoundingClientRect().top + window.scrollY;
    const film = qs('#film');
    if (film) pts.push(docTop(film));
    const pin = qs('#cube-pin');
    if (pin) {
      // the cube's four dwells: one beat per fronted face
      const cLen = pin.offsetHeight - window.innerHeight;
      for (const b of [0, 0.255, 0.505, 0.755]) pts.push(docTop(pin) + b * cLen);
    }
    const design = qs('#design');
    if (design) pts.push(docTop(design));
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

  /* Deep links land inside the journey: the old chamber URLs redirect
     here with a hash, and the reading link lands past the ink-in so the
     table is already lit and wide. Returns false on an unknown hash so
     the caller can fall back to the top. */
  function landTo(hash) {
    const spots = {
      '#reading': () => {
        const r = qs('#reading-wrap');
        return r.offsetTop + (r.offsetHeight - window.innerHeight) * INK_IN[1];
      },
      '#film':    () => qs('#film')?.offsetTop,
      '#writing': () => qs('#writing')?.offsetTop,
      '#design':  () => qs('#design')?.offsetTop,
    };
    const y = spots[hash]?.();
    if (y == null) return false;
    lenis.scrollTo(y, { immediate: true });
    ScrollTrigger.refresh();
    return true;
  }

  return { lenis, scrubber, firstChunk, preloadDone, landTo };
}
