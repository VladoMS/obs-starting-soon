const bgA = document.getElementById("bg-A");
const bgB = document.getElementById("bg-B");
let bgFront = bgA, bgBack = bgB;
let bgIndex = 0;
let bgList = [];

const TINT_ALPHA_SCALE = 0.4;

function scaleRgbaAlpha(rgba, scale) {
  return rgba.replace(/rgba?\(([^)]+)\)/i, (_m, inner) => {
    const parts = inner.split(",").map(s => s.trim());
    if (parts.length !== 4) return _m;
    const a = Math.max(0, Math.min(1, parseFloat(parts[3]) * scale));
    return `rgba(${parts[0]},${parts[1]},${parts[2]},${a.toFixed(3)})`;
  });
}

function applyBgVisuals(layer, entry) {
  const setPlaceholder = () => {
    if (entry.placeholder) {
      layer.style.background = entry.placeholder;
      layer.style.backgroundColor = "#04060e";
      layer.style.backgroundSize = "cover";
      layer.style.backgroundPosition = "center";
      layer.style.backgroundRepeat = "no-repeat";
    } else {
      layer.style.background = "#04060e";
    }
  };
  if (entry.src) {
    const img = new Image();
    img.onload = () => {
      const tintRaw = entry.tint || ["rgba(4,6,14,0.55)", "rgba(10,16,36,0.55)"];
      const tint = tintRaw.map(c => scaleRgbaAlpha(c, TINT_ALPHA_SCALE));
      const pos  = entry.position || "center";
      const sz   = entry.size || "cover";
      layer.style.background =
        `linear-gradient(135deg, ${tint[0]}, ${tint[1]}), url("${entry.src}") ${pos} / ${sz} no-repeat`;
      layer.style.backgroundColor = "#04060e";
    };
    img.onerror = setPlaceholder;
    img.src = entry.src;
  } else {
    setPlaceholder();
  }
}

function rotateBackground() {
  if (bgList.length <= 1) return;
  bgIndex = (bgIndex + 1) % bgList.length;
  const next = bgList[bgIndex];
  applyBgVisuals(bgBack, next);
  gsap.to(bgFront,   { opacity: 0, duration: 1.2, ease: "power2.inOut" });
  gsap.fromTo(bgBack, { opacity: 0 }, { opacity: 1, duration: 1.2, ease: "power2.inOut" });
  const tmp = bgFront; bgFront = bgBack; bgBack = tmp;
}

async function loadBackgrounds() {
  if (THEME.bg.mode === "video-muted") {
    if (await fileExists(THEME.bg.video)) {
      const v = document.getElementById("bg-video");
      v.style.display = "block";
      v.muted = true;
      v.src = THEME.bg.video;
      const reveal = () => { v.style.opacity = "1"; };
      const tryPlay = () => {
        const p = v.play();
        if (p && p.catch) {
          p.catch(() => {
            const resume = () => { v.play().then(reveal).catch(()=>{}); document.removeEventListener("click", resume); };
            document.addEventListener("click", resume, { once: true });
          });
        }
      };
      v.addEventListener("canplay", reveal, { once: true });
      tryPlay();
      return;
    }
    if (THEME.bg.plate && await fileExists(THEME.bg.plate)) {
      bgList = [{
        id: THEME_ID, game: "", caption: "",
        src: THEME.bg.plate,
        tint: ["rgba(0,0,0,0)", "rgba(0,0,0,0)"]
      }];
      bgIndex = 0;
      applyBgVisuals(bgFront, bgList[0]);
      bgFront.style.opacity = NO_INTRO ? 1 : 0;
      return;
    }
  }
  if (THEME.bg.mode === "video-audio") {
    if (await fileExists(THEME.bg.video)) {
      const v = document.getElementById("bg-video");
      v.style.display = "block";
      v.loop = true;
      v.muted = false;
      v.volume = VOLUME_OVERRIDE != null ? VOLUME_OVERRIDE : 1;
      v.src = THEME.bg.video;
      setupAudioAnalyser(v);
      const reveal = () => { v.style.opacity = "1"; };
      const tryPlay = () => {
        if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
        const p = v.play();
        if (p && p.catch) {
          p.catch(() => {
            const resume = () => {
              if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
              v.play().then(reveal).catch(()=>{});
              document.removeEventListener("click", resume);
            };
            document.addEventListener("click", resume, { once: true });
          });
        }
      };
      v.addEventListener("canplay", reveal, { once: true });
      tryPlay();
      return;
    }
  }
  try {
    const r = await fetch("themes/vladoms/backgrounds.json", { cache: "no-store" });
    bgList = await r.json();
  } catch (e) {
    console.warn("[bg] No backgrounds.json — using fallback.", e);
    bgList = [{
      id: "fallback", game: "", caption: "",
      src: "assets/background-plate.png",
      tint: ["rgba(4,6,14,0.55)","rgba(10,16,36,0.55)"]
    }];
  }
  for (let i = bgList.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [bgList[i], bgList[j]] = [bgList[j], bgList[i]];
  }
  bgIndex = 0;
  applyBgVisuals(bgFront, bgList[0]);
  bgFront.style.opacity = NO_INTRO ? 1 : 0;
  if (NO_INTRO) bgFront.style.opacity = 1;
  if (bgList.length > 1) setInterval(rotateBackground, BG_ROTATION_MS);
}
