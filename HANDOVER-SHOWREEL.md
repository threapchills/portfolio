# Handover: showreel v2

Written 2026-10-10 at the close of the session that made v1. Everything
below was verified in that session. Mike has v2 ideas and will brief you;
this file gives you the state of play, the pipeline, and the lessons that
cost time to learn.

## Start here

1. Read this file and `CLAUDE.md`.
2. Fetch the v1 source (19 MB, under three seconds; skips the 1.4 GB master):

   ```bash
   W=<your scratchpad>/reel
   git clone -q --filter=blob:none --no-checkout --branch showreel-master --single-branch \
     https://github.com/threapchills/portfolio $W-src
   cd $W-src && git sparse-checkout set --no-cone source && git checkout -q showreel-master
   mkdir -p $W && cp -r $W-src/source/. $W/
   ln -sfn /home/user/portfolio/assets $W/assets
   ln -sfn /home/user/portfolio/images $W/images
   ln -sfn /home/user/portfolio/video  $W/video
   ```

3. Extract the films to 24 fps frames (about 25 s for all ten, 856 MB):

   ```bash
   cd /home/user/portfolio/video && for f in *-hero.mp4; do n=${f%-hero.mp4}; mkdir -p $W/src/$n
     ffmpeg -v error -y -i "$f" -vf "fps=24,eq=contrast=1.03:saturation=1.04" -q:v 2 $W/src/$n/%04d.jpg & done; wait
   ```

4. Ask Mike for his v2 brief, the custom music, and what he found wrong
   with v1 (he said "a few issues" but did not list them).

## Where things stand

- **v1, "Twelve Worlds"**: 87 s, 24 fps, 4K master plus a 1080p cut and a
  1080x1920 vertical cut. It opened the film chamber for a day (commit
  `1a8189e`) and was taken off the site at Mike's request (commit
  `76709f6`), to return as v2 with custom music.
- **On `main`, dormant, waiting for v2**: the `#showreel` styles in
  `css/overhaul.css` ("the showreel: twelve worlds"), `initShowreel(audio)`
  in `js/core/chambers.js` (called from `index.html`; a no-op without the
  markup), `audio.duck(on)` in `js/core/audio.js` (fades the SLUMBR
  ambience under the reel), and the cursor label `.reel-poster` → "Play"
  in `js/core/cursor.js`.
- **Branch `showreel-master`** (an orphan branch; never merge it into main):
  - `mike-whyle-showreel-2026-4k.mp4.part00`–`part13` plus a README with
    rejoin commands and direct links. Master: 3840x2160, 24 fps, H.264
    High, CRF 17, about 127 Mbps, 1,383,984,697 bytes, SHA-256
    `2bd15d2729dbf05751c0d5b9410c2a10160551754cad939f2aef338984119481`.
  - `source/`: everything needed to re-render (listed below).
  - `web/`: the share page (`index.html`), `mike-whyle-showreel-2026.mp4`
    (1080p), `mike-whyle-showreel-2026-vertical.mp4`, `poster.jpg` (end
    card, for link previews), `site-poster.jpg` (the film-chamber poster),
    and a README on restoring them.

## How v1 is built

- `reel.html` loads `reel.js`. Every frame is a pure function of its index:
  `window.reel.render(f)` draws frame f (awaiting any images it needs), and
  `render.mjs` photographs the canvas with headless Chromium (JPEG). The
  canvas is 1920x1080 logical times `?dpr=` (2 gives 4K, so type is
  natively crisp). `reel_v.js` and `reel_v.html` are the 9:16 variant
  (1080x1920 logical): its own layout for every card, a 3x4 wall, no
  letterbox, per-cut pans (`px`), and a `fitseq` kind for the sand wordmark.
- **Timing**: `FPS = 24`, `SPB = 0.5` (120 BPM), so a beat is exactly 12
  frames. `TOTAL_BEATS = 174` (87 s, 2088 frames). `T(b)` turns beats into
  seconds. `frame(f)` is a chain of `if (bt < X)` scene blocks.
- **Cut lists**: `ACT1`, `ACT2`, `ACT5`, and the wall's `GRID` and
  `GRID_ORDER`. Each cut is `[beat, beats, kind, source, inSec, opts]`.
  Kinds are `clip` (src/ JPEGs), `seq` (12 fps WebP sequences, blended to
  24), `still` and `fit` (contain over a blurred cover). Opts are `speed`,
  `z: [z0, z1]`, `px`/`py` pans, `punch`, `flash`, `glitch`, and `xf`
  (crossfade in beats).
- **Helpers**: `kText` (per-letter kinetic type: masked rise, focus-pull
  blur), `chapter()` (numeral, rule, role; auto-fits the width in
  `reel_v.js`), `embers()` and `burst()` (closed-form particles, so render
  order does not matter), `stencilPlate()` (the wordmark punched through an
  ink plate; the camera dives through the deepest stroke, found by
  `findDeep`), `goldLogo()` (gold gradient, travelling glint, glow),
  `cube()` (an orthographic cube textured with the six `assets/cube`
  panels), and `grain`, `vignette`, `letterbox`, `glitch`, `flash`.
- **Score**: `music.py` (numpy) synthesises `score.wav` (48 kHz) on the
  same beat map: tribal toms, kick and claps, bass ostinato, a kalimba hook,
  braaams and risers, and the SLUMBR sky stem as air. A `RIDE` fader
  automation shapes the dynamics, with real silence from beat 157.62 to 160.
  It was never heard by the session that wrote it. v2 replaces it with
  Mike's music.

## v1 at a glance

| Beats | Time | Section | Content |
|---|---|---|---|
| 0–16 | 0:00–0:08 | The summoning | Ember on black; "Everything you are about to see / was conjured."; the five loader moons light, one per half-beat, from beat 12 |
| 16–24 | 0:08–0:12 | The council | Header film, "Mike Whyle · A showreel · 2026"; the eyes ignite, beats 22–24 |
| 24–28 | 0:12–0:14 | The drop | Stencil plate: a dive through the Mikey wordmark into Ramses' roaring lion |
| 28–60 | 0:14–0:30 | i · Human Being: GenAI Filmmaker | `ACT1`, 17 cuts on the beat, ending on Ramses' dust wall and army |
| 60–72 | 0:30–0:36 | Twelve worlds | 4x3 wall, "Twelve worlds. / One imagination."; the Mythopoeic eye tile fills the frame |
| 72–104 | 0:36–0:52 | ii · Human Doing: Creative Director | `ACT2`, crossfades: Mythopoeic, Desert Swag, rings, EduTalkz, the Mikey lookbook; "Brands that never existed, conjured whole." |
| 104–124 | 0:52–1:02 | iii · Human Thinking: Writer | The cube turns while News Drop headlines cascade |
| 124–136 | 1:02–1:08 | iv · The Fourth Door: Creative Technologist | Sigils in orbit (SLUMBR, Afrikan Tarot, Mystik Skies, Magic Carpet Wizard, Manuscript Maker), spiralling in |
| 136–158 | 1:08–1:19 | Finale | `ACT5`: the Mikey film with stabs from the others, ending on the sand-carved wordmark |
| 158–160 | 1:19–1:20 | Black | Silence |
| 160–174 | 1:20–1:27 | The mark | Gold wordmark ignites with sparks; name; roles; portfolio.mikewhyle.com; email |

## Footage: the best moments

Seconds into each `video/<name>-hero.mp4`. Only these roughly 20-second
hero clips are local. The full films live on YouTube and Vimeo, which this
cloud environment's network policy blocks (Mike can allow those hosts under
Network access in the environment settings).

- **ramses** (1080p24, 20 s): 0–3 boy and lion; roars at 3.0 and 6.0;
  5–8 the boy mounts the lion; 9–13 the golden crook raised; 14–17 dust
  wall; 17–19.5 the army emerges.
- **kalimba** (1080p24): 0–2 Times Square press scrum; 6.0–6.5 and 8
  kalimba-pattern morphs (gorgeous transitions); 5–15 Indian street press
  with fire; 17–19 Amsterdam canal interview.
- **mythopoeic** (1080p30, 26 s): 0–1 closed eye; 1.8–3.5 the eye opens on
  the Θ mark (a MYTHOPOEIC wordmark is baked in, 2–9); 4–7 portraits; 8–12
  women running with a rhino (10–11.5 clean); 13 horses; 14–17 fabric
  billowing on salt flats; 18 woman before the moon; 19–23 wheat field;
  24–26 bracelet in the surf.
- **vanta** (1920x1088, 24): 3–5 liquid-black tendrils in a neon city; 6
  glowing can; 9.0 black serpent; 10–12 desert festival fire; 13–16 smoke;
  17 cosmos; 18–19.5 can in neon swirls. Fanta branding throughout (a spec
  ad).
- **weekend-thuggery** (1920x844, 2.27:1, 30 fps, 27.7 s): 0–12 hyenas and
  a lion at a braai with grannies (9–10.5 is a blurry close-up; 11.4–12.4
  lion and the man in the hat, clean); 13–15 man in white hat; 16–20
  shebeen table; 22–25 Mikey pendant; 26 Mikey logo.
- **ice-tea** (1080p24): 1–2 card game with wolves; 3–8 fur-coat man at
  golden hour; 9–11 couple on the cliff; 12–14 hooded woman; 15–16 laughing
  knitted mask; 17–18 mask in sun flare.
- **nobody-wears-it-better** (1080p30, vintage gate): 0 man in hat among
  flowers; 1–2 floral gown crossing the street with a taxi; 3–4 white gown
  at standing stones; 5–6 man in white shirt, valley; 7 coat and fire; a
  burned-in title from 9 onwards.
- **tale-of-twins** (720p24): 1–2 white cat in a kung fu pose; 6 demon cat
  crowned; 7–9 bamboo charge; 13–16 desert camp fight; 17–18 giant black
  cat roaring.
- **vast-island** (720p24): 0–1 boy and kettle fire; 2 beach domes with a
  rainbow flare; 3–7 giant crab attack; 8–15 boy riding the iridescent
  beetle; 16–19 boy and elder by the fire inside a flower.
- **wishfish** (540p, 12 fps): 0–2 title card; subtitles burned in on most
  shots. Too soft for full frame; v1 used it only on the wall.
- **video/mikey/frames** (1600x900, 12 fps, 317 frames; seconds = n/12):
  n0 the branded ostrich; 11–33 Mikey on its feathers, close; 165–176 the
  Mikey grillz smile; 209–220 gold Mikey knuckle rings; 231–242 bakkie
  police chase; 253–264 man on a rhino with a rifle, city street; 275 Mikey
  on the helicopter; 286 helicopter over the city; 297–316 Mikey carved in
  sand, cars drifting.
- **video/header/frames** (1920x1080, 12 fps, 317): the council of three
  (0–77, hypnotic rings 11–77); portal rings (88–99); beast, hyena and
  shaman (110–176); ram face (187–220); Anubis and pyramids (231–253);
  council with torches lit (264–290); the central shaman's eyes glow, halo
  (297–316).
- **Stills and art**: `images/design/desert-swag/`, `images/mythopoeic/`,
  `images/healthtech-design*.webp`, `images/design/lookbookv2.webp`
  (portrait), `assets/cube/` (six panels), `assets/journey/moon-1..5`,
  `mask-hires`, `moth-full`, `land-03-tower`, `owl1` (no alpha, so it
  becomes a round medallion), `assets/brand/mikey-logo-hi.webp` (alpha;
  the stencil and the gold mark).

## Re-cutting to Mike's music

- Ask for the track (WAV if he has it), its BPM, and the moments that
  matter (intro length, drops, breakdowns). Or detect them: an onset
  envelope in numpy, checked by eye on
  `ffmpeg -filter_complex showwavespic` and `showspectrumpic` images.
- Set `SPB = 60 / BPM`; add an offset if the music has a pickup
  (`T(b) = OFFSET + b * SPB`). Cuts land on whole frames when 1440 / BPM
  is an integer (120 → 12 frames a beat, 144 → 10, 96 → 15, 90 → 16,
  80 → 18); otherwise round each cut to the nearest frame.
- Re-time the scene thresholds in `frame()` and the cut lists to the
  track's structure, and keep `reel_v.js` in step (same tables, its own
  pans).
- Encode with the track in place of `score.wav` (the second `-i` in
  `encode.sh` and `encode_v.sh`), trimmed and faded to the picture.

## The pipeline, with timings and lessons

1. **Serve**: `node srv.mjs $W 8777`, run in the background. The harness
   stops background jobs at a time limit, so restart it when renders fail
   to connect.
2. **Drafts**: `node render.mjs $W/draft 1 4 "b:12,b:24.5,b:61"` renders
   chosen beats at 1080p in seconds. Then
   `node sheet.mjs $W/draft out.png 0 12 4` makes a contact sheet to read.
   Add `reel_v.html` as the fifth argument for the vertical cut.
3. **Full renders**: `node render.mjs $W/frames4k 2 4 all` (4K, about
   10–15 min) and `node render.mjs $W/framesV 1 4 all reel_v.html` (about
   5 min). `render.mjs` deals one-second blocks round the workers and
   recycles each page every 150 frames; a long-lived page slows several-fold
   as it ages. Every frame is deterministic, so any range can be re-rendered
   alone (`620-652`) after a fix.
4. **Check frames** before encoding: every JPEG should end with the EOI
   bytes `FF D9`. Stopping a renderer mid-write leaves a truncated frame.
5. **Encode**: `encode.sh` (4K master, x264 CRF 17, tune film). The
   per-frame grain made it 1.38 GB; for v2 consider CRF 19–20 or a touch
   less grain (`grain(f, 0.075)` near the end of `frame()`). `encode_web.sh`
   and `encode_v.sh` are two-pass at 4.6 Mbps, about 52 MB each, safely
   under GitHub's 100 MB file limit.
6. **Deliver**: the Claude app's file upload refuses files over 500 MiB
   and, in practice, failed with HTTP 502 from about 50 MiB. Big files go
   to GitHub in 95 MB pieces on `showreel-master`:
   `split -b 95M -d -a 2 master.mp4 master.mp4.part`. Prove the rejoin
   (`cat parts | sha256sum`) before pushing, and write the rejoin commands
   (`cat … >` on Mac; `copy /b a + b out` on Windows) into the README.

**Gotchas**

- `pkill -f "pattern"` also matches the shell running it and kills your own
  command; use a bracket, as in `pkill -f "[r]ender.mjs"`.
- A safety check blocks `rm` with globs after a `cd`; write into fresh
  directories instead of clearing old ones.
- Google Fonts is reachable with curl. The reel loads the TTFs from
  `fonts/local.css`, whose URLs are relative to that file.
- Headless Chromium cannot decode H.264. The reel only reads JPEG and WebP,
  so it is unaffected, but testing the site needs media stubs (see
  `CLAUDE.md`).

## Self-critique of v1, as starting points

- The score was synthesised and never heard by its author. Custom music
  fixes that.
- Tale of Twins and Vast Island (720p) and WishFish (540p) are soft at 4K.
- Baked-in text: the Mythopoeic wordmark at 2–9 s (v1 moved the Creative
  Director card to the top of the frame to dodge it), the Nobody Wears It
  Better title from 9 s, WishFish's subtitles, and Vanta's Fanta branding.
- The chapter numerals follow the reel's order (i film, ii design, iii
  writing, iv the fourth door). The site numbers writing ii and design iii.
- The vertical cut depends on per-cut pans; when cuts change, re-check its
  framing with a contact sheet of every cut's middle frame.

## Putting it back on the site

1. Restore the `#showreel` block at the top of `section#film` in
   `index.html` (it is in `git show 1a8189e:index.html`).
2. Copy the new web cuts to `showreel/` and the poster to
   `images/showreel-poster.jpg`, and restore the share page,
   `showreel/index.html` (in `web/` on `showreel-master`).
3. `python3 scripts/build-preload-manifest.py`. Every image in the page's
   DOM must be in `js/core/asset-sizes.js`, or the loader's gate fails.
4. Bump the `?v=` strings in `index.html` (the importmap and the
   `overhaul.css` link), run the tests, check it in the browser, then push
   to `main`.

The site's ambience starts on the loader's Enter click, because browsers
block sound before a gesture. `initShowreel()` ducks it while the reel
plays and brings it back when the reel stops.
