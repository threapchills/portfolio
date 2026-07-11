/* cards.js — Act VI, the Reading.
   Three cards dealt face down onto the table, turned to reveal their
   glyphs. A chosen card becomes the doorway into its chamber. */

import { clamp, fromRoot, qs, qsa, REDUCED_MOTION } from './util.js';

const CARDS = [
  { id: 'film',    title: 'Human Being',    medium: 'Film',    href: 'film/',    glyph: 'assets/glyphs/glyph-film.webp' },
  { id: 'writing', title: 'Human Thinking', medium: 'Writing', href: 'writing/', glyph: 'assets/glyphs/glyph-writing.webp' },
  { id: 'design',  title: 'Human Doing',    medium: 'Design',  href: 'design/',  glyph: 'assets/glyphs/glyph-design.webp' },
];

export function initReading() {
  const table = qs('#card-table');
  const veil = qs('#doorway-veil');
  let dealt = false;

  for (const c of CARDS) {
    const el = document.createElement('button');
    el.className = 'card';
    el.dataset.card = c.id;
    el.setAttribute('aria-label', `${c.title} (${c.medium}): enter the chamber`);
    el.innerHTML = `
      <span class="card-3d">
        <span class="card-face card-face-back"
              style="background-image:url('${fromRoot('assets/cards/card-back.webp')}')"></span>
        <span class="card-face card-face-front">
          <img class="card-glyph" src="${fromRoot(c.glyph)}" alt="" draggable="false">
          <span class="card-glint"></span>
        </span>
      </span>
      <span class="card-title">${c.title}<span class="card-medium">${c.medium}</span></span>`;
    table.appendChild(el);
    wireHover(el);
    el.addEventListener('click', () => openDoorway(el, c));
  }

  const cards = qsa('.card', table);

  function deal(instant = false) {
    if (dealt) return;
    dealt = true;
    sessionStorage.setItem('mw-reading', 'dealt');
    if (instant || REDUCED_MOTION) {
      // reduced motion: the deal becomes a fade-in
      cards.forEach((el, i) => {
        el.classList.add('is-dealt', 'is-turned');
        if (!instant) {
          el.style.opacity = 0;
          gsap.to(el, { opacity: 1, duration: 0.9, delay: i * 0.15, ease: 'power2.out' });
        }
      });
      return;
    }
    /* the goddess deals: the film beneath ends on her offered hands at the
       bottom of the frame, so the cards gather there and rise into place */
    const tr = table.getBoundingClientRect();
    const tl = gsap.timeline();
    cards.forEach((el, i) => {
      const r = el.getBoundingClientRect();
      const fromX = (tr.left + tr.width / 2) - (r.left + r.width / 2);
      tl.fromTo(el,
        { x: fromX, y: window.innerHeight * 0.6, scale: 0.6, rotation: (i - 1) * -12, opacity: 0 },
        {
          x: 0, y: 0, scale: 1, opacity: 1,
          rotation: (i - 1) * 2.2,           // settle with a hint of overshoot
          duration: 0.9,
          ease: 'power3.out',
          onStart: () => el.classList.add('is-dealt'),
        }, i * 0.16);
      // the turn lives in CSS so the hover tilt keeps working afterwards
      tl.call(() => {
        el.classList.add('is-turning', 'is-turned');
        setTimeout(() => el.classList.remove('is-turning'), 700);
      }, [], 1.05 + i * 0.14);
    });
  }

  function wireHover(el) {
    const inner = el.querySelector('.card-3d');
    el.addEventListener('pointermove', (e) => {
      if (!el.classList.contains('is-turned') || el.classList.contains('is-opening')) return;
      const r = el.getBoundingClientRect();
      const nx = clamp((e.clientX - r.left) / r.width, 0, 1) * 2 - 1;
      const ny = clamp((e.clientY - r.top) / r.height, 0, 1) * 2 - 1;
      inner.style.setProperty('--tiltX', `${(-ny * 8).toFixed(2)}deg`);
      inner.style.setProperty('--tiltY', `${(nx * 8).toFixed(2)}deg`);
      inner.style.setProperty('--glintX', `${(nx * 60 + 50).toFixed(1)}%`);
    });
    el.addEventListener('pointerleave', () => {
      inner.style.setProperty('--tiltX', '0deg');
      inner.style.setProperty('--tiltY', '0deg');
    });
  }

  function openDoorway(el, c) {
    if (!el.classList.contains('is-turned') || qs('.is-opening', table)) return;
    el.classList.add('is-opening');
    sessionStorage.setItem('mw-return', '0');
    const others = cards.filter((x) => x !== el);
    const r = el.getBoundingClientRect();
    const scale = Math.max(window.innerWidth / r.width, window.innerHeight / r.height) * 1.15;
    const tl = gsap.timeline({
      onComplete: () => { location.href = fromRoot(c.href); },
    });
    tl.to(others, { y: 90, opacity: 0, duration: 0.5, ease: 'power2.in', stagger: 0.06 }, 0);
    tl.to(el, {
      x: window.innerWidth / 2 - (r.left + r.width / 2),
      y: window.innerHeight / 2 - (r.top + r.height / 2),
      scale: REDUCED_MOTION ? 1 : scale,
      duration: REDUCED_MOTION ? 0.4 : 0.9,
      ease: 'expo.inOut',
    }, 0.1);
    tl.to(veil, { opacity: 1, duration: 0.45, ease: 'power2.in' }, REDUCED_MOTION ? 0.2 : 0.55);
    tl.to({}, { duration: 0.3 });   // held black so the cut is invisible
  }

  /* Deal when the table arrives; if the reading already happened this
     session, lay the cards without ceremony. */
  if (sessionStorage.getItem('mw-reading') === 'dealt') {
    // returning visitor in this session: cards are already on the table
    deal(true);
  } else {
    // fire as her offered hands settle at the seam, so she deals to you
    ScrollTrigger.create({
      trigger: '#reading-wrap',
      start: 'top 15%',
      onEnter: () => deal(),
    });
  }

  return { deal };
}
