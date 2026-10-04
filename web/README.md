# The web cuts, parked while the reel is re-cut

Taken off portfolio.mikewhyle.com until the reel returns with its new music.

- `index.html`, `poster.jpg`: the share page as it was at /showreel/
- `mike-whyle-showreel-2026.mp4`: 1080p web cut
- `mike-whyle-showreel-2026-vertical.mp4`: 1080x1920 cut for Reels, TikTok and Shorts
- `site-poster.jpg`: the poster the film chamber used (images/showreel-poster.jpg)

To bring it back: restore the `#showreel` block at the top of `#film` in
index.html (it is in commit 1a8189e), copy these files back to `showreel/`
and `images/`, and rebuild the preload manifest. The styles, the playback
code (`initShowreel`) and the audio ducking are still in place on main.
