# Twelve Worlds: the source

Everything needed to re-render the reel or change it: the frame renderer
(`reel.js`, 16:9; `reel_v.js`, 9:16), the score (`music.py` writes
`score.wav`, included), the render driver and the encode scripts.

Every frame is a pure function of its index on one beat map (24 fps,
120 BPM, so a beat is 12 frames). The cut lists are the `ACT1`, `ACT2`,
`ACT5` and `GRID` tables near the middle of `reel.js`; the music's
arrangement is the bottom half of `music.py`, on the same beats.

## Rebuild

From a checkout of `main` (for the films, art and brand assets):

1. Work in a folder beside these files, with `assets`, `images` and
   `video` symlinked in from the `main` checkout.
2. Extract each film to 24 fps frames into `src/<name>/%04d.jpg`:
   `ffmpeg -i video/<name>-hero.mp4 -vf "fps=24,eq=contrast=1.03:saturation=1.04" -q:v 2 src/<name>/%04d.jpg`
3. `python3 music.py` (needs numpy and ffmpeg) to rewrite `score.wav`.
4. `node srv.mjs <this folder> 8777`, then
   `node render.mjs frames4k 2 4 all` (16:9, 4K) or
   `node render.mjs framesV 1 4 all reel_v.html` (9:16), with Playwright.
5. `bash encode.sh` for the 4K master, `encode_web.sh` and `encode_v.sh`
   for the web cuts.
