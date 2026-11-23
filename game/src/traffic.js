// Solmar Bay — traffic AI: cars that drive the street grid.
// Each car follows a street, turns at intersections sometimes, and brakes
// for the car ahead, so the streets always feel busy without any scripting.
import { CAR_COLORS, VEHICLE_TYPES, WORLD } from './config.js';
import { makeCarMesh } from './vehicles.js';

export function createTraffic(scene, rng) {
  const cars = [];
  const streets = [];
  for (let k = -4; k <= 4; k += 1) streets.push(k * WORLD.roadEvery);

  function spawn(i) {
    const alongX = rng.chance(0.5);
    const street = rng.pick(streets);
    const type = rng.pick(VEHICLE_TYPES);
    const color = type === 'taxi' ? 0xf7c948 : rng.pick(CAR_COLORS);
    const group = makeCarMesh(type, color);
    scene.add(group);
    return {
      group,
      type,
      alongX,
      coord: street,
      pos: rng.range(-200, 200),
      dir: rng.chance(0.5) ? 1 : -1,
      speed: rng.range(8, 14),
      cruise: rng.range(8, 14),
    };
  }

  for (let i = 0; i < 26; i += 1) cars.push(spawn(i));

  function place(car) {
    const lane = car.dir * 3;
    if (car.alongX) {
      car.group.position.set(car.pos, 0, car.coord + lane);
      car.group.rotation.y = car.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    } else {
      car.group.position.set(car.coord + lane, 0, car.pos);
      car.group.rotation.y = car.dir > 0 ? 0 : Math.PI;
    }
  }
  for (const car of cars) place(car);

  return {
    cars,
    update(dt) {
      for (const car of cars) {
        // Brake for a car ahead in the same lane.
        let target = car.cruise;
        for (const other of cars) {
          if (other === car || other.alongX !== car.alongX || other.coord !== car.coord || other.dir !== car.dir) continue;
          const gap = (other.pos - car.pos) * car.dir;
          if (gap > 0 && gap < 10) target = Math.min(target, Math.max(0, (gap - 6) * 1.5));
        }
        car.speed += (target - car.speed) * Math.min(1, dt * 2);
        car.pos += car.dir * car.speed * dt;
        // Wrap around the far edge.
        if (car.pos > 205) car.pos = -205;
        if (car.pos < -205) car.pos = 205;
        // Sometimes turn at an intersection.
        const nearCross = Math.abs(((car.pos % WORLD.roadEvery) + WORLD.roadEvery) % WORLD.roadEvery) < car.speed * dt + 0.4;
        if (nearCross && rng.chance(0.09)) {
          const cross = Math.round(car.pos / WORLD.roadEvery) * WORLD.roadEvery;
          const oldCoord = car.coord;
          car.coord = Math.max(-176, Math.min(176, cross));
          car.pos = oldCoord;
          car.alongX = !car.alongX;
          car.dir = rng.chance(0.5) ? 1 : -1;
        }
        place(car);
      }
    },
  };
}
