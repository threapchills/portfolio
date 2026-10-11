/* prologue.js: the first screen and the paper that follows it.
   The showreel opens the page: a card of stills that cross-dissolve, one
   world into the next, until a click plays the reel with sound. The stage
   pins while the card grows towards the frame, and then the paper slides
   up over it, carrying the kind words, the clients and the CV.

   Everything heavy here (the reel itself, its stills, the logos and the
   portrait) is registered with the threshold's batch, so it is all
   already on the visitor's machine when they enter. This module only
   chooses which cut of the reel this screen's shape should load, and
   leaves the rest to the gate. */

import { clamp, damp, seg, easeOut, qs, qsa, IS_MOBILE, REDUCED_MOTION } from './util.js';

const REEL = {
  wide: { src: 'showreel/mike-whyle-showreel-2026.mp4', ar: 16 / 9, still: (i) => `images/showreel/still-${i}.webp` },
  tall: { src: 'showreel/mike-whyle-showreel-2026-vertical.mp4', ar: 9 / 16, still: (i) => `images/showreel/still-${i}-v.webp` },
};
const STILL_HOLD = 3400;     // ms each world holds before the next dissolves in

export function initPrologue({ audio, lenis }) {
  const root = document.documentElement;
  const stage = qs('.prologue-stage');
  const head = qs('.prologue-head');
  const frame = qs('#reel-frame');
  const video = qs('#reel-video');
  const play = qs('#reel-play');
  const hint = qs('.prologue-hint');
  const proof = qs('#proof');

  /* A phone held upright gets the vertical cut, everything else the wide
     one. Chosen once, at load: the gate downloads exactly one of them, and
     a visitor who turns their phone later keeps the cut they were given,
     framed by its own card rather than cropped to fit. */
  const tall = window.innerHeight > window.innerWidth * 1.05;
  const cut = tall ? REEL.tall : REEL.wide;
  frame.classList.add(tall ? 'is-tall' : 'is-wide');
  root.style.setProperty('--reel-ar', String(cut.ar));
  const stills = qsa('.reel-still', frame);
  stills.forEach((img) => { img.src = cut.still(img.dataset.still); });
  stills[0]?.classList.add('is-on');

  /* ---- the card's size: big enough to lead, small enough that the name
     still sits above it; then, as the first scroll arrives, it grows
     towards the whole frame ---- */
  let base = 1, grown = 1;
  const size = () => {
    const vw = stage.clientWidth, vh = stage.clientHeight;
    const headH = head.offsetHeight;
    const room = vh - headH - Math.max(110, vh * 0.2);
    const w0 = Math.min(vw * (tall ? 0.78 : 0.86), room * cut.ar, 1320);
    frame.style.width = `${Math.round(w0)}px`;
    const w1 = Math.min(vw * (IS_MOBILE ? 0.94 : 0.94), (vh * 0.9) * cut.ar);
    base = 1;
    grown = Math.max(1, w1 / w0);
  };
  size();
  addEventListener('resize', size);
  document.fonts?.ready.then(size);

  /* ---- the reel ---- */
  const startReel = () => {
    frame.classList.add('is-playing');
    video.muted = false;
    // a browser that refuses sound still gets the picture
    video.play().catch(() => { video.muted = true; video.play().catch(() => {}); });
    video.focus({ preventScroll: true });
  };
  play.addEventListener('click', startReel);
  video.addEventListener('play', () => { frame.classList.add('is-playing'); audio.duck(true); });
  video.addEventListener('pause', () => audio.duck(false));
  video.addEventListener('ended', () => {
    audio.duck(false);
    frame.classList.remove('is-playing');
    video.currentTime = 0;
  });

  /* the stills cross-dissolve while the card waits, and rest while the
     reel plays or the card is out of sight */
  let stillIdx = 0, stillTimer = 0, onScreen = true;
  const advance = () => {
    if (REDUCED_MOTION || frame.classList.contains('is-playing') || !onScreen || document.hidden) return;
    stills[stillIdx].classList.remove('is-on');
    stills[stillIdx].classList.add('was-on');
    const prev = stillIdx;
    stillIdx = (stillIdx + 1) % stills.length;
    stills[stillIdx].classList.remove('was-on');
    stills[stillIdx].classList.add('is-on');
    setTimeout(() => stills[prev].classList.remove('was-on'), 1800);
  };
  const runStills = () => { clearInterval(stillTimer); stillTimer = setInterval(advance, STILL_HOLD); };
  runStills();

  /* ---- the scroll: the name lifts away, the card grows, and the stage
     recedes into the dark as the paper comes over it ---- */
  let pinP = 0;
  ScrollTrigger.create({
    trigger: '#prologue', start: 'top top', end: 'bottom bottom', scrub: true,
    onUpdate: (self) => { pinP = self.progress; },
  });
  let s = 1, last = performance.now();
  gsap.ticker.add(() => {
    const now = performance.now();
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    const vh = window.innerHeight;
    const pr = proof.getBoundingClientRect();
    const cover = clamp(1 - pr.top / vh, 0, 1);         // how far the paper has come over
    onScreen = cover < 0.98;
    const grow = REDUCED_MOTION ? 0 : easeOut(seg(pinP, 0, 0.85));
    const want = base + (grown - base) * grow;
    s = damp(s, want, 10, dt);
    frame.style.transform = `translate3d(0, ${(-grow * head.offsetHeight * 0.5).toFixed(1)}px, 0) scale(${s.toFixed(4)})`;
    head.style.opacity = (1 - seg(pinP, 0.05, 0.5)).toFixed(3);
    head.style.transform = `translate3d(0, ${(-seg(pinP, 0, 0.6) * 40).toFixed(1)}px, 0)`;
    hint.style.opacity = (1 - seg(pinP, 0, 0.12)).toFixed(3);
    stage.style.setProperty('--recede', cover.toFixed(3));
    // a reel left playing under the paper falls quiet once it is covered
    if (cover > 0.62 && !video.paused) video.pause();
  });
  new IntersectionObserver(([e]) => {
    if (!e.isIntersecting && !video.paused) video.pause();
  }, { threshold: 0.15 }).observe(frame);

  /* ---- the paper: the fixed chrome turns to ink while it owns the frame */
  ScrollTrigger.create({
    trigger: '#proof', endTrigger: '#about', start: 'top 6%', end: 'bottom 6%',
    onToggle: (self) => document.body.classList.toggle('mode-light', self.isActive),
  });

  /* the nav knows where you are */
  const navLinks = qsa('.pill-nav [data-nav]');
  const mark = (key) => navLinks.forEach((a) => a.classList.toggle('is-here', a.dataset.nav === key));
  const navMap = [['#prologue', 'prologue'], ['#proof', 'proof'], ['#about', 'about']];
  for (const [sel, key] of navMap) {
    ScrollTrigger.create({ trigger: sel, start: 'top 45%', end: 'bottom 45%',
      onToggle: (self) => { if (self.isActive) mark(key); } });
  }
  // the reading climbs under the about panel, so the work begins where
  // the paper ends rather than where the reading's box does
  ScrollTrigger.create({ trigger: '#about', endTrigger: '#fourth-door', start: 'bottom 45%', end: 'bottom 45%',
    onToggle: (self) => mark(self.isActive ? 'work' : '') });

  /* ---- the client strip: the set twice over, so the marquee never ends.
     Cloned before the gate registers its images, so both sets are
     prepared from the same downloaded files. ---- */
  const strip = qs('.client-track');
  if (strip) {
    for (const li of qsa('li', strip)) {
      const copy = li.cloneNode(true);
      copy.setAttribute('aria-hidden', 'true');
      copy.querySelector('img').alt = '';
      strip.appendChild(copy);
    }
  }

  /* ---- reveals: headings rise word by word out of their own line; the
     scribbles draw themselves; the testimonials are dealt onto the table;
     the marker sweeps behind the words that matter ---- */
  for (const el of qsa('[data-split]')) {
    const words = el.textContent.trim().split(/\s+/);
    el.setAttribute('aria-label', el.textContent.trim());
    el.innerHTML = words.map((w, i) =>
      `<span class="w" aria-hidden="true"><span style="--i:${i}">${w}</span></span>`).join(' ');
  }
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    }
  }, { threshold: 0.35, rootMargin: '0px 0px -6% 0px' });
  const watch = qsa('[data-split]:not(.prologue-name), .scribbled, .circled, .t-card, .hl, .about-photo, .about-award, .client-strip');
  // nothing animates before the threshold lifts: the gate's own fade is the
  // first movement, and the name rises as it clears
  document.addEventListener('mw:enter', () => {
    setTimeout(() => qs('.prologue-name')?.classList.add('is-in'), 350);
    stage.classList.add('is-in');
    watch.forEach((el) => io.observe(el));
  }, { once: true });

  /* the hands on the cards: each colleague's cursor idles near their own
     words, and leans towards the visitor's when it comes close */
  if (!REDUCED_MOTION && !matchMedia('(pointer: coarse)').matches) {
    for (const card of qsa('.t-card')) {
      const cur = qs('.t-cursor', card);
      if (!cur) continue;
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        const x = clamp((e.clientX - r.left) / r.width, 0, 1);
        const y = clamp((e.clientY - r.top) / r.height, 0, 1);
        cur.style.setProperty('--fx', `${((x - 0.85) * 60).toFixed(1)}px`);
        cur.style.setProperty('--fy', `${((y - 0.15) * 40).toFixed(1)}px`);
        card.style.setProperty('--rx', `${((0.5 - y) * 3).toFixed(2)}deg`);
        card.style.setProperty('--ry', `${((x - 0.5) * 4).toFixed(2)}deg`);
      });
      card.addEventListener('pointerleave', () => {
        cur.style.setProperty('--fx', '0px'); cur.style.setProperty('--fy', '0px');
        card.style.setProperty('--rx', '0deg'); card.style.setProperty('--ry', '0deg');
      });
    }
  }

  /* the loop comes home here: the reel's card is shown afresh and the name
     rises again, as if for the first time */
  function replay() {
    video.pause();
    frame.classList.remove('is-playing');
    const name = qs('.prologue-name');
    name?.classList.remove('is-in');
    stage.classList.remove('is-in');
    void stage.offsetWidth;
    stage.classList.add('is-in');
    setTimeout(() => name?.classList.add('is-in'), 450);
    runStills();
  }

  return { reelSrc: cut.src, video, replay, tall };
}
