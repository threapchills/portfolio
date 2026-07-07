/* journey.js — orchestration of Acts I to VIII on the index page.
   One continuous push-in, never a cut, until the Reading.

   Scroll grammar: free flow with magnetic beats. A single ScrollTrigger
   scrubs act progress; snap assist eases into the beats. */

import { asset, clamp, damp, fromRoot, kf, seg, easeInOut, easeOut, qs, qsa, IS_MOBILE, REDUCED_MOTION, PARAMS } from './util.js';
import { World } from './parallax.js';
import { GLPlanes } from './gl-planes.js';
import { audio } from './audio.js';

/* Act beats as journey progress. The establishing shot and the beetle's
   whole crossing play without a rest between them; the world only settles
   once the goddess has risen. */
const BEATS = [0, 0.52, 0.70, 0.86, 1];

/* Act VI: the reading walks its three cards one by one. Each band lifts
   a card while its siblings step back; the beats are the band centres. */
const READING_BANDS = [
  { in: [0.10, 0.22], out: [0.34, 0.44] },
  { in: [0.36, 0.46], out: [0.58, 0.68] },
  { in: [0.60, 0.70], out: [0.82, 0.92] },
];
const READING_CARD_BEATS = [0.28, 0.52, 0.76];
const READING_BEATS = [0, ...READING_CARD_BEATS, 1];

/* Opening choreography, keyframe-guided (Mike, 2026-07-07). The camera
   holds the wide establishing frame and only pushes in gently: no deep
   dive. The world stays lit behind the goddess until the mask close-up
   covers it. All constants below are tuned by eye; adjust freely. */
const camCX = kf([[0, 0.500], [0.10, 0.502], [0.30, 0.506], [0.55, 0.514], [0.70, 0.520]]);
const camCY = kf([[0, 0.500], [0.10, 0.505], [0.30, 0.486], [0.55, 0.452], [0.70, 0.432]]);
/* the establishing frame opens with the whole artwork visible (z below the
   cover scale, so the far edges show), then fills the frame and pushes in */
const camZ  = kf([[0, 0.70],  [0.10, 1.00],  [0.30, 1.20],  [0.55, 1.50],  [0.70, 1.90]]);
/* a soft focus rack: the foreground flora blurs a touch as we push in */
const focusD = kf([[0, 0.12], [0.30, 0.18], [0.70, 0.24]]);

/* the beetle's flight, in base-canvas units. It enters upper-left, wings
   flapping, sweeps right and leaves the frame before the goddess stirs. */
const BEETLE = { in: 0.08, out: 0.40, x0: -0.48, x1: 0.36, y: -0.40, arc: 0.04, yDrift: 0.10, flapAmp: 5, flapRate: 7 };

/* the goddess rises whole from below into the standing world, then her
   face floats up as the lens closes on the mask (keyframe 4). */
const GODDESS = { fade: [0.44, 0.54], emerge: [0.44, 0.56], zoom: [0.57, 0.685], scaleRise: 0.72, scaleFace: 3.2, dropVH: 46, restVH: 35, tyEnd: 2 };

/* Audio mix vectors per journey act (spec 4.9), then per page section. */
const MIX = {
  act1:    { sea: 0.50, fire: 0.35, sky: 0.10, earth: 0.00 },
  act2:    { sea: 0.30, fire: 0.20, sky: 0.10, earth: 0.45 },
  act3:    { sea: 0.20, fire: 0.10, sky: 0.15, earth: 0.55 },
  act4:    { sea: 0.05, fire: 0.00, sky: 0.40, earth: 0.35 },
  act5:    { sea: 0.00, fire: 0.00, sky: 0.30, earth: 0.15 },
  reading: { sea: 0.00, fire: 0.00, sky: 0.08, earth: 0.12 },
  coding:  { sea: 0.15, fire: 0.00, sky: 0.25, earth: 0.00 },
  outro:   { sea: 0.00, fire: 0.00, sky: 0.00, earth: 0.00 },
};
const mixAt = (p) => {
  if (p < 0.16) return MIX.act1;
  if (p < 0.34) return MIX.act2;
  if (p < 0.46) return MIX.act3;
  if (p < 0.70) return MIX.act4;
  return MIX.act5;
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

  const world = new World(qs('#world'));
  // opt-in calibration handle (?dbg): drive one opening frame by hand
  if (PARAMS.has('dbg')) {
    window.__dbg = { world, camCX, camCY, camZ, focusD, BEETLE, GODDESS, seg, easeInOut };
  }
  const goddessStage = qs('#goddess-stage');
  const goddessRig = qs('#goddess-rig');
  const wingsImg = qs('#goddess-wings');
  const maskStage = qs('#mask-stage');
  const maskBox = qs('#mask-box');
  const iris = qs('#iris');
  const mouthAnchor = qs('.glyph-anchor[data-glyph="design"]');
  const glyphs = {
    film: qs('.glyph-anchor[data-glyph="film"]'),
    writing: qs('.glyph-anchor[data-glyph="writing"]'),
    design: qs('.glyph-anchor[data-glyph="design"]'),
  };

  let progress = 0;

  /* the warp: scroll velocity stretches and shears the whole stage,
     the CSS cousin of the planes' bend shader */
  const stageEl = qs('#journey .stage');
  let sVel = 0;

  /* Act V: the mask becomes a live plane; it ripples under the cursor
     while the visitor waits for the eyes to light */
  const maskImg = qs('#mask-box > img');
  let maskEngine = null, maskPlane = null;
  if (!IS_MOBILE && !REDUCED_MOTION) {
    const mglc = document.createElement('canvas');
    maskStage.appendChild(mglc);
    maskEngine = new GLPlanes(mglc);
    if (maskEngine.enabled) {
      maskPlane = maskEngine.addPlane(maskImg, {
        srcA: fromRoot(asset('assets/journey/mask-hires.webp')),
        ripple: true,
        bend: false,
      });
    }
  }

  /* the Reading: the pool of light drifts after the visitor's hand */
  const readingEl = qs('#reading');
  let lightX = 50, lightY = 46, lightTX = 50, lightTY = 46;
  readingEl?.addEventListener('pointermove', (e) => {
    const r = readingEl.getBoundingClientRect();
    lightTX = clamp((e.clientX - r.left) / r.width * 100, 0, 100);
    lightTY = clamp((e.clientY - r.top) / r.height * 100, 0, 100);
  }, { passive: true });

  const st = ScrollTrigger.create({
    trigger: '#journey',
    start: 'top top',
    end: 'bottom bottom',
    scrub: true,
    snap: (PARAMS.get('autoscroll') === 'off' || REDUCED_MOTION) ? undefined : {
      /* a magnetic assist, not a pager: only pull in when the visitor
         stops near a beat, so nothing between beats gets skipped */
      snapTo: (value) => {
        let best = value, dist = 0.05;
        for (const b of BEATS) {
          const d = Math.abs(value - b);
          if (d < dist) { best = b; dist = d; }
        }
        return best;
      },
      duration: { min: 0.4, max: 0.9 },
      ease: 'power2.inOut',
      delay: 0.15,
    },
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

  /* ---- per-frame render ---- */
  const start = performance.now();
  let lastNow = start;
  /* the establishing shot: the world opens a breath closer and settles.
     Armed by the entry gate so the settle happens on screen, not behind
     the threshold. */
  let intro = 1;
  document.addEventListener('mw:enter', () => {
    if (!REDUCED_MOTION) intro = 1.11;
  });
  gsap.ticker.add(() => {
    const now = performance.now();
    const dt = Math.min((now - lastNow) / 1000, 0.1);
    lastNow = now;
    const t = (now - start) / 1000;
    const p = progress;
    intro += (1 - intro) * (1 - Math.exp(-0.75 * dt));

    /* velocity warp on the stage */
    if (!REDUCED_MOTION && stageEl) {
      sVel = damp(sVel, lenis.velocity || 0, 8, dt);
      const stretch = clamp(Math.abs(sVel) * 0.0011, 0, 0.038);
      const shear = clamp(sVel * 0.045, -1.4, 1.4);
      stageEl.style.transform =
        `scaleY(${(1 + stretch).toFixed(4)}) skewX(${shear.toFixed(3)}deg)`;
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

    /* The standing world: the backdrop through the whole opening. It holds
       a wide frame and pushes in gently, and stays lit behind the goddess
       until the mask close-up covers everything. */
    const worldActive = p < 0.72;
    qs('#world').style.display = worldActive ? '' : 'none';
    if (worldActive) {
      if (REDUCED_MOTION) {
        const pose = p < 0.30 ? 0 : p < 0.55 ? 0.30 : 0.70;
        world.setCamera(camCX(pose), camCY(pose), camZ(pose));
        world.setFocus(focusD(pose));
      } else {
        world.setCamera(camCX(p), camCY(p), camZ(p) * intro);
        world.setFocus(focusD(p));
      }

      // the small goddess on the path is retired; she now arrives whole
      world.setGoddessOpacity(0);

      /* the beetle crosses the establishing frame and is gone. It enters
         from the upper left, sweeps right and exits the right edge. */
      const bf = seg(p, BEETLE.in, BEETLE.out, easeInOut);
      const flying = p > BEETLE.in - 0.02 && p < BEETLE.out + 0.02;
      const bx = REDUCED_MOTION ? 0.2 : BEETLE.x0 + (BEETLE.x1 - BEETLE.x0) * bf;
      // a gentle descent ramp keeps the beetle level as the camera lifts
      const by = BEETLE.y + (REDUCED_MOTION ? 0 : Math.sin(bf * Math.PI) * BEETLE.arc + BEETLE.yDrift * bf);
      const flap = REDUCED_MOTION ? 0 : Math.sin(t * BEETLE.flapRate) * BEETLE.flapAmp;
      const bop = flying
        ? seg(p, BEETLE.in, BEETLE.in + 0.03) * (1 - seg(p, BEETLE.out - 0.03, BEETLE.out))
        : 0;
      world.setMothPose({ dx: bx, dy: by, rot: flap, opacity: bop });
      world.render(t);
    }

    /* The goddess rises whole from below into the standing world, wings
       breathing, then her face floats up as the lens closes in. Her stage
       is transparent, so the tower stands behind her (keyframe 3) until
       the mask close-up takes the frame (keyframe 4). */
    const gFade = seg(p, GODDESS.fade[0], GODDESS.fade[1]);
    const gVisible = gFade > 0.001 && p < 0.73;
    goddessStage.style.display = gVisible ? '' : 'none';
    if (gVisible) {
      goddessStage.style.opacity = gFade.toFixed(3);
      const emerge = seg(p, GODDESS.emerge[0], GODDESS.emerge[1], easeInOut);
      const zoom = seg(p, GODDESS.zoom[0], GODDESS.zoom[1], easeInOut);
      const gs = GODDESS.scaleRise + (GODDESS.scaleFace - GODDESS.scaleRise) * zoom;
      // rise from below to her resting pose (tower above her), then the
      // face floats up and in toward the mask close-up
      const ty = (GODDESS.dropVH + (GODDESS.restVH - GODDESS.dropVH) * emerge) + (GODDESS.tyEnd - GODDESS.restVH) * zoom;
      const breathe = REDUCED_MOTION ? 0 : Math.sin(t * 0.9) * 0.004;
      goddessRig.style.transform = `translateY(${ty.toFixed(2)}vh) scale(${(gs + breathe).toFixed(4)})`;
      if (wingsImg) {
        const flex = REDUCED_MOTION ? 0.94 : 0.94 + 0.035 * Math.sin(t * 0.8);
        const wr = REDUCED_MOTION ? 0 : Math.sin(t * 0.8) * 1.2;
        wingsImg.style.transform = `scale(${flex.toFixed(4)}) rotate(${wr.toFixed(2)}deg)`;
      }
    }

    /* Act V swap: goddess -> mask extreme close-up */
    const mFade = seg(p, 0.685, 0.715);
    maskStage.style.display = mFade > 0.001 ? '' : 'none';
    if (mFade > 0.001) {
      maskStage.style.opacity = mFade.toFixed(3);
      /* start at the size the goddess's face reached, then push closer */
      const ms = 1.9 + 0.7 * seg(p, 0.70, 0.92, easeInOut);
      const sway = REDUCED_MOTION ? 0 : Math.sin(t * 0.4) * 0.5;
      maskBox.style.transform = `translate(-52%, -78%) scale(${ms.toFixed(4)}) rotate(${sway.toFixed(2)}deg)`;

      /* the ignition: three apertures light in sequence */
      igniteGlyph(glyphs.film, seg(p, 0.73, 0.775, easeOut));
      igniteGlyph(glyphs.writing, seg(p, 0.775, 0.82, easeOut));
      igniteGlyph(glyphs.design, seg(p, 0.82, 0.865, easeOut));
    }

    /* the iris wipe: the camera passes through the central aperture */
    const w = seg(p, 0.92, 1.0, easeInOut);
    iris.style.display = w > 0.001 ? '' : 'none';
    if (w > 0.001) {
      const r = mouthAnchor.getBoundingClientRect();
      const cx = ((r.left + r.width / 2) / window.innerWidth * 100).toFixed(2);
      const cy = ((r.top + r.height / 2) / window.innerHeight * 100).toFixed(2);
      const open = (1 - w) * 120;
      iris.style.background =
        `radial-gradient(circle at ${cx}% ${cy}%, transparent ${Math.max(open - 18, 0)}%, ` +
        `rgba(196, 146, 42, 0.16) ${Math.max(open - 4, 0)}%, var(--ink) ${open}%)`;
    }

    /* the live mask plane: on once fully swapped in, off for the wipe */
    if (maskPlane) {
      const glOn = mFade >= 0.999 && w < 0.9;
      maskPlane.hide = !glOn;
      maskImg.style.opacity = glOn ? '0' : '';
      if (mFade > 0.001) maskEngine.render(t, dt);
    }

    /* audio: journey acts, then the page sections below the journey */
    if (audio.started) {
      const rest = sectionProgress();
      audio.setMix(rest || mixAt(p));
    }
  });

  function igniteGlyph(el, v) {
    if (!el) return;
    el.style.setProperty('--ignite', v.toFixed(3));
    el.classList.toggle('is-lit', v > 0.02);
  }

  /* Which post-journey section owns the viewport (for the audio mix)? */
  function sectionProgress() {
    const vh = window.innerHeight;
    const probe = (id) => {
      const el = qs(id);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return r.top < vh * 0.5 && r.bottom > vh * 0.5 ? r : null;
    };
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

  /* Returning from a chamber lands on the Reading, never back at Act 0. */
  if (location.hash === '#reading' || sessionStorage.getItem('mw-return') === '1') {
    sessionStorage.removeItem('mw-return');
    requestAnimationFrame(() => {
      const reading = qs('#reading-wrap');
      if (reading) {
        // land on the wide table so the visitor can walk the cards again
        lenis.scrollTo(reading.offsetTop, { immediate: true });
        ScrollTrigger.refresh();
      }
    });
  }

  return { lenis, world };
}
