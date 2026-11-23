// Solmar Bay — pedestrians wandering the sidewalks. They stroll between
// random curb points, bob as they walk, and run when a gunshot or a speeding
// car comes too close.
import { SHIRT_COLORS, SKIN_COLORS, SPEEDS, WORLD } from './config.js';

export function createPeds(THREE, scene, data, rng) {
  const peds = [];

  function randomSidewalkPoint() {
    const line = rng.pick(data.roadLines);
    const along = rng.range(-WORLD.half + 10, WORLD.half - 10);
    const side = rng.chance(0.5) ? 1 : -1;
    if (rng.chance(0.5)) return { x: line + side * 8.2, z: along };
    return { x: along, z: line + side * 8.2 };
  }

  function makePed() {
    const group = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.95, 0.32),
      new THREE.MeshLambertMaterial({ color: rng.pick(SHIRT_COLORS) }),
    );
    body.position.y = 0.95;
    group.add(body);
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.23, 10, 8),
      new THREE.MeshLambertMaterial({ color: rng.pick(SKIN_COLORS) }),
    );
    head.position.y = 1.62;
    group.add(head);
    const target = randomSidewalkPoint();
    group.position.set(target.x + rng.range(-6, 6), 0, target.z + rng.range(-6, 6));
    scene.add(group);
    return {
      mesh: group,
      pos: group.position,
      target,
      speed: rng.range(SPEEDS.pedMin, SPEEDS.pedMax),
      heading: rng.range(0, Math.PI * 2),
      state: 'walk',
      timer: 0,
      bob: rng.range(0, 6),
    };
  }

  for (let i = 0; i < 40; i += 1) peds.push(makePed());

  return {
    peds,
    update(dt, danger) {
      for (const p of peds) {
        p.bob += dt * 7;
        if (p.state === 'down') {
          p.timer -= dt;
          p.mesh.rotation.x = -Math.PI / 2 + 0.2;
          if (p.timer <= 0) {
            p.state = 'walk';
            p.mesh.rotation.x = 0;
          }
          continue;
        }
        let tx = p.target.x;
        let tz = p.target.z;
        let speed = p.speed;
        if (p.state === 'flee') {
          p.timer -= dt;
          speed = SPEEDS.flee;
          if (p.timer <= 0) p.state = 'walk';
        } else if (danger) {
          const d = Math.hypot(p.pos.x - danger.x, p.pos.z - danger.z);
          if (d < 8) {
            p.state = 'flee';
            p.timer = 3;
            tx = p.pos.x + (p.pos.x - danger.x);
            tz = p.pos.z + (p.pos.z - danger.z);
          }
        }
        const dx = tx - p.pos.x;
        const dz = tz - p.pos.z;
        const d = Math.hypot(dx, dz);
        if (d < 1.2) {
          if (p.state !== 'flee') p.target = randomSidewalkPoint();
          continue;
        }
        const step = Math.min(d, speed * dt);
        p.pos.x += (dx / d) * step;
        p.pos.z += (dz / d) * step;
        p.heading = Math.atan2(dx, dz);
        p.mesh.rotation.y = p.heading;
        p.mesh.position.y = Math.abs(Math.sin(p.bob)) * 0.06;
      }
    },
    knockDown(ped) {
      ped.state = 'down';
      ped.timer = 3;
    },
    // Bring several pedestrians near a point (dense screenshot staging).
    gather(x, z, n, rng2) {
      const sorted = [...peds].sort((a, b) => {
        const da = Math.hypot(a.pos.x - x, a.pos.z - z);
        const db = Math.hypot(b.pos.x - x, b.pos.z - z);
        return da - db;
      });
      for (let i = 0; i < Math.min(n, sorted.length); i += 1) {
        const p = sorted[i];
        const ang = rng2 ? rng2.range(0, Math.PI * 2) : (i / n) * Math.PI * 2;
        const rr = 6 + (i % 5) * 4;
        p.pos.x = x + Math.cos(ang) * rr;
        p.pos.z = z + Math.sin(ang) * rr;
        p.target = { x: p.pos.x + Math.cos(ang + 1) * 10, z: p.pos.z + Math.sin(ang + 1) * 10 };
        p.state = 'walk';
        p.mesh.rotation.x = 0;
      }
    },
  };
}
