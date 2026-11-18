// The HUD: the cash and wanted stars, the mission objective, the contextual prompt, the
// speed and the toasts as DOM text, and the minimap as a small 2D canvas — the road grid,
// the sea, the player arrow, police in red and the waypoint in yellow. It reads the world's
// state and paints it; it never owns any rules.
import { CITY } from './config.js';

function stars(wanted) {
  return '★'.repeat(wanted) + '☆'.repeat(Math.max(0, 5 - wanted));
}

export function createHud(world, missions) {
  const cashEl = document.getElementById('cash');
  const starsEl = document.getElementById('wanted');
  const objectiveEl = document.getElementById('objective');
  const distanceEl = document.getElementById('distance');
  const promptEl = document.getElementById('prompt');
  const speedEl = document.getElementById('speed');
  const toastEl = document.getElementById('toast');
  const mapCanvas = document.getElementById('minimap');
  const mapCtx = mapCanvas.getContext('2d');

  function drawMinimap(state) {
    const size = mapCanvas.width;
    const scale = size / 420; // The map covers x -200..200 and z -220..200.
    const toX = (x) => (x + 200) * scale;
    const toY = (z) => (z + 220) * scale;
    mapCtx.fillStyle = '#1f6d8a';
    mapCtx.fillRect(0, 0, size, size);
    mapCtx.fillStyle = '#e8d29a';
    mapCtx.fillRect(0, toY(CITY.sandFrom), size, (CITY.sandTo - CITY.sandFrom) * scale);
    mapCtx.fillStyle = '#8a8f96';
    mapCtx.fillRect(0, 0, size, toY(CITY.sandFrom));
    mapCtx.strokeStyle = '#3a3f46';
    mapCtx.lineWidth = Math.max(2, CITY.roadWidth * scale);
    for (const line of CITY.avenues) {
      mapCtx.beginPath();
      mapCtx.moveTo(toX(line), toY(-CITY.half));
      mapCtx.lineTo(toX(line), toY(CITY.half));
      mapCtx.stroke();
    }
    for (const line of CITY.streets) {
      mapCtx.beginPath();
      mapCtx.moveTo(toX(-CITY.half), toY(line));
      mapCtx.lineTo(toX(CITY.half), toY(line));
      mapCtx.stroke();
    }
    const waypoint = state.waypoint;
    if (waypoint) {
      mapCtx.fillStyle = '#ffd23d';
      mapCtx.beginPath();
      mapCtx.moveTo(toX(waypoint.x), toY(waypoint.z) - 6);
      mapCtx.lineTo(toX(waypoint.x) + 6, toY(waypoint.z));
      mapCtx.lineTo(toX(waypoint.x), toY(waypoint.z) + 6);
      mapCtx.lineTo(toX(waypoint.x) - 6, toY(waypoint.z));
      mapCtx.closePath();
      mapCtx.fill();
    }
    for (const car of state.cars) {
      mapCtx.fillStyle = car.state === 'police' ? '#ff5252' : '#d8d2c2';
      mapCtx.beginPath();
      mapCtx.arc(toX(car.x), toY(car.z), car.state === 'police' ? 3.5 : 2, 0, Math.PI * 2);
      mapCtx.fill();
    }
    const player = state.player;
    mapCtx.save();
    mapCtx.translate(toX(player.x), toY(player.z));
    // The arrow is drawn pointing up (-y); rotate it to the player's heading, where
    // heading 0 faces +z (down on this map) and grows clockwise.
    mapCtx.rotate(Math.PI - player.heading);
    mapCtx.fillStyle = '#ffffff';
    mapCtx.beginPath();
    mapCtx.moveTo(0, -6);
    mapCtx.lineTo(4.5, 5);
    mapCtx.lineTo(-4.5, 5);
    mapCtx.closePath();
    mapCtx.fill();
    mapCtx.restore();
  }

  /** Refresh every HUD element from the current state. */
  function update() {
    const state = world.state;
    cashEl.textContent = `$${state.cash}`;
    starsEl.textContent = stars(state.wanted);
    starsEl.style.opacity = state.wanted > 0 ? '1' : '0.45';
    objectiveEl.textContent = missions.objectiveText();
    const distance = missions.distanceToWaypoint();
    distanceEl.textContent = distance === null ? '' : `${distance} m`;
    const player = state.player;
    if (!player.onFoot) {
      speedEl.textContent = `${Math.round(Math.abs(player.speed) * 3.6)} km/h`;
      promptEl.textContent = 'E — Exit car    Space — Handbrake';
    } else {
      speedEl.textContent = '';
      const car = world.nearestCar(player.x, player.z, 3.6, ['traffic', 'parked']);
      if (car) promptEl.textContent = car.state === 'traffic' ? 'E — Steal car' : 'E — Enter car';
      else promptEl.textContent = 'F — Punch    Shift — Sprint';
    }
    toastEl.textContent = state.toast;
    toastEl.style.opacity = state.toast ? '1' : '0';
    drawMinimap(state);
  }

  return { update };
}
