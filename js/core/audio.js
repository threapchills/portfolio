/* audio.js — SLUMBR-lite ambient engine.
   Four looping channels (sea, sky, earth, fire) with variant rotation,
   scroll-mapped mix targets, exponential gain smoothing, persistent mute. */

import { clamp, fromRoot, PARAMS } from './util.js';

const STEMS = {
  sea:   ['sea1', 'sea4', 'sea5'],
  sky:   ['sky4', 'sky5', 'sky7'],
  earth: ['earth4', 'earth5', 'earth7'],
  fire:  ['fire3', 'fire5', 'fire7'],
};

const MASTER_LEVEL = 0.3;          // low and unobtrusive: sound is on by default
const SMOOTH_TAU = 1.6;            // seconds, mix easing time constant
const ROTATE_MIN = 60, ROTATE_MAX = 90;
const XFADE = 1.5;                 // variant crossfade, seconds
const SOUND_KEY = 'mw-sound';      // 'off' | 'on', written only on an explicit choice

class Channel {
  constructor(engine, name) {
    this.engine = engine;
    this.name = name;
    this.variants = STEMS[name];
    this.buffers = {};
    this.gain = engine.ctx.createGain();
    this.gain.gain.value = 0;
    this.gain.connect(engine.bus);
    this.target = 0;
    this.level = 0;
    this.active = null;            // { src, g, variant }
    this.rotateAt = 0;
    this.loading = false;
  }

  async buffer(variant) {
    if (this.buffers[variant]) return this.buffers[variant];
    const res = await fetch(fromRoot(`audio/stems/${variant}.ogg`));
    const raw = await res.arrayBuffer();
    const buf = await this.engine.ctx.decodeAudioData(raw);
    this.buffers[variant] = buf;
    return buf;
  }

  async start() {
    if (this.active || this.loading) return;
    this.loading = true;
    try {
      const variant = this.variants[0];
      const buf = await this.buffer(variant);
      this.active = this.play(buf, variant, 1);
      this.scheduleRotate();
      // fetch the next variant quietly in the background
      this.buffer(this.variants[1]).catch(() => {});
    } catch { /* a silent channel is survivable */ }
    this.loading = false;
  }

  play(buf, variant, level) {
    const ctx = this.engine.ctx;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const g = ctx.createGain();
    g.gain.value = level;
    src.connect(g).connect(this.gain);
    src.start();
    return { src, g, variant };
  }

  scheduleRotate() {
    this.rotateAt = performance.now() +
      (ROTATE_MIN + Math.random() * (ROTATE_MAX - ROTATE_MIN)) * 1000;
  }

  async rotate() {
    if (!this.active) return;
    this.scheduleRotate();
    const idx = this.variants.indexOf(this.active.variant);
    const next = this.variants[(idx + 1) % this.variants.length];
    try {
      const buf = await this.buffer(next);
      const ctx = this.engine.ctx;
      const t = ctx.currentTime;
      const incoming = this.play(buf, next, 0);
      const old = this.active;
      this.active = incoming;
      // equal-power crossfade so the bed never audibly loops
      const steps = 24;
      for (let i = 0; i <= steps; i++) {
        const tt = t + (i / steps) * XFADE;
        const x = i / steps;
        incoming.g.gain.setValueAtTime(Math.sin(x * Math.PI / 2), tt);
        old.g.gain.setValueAtTime(Math.cos(x * Math.PI / 2), tt);
      }
      old.src.stop(t + XFADE + 0.1);
    } catch { /* keep the current loop */ }
  }

  tick(dt, now) {
    this.level += (this.target - this.level) * (1 - Math.exp(-dt / SMOOTH_TAU));
    this.gain.gain.value = clamp(this.level, 0, 1);
    if (this.active && now > this.rotateAt) this.rotate();
    // lazily start a channel the first time the mix asks for it
    if (!this.active && !this.loading && this.target > 0.01) this.start();
  }
}

export class AudioEngine {
  constructor() {
    this.started = false;
    // sound flows by default, kept low; only an explicit pause is remembered
    this.muted = localStorage.getItem(SOUND_KEY) === 'off';
    this.channels = {};
    this._raf = null;
    this._last = 0;
  }

  /* Must be called from a user gesture (first pointerdown / keydown,
     or the unmute click itself). */
  start(muted = this.muted) {
    if (this.started) { this.setMuted(muted, true); return; }
    this.started = true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    // some browsers hand over a suspended context even inside a gesture
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    this.ctx.onstatechange = () => {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    };
    this.master = this.ctx.createGain();
    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.knee.value = 24;
    comp.ratio.value = 4;
    comp.attack.value = 0.01;
    comp.release.value = 0.3;
    this.bus = this.ctx.createGain();
    this.bus.connect(comp).connect(this.master).connect(this.ctx.destination);
    this.setMuted(muted, true);
    for (const name of Object.keys(STEMS)) {
      this.channels[name] = new Channel(this, name);
    }
    this._last = performance.now();
    const loop = (now) => {
      const dt = Math.min((now - this._last) / 1000, 0.2);
      this._last = now;
      for (const ch of Object.values(this.channels)) ch.tick(dt, now);
      this._raf = requestAnimationFrame(loop);
    };
    this._raf = requestAnimationFrame(loop);
    if (PARAMS.has('mixdebug')) this.mountDebug();
  }

  /* Warm the first two channels so Act I opens with sound already flowing. */
  prime() {
    this.channels.sea?.start();
    this.channels.fire?.start();
  }

  setMix(mix) {
    if (!this.started) return;
    for (const [name, ch] of Object.entries(this.channels)) {
      ch.target = clamp(mix[name] ?? 0, 0, 1);
    }
  }

  setMuted(muted, instant = false) {
    this.muted = muted;
    document.dispatchEvent(new CustomEvent('mw:muted', { detail: muted }));
    if (!this.master) return;
    const t = this.ctx.currentTime;
    const target = muted ? 0.0001 : MASTER_LEVEL;
    this.master.gain.cancelScheduledValues(t);
    if (instant) {
      this.master.gain.setValueAtTime(target, t);
    } else {
      // 400ms crossfade, never a hard cut
      this.master.gain.setValueAtTime(Math.max(this.master.gain.value, 0.0001), t);
      this.master.gain.exponentialRampToValueAtTime(target, t + 0.4);
    }
  }

  toggleMute() {
    this.setMuted(!this.muted);
    localStorage.setItem(SOUND_KEY, this.muted ? 'off' : 'on');
  }

  /* Outro: everything to zero over six seconds. */
  fadeAll(seconds = 6) {
    for (const ch of Object.values(this.channels)) ch.target = 0;
  }

  mountDebug() {
    const el = document.createElement('div');
    el.id = 'mixdebug';
    el.innerHTML = `<strong>mix</strong>` + Object.keys(STEMS).map((n) =>
      `<label>${n} <input type="range" min="0" max="1" step="0.01" data-ch="${n}">
       <span data-out="${n}">0</span></label>`).join('');
    document.body.appendChild(el);
    let held = false;
    el.addEventListener('input', (e) => {
      held = true;
      this.channels[e.target.dataset.ch].target = parseFloat(e.target.value);
    });
    setInterval(() => {
      for (const [n, ch] of Object.entries(this.channels)) {
        el.querySelector(`[data-out="${n}"]`).textContent = ch.level.toFixed(2);
        if (!held) el.querySelector(`[data-ch="${n}"]`).value = ch.target;
      }
    }, 250);
  }
}

/* Shared singleton + the persistent mute button. */
export const audio = new AudioEngine();
window.__audio = audio;

export function mountMuteButton() {
  const btn = document.getElementById('mute-btn');
  if (!btn) return;
  const paint = () => {
    btn.classList.toggle('is-muted', audio.muted);
    btn.setAttribute('aria-label', audio.muted ? 'Play sound' : 'Pause sound');
    btn.setAttribute('aria-pressed', audio.muted ? 'true' : 'false');
  };
  btn.addEventListener('click', () => {
    // the play click doubles as the wake gesture when nothing else has
    if (audio.muted && !audio.started) {
      audio.start(false);
      audio.prime();
      localStorage.setItem(SOUND_KEY, 'on');
    } else audio.toggleMute();
  });
  document.addEventListener('mw:muted', paint);
  paint();
}
