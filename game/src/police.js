// Solmar Bay — the wanted system and the Solmar Bay Police Department.
// Wanted runs 0–5 stars: cruisers chase from 1 star, roadblocks appear at
// 3, the searchlight helicopter at 4–5. Officers get out on foot when Mara
// is on foot and the heat is on. Wanted fades when Mara stays clean and
// out of sight.
import { WORLD } from './config.js';
import { makeCarMesh } from './vehicles.js';

function makeOfficer() {
  const group = new THREE.Group();
  const navy = new THREE.MeshLambertMaterial({ color: 0x1a2a4a });
  const skin = new THREE.MeshLambertMaterial({ color: 0xe8b88a });
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.75, 0.2), navy);
  legs.position.y = 0.38;
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.62, 0.3), navy);
  torso.position.y = 1.06;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.21, 10, 8), skin);
  head.position.y = 1.58;
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.23, 0.1, 10), navy);
  cap.position.y = 1.76;
  group.add(legs, torso, head, cap);
  return group;
}

function makeHeli() {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 1.6, 5),
    new THREE.MeshLambertMaterial({ color: 0x22303e }),
  );
  body.position.y = 0;
  const tail = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.5, 4),
    new THREE.MeshLambertMaterial({ color: 0x22303e }),
  );
  tail.position.set(0, 0.2, -4);
  const rotor = new THREE.Mesh(
    new THREE.BoxGeometry(9, 0.08, 0.5),
    new THREE.MeshLambertMaterial({ color: 0x111111 }),
  );
  rotor.position.y = 1.1;
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(7, 42, 16, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.14, side: THREE.DoubleSide, depthWrite: false }),
  );
  cone.position.y = -21;
  cone.rotation.x = Math.PI;
  const lamp = new THREE.SpotLight(0xfff2b0, 5, 90, 0.32, 0.7, 1.2);
  lamp.position.set(0, -1, 0);
  group.add(body, tail, rotor, cone, lamp);
  group.userData = { rotor, lamp };
  return group;
}

export function createPolice(scene, rng, buildings, player, onShootPlayer) {
  let heliTime = 0;
  const state = { wanted: 0, cars: [], heli: null, roadblock: null };
  const officers = [];
  let decayTimer = 0;
  let roadblockTimer = 0;
  let officerTimer = 0;

  function blocked(x, z, r) {
    for (const b of buildings) {
      if (Math.abs(x - b.x) < b.w / 2 + r && Math.abs(z - b.z) < b.d / 2 + r) return true;
    }
    return false;
  }

  function spawnCruiser() {
    const angle = rng.range(0, Math.PI * 2);
    const x = player.pos.x + Math.cos(angle) * 55;
    const z = player.pos.z + Math.sin(angle) * 55;
    const group = makeCarMesh('police', 0x111111);
    group.position.set(x, 0, z);
    scene.add(group);
    const cruiser = { group, speed: 0, heading: angle, sirenPhase: rng.range(0, 6) };
    state.cars.push(cruiser);
    return cruiser;
  }

  function removeCruiser(cruiser) {
    scene.remove(cruiser.group);
    state.cars.splice(state.cars.indexOf(cruiser), 1);
  }

  function ensureHeli() {
    if (state.heli || state.wanted < 4) return;
    const heli = makeHeli();
    heli.position.set(player.pos.x + 20, 42, player.pos.z + 20);
    scene.add(heli);
    state.heli = heli;
  }
  function dropHeli() {
    if (!state.heli) return;
    scene.remove(state.heli);
    state.heli = null;
  }

  function ensureRoadblock() {
    if (state.roadblock || state.wanted < 3) return;
    const group = new THREE.Group();
    const stripe = new THREE.MeshLambertMaterial({ color: 0xff7722 });
    const white = new THREE.MeshLambertMaterial({ color: 0xf2f2f2 });
    for (let i = -1; i <= 1; i += 1) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.9, 0.3), i % 2 === 0 ? stripe : white);
      bar.position.set(i * 3.6, 0.7, 0);
      group.add(bar);
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.7, 0.3), stripe);
      leg.position.set(i * 3.6, 0.35, 0);
      group.add(leg);
    }
    const ahead = 42;
    const fx = Math.sin(player.heading);
    const fz = Math.cos(player.heading);
    group.position.set(player.pos.x + fx * ahead, 0, player.pos.z + fz * ahead);
    group.rotation.y = player.heading;
    scene.add(group);
    state.roadblock = group;
  }
  function dropRoadblock() {
    if (!state.roadblock) return;
    scene.remove(state.roadblock);
    state.roadblock = null;
  }

  function spawnOfficer() {
    const angle = rng.range(0, Math.PI * 2);
    const group = makeOfficer();
    group.position.set(player.pos.x + Math.cos(angle) * 16, 0, player.pos.z + Math.sin(angle) * 16);
    scene.add(group);
    officers.push({ group, health: 3, down: false, downTimer: 0, shootTimer: rng.range(1, 2.5), speed: 3.4 });
  }

  return {
    state,
    officers,
    setWanted(n) {
      state.wanted = Math.max(0, Math.min(5, n));
      decayTimer = 0;
      while (state.cars.length < Math.min(state.wanted, 4)) spawnCruiser();
      while (state.cars.length > Math.min(state.wanted, 4)) removeCruiser(state.cars[state.cars.length - 1]);
      if (state.wanted >= 4) ensureHeli();
      else dropHeli();
      if (state.wanted >= 3) ensureRoadblock();
      else dropRoadblock();
    },
    addWanted(n) {
      this.setWanted(state.wanted + n);
    },
    noteCrime() {
      decayTimer = 0;
    },
    update(dt) {
      // Wanted decays when Mara stays clean and no cruiser is near.
      decayTimer += dt;
      let nearestCruiser = Infinity;
      for (const c of state.cars) {
        nearestCruiser = Math.min(nearestCruiser, Math.hypot(c.group.position.x - player.pos.x, c.group.position.z - player.pos.z));
      }
      if (state.wanted > 0 && decayTimer > 25 && nearestCruiser > 55) {
        this.setWanted(state.wanted - 1);
      }
      // Cruisers chase.
      for (const c of state.cars) {
        const dx = player.pos.x - c.group.position.x;
        const dz = player.pos.z - c.group.position.z;
        const dist = Math.hypot(dx, dz) || 1;
        const want = Math.atan2(dx, dz);
        let diff = want - c.heading;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        c.heading += Math.max(-2.2 * dt, Math.min(2.2 * dt, diff));
        const target = dist > 6 ? 30 : 12;
        c.speed += (target - c.speed) * Math.min(1, dt * 1.2);
        const nx = c.group.position.x + Math.sin(c.heading) * c.speed * dt;
        const nz = c.group.position.z + Math.cos(c.heading) * c.speed * dt;
        if (!blocked(nx, c.group.position.z, 1.6)) c.group.position.x = nx;
        if (!blocked(c.group.position.x, nz, 1.6)) c.group.position.z = nz;
        c.group.rotation.y = c.heading;
        // Ram: shove Mara's car on contact, at most twice a second per cruiser.
        c.ramCooldown = Math.max(0, (c.ramCooldown || 0) - dt);
        if (dist < 3.6 && player.car && c.ramCooldown <= 0) {
          c.ramCooldown = 0.5;
          player.pos.x += Math.sin(c.heading) * 0.4;
          player.pos.z += Math.cos(c.heading) * 0.4;
        }
      }
      // Helicopter shadows the player (bob driven by accumulated game time,
      // so the shot staging is deterministic).
      if (state.heli) {
        const h = state.heli;
        heliTime += dt;
        h.position.x += (player.pos.x + 14 - h.position.x) * Math.min(1, dt * 0.7);
        h.position.z += (player.pos.z + 14 - h.position.z) * Math.min(1, dt * 0.7);
        h.position.y = 42 + Math.sin(heliTime) * 1.5;
        h.userData.rotor.rotation.y += dt * 18;
        h.userData.lamp.target.position.set(player.pos.x, 0, player.pos.z);
        h.userData.lamp.target.updateMatrixWorld();
      }
      // Roadblock follows the player's road, repositioned now and then.
      roadblockTimer += dt;
      if (state.roadblock && roadblockTimer > 9) {
        roadblockTimer = 0;
        dropRoadblock();
        ensureRoadblock();
      }
      // Officers on foot when the heat is on and Mara is on foot.
      officerTimer += dt;
      if (state.wanted >= 2 && player.car === null && officers.filter((o) => !o.down).length < 2 && officerTimer > 4) {
        officerTimer = 0;
        spawnOfficer();
      }
      for (const o of officers) {
        if (o.down) {
          o.downTimer -= dt;
          if (o.downTimer <= 0) {
            scene.remove(o.group);
            officers.splice(officers.indexOf(o), 1);
          }
          continue;
        }
        const dx = player.pos.x - o.group.position.x;
        const dz = player.pos.z - o.group.position.z;
        const dist = Math.hypot(dx, dz) || 1;
        if (dist > 9) {
          o.group.position.x += (dx / dist) * o.speed * dt;
          o.group.position.z += (dz / dist) * o.speed * dt;
        }
        o.group.rotation.y = Math.atan2(dx, dz);
        o.shootTimer -= dt;
        if (o.shootTimer <= 0 && dist < 42) {
          o.shootTimer = rng.range(1.4, 2.6);
          if (onShootPlayer) onShootPlayer(o, dist);
        }
      }
    },
  };
}
