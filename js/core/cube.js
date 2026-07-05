/* cube.js — the Writing chamber's monolith.
   One CSS 3D cube: four collections, two decorative marker faces.
   Drag rotates with inertia; scroll nudges between faces; selecting a
   face zooms it to a full-screen reading plane. */

import { clamp, damp, fromRoot, qs, REDUCED_MOTION } from './util.js';

/* face order around Y: 0 front, 1 right, 2 back, 3 left */
const FACE_ANGLES = [0, -90, -180, -270];

export class WritingCube {
  constructor(el, faces, { onSelect }) {
    this.el = el;
    this.faces = faces;             // [{ id, title, eyebrow, count }] x4
    this.onSelect = onSelect;
    this.rotY = 0; this.targetY = 0;
    this.rotX = -8; this.targetX = -8;
    this.vel = 0;
    this.dragging = false;
    this.suspended = false;
    this.build();
    this.wire();
  }

  size() { return this.el.getBoundingClientRect().width; }

  build() {
    const half = () => 'calc(var(--size) / 2)';
    const defs = [
      { rot: 'rotateY(0deg)' }, { rot: 'rotateY(90deg)' },
      { rot: 'rotateY(180deg)' }, { rot: 'rotateY(270deg)' },
    ];
    this.faceEls = this.faces.map((f, i) => {
      const d = document.createElement('button');
      d.className = 'cube-face';
      d.dataset.face = i;
      d.style.transform = `${defs[i].rot} translateZ(${half()})`;
      d.innerHTML = `
        <span class="face-eyebrow">${f.eyebrow}</span>
        <h2>${f.title}</h2>
        <span class="face-count">${f.count}</span>`;
      this.el.appendChild(d);
      return d;
    });
    // decorative marker faces, top and bottom
    for (const [rot, img] of [
      ['rotateX(90deg)', 'assets/journey/moth-full-m.webp'],
      ['rotateX(-90deg)', 'assets/cards/card-back.webp'],
    ]) {
      const d = document.createElement('div');
      d.className = 'cube-face is-decor';
      d.style.transform = `${rot} translateZ(${half()})`;
      d.style.backgroundImage = `url('${fromRoot(img)}')`;
      d.setAttribute('aria-hidden', 'true');
      this.el.appendChild(d);
    }
  }

  frontFace() {
    const a = ((this.rotY % 360) + 360) % 360;
    return Math.round(a / 90) % 4 ? (4 - Math.round(a / 90) % 4) % 4 : 0;
  }

  wire() {
    let px = 0, py = 0;
    let moved = 0;
    this.el.parentElement.addEventListener('pointerdown', (e) => {
      this.dragging = true;
      moved = 0;
      px = e.clientX; py = e.clientY;
    });
    window.addEventListener('pointermove', (e) => {
      if (!this.dragging) return;
      const dx = e.clientX - px, dy = e.clientY - py;
      px = e.clientX; py = e.clientY;
      moved += Math.abs(dx) + Math.abs(dy);
      this.targetY += dx * 0.35;
      this.rotY += dx * 0.35;
      this.vel = dx * 0.35;
      this.targetX = clamp(this.targetX - dy * 0.12, -28, 16);
    });
    window.addEventListener('pointerup', () => {
      if (!this.dragging) return;
      this.dragging = false;
      // inertia, then settle on the nearest face
      this.targetY = this.rotY + this.vel * 14;
      this.snap();
    });

    // scroll nudges to the next face
    let wheelLock = 0;
    this.el.parentElement.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (this.suspended) return;
      const now = performance.now();
      if (now < wheelLock) return;
      wheelLock = now + 650;
      this.targetY += e.deltaY > 0 ? -90 : 90;
      this.snap();
    }, { passive: false });

    // click or Enter on the fronting face opens it
    this.faceEls.forEach((d, i) => {
      d.addEventListener('click', () => {
        if (this.dragging || moved > 12) return;
        if (this.frontFace() === i) {
          this.onSelect(this.faces[i], d);
        } else {
          this.rotateToFace(i);
        }
      });
    });

    window.addEventListener('keydown', (e) => {
      if (this.suspended) return;
      if (e.key === 'ArrowRight') { this.targetY -= 90; this.snap(); }
      if (e.key === 'ArrowLeft') { this.targetY += 90; this.snap(); }
    });
  }

  rotateToFace(i) {
    // shortest angular path to the requested face
    const want = FACE_ANGLES[i];
    const delta = (((want - this.targetY) % 360) + 540) % 360 - 180;
    this.targetY += delta;
  }

  snap() {
    this.targetY = Math.round(this.targetY / 90) * 90;
  }

  tick(dt, time) {
    if (this.suspended) return;
    const idle = REDUCED_MOTION || this.dragging ? 0 : Math.sin(time * 0.4) * 1.2;
    this.rotY = damp(this.rotY, this.targetY, this.dragging ? 30 : 6, dt);
    this.rotX = damp(this.rotX, this.targetX, 6, dt);
    this.el.style.transform =
      `rotateX(${(this.rotX + idle * 0.4).toFixed(3)}deg) rotateY(${(this.rotY + idle).toFixed(3)}deg)`;
  }
}
