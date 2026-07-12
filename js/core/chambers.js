/* chambers.js — the three chambers, inlined into the journey.
   Film, writing and design were standalone pages; now they are acts on
   the single scroll. Each init builds its DOM up front, because the page
   needs its true height from the first paint, and defers only the heavy
   lifting: the Mikey frames stream in behind the opener, the GL engine
   wakes as the design flow approaches.
   Reads the classic-script globals PROJECTS, RACK_EXTRAS, WRITING_FACES
   and NEWSDROP, the same way the chamber pages did. */

import { clamp, seg, easeInOut, qs, qsa, IS_MOBILE, REDUCED_MOTION } from './util.js';
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

  /* ---- the films, as full-bleed banners ---- */
  const films = PROJECTS
    .filter((p) => p.chamber === 'film' && p.id !== 'video-archive')
    .sort((a, b) => a.chamberOrder - b.chamberOrder);
  const rel = (path) => path ? path.replace('../../', '') : '';

  const fromProject = (f) => ({
    title: f.title,
    tag: `${f.category} · ${f.index}`,
    poster: rel(f.heroFallback || f.heroImage || (f.gallery && f.gallery[0]) || ''),
    loop: f.rackLoop || '',
    href: `projects/${f.id}/`,
  });
  const fromExtra = (x) => ({
    title: x.title, tag: x.tag,
    poster: x.poster,
    loop: x.loop || '',
    href: x.href, external: !!x.external,
  });

  const banners = [...films.map(fromProject), ...RACK_EXTRAS.map(fromExtra)];
  const wrap = qs('#film-banners');
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
        ${item.loop ? `<video muted loop playsinline preload="none" src="${item.loop}"></video>` : ''}
      </span>
      <span class="banner-caption">
        <span class="banner-num">${String(i + 1).padStart(2, '0')}</span>
        <h3>${item.title}</h3>
        <span class="banner-tag">${item.tag}<em>${item.external ? 'Watch &rarr;' : 'Open &rarr;'}</em></span>
      </span>`;
    wrap.appendChild(el);
    mediaEls.push(el.querySelector('.banner-media'));
  });

  // the More Films door closes the walk
  const more = document.createElement('a');
  more.className = 'film-banner is-more';
  more.href = 'projects/video-archive/';
  more.innerHTML = `
    <span class="banner-caption is-centre">
      <span class="banner-num">${String(banners.length + 1).padStart(2, '0')}</span>
      <h3>More films</h3>
      <span class="banner-tag">The rest of the reel<em>Enter &rarr;</em></span>
    </span>`;
  wrap.appendChild(more);

  // clips wake when their banner holds the frame, and sleep when it leaves
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const v = e.target.querySelector('video');
      if (!v) continue;
      if (e.isIntersecting) v.play().then(() => v.classList.add('is-playing')).catch(() => {});
      else { v.pause(); v.classList.remove('is-playing'); }
    }
  }, { threshold: 0.5 });
  wrap.querySelectorAll('.film-banner').forEach((b) => io.observe(b));

  /* ---- frame loop: the scrub, and the scroll-velocity warp that glues
     the films to the journey ---- */
  let last = performance.now();
  let sVel = 0;
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

    // the warp: momentum stretches and shears whichever film owns the frame
    if (REDUCED_MOTION) return;
    sVel += ((lenis.velocity || 0) - sVel) * (1 - Math.exp(-8 * dt));
    const stretch = clamp(Math.abs(sVel) * 0.0012, 0, 0.045);
    const shear = clamp(sVel * 0.05, -1.6, 1.6);
    for (const m of mediaEls) {
      const r = m.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) continue;
      m.style.transform = `scaleY(${(1 + stretch).toFixed(4)}) skewX(${shear.toFixed(3)}deg)`;
    }
  });

  /* the frames stream in the background; idempotent, so the streaming
     chain and the on-approach backstop can both call it */
  let loading = null;
  const preload = () => loading ??= scrubber.preload().then(() => scrubber.draw(true));

  return { scrubber, preload };
}

/* ============================================================
   chamber ii — writing: the cube, turned by the scroll
   ============================================================ */
export function initWritingSection(lenis) {
  const plane = qs('#reading-plane');
  const inner = qs('#plane-inner');
  const closeBtn = qs('#plane-close');
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

  const faces = WRITING_FACES.map((f) => ({
    ...f,
    count: f.type === 'newsdrop'
      ? `${NEWSDROP.length} issues, growing weekly`
      : `${f.items.length} ${f.items.length === 1 ? 'piece' : 'pieces'}`,
    entries: f.type === 'newsdrop'
      ? NEWSDROP.map((it) => ({ label: `#${it.n}`, title: it.title, kind: 'issue', file: it.file, n: it.n, date: it.date }))
      : f.items.map((s) => ({ title: s.title, kind: 'story', url: s.url })),
  }));

  /* ---- the reading plane; the page's scroll rests while it is open ---- */
  let cube;
  function openPlane(face) {
    cube.suspended = true;
    lenis.stop();
    plane.classList.add('is-open');
    plane.setAttribute('aria-hidden', 'false');
    closeBtn.hidden = false;
    plane.scrollTop = 0;
    if (face.type === 'newsdrop') renderIssueList(face);
    else renderStories(face);
    closeBtn.focus();
  }
  function closePlane() {
    plane.classList.remove('is-open');
    plane.setAttribute('aria-hidden', 'true');
    closeBtn.hidden = true;
    cube.suspended = false;
    lenis.start();
  }
  /* a single tile: an issue opens straight to its reading view, a story
     opens in its own tab */
  function openCell(entry, face) {
    if (entry.kind === 'issue') {
      cube.suspended = true;
      lenis.stop();
      plane.classList.add('is-open');
      plane.setAttribute('aria-hidden', 'false');
      closeBtn.hidden = false;
      plane.scrollTop = 0;
      openIssue({ file: entry.file, n: entry.n, date: entry.date, title: entry.title });
      closeBtn.focus();
    } else {
      window.open(entry.url, '_blank', 'noopener');
    }
  }
  closeBtn.addEventListener('click', () => {
    // step back through the plane's own states before closing
    if (inner.dataset.view === 'issue') renderIssueList(faces[0]);
    else closePlane();
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && plane.classList.contains('is-open')) closeBtn.click();
  });

  function renderStories(face) {
    inner.dataset.view = 'list';
    inner.innerHTML = `
      <p class="plane-eyebrow">${face.eyebrow}</p>
      <ul class="issue-list">
        ${face.items.map((s) => `
          <li>
            <a href="${s.url}" target="_blank" rel="noopener">
              <span class="issue-title">${esc(s.title)}</span>
              <span class="issue-date">read &rarr;</span>
            </a>
            <p class="issue-excerpt">${esc(s.excerpt)}</p>
          </li>`).join('')}
      </ul>`;
  }

  function renderIssueList() {
    inner.dataset.view = 'list';
    inner.innerHTML = `
      <p class="plane-eyebrow">The News Drop · the weekly AI dispatch</p>
      <ul class="issue-list">
        ${NEWSDROP.map((it) => `
          <li>
            <button data-file="${it.file}" data-n="${it.n}" data-date="${it.date}" data-title="${esc(it.title)}">
              <span class="issue-num">#${it.n}</span>
              <span class="issue-title">${esc(it.title)}</span>
              <span class="issue-date">${it.date}</span>
            </button>
          </li>`).join('')}
      </ul>`;
    inner.querySelectorAll('button[data-file]').forEach((b) => {
      b.addEventListener('click', () => openIssue(b.dataset));
    });
  }

  /* an issue opens as a clean typographic reading view from plain text */
  async function openIssue({ file, n, date, title }) {
    inner.dataset.view = 'issue';
    inner.innerHTML = `<p class="plane-eyebrow">Fetching issue ${n}&hellip;</p>`;
    let text = '';
    try {
      text = await (await fetch(`content/newsdrop/${file}`)).text();
    } catch {
      inner.innerHTML = `<p class="plane-eyebrow">This issue would not be summoned. Try again.</p>`;
      return;
    }
    const lines = text.split('\n');
    const bodyLines = lines.slice(1);
    const paras = bodyLines.join('\n').split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean);
    const emojiLead = /^[^\w\s"'‘“(]/u;
    const html = paras.map((p) => {
      const clean = esc(p).replace(/\s*(→|->) ?LINK\.?/g, '');
      const lines = clean.split('\n');
      const first = lines[0].trim();
      let out = '';
      if (first.length < 80 && emojiLead.test(p) && !/^[.…]/.test(p)) {
        out += `<p class="drop-heading">${first}</p>`;
        lines.shift();
      }
      if (lines.length) out += `<p>${lines.join('<br>')}</p>`;
      return out;
    }).join('');
    inner.innerHTML = `
      <div class="issue-body">
        <button class="plane-close back-to-list" style="position:static">&larr; All issues</button>
        <h1>${esc(title)}</h1>
        <p class="issue-meta">The News Drop #${n} · ${date}</p>
        ${html}
      </div>`;
    inner.querySelector('.back-to-list').addEventListener('click', renderIssueList);
    plane.scrollTop = 0;
  }

  /* ---- the cube: the scroll walks it through one full revolution,
     dwelling on each face; drag stays free for play ---- */
  cube = new WritingCube(qs('#cube'), faces, {
    onSelect: openPlane, onCell: openCell, wheel: false,
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

  return { cube };
}

/* ============================================================
   chamber iii — design: the flow of pieces, morphed by GL
   ============================================================ */
const M = 'images/mythopoeic/';
const H = 'images/';
const D = 'images/design/';
const PIECES = [
  { img: M + 'hero1.webp', eyebrow: 'Mythopoeic', text: 'A luxury brand that never existed, conjured whole with AI.', link: 'projects/mythopoeic/' },
  { img: D + 'mythmood.webp', eyebrow: 'Mythopoeic', text: 'Editorial worlds, dreamed from salt flats and moonlight.' },
  { img: D + 'myh.webp', eyebrow: 'Mythopoeic' },
  { img: M + 'hero3.webp', eyebrow: 'Mythopoeic' },
  { img: M + 'hero4.webp', eyebrow: 'Mythopoeic' },
  { img: D + 'doubleview.webp', eyebrow: 'Mythopoeic' },
  { img: M + 'hero6.webp', eyebrow: 'Mythopoeic' },
  { img: M + 'bracelet-showcase.webp', eyebrow: 'Mythopoeic' },
  { img: D + 'mytho12.webp', eyebrow: 'Mythopoeic', text: 'Copper and labradorite; the house materials.' },
  { img: M + 'necklace-showcase-1.webp', eyebrow: 'Mythopoeic' },
  { img: M + 'necklace-showcase--on-model.webp', eyebrow: 'Mythopoeic' },
  { img: M + 'product-showcase-all-2.webp', eyebrow: 'Mythopoeic' },
  { img: M + 'product-erf---rings.webp', eyebrow: 'Mythopoeic' },
  { img: D + 'rhino-rider.webp', eyebrow: 'Mythopoeic', text: 'The brand extends into fauna, myth and landscape.' },
  { img: M + 'rhino.webp', eyebrow: 'Mythopoeic' },
  { img: H + 'healthtech-design0B.webp', eyebrow: 'EduTalkz · TravelMedz · TwinTech', text: 'Brand identities and visual systems for three healthtech startups.', link: 'projects/healthtech/' },
  { img: D + 'herobanner.webp', eyebrow: 'EduTalkz' },
  { img: H + 'healthtech-design0C.webp', eyebrow: 'Healthtech identities' },
  { img: H + 'healthtech-design2.webp', eyebrow: 'Healthtech identities' },
  { img: H + 'healthtech-design3.webp', eyebrow: 'Healthtech identities' },
  { img: H + 'healthtech-design7.webp', eyebrow: 'Healthtech identities' },
  { img: H + 'healthtech-design9.webp', eyebrow: 'Healthtech identities', text: 'Complex science, kept approachable; AI-first, at a fraction of the cost.' },
  { img: H + 'healthtech-design10.webp', eyebrow: 'Healthtech identities' },
  { img: H + 'healthtech-design13.webp', eyebrow: 'Healthtech identities' },
  { img: D + 'lookbookv2.webp', eyebrow: 'Mikey · brand identity', portrait: true, text: 'Wordmark, monogram and mark system for the Mikey film brand.' },
  { img: D + 'cars.webp', eyebrow: 'Automotive', text: 'Concept showroom visualisation.' },
];

export function initDesignSection() {
  const flow = qs('#design-flow');
  for (const piece of PIECES) {
    const sec = document.createElement('section');
    sec.className = 'design-piece' + (piece.portrait ? ' is-portrait' : '');
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
  // failsafe: never leave a caption masked if a trigger is missed
  addEventListener('load', () => setTimeout(() => {
    qsa('.design-piece').forEach((s) => {
      if (s.getBoundingClientRect().top < innerHeight) s.classList.add('is-revealed');
    });
  }, 800));

  /* GL wakes on approach: until then the plain images stand in, so a
     fast scroller or a deep link never meets an empty frame */
  let engine = null;
  function warm() {
    if (engine) return;
    const sections = qsa('.design-piece');
    const glc = document.createElement('canvas');
    glc.id = 'gl-canvas';
    document.body.appendChild(glc);
    engine = new GLPlanes(glc);
    window.__engine = engine;
    if (!engine.enabled) { glc.remove(); return; }
    document.body.classList.add('gl-on');
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
  }

  return { warm };
}
