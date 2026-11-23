// Solmar Bay — wanted level, police chases, roadblocks and the helicopter.
// Cruisers spawn to match the star count, ram the player's car, and bust
// Mara on foot if they catch her; roadblocks appear at 3 stars, the
// searchlight helicopter at 4–5. Heat fades when the law loses sight of her.
import { WANTED_MAX } from './config.js';
import { createCarMesh } from './vehicles.js';

export function createPolice(THREE, scene, rng) {
  const state = { wanted: 0, cars: [], heli: null, roadblocks: [] };
  let bustTimer = 0;
  let unseenTimer = 0;
  let blockTimer = 0;

  function makeCruiser(x, z) {
    const mesh = createCarMesh(THREE, 0, '#15181c');
    // Light bar: red and blue beacons on the roof.
    const red = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.14, 0.3),
      new THREE.MeshBasicMaterial({ color: '#ff2d2d' }),
    );
    red.position.set(-0.1, 1.25, 0.35);
    mesh.add(red);
    const blue = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.14, 0.3),
      new THREE.MeshBasicMaterial({ color: '#2d7dff' }),
    );
    blue.position.set(-0.1, 1.25, -0.35);
    mesh.add(blue);
    mesh.position.set(x, 0, z);
    scene.add(mesh);
    const car = {
      mesh,
      pos: mesh.position,
      heading: 0,
      speed: 0,
      type: { top: 30, accel: 20, len: 4.4, wid: 1.9 },
      lightRed: red,
      lightBlue: blue,
      flash: rng.next() * 0.5,
    };
    state.cars.push(car);
    return car;
  }

  function makeHeli(x, z) {
    const group = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 1.4, 1.8),
      new THREE.MeshLambertMaterial({ color: '#1a1d22' }),
    );
    group.add(body);
    const tail = new THREE.Mesh(
      new THREE.BoxGeometry(3.4, 0.5, 0.5),
      new THREE.MeshLambertMaterial({ color: '#1a1d22' }),
    );
    tail.position.set(-3, 0.3, 0);
    group.add(tail);
    const rotor = new THREE.Mesh(
      new THREE.BoxGeometry(7.5, 0.08, 0.5),
      new THREE.MeshLambertMaterial({ color: '#333333' }),
    );
    rotor.position.y = 0.9;
    group.add(rotor);
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(7, 42, 16, 1, true),
      new THREE.MeshBasicMaterial({ color: '#fff6c9', transparent: true, opacity: 0.16, side: THREE.DoubleSide }),
    );
    cone.position.y = -21;
    group.add(cone);
    group.position.set(x, 42, z);
    scene.add(group);
    state.heli = { group, rotor, angle: 0 };
  }

  function placeRoadblocks(player) {
    for (const rb of state.roadblocks) scene.remove(rb.mesh);
    state.roadblocks = [];
    const fx = Math.sin(player.heading);
    const fz = Math.cos(player.heading);
    const aheadX = player.pos.x + fx * 34;
    const aheadZ = player.pos.z + fz * 34;
    for (const off of [-4, 4]) {
      const mesh = createCarMesh(THREE, 0, '#15181c');
      mesh.position.set(aheadX - fz * off, 0, aheadZ + fx * off);
      mesh.rotation.y = player.heading + Math.PI / 2;
      scene.add(mesh);
      state.roadblocks.push({ mesh });
    }
  }

  function setWanted(n) {
    state.wanted = Math.max(0, Math.min(WANTED_MAX, n));
    unseenTimer = 0;
    bustTimer = 0;
    // Cruisers match the star count.
    while (state.cars.length < state.wanted) {
      const a = rng.range(0, Math.PI * 2);
      makeCruiser(0, 0);
      const c = state.cars[state.cars.length - 1];
      c.pos.x = rng.range(-80, 80);
      c.pos.z = rng.range(-80, 80);
      void a;
    }
    while (state.cars.length > state.wanted) {
      const c = state.cars.pop();
      scene.remove(c.mesh);
    }
    if (state.wanted >= 4 && !state.heli) makeHeli(0, 0);
    if (state.wanted < 4 && state.heli) {
      scene.remove(state.heli.group);
      state.heli = null;
    }
    if (state.wanted < 3) {
      for (const rb of state.roadblocks) scene.remove(rb.mesh);
      state.roadblocks = [];
    }
  }

  return {
    state,
    setWanted,
    update(dt, player, audio, onBusted) {
      const t = performance.now() / 1000;
      let nearest = Infinity;
      for (const c of state.cars) {
        // Chase: steer toward the player, faster than traffic.
        const dx = player.pos.x - c.pos.x;
        const dz = player.pos.z - c.pos.z;
        const dist = Math.hypot(dx, dz) || 1;
        nearest = Math.min(nearest, dist);
        const wantHeading = Math.atan2(dx, dz);
        let diff = wantHeading - c.heading;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        c.heading += Math.max(-2.4 * dt, Math.min(2.4 * dt, diff));
        c.speed += ((dist > 26 ? 22 : 17) - c.speed) * Math.min(1, dt * 1.5);
        c.pos.x += Math.sin(c.heading) * c.speed * dt;
        c.pos.z += Math.cos(c.heading) * c.speed * dt;
        c.mesh.position.copy(c.pos);
        c.mesh.rotation.y = c.heading;
        const spin = (c.speed * dt) / 0.34;
        for (const w of c.mesh.userData.wheels) w.rotation.y += spin;
        // Flashing light bar.
        c.flash += dt;
        const on = Math.sin(c.flash * 9) > 0;
        c.lightRed.material.color.setHex(on ? '#ff2d2d' : '#5a1010');
        c.lightBlue.material.color.setHex(on ? '#10105a' : '#2d7dff');
        // Ram the player's car.
        if (!player.onFoot && dist < 3.4) {
          player.pos.x += (dx / dist) * 1.2 * dt * 10;
          player.pos.z += (dz / dist) * 1.2 * dt * 10;
          if (player.car) {
            player.car.speed *= 0.97;
            player.car.pos.copy(player.pos);
            player.car.mesh.position.copy(player.pos);
          }
        }
        // Bust on foot: caught standing next to a cruiser.
        if (player.onFoot && dist < 3.2) {
          bustTimer += dt;
          if (bustTimer > 1.5) {
            bustTimer = 0;
            onBusted();
          }
        }
      }
      if (player.onFoot && state.cars.length === 0) bustTimer = 0;
      if (nearest > 45 && state.wanted > 0) {
        unseenTimer += dt;
        if (unseenTimer > 20) {
          unseenTimer = 0;
          setWanted(state.wanted - 1);
        }
      } else {
        unseenTimer = 0;
      }
      // Roadblocks at 3+ stars, re-laid ahead of the player.
      if (state.wanted >= 3) {
        blockTimer += dt;
        if (blockTimer > 15 || state.roadblocks.length === 0) {
          blockTimer = 0;
          placeRoadblocks(player);
        }
      }
      // Helicopter circles above with its searchlight on the player.
      if (state.heli) {
        const h = state.heli;
        h.angle += dt * 0.45;
        h.group.position.set(
          player.pos.x + Math.cos(h.angle) * 26,
          42,
          player.pos.z + Math.sin(h.angle) * 26,
        );
        h.group.rotation.y = Math.atan2(player.pos.x - h.group.position.x, player.pos.z - h.group.position.z);
        h.rotor.rotation.y += dt * 22;
        const cone = h.group.children[3];
        cone.lookAt(player.pos.x, 0, player.pos.z);
        cone.rotateX(Math.PI);
      }
      if (audio) audio.siren(state.cars.length > 0 && state.wanted > 0);
      void t;
    },
  };
}
