# Mike Whyle's portfolio: notes for Claude

A static site on GitHub Pages (portfolio.mikewhyle.com), deployed from
`main`. Since November 2026 it is a **writer's portfolio**, built for the
Creative Copywriter role at Pencil. The October scroll journey (showreel,
films, design, with sound) lives on beside it at `journey.html`.

## Working with Mike

- Push straight to `main` after each significant batch, so he can watch the
  Pages deployments in the Actions tab. No pull requests unless he asks.
- Quality over speed, but be efficient: he is mindful of usage credits.
- He values nuanced, precise, well-made prose, in copy and in replies.
- Writing rules, in copy, comments and commit messages: no em dashes (use a
  spaced en dash, a colon or a semicolon); no "This is not X. It is Y."
  constructions; British English; sentence case; short sentences on the
  page; end when the content ends.
- When editing his copy, stay close to his wording and polish it.

## The writer's portfolio (`index.html`)

`index.html` and everything in `writing/` are **generated**. Do not edit
them by hand. Edit the sources, then run `python3 scripts/build-site.py`:

- `templates/home.html`: the home page, with `{{PLACEHOLDERS}}` for the
  index of work, the filters and the essay.
- `content/writing/index.json`: one entry per piece (title, dek, group,
  format, client, publication and date, logo, link to the published
  version). The order here is the order on the page.
- `content/writing/<slug>.txt`: the text of each piece that has a reading
  page. Blank line between paragraphs, `## ` for a subheading, `- ` for a
  list item, `[[double brackets]]` round a sentence to highlight it.
- `css/writer.css` and `js/writer.js`: shared by the home page and the
  reading pages. Bump `V` in `scripts/build-site.py` when either changes.

The page, top to bottom: the opening line and intro (`#about`), a strip of
publications, kind words and clients (`#proof`), the essay *Blood, Books
and Bots* at three lengths (`#essay`), one caption and one feature
(`#range`), the labelled index of every piece with filters (`#writing`),
services (`#services`), then, much further down and on a dark ground, the
showreel, films, design and apps (`#film`, `#design`), and contact.

The device that runs through it is the margin: each block carries its word
count there, counted live by `js/writer.js` from `data-wc` attributes.

- Every piece carries three labels: format, client, publication and date.
- Client logos are in `images/clients/`; a client without one is set as
  text (Iziko, Deep Atomic, SAPVIA).
- The News Drop is gone from the site at Mike's request. Do not restore it.
- The SMR explainer is labelled by format and client only. Never tag it
  "unpublished".
- The page loads light: no gate, no sound. Film loops fetch as their cards
  scroll into view (`video/loops/`, `video/loops-m/` on phones, posters in
  `images/posters/`); the showreel loads only when played.

## The CV

`cv/Mike-Whyle-CV-2026.pdf` is printed from `templates/cv.html` by
`python3 scripts/build-cv.py [path-to-chrome]` (needs Playwright). Its
fonts and images are in `templates/cv-assets/`. Check that it still fits
two pages after any edit.

## The journey (`journey.html`)

The October build, unchanged apart from the News Drop: ES modules in
`js/core/` (cache-busted with `?v=` strings in the importmap) and styles in
`css/overhaul.css`. The legacy project pages in `projects/` use
`css/style.css` and `css/cohesion.css`.

Top to bottom: showreel (`#prologue`) → testimonials, clients, photo and CV
on paper → the reading (oracle, bloom, triptych, three cards) → film (Mikey
scrub, then the films travelling sideways) → the writing cube over the
essay → design → vibe-coding and the outro → the council film as the coda,
into the liquid chrome wordmark → the loop gate back to the reel.

Before pushing a change to the journey:

- `node tests/readiness.mjs && node tests/asset-batch.mjs`
- Added or removed an image, CSS background or video it references? Run
  `python3 scripts/build-preload-manifest.py`. Its loader rejects any asset
  missing from `js/core/asset-sizes.js`.
- Bump the `?v=` strings for any changed JS or CSS in `journey.html`.
- No file over 100 MB can go into git (GitHub refuses it).

## Testing in a cloud session

Python's `http.server` fails under the journey's preload; use a small Node
static server. The writer's pages need no stubs. For the journey, headless
Chromium cannot decode H.264 and runs out of image-decode memory on the
1920 px film frames, so stub both before loading the page:

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

The journey's loader ends on an Enter button (`.threshold-enter`); click it
to get in. `?dbg` exposes `window.__cube` and `window.__lenis`.

## Not published

`_config.yml` keeps these notes, `templates/`, `scripts/`, `tests/` and
`content/` off the public site. Private files (job descriptions, notes to
colleagues, reviews) never go into this repo: it is public.

## Handovers

- `HANDOVER-SHOWREEL.md`: the v1 showreel, its source and pipeline.
- `HANDOVER.md`: an earlier task brief for the journey (July 2026).
