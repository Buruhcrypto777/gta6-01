// Solmar Bay — save and load through localStorage.
// Cash, health, collected Sun Coins, finished missions and Mara's spot.
// Storage can be off (private windows): saving then simply does nothing.
import { SAVE_KEY } from './config.js';

export function saveGame(state) {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
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
