// Solmar Bay — traffic: civilian cars that cruise the road grid, turn at
// intersections, slow for the car ahead and stop for pile-ups. They are the
// city's moving furniture and the cars the player steals.
const THREE = window.THREE;
import { CFG } from './config.js';
import { mulberry32, range, int, pick, chance } from './random.js';
import { TRAFFIC_LINES } from './world.js';
import { makeCarMesh, updateCarVisual } from './vehicles.js';

const TYPES = ['sedan', 'sedan', 'taxi', 'sports', 'van', 'truck', 'sedan'];

export function createTraffic(G) {
  const rng = mulberry32(CFG.seed + 31);
  const cars = [];
  const group = new THREE.Group();
  G.scene.add(group);

  function spawnCar(farFromPlayer) {
    const type = pick(rng, TYPES);
    const color = type === 'taxi' ? CFG.palette.taxi : pick(rng, CFG.palette.car);
    const mesh = makeCarMesh(type, color);
    const vertical = chance(rng, 0.5);
    const line = pick(rng, TRAFFIC_LINES);
    const lane = (rng() < 0.5 ? -1 : 1) * 6.5;
    const t = vertical
      ? range(rng, CFG.gridMin + 60, CFG.marinaEdge - 60)
      : range(rng, CFG.beachEdge + 60, CFG.gridMax - 60);
    const heading = vertical ? (lane < 0 ? Math.PI : 0) : (lane < 0 ? -Math.PI / 2 : Math.PI / 2);
    const car = {
      mesh, type, vertical, line, lane,
      x: vertical ? line + lane : t, z: vertical ? t : line + lane,
      heading, speed: range(rng, CFG.traffic.minSpeed, CFG.traffic.maxSpeed),
      targetSpeed: range(rng, CFG.traffic.minSpeed, CFG.traffic.maxSpeed),
      turnAt: null, stuck: 0,
    };
    mesh.position.set(car.x, 0, car.z); mesh.rotation.y = car.heading;
    group.add(mesh); cars.push(car);
    return car;
  }

  for (let i = 0; i < CFG.traffic.count; i++) spawnCar();

  function carAhead(c, dist) {
    for (const o of cars) {
      if (o === c) continue;
      const dx = o.x - c.x, dz = o.z - c.z;
      const d = Math.hypot(dx, dz);
      if (d > dist) continue;
      const fx = -Math.sin(c.heading), fz = -Math.cos(c.heading);
      if (dx * fx + dz * fz > 0) return o;
    }
    if (G.player && G.player.car) {
      const p = G.player.car;
      const dx = p.x - c.x, dz = p.z - c.z;
      if (Math.hypot(dx, dz) < dist) {
        const fx = -Math.sin(c.heading), fz = -Math.cos(c.heading);
        if (dx * fx + dz * fz > 0) return p;
      }
    }
    return null;
  }

  function turnIfNeeded(c, dt) {
    // At an intersection, sometimes turn onto the crossing road.
    const nearLine = TRAFFIC_LINES.find((l) => Math.abs((c.vertical ? c.z : c.x) - l) < 4);
    if (nearLine === undefined || c.turnAt === nearLine) return;
    c.turnAt = nearLine;
    if (chance(rng, 0.4)) {
      const turnLeft = chance(rng, 0.5);
      if (c.vertical) {
        const newLine = nearLine;
        c.vertical = false; c.line = newLine;
        c.lane = (turnLeft ? -1 : 1) * 6.5;
        c.z = newLine + c.lane;
        c.heading = turnLeft ? Math.PI / 2 : -Math.PI / 2;
        c.x = THREE.MathUtils.clamp(c.x, CFG.gridMin, CFG.gridMax);
      } else {
        c.vertical = true; c.line = nearLine;
        c.lane = (turnLeft ? -1 : 1) * 6.5;
        c.x = nearLine + c.lane;
        c.heading = turnLeft ? 0 : Math.PI;
        c.z = THREE.MathUtils.clamp(c.z, CFG.gridMin, CFG.gridMax);
      }
    }
  }

  return {
    cars,
    spawnCar,
    nearest(x, z, r) {
      let best = null, bd = r;
      for (const c of cars) {
        const d = Math.hypot(c.x - x, c.z - z);
        if (d < bd) { bd = d; best = c; }
      }
      return best;
    },
    removeCar(car) {
      group.remove(car.mesh);
      const i = cars.indexOf(car); if (i >= 0) cars.splice(i, 1);
    },
    update(dt, time) {
      for (const c of cars) {
        // Keep out of the sea and the beach.
        if (c.x < CFG.beachEdge + 8) { c.x = CFG.beachEdge + 8; c.heading = Math.PI / 2; c.vertical = false; c.line = c.z; }
        const ahead = carAhead(c, 14);
        const want = ahead ? 0 : c.targetSpeed;
        c.speed += THREE.MathUtils.clamp(want - c.speed, -18 * dt, 8 * dt);
        if (c.speed < 0.1 && ahead) c.stuck += dt; else c.stuck = 0;
        if (c.stuck > 6) { // nudge around a jam
          c.speed = 4; c.stuck = 0;
          if (c.vertical) c.x += (rng() < 0.5 ? -1 : 1) * 3; else c.z += (rng() < 0.5 ? -1 : 1) * 3;
        }
        const fx = -Math.sin(c.heading), fz = -Math.cos(c.heading);
        c.x += fx * c.speed * dt; c.z += fz * c.speed * dt;
        // Wrap around the land edges (never into the sea).
        if (c.vertical) {
          if (c.z > CFG.marinaEdge - 40) c.z = CFG.gridMin - 40;
          if (c.z < CFG.gridMin - 40) c.z = CFG.marinaEdge - 40;
        } else {
          if (c.x > CFG.gridMax + 40) c.x = CFG.beachEdge + 40;
          if (c.x < CFG.beachEdge + 40) c.x = CFG.gridMax + 40;
        }
        turnIfNeeded(c, dt);
        c.mesh.position.set(c.x, 0, c.z);
        c.mesh.rotation.y = c.heading;
        updateCarVisual(c.mesh, 0, c.speed, dt, time);
        if (Math.abs(c.speed) > 14 && Math.random() < dt * 0.4) G.particles.dust(c.x, 0.3, c.z);
      }
      // Keep the count topped up.
      if (cars.length < CFG.traffic.count && Math.random() < dt * 0.2) spawnCar();
    },
  };
}
