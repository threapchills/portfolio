#!/bin/bash
# web cuts: two-pass to a fixed size, so the repo (100 MB per file) and the
# page (progressive streaming) both stay comfortable. ~4.6 Mbps picture.
set -e
cd "$(dirname "$0")"
web() { # in out filter
  ffmpeg -v error -y -i "$1" -vf "$3" -c:v libx264 -preset slow -b:v 4600k -maxrate 9000k -bufsize 18000k -tune film \
    -pix_fmt yuv420p -profile:v high -level 4.2 -pass 1 -passlogfile "$2.log" -an -f mp4 /dev/null
  ffmpeg -v error -y -i "$1" -vf "$3" -c:v libx264 -preset slow -b:v 4600k -maxrate 9000k -bufsize 18000k -tune film \
    -pix_fmt yuv420p -profile:v high -level 4.2 -pass 2 -passlogfile "$2.log" \
    -colorspace bt709 -color_primaries bt709 -color_trc bt709 \
    -c:a aac -b:a 192k -movflags +faststart \
    -metadata title="Twelve Worlds · Mike Whyle Showreel 2026" -metadata artist="Mike Whyle" "$2"
  rm -f "$2.log"*
}
web mike-whyle-showreel-2026-4k.mp4 mike-whyle-showreel-2026.mp4 "scale=1920:1080:flags=lanczos"
ffmpeg -v error -y -i frames4k/01992.jpg -vf scale=1920:1080:flags=lanczos -q:v 3 poster.jpg
ls -la mike-whyle-showreel-2026.mp4 poster.jpg
