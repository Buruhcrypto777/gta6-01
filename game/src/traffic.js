// Traffic: the cars that are not the player's. Each one holds a lane on the road grid — an
// avenue or a street, a centre line and a direction — drives it at its own cruise speed,
// slows for the car ahead, and at an intersection sometimes turns onto the cross road. The
// turn is a short arc: the heading swings from the old road to the new one while the car
// keeps rolling, then the lane is snapped to the new road.
import { CAR, CITY } from './config.js';

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function angleDifference(from, to) {
  let d = to - from;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** The heading a car holds while it drives its road in its direction. */
function laneHeading(car) {
  if (car.road === 'avenue') return car.dir > 0 ? 0 : Math.PI;
  return car.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
}

/** The lateral coordinate of the car's lane (right-hand traffic). */
function lanePosition(car) {
  if (car.road === 'avenue') return car.line + (car.dir > 0 ? -CITY.laneOffset : CITY.laneOffset);
  return car.line + (car.dir > 0 ? CITY.laneOffset : -CITY.laneOffset);
}

/** The next cross road the car is about to reach, or null when it is mid-block. */
function nextCrossing(car) {
  const lines = car.road === 'avenue' ? CITY.streets : CITY.avenues;
  const along = car.road === 'avenue' ? car.z : car.x;
  for (const line of lines) {
    const d = (line - along) * car.dir;
    if (d > -2 && d < 14) return { line, distance: d };
  }
  return null;
}

/** How far the nearest car ahead is, in the direction this car is travelling. */
function carAhead(world, car) {
  let best = Infinity;
  const fx = Math.sin(car.heading);
  const fz = Math.cos(car.heading);
  for (const other of world.state.cars) {
    if (other === car || other.state === 'parked') continue;
    const dx = other.x - car.x;
    const dz = other.z - car.z;
    const ahead = dx * fx + dz * fz;
    if (ahead < 1 || ahead > 10) continue;
    const side = Math.abs(dx * fz - dz * fx);
    if (side < 3 && ahead < best) best = ahead;
  }
  return best;
}

function startTurn(car, choice, crossing) {
  const from = laneHeading(car);
  let to;
  let newRoad;
  let newLine;
  let newDir;
  if (choice === 0) return false; // Straight on.
  if (car.road === 'avenue') {
    // From north/south to east/west: left is +x when going south, -x when going north.
    newRoad = 'street';
    newLine = crossing.line;
    newDir = car.dir > 0 ? (choice < 0 ? -1 : 1) : (choice < 0 ? 1 : -1);
    to = newDir > 0 ? Math.PI / 2 : -Math.PI / 2;
  } else {
    newRoad = 'avenue';
    newLine = crossing.line;
    newDir = car.dir > 0 ? (choice < 0 ? 1 : -1) : (choice < 0 ? -1 : 1);
    to = newDir > 0 ? 0 : Math.PI;
  }
  car.turning = { from, to, progress: 0, newRoad, newLine, newDir };
  return true;
}

function stepTrafficCar(world, car, dt, random) {
  if (car.turning) {
    const turn = car.turning;
    turn.progress += dt / 1.1;
    car.heading = turn.from + angleDifference(turn.from, turn.to) * Math.min(1, turn.progress);
    car.speed += (6 - car.speed) * Math.min(1, dt * 4);
    car.x += Math.sin(car.heading) * car.speed * dt;
    car.z += Math.cos(car.heading) * car.speed * dt;
    if (turn.progress >= 1) {
      car.road = turn.newRoad;
      car.line = turn.newLine;
      car.dir = turn.newDir;
      car.turning = null;
    }
    return;
  }
  // Hold the lane and the heading.
  const target = laneHeading(car);
  car.heading += clamp(angleDifference(car.heading, target), -2.4 * dt, 2.4 * dt);
  if (car.road === 'avenue') car.x += (lanePosition(car) - car.x) * Math.min(1, dt * 3);
  else car.z += (lanePosition(car) - car.z) * Math.min(1, dt * 3);
  // Slow for the car ahead, stop bumper to bumper.
  const ahead = carAhead(world, car);
  let targetSpeed = car.cruise;
  if (ahead < 10) targetSpeed = Math.min(targetSpeed, 4);
  if (ahead < 5) targetSpeed = 0;
  car.speed += (targetSpeed - car.speed) * Math.min(1, dt * 3);
  car.x += Math.sin(car.heading) * car.speed * dt;
  car.z += Math.cos(car.heading) * car.speed * dt;
  // At an intersection, sometimes turn: never drive out of the city.
  const crossing = nextCrossing(car);
  if (crossing && crossing.distance < 2.5 && car.decideAt !== crossing.line) {
    car.decideAt = crossing.line;
    const atEdge = (car.road === 'avenue' && Math.abs(crossing.line) >= CITY.half - 1)
      || (car.road === 'street' && Math.abs(crossing.line) >= CITY.half - 1);
    const roll = random();
    const choice = atEdge ? (roll < 0.5 ? -1 : 1) : roll < 0.5 ? 0 : roll < 0.75 ? -1 : 1;
    startTurn(car, choice, crossing);
  }
  // Wrap around the far edge so the streets never empty out.
  if (car.road === 'avenue' && Math.abs(car.z) > CITY.half + 8) car.z = -car.dir * (CITY.half + 8);
  if (car.road === 'street' && Math.abs(car.x) > CITY.half + 8) car.x = -car.dir * (CITY.half + 8);
}

/** Advance every traffic car one step. Parked, player and police cars are not touched. */
export function updateTraffic(world, dt, random) {
  for (const car of world.state.cars) {
    if (car.state !== 'traffic') continue;
    stepTrafficCar(world, car, dt, random);
  }
}
