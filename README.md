# OBS Starting Soon Overlay

A live, looping HTML overlay for **OBS Browser Source** (1920×1080). Rotating game backgrounds, audio-reactive HUD, shuffled music playlist — all in one file.

Powering the "BE RIGHT BACK / STARTING SOON / ENDING" scene for **[@vlado_ms](https://www.twitch.tv/vlado_ms)** on Twitch.

![Theme: vladoms](docs/screenshot-vladoms.png)
<br>*The "Eve" operator HUD — rotating game backgrounds, live OBS telemetry, 48-bar FFT equalizer*

---

## Features

- **3 theme presets** — operator HUD, synthwave, wuxia — picked via `?theme=`
- **Audio-reactive** — bars, pulses, headline glitch all driven by live FFT analysis
- **Rotating backgrounds** — 15 game-themed composites with crossfade + CSS gradient fallbacks
- **Shuffled playlist** — sequential play with seamless looping
- **Live OBS telemetry** — SIGNAL, BITRATE, UPTIME, FPS, CPU, DROP via OBS WebSocket v5
- **GPU-friendly** — CSS transforms only, no mixed blend modes, lean compositor
- **One-shot intro** — GSAP entrance animation, skippable with `?nointro=1`

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
2. URL: `http://localhost:8088/?q=Starting%20Soon`
3. Width: `1920`, Height: `1080`
4. Tick **Control audio via OBS**
5. Set desired FPS to match your stream

Tip: combine query params — `http://localhost:8088/?q=Be%20Right%20Back&bg=15&volume=0.5`

---

## Themes

| `?theme=` | HUD | Backgrounds | Audio |
|---|---|---|---|
| `vladoms` **(default)** | "Eve" operator HUD — red/cyan dashboard with top bar, broadcast panel, 48-bar spectrum, live OBS telemetry | 15 rotating game composites — MHGU, MGS2, FFXIV, Persona 5, Trails series, etc. | 8 shuffled tracks |
| `kaiyo` | KAIYO//SHARD synthwave — amber/magenta pulse rows, wireframe icosahedron, Nexus FUI accents | Muted looping disco video | Single looped track |
| `wwm` | Where Winds Meet wuxia — gold double-frame, ornamental corners, jade/ink palette | Looping video with song | Video audio |

---

## Query Parameters

| Param | Default | Effect |
|---|---|---|
| `?q=TEXT` | `STARTING SOON` | Override headline. `?q=Be%20Right%20Back` |
| `?bg=N` | `10` | Seconds between background rotations |
| `?theme=ID` | `vladoms` | Theme preset: `vladoms`, `kaiyo`, `wwm` |
| `?nofx=1` | off | Hide scanlines + grain (lighter GPU load) |
| `?nointro=1` | off | Skip entrance animation |
| `?volume=0.5` | per-track | Override volume for all tracks (0..1) |
| `?obs=0` | on | Disable OBS WebSocket (vladoms theme) |
| `?obsport=N` | `4455` | OBS WebSocket port |
| `?obspw=S` | — | OBS WebSocket password |

Combine freely: `?q=Ending&bg=15&theme=wwm&nofx=1`

---

## Architecture

```
obs-starting-soon/
├── index.html            engine + HTML shell
├── core.css              shared structural styles
├── htmx.min.js           dynamic HUD loading
├── gsap.min.js           intro animation
├── docker-compose.yml    nginx:alpine
└── themes/
    ├── vladoms/          operator HUD
    │   ├── theme.css     operator skin
    │   ├── theme.js      equalizer + OBS telemetry
    │   ├── hud.html      HUD markup
    │   ├── backgrounds/  15 game JPGs
    │   └── songs/        8 audio tracks
    ├── kaiyo/            synthwave HUD
    └── wwm/              wuxia theme
```

### Design decisions

- **Single HTML** — OBS loads one URL; splitting files adds complexity for zero gain
- **Core + theme CSS** — shared styles in `core.css`, theme overrides scoped under `<html class="hud-eve">`
- **htmx for HUD loading** — theme HTML fragments are fetched dynamically, not bundled
- **Web Audio API** — `AnalyserNode` provides 256-bin FFT data every frame
- **CSS transforms** — bars animate with `transform: scaleY()`, never `style.height`
- **Two-layer background crossfade** — mutual opacity swap avoids loading jank
- **No mix-blend-mode** — forces full-stack re-composite; plain overlays read close enough
- **OBS WebSocket v5** — optional live telemetry with SHA-256 challenge-response auth

---

## Adding Content

### Background

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

Append to `themes/vladoms/backgrounds.json` + drop a 1920×1080 JPG in the backgrounds folder.

### Song

```json
{
  "title": "My Song",
  "artist": "Artist Name",
  "src": "themes/vladoms/songs/my-song.mp3",
  "volume": 0.7
}
```

Append to `themes/vladoms/playlist.json` + drop the file in songs folder.

### New theme

Create `themes/<id>/` with `theme.css`, `hud.html`, and optionally `theme.js`. Register in both `__cfg` and `THEMES` in `index.html`.

---

## Performance Tips

- Match Browser Source FPS to your stream FPS (don't run 60 if streaming 30)
- `?nofx=1` — drops scanlines + grain for lighter GPU
- OBS → Settings → Advanced → **Browser Hardware Acceleration: ON**
- Consider halving `BAR_COUNT` if needed — purely cosmetic

---

## Stinger

The `stinger/` directory is a separate HyperFrames project: a 1.6s HUD glitch-wipe transition rendered to alpha WebM. Compatible with OBS scene transitions.

---

## License

MIT — see [LICENSE](LICENSE).

---

*Built for the KAIYO//SHARD broadcast. Forked from the sibling hyperframes-starting-soon video-render project.*
