// Traffic and pedestrians: cars that follow the road grid, and people who walk the
// sidewalks and run when the city gets loud.
import { GRID, PEDS, TRAFFIC } from './config.js';
import { clamp, dist2d, wrapAngle } from './random.js';

/** The intersection a car is driving toward, from its current leg. */
function legTarget(car) {
  const route = car.route;
  if (!route || car.leg >= route.length) return null;
  return route[car.leg];
}

/** Pick a new route: a random walk of intersections across the grid. */
function newRoute(rng, x, z) {
  const route = [];
  let cx = x;
  let cz = z;
  for (let i = 0; i < 5; i += 1) {
    const horizontal = rng.chance(0.5);
    const next = rng.pick(GRID.roads);
    if (horizontal) cx = next;
    else cz = next;
    route.push({ x: cx, z: cz });
  }
  return route;
}

/** Is another car close ahead in this car's lane? */
function carAhead(state, car) {
  const fx = Math.sin(car.heading);
  const fz = Math.cos(car.heading);
  let nearest = Infinity;
  for (const other of state.cars) {
    if (other === car || other.kind === 'parked') continue;
    const dx = other.x - car.x;
    const dz = other.z - car.z;
    const along = dx * fx + dz * fz;
    const side = Math.abs(dx * fz - dz * fx);
    if (along > 0 && along < TRAFFIC.followGap + 6 && side < 3.5 && along < nearest) nearest = along;
  }
  return nearest;
}

/** Drive one traffic car: follow its route, slow for the car ahead, overtake when stuck. */
function stepTrafficCar(state, car, dt) {
  if (car.kind !== 'traffic') return;
  if (!car.route || car.leg >= car.route.length) {
    car.route = newRoute(state.rng, car.x, car.z);
    car.leg = 0;
  }
  const target = legTarget(car);
  if (!target) return;
  const dx = target.x - car.x;
  const dz = target.z - car.z;
  const dist = Math.hypot(dx, dz);
  if (dist < 3) {
    car.leg += 1;
    return;
  }
  const wantHeading = Math.atan2(dx, dz);
  const turn = clamp(wrapAngle(wantHeading - car.heading), -1, 1);
  car.heading += turn * 1.8 * dt;
  const ahead = carAhead(state, car);
  if (ahead < TRAFFIC.followGap) {
    car.blocked += dt;
    car.speed = Math.max(0, car.speed - 12 * dt);
    if (car.blocked > TRAFFIC.blockedSeconds) {
      // Overtake: swing into the next lane over and push past.
      car.lane = car.lane === 0 ? -4.6 : 0;
      car.blocked = 0;
      car.speed = Math.min(car.cruise + 4, car.speed + 6);
    }
  } else {
    car.blocked = 0;
    car.speed += (car.cruise - car.speed) * Math.min(1, dt * 0.8);
  }
  const laneX = Math.cos(car.heading) * car.lane;
  const laneZ = -Math.sin(car.heading) * car.lane;
  car.x += Math.sin(car.heading) * car.speed * dt + laneX * dt * 0.5;
  car.z += Math.cos(car.heading) * car.speed * dt + laneZ * dt * 0.5;
}

/** All traffic cars, one step. Parked and player cars are left alone. */
export function updateTraffic(state, dt) {
  for (const car of state.cars) stepTrafficCar(state, car, dt);
}

/** Walk the sidewalks; run from a speeding car or a raised fist. */
export function updatePeds(state, dt) {
  const player = state.player;
  const playerCar = state.player.car;
  const threatX = playerCar ? playerCar.x : player.x;
  const threatZ = playerCar ? playerCar.z : player.z;
  const threatFast = playerCar ? Math.abs(playerCar.speed) > 8 : false;
  for (const ped of state.peds) {
    if (ped.mode === 'down') {
      ped.timer -= dt;
      if (ped.timer <= 0) {
        ped.mode = 'flee';
        ped.timer = 3;
      }
      continue;
    }
    const d = dist2d(ped.x, ped.z, threatX, threatZ);
    if (ped.mode === 'walk' && ((threatFast && d < 9) || d < 2.5)) {
      ped.mode = 'flee';
      ped.timer = 2.5;
    }
    if (ped.mode === 'flee') {
      ped.timer -= dt;
      const away = Math.atan2(ped.x - threatX, ped.z - threatZ);
      ped.heading = away;
      ped.x += Math.sin(away) * PEDS.fleeSpeed * dt;
      ped.z += Math.cos(away) * PEDS.fleeSpeed * dt;
      if (ped.timer <= 0) ped.mode = 'walk';
    } else {
      // Stroll along the sidewalk: keep to the edge of the nearest road.
      ped.x += Math.sin(ped.heading) * ped.speed * dt;
      ped.z += Math.cos(ped.heading) * ped.speed * dt;
      if (!onSidewalk(ped.x, ped.z)) {
        ped.heading += Math.PI / 2;
      }
    }
    ped.x = clamp(ped.x, GRID.min - 2, GRID.seaX - 2);
    ped.z = clamp(ped.z, GRID.min - 2, GRID.max + 2);
  }
}

/** Is a point on a sidewalk (just off the asphalt, inside the city)? */
function onSidewalk(x, z) {
  for (const r of GRID.roads) {
    const dx = Math.abs(x - r);
    const dz = Math.abs(z - r);
    if ((dx >= GRID.roadHalf && dx <= GRID.roadHalf + 3.5) || (dz >= GRID.roadHalf && dz <= GRID.roadHalf + 3.5)) {
      return true;
    }
  }
  return x > GRID.beachX - 2;
}
