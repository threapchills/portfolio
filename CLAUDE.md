# Mike Whyle's portfolio: notes for Claude

A static site on GitHub Pages (portfolio.mikewhyle.com), deployed from
`main`. The journey is the single scroll in `index.html`: ES modules in
`js/core/` (cache-busted with `?v=` strings in the importmap) and styles in
`css/overhaul.css`. The legacy project pages use `css/style.css` and
`css/cohesion.css`.

## Working with Mike

- Push straight to `main` after each significant batch, so he can watch the
  Pages deployments in the Actions tab. No pull requests unless he asks.
- Quality over speed, but be efficient: he is mindful of usage credits.
- He values nuanced, precise, well-made prose, in copy and in replies.

## Before every push

- `node tests/readiness.mjs && node tests/asset-batch.mjs`
- Added or removed an image, CSS background or video the page references?
  Run `python3 scripts/build-preload-manifest.py`. The loader rejects any
  asset missing from `js/core/asset-sizes.js`.
- Bump the `?v=` strings for any changed JS or CSS in `index.html`.
- No file over 100 MB can go into git (GitHub refuses it).

## Testing in a cloud session

Python's `http.server` fails under the preload; use a small Node static
server. Headless Chromium cannot decode H.264 and runs out of image-decode
memory on the 1920 px film frames, so stub both before loading the page:

```js
await page.addInitScript(() => {
  HTMLMediaElement.prototype.load = function () { setTimeout(() => this.dispatchEvent(new Event('loadeddata')), 30); };
  const ae = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function (t, f, o) { if (this instanceof HTMLMediaElement && t === 'error') return; return ae.call(this, t, f, o); };
  HTMLMediaElement.prototype.play = function () { return Promise.resolve(); };
  const dec = HTMLImageElement.prototype.decode;
  HTMLImageElement.prototype.decode = function () { return dec.call(this).catch(() => {}); };
});
```

The loader ends on an Enter button (`.threshold-enter`); click it to get
in. That click is also what starts the sound, since browsers block audio
before a gesture. `?dbg` exposes `window.__cube` and `window.__lenis`.

## Handovers

- `HANDOVER-SHOWREEL.md`: the showreel, its source and pipeline, and how to
  rework it for v2. Start there for any reel work.
- `HANDOVER.md`: an earlier task brief for the journey (July 2026).
