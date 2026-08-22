/* cards.js — Act VI, the Reading.
   Three cards stand face down on the table behind the triptych. They are
   laid without ceremony, because the ceremony now belongs to the panel:
   as each of its three columns turns, the card behind it turns with it
   (journey.js scrubs --turn from the same band). The chambers live on
   this same scroll, so a chosen card is a shortcut: the doorway ritual
   plays, and under the held black the page teleports to that act. */

import { clamp, fromRoot, qs, qsa, REDUCED_MOTION } from './util.js';

const CARDS = [
  { id: 'film',    title: 'Human Being',    medium: 'Film',    target: '#film',    glyph: 'assets/glyphs/glyph-film.webp' },
  { id: 'writing', title: 'Human Thinking', medium: 'Writing', target: '#writing', glyph: 'assets/glyphs/glyph-writing.webp' },
  { id: 'design',  title: 'Human Doing',    medium: 'Design',  target: '#design',  glyph: 'assets/glyphs/glyph-design.webp' },
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
    /* The cards are simply there, face down, behind the panel. Where the
       triptych cannot run (reduced motion, or a visitor arriving from
       below) they are turned up front, so the table is never a row of
       blanks with no way to open them. */
    const showTurned = instant || REDUCED_MOTION;
    cards.forEach((el, i) => {
      el.classList.add('is-dealt');
      if (showTurned) turn(el, 1);
      if (!instant && REDUCED_MOTION) {
        el.style.opacity = 0;
        gsap.to(el, { opacity: 1, duration: 0.9, delay: i * 0.15, ease: 'power2.out' });
      }
    });
  }

  /* t is 0..1 across the card's own half-revolution; past the halfway
     point it counts as face up, which is what gates hover and opening */
  function turn(el, t) {
    const inner = el.querySelector('.card-3d');
    inner.style.setProperty('--turn', `${(180 * t).toFixed(2)}deg`);
    el.classList.toggle('is-turned', t > 0.5);
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
    const others = cards.filter((x) => x !== el);
    const r = el.getBoundingClientRect();
    const scale = Math.max(window.innerWidth / r.width, window.innerHeight / r.height) * 1.15;
    const tl = gsap.timeline();
    tl.to(others, { y: 90, opacity: 0, duration: 0.5, ease: 'power2.in', stagger: 0.06 }, 0);
    tl.to(el, {
      x: window.innerWidth / 2 - (r.left + r.width / 2),
      y: window.innerHeight / 2 - (r.top + r.height / 2),
      scale: REDUCED_MOTION ? 1 : scale,
      duration: REDUCED_MOTION ? 0.4 : 0.9,
      ease: 'expo.inOut',
    }, 0.1);
    tl.to(veil, { opacity: 1, duration: 0.45, ease: 'power2.in' }, REDUCED_MOTION ? 0.2 : 0.55);
    /* under the held black the page teleports to the chamber, and the
       table quietly resets itself for the way back */
    tl.call(() => {
      const dest = qs(c.target);
      if (dest) {
        window.__lenis?.scrollTo(dest.offsetTop, { immediate: true });
        ScrollTrigger.update();
      }
      gsap.set(others, { y: 0, opacity: 1 });
      gsap.set(el, { x: 0, y: 0, scale: 1 });
      el.classList.remove('is-opening');
    }, [], '+=0.25');
    tl.to(veil, { opacity: 0, duration: 0.8, ease: 'power2.out' }, '+=0.1');
  }

  /* Deal when the table arrives; if the reading already happened this
     session, lay the cards without ceremony. */
  if (sessionStorage.getItem('mw-reading') === 'dealt') {
    // returning visitor in this session: cards are already on the table
    deal(true);
  } else {
    // fire as her offered hands settle at the seam, so she deals to you;
    // a visitor who deep-linked past the table finds it laid on the way back
    ScrollTrigger.create({
      trigger: '#reading-wrap',
      start: 'top 15%',
      onEnter: () => deal(),
      onEnterBack: () => deal(true),
    });
  }

  return { deal, turn, cards };
}
