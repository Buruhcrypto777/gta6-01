// The DOM HUD: cash and wanted stars, the mission objective, the context prompt,
// the speedometer, toasts, and the 2D minimap that shows the city, the sea, the
// player, the police and the waypoint at a glance.
import { GRID, MISSIONS } from './config.js';
import { missionWaypoint, objectiveText } from './missions.js';

const MAP_SIZE = 200;

/** Grab the HUD elements from the page and return an updater. */
export function createHud() {
  const cash = document.getElementById('cash');
  const stars = document.getElementById('stars');
  const objective = document.getElementById('objective');
  const prompt = document.getElementById('prompt');
  const speed = document.getElementById('speed');
  const toast = document.getElementById('toast');
  const map = document.getElementById('minimap');
  const mapCtx = map.getContext('2d');
  const title = document.getElementById('title');
  const pause = document.getElementById('pause');
  const busted = document.getElementById('busted');
  const bustedReason = document.getElementById('busted-reason');
  const storyLine = document.getElementById('story-line');

  function starRow(wanted) {
    let out = '';
    for (let i = 0; i < 5; i += 1) out += i < wanted ? '★' : '☆';
    return out;
  }

  /** Draw the minimap: roads, beach, sea, player arrow, police, waypoint. */
  function drawMap(state) {
    const g = mapCtx;
    const span = GRID.max - GRID.min + 90;
    const scale = MAP_SIZE / span;
    const toMapX = (x) => (x - GRID.min + 45) * scale;
    const toMapZ = (z) => (z - GRID.min + 45) * scale;
    g.clearRect(0, 0, MAP_SIZE, MAP_SIZE);
    g.fillStyle = '#5d666e';
    g.fillRect(0, 0, MAP_SIZE, MAP_SIZE);
    // Sea on the east edge, sand beside it.
    g.fillStyle = '#2f7fc2';
    g.fillRect(toMapX(GRID.seaX), 0, MAP_SIZE - toMapX(GRID.seaX), MAP_SIZE);
    g.fillStyle = '#e8d49a';
    g.fillRect(toMapX(GRID.beachX), 0, toMapX(GRID.seaX) - toMapX(GRID.beachX), MAP_SIZE);
    // Roads.
    g.strokeStyle = '#2c2f34';
    g.lineWidth = Math.max(2, 12 * scale);
    for (const r of GRID.roads) {
      g.beginPath();
      g.moveTo(toMapX(r), 0);
      g.lineTo(toMapX(r), MAP_SIZE);
      g.stroke();
      g.beginPath();
      g.moveTo(0, toMapZ(r));
      g.lineTo(MAP_SIZE, toMapZ(r));
      g.stroke();
    }
    // Waypoint diamond.
    const wp = missionWaypoint(state);
    if (wp) {
      g.fillStyle = '#f5d90a';
      const wx = toMapX(wp.x);
      const wz = toMapZ(wp.z);
      g.beginPath();
      g.moveTo(wx, wz - 7);
      g.lineTo(wx + 6, wz);
      g.lineTo(wx, wz + 7);
      g.lineTo(wx - 6, wz);
      g.closePath();
      g.fill();
    }
    // Police dots.
    g.fillStyle = '#ff3b30';
    for (const car of state.cars) {
      if (car.kind !== 'police') continue;
      g.beginPath();
      g.arc(toMapX(car.x), toMapZ(car.z), 3, 0, Math.PI * 2);
      g.fill();
    }
    // Player arrow, pointing where the player faces.
    const p = state.player;
    const px = toMapX(p.x);
    const pz = toMapZ(p.z);
    g.save();
    g.translate(px, pz);
    g.rotate(Math.atan2(Math.sin(p.heading), -Math.cos(p.heading)) + Math.PI);
    g.fillStyle = '#ffffff';
    g.strokeStyle = '#222222';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(0, -7);
    g.lineTo(5, 6);
    g.lineTo(0, 3);
    g.lineTo(-5, 6);
    g.closePath();
    g.fill();
    g.stroke();
    g.restore();
  }

  /** Refresh every HUD element from the world state. */
  function update(state, screen) {
    cash.textContent = `$${state.cash}`;
    stars.textContent = starRow(state.wanted);
    stars.classList.toggle('hot', state.wanted > 0);
    objective.textContent = objectiveText(state);
    const car = state.player.car;
    if (state.player.onFoot) {
      prompt.textContent = 'E — Enter car    F — Punch    Shift — Run';
    } else {
      prompt.textContent = 'E — Exit car    Space — Handbrake';
    }
    const kmh = Math.round(Math.abs(car ? car.speed : state.player.speed) * 3.6);
    speed.textContent = `${kmh} km/h`;
    toast.textContent = state.toast.text;
    toast.classList.toggle('show', state.toast.text.length > 0);
    title.classList.toggle('hidden', screen !== 'title');
    pause.classList.toggle('hidden', screen !== 'paused');
    busted.classList.toggle('hidden', screen !== 'busted');
    if (screen === 'busted') bustedReason.textContent = state.busted.reason;
    const done = state.stats.missionsDone;
    storyLine.textContent = done >= MISSIONS.length
      ? 'Story complete — free roam.'
      : `Missions done: ${done} / ${MISSIONS.length}`;
    drawMap(state);
  }

  return { update };
}
