// The screenshot scenes behind ?shot=cover|downtown|mission|beach. Each one plays
// the real rules forward from a fresh world for a fixed number of steps, steered
// by an autopilot that drives toward the objective and overtakes the car ahead,
// so the frame is what a short game really looks like and the same seed always
// gives the same frame. The camera framing is part of the scene: the shot's
// camera sits where the action reads best.
import { PALETTE, STEP } from './config.js';
import { clamp, dist2d, wrapAngle } from './random.js';
import { createWorld, resetWorld, stepWorld } from './world.js';
import { missionWaypoint } from './missions.js';

const DRIVE_SECONDS = 1.6;

/** Steer toward a ground point, overtaking the car ahead when one blocks the way. */
function driveToward(state, tx, tz) {
  const car = state.player.car;
  if (!car) return { fwd: 0, strafe: 0, steer: 0, run: false, handbrake: false, enterCar: false, punch: false };
  const dx = tx - car.x;
  const dz = tz - car.z;
  const dist = Math.hypot(dx, dz);
  const wantHeading = Math.atan2(dx, dz);
  const error = wrapAngle(wantHeading - car.heading);
  let steer = clamp(error * 2.2, -1, 1);
  let fwd = Math.abs(error) < 1.0 ? 1 : 0.4;
  // Is a car blocking the lane ahead? Swing to the clearer side and push past.
  const fx = Math.sin(car.heading);
  const fz = Math.cos(car.heading);
  let blocked = false;
  let leftClear = 0;
  let rightClear = 0;
  for (const other of state.cars) {
    if (other === car || other.kind === 'parked') continue;
    const ox = other.x - car.x;
    const oz = other.z - car.z;
    const along = ox * fx + oz * fz;
    const side = ox * fz - oz * fx;
    if (along > 0 && along < 10 && Math.abs(side) < 3.2) blocked = true;
    if (along > -4 && along < 14) {
      if (side < -3) leftClear += 1;
      if (side > 3) rightClear += 1;
    }
  }
  if (blocked) {
    fwd = 0.55;
    steer = leftClear <= rightClear ? -0.85 : 0.85;
  }
  if (dist < 7 && Math.abs(car.speed) > 6) fwd = -1;
  return { fwd, strafe: 0, steer, run: false, handbrake: false, enterCar: false, punch: false };
}

/** Put the player in a car at a spot, at a speed, with a wanted level and pursuit. */
function placeDriver(state, x, z, heading, speed, color, wanted, policeBehind) {
  // Borrow the nearest parked car and move it to the staging spot.
  let car = null;
  let bestD = Infinity;
  for (const c of state.cars) {
    if (c.kind !== 'parked') continue;
    const d = dist2d(state.player.x, state.player.z, c.x, c.z);
    if (d < bestD) { bestD = d; car = c; }
  }
  if (!car) return null;
  car.kind = 'player';
  car.x = x;
  car.z = z;
  car.heading = heading;
  car.speed = speed;
  if (color !== null) car.color = color;
  state.player.car = car;
  state.player.onFoot = false;
  state.player.x = x;
  state.player.z = z;
  state.player.heading = heading;
  state.player.speed = speed;
  state.wanted = wanted;
  state.lastCrimeAt = state.time;
  state.quietSince = state.time;
  // Pursuit from behind, never head-on: the cruisers close from the player's wake.
  for (let i = 0; i < policeBehind; i += 1) {
    const back = 12 + i * 7;
    const side = i % 2 === 0 ? -4 : 4;
    const bx = x - Math.sin(heading) * back + Math.cos(heading) * side;
    const bz = z - Math.cos(heading) * back - Math.sin(heading) * side;
    state.cars.push({
      id: 9000 + i, kind: 'police', x: bx, z: bz, heading,
      speed: Math.max(20, speed - 2), color: PALETTE.policeWhite, isPolice: true,
      cruise: 40, lane: 0, route: null, leg: 0, blocked: 0, flash: 1,
    });
  }
  return car;
}

/** Run the world forward with the autopilot until a condition holds or steps run out. */
function runUntil(state, target, maxSteps, done) {
  let steps = 0;
  while (steps < maxSteps) {
    const input = target ? driveToward(state, target.x, target.z) : { fwd: 1, strafe: 0, steer: 0, run: false, handbrake: false, enterCar: false, punch: false };
    stepWorld(state, input, STEP);
    steps += 1;
    if (done && done(state)) break;
  }
  return steps;
}

/**
 * Set the world to the named scene and return the camera framing for it.
 * The screen is always the play screen; the HUD shows the mission live.
 */
export function stageShot(name, world) {
  resetWorld(world);
  const state = world;
  const shots = {
    cover: { mission: 2, cash: 0, start: { x: -60, z: 84, heading: Math.PI / 2, speed: 34 }, color: PALETTE.carRed, wanted: 3, police: 2, camPitch: 0.26, camDist: 14, camAhead: Math.PI - 0.35 },
    downtown: { mission: 1, cash: 0, start: { x: 50, z: 140, heading: Math.PI / 2, speed: 27 }, color: null, wanted: 0, police: 0, camPitch: 0.3, camDist: 12, camAhead: 0 },
    mission: { mission: 1, cash: 0, start: { x: 95, z: 140, heading: Math.PI / 2, speed: 27 }, color: null, wanted: 3, police: 1, camPitch: 0.28, camDist: 13, camAhead: 0.4 },
    beach: { mission: 1, cash: 0, start: { x: 196, z: 120, heading: Math.PI, speed: 34 }, color: PALETTE.carRed, wanted: 2, police: 0, camPitch: 0.3, camDist: 12, camAhead: 0 },
  };
  const shot = shots[name] ?? shots.cover;
  state.missionIndex = shot.mission;
  state.cash = shot.cash;
  const s = shot.start;
  placeDriver(state, s.x, s.z, s.heading, s.speed, shot.color, shot.wanted, shot.police);
  // Let the mission arm itself (its briefing waits behind the completion toast).
  stepWorld(state, { fwd: 0, strafe: 0, steer: 0, run: false, handbrake: false, enterCar: false, punch: false }, STEP);

  if (name === 'mission') {
    // Drive into the café waypoint so The Drop completes for real: cash +$400,
    // the toast, the next mission arming behind it.
    const wp = missionWaypoint(state);
    runUntil(state, wp, Math.floor(20 / STEP), (st) => st.missionIndex > shot.mission);
    runUntil(state, { x: 170, z: 140 }, 40, null);
  } else if (name === 'downtown') {
    const wp = missionWaypoint(state);
    runUntil(state, wp, Math.floor(DRIVE_SECONDS / STEP), null);
  } else if (name === 'beach') {
    runUntil(state, { x: 196, z: -40 }, Math.floor(DRIVE_SECONDS / STEP), null);
  } else {
    runUntil(state, { x: 120, z: 84 }, Math.floor(DRIVE_SECONDS / STEP), null);
  }

  const car = state.player.car;
  const heading = car ? car.heading : Math.PI / 2;
  return {
    screen: 'play',
    camYaw: heading + shot.camAhead,
    camPitch: shot.camPitch,
    camDist: shot.camDist,
  };
}

export { createWorld };
