// Solmar Bay — parked cars: the cars Mara can steal.
// Twenty-four cars sit along the curbs of the street grid, each with a type
// and a position; stealing one is the first step of every getaway.
import { CAR_COLORS, VEHICLE_TYPES, WORLD } from './config.js';
import { makeCarMesh } from './vehicles.js';

export function createParked(scene, rng) {
  const cars = [];
  const streets = [];
  for (let k = -4; k <= 4; k += 1) streets.push(k * WORLD.roadEvery);
  for (let i = 0; i < 24; i += 1) {
    const alongX = rng.chance(0.5);
    const street = rng.pick(streets);
    const along = rng.range(-190, 190);
    const side = rng.chance(0.5) ? 1 : -1;
    const x = alongX ? along : street + side * (WORLD.roadWidth / 2 + 1.6);
    const z = alongX ? street + side * (WORLD.roadWidth / 2 + 1.6) : along;
    if (z > WORLD.beachAt - 4) continue;
    const type = rng.pick(VEHICLE_TYPES);
    const color = type === 'taxi' ? 0xf7c948 : rng.pick(CAR_COLORS);
    const group = makeCarMesh(type, color);
    group.position.set(x, 0, z);
    group.rotation.y = alongX ? (side > 0 ? Math.PI / 2 : -Math.PI / 2) : side > 0 ? 0 : Math.PI;
    scene.add(group);
    cars.push({ x, z, angle: group.rotation.y, type, color, group, taken: false });
  }
  return {
    cars,
    nearest(x, z, maxDist) {
      let best = null;
      let bestD = maxDist;
      for (const car of cars) {
        if (car.taken) continue;
        const d = Math.hypot(car.x - x, car.z - z);
        if (d < bestD) {
          bestD = d;
          best = car;
        }
      }
      return best;
    },
  };
}
