(function buildHeadline() {
  const target = document.getElementById("headline");
  const slice  = document.getElementById("headline-slice");
  slice.textContent = HEADLINE_TEXT;
  for (const ch of HEADLINE_TEXT) {
    const span = document.createElement("span");
    span.className = "ch";
    if (ch === " ") {
      span.classList.add("gap-space");
      span.innerHTML = "&nbsp;";
    } else {
      span.textContent = ch;
    }
    target.appendChild(span);
  }
  const fit = () => {
    let size = 96;
    while (target.scrollWidth > 1380 && size > 48) {
      size -= 4;
      target.style.fontSize = size + "px";
      slice.style.fontSize = size + "px";
    }
  };
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(fit).catch(fit);
  } else {
    setTimeout(fit, 200);
  }
})();

const HEADLINE_EL = document.getElementById("headline");
const SLICE_EL    = document.getElementById("headline-slice");

const introTl = gsap.timeline({ paused: NO_INTRO });
introTl.to("#blackout",  { opacity: 0, duration: 1.6, ease: "power2.inOut" }, 0);
introTl.to("#bg-A", { opacity: 1, duration: 2.0, ease: "sine.out" }, 0);
if (!NO_FX) {
  introTl.to("#scanlines",  { opacity: 0.6,  duration: 1.6, ease: "sine.out" }, 0.4);
  introTl.to("#grain",      { opacity: 0.08, duration: 2.0, ease: "sine.out" }, 0.4);
}
const headlineEls = document.querySelectorAll("#headline .ch");
const introHeadAt = 2.4;
const stagger = Math.min(0.04, 1.4 / Math.max(1, headlineEls.length));
headlineEls.forEach((el, i) => {
  introTl.to(el, { y: 0, opacity: 1, duration: 1.0, ease: "expo.out" }, introHeadAt + i * stagger);
});
let _introDone = false;
function finalizeIntro() {
  if (_introDone) return;
  _introDone = true;
  for (let i = 0; i < OVERLAY._intro.length; i++) OVERLAY._intro[i](introTl, NO_INTRO);
  if (NO_INTRO) {
    introTl.progress(1);
  } else {
    introTl.play();
  }
}
setTimeout(finalizeIntro, 800);

let bassEnv = 0, midEnv = 0, trebleEnv = 0;
let holdBass = 0, holdMid = 0, holdTreble = 0;
const REACT_BASS = 0.85, REACT_MID = 1.25, REACT_TREBLE = 1.85;
const t0 = performance.now() / 1000;

function computeEnvelopes(live, elapsed) {
  let bass = 0, mid = 0, treble = 0;
  if (live) {
    analyser.getByteFrequencyData(freqData);
    let bs = 0, md = 0, tr = 0;
    for (let i = 1;  i <= 6;   i++) bs += freqData[i] / 255;
    for (let i = 7;  i <= 40;  i++) md += freqData[i] / 255;
    for (let i = 41; i <= 160; i++) tr += freqData[i] / 255;
    bass   = Math.min(1, (bs / 6)   * REACT_BASS);
    mid    = Math.min(1, (md / 34)  * REACT_MID);
    treble = Math.min(1, (tr / 120) * REACT_TREBLE);
  } else {
    bass   = 0.18 + 0.18 * Math.max(0, Math.sin(elapsed * 1.6));
    mid    = 0.18 + 0.08 * Math.sin(elapsed * 1.4 + 0.5);
    treble = 0.20 + 0.06 * Math.sin(elapsed * 2.0 + 1.1);
  }
  bassEnv   = bassEnv   * 0.70 + bass   * 0.30;
  midEnv    = midEnv    * 0.70 + mid    * 0.30;
  trebleEnv = trebleEnv * 0.70 + treble * 0.30;
  const pBass   = Math.max(0, bass   - bassEnv   - 0.015);
  const pMid    = Math.max(0, mid    - midEnv    - 0.015);
  const pTreble = Math.max(0, treble - trebleEnv - 0.012);
  holdBass   = Math.max(holdBass   * 0.42, Math.min(1, pBass   * 14));
  holdMid    = Math.max(holdMid    * 0.50, Math.min(1, pMid    * 13));
  holdTreble = Math.max(holdTreble * 0.32, Math.min(1, pTreble * 16));
  return { bass, mid, treble, bassEnv, midEnv, trebleEnv, holdBass, holdMid, holdTreble, live };
}

function applyHeadlineGlitch(holdBass) {
  if (holdBass > 0.02) {
    HEADLINE_EL.style.setProperty("--glitch-x", ((Math.random() - 0.5) * holdBass * 32).toFixed(1) + "px");
    HEADLINE_EL.style.setProperty("--glitch-sk", ((Math.random() - 0.5) * holdBass * 3.5).toFixed(2) + "deg");
  } else {
    HEADLINE_EL.style.setProperty("--glitch-x", "0px");
    HEADLINE_EL.style.setProperty("--glitch-sk", "0deg");
  }
}

function applyRgbSplit(mid, holdMid) {
  const rgbAmt = Math.max(mid * 0.55, holdMid * 1.1);
  if (rgbAmt > 0.02) {
    const sign = (Math.random() < 0.5 ? -1 : 1);
    const rx = sign * rgbAmt * 14 * (0.5 + Math.random() * 0.6);
    const ry = (Math.random() - 0.5) * rgbAmt * 4;
    HEADLINE_EL.style.setProperty("--rgb-r-x", rx.toFixed(1) + "px");
    HEADLINE_EL.style.setProperty("--rgb-r-y", ry.toFixed(1) + "px");
    HEADLINE_EL.style.setProperty("--rgb-c-x", (-rx * 0.85).toFixed(1) + "px");
    HEADLINE_EL.style.setProperty("--rgb-c-y", (-ry * 0.6).toFixed(1) + "px");
  } else {
    HEADLINE_EL.style.setProperty("--rgb-r-x", "0px");
    HEADLINE_EL.style.setProperty("--rgb-r-y", "0px");
    HEADLINE_EL.style.setProperty("--rgb-c-x", "0px");
    HEADLINE_EL.style.setProperty("--rgb-c-y", "0px");
  }
}

function applySlice(treble, holdTreble) {
  const sliceAmt = Math.max(treble * 0.55, holdTreble * 1.1);
  if (sliceAmt > 0.04) {
    const sy = (Math.random() * 0.72 + 0.04) * 100;
    const sh = (Math.random() * 0.20 + 0.04) * 100;
    SLICE_EL.style.setProperty("--slice-y", sy.toFixed(0) + "%");
    SLICE_EL.style.setProperty("--slice-h", sh.toFixed(0) + "%");
    SLICE_EL.style.setProperty("--slice-x", ((Math.random() - 0.5) * sliceAmt * 80).toFixed(1) + "px");
  } else {
    SLICE_EL.style.setProperty("--slice-h", "0%");
  }
}

function tick(rafNow) {
  const nowSec = performance.now() / 1000;
  const elapsed = nowSec - t0;
  const nowMs = rafNow || performance.now();
  const live = analyser && analyserMedia && !analyserMedia.paused && analyserMedia.currentTime > 0;

  const env = { ...computeEnvelopes(live, elapsed), nowMs, elapsed };
  applyHeadlineGlitch(env.holdBass);
  applyRgbSplit(env.mid, env.holdMid);
  applySlice(env.treble, env.holdTreble);

  for (let i = 0; i < OVERLAY._tick.length; i++) OVERLAY._tick[i](env);
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

loadBackgrounds();
if (THEME.bg.mode === "video-audio") {
  if (THEME.nowPlaying) {
    OVERLAY.nowPlaying = THEME.nowPlaying;
    document.getElementById("now-playing").textContent = THEME.nowPlaying;
  }
} else {
  loadPlaylist();
}
