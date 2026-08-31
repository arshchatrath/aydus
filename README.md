# Scrollable Website Prototype

This is a Vite + React + Three.js prototype demonstrating a scrollable hero section with video scrubbing, a custom procedural explosion shader, and scroll-triggered content sections.

## Assets

Drop your own footage/stills into the `public/` directory, replacing the placeholders:

1. `public/hero-video.mp4` — the footage that gets scrubbed by scroll position.
2. `public/hero-final.webp` — the static frame shown once the scrub finishes (also used as the nav-overlay background and the OG share image).
3. `public/logo.png` — the mark shown in the hero's brand panel.

### Re-encoding `hero-video.mp4` — don't skip this

The hero doesn't play the video normally; it scrubs it by setting `video.currentTime` on every scroll-driven animation frame (see `src/Hero.jsx`). A normally-encoded video only has a keyframe every couple of seconds, so each scrub seek has to decode forward from the last one — that's what makes scrubbing feel laggy/stuttery, worse on mobile. Re-encode any new footage with a short, constant keyframe interval and no B-frames before dropping it in:

```bash
ffmpeg -i your-footage.mp4 \
  -an \
  -c:v libx264 -profile:v high -pix_fmt yuv420p \
  -preset slow -crf 22 \
  -g 6 -keyint_min 6 -sc_threshold 0 -bf 0 \
  -movflags +faststart \
  public/hero-video.mp4
```

- `-an` strips audio — the element is always `muted`, so it's dead weight.
- `-g 6 -keyint_min 6 -sc_threshold 0` forces a keyframe every 6 frames (~0.2s at 30fps) instead of wherever the encoder feels like, so no seek ever has to decode more than a handful of frames.
- `-bf 0` disables B-frames, which reference *future* frames and make seeking more expensive.
- Raise `-g` if the file is too large and scrubbing still feels smooth enough to you; lower `-crf` (larger file) for a sharper image.

`ffmpeg`/`ffprobe` aren't on PATH by default on Windows — grab a build from [gyan.dev](https://www.gyan.dev/ffmpeg/builds/) or [BtbN/FFmpeg-Builds](https://github.com/BtbN/FFmpeg-Builds/releases) if you don't have them.

## Setup and Running

Install dependencies (if not already done):
```bash
npm install
```

Start the development server:
```bash
npm run dev
```

## Tech Stack
- Vite + React
- Three.js + React Three Fiber + Drei
- GSAP + ScrollTrigger
- Lenis (Smooth Scrolling)
