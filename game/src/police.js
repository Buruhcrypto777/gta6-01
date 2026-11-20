// Solmar Bay — the law: the wanted level, police cruisers that chase and ram,
// striped roadblocks from 3 stars, and the searchlight helicopter from 4.
// Getting busted costs cash and the chase; losing the cops clears the stars.
const THREE = window.THREE;
import { CFG } from './config.js';
import { mulberry32, range, pick } from './random.js';
import { makeCarMesh, makeHelicopterMesh, updateCarVisual } from './vehicles.js';

function makeRoadblockMesh() {
  const g = new THREE.Group();
  const stripeTex = (() => {
    const c = document.createElement('canvas'); c.width = 128; c.height = 32;
    const x = c.getContext('2d');
    for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#f2f2f2' : '#e03a2f'; x.fillRect(i * 16, 0, 16, 32); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const bar = new THREE.Mesh(new THREE.BoxGeometry(9, 1.1, 0.5), new THREE.MeshStandardMaterial({ map: stripeTex, roughness: 0.6 }));
  bar.position.y = 1.1; bar.castShadow = true;
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.1, 1.6), new THREE.MeshStandardMaterial({ color: 0x333333 }));
  legL.position.set(-4, 0.55, 0);
  const legR = legL.clone(); legR.position.x = 4;
  g.add(bar, legL, legR);
  return g;
}

export function createPolice(G) {
  const rng = mulberry32(CFG.seed + 55);
  const group = new THREE.Group();
  G.scene.add(group);
  const state = {
    wanted: 0, lastCrime: -999, bustTimer: 0,
    cars: [], heli: null, heliActive: false, roadblocks: [],
  };

  function spawnCruiser() {
    const mesh = makeCarMesh('police', CFG.palette.police);
    const a = rng() * Math.PI * 2;
    const d = CFG.police.spawnDist + rng() * 40;
    const car = {
      mesh, x: G.player.pos.x + Math.cos(a) * d, z: G.player.pos.z + Math.sin(a) * d,
      heading: 0, speed: 0, siren: true,
    };
    car.x = THREE.MathUtils.clamp(car.x, CFG.beachEdge, CFG.gridMax);
    car.z = THREE.MathUtils.clamp(car.z, CFG.gridMin, CFG.marinaEdge - 40);
    mesh.position.set(car.x, 0, car.z);
    group.add(mesh); state.cars.push(car);
    return car;
  }

  function spawnHeli() {
    if (state.heli) return;
    const mesh = makeHelicopterMesh();
    const t = G.player.car || G.player;
    const tx = t.x ?? t.pos.x, tz = t.z ?? t.pos.z;
    state.heli = { mesh, x: tx + 40, z: tz - 50, y: 40, heading: 0 };
    mesh.position.set(state.heli.x, 40, state.heli.z);
    group.add(mesh);
    state.heliActive = true;
  }

  function dropHeli() {
    if (!state.heli) return;
    group.remove(state.heli.mesh); state.heli = null; state.heliActive = false;
  }

  function spawnRoadblock() {
    const p = G.world.randomRoadPoint();
    const mesh = makeRoadblockMesh();
    mesh.position.set(p.x, 0, p.z);
    mesh.rotation.y = rng() * Math.PI;
    group.add(mesh);
    state.roadblocks.push({ mesh, x: p.x, z: p.z });
    if (state.roadblocks.length > 3) {
      const old = state.roadblocks.shift();
      group.remove(old.mesh);
    }
  }

  function wantedCount() {
    return state.wanted === 0 ? 0 : Math.min(CFG.police.maxActive, 1 + state.wanted);
  }

  return {
    state,
    addWanted(n, why) {
      if (state.wanted >= 5) return;
      state.wanted = Math.min(5, state.wanted + n);
      state.lastCrime = G.time;
      G.hud.setWanted(state.wanted);
      if (why) G.hud.toast(`Wanted level ${state.wanted} — ${why}`);
      if (state.wanted >= CFG.police.roadblockAt && state.roadblocks.length < state.wanted - 2) spawnRoadblock();
      if (state.wanted >= CFG.police.heliAt) spawnHeli();
    },
    setWanted(n) {
      state.wanted = n; state.lastCrime = G.time;
      G.hud.setWanted(n);
      if (n >= CFG.police.heliAt) spawnHeli(); else dropHeli();
    },
    clear() {
      state.wanted = 0; state.lastCrime = G.time; state.bustTimer = 0;
      G.hud.setWanted(0);
      dropHeli();
      for (const c of state.cars) group.remove(c.mesh);
      state.cars = [];
      for (const r of state.roadblocks) group.remove(r.mesh);
      state.roadblocks = [];
    },
    update(dt, time) {
      const P = G.player;
      // Decay when quiet and unseen.
      if (state.wanted > 0 && time - state.lastCrime > CFG.wanted.decayDelay) {
        let near = false;
        for (const c of state.cars) if (Math.hypot(c.x - P.pos.x, c.z - P.pos.z) < 70) near = true;
        if (!near && Math.floor((time - state.lastCrime) / CFG.wanted.decayEvery) > Math.floor((time - dt - state.lastCrime) / CFG.wanted.decayEvery)) {
          state.wanted = Math.max(0, state.wanted - 1);
          G.hud.setWanted(state.wanted);
          if (state.wanted < CFG.police.heliAt) dropHeli();
          if (state.wanted === 0) this.clear();
        }
      }
      // Keep the right number of cruisers.
      const want = wantedCount();
      while (state.cars.length < want) spawnCruiser();
      while (state.cars.length > want) { const c = state.cars.pop(); group.remove(c.mesh); }
      const target = P.car || P;
      const tx = target.x ?? target.pos.x, tz = target.z ?? target.pos.z;
      for (const c of state.cars) {
        const dx = tx - c.x, dz = tz - c.z;
        const d = Math.hypot(dx, dz);
        const wantHeading = Math.atan2(-dx, -dz);
        let dh = wantHeading - c.heading;
        while (dh > Math.PI) dh -= Math.PI * 2;
        while (dh < -Math.PI) dh += Math.PI * 2;
        c.heading += THREE.MathUtils.clamp(dh, -2.4 * dt, 2.4 * dt);
        const cruise = d > 26 ? CFG.police.ramSpeed : CFG.police.baseSpeed;
        c.speed += THREE.MathUtils.clamp(cruise - c.speed, -30 * dt, 22 * dt);
        c.x += -Math.sin(c.heading) * c.speed * dt;
        c.z += -Math.cos(c.heading) * c.speed * dt;
        G.world.resolveBuilding(c, 2.4);
        // Ram the player.
        if (d < 5.2) {
          if (P.car) {
            P.car.speed *= 0.82;
            const push = 5.2 - d;
            P.car.x += (dx / (d || 1)) * push * 0.4; P.car.z += (dz / (d || 1)) * push * 0.4;
            if (Math.random() < dt * 8) G.particles.sparks(P.car.x, 1, P.car.z);
            G.audio.thud();
          } else {
            state.bustTimer += dt;
            if (state.bustTimer > 1.2) { G.busted(); return; }
          }
        } else if (!P.car) {
          state.bustTimer = Math.max(0, state.bustTimer - dt);
        }
        c.mesh.position.set(c.x, 0, c.z);
        c.mesh.rotation.y = c.heading;
        updateCarVisual(c.mesh, THREE.MathUtils.clamp(dh, -0.5, 0.5), c.speed, dt, time);
        if (Math.abs(c.speed) > 20 && Math.random() < dt * 0.5) G.particles.dust(c.x, 0.3, c.z);
      }
      // Helicopter: hover ahead of the player and above the rooftops, spotlight on them.
      if (state.heli) {
        const h = state.heli;
        const hx = tx + 18, hz = tz - 65;
        h.x += (hx - h.x) * Math.min(1, dt * 2.0);
        h.z += (hz - h.z) * Math.min(1, dt * 2.0);
        h.y = 26 + Math.sin(time * 0.8) * 2;
        h.mesh.position.set(h.x, h.y, h.z);
        h.mesh.rotation.y = Math.atan2(-(tx - h.x), -(tz - h.z));
        h.mesh.userData.rotor.rotation.y += dt * 28;
        h.mesh.userData.tailRotor.rotation.x += dt * 30;
        h.mesh.getObjectByName('beam').lookAt(tx, 0, tz);
      }
      // Busted while sitting still in a car.
      if (P.car && Math.abs(P.car.speed) < 1.5 && state.cars.length > 0) {
        const near = state.cars.some((c) => Math.hypot(c.x - P.car.x, c.z - P.car.z) < 8);
        if (near) {
          state.bustTimer += dt;
          if (state.bustTimer > CFG.police.bustTime) { G.busted(); return; }
        } else state.bustTimer = Math.max(0, state.bustTimer - dt);
      }
    },
  };
}
