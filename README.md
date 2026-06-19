# OBS Starting Soon Overlay

A live, looping HTML overlay for **OBS Browser Source** (1920×1080). Theme-specific HUDs, rotating or video backgrounds, audio-reactive effects, and optional music — served from a single URL.

Powering the "BE RIGHT BACK / STARTING SOON / ENDING / INTERMISSION" scene for **[@vlado_ms](https://www.twitch.tv/vlado_ms)** on Twitch.

---

## Features

- **4 theme presets** — operator HUD, synthwave, silent intermission, wuxia — picked via `?theme=`
- **Audio-reactive** — bars, pulses, headline glitch driven by live FFT (when audio is playing)
- **Rotating backgrounds** (vladoms) — 15 game-themed composites with crossfade + CSS gradient fallbacks
- **Video backgrounds** (kaiyo, kaiyo-v4, wwm) — fullscreen looping MP4
- **Shuffled playlist** (vladoms, kaiyo) — sequential play with seamless looping
- **Silent intermission** (kaiyo-v4) — video + headline only, no music
- **Live OBS telemetry** — SIGNAL, BITRATE, UPTIME, FPS, CPU, DROP via OBS WebSocket v5 (vladoms)
- **GPU-friendly** — CSS transforms only, no mixed blend modes, lean compositor
- **One-shot intro** — GSAP entrance animation; skipped by default (`?nointro=0` to play)

---

## Quick Start

### Docker (recommended)

```bash
docker compose up -d
```

Open [http://localhost:8088](http://localhost:8088). Add `?q=Be%20Right%20Back` or any query param.

### Python (lightweight)

```bash
python -m http.server 8080
```

Open [http://localhost:8080](http://localhost:8080).

> OBS browser sources require an HTTP origin — `file://` will not work (fetch fails, audio analyser reads silence).

---

## OBS Setup

1. **Add → Browser Source**
2. URL examples:
   - Default: `http://localhost:8088/?q=Starting%20Soon`
   - Intermission: `http://localhost:8088/?theme=kaiyo-v4&q=INTERMISSION&nofx=1&notextfx=1`
3. Width: `1920`, Height: `1080`
4. Tick **Control audio via OBS** (not needed for `kaiyo-v4` — silent)
5. Set desired FPS to match your stream

Tip: combine query params — `http://localhost:8088/?q=Be%20Right%20Back&bg=15&theme=vladoms&volume=0.5`

---

## Themes

| `?theme=` | HUD | Backgrounds | Audio |
|---|---|---|---|
| `vladoms` **(default)** | "Eve" operator HUD — red/cyan dashboard, 48-bar spectrum, live OBS telemetry | 15 rotating game composites | 8 shuffled tracks |
| `kaiyo` | KAIYO//SHARD synthwave — pulse rows, wireframe icosahedron, Nexus FUI | Muted looping disco video | Single looped track |
| `kaiyo-v4` | Minimal — `VLADO_MS AKA KAIYO//SHARD` kicker + upper-left headline | Native-loop rooftop video (muted) | **Silent** |
| `wwm` | Where Winds Meet wuxia — gold double-frame, ornamental corners | Looping video with song | Video audio |

### kaiyo-v4

Cinematic intermission / BRB screen. No HUD chrome, no music. Headline sits upper-left (clear of the character), wraps at word boundaries, and auto-shrinks for long `?q=` text.

Recommended URL:

```
http://localhost:8088/?theme=kaiyo-v4&q=BE%20RIGHT%20BACK&nofx=1&notextfx=1
```

---

## Query Parameters

| Param | Default | Effect |
|---|---|---|
| `?q=TEXT` | `STARTING SOON` | Override headline. `?q=Be%20Right%20Back` |
| `?bg=N` | `10` | Seconds between background rotations (vladoms) |
| `?theme=ID` | `vladoms` | Theme: `vladoms`, `kaiyo`, `kaiyo-v4`, `wwm` |
| `?nofx=1` | off | Hide scanlines + grain (lighter GPU load) |
| `?notextfx=1` | off | Disable headline glitch / RGB split / slice |
| `?nointro=0` | skipped | Play entrance animation (default skips intro) |
| `?volume=0.5` | per-track | Override volume for all tracks (0..1) |
| `?obs=0` | on | Disable OBS WebSocket (vladoms theme) |
| `?obsport=N` | `4455` | OBS WebSocket port |
| `?obspw=S` | — | OBS WebSocket password |

Combine freely: `?q=Ending&bg=15&theme=wwm&nofx=1&notextfx=1`

---

## Architecture

```
obs-starting-soon/
├── index.html              overlay shell (HTML + inline bootstrap)
├── core.css                shared structural CSS (background stack, headline, blooms)
├── js/
│   ├── config.js           query params, THEMES config, OVERLAY bridge
│   ├── audio.js            playlist + Web Audio API analyser
│   ├── backgrounds.js      A/B crossfade rotation + video background setup
│   └── engine.js           headline builder, intro, tick loop, text effects
├── htmx.min.js             loads theme HUD fragments dynamically
├── gsap.min.js             one-shot intro animation
├── docker-compose.yml      nginx:alpine — port 8088
│
└── themes/
    ├── vladoms/            "Eve" operator HUD (default)
    ├── kaiyo/              KAIYO//SHARD synthwave HUD
    ├── kaiyo-v4/           silent intermission (video + headline)
    └── wwm/                Where Winds Meet wuxia theme
```

### Design decisions

- **Single HTML entry** — OBS loads one URL; engine logic lives in `js/`
- **Core + theme CSS** — shared styles in `core.css`, theme overrides scoped under `<html>` classes
- **htmx for HUD loading** — theme HTML fragments are fetched dynamically, not bundled
- **Web Audio API** — `AnalyserNode` provides FFT data every frame when audio/video is playing
- **Silent themes** — `silent: true` in `js/config.js` prevents playlist fallback
- **CSS transforms** — bars animate with `transform: scaleY()`, never `style.height`
- **Two-layer background crossfade** (vladoms) — mutual opacity swap avoids loading jank
- **Native video loop** — no opacity crossfade on video (avoids fade-to-black on loop)
- **No mix-blend-mode** — forces full-stack re-composite; plain overlays read close enough
- **OBS WebSocket v5** — optional live telemetry with SHA-256 challenge-response auth

---

## Adding Content

### Background (vladoms)

```json
{
  "id": "my-game",
  "game": "My Game",
  "caption": "My character & friends",
  "src": "themes/vladoms/backgrounds/my-game.jpg",
  "tint": ["rgba(10,20,30,0.5)", "rgba(40,30,20,0.5)"],
  "placeholder": "radial-gradient(...) ..."
}
```

Append to `themes/vladoms/backgrounds.json` + drop a 1920×1080 JPG in `themes/vladoms/backgrounds/`.

### Song (vladoms / kaiyo)

```json
{
  "title": "My Song",
  "artist": "Artist Name",
  "src": "themes/vladoms/songs/my-song.mp3",
  "volume": 0.7
}
```

Append to `themes/vladoms/playlist.json` + drop the file in `themes/vladoms/songs/`.

### New theme

Create `themes/<id>/` with `theme.css`, `hud.html`, and optionally `theme.js`. Register in:
- `__cfg` in `index.html` (head bootstrap)
- `THEMES` in `js/config.js`

---

## Performance Tips

- Match Browser Source FPS to your stream FPS (don't run 60 if streaming 30)
- `?nofx=1` — drops scanlines + grain for lighter GPU
- `?notextfx=1` — skips per-frame headline effect work
- OBS → Settings → Advanced → **Browser Hardware Acceleration: ON**
- Consider halving `BAR_COUNT` in vladoms if needed — purely cosmetic

---

## Stinger

The `stinger/` directory is a separate HyperFrames project: a 1.6s HUD glitch-wipe transition rendered to alpha WebM. Compatible with OBS scene transitions. See `stinger/AGENTS.md`.

---

## License

MIT — see [LICENSE](LICENSE).

---

*Built for the KAIYO//SHARD broadcast. Forked from the sibling hyperframes-starting-soon video-render project.*
