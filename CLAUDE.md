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
  Run `python3 scripts/build-preload-manifest.py` (it covers `assets`,
  `images`, `video`, `showreel` and the News Drop). The loader rejects any
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

## The page, top to bottom (October 2026)

Showreel (`#prologue`, `js/core/prologue.js`) → the paper: testimonials and
clients (`#proof`), photo and CV (`#about`) → the reading (`#reading-wrap`:
the oracle wakes on the last council frames, then the bloom, the triptych
and the three cards) → film (Mikey scrub, then `#film-rail`, the films
travelling sideways) → writing → design → vibe-coding → outro → the council
film as the coda (`#journey`) → the chrome mark → the loop gate, which fades
to black and returns to the reel.

- The reel ships as two cuts in `showreel/`; `prologue.js` picks one by the
  screen's shape and the threshold batch downloads only that one. Its six
  poster stills are in `images/showreel/` (`-v` for the vertical cut).
- The film rail plays light loops: `video/loops/` (1280 px) on desktop,
  `video/loops-m/` (720 px) on phones. The `*-hero.mp4` originals stay for
  the project pages.
- Client logos are ink-on-transparent in `images/clients/`, sized to equal
  optical weight (the width is in the markup). Pencil leads.
- The CV is `cv/Mike-Whyle-CV-2026.pdf`; the nav's CV pill and the about
  section both download it.
- The More Films archive and Vanta Black are gone for good.

## Handovers

- `HANDOVER-SHOWREEL.md`: the v1 showreel, its source and pipeline. v2 is
  now on the site (see above); the "Putting it back on the site" steps are
  done.
- `HANDOVER.md`: an earlier task brief for the journey (July 2026).
