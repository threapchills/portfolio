import assert from 'node:assert/strict';
import { loadImage, loadImages } from '../js/core/readiness.js';

let active = 0, peak = 0;
const attempts = new Map();
globalThis.Image = class {
  set src(src) {
    const key = src.split('?')[0];
    attempts.set(key, (attempts.get(key) || 0) + 1);
    peak = Math.max(peak, ++active);
    setTimeout(() => {
      active--;
      if (key === 'missing' || (key === 'retry' && attempts.get(key) < 2)) this.onerror();
      else this.onload();
    }, 1);
  }
  async decode() { this.decoded = true; }
};

const progress = [];
const images = await loadImages(Array.from({ length: 20 }, (_, i) => `frame-${i}`), p => progress.push(p));
assert.equal(images.length, 20);
assert.ok(images.every(image => image.decoded));
assert.ok(peak <= 6, 'Network and decoder concurrency stays bounded');
assert.equal(progress.at(-1), 1);
await loadImage('retry');
assert.equal(attempts.get('retry'), 2);
await assert.rejects(loadImage('missing'), /Unable to load/);
assert.equal(attempts.get('missing'), 3);
console.log('Readiness checks passed: decode, progress, concurrency, retries and failure.');
