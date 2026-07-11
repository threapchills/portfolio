# Handover: ten-task brief (2026-07-12)

STATUS: executed same-day in the same session, commit dfcf9d0, live.
What remains for human ears and eyes on live: the SLUMBR mix (task 1
fixes applied — all four channels primed up front, easing shortened,
new spacey-to-fiery mapping — but nobody has listened yet; tune with
?mixdebug), the light-room hues (my paper palette, Mike may want to
art-direct), the artefact sigil picks (moon / card-back / moth, swap at
will), and the loop-gate pacing. owl1.png stays untracked by design;
only the baked owl1.webp ships. The notes below are kept for reference.

Written at the close of the video-scrub session. Read this alongside the
session memory; everything below is verified against the code as pushed
(commits through 751851a, all live on portfolio.mikewhyle.com).

## State of the world

The index journey is now: moon threshold → Mikey stencil (letterforms
punched through an ink plate, film still behind, plate slides off west)
→ 257-frame scroll scrub of the story film (1920w desktop / 720w mobile,
`video/header/frames*`) → seam on the offered-hands frame (f_0257) →
the reading → Vibe-Coding → outro. Acts I to V and parallax.js are gone.
Sound is on by default, low (MASTER_LEVEL 0.3), waking on first gesture.

Key constants: `js/core/journey.js` top (FRAMES, VEIL, SCRUB, BEATS,
INK_IN, MIX, READING_BANDS); `#journey` height in `css/overhaul.css`
(900vh desktop, 760vh mobile); deal trigger in `js/core/cards.js`
('top 15%').

## The tasks

### 1 · SLUMBR mix for the story scroll
Spacey at the start, air and water through the zoom, earthy and fiery
into the reading, with swifter, more abrupt shifts between them.
- The mix vectors and act thresholds: `MIX` and `mixAt()` in
  `js/core/journey.js` (~line 40). Stems available: sea, sky, earth,
  fire, three variants each (`STEMS` in `js/core/audio.js`). Listen
  before mapping: "spacey" is probably the sky set.
- Abruptness knob: `SMOOTH_TAU` (1.6s) in audio.js is the gain-easing
  time constant. Lower it, or give mixAt() harder steps.
- "Engine breaks in parts": undiagnosed. Debug on live with `?mixdebug`
  (live channel sliders). Suspects worth checking: channels lazy-start
  only when their target first exceeds 0.01 (fetch+decode latency mid
  scroll); `fadeAll()` on the outro is overwritten every frame by
  `setMix` from `sectionProgress()`, so the outro silence relies on
  MIX.outro being all zero, not on fadeAll; variant rotation crossfades
  every 60-90s could coincide with mix changes.
- MIX.reading is currently sky 0.08 / earth 0.12; the brief wants
  earth and fire there.

### 2 · Alternating light and dark sections
Dark from the top (journey and reading work dark), then Vibe-Coding
(#fourth-door) in light mode, then "Onwards" (#outro) back to dark
before the loop point. Elegant, subtle shift.
- Mike's sentence in the brief truncates ("...the reading or the"); the
  assumed mapping is journey+reading dark, fourth-door light, outro
  dark. Confirm with him if the reading's fate seems ambiguous.
- No theming infrastructure exists. Suggested shape: a body-level class
  toggled by ScrollTrigger as #fourth-door enters/leaves, swapping CSS
  custom properties with a long transition.
- Traps: the cursor trail canvas uses `mix-blend-mode: screen`, which
  vanishes on light ground (needs a blend/colour swap in light mode);
  the moon cursor's drop-shadow is tuned for dark; `.grain-veil` and
  the vignette assume dark; `.eb-num` uses mix-blend difference on
  chamber edges (chambers unaffected, but check the fourth-door
  eyebrow).

### 3 · Seamless loop
After the outro, scroll continues to black, the Mikey plate slides in
from the right, and the experience teleports back to the top.
- Sketch: a #loop-gate section after #outro replaying the stencil veil
  mirrored (translate from +112% to 0). At the moment the plate fully
  covers the viewport, it is pixel-identical to the resting opening
  plate, so `lenis.scrollTo(0, { immediate: true })` there is an
  invisible cut. The seam device from the reading is precedent: match
  pixels, then teleport.
- Gotchas: don't re-run the threshold (the returning-visitor path in
  index.html shows how to skip it); the deal's sessionStorage means
  cards are already on the table after looping (fine, arguably right);
  call ScrollTrigger.refresh() after the jump; keyboard beats array in
  journey.js should include the gate.

### 4 · Vibe-Coding icons and trail
Three distinct icons, one per artefact (currently all three are
`assets/journey/land-03-tower.webp`, `.artefact-sigil` in index.html).
- "Go back to a different icon for each": pick three sigils and show
  Mike options. Candidates on disk: moth-full, moon-5, tower, the
  glyphs set, or bake new cutouts from the source art at repo root.
- Trail must pass behind the tiles, as with the cards. In theory
  `#fourth-door > * { position: relative; z-index: 2 }` (overhaul.css
  ~line 89) already puts them above the trail (z 1); Mike observes
  otherwise on live, so verify there. Note the light-mode work (task 2)
  changes this ground anyway; solve them together.

### 5 · Rename the cube face
`js/data.js` line ~318, WRITING_FACES: title "Client work" becomes
"Miscellaneous musings". The face's stories are untouched.

### 6 · Copy changes
- index.html `.outro-credit`: "Drawn by hand in marker. Conjured into
  the browser with AI." becomes "Made with Fable 5" (keep the © line).
- index.html `.hero-roles` on the stencil veil: becomes exactly
  "Cape Town based GenAI film-maker; writer, and creative."
- Sweep the noscript block and any meta description echoing the old
  roles line.

### 7 · Free-drag cube with wheel realign
Drag the cube on both axes (top and bottom faces reachable); the mouse
wheel realigns it so the clickable side faces front again. Owl for the
bottom face, beetle stays on top.
- All in `js/core/cube.js`. Current drag is Y-dominant with sway;
  arbitrary rotX changes two hard-won mechanisms, so tread carefully:
  (a) clicks are resolved by projected getBoundingClientRect on a
  single #cube-scene listener because ±90° faces fail native hit-tests
  under preserve-3d; (b) hover/fronting-face detection (updateHover)
  assumes Y-rotation when choosing the fronting content face. Both
  need to survive free rotation; wheel-realign (snap rotX to rest,
  rotY to nearest side face) restores the clickable state.
- The owl asset `assets/journey/owl1.png` is 14.8MB. Bake it to webp
  (~1024w, q80) before use; never ship the png.

### 8 · Seam polish: doubled cards
Mike's screenshot shows the film's big decorative cards on screen while
the real GUI cards peek in at the bottom. Diagnosis: the reading wrap
overlaps the journey by 100vh (the seam device), and #reading is
transparent, so the card table rides up over the film's final 100vh,
which is exactly the film's card-dissolve beat (frames ~215-252).
- Fix directions, pick after feeling it live: gate the real cards'
  visibility on seam proximity (opacity driven from readingP/scroll
  rather than dealt-once state); or delay the deal trigger past the
  seam; or position-match the real cards onto the film's card spots
  and glide them to the table (the most cinematic, the most work).
- Keep the ground seam itself: it is pixel-exact and verified. The
  problem is only the table peeking early.

### 9 · Delete the artefact copy
Remove the three descriptive paragraphs in #fourth-door (index.html):
"A free sleep and meditation soundscape machine...", "Free readings
rooted in African symbolism...", "Vibe-coded browser games and solo
Unreal Engine work...". Tiles become icon, title, CTA.

### 10 · Vibe-Coding links go straight to the apps
- SLUMBR: https://slumbr.mikewhyle.com/
- Afrikan Tarot: https://tarot.mikewhyle.com/
- Mystik Skies: https://threapchills.github.io/skybaby/ (already so)
Sweep every occurrence: the three `.artefact` hrefs and `.door-credit`
in #fourth-door, the SLUMBR and Afrikan Tarot entries in `.outro-links`
(all currently mikewhyle.com/slumbr/ and /tarot/), and consider the
matching links inside `js/data.js` detail-page entries for consistency.

## Working methods (hard-won, do not re-derive)

- Deploy: portfolio-main IS the git clone; commit and push from it
  directly (remote threapchills/portfolio, Pages + CNAME). Push only
  when Mike says.
- The launch preview (`portfolio` in .claude/launch.json) freezes rAF:
  drive frames by hand with `ScrollTrigger.update()` then a loop of
  `gsap.ticker.tick()`. Screenshots only work on a fresh page load, and
  degrade as the session ages. `?dbg` exposes window.__dbg (scrubber,
  choreography constants); `?autoscroll=off` kills reading snap;
  `?mixdebug` shows audio sliders. Verify motion and sound on live.
- Frames pipeline: `ffmpeg -i <src> -vf "fps=12,scale=W:-2" -c:v libwebp
  -q:v 54 f_%04d.webp`. Desktop 1920w q54, mobile 720w q55, 257 frames.
  If a new render changes the count, update FRAMES.count in journey.js;
  everything else follows.
- Threshold gates on the hi-res mask + first 48 frames only; the rest
  stream behind.

## Standing flags

- No LinkedIn URL for the outro links (Mike never supplied one).
- News Drop editions 13 and 15 absent from source; issue 16 captions
  itself #17.
- Film chamber loader still blocks on ~14.5MB of scrub frames; make
  progressive if anyone complains.
- Stencil letters over black film regions read as ink-on-ink at rest;
  if Mike wants them shyer-proof, add a hairline moon-tinted rim layer.
- The Veo watermark stays by Mike's choice; leave it.
