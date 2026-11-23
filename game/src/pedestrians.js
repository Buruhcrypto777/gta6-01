// Solmar Bay — pedestrians: forty locals walking the sidewalks.
// They stroll the street grid, turn at intersections, bob as they walk, and
// scatter when a car comes at them. Knocked-down peds get up later, far away.
import { WORLD } from './config.js';

const SHIRTS = [0xe74c3c, 0x3498db, 0x2ecc71, 0xf39c12, 0x9b59b6, 0x1abc9c, 0xecf0f1, 0xfd79a8, 0x6c5ce7, 0x00b894];

function makePerson(rng) {
  const group = new THREE.Group();
  const shirt = new THREE.MeshLambertMaterial({ color: rng.pick(SHIRTS) });
  const skin = new THREE.MeshLambertMaterial({ color: [0xe8b88a, 0xc98d64, 0x8a5a3b, 0xf0c8a0][Math.floor(rng.next() * 4)] });
  const legs = new THREE.Mesh(
    new THREE.BoxGeometry(0.34, 0.75, 0.2),
    new THREE.MeshLambertMaterial({ color: rng.chance(0.5) ? 0x2c3e50 : 0x5d4037 }),
  );
  legs.position.y = 0.38;
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.62, 0.3), shirt);
  torso.position.y = 1.06;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.21, 10, 8), skin);
  head.position.y = 1.58;
  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshLambertMaterial({ color: [0x1a1a1a, 0x6a4a2a, 0xd8d8d8, 0x3a2a1a][Math.floor(rng.next() * 4)] }),
  );
  hair.position.y = 1.6;
  group.add(legs, torso, head, hair);
  group.userData.torso = torso;
  return group;
}

export function createPeds(scene, rng) {
  const peds = [];
  const streets = [];
  for (let k = -4; k <= 4; k += 1) streets.push(k * WORLD.roadEvery);

  function spawnSpot() {
    const alongX = rng.chance(0.5);
    const street = rng.pick(streets);
    const side = rng.chance(0.5) ? 1 : -1;
    return {
      alongX,
      coord: street + side * (WORLD.roadWidth / 2 + 3),
      pos: rng.range(-200, 160),
      dir: rng.chance(0.5) ? 1 : -1,
    };
  }

  for (let i = 0; i < 40; i += 1) {
    const spot = spawnSpot();
    const group = makePerson(rng);
    group.position.set(spot.alongX ? spot.pos : spot.coord, 0, spot.alongX ? spot.coord : spot.pos);
    scene.add(group);
    peds.push({
      group,
      ...spot,
      speed: rng.range(0.9, 1.7),
      phase: rng.range(0, Math.PI * 2),
      down: false,
      downTimer: 0,
      walkTime: rng.range(0, 10),
    });
  }

  function place(ped) {
    if (ped.alongX) {
      ped.group.position.set(ped.pos, 0, ped.coord);
      ped.group.rotation.y = ped.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    } else {
      ped.group.position.set(ped.coord, 0, ped.pos);
      ped.group.rotation.y = ped.dir > 0 ? 0 : Math.PI;
    }
  }

  return {
    peds,
    update(dt) {
      for (const ped of peds) {
        if (ped.down) {
          ped.downTimer -= dt;
          if (ped.downTimer <= 0) {
            const spot = spawnSpot();
            Object.assign(ped, spot, { down: false, speed: rng.range(1, 1.7) });
            ped.group.rotation.set(0, 0, 0);
            ped.group.visible = true;
          }
          continue;
        }
        ped.walkTime += dt;
        ped.pos += ped.dir * ped.speed * dt;
        if (ped.pos > 205) ped.pos = -205;
        if (ped.pos < -205) ped.pos = 205;
        const nearCross = Math.abs(((ped.pos % WORLD.roadEvery) + WORLD.roadEvery) % WORLD.roadEvery) < ped.speed * dt + 0.4;
        if (nearCross && rng.chance(0.05)) {
          const cross = Math.round(ped.pos / WORLD.roadEvery) * WORLD.roadEvery;
          const oldCoord = ped.coord;
          ped.coord = cross + (ped.dir > 0 ? 1 : -1) * (WORLD.roadWidth / 2 + 3) * (rng.chance(0.5) ? 1 : -1);
          ped.pos = oldCoord;
          ped.alongX = !ped.alongX;
          ped.dir = rng.chance(0.5) ? 1 : -1;
        }
        place(ped);
        ped.group.position.y = Math.abs(Math.sin(ped.walkTime * 7 + ped.phase)) * 0.06;
      }
    },
    knockDown(ped) {
      if (ped.down) return;
      ped.down = true;
      ped.downTimer = 14;
      ped.group.rotation.z = Math.PI / 2;
      ped.group.position.y = 0.25;
    },
    nearest(x, z, maxDist) {
      let best = null;
      let bestD = maxDist;
      for (const ped of peds) {
        if (ped.down) continue;
        const d = Math.hypot(ped.group.position.x - x, ped.group.position.z - z);
        if (d < bestD) {
          bestD = d;
          best = ped;
        }
      }
      return best;
    },
  };
}
