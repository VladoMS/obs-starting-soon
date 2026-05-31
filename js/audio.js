const audio = document.getElementById("track");
let playlist = [];
let trackIdx = 0;
let analyser = null;
let freqData = null;
let audioCtx = null;
let analyserMedia = null;

function setupAudioAnalyser(mediaEl) {
  if (audioCtx) return;
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const src = audioCtx.createMediaElementSource(mediaEl);
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.62;
    freqData = new Uint8Array(analyser.frequencyBinCount);
    OVERLAY.audio.freqData = freqData;
    src.connect(analyser);
    analyser.connect(audioCtx.destination);
    analyserMedia = mediaEl;
  } catch (e) {
    console.warn("[audio] AudioContext setup failed — bars will run idle.", e);
  }
}

function playCurrent() {
  if (!playlist.length) return;
  const t = playlist[trackIdx];
  audio.src = t.src;
  const v = (VOLUME_OVERRIDE != null) ? VOLUME_OVERRIDE : (t.volume != null ? t.volume : 0.7);
  audio.volume = Math.max(0, Math.min(1, v));
  OVERLAY.nowPlaying = (t.artist ? (t.artist + " — " + t.title) : t.title);
  document.getElementById("now-playing").textContent = OVERLAY.nowPlaying;
  const p = audio.play();
  if (p && p.catch) {
    p.catch(err => {
      console.warn("[audio] play() blocked — will retry on user gesture.", err);
      const resume = () => { audio.play().catch(()=>{}); document.removeEventListener("click", resume); };
      document.addEventListener("click", resume, { once: true });
    });
  }
}

async function loadPlaylist() {
  if (THEME.track && await fileExists(THEME.track.src)) {
    playlist = [THEME.track];
    trackIdx = 0;
    audio.loop = true;
    setupAudioAnalyser(audio);
    playCurrent();
    return;
  }
  try {
    const r = await fetch("themes/vladoms/playlist.json", { cache: "no-store" });
    playlist = await r.json();
  } catch (e) {
    console.warn("[audio] No playlist.json — running silent.", e);
    playlist = [];
  }
  if (!Array.isArray(playlist) || !playlist.length) {
    document.getElementById("now-playing").textContent = "—";
    return;
  }
  for (let i = playlist.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [playlist[i], playlist[j]] = [playlist[j], playlist[i]];
  }
  trackIdx = 0;
  OVERLAY.trackIdx = 0;
  OVERLAY.trackCount = playlist.length;
  audio.addEventListener("ended", () => {
    trackIdx = (trackIdx + 1) % playlist.length;
    OVERLAY.trackIdx = trackIdx;
    playCurrent();
  });
  audio.addEventListener("error", (ev) => {
    console.warn("[audio] track error, advancing", ev);
    trackIdx = (trackIdx + 1) % playlist.length;
    OVERLAY.trackIdx = trackIdx;
    setTimeout(playCurrent, 250);
  });
  setupAudioAnalyser(audio);
  playCurrent();
}
