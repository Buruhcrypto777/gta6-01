// Solmar Bay — parked cars waiting to be stolen. They sit at curb spots from
// the world data; stealing one removes it, and fresh cars slowly arrive.
import { CAR_COLORS } from './config.js';
import { createCarMesh, VEHICLE_TYPES } from './vehicles.js';

export function createParked(THREE, scene, data, rng) {
  const spots = [...data.parkedSpots];
  const cars = [];
  let respawnTimer = 0;

  function spawnAt(spot) {
    const type = rng.int(0, 5);
    const mesh = createCarMesh(THREE, type, rng.pick(CAR_COLORS));
    mesh.position.set(spot.x, 0, spot.z);
    mesh.rotation.y = spot.angle;
    scene.add(mesh);
    const car = {
      mesh,
      x: spot.x,
      z: spot.z,
      type: VEHICLE_TYPES[type],
      taken: false,
      heading: spot.angle,
      pos: mesh.position,
      speed: 0,
    };
    cars.push(car);
    return car;
  }

  for (let i = 0; i < 16 && spots.length > 0; i += 1) {
    const spot = spots.splice(rng.int(0, spots.length - 1), 1)[0];
    spawnAt(spot);
  }

  return {
    cars,
    nearest(x, z, maxD) {
      let best = null;
      let bestD = maxD;
      for (const c of cars) {
        if (c.taken) continue;
        const d = Math.hypot(c.x - x, c.z - z);
        if (d < bestD) {
          bestD = d;
          best = c;
        }
      }
      return best;
    },
    remove(car) {
      car.taken = true;
      scene.remove(car.mesh);
      const i = cars.indexOf(car);
      if (i >= 0) cars.splice(i, 1);
    },
    update(dt) {
      respawnTimer += dt;
      if (respawnTimer > 18 && cars.length < 16 && spots.length > 0) {
        respawnTimer = 0;
        const spot = spots.splice(rng.int(0, spots.length - 1), 1)[0];
        spawnAt(spot);
      }
    },
  };
}
