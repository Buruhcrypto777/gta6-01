// The police response: patrol cars that chase Mara's car and foot cops that chase her on
// foot, both governed by the wanted level. A patrol car steers at the player and rams; a
// foot cop runs her down. When the wanted level clears, the police drive off and despawn
// once they are far enough away.
import { CITY, WANTED } from './config.js';
import { nearestRoad } from './city.js';
import { pushOutOfBuildings } from './world.js';

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function angleDifference(from, to) {
  let d = to - from;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function stepPoliceCar(world, car, dt) {
  const state = world.state;
  const player = state.player;
  if (car.state === 'leaving') {
    // Drive for the nearest edge of the city, then vanish.
    const edge = Math.abs(car.x) > Math.abs(car.z)
      ? { x: Math.sign(car.x) * (CITY.half + 30), z: car.z }
      : { x: car.x, z: Math.sign(car.z) * (CITY.half + 30) };
    const target = Math.atan2(edge.x - car.x, edge.z - car.z);
    car.heading += clamp(angleDifference(car.heading, target), -2 * dt, 2 * dt);
    car.speed += (14 - car.speed) * Math.min(1, dt * 2);
  } else {
    // Chase from behind, not head-on: close in, the target is a point behind Mara, so the
    // patrol car follows her bumper instead of parking across her nose.
    const dist = Math.hypot(player.x - car.x, player.z - car.z);
    let targetX = player.x;
    let targetZ = player.z;
    if (dist < 25) {
      targetX = player.x - Math.sin(player.heading) * 10;
      targetZ = player.z - Math.cos(player.heading) * 10;
    }
    const target = Math.atan2(targetX - car.x, targetZ - car.z);
    car.heading += clamp(angleDifference(car.heading, target), -2.6 * dt, 2.6 * dt);
    const chaseSpeed = Math.min(WANTED.policeChaseSpeed, Math.abs(player.speed) + 5);
    car.speed += (chaseSpeed - car.speed) * Math.min(1, dt * 1.5);
    car.sirenPhase += dt * 6;
  }
  car.x += Math.sin(car.heading) * car.speed * dt;
  car.z += Math.cos(car.heading) * car.speed * dt;
  const pushed = pushOutOfBuildings(world.layout, car.x, car.z, 2.1);
  car.x = pushed.x;
  car.z = pushed.z;
  if (pushed.hit) car.speed *= 0.5;
  if (car.state === 'leaving' && Math.hypot(car.x - player.x, car.z - player.z) > WANTED.despawnDistance) {
    car.state = 'gone';
  }
}

function stepFootCop(world, cop, dt) {
  const state = world.state;
  const player = state.player;
  if (cop.state === 'down') return; // The fall timer runs in world.stepPeds.
  if (cop.state === 'leaving') {
    const road = nearestRoad(cop.x, cop.z);
    cop.heading = Math.atan2(road.x - cop.x, road.z - cop.z);
    cop.x += Math.sin(cop.heading) * 2 * dt;
    cop.z += Math.cos(cop.heading) * 2 * dt;
    if (Math.hypot(cop.x - player.x, cop.z - player.z) > WANTED.despawnDistance) cop.state = 'gone';
    return;
  }
  if (!player.onFoot || Math.abs(player.speed) > 9) {
    // She is in a car and pulling away: the cop stops and watches.
    cop.walkPhase += dt * 2;
    return;
  }
  const target = Math.atan2(player.x - cop.x, player.z - cop.z);
  cop.heading = target;
  cop.x += Math.sin(cop.heading) * WANTED.copChaseSpeed * dt;
  cop.z += Math.cos(cop.heading) * WANTED.copChaseSpeed * dt;
  cop.walkPhase += dt * 10;
  const pushed = pushOutOfBuildings(world.layout, cop.x, cop.z, 0.5);
  cop.x = pushed.x;
  cop.z = pushed.z;
}

/** Advance every police car and foot cop one step; remove the ones that left. */
export function updatePolice(world, dt) {
  const state = world.state;
  for (const car of state.cars) {
    if (car.state !== 'police' && car.state !== 'leaving') continue;
    stepPoliceCar(world, car, dt);
  }
  for (const ped of state.peds) {
    if (ped.kind !== 'cop') continue;
    stepFootCop(world, ped, dt);
  }
  // Remove the departed in place: state.cars is the same array the world closes over.
  for (let i = state.cars.length - 1; i >= 0; i -= 1) {
    if (state.cars[i].state === 'gone') state.cars.splice(i, 1);
  }
  for (let i = state.peds.length - 1; i >= 0; i -= 1) {
    if (state.peds[i].state === 'gone') state.peds.splice(i, 1);
  }
}
