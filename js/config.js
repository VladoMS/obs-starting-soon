const params = new URLSearchParams(location.search);
const Q_PARAM        = params.get("q");
const HEADLINE_TEXT  = (Q_PARAM == null ? "STARTING SOON" : Q_PARAM).toUpperCase();
const BG_ROTATION_MS = (parseFloat(params.get("bg")) || 10) * 1000;
const NO_FX          = params.get("nofx") === "1";
const NO_INTRO       = params.get("nointro") !== "0";
const VOLUME_OVERRIDE= params.get("volume") != null ? parseFloat(params.get("volume")) : null;

const THEMES = {
  vladoms: {
    hud: "eve", rgbLine: "255, 59, 31",
    bg: { mode: "rotating" },
  },
  kaiyo: {
    hud: "synthwave", rgbLine: "255, 43, 214",
    bg: {
      mode: "video-muted",
      video: "themes/kaiyo/disco-16-echoes-first-light-loop-v3.mp4",
      plate: "themes/kaiyo/disco-16-echoes-first-light.png",
    },
    track: { artist: "KISSA", title: "SUNS", src: "themes/kaiyo/KISSA__SUNS.mp3" },
  },
  wwm: {
    hud: "eve", rgbLine: "54, 211, 154",
    bg: { mode: "video-audio", video: "themes/wwm/where-winds-meet.mp4" },
    nowPlaying: "Where Winds Meet",
  },
};
const THEME_ID = THEMES[(params.get("theme") || "").toLowerCase()] ? params.get("theme").toLowerCase() : "vladoms";
const THEME    = THEMES[THEME_ID];

const OVERLAY = {
  params, HEADLINE_TEXT, THEME, THEME_ID,
  nowPlaying: "STANDBY",
  trackIdx: 0, trackCount: 0,
  audio: { freqData: null },
  _tick: [], _intro: [],
  onTick(cb) { OVERLAY._tick.push(cb); },
  onIntro(cb) { OVERLAY._intro.push(cb); },
};
window.OVERLAY = OVERLAY;

async function fileExists(url) {
  try {
    const r = await fetch(url, { method: "HEAD", cache: "no-store" });
    return r.ok;
  } catch (e) {
    return false;
  }
}
