/* loader.js — Act 0, the Threshold.
   Preloads the opening acts behind a moon-phase progress ritual, then
   dissolves on its own. Sound waits for a gesture; the mute button rules. */

import { asset, fromRoot, qs, qsa } from './util.js';

const MIN_HOLD = 1200; // the ritual reads even on fast connections

function preloadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    let tried = 0;
    const attempt = () => {
      tried += 1;
      img.onload = () => resolve(true);
      img.onerror = () => {
        if (tried < 2) attempt();
        else { console.warn('[threshold] failed twice, proceeding:', src); resolve(false); }
      };
      img.src = src + (tried > 1 ? `?retry=1` : '');
    };
    attempt();
  });
}

function preloadAudioStem(name) {
  return fetch(fromRoot(`audio/stems/${name}.ogg`))
    .then((r) => r.arrayBuffer())
    .catch(() => console.warn('[threshold] stem failed, proceeding:', name));
}

/* The journey threshold: five moons fill left to right, then the world
   opens unbidden. `jobs` takes extra promises to gate on, e.g. the film
   scrubber's opening chunk of frames. */
export function initThreshold({ images, jobs: extraJobs = [], onEnter }) {
  const threshold = qs('#threshold');
  const moons = qsa('.threshold-moon', threshold);
  const started = performance.now();

  const jobs = [
    ...images.map((src) => preloadImage(asset(src))),
    ...extraJobs,
    preloadAudioStem('sea1'),
    preloadAudioStem('fire3'),
    document.fonts ? document.fonts.ready : Promise.resolve(),
  ];

  let done = 0;
  const paint = () => {
    const p = done / jobs.length;
    moons.forEach((m, i) => {
      m.classList.toggle('is-filled', p >= (i + 1) / moons.length - 0.001);
    });
  };
  jobs.forEach((j) => j.then(() => { done += 1; paint(); }));

  Promise.all(jobs).then(async () => {
    const elapsed = performance.now() - started;
    if (elapsed < MIN_HOLD) await new Promise((r) => setTimeout(r, MIN_HOLD - elapsed));
    moons.forEach((m) => m.classList.add('is-filled'));
    // let the fifth moon register before the dissolve
    await new Promise((r) => setTimeout(r, 700));
    threshold.classList.add('is-leaving');
    setTimeout(() => threshold.remove(), 1400);
    onEnter?.();
  });
}

/* Chamber pages: a single moon fills, no gate. Resolves when ready. */
export function initChamberLoader(images, extraJobs = []) {
  const veil = qs('#chamber-loader');
  if (!veil) return Promise.resolve();
  const fill = qs('.chamber-moon-fill', veil);
  const jobs = [
    ...images.map((src) => preloadImage(asset(src))),
    ...extraJobs,
    document.fonts ? document.fonts.ready : Promise.resolve(),
  ];
  let done = 0;
  jobs.forEach((j) => j.then(() => {
    done += 1;
    if (fill) fill.style.transform = `scaleY(${done / jobs.length})`;
  }));
  const started = performance.now();
  return Promise.all(jobs).then(async () => {
    const elapsed = performance.now() - started;
    if (elapsed < 600) await new Promise((r) => setTimeout(r, 600 - elapsed));
    veil.classList.add('is-leaving');
    setTimeout(() => veil.remove(), 900);
  });
}
