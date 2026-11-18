// Saving: the cash and the mission Mara has reached, kept in this browser's localStorage
// between visits. Everything is guarded — a private window or a disabled store just means
// the progress lasts this visit only, never a crash.
import { SAVE_KEY } from './config.js';

export function loadSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return { cash: 0, mission: 0 };
    const parsed = JSON.parse(raw);
    return {
      cash: Number.isFinite(parsed.cash) ? Math.max(0, parsed.cash) : 0,
      mission: Number.isFinite(parsed.mission) ? Math.max(0, parsed.mission) : 0,
    };
  } catch {
    return { cash: 0, mission: 0 };
  }
}

export function saveProgress(state) {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify({ cash: state.cash, mission: state.missionIndex }));
  } catch {
    // Storage can be off: the progress then lasts this visit only.
  }
}

export function clearSave() {
  try {
    window.localStorage.removeItem(SAVE_KEY);
  } catch {
    // Nothing to clear.
  }
}
