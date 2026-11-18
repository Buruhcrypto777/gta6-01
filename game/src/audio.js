// Sound, synthesised with WebAudio and nothing else: an engine hum that follows the car's
// speed, a two-tone siren while the police are after Mara, and short blips for pickups,
// crashes, mission results and menu clicks. There are no audio files to load, so the game
// stays offline. Everything is guarded: the context only starts on a real user gesture, and
// a browser without audio just plays silent.
export function createAudio() {
  let ctx = null;
  let engineOsc = null;
  let engineOsc2 = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenLfo = null;
  let sirenGain = null;
  let muted = false;

  function init() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      return;
    }
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      ctx = new AudioContext();
      const master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(ctx.destination);
      // Engine: a low sawtooth plus a sub square, both following the speed.
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 60;
      engineOsc2 = ctx.createOscillator();
      engineOsc2.type = 'square';
      engineOsc2.frequency.value = 30;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      const engineFilter = ctx.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 500;
      engineOsc.connect(engineFilter);
      engineOsc2.connect(engineFilter);
      engineFilter.connect(engineGain);
      engineGain.connect(master);
      engineOsc.start();
      engineOsc2.start();
      // Siren: a triangle wave whose pitch wobbles between two tones.
      sirenOsc = ctx.createOscillator();
      sirenOsc.type = 'triangle';
      sirenOsc.frequency.value = 800;
      sirenLfo = ctx.createOscillator();
      sirenLfo.type = 'square';
      sirenLfo.frequency.value = 0.55;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 160;
      sirenLfo.connect(lfoGain);
      lfoGain.connect(sirenOsc.frequency);
      sirenGain = ctx.createGain();
      sirenGain.gain.value = 0;
      sirenOsc.connect(sirenGain);
      sirenGain.connect(master);
      sirenOsc.start();
      sirenLfo.start();
    } catch {
      ctx = null;
    }
  }

  function blip(frequency, duration, volume, type) {
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      osc.type = type || 'sine';
      osc.frequency.value = frequency;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // A short sound failing is not worth a crash.
    }
  }

  function noiseBurst(duration, volume) {
    if (!ctx) return;
    try {
      const length = Math.floor(ctx.sampleRate * duration);
      const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 900;
      const gain = ctx.createGain();
      gain.gain.value = volume;
      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      source.start();
    } catch {
      // As above.
    }
  }

  return {
    init,
    /** The engine follows the car's speed; silent on foot or at a standstill. */
    setEngine(speed, maxSpeed) {
      if (!ctx || !engineOsc) return;
      const ratio = Math.min(1, Math.abs(speed) / maxSpeed);
      engineOsc.frequency.value = 55 + ratio * 140;
      engineOsc2.frequency.value = 28 + ratio * 70;
      engineGain.gain.value = ratio > 0.02 ? 0.028 + ratio * 0.03 : 0;
    },
    /** The siren wails while any wanted level is on. */
    setSiren(on) {
      if (!ctx || !sirenGain) return;
      sirenGain.gain.value = on ? 0.035 : 0;
    },
    pickup() {
      blip(880, 0.12, 0.12);
      setTimeout(() => blip(1320, 0.14, 0.12), 70);
    },
    crash() {
      noiseBurst(0.25, 0.25);
    },
    jingle() {
      blip(523, 0.16, 0.12);
      setTimeout(() => blip(659, 0.16, 0.12), 120);
      setTimeout(() => blip(784, 0.28, 0.14), 240);
    },
    click() {
      blip(660, 0.06, 0.08, 'square');
    },
    setMuted(next) {
      muted = next;
      if (ctx) {
        try {
          ctx.destination.disconnect();
        } catch {
          // Already disconnected.
        }
      }
    },
    get muted() {
      return muted;
    },
  };
}
