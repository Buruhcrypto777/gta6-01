// Save and load: cash and mission progress in localStorage, nothing else.
// A save from a newer build is read the same way; a corrupt one is ignored.
import { SAVE_KEY } from './config.js';

/** Read the save, or an empty one when there is none. */
export function loadSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return { cash: 0, missionIndex: 0 };
    const data = JSON.parse(raw);
    return {
      cash: typeof data.cash === 'number' ? Math.max(0, Math.floor(data.cash)) : 0,
      missionIndex: typeof data.missionIndex === 'number' ? Math.max(0, Math.floor(data.missionIndex)) : 0,
    };
  } catch {
    return { cash: 0, missionIndex: 0 };
  }
}

/** Write the save from the world's cash and mission progress. */
export function saveGame(state) {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify({
      cash: state.cash,
      missionIndex: state.missionIndex,
    }));
  } catch {
    // Storage can be off: the game then lasts this visit only.
  }
}
