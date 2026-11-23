// Solmar Bay — WebAudio synth sound: engine hum, sirens, gunshots, pickup
// blips, mission stingers and three generative radio stations.
// The radio is ON from the start (station 0); the context resumes on the
// first user gesture, and every call is guarded so a suspended context
// never throws. No audio files, no network.
import { RADIO_STATIONS } from './config.js';

const STATION_PATTERNS = [
  { bass: [55, 0, 65.4, 0, 49, 0, 58.3, 0], lead: [220, 277, 330, 277, 220, 196, 247, 294], wave: 'sawtooth', tempo: 0.24 },
  { bass: [82.4, 0, 98, 0, 73.4, 0, 87.3, 0], lead: [330, 392, 440, 392, 330, 311, 370, 415], wave: 'triangle', tempo: 0.3 },
  { bass: [110, 110, 0, 98, 110, 0, 123.5, 0], lead: [440, 0, 523, 0, 587, 0, 523, 440], wave: 'square', tempo: 0.2 },
];

export function createAudio() {
  let ctx = null;
  let master = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let station = 0;
  let radioOn = true;
  let stepTimer = 0;
  let step = 0;

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.4;
      master.connect(ctx.destination);
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 60;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      const engineFilter = ctx.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 420;
      engineOsc.connect(engineFilter);
      engineFilter.connect(engineGain);
      engineGain.connect(master);
      engineOsc.start();
      sirenOsc = ctx.createOscillator();
      sirenOsc.type = 'sine';
      sirenOsc.frequency.value = 700;
      sirenGain = ctx.createGain();
      sirenGain.gain.value = 0;
      sirenOsc.connect(sirenGain);
      sirenGain.connect(master);
      sirenOsc.start();
    } catch {
      ctx = null;
      return false;
    }
    return true;
  }

  function resume() {
    if (ensure() && ctx.state === 'suspended') ctx.resume().catch(() => {});
  }

  function blip(freq, dur, type, vol, when = 0) {
    if (!ensure()) return;
    try {
      const t = ctx.currentTime + when;
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = freq;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.connect(gain);
      gain.connect(master);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    } catch { /* audio is best-effort */ }
  }

  function noiseBurst(dur, vol, freq) {
    if (!ensure()) return;
    try {
      const len = Math.floor(ctx.sampleRate * dur);
      const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = freq;
      const gain = ctx.createGain();
      gain.gain.value = vol;
      src.connect(filter);
      filter.connect(gain);
      gain.connect(master);
      src.start();
    } catch { /* audio is best-effort */ }
  }

  return {
    resume,
    get stationName() {
      return RADIO_STATIONS[station];
    },
    nextStation() {
      station = (station + 1) % RADIO_STATIONS.length;
      return RADIO_STATIONS[station];
    },
    gunshot(kind) {
      noiseBurst(kind === 'shotgun' ? 0.28 : 0.14, kind === 'shotgun' ? 0.7 : 0.45, kind === 'shotgun' ? 900 : 1800);
      blip(90, 0.12, 'sine', 0.5);
    },
    punch() {
      noiseBurst(0.09, 0.5, 500);
      blip(70, 0.1, 'sine', 0.5);
    },
    swing() {
      noiseBurst(0.08, 0.18, 2400);
    },
    pickup() {
      blip(880, 0.1, 'sine', 0.35);
      blip(1318, 0.16, 'sine', 0.35, 0.09);
    },
    missionStart() {
      blip(523, 0.12, 'triangle', 0.4);
      blip(659, 0.12, 'triangle', 0.4, 0.12);
      blip(784, 0.2, 'triangle', 0.4, 0.24);
    },
    missionComplete() {
      [523, 659, 784, 1046].forEach((f, i) => blip(f, 0.18, 'triangle', 0.4, i * 0.11));
    },
    weaponSwitch() {
      blip(1200, 0.05, 'square', 0.2);
    },
    update(dt, state) {
      if (!ctx) return;
      try {
        if (ctx.state === 'suspended') return;
        // Engine hum follows speed.
        const target = state.inCar ? 0.05 + Math.min(0.16, Math.abs(state.speed) * 0.004) : 0;
        engineGain.gain.value += (target - engineGain.gain.value) * Math.min(1, dt * 4);
        engineOsc.frequency.value = 55 + Math.abs(state.speed) * 2.4;
        // Siren wails with the wanted level.
        const sirenTarget = state.wanted > 0 ? 0.05 : 0;
        sirenGain.gain.value += (sirenTarget - sirenGain.gain.value) * Math.min(1, dt * 2);
        sirenOsc.frequency.value = 650 + Math.sin(Date.now() * 0.004) * 180;
        // Radio: step the current station's pattern.
        if (!radioOn) return;
        const pattern = STATION_PATTERNS[station];
        stepTimer += dt;
        if (stepTimer >= pattern.tempo) {
          stepTimer = 0;
          const bass = pattern.bass[step % pattern.bass.length];
          const lead = pattern.lead[step % pattern.lead.length];
          if (bass) blip(bass, pattern.tempo * 1.8, 'sine', 0.22);
          if (lead && step % 2 === 0) blip(lead, pattern.tempo * 1.4, pattern.wave, 0.1);
          step += 1;
        }
      } catch { /* audio is best-effort */ }
    },
  };
}
