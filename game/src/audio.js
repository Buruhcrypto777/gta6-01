// Solmar Bay — all sound, synthesized live with WebAudio: engine hum, sirens,
// punches, coins, jingles, and three radio stations of original synth music.
// No audio files, no network — every note is generated in the browser.
import { CFG } from './config.js';
import { RADIO_STATIONS } from './city.js';

const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);
// Station patterns: [midi note, beats] loops. Moods: sunset, surf, neon.
const PATTERNS = {
  sunset: { bpm: 92, bass: [45, 0, 45, 0, 41, 0, 43, 0], lead: [69, 72, 76, 72, 74, 76, 79, 76] },
  surf: { bpm: 132, bass: [48, 48, 45, 45, 50, 50, 43, 43], lead: [76, 79, 81, 79, 76, 74, 72, 74] },
  neon: { bpm: 112, bass: [41, 41, 41, 44, 41, 41, 46, 44], lead: [65, 68, 72, 68, 65, 63, 60, 63] },
};

export function createAudio() {
  let ctx = null, master = null, musicGain = null, engineOsc = null, engineGain = null, engineFilter = null;
  let sirenOsc = null, sirenGain = null, sirenOn = false, sirenPhase = 0;
  let radioOn = false, station = 0, radioTimer = null, step = 0, nextTime = 0;
  let muted = false;

  function ensure() {
    if (ctx) return true;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = CFG.audio.master; master.connect(ctx.destination);
      musicGain = ctx.createGain(); musicGain.gain.value = CFG.audio.music; musicGain.connect(master);
      engineOsc = ctx.createOscillator(); engineOsc.type = 'sawtooth'; engineOsc.frequency.value = 42;
      engineFilter = ctx.createBiquadFilter(); engineFilter.type = 'lowpass'; engineFilter.frequency.value = 420;
      engineGain = ctx.createGain(); engineGain.gain.value = 0;
      engineOsc.connect(engineFilter); engineFilter.connect(engineGain); engineGain.connect(master);
      engineOsc.start();
      sirenOsc = ctx.createOscillator(); sirenOsc.type = 'triangle'; sirenOsc.frequency.value = 720;
      sirenGain = ctx.createGain(); sirenGain.gain.value = 0;
      sirenOsc.connect(sirenGain); sirenGain.connect(master);
      sirenOsc.start();
      return true;
    } catch { return false; }
  }

  function blip(freq, dur, type, vol, when = 0, dest = null) {
    if (!ctx) return;
    const t = ctx.currentTime + when;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(dest || master);
    o.start(t); o.stop(t + dur + 0.05);
  }

  function scheduleStep() {
    if (!ctx || !radioOn) return;
    const st = RADIO_STATIONS[station];
    const pat = PATTERNS[st.mood];
    const beat = 60 / pat.bpm / 2;
    while (nextTime < ctx.currentTime + 0.25) {
      const i = step % 8;
      const bass = pat.bass[i], lead = pat.lead[i];
      if (bass) blip(NOTE(bass), beat * 1.8, 'triangle', 0.5, nextTime - ctx.currentTime, musicGain);
      if (lead && i % 2 === 0) blip(NOTE(lead), beat * 0.9, 'square', 0.16, nextTime - ctx.currentTime, musicGain);
      step++; nextTime += beat;
    }
  }

  return {
    start() { if (ensure() && ctx.state === 'suspended') ctx.resume(); },
    engine(speed, top) {
      if (!ctx) return;
      const f = 42 + Math.abs(speed) * 3.4;
      engineOsc.frequency.setTargetAtTime(f, ctx.currentTime, 0.08);
      engineGain.gain.setTargetAtTime(Math.abs(speed) > 0.5 ? CFG.audio.engine : 0, ctx.currentTime, 0.1);
      engineFilter.frequency.setTargetAtTime(300 + Math.abs(speed) * 22, ctx.currentTime, 0.1);
    },
    engineStart() { blip(90, 0.3, 'sawtooth', 0.25); blip(140, 0.25, 'sawtooth', 0.2, 0.08); },
    siren(on) {
      sirenOn = on;
      if (!ctx) return;
      sirenGain.gain.setTargetAtTime(on ? CFG.audio.siren : 0, ctx.currentTime, 0.2);
    },
    punch() { blip(160, 0.12, 'sine', 0.6); blip(70, 0.18, 'sine', 0.7, 0.01); },
    thud() { blip(90, 0.22, 'sine', 0.5); },
    coin() { blip(1318, 0.12, 'sine', 0.35); blip(1976, 0.22, 'sine', 0.35, 0.09); },
    jingle() { [72, 76, 79, 84].forEach((n, i) => blip(NOTE(n), 0.22, 'triangle', 0.3, i * 0.09)); },
    toggleRadio() {
      radioOn = !radioOn;
      if (radioOn) {
        if (!ensure()) return false;
        step = 0; nextTime = ctx.currentTime + 0.05;
        if (!radioTimer) radioTimer = setInterval(scheduleStep, 90);
      }
      return radioOn;
    },
    nextStation() {
      station = (station + 1) % RADIO_STATIONS.length;
      step = 0;
      return RADIO_STATIONS[station].name;
    },
    stationName() { return RADIO_STATIONS[station].name; },
    setMuted(m) { muted = m; if (master) master.gain.value = m ? 0 : CFG.audio.master; },
    isMuted() { return muted; },
    update(dt) {
      if (!ctx || !sirenOn) return;
      sirenPhase += dt;
      sirenOsc.frequency.value = Math.floor(sirenPhase * 2.4) % 2 ? 720 : 960;
    },
  };
}
