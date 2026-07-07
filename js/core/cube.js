/* cube.js — the Writing chamber's monolith, now a cube of cubes.
   Six faces, each a 4x4 grid of little tiles: three collections carry
   scattered story titles among blank paper cells, three carry sliced
   marker artwork (moth, mask, moon). Drag rotates with inertia; scroll
   nudges between faces; a titled tile opens its piece, a bare face opens
   the whole collection. */

import { clamp, damp, fromRoot, REDUCED_MOTION } from './util.js';

/* vertical faces around Y: 0 front, 1 right, 2 back, 3 left */
const FACE_ANGLES = [0, -90, -180, -270];
const GRID = 4;                       // 4x4 tiles per face
const CELLS = GRID * GRID;
const MAX_TITLED = CELLS;             // fill the face; every story earns a tile

const GLYPHS = {
  moon: 'assets/journey/moon-5.webp',
  moth: 'assets/journey/moth-full-m.webp',
  mask: 'assets/cards/card-back.webp',
};

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

export class WritingCube {
  constructor(el, faces, { onSelect, onCell }) {
    this.el = el;
    this.content = faces;           // 3 content faces, each with .entries
    this.onSelect = onSelect;
    this.onCell = onCell;
    this.rotY = -16; this.targetY = -16;   // rest on a corner: the cube reads as a cube
    this.rotX = -14; this.targetX = -14;
    this.vel = 0;
    this.dragging = false;
    this.suspended = false;
    this.faceEls = [];              // the four vertical faces, by index
    this.build();
    this.wire();
  }

  size() { return this.el.getBoundingClientRect().width; }

  makeFace(transform) {
    const d = document.createElement('div');
    d.className = 'cube-face';
    d.style.transform = transform;
    this.el.appendChild(d);
    return d;
  }

  /* a content face: a caption strip above a grid of tiles, some carrying
     titles scattered through the paper */
  contentFace(f, index, transform) {
    const d = this.makeFace(transform);
    d.classList.add('is-content');
    d.dataset.kind = 'content';
    d.dataset.index = index;
    d.innerHTML = `
      <span class="face-head">
        <span class="face-eyebrow">${esc(f.eyebrow)}</span>
        <span class="face-name">${esc(f.title)}</span>
      </span>`;
    const grid = document.createElement('div');
    grid.className = 'cube-grid';
    const entries = f.entries || [];
    const titled = shuffleTake(CELLS, Math.min(entries.length, MAX_TITLED));
    let e = 0;
    for (let i = 0; i < CELLS; i++) {
      if (titled.has(i) && entries[e]) {
        const entry = entries[e];
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'cube-cell is-titled';
        b.dataset.entry = e;
        b.setAttribute('aria-label', entry.title);
        b.style.setProperty('--d', `${(i % GRID + (i / GRID | 0)) * 0.02}s`);
        b.innerHTML = `<span class="cell-label">${entry.label ? `<em>${esc(entry.label)}</em> ` : ''}${esc(entry.title)}</span>`;
        grid.appendChild(b);
        e += 1;
      } else {
        const p = document.createElement('div');
        p.className = 'cube-cell is-paper';
        p.setAttribute('aria-hidden', 'true');
        grid.appendChild(p);
      }
    }
    d.appendChild(grid);
    this.faceEls[index] = d;
    return d;
  }

  /* a glyph face: the artwork sliced across sixteen tiles, reassembled
     with hairline gaps and a hover shimmer */
  glyphFace(key, transform, index) {
    const d = this.makeFace(transform);
    d.classList.add('is-glyph');
    d.dataset.kind = 'glyph';
    d.setAttribute('aria-hidden', 'true');
    if (index != null) { d.dataset.index = index; this.faceEls[index] = d; }
    const grid = document.createElement('div');
    grid.className = 'cube-grid is-glyph-grid';
    const url = fromRoot(GLYPHS[key]);
    for (let i = 0; i < CELLS; i++) {
      const col = i % GRID, row = i / GRID | 0;
      const cell = document.createElement('div');
      cell.className = 'cube-cell is-glyph-cell';
      cell.style.backgroundImage = `url('${url}')`;
      cell.style.backgroundPosition = `${(col / (GRID - 1)) * 100}% ${(row / (GRID - 1)) * 100}%`;
      cell.style.setProperty('--d', `${(col + row) * 0.03}s`);
      grid.appendChild(cell);
    }
    d.appendChild(grid);
    return d;
  }

  build() {
    const half = 'calc(var(--size) / 2)';
    const side = (a) => `rotateY(${a}deg) translateZ(${half})`;
    // three collections on the front, right and back faces
    this.content.forEach((f, i) => this.contentFace(f, i, side([0, 90, 180][i])));
    // the moon closes the ring on the left; moth and mask cap the poles
    this.glyphFace('moon', side(270), 3);
    this.glyphFace('moth', `rotateX(90deg) translateZ(${half})`);
    this.glyphFace('mask', `rotateX(-90deg) translateZ(${half})`);
  }

  frontFace() {
    const a = ((this.rotY % 360) + 360) % 360;
    return Math.round(a / 90) % 4 ? (4 - Math.round(a / 90) % 4) % 4 : 0;
  }

  wire() {
    let px = 0, py = 0, sx = 0, sy = 0;
    this.el.parentElement.addEventListener('pointerdown', (e) => {
      this.dragging = true;
      sx = px = e.clientX; sy = py = e.clientY;
      this._wasDrag = false;
      this.vel = 0;
    });
    window.addEventListener('pointermove', (e) => {
      if (!this.dragging) return;
      const dx = e.clientX - px, dy = e.clientY - py;
      px = e.clientX; py = e.clientY;
      this.targetY += dx * 0.35;
      this.rotY += dx * 0.35;
      this.vel = dx * 0.35;
      this.targetX = clamp(this.targetX - dy * 0.12, -30, 16);
    });
    window.addEventListener('pointerup', (e) => {
      if (!this.dragging) return;
      this.dragging = false;
      // straight-line travel decides tap vs drag; a jittery click still selects
      this._wasDrag = Math.hypot(e.clientX - sx, e.clientY - sy) > 9;
      this.targetY = this.rotY + this.vel * 14;
      this.snap();
    });

    this.el.parentElement.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (this.suspended) return;
      this.targetY -= e.deltaY * 0.12;
      clearTimeout(this._settle);
      this._settle = setTimeout(() => this.snap(), 380);
    }, { passive: false });

    // a click on a fronting collection opens a tile or the whole face;
    // a click on a face turned away simply brings it to the front
    this.faceEls.forEach((d, i) => {
      d.addEventListener('click', (e) => {
        if (this.dragging || this._wasDrag) return;
        if (this.frontFace() !== i) { this.rotateToFace(i); return; }
        if (d.dataset.kind !== 'content') return;
        const f = this.content[i];
        const cell = e.target.closest('.cube-cell.is-titled');
        if (cell) this.onCell?.(f.entries[+cell.dataset.entry], f);
        else this.onSelect?.(f, d);
      });
    });

    // holding a hand over the cube stills its sway, so a cell stays put
    // under the cursor long enough to hover and click
    this.el.addEventListener('pointerenter', () => { this.hovering = true; });
    this.el.addEventListener('pointerleave', () => { this.hovering = false; });

    window.addEventListener('keydown', (e) => {
      if (this.suspended) return;
      if (e.key === 'ArrowRight') { this.targetY -= 90; this.snap(); }
      if (e.key === 'ArrowLeft') { this.targetY += 90; this.snap(); }
    });
  }

  rotateToFace(i) {
    const want = FACE_ANGLES[i];
    const delta = (((want - this.targetY) % 360) + 540) % 360 - 180;
    this.targetY += delta;
  }

  snap() { this.targetY = Math.round(this.targetY / 90) * 90; }

  tick(dt, time) {
    if (this.suspended) return;
    // the sway eases away while the hand rests on the cube, and returns after
    const swayTarget = (this.dragging || this.hovering) ? 0 : 1;
    this.swayGain = damp(this.swayGain ?? 1, swayTarget, 5, dt);
    const idle = REDUCED_MOTION ? 0 : Math.sin(time * 0.4) * 1.2 * this.swayGain;
    this.rotY = damp(this.rotY, this.targetY, this.dragging ? 30 : 6, dt);
    this.rotX = damp(this.rotX, this.targetX, 6, dt);
    // a small translate keeps the monolith off dead-centre
    this.el.style.transform =
      `translate3d(-5%, 1%, 0) rotateX(${(this.rotX + idle * 0.4).toFixed(3)}deg) rotateY(${(this.rotY + idle).toFixed(3)}deg)`;
  }
}

/* a scattered set of k distinct tile indices out of n */
function shuffleTake(n, k) {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return new Set(a.slice(0, k));
}
