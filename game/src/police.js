// The wanted system and the police who answer it: cruisers that chase from behind
// and foot cops who close in on foot. Getting caught costs cash and a fresh start.
import { BUSTED_FINE, GRID, WANTED } from './config.js';
import { clamp, dist2d, wrapAngle } from './random.js';

const PURSUIT_SPEED = 40;
const SPAWN_INTERVAL = 2.5;

/** How many pursuit cars the wanted level asks for. */
function wantedCars(wanted) {
  return Math.min(wanted, 3);
}

/** A road-edge spawn point away from the player. */
function spawnPoint(state) {
  const edges = [
    { x: -196, z: state.rng.range(-190, 190) },
    { x: 196, z: state.rng.range(-190, 190) },
    { x: state.rng.range(-190, 190), z: -196 },
    { x: state.rng.range(-190, 190), z: 196 },
  ];
  let best = edges[0];
  let bestD = -1;
  for (const e of edges) {
    const d = dist2d(e.x, e.z, state.player.x, state.player.z);
    if (d > bestD) { bestD = d; best = e; }
  }
  return best;
}

/** Steer a pursuit car toward the player, from behind, never head-on. */
function stepPursuit(state, car, dt) {
  const p = state.player;
  const dx = p.x - car.x;
  const dz = p.z - car.z;
  const dist = Math.hypot(dx, dz);
  const wantHeading = Math.atan2(dx, dz);
  const turn = clamp(wrapAngle(wantHeading - car.heading), -1, 1);
  car.heading += turn * 2.4 * dt;
  const targetSpeed = dist > 60 ? PURSUIT_SPEED : PURSUIT_SPEED - 4;
  car.speed += (targetSpeed - car.speed) * Math.min(1, dt * 0.9);
  car.x += Math.sin(car.heading) * car.speed * dt;
  car.z += Math.cos(car.heading) * car.speed * dt;
  car.flash = (state.time * 6) % 2 < 1 ? 1 : 2;
  if (dist < 3.5 && Math.abs(car.speed) > 4) {
    car.speed *= 0.85;
  }
}

/** Foot cops: spawn when the player is on foot and wanted, walk the player down. */
function stepFootCops(state, dt) {
  const p = state.player;
  if (!p.onFoot || state.wanted === 0) return;
  if (!state.footCops) state.footCops = [];
  const want = Math.min(state.wanted, 2);
  while (state.footCops.length < want) {
    const angle = state.rng.range(0, Math.PI * 2);
    state.footCops.push({
      x: p.x + Math.sin(angle) * 25,
      z: p.z + Math.cos(angle) * 25,
      heading: 0, speed: 5.5, timer: 0,
    });
  }
  for (const cop of state.footCops) {
    const d = dist2d(cop.x, cop.z, p.x, p.z);
    cop.heading = Math.atan2(p.x - cop.x, p.z - cop.z);
    cop.x += Math.sin(cop.heading) * cop.speed * dt;
    cop.z += Math.cos(cop.heading) * cop.speed * dt;
    if (d < 1.6) {
      cop.timer += dt;
      if (cop.timer > 0.8) {
        bustPlayer(state, 'The cops caught Mara on foot.');
        return;
      }
    } else {
      cop.timer = 0;
    }
  }
}

/** Busted: lose the fine, lose the heat, wake up at Marina Plaza. */
export function bustPlayer(state, reason) {
  if (state.busted.active) return;
  state.busted = { active: true, timer: 2.2, reason };
  state.screen = 'busted';
  state.wanted = 0;
  state.cash = Math.max(0, state.cash - BUSTED_FINE);
  state.footCops = [];
  for (const car of state.cars) {
    if (car.isPolice) car.kind = 'gone';
  }
  state.cars = state.cars.filter((c) => c.kind !== 'gone');
  if (state.player.car) {
    state.player.car.kind = 'parked';
    state.player.car.speed = 0;
    state.player.car = null;
  }
  state.player.onFoot = true;
  state.player.x = 10;
  state.player.z = 28;
  state.player.heading = Math.PI;
  state.player.speed = 0;
  state.events.push({ type: 'busted' });
}

/** Keep the pursuit at the wanted level's strength and check for a bust. */
export function updatePolice(state, dt) {
  if (!state.policeTimer) state.policeTimer = 0;
  state.policeTimer -= dt;
  const pursuit = state.cars.filter((c) => c.kind === 'police');
  if (state.wanted > 0 && state.policeTimer <= 0) {
    state.policeTimer = SPAWN_INTERVAL;
    if (pursuit.length < wantedCars(state.wanted)) {
      const spot = spawnPoint(state);
      state.cars.push({
        id: 9000 + pursuit.length, kind: 'police',
        x: spot.x, z: spot.z, heading: Math.atan2(state.player.x - spot.x, state.player.z - spot.z),
        speed: 20, color: 0xf0f0f0, isPolice: true, cruise: PURSUIT_SPEED,
        lane: 0, route: null, leg: 0, blocked: 0, flash: 1,
      });
    }
  }
  for (const car of state.cars) {
    if (car.kind === 'police') stepPursuit(state, car, dt);
  }
  // Far, idle cruisers give up and leave.
  state.cars = state.cars.filter((c) => {
    if (c.kind !== 'police') return true;
    if (state.wanted === 0 && dist2d(c.x, c.z, state.player.x, state.player.z) > 120) return false;
    return true;
  });
  stepFootCops(state, dt);
  // Busted in a car: boxed in and stopped with a cruiser on the bumper.
  if (!state.player.onFoot && state.wanted > 0 && state.player.car) {
    const car = state.player.car;
    if (Math.abs(car.speed) < 2) {
      let close = false;
      for (const c of state.cars) {
        if (c.kind === 'police' && dist2d(c.x, c.z, car.x, car.z) < 4) close = true;
      }
      if (close) {
        state.busted.carTimer = (state.busted.carTimer ?? 0) + dt;
        if (state.busted.carTimer > 3) {
          state.busted.carTimer = 0;
          bustPlayer(state, 'Boxed in. The cruisers took Mara downtown.');
        }
      } else {
        state.busted.carTimer = 0;
      }
    } else {
      state.busted.carTimer = 0;
    }
  }
}

export { WANTED };
