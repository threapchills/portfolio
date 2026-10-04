# Twelve Worlds · Mike Whyle Showreel 2026 · 4K master

3840 × 2160 · 24 fps · H.264 High · AAC 320 kbps stereo · 1 min 27 s · 1383984697 bytes

GitHub refuses any single file over 100 MB, so the master is stored here in
95 MB pieces. Joined back together they are the original file, bit for bit.

## Download

On github.com, on this branch: **Code → Download ZIP**, then unzip it.

## Rejoin

**Mac or Linux** (Terminal, inside the unzipped folder):

```
cat mike-whyle-showreel-2026-4k.mp4.part* > mike-whyle-showreel-2026-4k.mp4
```

**Windows** (Command Prompt, inside the unzipped folder):

```
copy /b mike-whyle-showreel-2026-4k.mp4.part00 + mike-whyle-showreel-2026-4k.mp4.part01 + mike-whyle-showreel-2026-4k.mp4.part02 + mike-whyle-showreel-2026-4k.mp4.part03 + mike-whyle-showreel-2026-4k.mp4.part04 + mike-whyle-showreel-2026-4k.mp4.part05 + mike-whyle-showreel-2026-4k.mp4.part06 + mike-whyle-showreel-2026-4k.mp4.part07 + mike-whyle-showreel-2026-4k.mp4.part08 + mike-whyle-showreel-2026-4k.mp4.part09 + mike-whyle-showreel-2026-4k.mp4.part10 + mike-whyle-showreel-2026-4k.mp4.part11 + mike-whyle-showreel-2026-4k.mp4.part12 + mike-whyle-showreel-2026-4k.mp4.part13 mike-whyle-showreel-2026-4k.mp4
```

## Check (optional)

The joined file's SHA-256 should be:

```
2bd15d2729dbf05751c0d5b9410c2a10160551754cad939f2aef338984119481
```

Mac: `shasum -a 256 mike-whyle-showreel-2026-4k.mp4` · Windows: `certutil -hashfile mike-whyle-showreel-2026-4k.mp4 SHA256`
