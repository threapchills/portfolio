/* journey.js — orchestration of Acts I to VIII on the index page.
   One continuous push-in, never a cut, until the Reading.

   Scroll grammar: free flow with magnetic beats. A single ScrollTrigger
   scrubs act progress; snap assist eases into the beats. */

import { clamp, kf, seg, easeInOut, easeOut, qs, qsa, REDUCED_MOTION, PARAMS } from './util.js';
import { World } from './parallax.js';
import { audio } from './audio.js';

/* Act beats as journey progress. */
const BEATS = [0, 0.34, 0.46, 0.70, 0.86, 1];

const camCX = kf([[0, 0.500], [0.16, 0.488], [0.34, 0.462], [0.46, 0.455], [0.58, 0.449]]);
const camCY = kf([[0, 0.520], [0.16, 0.605], [0.34, 0.790], [0.46, 0.660], [0.58, 0.625]]);
const camZ  = kf([[0, 1.00],  [0.16, 1.32],  [0.34, 2.60],  [0.46, 2.80],  [0.58, 7.00]]);
/* focus rack: the lens travels from the world plane out to the flora
   and back in to the goddess as the camera passes through the layers */
const focusD = kf([[0, 0.05], [0.16, 0.35], [0.30, 0.55], [0.38, 0.46], [0.44, 0.20], [0.58, 0.20]]);

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

    /* world camera (Acts I to IV handoff) */
    const worldActive = p < 0.57;
    qs('#world').style.display = worldActive ? '' : 'none';
    if (worldActive) {
      if (REDUCED_MOTION) {
        // gentle cross-fades between act stills: hold the nearest act pose
        const pose = p < 0.16 ? 0 : p < 0.34 ? 0.16 : p < 0.46 ? 0.34 : 0.52;
        world.setCamera(camCX(pose), camCY(pose), camZ(pose));
        world.setFocus(focusD(pose));
      } else {
        world.setCamera(camCX(p), camCY(p), camZ(p) * intro);
        world.setFocus(focusD(p));
      }

      /* The moth: invisible at rest, condenses out of the dark as the
         camera enters the flora, then crawls out of frame at the beat.
         Its exit reveals the goddess on the path behind it. */
      /* she stands in the wide shots and at her reveal; during the dive
         through the flora a floating glimpse would break the discovery */
      world.setGoddessOpacity(1 - seg(p, 0.16, 0.22) + seg(p, 0.40, 0.455));

      const appear = seg(p, 0.20, 0.30);
      const m = seg(p, 0.365, 0.46, easeInOut);
      const dx = 0.55 * m + 0.12 * m * m;
      const dy = -0.28 * m + 0.10 * Math.sin(m * Math.PI);
      const rot = REDUCED_MOTION ? 0 : 16 * m + Math.sin(t * 1.1) * 2 * (1 - m);
      world.setMothPose({
        dx, dy, rot,
        opacity: REDUCED_MOTION && m > 0 ? appear * (1 - m) : appear,
      });
      world.render(t);
    }

    /* Act IV swap: world -> goddess plane. The incoming stage carries an
       opaque backdrop, so it covers the world as it fades in; the outgoing
       stage never dims mid-band. */
    const gFade = seg(p, 0.525, 0.565);
    const gVisible = gFade > 0.001 && p < 0.73;
    goddessStage.style.display = gVisible ? '' : 'none';
    if (gVisible) {
      goddessStage.style.opacity = gFade.toFixed(3);
      const gs = 0.5 + 2.9 * seg(p, 0.53, 0.70, easeInOut);
      const breathe = REDUCED_MOTION ? 0 : Math.sin(t * 0.9) * 0.004;
      goddessRig.style.transform = `scale(${(gs + breathe).toFixed(4)})`;
      if (wingsImg) wingsImg.style.transform = `scale(${(0.94 + 0.03 * Math.sin(t * 0.5)).toFixed(4)})`;
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
    if (reading) pts.push(reading.offsetTop + reading.offsetHeight * 0.4);
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
        lenis.scrollTo(reading.offsetTop + reading.offsetHeight * 0.4, { immediate: true });
        ScrollTrigger.refresh();
      }
    });
  }

  return { lenis, world };
}
