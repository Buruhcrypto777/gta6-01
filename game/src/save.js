// Solmar Bay — save and load: cash, story progress, collected coins and
// settings, in localStorage. One key, one JSON object, no network.
const KEY = 'solmar-bay-save-v3';

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') return null;
    return data;
  } catch { return null; }
}

export function saveGame(G) {
  try {
    const data = {
      cash: Math.floor(G.player.cash),
      missionsDone: G.missions.index,
      coinsTaken: G.collectibles.coins.filter((c) => c.taken).map((c) => c.id),
      radio: G.audio.stationName(),
      muted: G.audio.isMuted(),
      pos: { x: G.player.pos.x, z: G.player.pos.z },
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch { return false; }
}

export function clearSave() {
  try { localStorage.removeItem(KEY); } catch { /* private mode */ }
}
