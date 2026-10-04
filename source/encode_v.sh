#!/bin/bash
# the vertical cut, 1080x1920 for Reels, TikTok and Shorts: two-pass to ~50 MB
set -e
cd "$(dirname "$0")"
common="-c:v libx264 -preset slow -b:v 4600k -maxrate 9000k -bufsize 18000k -tune film -pix_fmt yuv420p -profile:v high -level 4.2"
ffmpeg -v error -y -framerate 24 -i framesV/%05d.jpg $common -pass 1 -passlogfile v2pass -an -f mp4 /dev/null
ffmpeg -v error -y -framerate 24 -i framesV/%05d.jpg -i score.wav $common -pass 2 -passlogfile v2pass \
  -colorspace bt709 -color_primaries bt709 -color_trc bt709 \
  -c:a aac -b:a 192k -ar 48000 -movflags +faststart -shortest \
  -metadata title="Twelve Worlds · Mike Whyle Showreel 2026 (vertical)" -metadata artist="Mike Whyle" \
  mike-whyle-showreel-2026-vertical.mp4
rm -f v2pass*
ls -la mike-whyle-showreel-2026-vertical.mp4
