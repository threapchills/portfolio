/* journey.js — orchestration of the index page.
   The page opens on the showreel (prologue.js), and the paper of kind
   words and the CV slides over it. When the paper lifts, the oracle is
   already behind it: the last seconds of the council film scrub under the
   scroll, his eyes kindle, and the reading begins. The wordmark blooms out
   of his light, the panel divides in three, and the three cards that were
   standing behind it turn: film, writing, design.
   The full council film is now the page's coda, after the work and the
   outro, and it plays backwards: the paper lifts off the oracle's gaze,
   the masks, the savannah, the spirit animals and the vortex unwind to
   the council, and the Mikey wordmark closes round it. The film inside
   the letters then turns to liquid chrome in place, the same letterforms
   to the pixel, and the page goes dark and begins again at the reel. */

import { clamp, damp, seg, easeInOut, qs, qsa, IS_MOBILE, REDUCED_MOTION, PARAMS } from './util.js';
import { FrameScrubber } from './sequence.js';
import { audio } from './audio.js';

/* the film, decoded at build time (ffmpeg, 12fps from WebsiteJourneyUpscale.mkv,
   through a centred 16:9 window out of its 2.32:1 master) */
const FRAMES = { dir: 'video/header/frames', dirMobile: 'video/header/frames-720', count: 317 };

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
/* the reading now opens on its own: the paper lifts off the oracle while
   the film's last seconds scrub beneath it (the torches catch, his eyes
   kindle), and only then does the old choreography run, on the remainder */
const WAKE = 0.15;                       // share of the reading spent waking him
const WAKE_FRAMES = [258, 316];          // 0-based frames: torches lit, to the gaze
const INK_IN       = [0, 0.07];      // the room dims over her lit gaze
const SEGUE_BLOOM  = [0.05, 0.18];   // the wordmark screens out of her light
const SEGUE_SOLID  = [0.15, 0.26];   // the panel lands opaque
const SEGUE_OUT    = [0.355, 0.385]; // the triptych takes it over, invisibly
const TRI_IN       = 0.35;
const TABLE_IN     = [0.30, 0.34];   // the table is laid under the covering plate
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
const atWake = (b) => WAKE + b * (1 - WAKE);   // choreography time to section time
const READING_BEATS = [0, WAKE, ...[0.26, ...READING_CARD_BEATS, 1].map(atWake)];

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
  chrome:  { sky: 0.16, sea: 0.00, earth: 0.00, fire: 0.00 },  // the mark: thin, cold air
  outro:   { sea: 0.00, fire: 0.00, sky: 0.00, earth: 0.00 },
  prologue:{ sky: 0.12, sea: 0.06, earth: 0.16, fire: 0.05 },  // the reel and the paper: a low bed
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

  /* the veil is a stencil: its letter-holes are cut in CSS (mask-composite),
     so the film behind needs no second canvas and never moves with the plate */
  const veil = qs('#logo-veil');
  const roles = qs('.hero-roles');
  const hint = qs('.hero-hint');

  /* ---- the reading's ground: the film's last seconds, his to wake in.
     It shares the journey's frames (one download serves both) and lands
     on the final frame, which is the geometry the segue plate was painted
     to match. ---- */
  const groundCanvas = qs('#ground-canvas');
  const gctxR = groundCanvas ? groundCanvas.getContext('2d') : null;
  let wakeOk = false, wakeIdx = -1, wakeP = 0;
  const sizeWake = () => {
    if (!groundCanvas) return;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    groundCanvas.width = groundCanvas.clientWidth * dpr;
    groundCanvas.height = groundCanvas.clientHeight * dpr;
    wakeIdx = -1;
  };
  sizeWake();
  addEventListener('resize', sizeWake);
  const drawWake = (t) => {
    if (!wakeOk || !gctxR) return;
    const i = Math.round(WAKE_FRAMES[0] + t * (WAKE_FRAMES[1] - WAKE_FRAMES[0]));
    if (i === wakeIdx) return;
    const img = scrubber.images[i];
    if (!img || !img.naturalWidth) return;
    wakeIdx = i;
    const cw = groundCanvas.width, ch = groundCanvas.height;
    const s = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
    const w = img.naturalWidth * s, h = img.naturalHeight * s;
    gctxR.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
  };
  const wakeReady = () => { wakeOk = true; wakeIdx = -1; drawWake(wakeP); };
  let chromeApi = null;
  const chromeStage = qs('#chrome-stage');
  const chromeLine = qs('.chrome-line');
  const useChrome = (api) => { chromeApi = api; };
  const readingIntro = qs('.reading-intro');
  const readingHint = qs('.reading-hint');
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
  const SEGUE_AR = 16 / 9;   // the shipped plate, rebaked from the 2.32:1 artwork
  const measureSegue = () => {
    if (!triptych) return;
    const cw = triptych.clientWidth;
    const ch = triptych.clientHeight;
    // a tall box sits the plate by width instead of covering, so the
    // wordmark survives; the triptych has to reassemble the same way
    const cover = cw >= ch ? Math.max(cw, ch * SEGUE_AR) : cw;
    triptych.style.setProperty('--iw', `${cover}px`);
    triptych.style.setProperty('--x0', `${(cw - cover) / 2}px`);
    triptych.style.setProperty('--colw', `${cw / 3}px`);
  };
  measureSegue();
  addEventListener('resize', measureSegue);

  if (PARAMS.has('dbg')) {
    window.__dbg = {
      scrubber, VEIL, SCRUB, BEATS, READING_BANDS, seg, easeInOut,
      loopState: () => ({ ready: loopReady, looping }),
      arm: () => { loopReady = true; },
    };
  }

  /* the Reading: the pool of light drifts after the visitor's hand */
  const readingEl = qs('#reading');
  let lightX = 50, lightY = 46, lightTX = 50, lightTY = 46;
  readingEl?.addEventListener('pointermove', (e) => {
    const r = readingEl.getBoundingClientRect();
    lightTX = clamp((e.clientX - r.left) / r.width * 100, 0, 100);
    lightTY = clamp((e.clientY - r.top) / r.height * 100, 0, 100);
  }, { passive: true });

  /* the coda's scrub runs free: no snapping, the film chamber's feel. It
     starts once the outro's paper has lifted clear of the stage (the
     section climbs a screen under the outro), so the oracle holds while
     the paper goes. */
  let progress = 0;
  ScrollTrigger.create({
    trigger: '#journey',
    start: 'top -100%',
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

  /* the loop gate: past the mark the page goes dark, and at the bottom of
     the dark the scroll quietly returns to the reel, which plays its
     opening again. Forward only: an upward flick at the top of a portfolio
     should never fling a visitor to its end. It stays shut until the page
     has fully loaded, because there is nothing to return to before then. */
  let loopReady = false;
  const openLoop = () => { loopReady = true; };
  addEventListener('load', () => setTimeout(openLoop, 6000));
  const loopHandlers = [];
  const onLoop = (fn) => loopHandlers.push(fn);
  const gatePlate = qs('#gate-plate');
  const gateLine = qs('.gate-line');
  const doorVeil = qs('#doorway-veil');
  let gateP = 0, looping = false;
  if (gatePlate) {
    ScrollTrigger.create({
      trigger: '#loop-gate',
      start: 'top top',
      end: 'bottom bottom',
      scrub: true,
      onUpdate: (self) => { gateP = self.progress; },
    });
  }
  function loopHome() {
    looping = true;
    gsap.set(doorVeil, { opacity: 1 });
    lenis.scrollTo(0, { immediate: true });
    ScrollTrigger.update();
    loopHandlers.forEach((fn) => fn());
    gsap.to(doorVeil, { opacity: 0, duration: 1.1, delay: 0.25, ease: 'power2.out',
      onComplete: () => { looping = false; } });
  }

  /* the paper room: the fixed chrome flips while Vibe-Coding owns the frame */
  ScrollTrigger.create({
    trigger: '#fourth-door',
    endTrigger: '#outro',
    start: 'top 45%',
    end: 'bottom 6%',
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
    // film time runs backwards against the scroll: 1 is the oracle's gaze,
    // 0 the council inside the closed wordmark
    const p = 1 - progress;


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
    if (p > 0.975 || p < 0.1) scrubber.progress = scrubber.target;

    /* the closed word turns to metal: the chrome is masked by the same
       alpha the stencil punches its holes with, at the same size and
       centre, so the film in the letters simply becomes chrome */
    if (chromeApi) {
      const cm = seg(progress, 0.955, 0.992, easeInOut);
      if (chromeStage) chromeStage.style.opacity = cm.toFixed(3);
      if (chromeLine) chromeLine.style.opacity = (seg(progress, 0.985, 1) * 0.55).toFixed(3);
      chromeApi.setActive?.(cm > 0.001);
      chromeApi.warm(seg(progress, 0.96, 1) * (1 - gateP));
    }
    scrubber.tick(dt);

    if (!cardEls.length) cardEls = qsa('#card-table .card');

    /* the oracle wakes as the paper lifts off him; rp is the old reading's
       own time, which starts once he is looking at you */
    wakeP = seg(readingP, 0, WAKE);
    drawWake(easeInOut(wakeP));
    const rp = seg(readingP, WAKE, 1);
    if (readingIntro) {
      const io = seg(readingP, WAKE * 0.3, WAKE * 0.75) * (1 - seg(rp, 0.015, 0.06));
      readingIntro.style.opacity = io.toFixed(3);
      readingIntro.style.transform = `translate3d(0, ${((1 - io) * 14).toFixed(2)}px, 0)`;
    }
    if (readingHint) readingHint.style.opacity = (seg(rp, 0.86, 0.96) * 0.75).toFixed(3);

    /* the room dims over his lit gaze as the reading takes the frame */
    if (groundInk) groundInk.style.opacity = seg(rp, INK_IN[0], INK_IN[1]).toFixed(3);

    /* the segue: screen first, so the wordmark is lit by her and not laid
       on top of her; then the solid copy lands it; then the triptych takes
       the panel over at identical geometry, which reads as no change at all */
    if (segueBloom) {
      const handover = seg(rp, SEGUE_OUT[0], SEGUE_OUT[1]);
      const bloom = seg(rp, SEGUE_BLOOM[0], SEGUE_BLOOM[1]);
      const solid = seg(rp, SEGUE_SOLID[0], SEGUE_SOLID[1]);
      segueBloom.style.opacity = (bloom * (1 - handover)).toFixed(3);
      segueSolid.style.opacity = (solid * (1 - handover)).toFixed(3);
    }
    if (triptych) {
      const live = rp >= TRI_IN - 0.001 && rp < 0.995;
      triptych.classList.toggle('is-live', live);
      if (live) {
        triInners.forEach((el, i) => {
          const t = seg(rp, TRI_FLIPS[i][0], TRI_FLIPS[i][1], easeInOut);
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

    /* The table comes up behind the segue, never in front of it. Its old
       rule keyed off its own rect rising into view, which under the new
       choreography meant three card backs sat on screen through the whole
       transition. It now rides the reading's own progress and crosses from
       nothing to laid entirely underneath the opaque plate, in the band
       between the plate covering the frame and the triptych taking over,
       so the cards are simply already there when a column opens. */
    if (readingEl) {
      const reveal = seg(rp, TABLE_IN[0], TABLE_IN[1]);
      readingEl.style.opacity = reveal.toFixed(3);
      readingEl.style.pointerEvents = reveal > 0.9 ? '' : 'none';
    }

    /* the loop gate: a line, then the dark, then home to the reel */
    if (gatePlate) {
      if (gateLine) gateLine.style.opacity = (seg(gateP, 0.08, 0.3) * (1 - seg(gateP, 0.55, 0.75))).toFixed(3);
      gatePlate.style.opacity = seg(gateP, 0.45, 0.9).toFixed(3);
      if (gateP >= 0.985 && !looping && loopReady) loopHome();
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
        seg(rp, b.in[0], b.in[1]) * (1 - seg(rp, b.out[0], b.out[1])));
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

    /* audio: each section keeps its own weather; the coda follows the film */
    if (audio.started) audio.setMix(sectionProgress(p));
  });

  /* Which section owns the viewport (for the audio mix)? */
  function sectionProgress(p) {
    const vh = window.innerHeight;
    const probe = (id) => {
      const el = qs(id);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return r.top < vh * 0.5 && r.bottom > vh * 0.5 ? r : null;
    };
    if (probe('#loop-gate')) return MIX.outro;
    if (probe('#journey')) return (1 - p) > 0.955 ? MIX.chrome : mixAt(p);
    if (probe('#outro')) return MIX.outro;
    if (probe('#fourth-door')) return MIX.coding;
    if (probe('#design')) return MIX.design;
    if (probe('#writing')) return MIX.writing;
    if (probe('#film')) return MIX.film;
    if (probe('#about') || probe('#proof') || probe('#prologue')) return MIX.prologue;
    if (probe('#reading-wrap')) return MIX.reading;
    return MIX.prologue;
  }

  const docTop = (el) => el.getBoundingClientRect().top + window.scrollY;
  const readingAt = (b) => {
    const r = qs('#reading-wrap');
    return docTop(r) + b * (r.offsetHeight - window.innerHeight);
  };

  /* ---- keyboard: arrows step between beats; the mysterious register
     keeps its usability underneath ---- */
  const beatPositions = () => {
    const pts = [0];
    for (const id of ['#proof', '#about']) { const el = qs(id); if (el) pts.push(docTop(el)); }
    if (qs('#reading-wrap')) {
      pts.push(readingAt(WAKE));
      for (const b of READING_CARD_BEATS) pts.push(readingAt(atWake(b)));
    }
    const scrub = qs('#scrub-wrap');
    if (scrub) pts.push(docTop(scrub));
    const rail = qs('#film-rail');
    if (rail) {
      // the rail in quarters, so the keys walk the films rather than skip them
      const len = rail.offsetHeight - window.innerHeight;
      for (const b of [0, 0.25, 0.5, 0.75, 1]) pts.push(docTop(rail) + b * len);
    }
    const pin = qs('#cube-pin');
    if (pin) {
      // the cube's four dwells: one beat per fronted face
      const cLen = pin.offsetHeight - window.innerHeight;
      for (const b of [0, 0.255, 0.505, 0.755]) pts.push(docTop(pin) + b * cLen);
    }
    const design = qs('#design');
    if (design) pts.push(docTop(design));
    const fourth = qs('#fourth-door');
    if (fourth) pts.push(docTop(fourth) - window.innerHeight * 0.1);
    const outro = qs('#outro');
    if (outro) pts.push(docTop(outro));
    const j = qs('#journey');
    if (j) {
      // the coda runs backwards, from a screen in (where the paper clears)
      const vh = window.innerHeight;
      const jLen = j.offsetHeight - 2 * vh;
      for (const b of [...BEATS].reverse()) pts.push(docTop(j) + vh + (1 - b) * jLen);
    }
    return [...new Set(pts.map(Math.round))].sort((a, b) => a - b);
  };
  window.addEventListener('keydown', (e) => {
    if (qs('#threshold') || qs('#reading-plane')?.classList.contains('is-open')) return;
    if (e.target.closest('input, textarea, video, [contenteditable]')) return;
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

  /* Deep links, the nav and the outro links all land here: the old
     chamber URLs redirect with a hash, and #reading lands where the three
     cards stand level and the table is wide. Unknown hashes return null. */
  function spotFor(hash) {
    const el = (sel) => { const e = qs(sel); return e ? docTop(e) : null; };
    const spots = {
      '': () => 0, '#': () => 0, '#top': () => 0, '#prologue': () => 0,
      '#proof': () => el('#proof'),
      '#about': () => el('#about'),
      '#reading': () => readingAt(atWake(0.9)),
      '#film': () => el('#film'),
      '#writing': () => el('#writing'),
      '#design': () => el('#design'),
      '#fourth-door': () => el('#fourth-door'),
      '#outro': () => el('#outro'),
    };
    const y = spots[hash]?.();
    return y == null ? null : Math.max(0, y);
  }
  function landTo(hash) {
    if (!hash || hash === '#') return false;
    const y = spotFor(hash);
    if (y == null) return false;
    lenis.scrollTo(y, { immediate: true });
    ScrollTrigger.refresh();
    return true;
  }

  return { lenis, scrubber, landTo, spotFor, openLoop, onLoop, wakeReady, useChrome };
}
