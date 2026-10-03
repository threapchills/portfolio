/* A closed, byte-counted set of the assets needed before scrolling opens.
   The denominator comes from the shipped files, never from task counts or time. */
export class AssetBatch {
  constructor(sizes, { onProgress = () => {}, fetcher = (...args) => fetch(...args), prepare = prepareAsset, concurrency = 6 } = {}) {
    this.sizes = sizes;
    this.onProgress = onProgress;
    this.fetcher = fetcher;
    this.prepare = prepare;
    this.concurrency = concurrency;
    this.entries = new Map();
    this.started = false;
    this.controllers = new Set();
    this.failure = null;
  }

  key(src) {
    const url = new URL(src, document.baseURI);
    const root = new URL('.', document.baseURI);
    if (url.origin !== root.origin || !url.pathname.startsWith(root.pathname)) throw new Error(`Non-local asset: ${src}`);
    return decodeURI(url.pathname.slice(root.pathname.length));
  }

  add(src, kind = 'image', element) {
    if (this.started) throw new Error('Register every asset before loading begins.');
    const key = this.key(src);
    if (!this.entries.has(key)) {
      const size = this.sizes[key];
      if (!(size > 0)) throw new Error(`Asset missing from size manifest: ${key}`);
      this.entries.set(key, { src, key, kind, size, received: 0, ready: false, elements: [] });
    }
    const entry = this.entries.get(key);
    if (element) entry.elements.push(element);
    return entry;
  }

  get(src) { return this.entries.get(this.key(src))?.value; }

  report(retrying = '') {
    const entries = [...this.entries.values()];
    this.onProgress({
      totalBytes: entries.reduce((n, e) => n + e.size, 0),
      receivedBytes: entries.reduce((n, e) => n + e.received, 0),
      ready: entries.filter(e => e.ready).length,
      count: entries.length,
      retrying,
    });
  }

  async download(entry) {
    let lastError;
    for (let attempt = 0; attempt < 3; attempt++) {
      if (this.failure) throw this.failure;
      const controller = new AbortController();
      this.controllers.add(controller);
      let timer;
      const heartbeat = () => {
        clearTimeout(timer);
        timer = setTimeout(() => controller.abort(), 45000);
      };
      try {
        entry.received = 0;
        this.report(attempt ? entry.key : '');
        heartbeat();
        const response = await this.fetcher(entry.src, {
          signal: controller.signal, cache: attempt ? 'reload' : 'default',
        });
        if (!response.ok) throw new Error(`${response.status}: ${entry.key}`);
        const chunks = [];
        const reader = response.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          heartbeat();
          chunks.push(value);
          entry.received += value.byteLength;
          if (entry.received > entry.size) throw new Error(`Size manifest out of date: ${entry.key}`);
          this.report();
        }
        clearTimeout(timer);
        if (entry.received !== entry.size) throw new Error(`Incomplete download: ${entry.key}`);
        const types = { image: 'image/webp', video: 'video/mp4', text: 'text/plain' };
        const blob = new Blob(chunks, { type: response.headers.get('Content-Type') || types[entry.kind] });
        entry.value = await this.prepare(entry, blob);
        entry.ready = true;
        this.controllers.delete(controller);
        this.report();
        return;
      } catch (error) {
        lastError = error;
        controller.abort();
        clearTimeout(timer);
        this.controllers.delete(controller);
      }
    }
    throw lastError;
  }

  async load() {
    this.started = true;
    // Start the largest files first so one big movie cannot create a long tail.
    const queue = [...this.entries.values()].sort((a, b) => b.size - a.size);
    this.report();
    let next = 0;
    const workers = Array.from({ length: Math.min(this.concurrency, queue.length) }, async () => {
      try {
        while (!this.failure && next < queue.length) await this.download(queue[next++]);
      } catch (error) {
        this.failure ||= error;
        for (const controller of this.controllers) controller.abort();
      }
    });
    await Promise.all(workers);
    if (this.failure) throw this.failure;
  }
}

async function prepareAsset(entry, blob) {
  if (entry.kind === 'text') return blob.text();
  const url = URL.createObjectURL(blob);
  try {
    if (entry.kind === 'video') {
      await Promise.all(entry.elements.map(video => new Promise((resolve, reject) => {
        const cleanup = () => {
          clearTimeout(timer);
          video.removeEventListener('loadeddata', ready);
          video.removeEventListener('error', failed);
        };
        const ready = () => { cleanup(); resolve(); };
        const failed = () => { cleanup(); reject(new Error(`Cannot play: ${entry.key}`)); };
        const timer = setTimeout(failed, 30000);
        video.addEventListener('loadeddata', ready, { once: true });
        video.addEventListener('error', failed, { once: true });
        video.preload = 'auto';
        video.src = url;
        video.load();
      })));
      return url; // Retain the complete local movie for subsequent playback.
    }
    const image = new Image();
    image.src = url;
    await image.decode();
    await Promise.all(entry.elements.map(async element => {
      element.src = url;
      await element.decode();
    }));
    return image;
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}
