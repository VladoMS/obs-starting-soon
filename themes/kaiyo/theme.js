/* ==========================================================================
   themes/kaiyo/theme.js — KAIYO//SHARD synthwave HUD behaviour
   Loaded by the head bootstrap after themes/kaiyo/hud.html is swapped in. Draws
   the perspective grid + wireframe icosahedron, drives the SYS/NET/AUD pulse rows
   and the nexus-core gauge, shuffles the TX broadcast id, mirrors the now-playing
   text, and registers its intro fades — all via the OVERLAY bridge (no own rAF).
   ========================================================================== */
(function () {
  "use strict";
  const O = window.OVERLAY;
  if (!O) return;
  const RGB_LINE = (O.THEME && O.THEME.rgbLine) || "255, 43, 214";

  // ---- perspective grid floor ----
  const grid = document.getElementById("grid-floor");
  const gctx = grid.getContext("2d");
  const GW = grid.width, GH = grid.height;
  function drawGrid(scrollT) {
    gctx.clearRect(0, 0, GW, GH);
    gctx.lineWidth = 1.0;
    const rowCount = 10;
    for (let i = 0; i < rowCount; i++) {
      const t = ((i + scrollT) % rowCount) / rowCount;
      const y = GH * (t * t);
      if (t < 0.05) continue;
      const alpha = 0.03 + (1 - t) * 0.18;
      gctx.strokeStyle = "rgba(" + RGB_LINE + ", " + alpha.toFixed(3) + ")";
      gctx.beginPath(); gctx.moveTo(0, y); gctx.lineTo(GW, y); gctx.stroke();
    }
    const colCount = 12;
    const VANISH_X = GW / 2;
    gctx.strokeStyle = "rgba(" + RGB_LINE + ", 0.10)";
    for (let j = -colCount; j <= colCount; j++) {
      const x = VANISH_X + j * (GW * 0.5 / colCount);
      gctx.beginPath(); gctx.moveTo(VANISH_X, 0); gctx.lineTo(x, GH); gctx.stroke();
    }
  }

  // ---- wireframe icosahedron ----
  const ico = document.getElementById("ico-canvas");
  const ictx = ico.getContext("2d");
  const IW = ico.width, IH = ico.height;
  const phi = (1 + Math.sqrt(5)) / 2;
  const ICO_VERTS = [
    [-1,phi,0],[1,phi,0],[-1,-phi,0],[1,-phi,0],
    [0,-1,phi],[0,1,phi],[0,-1,-phi],[0,1,-phi],
    [phi,0,-1],[phi,0,1],[-phi,0,-1],[-phi,0,1]
  ];
  const ICO_EDGES = [
    [0,1],[0,5],[0,7],[0,10],[0,11],[1,5],[1,7],[1,8],[1,9],
    [2,3],[2,4],[2,6],[2,10],[2,11],[3,4],[3,6],[3,8],[3,9],
    [4,5],[4,9],[4,11],[5,9],[5,11],[6,7],[6,8],[6,10],
    [7,8],[7,10],[8,9],[10,11]
  ];
  function drawIcosahedron(rotY, rotX) {
    ictx.clearRect(0, 0, IW, IH);
    const cx = IW / 2, cy = IH / 2, scale = 60;
    const cy_ = Math.cos(rotX), sy_ = Math.sin(rotX);
    const cx_ = Math.cos(rotY), sx_ = Math.sin(rotY);
    const proj = ICO_VERTS.map(v => {
      const x = v[0], y = v[1], z = v[2];
      const x1 = x * cx_ + z * sx_;
      const z1 = -x * sx_ + z * cx_;
      const y2 = y * cy_ - z1 * sy_;
      const z2 = y * sy_ + z1 * cy_;
      const persp = 6 / (6 + z2);
      return [cx + x1 * scale * persp, cy + y2 * scale * persp, z2];
    });
    ictx.lineWidth = 1.6;
    for (const [a, b] of ICO_EDGES) {
      const za = proj[a][2], zb = proj[b][2];
      const zAvg = (za + zb) / 2;
      const alpha = 0.15 + Math.max(0, (2.0 - zAvg) / 4) * 0.85;
      ictx.strokeStyle = "rgba(" + RGB_LINE + ", " + alpha.toFixed(3) + ")";
      ictx.shadowColor = "rgba(" + RGB_LINE + ", 0.85)";
      ictx.shadowBlur = 6;
      ictx.beginPath(); ictx.moveTo(proj[a][0], proj[a][1]); ictx.lineTo(proj[b][0], proj[b][1]); ictx.stroke();
    }
    ictx.shadowBlur = 0;
  }

  // ---- TX broadcast id shuffle (cheap text swap every ~1.4s) ----
  (function txIdShuffle() {
    const el = document.getElementById("nexus-tx-id");
    const HEX = "0123456789ABCDEF";
    const r = () => HEX[Math.floor(Math.random() * 16)];
    setInterval(() => { if (el) el.textContent = r()+r()+r() + "-XX-" + r()+r()+r() + "1"; }, 1400);
  })();

  // ---- blink dot (every 2s) ----
  gsap.timeline({ repeat: -1 })
    .to("#hud-blink", { opacity: 0, duration: 0.10, ease: "power2.in" }, 1.9)
    .to("#hud-blink", { opacity: 1, duration: 0.20, ease: "power2.out" }, 2.0);

  // ---- cached per-frame elements ----
  const pulse1 = document.getElementById("pulse-1");
  const pulse2 = document.getElementById("pulse-2");
  const pulse3 = document.getElementById("pulse-3");
  const nexusCore = document.getElementById("nexus-core");
  const npEl = document.querySelector("#hud-tr .np");
  let lastNp = "";

  const CANVAS_INTERVAL_MS = 1000 / 30;
  let lastCanvasMs = 0;

  // ---- per-frame hook ----
  O.onTick(function (f) {
    const drawCanvas = (f.nowMs - lastCanvasMs) >= CANVAS_INTERVAL_MS;
    if (drawCanvas) {
      lastCanvasMs = f.nowMs;
      drawIcosahedron(f.elapsed * 0.45, f.elapsed * 0.18 + f.bass * 0.8 + f.holdBass * 0.4);
      drawGrid(f.elapsed * 0.10);
    }
    pulse1.style.width = Math.min(100, 12 + f.bass   * 60 + f.holdBass   * 16).toFixed(1) + "%";
    pulse2.style.width = Math.min(100, 10 + f.mid    * 64 + f.holdMid    * 16).toFixed(1) + "%";
    pulse3.style.width = Math.min(100, 12 + f.treble * 62 + f.holdTreble * 16).toFixed(1) + "%";
    const coreFill = Math.min(1, 0.12 + f.bassEnv * 0.72 + f.holdBass * 0.45);
    nexusCore.style.setProperty("--bass", coreFill.toFixed(3));
    if (npEl && O.nowPlaying !== lastNp) { lastNp = O.nowPlaying; npEl.textContent = O.nowPlaying || "STANDBY"; }
  });

  // ---- intro fades (added to the shared timeline; progress(1) snaps when ?nointro=1) ----
  O.onIntro(function (tl, noIntro) {
    const dur = noIntro ? 0 : 1;
    tl.to("#grid-floor", { opacity: 0.30, duration: 1.6 * dur, ease: "sine.out" }, 0.4);
    tl.to(["#hud-tl", "#hud-tr"], { opacity: 1, duration: 1.2 * dur, ease: "expo.out" }, 1.4);
    tl.to(".nexus-corner",  { opacity: 1, duration: 1.2 * dur, ease: "expo.out" }, 1.4);
    tl.to("#nexus-tx",      { opacity: 1, duration: 1.2 * dur, ease: "expo.out" }, 1.5);
    tl.to("#hud-bl",        { opacity: 1, duration: 1.2 * dur, ease: "expo.out" }, 1.6);
    tl.to("#nexus-core",    { opacity: 1, duration: 1.2 * dur, ease: "expo.out" }, 1.7);
    tl.to("#hud-br",        { opacity: 0.95, duration: 1.2 * dur, ease: "expo.out" }, 1.6);
    tl.to("#nexus-hex-ring",{ opacity: 1, duration: 1.6 * dur, ease: "sine.out" }, 1.8);
  });
})();
