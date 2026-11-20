// Solmar Bay — pedestrians: walkers on the sidewalks who stroll, chat in
// place, and run away from speeding cars and police. They make the streets
// feel lived in — and they are the reason a wanted level exists.
const THREE = window.THREE;
import { CFG } from './config.js';
import { mulberry32, range, pick, chance } from './random.js';
import { ROAD_LINES, onRoad, nearestRoadPoint } from './world.js';

const SHIRTS = [0xd94f3d, 0x3d7bd9, 0xe8c33d, 0x3dd9a0, 0xd97bb0, 0x7a5fd9, 0xf2f2f2, 0x2c2c34];
const PANTS = [0x2c3a4a, 0x4a3a2c, 0x3a4a3a, 0x555555];

function makePedMesh(shirt, pants, skin) {
  const g = new THREE.Group();
  const sm = new THREE.MeshLambertMaterial({ color: shirt });
  const pm = new THREE.MeshLambertMaterial({ color: pants });
  const km = new THREE.MeshLambertMaterial({ color: skin });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.78, 0.34), sm);
  torso.position.y = 1.15; torso.castShadow = true;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 8), km);
  head.position.y = 1.78; head.castShadow = true;
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.72, 0.22), pm);
  legL.position.set(-0.16, 0.36, 0); legL.name = 'legL';
  const legR = legL.clone(); legR.position.x = 0.16; legR.name = 'legR';
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.6, 0.16), sm);
  armL.position.set(-0.42, 1.2, 0); armL.name = 'armL';
  const armR = armL.clone(); armR.position.x = 0.42; armR.name = 'armR';
  g.add(torso, head, legL, legR, armL, armR);
  g.userData = { legL, legR, armL, armR };
  return g;
}

export function createPedestrians(G) {
  const rng = mulberry32(CFG.seed + 77);
  const peds = [];
  const group = new THREE.Group();
  G.scene.add(group);

  function spawnPed(x, z) {
    const mesh = makePedMesh(pick(rng, SHIRTS), pick(rng, PANTS), pick(rng, [0xe8b88a, 0xc98a5e, 0x8a5a3a, 0xf2c9a0]));
    const p = {
      mesh, x, z, heading: rng() * Math.PI * 2,
      speed: range(rng, CFG.peds.walk * 0.7, CFG.peds.walk * 1.3),
      state: 'walk', target: null, panic: 0, phase: rng() * 6,
    };
    mesh.position.set(x, 0, z); mesh.rotation.y = p.heading;
    group.add(mesh); peds.push(p);
    return p;
  }

  for (let i = 0; i < CFG.peds.count; i++) {
    const rp = G.world.randomRoadPoint();
    const p = nearestRoadPoint(rp.x + range(rng, -14, 14), rp.z + range(rng, -14, 14));
    spawnPed(p.x, p.z);
  }

  function pickTarget(p) {
    const rp = G.world.randomRoadPoint();
    const q = nearestRoadPoint(rp.x + range(rng, -16, 16), rp.z + range(rng, -16, 16));
    p.target = q;
  }

  return {
    peds,
    nearest(x, z, r) {
      let best = null, bd = r;
      for (const p of peds) {
        const d = Math.hypot(p.x - x, p.z - z);
        if (d < bd) { bd = d; best = p; }
      }
      return best;
    },
    fleeFrom(x, z, r) {
      for (const p of peds) {
        if (Math.hypot(p.x - x, p.z - z) < r) { p.state = 'run'; p.panic = 3; }
      }
    },
    update(dt, time) {
      for (const p of peds) {
        if (p.panic > 0) p.panic -= dt;
        if (p.panic <= 0 && p.state === 'run') p.state = 'walk';
        // Flee a fast car nearby.
        const danger = G.player && G.player.car ? G.player.car : null;
        if (danger && Math.abs(danger.speed) > 12 && Math.hypot(danger.x - p.x, danger.z - p.z) < 12) {
          p.state = 'run'; p.panic = 2.5;
        }
        const speed = p.state === 'run' ? CFG.peds.run : p.speed;
        if (!p.target) pickTarget(p);
        const dx = p.target.x - p.x, dz = p.target.z - p.z;
        const d = Math.hypot(dx, dz);
        if (d < 2) { pickTarget(p); if (chance(rng, 0.3)) p.state = 'idle'; }
        else {
          const want = Math.atan2(-dx, -dz);
          let dh = want - p.heading;
          while (dh > Math.PI) dh -= Math.PI * 2;
          while (dh < -Math.PI) dh += Math.PI * 2;
          p.heading += THREE.MathUtils.clamp(dh, -3.2 * dt, 3.2 * dt);
          p.x += -Math.sin(p.heading) * speed * dt;
          p.z += -Math.cos(p.heading) * speed * dt;
          // Stay on walkable ground: out of buildings and water.
          if (G.world.pointInBuilding(p.x, p.z, 0.8)) { p.x -= -Math.sin(p.heading) * speed * dt; p.z -= -Math.cos(p.heading) * speed * dt; pickTarget(p); }
          if (p.x < CFG.oceanEdge + 2) p.x = CFG.oceanEdge + 2;
        }
        if (p.state === 'idle') { p.target = null; if (chance(rng, dt * 0.2)) p.state = 'walk'; }
        p.mesh.position.set(p.x, 0, p.z);
        p.mesh.rotation.y = p.heading;
        // Walk cycle: legs and arms swing.
        const sw = Math.sin(time * (p.state === 'run' ? 11 : 6) + p.phase) * (p.state === 'idle' ? 0 : 0.55);
        const u = p.mesh.userData;
        u.legL.rotation.x = sw; u.legR.rotation.x = -sw;
        u.armL.rotation.x = -sw * 0.7; u.armR.rotation.x = sw * 0.7;
      }
    },
  };
}
