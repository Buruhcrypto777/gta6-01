// The living world: the player, the cars, the pedestrians, the police and the
// missions, all advanced in fixed steps. The renderer only paints this state;
// the HUD only reads it; nothing else moves the game.
import {
  BUSTED_FINE, CAR, GRID, MISSIONS, PLAYER, STEP, STORY_BONUS, TRAFFIC, WANTED,
} from './config.js';
import { buildCity, collideBuildings, nearestRoad, onRoad } from './city.js';
import { clamp, createRandom, dist2d, wrapAngle } from './random.js';
import { updateMissions, missionWaypoint } from './missions.js';
import { updatePolice } from './police.js';
import { updatePeds, updateTraffic } from './traffic.js';
import { tryPunch } from './combat.js';

const CAR_COLORS = [0xc22e2e, 0x2e8f8a, 0xe8b93d, 0xe8e8e8, 0x22242a, 0x4a6fa5, 0x7a4a8a];

let nextCarId = 1;

/** A fresh world from a seed and a save (cash + mission progress carry over). */
export function createWorld(seed, save) {
  const rng = createRandom(seed);
  const city = buildCity(rng);
  const state = {
    seed, rng, city,
    time: 0,
    screen: 'title',
    player: {
      x: 10, z: 28, heading: Math.PI, onFoot: true, car: null,
      speed: 0, walkPhase: 0, punchTimer: 0, running: false,
    },
    cars: [],
    peds: [],
    wanted: 0,
    quietSince: 0,
    lastCrimeAt: -999,
    lastCopHitAt: -999,
    lastPedHitAt: -999,
    cash: save?.cash ?? 0,
    missionIndex: save?.missionIndex ?? 0,
    mission: { checkpoint: 0, started: false },
    toast: { text: '', until: 0 },
    camYaw: Math.PI,
    camPitch: 0.32,
    camDist: 11,
    busted: { active: false, timer: 0, reason: '' },
    events: [],
    stats: { carsStolen: 0, missionsDone: 0 },
    storyDone: false,
  };
  spawnParked(state);
  spawnTraffic(state);
  spawnPeds(state);
  return state;
}

/** Put the world back to its first step, keeping cash and mission progress. */
export function resetWorld(state) {
  const save = { cash: state.cash, missionIndex: state.missionIndex };
  const fresh = createWorld(state.seed, save);
  for (const key of Object.keys(fresh)) state[key] = fresh[key];
}

function spawnParked(state) {
  for (const spot of state.city.parkedSpots) {
    state.cars.push({
      id: nextCarId, kind: 'parked', x: spot.x, z: spot.z, heading: spot.heading,
      speed: 0, color: CAR_COLORS[state.rng.int(0, CAR_COLORS.length - 1)],
      isPolice: false, cruise: 0, lane: 0, route: null, leg: 0, blocked: 0, flash: 0,
    });
    nextCarId += 1;
  }
}

function spawnTraffic(state) {
  for (let i = 0; i < TRAFFIC.count; i += 1) {
    const road = state.rng.pick(GRID.roads);
    const along = state.rng.range(-190, 190);
    const axis = state.rng.chance(0.5) ? 'x' : 'z';
    const heading = axis === 'x'
      ? (state.rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2)
      : (state.rng.chance(0.5) ? 0 : Math.PI);
    state.cars.push({
      id: nextCarId, kind: 'traffic',
      x: axis === 'x' ? along : road, z: axis === 'x' ? road : along,
      heading, speed: state.rng.range(TRAFFIC.cruiseMin, TRAFFIC.cruiseMax),
      color: CAR_COLORS[state.rng.int(0, CAR_COLORS.length - 1)],
      isPolice: false, cruise: state.rng.range(TRAFFIC.cruiseMin, TRAFFIC.cruiseMax),
      lane: 0, route: null, leg: 0, blocked: 0, flash: 0,
    });
    nextCarId += 1;
  }
}

function spawnPeds(state) {
  for (let i = 0; i < 18; i += 1) {
    const road = state.rng.pick(GRID.roads);
    const along = state.rng.range(-190, 190);
    const axis = state.rng.chance(0.5) ? 'x' : 'z';
    state.peds.push({
      x: axis === 'x' ? along : road + 8.5,
      z: axis === 'x' ? road + 8.5 : along,
      heading: state.rng.range(0, Math.PI * 2),
      speed: state.rng.range(1.2, 2.2),
      mode: 'walk', timer: 0, edge: axis, shirt: state.rng.pick([0xd96a4a, 0x4a7ad9, 0x7ad94a, 0xd9c74a, 0x9a4ad9]),
    });
  }
}

/** A short gold message across the top of the screen. */
export function setToast(state, text, seconds = 4) {
  state.toast = { text, until: state.time + seconds };
}

/** Raise the wanted level, remembering when the last crime happened. */
export function addWanted(state, stars, reason) {
  state.wanted = Math.min(WANTED.max, state.wanted + stars);
  state.lastCrimeAt = state.time;
  state.quietSince = state.time;
  if (reason) setToast(state, reason, 2.5);
}

/** The player's car, or null when on foot. */
export function playerCar(state) {
  return state.player.car;
}

/** Nearest drivable car to the player within reach, if any. */
function nearestCar(state, maxDist) {
  let best = null;
  let bestD = maxDist;
  for (const car of state.cars) {
    if (car.kind === 'player') continue;
    const d = dist2d(state.player.x, state.player.z, car.x, car.z);
    if (d < bestD) { bestD = d; best = car; }
  }
  return best;
}

function enterCar(state, car) {
  car.kind = 'player';
  state.player.car = car;
  state.player.onFoot = false;
  state.player.speed = 0;
  state.stats.carsStolen += 1;
  addWanted(state, WANTED.steal, 'Car stolen — the law is watching');
  state.events.push({ type: 'enter' });
}

function exitCar(state) {
  const car = state.player.car;
  car.kind = 'parked';
  car.speed = 0;
  const side = { x: Math.cos(car.heading), z: -Math.sin(car.heading) };
  state.player.x = car.x + side.x * 3;
  state.player.z = car.z + side.z * 3;
  state.player.heading = car.heading;
  state.player.car = null;
  state.player.onFoot = true;
  state.player.speed = 0;
}

/** Move the player on foot, camera-relative, and push them out of buildings. */
function stepOnFoot(state, input, dt) {
  const p = state.player;
  const speed = input.run ? PLAYER.runSpeed : PLAYER.walkSpeed;
  const fx = Math.sin(state.camYaw);
  const fz = Math.cos(state.camYaw);
  // Right-hand vector for the camera yaw: facing north (-z), right is east (+x).
  const rx = -Math.cos(state.camYaw);
  const rz = Math.sin(state.camYaw);
  const mx = fx * input.fwd + rx * input.strafe;
  const mz = fz * input.fwd + rz * input.strafe;
  const len = Math.hypot(mx, mz);
  if (len > 0.01) {
    p.heading = Math.atan2(mx / len, mz / len);
    p.x += (mx / len) * speed * dt;
    p.z += (mz / len) * speed * dt;
    p.walkPhase += dt * speed * 1.6;
    p.speed = speed;
  } else {
    p.speed = 0;
  }
  const fixed = collideBuildings(state.city, p.x, p.z, PLAYER.radius);
  p.x = fixed.x;
  p.z = fixed.z;
  p.punchTimer = Math.max(0, p.punchTimer - dt);
  if (input.punch && p.punchTimer <= 0) {
    p.punchTimer = PLAYER.punchCooldown;
    tryPunch(state);
  }
}

/** Drive the player's car: accelerate, steer, brake, handbrake, and collide. */
function stepDriving(state, input, dt) {
  const car = state.player.car;
  const p = state.player;
  if (input.fwd > 0) car.speed += CAR.accel * dt;
  if (input.fwd < 0) {
    if (car.speed > 0.5) car.speed -= CAR.brake * dt;
    else car.speed -= CAR.reverseAccel * dt;
  }
  if (input.handbrake) {
    car.speed -= Math.sign(car.speed) * CAR.handbrakeDecel * dt;
    if (Math.abs(car.speed) < 0.5) car.speed = 0;
  }
  car.speed = clamp(car.speed, -CAR.maxReverse, CAR.maxSpeed);
  if (Math.abs(car.speed) > 0.2) {
    const turn = input.steer * CAR.steer * clamp(Math.abs(car.speed) / 12, 0.25, 1);
    car.heading += turn * dt * Math.sign(car.speed) * (input.handbrake ? 1.5 : 1);
  }
  const fx = Math.sin(car.heading);
  const fz = Math.cos(car.heading);
  car.x += fx * car.speed * dt;
  car.z += fz * car.speed * dt;
  const before = { x: car.x, z: car.z, speed: car.speed };
  const fixed = collideBuildings(state.city, car.x, car.z, CAR.radius);
  if ((fixed.x !== before.x || fixed.z !== before.z) && Math.abs(before.speed) > 6) {
    state.events.push({ type: 'crash' });
    car.speed *= 0.55;
  }
  car.x = fixed.x;
  car.z = fixed.z;
  p.x = car.x;
  p.z = car.z;
  p.heading = car.heading;
  p.speed = Math.abs(car.speed);
  if (input.punch) setToast(state, 'You need to be on foot to fight', 1.5);
}

/** Resolve a collision between two cars: push apart, trade speed, judge the ram. */
function collideCars(state, a, b) {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const d = Math.hypot(dx, dz);
  const min = CAR.radius * 2 - 0.4;
  if (d >= min || d < 0.001) return;
  const nx = dx / d;
  const nz = dz / d;
  const push = (min - d) / 2;
  // A parked car does not move: only the other car is pushed out of it.
  const pushA = a.kind === 'parked' ? 0 : push;
  const pushB = b.kind === 'parked' ? 0 : push;
  a.x -= nx * pushA;
  a.z -= nz * pushA;
  b.x += nx * pushB;
  b.z += nz * pushB;
  const rel = (b.speed * Math.sin(b.heading) - a.speed * Math.sin(a.heading)) * nx
    + (b.speed * Math.cos(b.heading) - a.speed * Math.cos(a.heading)) * nz;
  if (Math.abs(rel) > 3) {
    state.events.push({ type: 'crash' });
    const playerInvolved = a.kind === 'player' || b.kind === 'player';
    const cop = a.isPolice ? a : b.isPolice ? b : null;
    const player = a.kind === 'player' ? a : b.kind === 'player' ? b : null;
    if (playerInvolved && cop && player) {
      // Who rear-ended whom? A police car closing from behind the player is a
      // police ram — the player's fault only when the player drives into the cop.
      const toCop = { x: cop.x - player.x, z: cop.z - player.z };
      const playerFwd = { x: Math.sin(player.heading), z: Math.cos(player.heading) };
      const copBehindPlayer = toCop.x * playerFwd.x + toCop.z * playerFwd.z < 0;
      const closing = rel * (cop === a ? -1 : 1);
      if (copBehindPlayer && closing > 0) {
        player.speed *= 0.7;
      } else if (state.time - state.lastCopHitAt > 5 && Math.abs(player.speed) > 8) {
        state.lastCopHitAt = state.time;
        addWanted(state, WANTED.hitCop, 'You hit a police cruiser!');
      }
    }
    a.speed *= 0.8;
    b.speed *= 0.8;
  }
}

/** A fast car through a pedestrian: the pedestrian goes down, the law notices. */
function collideCarPed(state, car) {
  if (car.kind !== 'player' || Math.abs(car.speed) < 3) return;
  for (const ped of state.peds) {
    if (ped.mode === 'down') continue;
    if (dist2d(car.x, car.z, ped.x, ped.z) < 2.4) {
      ped.mode = 'down';
      ped.timer = 3;
      car.speed *= 0.85;
      state.events.push({ type: 'crash' });
      if (state.time - state.lastPedHitAt > 5) {
        state.lastPedHitAt = state.time;
        addWanted(state, WANTED.hitPed, 'You hit a pedestrian!');
      }
    }
  }
}

/** Advance the world one fixed step. Input is the same shape in play and in shots. */
export function stepWorld(state, input, dt = STEP) {
  state.time += dt;
  if (input.enterCar) {
    if (state.player.onFoot) {
      const car = nearestCar(state, 4);
      if (car) enterCar(state, car);
    } else {
      exitCar(state);
    }
  }
  if (state.player.onFoot) stepOnFoot(state, input, dt);
  else stepDriving(state, input, dt);

  updateTraffic(state, dt);
  updatePeds(state, dt);
  updatePolice(state, dt);
  updateMissions(state);

  const cars = state.cars;
  for (let i = 0; i < cars.length; i += 1) {
    for (let j = i + 1; j < cars.length; j += 1) collideCars(state, cars[i], cars[j]);
  }
  for (const car of cars) collideCarPed(state, car);

  // Wanted fades when the player has been quiet and out of sight for a while.
  if (state.wanted > 0 && state.time - state.lastCrimeAt > WANTED.decayQuietSeconds) {
    if (state.time - (state.quietSince + WANTED.decayQuietSeconds) > WANTED.decayStepSeconds) {
      state.wanted -= 1;
      state.quietSince = state.time;
      state.lastCrimeAt = state.time;
      if (state.wanted === 0) setToast(state, 'You lost them. For now.', 3);
    }
  }
  if (state.toast.until && state.time > state.toast.until) state.toast.text = '';
  if (state.pendingBriefing && state.time >= state.pendingBriefing.at) {
    setToast(state, state.pendingBriefing.text, 5);
    state.pendingBriefing = null;
  }
  if (state.busted.active) {
    state.busted.timer -= dt;
    if (state.busted.timer <= 0) {
      state.busted.active = false;
      state.screen = 'play';
    }
  }
}

/** The waypoint the HUD and the beacon should point at right now, or null. */
export function currentWaypoint(state) {
  return missionWaypoint(state);
}

/** Finish the story: bonus cash, a toast, free roam from here on. */
export function finishStory(state) {
  if (state.storyDone) return;
  state.storyDone = true;
  state.cash += STORY_BONUS;
  state.stats.missionsDone = MISSIONS.length;
  setToast(state, `Story complete — the syndicate pays $${STORY_BONUS}. Solmar Bay is yours.`, 6);
  state.events.push({ type: 'jingle' });
}

export { nearestRoad, onRoad };
