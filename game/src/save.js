// Solmar Bay — localStorage save. Cash, finished jobs, collected coins and
// the radio station survive a reload; a missing or corrupt save just means
// a fresh start.
import { SAVE_KEY } from './config.js';

export function saveGame(G) {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify({
      cash: G.cash,
      missionsDone: G.missions.done,
      nextIndex: G.missions.nextIndex,
      coins: G.collectibles.takenIndices(),
      station: G.audio.station,
    }));
  } catch {
    // Storage can be off (private windows): the game still plays.
  }
}

export function loadGame() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
