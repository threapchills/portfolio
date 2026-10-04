/* cube.js — the Writing chamber's monolith.
   Six faces, each one of the painted panels cut into nine tiles. The
   writing is scattered across all six without regard to genre or order:
   a piece can be anywhere, which is how you actually find things in a
   body of work. Drag tumbles it freely on both axes; on the journey the
   page's own scroll walks it through a full revolution (setScrollTurn),
   while standalone the wheel realigns it. A tile carrying a title opens
   that piece; a bare tile makes its face's titled tiles beckon.
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
  constructor(el, entries, { onCell, wheel = true }) {
    this.el = el;
    this.all = entries;             // every piece of writing, one flat list
    /* Dealt round the six faces in turn, so no face is empty and no face
       is crowded. Which face a piece lands on carries no meaning; that is
       the point. Finding one is a matter of turning the thing over. */
    this.byFace = Array.from({ length: 6 }, () => []);
    entries.forEach((e, i) => this.byFace[i % 6].push(e));
    this.onCell = onCell;
    this._wheelEnabled = wheel;     // off when the page's own scroll drives the turn
    this.rotY = REST_Y; this.targetY = REST_Y;
    this.rotX = REST_X; this.targetX = REST_X;
    this.vel = 0;
    this.dragging = false;
    this.suspended = false;
    this.faceEls = [];              // all six faces, by index
    this.faceMs = [];               // and each face's own transform, as a matrix
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
    [0, 90, 180, 270].forEach((a, i) => {
      this.panelFace(i, side(a));
      this.faceMs[i] = (h) => new DOMMatrix().rotateAxisAngle(0, 1, 0, a).translate(0, 0, h);
    });
    // and two more capping the poles, reachable by dragging up or down
    this.panelFace(4, `rotateX(90deg) translateZ(${half})`);
    this.panelFace(5, `rotateX(-90deg) translateZ(${half})`);
    this.faceMs[4] = (h) => new DOMMatrix().rotateAxisAngle(1, 0, 0, 90).translate(0, 0, h);
    this.faceMs[5] = (h) => new DOMMatrix().rotateAxisAngle(1, 0, 0, -90).translate(0, 0, h);
  }

  /* ---- hit-testing, by our own projection ----
     The browser's hit-test is unreliable on faces turned near 90° under
     preserve-3d, and a tile's getBoundingClientRect is only the box around
     its tilted outline, so neighbouring tiles' boxes overlap and the poles
     never front at all. Instead the cube's exact transform is rebuilt as a
     matrix, every face is projected through the scene's perspective, and
     the pointer is tested against the true quadrilaterals. Whatever tile
     can be seen can be clicked, on any face, at any angle. */
  projector() {
    const scene = this.el.parentElement;
    const s = this.el.offsetWidth, h = s / 2;
    const sr = scene.getBoundingClientRect();
    const cs = getComputedStyle(scene);
    const d = parseFloat(cs.perspective) || 1200;
    const [ox, oy] = cs.perspectiveOrigin.split(' ').map(parseFloat);
    const cx = this.el.offsetLeft + h, cy = this.el.offsetTop + h;
    // the same chain tick() writes into the style, in the same order
    const cube = new DOMMatrix()
      .translate(-0.05 * s, 0.01 * s, 0)
      .rotateAxisAngle(1, 0, 0, this._ax ?? this.rotX)
      .rotateAxisAngle(0, 1, 0, this._ay ?? this.rotY);
    return (i) => {
      const m = cube.multiply(this.faceMs[i](h));
      // face-local pixels (top-left origin) to the viewport
      return (u, v) => {
        const p = m.transformPoint(new DOMPoint(u - h, v - h, 0));
        const k = d / Math.max(d - p.z, 1);
        return [sr.left + ox + (cx + p.x - ox) * k, sr.top + oy + (cy + p.y - oy) * k];
      };
    };
  }

  /* the face and titled tile under a viewport point, or nulls */
  hitTest(x, y) {
    const proj = this.projector();
    const s = this.el.offsetWidth;
    let best = null;
    for (let i = 0; i < 6; i++) {
      const to = proj(i);
      const quad = [to(0, 0), to(s, 0), to(s, s), to(0, s)];
      // a face wound backwards on screen is turned away (backface hidden)
      if (area(quad) <= 0 || !inQuad(quad, x, y)) continue;
      // visible faces of a convex solid never overlap, but take the most
      // square-on if a corner is ever ambiguous
      const a = area(quad);
      if (!best || a > best.a) best = { i, a, to };
    }
    if (!best) return { face: null, cell: null };
    const face = this.faceEls[best.i];
    let cell = null;
    for (const c of face.querySelectorAll('.cube-cell.is-titled')) {
      const l = c.offsetLeft, t = c.offsetTop, w = c.offsetWidth, hh = c.offsetHeight;
      const q = [best.to(l, t), best.to(l + w, t), best.to(l + w, t + hh), best.to(l, t + hh)];
      if (inQuad(q, x, y)) { cell = c; break; }
    }
    return { face, cell };
  }

  /* a bare tile was struck: the face's titled tiles glint once, pointing
     the hand at what can be opened */
  beckon(face) {
    face.classList.remove('is-beckoning');
    void face.offsetWidth;
    face.classList.add('is-beckoning');
    clearTimeout(this._beckon);
    this._beckon = setTimeout(() => face.classList.remove('is-beckoning'), 1200);
  }

  /* bring a face round to the front, poles included */
  frontTo(i) {
    if (i < 4) {
      this.rotateToFace(i);
      this.targetX = REST_X + Math.round((this.targetX - REST_X) / 360) * 360;
    } else {
      const want = i === 4 ? -90 : 90;
      this.targetX = want + Math.round((this.targetX - want) / 360) * 360;
    }
  }

  wire() {
    let px = 0, py = 0, sx = 0, sy = 0;
    this.el.parentElement.addEventListener('pointerdown', (e) => {
      if (e.button > 0 || e.target.closest('.writing-access')) return;
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

    // Resolve clicks by our own projection (see hitTest), never by the
    // browser's target. A keyboard press carries no pointer position, so
    // that one is taken from the focused tile itself.
    this.el.parentElement.addEventListener('click', (e) => {
      if (e.target.closest('.writing-access')) return;
      if (e.detail === 0) {
        const cell = e.target.closest('.cube-cell.is-titled');
        if (cell) this.onCell?.(this.all[+cell.dataset.entry]);
        return;
      }
      if (this.dragging || this._wasDrag || this.suspended) return;
      const { face, cell } = this.hitTest(e.clientX, e.clientY);
      if (cell) this.onCell?.(this.all[+cell.dataset.entry]);
      else if (face) this.beckon(face);
    });

    // tabbing onto a tile turns its face to meet the eye
    this.el.addEventListener('focusin', (e) => {
      const face = e.target.closest('.cube-face');
      if (face && !this.suspended) this.frontTo(+face.dataset.index);
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
    // a small translate keeps the monolith off dead-centre; the applied
    // angles are kept so the hit-test projects exactly what is painted
    this._ax = +(this.rotX + idle * 0.4 + this.leanX).toFixed(3);
    this._ay = +(this.rotY + idle + this.leanY).toFixed(3);
    this.el.style.transform =
      `translate3d(-5%, 1%, 0) rotateX(${this._ax}deg) rotateY(${this._ay}deg)`;
    this.updateHover();
  }

  /* glow the titled tile under the pointer, on whichever face it sits, by
     the same projection the click uses: the glow and the click always agree */
  updateHover() {
    let over = null, onCube = false;
    if (this._inScene && !this.dragging) {
      const { face, cell } = this.hitTest(this._px, this._py);
      onCube = !!face;
      over = cell;
    }
    // still the sway whenever the hand is over the cube, for any face
    this.hovering = onCube;
    this.el.parentElement.classList.toggle('is-over-tile', !!over);
    this.el.parentElement.classList.toggle('is-over-cube', onCube);
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

/* signed area of a screen quad: positive when wound as laid out (facing us) */
function area(q) {
  let a = 0;
  for (let i = 0; i < q.length; i++) {
    const [x0, y0] = q[i], [x1, y1] = q[(i + 1) % q.length];
    a += x0 * y1 - x1 * y0;
  }
  return a / 2;
}

/* point inside a convex quad, either winding */
function inQuad(q, x, y) {
  let sign = 0;
  for (let i = 0; i < 4; i++) {
    const [x0, y0] = q[i], [x1, y1] = q[(i + 1) % 4];
    const c = (x1 - x0) * (y - y0) - (y1 - y0) * (x - x0);
    if (c === 0) continue;
    if (sign === 0) sign = Math.sign(c);
    else if (Math.sign(c) !== sign) return false;
  }
  return true;
}
