/* ==========================================================================
   themes/vladoms/theme.js — @vlado_ms "Eve" operator HUD behaviour
   Loaded by the head bootstrap after themes/vladoms/hud.html is swapped in.
   Builds + drives the 48-bar FFT spectrum equalizer and the AUX mini-eq, mirrors
   the now-playing text, runs the live status cluster (clock/UTC/latency/uptime),
   and connects to OBS WebSocket v5 for SIGNAL/BITRATE/UPTIME/FPS/CPU/DROP. All
   per-frame work goes through OVERLAY.onTick (no own rAF). OBS poll + status tick
   run on their own setInterval, off the animation loop.
   ========================================================================== */
(function () {
  "use strict";
  const O = window.OVERLAY;
  if (!O) return;
  const params = O.params;

  // ---- RTE crumb mirrors the headline text ----
  const rte = document.getElementById("eve-rte");
  if (rte) rte.textContent = O.HEADLINE_TEXT || "STARTING SOON";

  // ---- spectrum equalizer: build 48 bars once ----
  const EQ = document.getElementById("eq-v2");
  const EQ_BAR_COUNT = 48;
  const eqBars = [];
  if (EQ) for (let i = 0; i < EQ_BAR_COUNT; i++) {
    const b = document.createElement("div"); b.className = "eq-bar"; EQ.appendChild(b); eqBars.push(b);
  }
  const eveMpEq = Array.prototype.slice.call(document.querySelectorAll("#eve-hud .eve-mp-eq i"));
  const eveNp = document.getElementById("eve-np");
  const eveNp2 = document.getElementById("eve-np2");
  const eveCounter = document.getElementById("eve-mp-counter");
  let lastNp = "";

  // ---- per-frame hook ----
  O.onTick(function (f) {
    const fd = O.audio.freqData;
    if (eqBars.length) {
      for (let i = 0; i < eqBars.length; i++) {
        let v;
        if (f.live && fd) {
          const bin = 2 + Math.floor(i * (178 / eqBars.length));
          v = (fd[bin] / 255) * (1 + (i / eqBars.length) * 1.6);
        } else {
          v = 0.12 + 0.10 * Math.max(0, Math.sin(f.elapsed * 2.2 + i * 0.35));
        }
        eqBars[i].style.transform = "scaleY(" + Math.max(0.04, Math.min(1, v)).toFixed(3) + ")";
      }
    }
    if (eveMpEq.length) {
      const bands = [f.bass, f.mid, Math.min(1, (f.mid + f.treble) / 2), f.treble];
      for (let i = 0; i < eveMpEq.length; i++) {
        eveMpEq[i].style.transform = "scaleY(" + Math.max(0.18, Math.min(1, bands[i])).toFixed(3) + ")";
      }
    }
    if (O.nowPlaying !== lastNp) {
      lastNp = O.nowPlaying;
      if (eveNp)  eveNp.textContent  = O.nowPlaying;
      if (eveNp2) eveNp2.textContent = O.nowPlaying;
      if (eveCounter) {
        const n = O.trackCount || 1;
        eveCounter.textContent = String((O.trackIdx % n) + 1).padStart(2, "0") + "/" + String(n).padStart(2, "0");
      }
    }
  });

  // ---- live status cluster (clock / UTC / jittered latency / session uptime) ----
  let obsConnected = false;
  const elClock  = document.getElementById("eve-clock");
  const elUtc    = document.getElementById("eve-utc");
  const elLat    = document.getElementById("eve-lat");
  const elUptime = document.getElementById("eve-uptime");
  const startMs  = performance.now();
  const p2 = (n) => String(n).padStart(2, "0");
  function updateStatus() {
    const d = new Date();
    if (elClock)  elClock.textContent  = p2(d.getHours()) + ":" + p2(d.getMinutes()) + ":" + p2(d.getSeconds());
    if (elUtc)    elUtc.textContent    = d.getUTCFullYear() + "." + p2(d.getUTCMonth() + 1) + "." + p2(d.getUTCDate());
    if (elLat)    elLat.textContent    = (8 + Math.floor(Math.random() * 14)) + " ms";
    if (elUptime && !obsConnected) {
      const s = Math.floor((performance.now() - startMs) / 1000);
      elUptime.textContent = p2(Math.floor(s / 3600)) + ":" + p2(Math.floor(s / 60) % 60) + ":" + p2(s % 60);
    }
  }
  updateStatus();
  setInterval(updateStatus, 1000);

  // ---- OBS WebSocket v5 telemetry (auto-connect; falls back to static values) ----
  if (params.get("obs") !== "0") {
    const OBS_PORT     = params.get("obsport") || "4455";
    const OBS_PASSWORD = params.get("obspw") || "";
    const sigEl  = document.getElementById("eve-signal");
    const brEl   = document.getElementById("eve-bitrate");
    const uptEl  = document.getElementById("eve-uptime");
    const fpsEl  = document.getElementById("eve-fps");
    const cpuEl  = document.getElementById("eve-cpu");
    const dropEl = document.getElementById("eve-drop");
    const dotEl  = document.querySelector("#eve-hud .eve-dot");
    const pad2   = (n) => String(n).padStart(2, "0");
    const fmtDur = (ms) => {
      const s = Math.floor((ms || 0) / 1000);
      return pad2(Math.floor(s / 3600)) + ":" + pad2(Math.floor(s / 60) % 60) + ":" + pad2(s % 60);
    };
    async function obsAuth(password, salt, challenge) {
      const enc = new TextEncoder();
      const sha256b64 = async (str) => {
        const buf = await crypto.subtle.digest("SHA-256", enc.encode(str));
        let bin = ""; new Uint8Array(buf).forEach((b) => (bin += String.fromCharCode(b)));
        return btoa(bin);
      };
      return await sha256b64((await sha256b64(password + salt)) + challenge);
    }
    function connectOBS() {
      let ws;
      try { ws = new WebSocket("ws://localhost:" + OBS_PORT); }
      catch (e) { setTimeout(connectOBS, 5000); return; }
      let bytesPrev = null, tPrev = 0, pollTimer = null;
      const poll = () => {
        if (ws.readyState !== 1) return;
        ws.send(JSON.stringify({ op: 6, d: { requestType: "GetStreamStatus", requestId: "ss" } }));
        ws.send(JSON.stringify({ op: 6, d: { requestType: "GetStats",        requestId: "st" } }));
      };
      ws.onmessage = async (ev) => {
        let msg; try { msg = JSON.parse(ev.data); } catch (e) { return; }
        if (msg.op === 0) {
          const d = { rpcVersion: 1, eventSubscriptions: 0 };
          if (msg.d && msg.d.authentication) {
            try { d.authentication = await obsAuth(OBS_PASSWORD, msg.d.authentication.salt, msg.d.authentication.challenge); }
            catch (e) { console.warn("[obs] auth hash failed", e); }
          }
          ws.send(JSON.stringify({ op: 1, d }));
        } else if (msg.op === 2) {
          obsConnected = true; poll(); pollTimer = setInterval(poll, 1000);
        } else if (msg.op === 7 && msg.d) {
          const r = msg.d.responseData || {};
          if (msg.d.requestType === "GetStreamStatus") {
            if (!r.outputActive) {
              if (sigEl) { sigEl.textContent = "STANDBY"; sigEl.className = "v"; }
              if (brEl)  brEl.textContent = "0 kb/s";
              if (dotEl) dotEl.style.background = "var(--amber)";
              bytesPrev = null;
            } else {
              const c = r.outputCongestion;
              let label = "LIVE", col = "var(--green)", cls = "v live";
              if (c != null && c >= 0.7)      { label = "DROPPING"; col = "var(--red)";   cls = "v live"; }
              else if (c != null && c >= 0.3) { label = "UNSTABLE"; col = "var(--amber)"; cls = "v"; }
              if (sigEl) { sigEl.textContent = label; sigEl.className = cls; }
              if (dotEl) dotEl.style.background = col;
              const now = performance.now();
              if (bytesPrev != null && tPrev) {
                const dt = (now - tPrev) / 1000;
                if (dt > 0 && brEl) {
                  const kbps = ((r.outputBytes - bytesPrev) * 8) / (dt * 1000);
                  brEl.textContent = Math.max(0, Math.round(kbps)) + " kb/s";
                }
              }
              bytesPrev = r.outputBytes; tPrev = now;
            }
            if (uptEl) uptEl.textContent = fmtDur(r.outputDuration);
            if (dropEl) {
              const pct = r.outputTotalFrames ? (r.outputSkippedFrames / r.outputTotalFrames * 100) : 0;
              dropEl.textContent = pct.toFixed(1) + " %";
            }
          } else if (msg.d.requestType === "GetStats") {
            if (fpsEl) fpsEl.textContent = (Math.round((r.activeFps || 0) * 10) / 10) + " fps";
            if (cpuEl) cpuEl.textContent = (Math.round((r.cpuUsage || 0) * 10) / 10) + " %";
          }
        }
      };
      ws.onclose = () => { obsConnected = false; if (pollTimer) { clearInterval(pollTimer); pollTimer = null; } setTimeout(connectOBS, 5000); };
      ws.onerror = () => { try { ws.close(); } catch (e) {} };
    }
    connectOBS();
  }
})();
