import assert from 'node:assert/strict';
import { AssetBatch } from '../js/core/asset-batch.js';

globalThis.document = { baseURI: 'https://example.test/portfolio/' };
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const response = (size, delay = 0) => new Response(new ReadableStream({
  async start(controller) {
    for (let left = size; left > 0;) {
      if (delay) await pause(delay);
      const n = Math.min(left, 10);
      controller.enqueue(new Uint8Array(n));
      left -= n;
    }
    controller.close();
  },
}));

// A slow large movie must dominate bytes, even after a tiny file is ready.
const reports = [];
let bytesDone;
const allBytes = new Promise(resolve => { bytesDone = resolve; });
let releasePrepare;
const prepareGate = new Promise(resolve => { releasePrepare = resolve; });
const batch = new AssetBatch({ 'tiny.webp': 1, 'large.mp4': 100 }, {
  onProgress: state => { reports.push(state); if (state.receivedBytes === 101) bytesDone(); },
  fetcher: src => Promise.resolve(response(src === 'large.mp4' ? 100 : 1, src === 'large.mp4' ? 2 : 0)),
  prepare: async (entry, blob) => {
    if (entry.kind === 'video') await prepareGate;
    return blob;
  },
});
batch.add('tiny.webp');
batch.add('https://example.test/portfolio/tiny.webp');
batch.add('large.mp4', 'video');
assert.equal(batch.entries.size, 2, 'Absolute and relative assets share one denominator');
let complete = false;
const pending = batch.load().then(() => { complete = true; });
await allBytes;
assert.ok(reports.some(s => s.ready === 1 && s.receivedBytes === 1 && s.totalBytes === 101));
assert.equal(reports.at(-1).receivedBytes, 101);
assert.equal(complete, false, 'All bytes received is not equivalent to decoded and ready');
assert.throws(() => batch.add('tiny.webp'), /Register every asset/);
releasePrepare();
await pending;
assert.equal(reports.at(-1).ready, 2);

// HTTP errors, truncated bodies, and stale manifests retry without opening.
for (const failure of ['http', 'short', 'long', 'decode']) {
  let attempts = 0;
  const failing = new AssetBatch({ 'bad.webp': 10 }, {
    fetcher: async () => {
      attempts++;
      if (failure === 'http') return new Response('', { status: 503 });
      return response(failure === 'short' ? 5 : failure === 'long' ? 11 : 10);
    },
    prepare: async () => { throw new Error('decode failed'); },
  });
  failing.add('bad.webp');
  await assert.rejects(failing.load());
  assert.equal(attempts, 3, `${failure} retried exactly three times`);
  assert.equal(failing.entries.get('bad.webp').ready, false);
}

let attempts = 0;
const retry = new AssetBatch({ 'retry.webp': 10 }, {
  fetcher: async () => ++attempts === 1 ? response(4) : response(10),
  prepare: async (_, blob) => blob,
});
retry.add('retry.webp');
await retry.load();
assert.equal(attempts, 2);
assert.equal(retry.entries.get('retry.webp').received, 10, 'Partial retries do not inflate progress');

let active = 0, peak = 0;
const bounded = new AssetBatch(Object.fromEntries(Array.from({ length: 20 }, (_, i) => [`${i}.webp`, 10])), {
  concurrency: 3,
  fetcher: async () => { peak = Math.max(peak, ++active); await pause(2); return response(10); },
  prepare: async () => { active--; return true; },
});
for (let i = 0; i < 20; i++) bounded.add(`${i}.webp`);
await bounded.load();
assert.equal(peak, 3);
assert.throws(() => new AssetBatch({}).add('missing.webp'), /missing from size manifest/);
assert.throws(() => new AssetBatch({}).add('https://other.test/a.webp'), /Non-local asset/);
console.log('Asset batch: weighted slow progress, preparation gate, deduplication, HTTP/truncation/size/decode failures, retries and concurrency passed.');
