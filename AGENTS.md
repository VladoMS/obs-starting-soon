# OBS Starting Soon Overlay

Live, looping HTML overlay for **OBS Browser Source** (1920×1080). Powers the "BE RIGHT BACK / STARTING SOON / ENDING / INTERMISSION" scene with theme-specific HUDs, rotating or video backgrounds, audio-reactive effects, and optional music.

## Architecture

```
obs-starting-soon/
├── index.html              overlay shell (HTML + inline bootstrap)
├── core.css                shared structural CSS (background stack, headline, blooms)
├── js/                     extracted engine modules
│   ├── config.js           query params, THEMES config, OVERLAY bridge, tryPlayElement, fileExists
│   ├── audio.js            playlist + Web Audio API analyser
│   ├── backgrounds.js      A/B crossfade rotation, setupVideoBackground helper
│   └── engine.js           headline builder, intro, tick loop, glitch/RGB/slice effects
├── htmx.min.js             loads theme HUD fragments dynamically
├── gsap.min.js             one-shot intro animation
├── docker-compose.yml      nginx:alpine — serve over HTTP (required for audio context)
│
├── themes/                 self-contained theme presets
│   ├── vladoms/            "Eve" operator HUD (default, by @vlado_ms)
│   │   ├── theme.css       operator skin: red/cyan/void palette
│   │   ├── theme.js        equalizer, OBS WebSocket telemetry, status cluster
│   │   ├── hud.html        HTML fragment for htmx
│   │   ├── backgrounds.json  15 game entries (src, tint, placeholder fallback)
│   │   ├── playlist.json     8 tracks (shuffled, looped)
│   │   ├── backgrounds/      *.jpg composites
│   │   └── songs/            *.wav / *.mp3
│   ├── kaiyo/              KAIYO//SHARD synthwave HUD
│   │   ├── theme.css       amber/magenta/cyan palette, Nexus FUI accents
│   │   ├── theme.js        perspective grid, icosahedron, pulse rows
│   │   ├── hud.html        HTML fragment
│   │   ├── *.mp4           muted looping background video
│   │   └── *.mp3           single looped track
│   ├── kaiyo-v4/           minimal intermission / BRB (silent video)
│   │   ├── theme.css       upper-left headline, KAIYO//SHARD readout styling
│   │   ├── hud.html        empty shell (no HUD chrome)
│   │   └── kaiyo-v4-intermision.mp4  native-loop rooftop video (no audio)
│   └── wwm/                Where Winds Meet wuxia theme
│       ├── theme.css       jade/gold/ink palette, double-frame chrome
│       ├── hud.html        HTML fragment (no JS)
│       ├── logo.png
│       └── *.mp4           looping video (song from file)
│
└── stinger/                OBS scene stinger (1.6s alpha WebM transition)
    ├── index.html          HyperFrames composition
    ├── AGENTS.md
    ├── hyperframes.json
    ├── package.json
    └── stinger-audio.wav
```

## Themes

Pick with `?theme=vladoms|kaiyo|kaiyo-v4|wwm` (default `vladoms`). Each theme is self-contained in `themes/<id>/`:

| Theme | HUD Style | Background Mode | Audio Source |
|---|---|---|---|
| `vladoms` (default) | "Eve" operator HUD — red/cyan, top bar, broadcast panel, 48-bar FFT equalizer, OBS telemetry | Rotating game backgrounds | Shuffled playlist (8 tracks) |
| `kaiyo` | Synthwave — amber/magenta, SYS/NET/AUD pulses, wireframe icosahedron, Nexus FUI | Muted looping video | Single looped track |
| `kaiyo-v4` | None — `VLADO_MS AKA KAIYO//SHARD` kicker + upper-left headline only | Native-loop muted video (full frame) | Silent (`silent: true` — no playlist) |
| `wwm` | Wuxia — jade/gold double-frame, ornamental corners, logo | Looping video (song from file) | Video audio |

### kaiyo-v4 specifics

- Headline sits **upper-left** (left of character in the video), wraps at **word boundaries** only
- `?q=` auto-shrinks to fit the left column; use `?notextfx=1` for static text with outline/halo (no glitch)
- `?nofx=1` recommended — no scanlines/grain over cinematic footage
- Example: `?theme=kaiyo-v4&q=INTERMISSION&nofx=1&notextfx=1`

### Theme anatomy

Each theme folder contains:
- `theme.css` — scoped under an `<html>` class (e.g. `html.hud-eve`, `html.theme-kaiyo-v4`) so it cleanly overrides core styles
- `theme.js` — optional; registers per-frame hooks via `OVERLAY.onTick()` and intro hooks via `OVERLAY.onIntro()`
- `hud.html` — HTML fragment loaded into `#theme-hud` by htmx; theme JS is loaded after swap when listed in `__cfg`

New themes are registered in:
1. The `__cfg` object in `index.html`'s head bootstrap (`cls`, `css`, `hud`, optional `js`)
2. The `THEMES` object in `js/config.js` (`bg` mode, `track`, `silent`, etc.)
3. A folder under `themes/<id>/` with `theme.css`, `hud.html`, and optionally `theme.js`

## Query Parameters

| Param | Default | Description |
|---|---|---|
| `?q=TEXT` | `STARTING SOON` | Override headline (auto-shrinks). Use `%20` for spaces. |
| `?bg=N` | `10` | Seconds between background rotations (vladoms) |
| `?theme=ID` | `vladoms` | Theme preset (`vladoms`, `kaiyo`, `kaiyo-v4`, `wwm`) |
| `?nofx=1` | off | Hide scanlines + grain (cleaner, lighter) |
| `?notextfx=1` | off | Disable headline glitch / RGB split / slice |
| `?nointro=0` | skipped | Play entrance animation (`?nointro=1` or omit = snap, no intro) |
| `?volume=0.5` | per-track | Override audio volume (0..1) |
| `?obs=0` | on | Disable OBS WebSocket (vladoms theme) |
| `?obsport=N` | `4455` | OBS WebSocket port |
| `?obspw=S` | — | OBS WebSocket password |

## Architecture Principles

- **Single HTML entry** by design. OBS loads one URL (`index.html`).
- **Core + theme separation**: `core.css` is shared structural styles; theme CSS scopes overrides under an `<html>` class.
- **GSAP intro only** — one-shot entrance animation. No infinite GSAP tweens on composited layers (kills OBS performance). Default skips intro via `introTl.progress(1)`; `?nointro=0` plays it.
- **Audio reactivity** via Web Audio API: `<audio>` or `<video>` → `MediaElementSource` → `AnalyserNode`. Per-frame `tick()` dispatches FFT data to theme hooks.
- **Silent themes** — `silent: true` in `THEMES` skips `loadPlaylist()` so no vladoms fallback music plays.
- **CSS transforms for animation**: Bars use `transform: scaleY()`, not `style.height` — GPU-only, no layout triggers.
- **Background crossfade** (vladoms): Two `<div class="bg-layer">` elements swap opacities (1.2s tween) on rotation.
- **Video backgrounds**: Single `<video id="bg-video">` with native `loop` (no opacity crossfade — avoids fade-to-black artifacts).
- **Image + CSS placeholder fallback**: Each background entry can render as a real image or a multi-layer CSS gradient if the image is missing.
- **Layer compositing kept lean**: No `mix-blend-mode`, no per-bar `filter: drop-shadow`, no `filter` on bg layers.
- **`contain: layout style paint`** on `.eq-row` to isolate bar transforms from sibling layers.

## Data Flow

1. `index.html` loads → head bootstrap applies `<html>` classes + loads theme CSS; `?notextfx=1` adds `no-text-fx` class
2. htmx fetches `themes/<id>/hud.html` into `#theme-hud`
3. Theme JS loads after swap (if listed in `__cfg`), registers with `OVERLAY.onTick()` / `OVERLAY.onIntro()`
4. `js/config.js` → `js/backgrounds.js` / `js/audio.js` / `js/engine.js` load backgrounds, audio, headline
5. Each frame: `tick()` → `computeEnvelopes()` → (unless `?notextfx=1`) `applyHeadlineGlitch()` / `applyRgbSplit()` / `applySlice()` → theme tick hooks
6. Intro runs as a GSAP timeline; skipped by default (`NO_INTRO`); `?nointro=0` calls `introTl.play()`

## Performance

- Browser Source FPS should match stream FPS (don't run 60 if streaming 30)
- `?nofx=1` drops scanlines + grain for lighter GPU load
- OBS → Settings → Advanced → **Browser Hardware Acceleration: ON**
- Consider halving `BAR_COUNT` in vladoms theme if needed (purely cosmetic)

## Audio

- No `crossorigin="anonymous"` on `<audio>` — local files would taint the `MediaElementSource` and the analyser would read silence
- Same-origin HTTP server required for analyser to work
- `file://` doesn't work for `fetch()` of JSON files in OBS
- `kaiyo-v4` sets `silent: true` — no `<audio>` track; headline effects run idle unless another theme is active

## Stinger

The `stinger/` directory is a separate HyperFrames project: a 1.6s HUD glitch-wipe composition rendered to alpha WebM for OBS scene transitions. See `stinger/AGENTS.md` for details.

## Adding Content

**New background**: append entry to `themes/vladoms/backgrounds.json` + drop JPG in `themes/vladoms/backgrounds/`.

**New song**: append entry to `themes/vladoms/playlist.json` + drop file in `themes/vladoms/songs/`.

**New theme**: create `themes/<id>/` folder with `theme.css`, `hud.html`, and optionally `theme.js`; register in `__cfg` (`index.html`) + `THEMES` (`js/config.js`).

## Known Quirks

- `file://` doesn't work for `fetch()` or query strings in OBS. Always serve via HTTP (`docker compose up` → port 8088).
- First page load may need a click to start audio (autoplay policy). OBS typically allows it; the code installs a one-shot click listener as fallback.
- Long `?q=` text auto-shrinks to fit the headline column (vladoms/kaiyo: ~1380px; kaiyo-v4: left column width, 28px floor).
- Seamless video loops require matching first/last frames in the source MP4; native `loop` is a hard cut, not a dissolve.
