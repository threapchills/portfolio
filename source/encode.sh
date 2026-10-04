#!/bin/bash
set -e
cd "$(dirname "$0")"
# the 4K master
ffmpeg -v error -y -framerate 24 -i frames4k/%05d.jpg -i score.wav \
  -c:v libx264 -preset slow -crf 17 -tune film -pix_fmt yuv420p -profile:v high -level 5.1 \
  -x264-params aq-mode=3 -colorspace bt709 -color_primaries bt709 -color_trc bt709 \
  -c:a aac -b:a 320k -ar 48000 -movflags +faststart -shortest \
  -metadata title="Twelve Worlds · Mike Whyle Showreel 2026" -metadata artist="Mike Whyle" \
  mike-whyle-showreel-2026-4k.mp4
# the web cut, 1080p
ffmpeg -v error -y -i mike-whyle-showreel-2026-4k.mp4 \
  -vf scale=1920:1080:flags=lanczos -c:v libx264 -preset slow -crf 19 -maxrate 14M -bufsize 28M -tune film \
  -pix_fmt yuv420p -profile:v high -level 4.2 -colorspace bt709 -color_primaries bt709 -color_trc bt709 \
  -c:a aac -b:a 192k -movflags +faststart \
  -metadata title="Twelve Worlds · Mike Whyle Showreel 2026" -metadata artist="Mike Whyle" \
  mike-whyle-showreel-2026.mp4
# the poster: the mark, lit
ffmpeg -v error -y -i frames4k/01992.jpg -vf scale=1920:1080:flags=lanczos -q:v 3 poster.jpg
ls -la mike-whyle-showreel-2026*.mp4 poster.jpg
