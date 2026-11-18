// Sound, all synthesized: an engine hum, a two-tone siren, a crash, a mission
// jingle and a punch. No audio files, no network — just the Web Audio API.
// Everything is guarded: no context, no sound, no crash.
let ctx = null;
let engineOsc = null;
let engineGain = null;
let sirenOsc = null;
let sirenGain = null;
let sirenHigh = false;
let sirenTimer = 0;

/** Create the audio graph on the first user gesture (autoplay rules). */
export function ensureAudio() {
  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 60;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 400;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      engineOsc.connect(filter).connect(engineGain).connect(ctx.destination);
      engineOsc.start();
      sirenOsc = ctx.createOscillator();
      sirenOsc.type = 'square';
      sirenOsc.frequency.value = 700;
      sirenGain = ctx.createGain();
      sirenGain.gain.value = 0;
      sirenOsc.connect(sirenGain).connect(ctx.destination);
      sirenOsc.start();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return true;
  } catch {
    return false;
  }
}

/** Engine hum follows the player's speed; silent on foot or at rest. */
export function engineSound(speed01) {
  if (!ctx || !engineGain) return;
  try {
    const target = speed01 > 0.02 ? 0.03 + speed01 * 0.05 : 0;
    engineGain.gain.setTargetAtTime(target, ctx.currentTime, 0.1);
    engineOsc.frequency.setTargetAtTime(55 + speed01 * 130, ctx.currentTime, 0.08);
  } catch { /* audio is best-effort */ }
}

/** The siren wails while the player is wanted; called every frame. */
export function sirenSound(active, dt) {
  if (!ctx || !sirenGain) return;
  try {
    sirenTimer += dt;
    if (sirenTimer > 0.45) {
      sirenTimer = 0;
      sirenHigh = !sirenHigh;
      sirenOsc.frequency.value = sirenHigh ? 950 : 700;
    }
    sirenGain.gain.setTargetAtTime(active ? 0.02 : 0, ctx.currentTime, 0.2);
  } catch { /* audio is best-effort */ }
}

/** A short noise burst for a crash. */
export function crashSound() {
  if (!ctx) return;
  try {
    const len = Math.floor(ctx.sampleRate * 0.18);
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = 0.25;
    src.connect(gain).connect(ctx.destination);
    src.start();
  } catch { /* audio is best-effort */ }
}

/** Four rising notes when a mission is done. */
export function jingleSound() {
  if (!ctx) return;
  try {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.12);
      gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + i * 0.12 + 0.02);
      gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.12 + 0.4);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.12);
      osc.stop(ctx.currentTime + i * 0.12 + 0.45);
    });
  } catch { /* audio is best-effort */ }
}

/** A dull thud for a punch. */
export function punchSound() {
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.1);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.13);
  } catch { /* audio is best-effort */ }
}
