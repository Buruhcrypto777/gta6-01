// Solmar Bay — WebAudio synth: engine hum, sirens, impacts, and three radio
// stations built from tiny step sequencers. The radio is ON from the first
// frame (the HUD always names the station — there is no "radio off" state),
// and every AudioContext call is guarded, so a headless run without audio
// hardware simply stays silent instead of throwing.
import { STATIONS } from './config.js';

function midiFreq(m) {
  return 440 * Math.pow(2, (m - 69) / 12);
}

// Per-station sequencer patterns: 16 steps of bass notes and arp notes
// (0 = rest). Kept short on purpose — the loop is the station's identity.
const PATTERNS = [
  {
    bpm: 96, wave: 'sawtooth', bass: [45, 0, 45, 0, 48, 0, 43, 0, 45, 0, 45, 0, 50, 0, 48, 0],
    arp: [69, 72, 76, 79, 76, 72, 69, 67, 69, 72, 76, 81, 79, 76, 72, 69],
  },
  {
    bpm: 122, wave: 'square', bass: [41, 41, 0, 41, 0, 41, 46, 0, 41, 41, 0, 41, 48, 0, 46, 0],
    arp: [65, 0, 68, 65, 0, 72, 0, 68, 65, 0, 68, 65, 77, 0, 74, 72],
  },
  {
    bpm: 76, wave: 'triangle', bass: [48, 0, 0, 52, 0, 0, 45, 0, 0, 50, 0, 0, 43, 0, 47, 0],
    arp: [72, 76, 79, 76, 72, 0, 74, 79, 76, 72, 76, 79, 84, 79, 76, 74],
  },
];

export function createAudio() {
  const self = {
    radioOn: true,
    station: 0,
    available: false,
    ctx: null,
    master: null,
    radioGain: null,
    engineOsc: null,
    engineGain: null,
    sirenOsc: null,
    sirenGain: null,
    sirenOn: false,
    step: 0,
    nextNoteAt: 0,

    ensure() {
      if (this.ctx) {
        if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
        return;
      }
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.5;
        this.master.connect(this.ctx.destination);
        this.radioGain = this.ctx.createGain();
        this.radioGain.gain.value = 0.16;
        this.radioGain.connect(this.master);
        // Engine: a low sawtooth through a lowpass, pitched by speed.
        this.engineOsc = this.ctx.createOscillator();
        this.engineOsc.type = 'sawtooth';
        this.engineOsc.frequency.value = 55;
        const lp = this.ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 320;
        this.engineGain = this.ctx.createGain();
        this.engineGain.gain.value = 0;
        this.engineOsc.connect(lp);
        lp.connect(this.engineGain);
        this.engineGain.connect(this.master);
        this.engineOsc.start();
        // Siren: a sine that wails between two pitches.
        this.sirenOsc = this.ctx.createOscillator();
        this.sirenOsc.type = 'sine';
        this.sirenOsc.frequency.value = 700;
        this.sirenGain = this.ctx.createGain();
        this.sirenGain.gain.value = 0;
        this.sirenOsc.connect(this.sirenGain);
        this.sirenGain.connect(this.master);
        this.sirenOsc.start();
        this.available = true;
        this.nextNoteAt = this.ctx.currentTime + 0.1;
      } catch {
        this.available = false;
      }
    },

    stationName() {
      return STATIONS[this.station].name;
    },

    nextStation() {
      this.station = (this.station + 1) % STATIONS.length;
      this.step = 0;
      return this.stationName();
    },

    setStation(i) {
      this.station = ((i % STATIONS.length) + STATIONS.length) % STATIONS.length;
      this.step = 0;
    },

    note(midi, when, dur, wave, vol, dest) {
      try {
        const o = this.ctx.createOscillator();
        o.type = wave;
        o.frequency.value = midiFreq(midi);
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0, when);
        g.gain.linearRampToValueAtTime(vol, when + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, when + dur);
        o.connect(g);
        g.connect(dest);
        o.start(when);
        o.stop(when + dur + 0.05);
      } catch { /* silent */ }
    },

    update(dt) {
      if (!this.available || !this.ctx) return;
      try {
        // Radio sequencer: schedule 16th notes a little ahead of time.
        if (this.radioOn) {
          const pat = PATTERNS[this.station];
          const stepDur = 60 / pat.bpm / 4;
          while (this.nextNoteAt < this.ctx.currentTime + 0.25) {
            const s = this.step % 16;
            const bass = pat.bass[s];
            const arp = pat.arp[s];
            if (bass) this.note(bass, this.nextNoteAt, stepDur * 1.8, pat.wave, 0.5, this.radioGain);
            if (arp) this.note(arp, this.nextNoteAt, stepDur * 0.9, 'triangle', 0.22, this.radioGain);
            this.nextNoteAt += stepDur;
            this.step += 1;
          }
        }
        // Siren wail.
        if (this.sirenOn) {
          const t = this.ctx.currentTime;
          this.sirenOsc.frequency.setValueAtTime(700 + 260 * (0.5 + 0.5 * Math.sin(t * 3.2)), t);
          this.sirenGain.gain.setTargetAtTime(0.05, t, 0.1);
        } else {
          this.sirenGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
        }
      } catch { /* silent */ }
    },

    engine(rpm01) {
      if (!this.available || !this.engineOsc) return;
      try {
        const t = this.ctx.currentTime;
        this.engineOsc.frequency.setTargetAtTime(50 + rpm01 * 160, t, 0.08);
        this.engineGain.gain.setTargetAtTime(0.02 + rpm01 * 0.05, t, 0.1);
      } catch { /* silent */ }
    },

    siren(on) {
      this.sirenOn = on;
    },

    blip(kind) {
      if (!this.available || !this.ctx) return;
      try {
        const t = this.ctx.currentTime;
        if (kind === 'shot' || kind === 'shotgun') {
          const dur = kind === 'shotgun' ? 0.28 : 0.14;
          const buf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * dur), this.ctx.sampleRate);
          const data = buf.getChannelData(0);
          for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
          const src = this.ctx.createBufferSource();
          src.buffer = buf;
          const g = this.ctx.createGain();
          g.gain.value = kind === 'shotgun' ? 0.5 : 0.32;
          const f = this.ctx.createBiquadFilter();
          f.type = 'lowpass';
          f.frequency.value = kind === 'shotgun' ? 900 : 1800;
          src.connect(f);
          f.connect(g);
          g.connect(this.master);
          src.start(t);
          return;
        }
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        if (kind === 'punch') {
          o.type = 'sine';
          o.frequency.setValueAtTime(160, t);
          o.frequency.exponentialRampToValueAtTime(50, t + 0.12);
          g.gain.setValueAtTime(0.35, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
        } else if (kind === 'coin') {
          o.type = 'sine';
          o.frequency.setValueAtTime(880, t);
          o.frequency.setValueAtTime(1320, t + 0.07);
          g.gain.setValueAtTime(0.25, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
        } else if (kind === 'pickup') {
          o.type = 'triangle';
          o.frequency.setValueAtTime(520, t);
          o.frequency.setValueAtTime(780, t + 0.08);
          g.gain.setValueAtTime(0.25, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        } else if (kind === 'bad') {
          o.type = 'sawtooth';
          o.frequency.setValueAtTime(220, t);
          o.frequency.setValueAtTime(110, t + 0.25);
          g.gain.setValueAtTime(0.2, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        } else {
          o.type = 'sine';
          o.frequency.value = 660;
          g.gain.setValueAtTime(0.18, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
        }
        o.connect(g);
        g.connect(this.master);
        o.start(t);
        o.stop(t + 0.35);
      } catch { /* silent */ }
    },
  };
  return self;
}
