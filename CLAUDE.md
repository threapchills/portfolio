# Mike Whyle's portfolio: notes for Claude

A static site on GitHub Pages (portfolio.mikewhyle.com), deployed from
`main`. Since November 2026 it is a **writer's portfolio**, built for the
Creative Copywriter role at Pencil. The October scroll journey still exists
at `journey.html`, but nothing links to it: Mike wants the site to work as
one cohesive whole, with no links to older versions of it.

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
  writing cards and the filters.
- `content/writing/index.json`: one entry per piece (title, group, format,
  client, publication and date, logo, link to the published version, the
  `passage` shown on its card, the `tag` on its cursor). The order here is
  the order of the cards.
- `content/writing/<slug>.txt`: the text of each piece that has a reading
  page. Blank line between paragraphs, `## ` for a subheading, `- ` for a
  list item, `[[double brackets]]` round a sentence to highlight it.
- `css/writer.css` and `js/writer.js`: shared by the home page and the
  reading pages. Bump `V` in `scripts/build-site.py` when either changes.

**Only Mike's words go on the page.** He asked for every line he did not
write to be removed. Headlines, intros and captions come from his old site,
the October build or his CV; a card's passage is lifted verbatim from its
piece (the build does not check this, so check it yourself); a subtitle is
shown only where the piece has one of its own. Do not add intros,
explainers, summaries or taglines unless he asks. Short functional labels
(nav, buttons, format names) are fine.

The page, top to bottom: the headline over a field of typographic noise
that the pointer cuts through (`#hero`), a strip of publications, about
(`#about`, the CV's profile), kind words and clients (`#proof`), the
writing as cards (`#writing`), services (`#services`), then the dark screen
with the showreel, the films travelling sideways and every design board as
a card (`#film`, `#design`), creative tech (`#code`: Mike's blanket term for the
vibe-coded apps and the video game work) and contact.

- **One card format for every piece**, modelled on the testimonial cards:
  format and client along the top, a passage of the piece itself with one
  phrase highlighted, then title, publication and date. The essay is one
  card among the others. Mike rejected a table of pieces, word counts in
  the margin, and showing the essay at several lengths: do not bring them
  back.
- Motion is GSAP, ScrollTrigger and Lenis (`js/vendor/`), loaded on the
  home page only: cards are dealt in on a scrub, tilt under the pointer and
  reshuffle when filtered; columns drift and lean with the scroll; the
  films pin and travel sideways on desktop. With reduced motion, or without
  the libraries, the page is a plain two-column layout.
- GSAP folds the CSS `rotate`, `scale` and `translate` properties into its
  own transform and then sets them to `none`. Never rely on those
  properties on an element GSAP animates.
- Call `ScrollTrigger.refresh()` only while the cards are at rest (no FLIP
  offsets), or their triggers are measured in the wrong place.
- **No links to older versions of the site**: not `journey.html`, not
  mikewhyle.com. The film sub-pages in `projects/` are part of the site:
  every film card opens its own sub-page (Vast Island has none, so it
  opens YouTube). Mike was annoyed when these links were removed without
  asking: do not re-point or drop links on your own inference; ask.
- The design boards come from `content/design.json`: 30 cards, each a 900
  px copy in `images/design-cards/` that opens the full image in the
  viewer. A new board needs its thumb and its entry there.
- The credit line reads "Made with the help of Claude" (not one model's
  name: several did the work).
- Client logos are in `images/clients/`; a client without one is set as
  text (Iziko, Deep Atomic, SAPVIA).
- The News Drop is gone from the site at Mike's request. Do not restore it.
- The SMR explainer is labelled by format and client only. Never tag it
  "unpublished".
- The page loads light: no gate, no sound. Film loops fetch as their cards
  come into view (`video/loops/`, `video/loops-m/` on phones, posters in
  `images/posters/`); the showreel loads only when played.

## The CV

`cv/Mike-Whyle-CV-2026.pdf` is printed from `templates/cv.html` by
`python3 scripts/build-cv.py [path-to-chrome]` (needs Playwright). Its
fonts and images are in `templates/cv-assets/`. Check that it still fits
two pages after any edit.

## The journey (`journey.html`)

Unlinked from the site since November 2026 (see above). The October build,
unchanged apart from the News Drop: ES modules in
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
