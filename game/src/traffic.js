// Solmar Bay — traffic AI. Cars loop the perimeter of city blocks on the
// road lanes, slowing for the car ahead, so every street always has moving
// traffic in it.
import { CAR_COLORS, SPEEDS } from './config.js';
import { createCarMesh } from './vehicles.js';

export function createTraffic(THREE, scene, data, rng) {
  const cars = [];
  const loops = data.loops;

  function loopPoint(loop, seg, t) {
    const a = loop.corners[seg % 4];
    const b = loop.corners[(seg + 1) % 4];
    return {
      x: a.x + (b.x - a.x) * t,
      z: a.z + (b.z - a.z) * t,
      dx: Math.sign(b.x - a.x),
      dz: Math.sign(b.z - a.z),
    };
  }

  for (let i = 0; i < 24; i += 1) {
    const loop = rng.pick(loops);
    const seg = rng.int(0, 3);
    const t = rng.next();
    const p = loopPoint(loop, seg, t);
    const type = rng.int(0, 5);
    const mesh = createCarMesh(THREE, type, rng.pick(CAR_COLORS));
    // Right-hand lane offset: 3 m to the right of the travel direction.
    const ox = p.dz * 3;
    const oz = -p.dx * 3;
    mesh.position.set(p.x + ox, 0, p.z + oz);
    scene.add(mesh);
    cars.push({
      mesh,
      pos: mesh.position,
      loop,
      seg,
      t,
      speed: rng.range(SPEEDS.trafficMin, SPEEDS.trafficMax),
      baseSpeed: rng.range(SPEEDS.trafficMin, SPEEDS.trafficMax),
      heading: Math.atan2(p.dx, p.dz),
      type,
    });
  }

  return {
    cars,
    update(dt) {
      for (const c of cars) {
        // Slow for the car ahead on the same stretch.
        let target = c.baseSpeed;
        for (const o of cars) {
          if (o === c) continue;
          const dx = o.pos.x - c.pos.x;
          const dz = o.pos.z - c.pos.z;
          const d = Math.hypot(dx, dz);
          if (d < 9 && d > 0.01) {
            const ahead = (dx * Math.sin(c.heading) + dz * Math.cos(c.heading)) / d;
            if (ahead > 0.7) target = Math.min(target, 3);
          }
        }
        c.speed += (target - c.speed) * Math.min(1, dt * 2);
        const a = c.loop.corners[c.seg % 4];
        const b = loopPoint(c.loop, c.seg, 1);
        const segLen = Math.hypot(b.x - a.x, b.z - a.z);
        c.t += (c.speed * dt) / segLen;
        if (c.t >= 1) {
          c.t -= 1;
          c.seg = (c.seg + 1) % 4;
        }
        const p = loopPoint(c.loop, c.seg, c.t);
        const ox = p.dz * 3;
        const oz = -p.dx * 3;
        c.pos.x = p.x + ox;
        c.pos.z = p.z + oz;
        c.heading = Math.atan2(p.dx, p.dz);
        c.mesh.position.copy(c.pos);
        c.mesh.rotation.y = c.heading;
        const spin = (c.speed * dt) / 0.34;
        for (const w of c.mesh.userData.wheels) w.rotation.y += spin;
      }
    },
    // Move a few cars near a point (used to stage dense screenshots).
    gather(x, z, n, rng2) {
      const sorted = [...cars].sort((p, q) => {
        const dp = Math.hypot(p.pos.x - x, p.pos.z - z);
        const dq = Math.hypot(q.pos.x - x, q.pos.z - z);
        return dp - dq;
      });
      for (let i = 0; i < Math.min(n, sorted.length); i += 1) {
        const c = sorted[i];
        const ang = rng2 ? rng2.range(0, Math.PI * 2) : (i / n) * Math.PI * 2;
        const rr = 14 + (i % 4) * 9;
        const nx = x + Math.cos(ang) * rr;
        const nz = z + Math.sin(ang) * rr;
        // Snap onto the nearest road line so the car sits on asphalt.
        const line = data.roadLines.reduce((best, l) => (Math.abs(l - nx) < Math.abs(best - nx) ? l : best), data.roadLines[0]);
        c.pos.x = line + 3;
        c.pos.z = nz;
        c.heading = Math.PI / 2;
        c.mesh.position.copy(c.pos);
        c.mesh.rotation.y = c.heading;
      }
    },
  };
}
