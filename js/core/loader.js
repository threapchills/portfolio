/* The threshold reports bytes received, then names any remaining preparation.
   It never equates a tiny file with an entire film sequence. */
import { asset, qs, qsa } from './util.js';
import { loadImage as preloadImage } from './readiness.js';

export function initThreshold({ run, onEnter }) {
  const threshold = qs('#threshold');
  const moons = qsa('.threshold-moon', threshold);
  const meter = qs('[role="progressbar"]', threshold);
  const stage = qs('#load-stage', threshold);
  const detail = qs('#load-detail', threshold);
  const mb = value => (value / 1e6).toFixed(1);
  meter.setAttribute('aria-valuemin', '0');
  meter.setAttribute('aria-valuemax', '100');
  let lastPaint = 0;
  const preparing = (title, description) => {
    stage.textContent = title;
    detail.textContent = description;
    meter.setAttribute('aria-label', title);
    meter.removeAttribute('aria-valuenow');
    threshold.classList.add('is-preparing');
  };
  const paint = ({ receivedBytes, totalBytes, ready, count, retrying }) => {
    const now = performance.now();
    if (now - lastPaint < 100 && receivedBytes < totalBytes && !retrying) return;
    lastPaint = now;
    const fraction = totalBytes ? receivedBytes / totalBytes : 0;
    const percent = Math.floor(fraction * 100);
    meter.setAttribute('aria-label', 'Portfolio files received');
    meter.setAttribute('aria-valuenow', String(percent));
    meter.setAttribute('aria-valuetext', `${mb(receivedBytes)} of ${mb(totalBytes)} megabytes received`);
    moons.forEach((moon, i) => {
      const fill = Math.max(0, Math.min(1, fraction * moons.length - i));
      moon.style.filter = `grayscale(${1 - fill}) brightness(${0.3 + fill * 0.7})`;
    });
    threshold.classList.remove('is-preparing');
    stage.textContent = retrying ? 'Reconnecting and retrying a file' : `Receiving portfolio files · ${percent}%`;
    detail.textContent = `${mb(receivedBytes)} / ${mb(totalBytes)} MB · ${ready} / ${count} files prepared`;
    if (receivedBytes === totalBytes) {
      preparing('Files received · preparing the visuals', `${ready} / ${count} files prepared`);
    }
  };
  return run(paint, preparing).then(() => {
    stage.textContent = 'The journey is ready';
    detail.textContent = 'All visuals and film previews are loaded.';
    threshold.classList.add('is-leaving');
    onEnter();
    setTimeout(() => threshold.remove(), 1400);
  }).catch(error => {
    console.error('[threshold]', error);
    threshold.classList.remove('is-preparing');
    stage.textContent = 'The journey could not finish loading';
    detail.textContent = 'A file failed after three attempts. Please retry when your connection is ready.';
    meter.removeAttribute('aria-valuenow');
    const retry = document.createElement('button');
    retry.className = 'threshold-retry';
    retry.textContent = 'Retry loading';
    retry.onclick = () => location.reload();
    threshold.appendChild(retry);
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
