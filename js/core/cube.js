/* cube.js — the Writing chamber's monolith.
   Six faces, each one of the painted panels cut into nine tiles. The
   writing is scattered across all six without regard to genre or order:
   a piece can be anywhere, which is how you actually find things in a
   body of work. Drag tumbles it freely on both axes; on the journey the
   page's own scroll walks it through a full revolution (setScrollTurn),
   while standalone the wheel realigns it. A tile carrying a title opens
   that piece; bare tiles open the whole index.
   Reads the classic-script global WRITING_FACES via the entries handed
   in by chambers.js. */

import { clamp, damp, fromRoot, REDUCED_MOTION } from './util.js';

/* vertical faces around Y: 0 front, 1 right, 2 back, 3 left */
const FACE_ANGLES = [0, -90, -180, -270];
const REST_X = -14;                   // the resting tilt: the cube reads as a cube
const REST_Y = -16;                   // rest on a corner: the cube reads as a cube
/* Nine tiles, not sixteen. Fewer and larger, so each face reads as one
   painting broken into pieces rather than as a grid of chips, and so a
   title has room to sit without shrinking to nothing. */
const GRID = 3;
const CELLS = GRID * GRID;

/* the six panels, in turn order: four around the ring, then the poles */
const PANELS = [
  'assets/cube/council.webp',
  'assets/cube/goat.webp',
  'assets/cube/deities.webp',
  'assets/cube/anubis.webp',
  'assets/cube/baobab.webp',   // the lid
  'assets/cube/eclipse.webp',  // the floor
];

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

export class WritingCube {
  constructor(el, entries, { onSelect, onCell, wheel = true }) {
    this.el = el;
    this.all = entries;             // every piece of writing, one flat list
    /* Dealt round the six faces in turn, so no face is empty and no face
       is crowded. Which face a piece lands on carries no meaning; that is
       the point. Finding one is a matter of turning the thing over. */
    this.byFace = Array.from({ length: 6 }, () => []);
    entries.forEach((e, i) => this.byFace[i % 6].push(e));
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

  /* Every face is one of the panels cut into nine. A tile either carries a
     piece of writing or is left as bare painting; the bare ones are the
     breathing room that lets the titled ones read. */
  panelFace(index, transform) {
    const d = this.makeFace(transform);
    d.classList.add('is-panel');
    d.dataset.kind = 'panel';
    d.dataset.index = index;
    const grid = document.createElement('div');
    grid.className = 'cube-grid';
    const url = fromRoot(PANELS[index]);
    const mine = this.byFace[index] || [];
    let taken = 0;
    const slots = shuffleTake(CELLS, mine.length, index);
    for (let i = 0; i < CELLS; i++) {
      const col = i % GRID, row = (i / GRID) | 0;
      const entry = slots.has(i) ? mine[taken++] : null;
      const cell = document.createElement(entry ? 'button' : 'div');
      cell.className = 'cube-cell' + (entry ? ' is-titled' : '');
      // the panel is sliced across the nine, so the face reassembles whole
      cell.style.backgroundImage = `url('${url}')`;
      cell.style.backgroundPosition =
        `${(col / (GRID - 1)) * 100}% ${(row / (GRID - 1)) * 100}%`;
      cell.style.setProperty('--d', `${(col + row) * 0.035}s`);
      if (entry) {
        cell.type = 'button';
        cell.dataset.entry = this.all.indexOf(entry);
        cell.setAttribute('aria-label', entry.title);
        cell.innerHTML =
          `<span class="cell-label">${entry.label ? `<em>${esc(entry.label)}</em> ` : ''}${esc(entry.title)}</span>`;
      } else {
        cell.setAttribute('aria-hidden', 'true');
      }
      grid.appendChild(cell);
    }
    d.appendChild(grid);
    this.faceEls[index] = d;
    return d;
  }

  build() {
    const half = 'calc(var(--size) / 2)';
    const side = (a) => `rotateY(${a}deg) translateZ(${half})`;
    // four panels around the ring, in the order the scroll turns them
    [0, 90, 180, 270].forEach((a, i) => this.panelFace(i, side(a)));
    // and two more capping the poles, reachable by dragging up or down
    this.panelFace(4, `rotateX(90deg) translateZ(${half})`);
    this.panelFace(5, `rotateX(-90deg) translateZ(${half})`);
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
      if (!d) return;
      const x = e.clientX, y = e.clientY;
      const fr = d.getBoundingClientRect();
      if (x < fr.left || x > fr.right || y < fr.top || y > fr.bottom) return;  // off the cube
      let picked = null;
      for (const cell of d.querySelectorAll('.cube-cell.is-titled')) {
        const r = cell.getBoundingClientRect();
        if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) { picked = cell; break; }
      }
      if (picked) this.onCell?.(this.all[+picked.dataset.entry]);
      else this.onSelect?.(d);
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
        if (onCube) {
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

/* A scattered set of k distinct tile indices out of n, seeded so a face
   keeps the same arrangement between builds: the scatter should look
   arbitrary, not be different every time you come back to it. */
function shuffleTake(n, k, seed = 0) {
  let t = seed * 2654435761 + 12345;
  const rnd = () => {
    t = (t * 1103515245 + 12345) & 0x7fffffff;
    return t / 0x7fffffff;
  };
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return new Set(a.slice(0, Math.min(k, n)));
}
