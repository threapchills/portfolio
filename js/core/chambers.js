/* chambers.js — the three chambers, inlined into the journey.
   Film, writing and design were standalone pages; now they are acts on
   the single scroll. Each init builds its DOM up front, because the page
   needs its true height from the first paint, and defers only the heavy
   lifting: the Mikey frames stream in behind the opener, the GL engine
   wakes as the design flow approaches.
   Reads the classic-script globals PROJECTS, RACK_EXTRAS, WRITING_FACES
   and NEWSDROP, the same way the chamber pages did. */

import { clamp, damp, seg, easeInOut, qs, qsa, IS_MOBILE, REDUCED_MOTION } from './util.js';
import { FrameScrubber } from './sequence.js';
import { WritingCube } from './cube.js';
import { GLPlanes } from './gl-planes.js';

/* ============================================================
   chamber i — film: the Mikey scrub, then the banners
   ============================================================ */
export function initFilmSection(lenis) {
  const canvas = qs('#scrub-canvas');
  const scrubber = new FrameScrubber(canvas, {
    dir: IS_MOBILE ? 'video/mikey/frames-800' : 'video/mikey/frames',
    count: 317,
  });
  const brand = qs('#scrub-brand');
  const lbTop = qs('#lb-top');
  const lbBottom = qs('#lb-bottom');

  let scrubP = 0;
  ScrollTrigger.create({
    trigger: '#scrub-wrap',
    start: 'top top',
    end: 'bottom bottom',
    scrub: true,
    onUpdate: (self) => { scrubP = self.progress; },
  });

  /* ---- the films, as a rail that travels sideways under the scroll ---- */
  const films = PROJECTS
    .filter((p) => p.chamber === 'film')
    .sort((a, b) => a.chamberOrder - b.chamberOrder);
  const rel = (path) => path ? path.replace('../../', '') : '';
  // phones get the lighter cut of each loop; the rail card is a third the width
  const loopFor = (path) => (path && IS_MOBILE) ? path.replace('video/loops/', 'video/loops-m/') : path;

  const fromProject = (f) => ({
    title: f.title,
    tag: f.type || f.category,
    poster: rel(f.heroFallback || f.heroImage || (f.gallery && f.gallery[0]) || ''),
    loop: loopFor(f.rackLoop || ''),
    href: `projects/${f.id}/`,
  });
  const fromExtra = (x) => ({
    title: x.title, tag: x.tag,
    poster: x.poster,
    loop: loopFor(x.loop || ''),
    href: x.href, external: !!x.external,
  });

  const banners = [...films.map(fromProject), ...RACK_EXTRAS.map(fromExtra)];
  const rail = qs('#film-rail');
  const track = qs('#film-track');
  const count = qs('#film-count');
  if (count) count.textContent = String(banners.length).padStart(2, '0');
  const mediaEls = [];

  banners.forEach((item, i) => {
    const el = document.createElement('a');
    el.className = 'film-banner';
    el.href = item.href;
    if (item.external) { el.target = '_blank'; el.rel = 'noopener'; }
    const clean = String(item.title).replace(/<[^>]+>/g, '');
    el.innerHTML = `
      <span class="banner-media">
        <img src="${item.poster}" alt="${clean} still" loading="lazy">
        ${item.loop ? `<video muted loop playsinline preload="none" data-src="${item.loop}"></video>` : ''}
      </span>
      <span class="banner-caption">
        <span class="banner-num">${String(i + 1).padStart(2, '0')} / ${String(banners.length).padStart(2, '0')}</span>
        <h3>${item.title}</h3>
        <span class="banner-tag">${item.tag}<em>${item.external ? 'Watch &rarr;' : 'Open &rarr;'}</em></span>
      </span>`;
    track.appendChild(el);
    mediaEls.push(el.querySelector('.banner-media'));
  });

  /* The rail is sticky, so the section's height is the distance the track
     has to travel plus one screen to stand in. Measured, never guessed:
     the cards are sized in viewport units and the track's true width is
     only known once they are laid out. */
  let travel = 0;
  const measure = () => {
    travel = Math.max(0, track.scrollWidth - rail.clientWidth);
    rail.style.height = `${travel + window.innerHeight}px`;
  };
  measure();
  addEventListener('resize', () => { measure(); ScrollTrigger.refresh(); });

  let railP = 0;
  ScrollTrigger.create({
    trigger: rail,
    start: 'top top',
    end: 'bottom bottom',
    scrub: true,
    onUpdate: (self) => { railP = self.progress; },
  });
  const bar = qs('#film-progress');

  // A banner can only play after its complete local movie has passed the gate.
  let entered = false;
  const visible = new Set();
  const updatePlayback = () => {
    for (const video of track.querySelectorAll('video')) {
      if (entered && visible.has(video)) {
        video.play().then(() => {
          if (visible.has(video)) video.classList.add('is-playing');
          else video.pause();
        }).catch(() => video.classList.remove('is-playing'));
      } else { video.pause(); video.classList.remove('is-playing'); }
    }
  };
  const io = new IntersectionObserver(entries => {
    for (const entry of entries) {
      const video = entry.target.querySelector('video');
      if (video) entry.isIntersecting ? visible.add(video) : visible.delete(video);
    }
    updatePlayback();
  }, { threshold: 0.35 });
  track.querySelectorAll('.film-banner').forEach(banner => io.observe(banner));
  document.addEventListener('mw:enter', () => { entered = true; updatePlayback(); }, { once: true });

  /* ---- frame loop: the scrub, the rail, and the momentum warp ---- */
  let last = performance.now();
  let sVel = 0;
  let x = 0;
  gsap.ticker.add(() => {
    const now = performance.now();
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    scrubber.setProgress(scrubP);
    scrubber.tick(dt);
    const bo = 1 - seg(scrubP, 0.16, 0.26);
    const bOp = seg(scrubP, 0.02, 0.06) * bo;
    brand.style.opacity = bOp.toFixed(3);
    brand.style.pointerEvents = bOp > 0.15 ? 'auto' : 'none';
    const lb = seg(scrubP, 0.02, 0.12) * (1 - seg(scrubP, 0.86, 0.98));
    lbTop.style.transform = `scaleY(${lb.toFixed(3)})`;
    lbBottom.style.transform = `scaleY(${lb.toFixed(3)})`;

    // the rail: weighted, so the track glides after the wheel rather than
    // being bolted to it
    const want = -railP * travel;
    x = REDUCED_MOTION ? want : damp(x, want, 9, dt);
    if (Math.abs(x - want) < 0.05) x = want;
    track.style.transform = `translate3d(${x.toFixed(2)}px, 0, 0)`;
    if (bar) bar.style.transform = `scaleX(${railP.toFixed(4)})`;

    if (REDUCED_MOTION) return;
    sVel += ((lenis.velocity || 0) - sVel) * (1 - Math.exp(-8 * dt));
    const stretch = clamp(Math.abs(sVel) * 0.0009, 0, 0.035);
    const shear = clamp(sVel * 0.04, -1.4, 1.4);
    const vw = window.innerWidth;
    for (const m of mediaEls) {
      const r = m.parentElement.getBoundingClientRect();
      if (r.right < 0 || r.left > vw || r.bottom < 0 || r.top > innerHeight) continue;
      // parallax: the picture drifts against the card's travel, so each
      // film reads as a window onto something deeper than the card
      const c = ((r.left + r.width / 2) / vw - 0.5);
      m.style.transform = `translate3d(${(-c * 7).toFixed(2)}%, 0, 0) scaleX(${(1 + stretch).toFixed(4)}) skewX(${shear.toFixed(3)}deg)`;
    }
  });

  /* the frames stream in the background; idempotent, so the streaming
     chain and the on-approach backstop can both call it */
  let loading = null;
  const preload = () => loading ??= scrubber.preload().then(() => scrubber.draw(true));

  return { scrubber, preload, measure };
}

/* ============================================================
   chamber ii — writing: the cube, turned by the scroll
   ============================================================ */
export function initWritingSection(lenis) {
  const plane = qs('#reading-plane');
  const inner = qs('#plane-inner');
  const closeBtn = qs('#plane-close');
  const progress = qs('#plane-progress');
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

  /* One flat index of everything written, genre and order discarded. The
     cube deals it round its six faces. */
  const ENTRIES = WRITING_FACES.flatMap((f) => (
    f.type === 'newsdrop'
      ? NEWSDROP.map((it) => ({ label: `#${it.n}`, title: it.title, kind: 'issue', file: it.file, n: it.n, date: it.date }))
      : f.items.map((st) => ({ title: st.title, kind: 'story', url: st.url, excerpt: st.excerpt }))
  ));
  const ISSUES = ENTRIES.filter((e) => e.kind === 'issue');   // newest first

  /* ---- the reading plane ----
     There are exactly two places to be: at the cube, choosing, or inside a
     piece, reading it. The plane holds one issue at a time; closing it
     always returns to the cube, never to a list. */
  let cube;
  let issueText = new Map();
  let returnFocus;
  function showPlane() {
    if (plane.classList.contains('is-open')) return;
    returnFocus = document.activeElement;
    document.querySelector('main').inert = true;
    document.body.style.overflow = 'hidden';
    document.body.classList.add('plane-open');
    cube.suspended = true;
    lenis.stop();
    plane.classList.add('is-open');
    plane.setAttribute('aria-hidden', 'false');
    closeBtn.hidden = false;
  }
  function closePlane() {
    if (!plane.classList.contains('is-open')) return;
    plane.classList.remove('is-open');
    plane.setAttribute('aria-hidden', 'true');
    closeBtn.hidden = true;
    document.querySelector('main').inert = false;
    document.body.style.overflow = '';
    document.body.classList.remove('plane-open');
    cube.suspended = false;
    lenis.start();
    returnFocus?.focus({ preventScroll: true });
  }
  /* a single tile: an issue opens straight into its reading view, a story
     (published elsewhere) opens where it lives, in its own tab */
  function openCell(entry) {
    if (!entry) return;
    if (entry.kind === 'issue') {
      showPlane();
      openIssue(entry);
      closeBtn.focus({ preventScroll: true });
    } else {
      window.open(entry.url, '_blank', 'noopener');
    }
  }
  closeBtn.addEventListener('click', closePlane);
  window.addEventListener('keydown', (e) => {
    if (!plane.classList.contains('is-open')) return;
    if (e.key === 'Escape') closePlane();
    if (e.key === 'Tab') {
      const controls = [closeBtn, ...inner.querySelectorAll('button, a[href]')];
      const index = controls.indexOf(document.activeElement);
      e.preventDefault();
      controls[(index + (e.shiftKey ? -1 : 1) + controls.length) % controls.length]?.focus();
    }
  });
  const latest = qs('#latest-writing');
  latest.innerHTML = `Latest News Drop · #${ISSUES[0].n} <span aria-hidden="true">→</span>`;
  latest.addEventListener('click', () => openCell(ISSUES[0]));

  // a hairline of gold measures how far through the piece the reader is
  plane.addEventListener('scroll', () => {
    const max = plane.scrollHeight - plane.clientHeight;
    progress.style.transform = `scaleX(${max > 0 ? (plane.scrollTop / max).toFixed(4) : 0})`;
  }, { passive: true });

  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
    'August', 'September', 'October', 'November', 'December'];
  const longDate = (iso) => {
    const [y, m, d] = iso.split('-').map(Number);
    return `${d} ${MONTHS[m - 1]} ${y}`;
  };

  /* an issue opens as a clean typographic reading view from plain text */
  async function openIssue({ file, n, date, title }) {
    inner.dataset.view = 'issue';
    plane.scrollTop = 0;
    progress.style.transform = 'scaleX(0)';
    inner.innerHTML = `<p class="plane-eyebrow plane-fetching">Summoning issue ${n}&hellip;</p>`;
    let text = '';
    try {
      text = issueText.get(file);
      if (text == null) {
        const response = await fetch(`content/newsdrop/${file}`);
        if (!response.ok) throw new Error(response.status);
        text = await response.text();
        issueText.set(file, text);
      }
    } catch {
      inner.innerHTML = `<p class="plane-eyebrow">This issue would not be summoned. Close it and try once more.</p>`;
      return;
    }
    const bodyLines = text.split('\n').slice(1);
    const paras = bodyLines.join('\n').split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean);
    const emojiLead = /^[^\w\s"'‘“(]/u;
    const html = paras.map((p, pi) => {
      // the source marks its outbound links with a bare "→ LINK"; there is
      // nothing behind them here, so the marker goes
      const clean = esc(p).replace(/\s*(→|->)\s*LINK\b\.?/g, '').trim();
      if (!clean) return '';
      const lines = clean.split('\n');
      const first = lines[0].trim();
      let out = '';
      if (first.length < 80 && emojiLead.test(p) && !/^[.…]/.test(p)) {
        // "📜 Claude's wet lab": the emoji stands apart as the section's mark
        const m = first.match(/^(\S+)\s+(.*)$/u);
        out += m
          ? `<h2 class="drop-heading"><span class="drop-mark" aria-hidden="true">${m[1]}</span>${m[2]}</h2>`
          : `<h2 class="drop-heading">${first}</h2>`;
        lines.shift();
      }
      if (lines.length) out += `<p${pi === 0 && !out ? ' class="issue-lede"' : ''}>${lines.join('<br>')}</p>`;
      return out;
    }).join('');

    const at = ISSUES.findIndex((e) => e.n === n);
    const newer = ISSUES[at - 1], older = ISSUES[at + 1];
    const step = (e, dir) => e ? `
      <button class="issue-step is-${dir}" data-n="${e.n}">
        <span class="step-dir">${dir === 'older' ? '&larr; Previous issue' : 'Next issue &rarr;'}</span>
        <span class="step-title">#${e.n} &middot; ${esc(e.title)}</span>
      </button>` : '<span></span>';
    inner.innerHTML = `
      <article class="issue-body">
        <p class="issue-kicker">The News Drop <span>#${n}</span></p>
        <h1>${esc(title)}</h1>
        <p class="issue-meta">${longDate(date)}</p>
        <div class="issue-rule" aria-hidden="true"></div>
        ${html}
        <p class="issue-end" aria-hidden="true">&#9790;</p>
      </article>
      <nav class="issue-nav" aria-label="More issues">
        ${step(older, 'older')}
        ${step(newer, 'newer')}
      </nav>
      <button class="issue-return">Back to the cube</button>`;
    inner.querySelectorAll('.issue-step').forEach((b) => b.addEventListener('click', () => {
      openIssue(ISSUES.find((e) => e.n === +b.dataset.n));
      closeBtn.focus({ preventScroll: true });
    }));
    inner.querySelector('.issue-return').addEventListener('click', closePlane);
    plane.scrollTop = 0;
  }

  /* ---- the cube: the scroll walks it through one full revolution,
     dwelling on each face; drag stays free for play ---- */
  cube = new WritingCube(qs('#cube'), ENTRIES, {
    onCell: openCell, wheel: false,
  });
  if (location.search.includes('dbg')) window.__cube = cube;

  const TURN_SEGS = [[0.04, 0.22], [0.29, 0.47], [0.54, 0.72], [0.79, 0.97]];
  const turnAt = (p) => TURN_SEGS.reduce((sum, [a, b]) => sum + seg(p, a, b, easeInOut), 0) / 4;
  ScrollTrigger.create({
    trigger: '#cube-pin',
    start: 'top top',
    end: 'bottom bottom',
    scrub: true,
    onUpdate: (self) => cube.setScrollTurn(turnAt(self.progress)),
  });

  let last = performance.now();
  gsap.ticker.add(() => {
    const now = performance.now();
    cube.tick(Math.min((now - last) / 1000, 0.1), now / 1000);
    last = now;
  });

  return { cube, setIssueText(batch) {
    issueText = new Map(NEWSDROP.map(({ file }) => [file, batch.get(`content/newsdrop/${file}`)]));
  } };
}

/* ============================================================
   chamber iii — design: the flow of pieces, morphed by GL
   ============================================================ */
const M = 'images/mythopoeic/';
const H = 'images/';
const D = 'images/design/';
const PIECES = [
  { img: D + 'desert-swag/withcar.webp', ar: 1.7773, eyebrow: 'Desert Swag' },
  { img: D + 'desert-swag/all-tied-up-beige.webp', ar: 0.9036, eyebrow: 'Desert Swag' },
  { img: D + 'desert-swag/beige-space.webp', ar: 0.7999, eyebrow: 'Desert Swag' },
  { img: D + 'desert-swag/double-view.webp', ar: 1.7778, eyebrow: 'Desert Swag' },
  { img: D + 'desert-swag/hill-grmen-beige.webp', ar: 0.8000, eyebrow: 'Desert Swag' },
  { img: D + 'desert-swag/rearview-beige.webp', ar: 1.7768, eyebrow: 'Desert Swag' },
  { img: M + 'hero1.webp', ar: 1.7778, eyebrow: 'Mythopoeic', text: 'A luxury brand that never existed, conjured whole with AI.', link: 'projects/mythopoeic/' },
  { img: D + 'mythmood.webp', ar: 1.7778, eyebrow: 'Mythopoeic', text: 'Editorial worlds, dreamed from salt flats and moonlight.' },
  { img: D + 'myh.webp', ar: 1.7877, eyebrow: 'Mythopoeic' },
  { img: M + 'hero3.webp', ar: 1.7778, eyebrow: 'Mythopoeic' },
  { img: M + 'hero4.webp', ar: 1.7844, eyebrow: 'Mythopoeic' },
  { img: D + 'doubleview.webp', ar: 2.0000, eyebrow: 'Mythopoeic' },
  { img: M + 'hero6.webp', ar: 1.5190, eyebrow: 'Mythopoeic' },
  { img: M + 'bracelet-showcase.webp', ar: 1.7778, eyebrow: 'Mythopoeic' },
  { img: D + 'mytho12.webp', ar: 1.7877, eyebrow: 'Mythopoeic', text: 'Copper and labradorite; the house materials.' },
  { img: M + 'necklace-showcase-1.webp', ar: 1.7778, eyebrow: 'Mythopoeic' },
  { img: M + 'necklace-showcase--on-model.webp', ar: 1.0000, eyebrow: 'Mythopoeic' },
  { img: M + 'product-showcase-all-2.webp', ar: 1.2414, eyebrow: 'Mythopoeic' },
  { img: M + 'product-erf---rings.webp', ar: 1.7897, eyebrow: 'Mythopoeic' },
  { img: D + 'rhino-rider.webp', ar: 1.7778, eyebrow: 'Mythopoeic', text: 'The brand extends into fauna, myth and landscape.' },
  { img: M + 'rhino.webp', ar: 1.7778, eyebrow: 'Mythopoeic' },
  { img: H + 'healthtech-design0B.webp', ar: 2.0000, eyebrow: 'EduTalkz · TravelMedz · TwinTech', text: 'Brand identities and visual systems for three healthtech startups.', link: 'projects/healthtech/' },
  { img: D + 'herobanner.webp', ar: 1.6961, eyebrow: 'EduTalkz' },
  { img: H + 'healthtech-design0C.webp', ar: 0.7459, eyebrow: 'Healthtech identities' },
  { img: H + 'healthtech-design2.webp', ar: 0.6667, eyebrow: 'Healthtech identities' },
  { img: H + 'healthtech-design3.webp', ar: 0.6667, eyebrow: 'Healthtech identities' },
  { img: H + 'healthtech-design7.webp', ar: 1.7844, eyebrow: 'Healthtech identities' },
  { img: H + 'healthtech-design9.webp', ar: 1.7778, eyebrow: 'Healthtech identities', text: 'Complex science, kept approachable; AI-first, at a fraction of the cost.' },
  { img: H + 'healthtech-design10.webp', ar: 1.5947, eyebrow: 'Healthtech identities' },
  { img: H + 'healthtech-design13.webp', ar: 1.7844, eyebrow: 'Healthtech identities' },
  { img: D + 'lookbookv2.webp', ar: 0.5320, eyebrow: 'Mikey · brand identity', text: 'Wordmark, monogram and mark system for the Mikey film brand.' },
  { img: D + 'cars.webp', ar: 3.3333, eyebrow: 'Automotive', text: 'Concept showroom visualisation.' },
];


/* One ground tone per board, taken at build time from that picture's most
   chromatic mid-tone and mapped into a dark band. ground.js walks between
   them as the boards pass, so the room is lit by whatever is hanging in it.
   Same order as PIECES. */
export const PIECE_TONES = [
  '#39342a', '#352b20', '#3c3228', '#433e3b', '#28201b', '#3c3226',
  '#1e2d25', '#5d3c20', '#5d3519', '#312115', '#2e2519', '#2f2017', '#1f2b2e', '#342f23', '#434a31', '#19425d', '#40482b', '#13333c', '#3a271b', '#56351c', '#1c3738', '#322d1f', '#35261c', '#433625', '#27514e', '#26564a', '#28363c', '#314940', '#2c3d41', '#273f49', '#133d3e', '#1d232c',
];

export function initDesignSection() {
  const flow = qs('#design-flow');
  for (const piece of PIECES) {
    const sec = document.createElement('section');
    sec.className = 'design-piece';
    /* every board is framed at its own proportion (measured at build time
       and written into PIECES), so neither the plain image nor the GL plane
       ever has to crop it to fit a slot */
    sec.style.setProperty('--ar', String(piece.ar));
    const hasCopy = piece.text || piece.link;
    sec.innerHTML = `
      <div class="piece-media"><img src="${piece.img}" alt="${piece.eyebrow}" loading="lazy"></div>
      <div class="piece-caption">
        <span class="piece-eyebrow">${piece.eyebrow}</span>
        ${hasCopy ? `<div class="piece-copy">
          ${piece.text ? `<p>${piece.text}</p>` : ''}
          ${piece.link ? `<a href="${piece.link}">See the project &rarr;</a>` : ''}
        </div>` : ''}
      </div>`;
    flow.appendChild(sec);
    ScrollTrigger.create({
      trigger: sec, start: 'top 82%',
      onEnter: () => sec.classList.add('is-revealed'),
    });
  }
  /* ---- the drift: no two pieces cross the frame the same way ----
     Twenty-six boards stacked down a single column all travel in the same
     direction at the same speed, and the eye stops reading them. Each piece
     is given one of four passes instead, cycling on a 7-long pattern so the
     run never falls into an obvious rhythm: two lateral sweeps in opposite
     directions, a counter-drift that rises against the scroll, and a hold
     that simply comes forward. The travel is scrubbed off each section's own
     position, so it reverses cleanly and costs nothing when still.

     Only translate and scale: the GL planes bind to these elements by their
     bounding rects, and a rotation would put the texture out of register. */
  const MOVES = [
    { x:  22, y:  0,   s: 0.94 },   // sweeps in from the west
    { x: -22, y:  0,   s: 0.94 },   // and the next one answers from the east
    { x:   0, y: -9,   s: 0.97 },   // rises against the scroll
    { x:  13, y:  5,   s: 0.92 },   // a shallow diagonal
    { x: -30, y:  0,   s: 0.96 },   // a wider throw, the other way
    { x:   0, y:  0,   s: 0.88 },   // holds, and comes forward instead
    { x: -14, y: -6,   s: 0.95 },
  ];
  const pieceEls = qsa('.design-piece', flow);
  if (!REDUCED_MOTION) {
    gsap.ticker.add(() => {
      // a phone has no margin to sweep through: the lateral passes shrink to
      // a lean, so no board or caption is ever pushed off the glass
      const xk = innerWidth < 700 ? 0.12 : 1;
      for (let i = 0; i < pieceEls.length; i++) {
        const sec = pieceEls[i];
        const r = sec.getBoundingClientRect();
        if (r.bottom < -200 || r.top > innerHeight + 200) continue;   // off-frame, leave it
        const m = MOVES[i % MOVES.length];
        // -1 as the piece enters the frame, 0 at centre, +1 as it leaves
        const t = clamp(((innerHeight - r.top) / (innerHeight + r.height)) * 2 - 1, -1, 1);
        const ease = t * (1 - Math.abs(t) * 0.35);      // slows through the middle
        sec.style.setProperty('--tx', `${(m.x * xk * ease).toFixed(2)}vw`);
        sec.style.setProperty('--ty', `${(m.y * ease).toFixed(2)}vh`);
        sec.style.setProperty('--sc', (1 - (1 - m.s) * Math.abs(ease)).toFixed(4));
      }
    });
  }

  // failsafe: never leave a caption masked if a trigger is missed
  addEventListener('load', () => setTimeout(() => {
    qsa('.design-piece').forEach((s) => {
      if (s.getBoundingClientRect().top < innerHeight) s.classList.add('is-revealed');
    });
  }, 800));

  /* GL wakes on approach: until then the plain images stand in, so a
     fast scroller or a deep link never meets an empty frame */
  let engine = null, warming = null;
  function warm(imageLoader) {
    if (warming) return warming;
    if (engine) return Promise.resolve();
    const sections = qsa('.design-piece');
    const glc = document.createElement('canvas');
    glc.id = 'gl-canvas';
    document.body.appendChild(glc);
    engine = new GLPlanes(glc, imageLoader);
    window.__engine = engine;
    if (!engine.enabled) { glc.remove(); return; }

    const planes = [];
    sections.forEach((sec, i) => {
      const media = sec.querySelector('.piece-media');
      const next = PIECES[i + 1];
      planes.push(engine.addPlane(media, {
        srcA: PIECES[i].img,
        srcB: next ? next.img : null,
        ripple: !IS_MOBILE,
        bend: true,
      }));
    });

    let last = performance.now();
    gsap.ticker.add(() => {
      const now = performance.now();
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      // morph driver: as a piece scrolls off, its plane dissolves into the next
      planes.forEach((p, i) => {
        if (!p || !PIECES[i + 1]) return;
        const r = p.el.getBoundingClientRect();
        p.trans = clamp((-r.top + innerHeight * 0.18) / (innerHeight * 0.9), 0, 1);
      });
      engine.render(now / 1000, dt);
    });
    warming = Promise.all(planes.flatMap((p) => [p.texA.ready, p.texB?.ready]))
      .then(() => { if (engine.enabled) document.body.classList.add('gl-on'); })
      .catch((error) => {
        console.warn('[design] Using complete image fallback', error);
        engine.enabled = false;
        glc.remove();
        document.body.classList.remove('gl-on');
      });
    return warming;
  }

  return { warm };
}

/* ============================================================
   the essay beneath the cube: Blood, Books and Bots travels up the
   margin as the scroll turns the cube, from its title entering the
   lit band to its last line leaving it. Its own trigger on the same
   pin, so the cube's scrub and snapping are not touched.
   ============================================================ */
export function initEssayGround() {
  const text = qs('#essay-text');
  const pin = qs('#cube-pin');
  if (!text || !pin) return;
  let p = 0, y = 0, last = performance.now();
  ScrollTrigger.create({
    trigger: pin, start: 'top top', end: 'bottom bottom', scrub: true,
    onUpdate: (self) => { p = self.progress; },
  });
  gsap.ticker.add(() => {
    const now = performance.now();
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    const r = pin.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) return;   // off-frame: rest
    const vh = innerHeight;
    // from the title sitting just under the lit band to the last line
    // passing above it
    const from = vh * 0.62, to = vh * 0.3 - text.offsetHeight;
    const want = from + (to - from) * p;
    y = REDUCED_MOTION ? want : damp(y || want, want, 8, dt);
    text.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0)`;
  });
}
