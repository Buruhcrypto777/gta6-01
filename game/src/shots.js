// The screenshot scenes behind ?shot=cover|downtown|mission|beach. Each one stages a real
// game: a fresh world from the seed, Mara put in a car (or on foot), the wanted level and
// the mission set by hand, then the autopilot drives the simulation forward for a fixed
// number of steps, so the frame is what a short game really looks like — the city, the
// traffic, the police, the HUD and the minimap all at once — and the same seed always gives
// the same frame.
import { STEP } from './config.js';
import { PLACES } from './city.js';
import { updatePolice } from './police.js';
import { updateTraffic } from './traffic.js';
import { createRandom } from './random.js';

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function angleDifference(from, to) {
  let d = to - from;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** Put Mara in `car`, as if she had just stolen it: no crime, no fuss, just a staged scene. */
function forceEnterCar(world, car) {
  const player = world.state.player;
  car.state = 'player';
  car.driver = false;
  car.speed = 0;
  player.carId = car.id;
  player.onFoot = false;
  player.x = car.x;
  player.z = car.z;
  player.heading = car.heading;
  player.speed = 0;
}

function findParkedCar(world, kind) {
  const parked = world.state.cars.filter((c) => c.state === 'parked' && (!kind || c.kind === kind));
  return parked[0] ?? world.state.cars.find((c) => c.state === 'parked');
}

/** The autopilot: steer at a target point, brake for the car ahead, never reverse. When it
 *  sits behind a car for a while, it changes lane to the left and overtakes instead of
 *  queuing behind it forever. `pilot` carries the overtake state between steps. */
function autopilotDrive(world, targetX, targetZ, pilot) {
  const car = world.playerCar();
  const input = { moveX: 0, moveZ: 0, throttle: 0, steer: 0, handbrake: false, sprint: false, enter: false, punch: false };
  if (!car) return input;
  const fx = Math.sin(car.heading);
  const fz = Math.cos(car.heading);
  let blocked = null;
  for (const other of world.state.cars) {
    if (other === car || other.state === 'parked') continue;
    const dx = other.x - car.x;
    const dz = other.z - car.z;
    const ahead = dx * fx + dz * fz;
    const side = Math.abs(dx * fz - dz * fx);
    if (ahead > 0 && ahead < 9 && side < 3) {
      blocked = other;
      break;
    }
  }
  if (blocked) pilot.blocked += STEP;
  else pilot.blocked = 0;
  let aimX = targetX;
  let aimZ = targetZ;
  if (pilot.blocked > 0.6) {
    // Change lane to the left and pass: aim fifteen metres ahead, seven to the left.
    const leftX = Math.cos(car.heading);
    const leftZ = -Math.sin(car.heading);
    aimX = car.x + fx * 15 + leftX * 7;
    aimZ = car.z + fz * 15 + leftZ * 7;
    if (pilot.blocked > 2.5) pilot.blocked = 0;
  }
  const diff = angleDifference(car.heading, Math.atan2(aimX - car.x, aimZ - car.z));
  input.steer = clamp(diff * 2.0, -1, 1);
  input.throttle = blocked ? -0.6 : Math.abs(diff) < 1.0 ? 1 : 0.4;
  if (pilot.blocked > 0.6) input.throttle = 0.8;
  return input;
}

/** Run the simulation forward `seconds` with the autopilot driving at the target. */
function driveFor(world, random, seconds, targetX, targetZ) {
  const pilot = { blocked: 0 };
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    world.step(STEP, autopilotDrive(world, targetX, targetZ, pilot));
    updateTraffic(world, STEP, random);
    updatePolice(world, STEP);
    world.missions?.update(STEP);
  }
}

/** Put the police cars just behind Mara's car, flanking it, so the chase reads in the frame. */
function placePoliceBehind(world, offsets) {
  const player = world.state.player;
  const forward = { x: Math.sin(player.heading), z: Math.cos(player.heading) };
  const right = { x: -Math.cos(player.heading), z: Math.sin(player.heading) };
  const police = world.state.cars.filter((c) => c.state === 'police');
  police.forEach((car, i) => {
    const offset = offsets[i % offsets.length];
    car.x = player.x - forward.x * offset.back + right.x * offset.side;
    car.z = player.z - forward.z * offset.back + right.z * offset.side;
    car.heading = player.heading;
    car.speed = player.speed;
  });
}

function stageCover(world, random) {
  world.reset();
  const car = findParkedCar(world, 'sport');
  car.x = 0;
  car.z = 60;
  car.heading = Math.PI;
  forceEnterCar(world, car);
  world.state.wanted = 3;
  world.state.wantedTimer = 0;
  world.state.missionIndex = 2;
  world.state.waypoint = null;
  world.spawnPoliceCar();
  world.spawnPoliceCar();
  driveFor(world, random, 6, 0, -150);
  placePoliceBehind(world, [{ back: 4, side: 3 }, { back: 5.5, side: -3 }]);
  world.state.wanted = 3;
  world.state.wantedTimer = 0;
  const player = world.state.player;
  return { yaw: player.heading + Math.PI, pitch: 0.26, distance: 12, target: { x: player.x, y: 1.5, z: player.z } };
}

function stageDowntown(world, random) {
  world.reset();
  const car = findParkedCar(world, 'sedan');
  car.x = -132;
  car.z = 132;
  car.heading = Math.PI / 2;
  forceEnterCar(world, car);
  world.state.missionIndex = 1;
  world.state.waypoint = { x: PLACES.cafe.x, z: PLACES.cafe.z, name: PLACES.cafe.name };
  driveFor(world, random, 7, 132, 132);
  const player = world.state.player;
  return { yaw: player.heading + Math.PI, pitch: 0.3, distance: 12, target: { x: player.x, y: 1.5, z: player.z } };
}

function stageMission(world, random) {
  world.reset();
  const car = findParkedCar(world, 'sedan');
  car.x = -66;
  car.z = 132;
  car.heading = Math.PI / 2;
  forceEnterCar(world, car);
  world.missions.startMission(1);
  // East along the beach road, then south onto the café forecourt: arriving at
  // Café Marisol (44, 146) completes the drop (+$400).
  driveFor(world, random, 4, 44, 132);
  driveFor(world, random, 1.2, 44, 146);
  // Completing the drop starts Hot Pursuit, whose start toast overwrites the reward toast;
  // put the reward back so the frame shows the payoff.
  world.setToast('Mission complete — The Drop  +$400', 30);
  const player = world.state.player;
  return { yaw: player.heading + Math.PI + 0.5, pitch: 0.32, distance: 11, target: { x: player.x, y: 1.5, z: player.z } };
}

function stageBeach(world, random) {
  world.reset();
  const car = findParkedCar(world, 'sport');
  car.x = -120;
  car.z = 132;
  car.heading = Math.PI / 2;
  forceEnterCar(world, car);
  world.state.wanted = 2;
  world.state.wantedTimer = 0;
  world.state.missionIndex = 1;
  world.state.waypoint = { x: PLACES.cafe.x, z: PLACES.cafe.z, name: PLACES.cafe.name };
  world.spawnPoliceCar();
  driveFor(world, random, 6, 150, 132);
  world.state.wanted = 2;
  world.state.wantedTimer = 0;
  const player = world.state.player;
  return { yaw: player.heading + Math.PI, pitch: 0.3, distance: 13, target: { x: player.x, y: 1.5, z: player.z } };
}

/**
 * Set `world` to the named scene and return the camera spec to frame it with. Any other
 * name is the cover. The traffic decisions use their own seeded generator, so the scene
 * is the same every time the seed is the same.
 */
export function stageShot(name, world, seed) {
  const random = createRandom(seed * 31 + 11);
  if (name === 'downtown') return stageDowntown(world, random);
  if (name === 'mission') return stageMission(world, random);
  if (name === 'beach') return stageBeach(world, random);
  return stageCover(world, random);
}
