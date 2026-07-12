/* cube.js — the Writing chamber's monolith, now a cube of cubes.
   Six faces, each a 4x4 grid of little tiles: three collections carry
   scattered story titles among blank paper cells, three carry sliced
   marker artwork (moth above, owl below, moon abeam). Drag tumbles it
   freely on both axes; on the journey the page's own scroll walks it
   through a full revolution (setScrollTurn), while standalone the wheel
   realigns it; a titled tile opens its piece, a bare face opens the
   whole collection. */

import { clamp, damp, fromRoot, REDUCED_MOTION } from './util.js';

/* vertical faces around Y: 0 front, 1 right, 2 back, 3 left */
const FACE_ANGLES = [0, -90, -180, -270];
const REST_X = -14;                   // the resting tilt: the cube reads as a cube
const REST_Y = -16;                   // rest on a corner: the cube reads as a cube
const GRID = 4;                       // 4x4 tiles per face
const CELLS = GRID * GRID;
const MAX_TITLED = CELLS;             // fill the face; every story earns a tile

const GLYPHS = {
  moon: 'assets/journey/moon-5.webp',
  moth: 'assets/journey/moth-full-m.webp',
  owl:  'assets/journey/owl1.webp',
};

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

export class WritingCube {
  constructor(el, faces, { onSelect, onCell, wheel = true }) {
    this.el = el;
    this.content = faces;           // 3 content faces, each with .entries
    this.onSelect = onSelect;
    this.onCell = onCell;
    this._wheelEnabled = wheel;     // off when the page's own scroll drives the turn
    this.rotY = REST_Y; this.targetY = REST_Y;
    this.rotX = REST_X; this.targetX = REST_X;
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
    // the moon closes the ring on the left; the moth and the owl cap the poles
    this.glyphFace('moon', side(270), 3);
    this.glyphFace('moth', `rotateX(90deg) translateZ(${half})`);
    this.glyphFace('owl', `rotateX(-90deg) translateZ(${half})`);
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
      // free tumble: the poles are reachable, the wheel is the way home
      this.targetX -= dy * 0.35;
      this.rotX -= dy * 0.35;
    });
    window.addEventListener('pointerup', (e) => {
      if (!this.dragging) return;
      this.dragging = false;
      // straight-line travel decides tap vs drag; a jittery click still selects
      this._wasDrag = Math.hypot(e.clientX - sx, e.clientY - sy) > 9;
      this.targetY = this.rotY + this.vel * 14;
      this.snap();
    });

    if (this._wheelEnabled) {
      this.el.parentElement.addEventListener('wheel', (e) => {
        e.preventDefault();
        if (this.suspended) return;
        this.targetY -= e.deltaY * 0.12;
        // the wheel realigns: X eases home so the story faces read again
        this.targetX = REST_X + Math.round((this.targetX - REST_X) / 360) * 360;
        clearTimeout(this._settle);
        this._settle = setTimeout(() => this.snap(), 380);
      }, { passive: false });
    }

    // Resolve clicks against the tiles' projected rects rather than the
    // browser's hit-test target: a face brought to the front by a 90° turn
    // (Commentary, the moon) does not hit-test reliably under preserve-3d,
    // so the click lands on the container instead of the tile. The rects
    // stay accurate, so we pick the tile ourselves.
    this.el.parentElement.addEventListener('click', (e) => {
      if (this.dragging || this._wasDrag || !this.usable()) return;
      const d = this.faceEls[this.frontFace()];
      if (!d || d.dataset.kind !== 'content') return;
      const x = e.clientX, y = e.clientY;
      const fr = d.getBoundingClientRect();
      if (x < fr.left || x > fr.right || y < fr.top || y > fr.bottom) return;  // off the cube
      const f = this.content[+d.dataset.index];
      let picked = null;
      for (const cell of d.querySelectorAll('.cube-cell.is-titled')) {
        const r = cell.getBoundingClientRect();
        if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) { picked = cell; break; }
      }
      if (picked) this.onCell?.(f.entries[+picked.dataset.entry], f);
      else this.onSelect?.(f, d);
    });

    // track the pointer so the tick can glow the tile beneath it; :hover
    // cannot fire on the 90° face, so we paint the glow ourselves
    this.el.parentElement.addEventListener('pointermove', (e) => {
      this._px = e.clientX; this._py = e.clientY; this._inScene = true;
    });
    this.el.parentElement.addEventListener('pointerleave', () => { this._inScene = false; });

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

  /* scroll drive: f is the eased fraction of one full revolution. The
     scroll owns the tour; any whole revolutions the hand added while
     playing are kept, so a drag never fights the page. */
  setScrollTurn(f) {
    const base = REST_Y - 360 * f;
    this.targetY = base + Math.round((this.targetY - base) / 360) * 360;
    if (!this.dragging) {
      this.targetX = REST_X + Math.round((this.targetX - REST_X) / 360) * 360;
    }
  }

  snap() {
    this.targetY = Math.round(this.targetY / 90) * 90;
    // X settles flat on a pole if left there, else eases to the resting tilt
    const nx = Math.round(this.targetX / 90) * 90;
    this.targetX = nx % 180 === 0 ? nx + REST_X : nx;
  }

  /* the story faces are only clickable while the ring is roughly upright */
  usable() {
    const nx = (((this.rotX - REST_X) % 360) + 540) % 360 - 180;
    return Math.abs(nx) < 55;
  }

  tick(dt, time) {
    if (this.suspended) return;
    // the sway eases away while the hand rests on the cube, and returns after
    const swayTarget = (this.dragging || this.hovering) ? 0 : 1;
    this.swayGain = damp(this.swayGain ?? 1, swayTarget, 5, dt);
    const idle = REDUCED_MOTION ? 0 : Math.sin(time * 0.4) * 1.2 * this.swayGain;
    // cursor-follow lean: the cube tips toward the hand as it passes over, a
    // soft morph in place of the GL warp a 3D cube cannot take
    let lx = 0, ly = 0;
    if (this.hovering && !this.dragging && !REDUCED_MOTION && this._px != null) {
      ly = ((this._px / window.innerWidth) - 0.5) * 12;
      lx = -((this._py / window.innerHeight) - 0.5) * 9;
    }
    this.leanX = damp(this.leanX ?? 0, lx, 6, dt);
    this.leanY = damp(this.leanY ?? 0, ly, 6, dt);
    this.rotY = damp(this.rotY, this.targetY, this.dragging ? 30 : 6, dt);
    this.rotX = damp(this.rotX, this.targetX, 6, dt);
    // a small translate keeps the monolith off dead-centre
    this.el.style.transform =
      `translate3d(-5%, 1%, 0) rotateX(${(this.rotX + idle * 0.4 + this.leanX).toFixed(3)}deg) rotateY(${(this.rotY + idle + this.leanY).toFixed(3)}deg)`;
    this.updateHover();
  }

  /* glow the titled tile under the pointer on the fronting collection, since
     :hover cannot fire on the 90° face */
  updateHover() {
    let over = null, onCube = false;
    if (this._inScene && !this.dragging && this.usable()) {
      const d = this.faceEls[this.frontFace()];
      if (d) {
        const x = this._px, y = this._py;
        const fr = d.getBoundingClientRect();
        onCube = x >= fr.left && x <= fr.right && y >= fr.top && y <= fr.bottom;
        if (onCube && d.dataset.kind === 'content') {
          for (const cell of d.querySelectorAll('.cube-cell.is-titled')) {
            const r = cell.getBoundingClientRect();
            if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) { over = cell; break; }
          }
        }
      }
    }
    // still the sway whenever the hand is over the cube, for any face: the
    // ±90° face never fires pointerenter, so we judge it by the rect instead
    this.hovering = onCube;
    if (over !== this._hovered) {
      this._hovered?.classList.remove('is-hover');
      over?.classList.add('is-hover');
      this._hovered = over;
    }
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
