// Solmar Bay — the environment: golden-hour sky and sun, the ground,
// the beach, the animated ocean and the marina.
// The whole street grid is painted onto ONE canvas texture (roads, sidewalks,
// lane dashes, crosswalks, beach sand), so the ground costs a single draw
// call while still showing real street detail at a glance.
import { WORLD } from './config.js';

function groundTexture() {
  const S = 2048;
  const cv = document.createElement('canvas');
  cv.width = S;
  cv.height = S;
  const g = cv.getContext('2d');
  const px = (m) => ((m + WORLD.size / 2) / WORLD.size) * S;
  // Seeded speckle so the ground texture is identical on every load.
  let speckleSeed = 7;
  const speckleRand = () => {
    speckleSeed = (speckleSeed * 1664525 + 1013904223) >>> 0;
    return speckleSeed / 4294967296;
  };
  // Base: dry coastal grass.
  g.fillStyle = '#8f8356';
  g.fillRect(0, 0, S, S);
  for (let i = 0; i < 9000; i += 1) {
    g.fillStyle = speckleRand() < 0.5 ? 'rgba(110,100,55,0.25)' : 'rgba(170,160,105,0.25)';
    g.fillRect(speckleRand() * S, speckleRand() * S, 3, 3);
  }
  const streets = [];
  for (let k = -5; k <= 5; k += 1) streets.push(k * WORLD.roadEvery);
  // Sidewalk aprons around every block.
  g.fillStyle = '#9a9384';
  for (const bx of streets) {
    for (const bz of streets) {
      const x0 = px(bx + WORLD.roadWidth / 2);
      const z0 = px(bz + WORLD.roadWidth / 2);
      const w = px(WORLD.roadEvery - WORLD.roadWidth) - px(0);
      g.fillRect(x0, z0, w, w);
    }
  }
  // Asphalt roads.
  g.fillStyle = '#3c3c42';
  for (const c of streets) {
    g.fillRect(0, px(c - WORLD.roadWidth / 2), S, px(WORLD.roadWidth) - px(0));
    g.fillRect(px(c - WORLD.roadWidth / 2), 0, px(WORLD.roadWidth) - px(0), S);
  }
  // Lane dashes.
  g.fillStyle = '#e8c85a';
  for (const c of streets) {
    for (let m = -WORLD.size / 2; m < WORLD.size / 2; m += 12) {
      g.fillRect(px(m), px(c) - 2, px(6) - px(0), 4);
      g.fillRect(px(c) - 2, px(m), 4, px(6) - px(0));
    }
  }
  // Crosswalk zebra stripes at every intersection.
  g.fillStyle = '#e8e6df';
  for (const cx of streets) {
    for (const cz of streets) {
      for (let s = -5; s <= 5; s += 2) {
        g.fillRect(px(cx + s - 0.7), px(cz - WORLD.roadWidth / 2 + 1), px(1.4) - px(0), px(3) - px(0));
        g.fillRect(px(cx + s - 0.7), px(cz + WORLD.roadWidth / 2 - 4), px(1.4) - px(0), px(3) - px(0));
        g.fillRect(px(cx - WORLD.roadWidth / 2 + 1), px(cz + s - 0.7), px(3) - px(0), px(1.4) - px(0));
        g.fillRect(px(cx + WORLD.roadWidth / 2 - 4), px(cz + s - 0.7), px(3) - px(0), px(1.4) - px(0));
      }
    }
  }
  // Beach sand and boardwalk along the south edge.
  const sand = g.createLinearGradient(0, px(WORLD.beachAt), 0, S);
  sand.addColorStop(0, '#d9c48d');
  sand.addColorStop(1, '#c9ae76');
  g.fillStyle = sand;
  g.fillRect(0, px(WORLD.beachAt), S, S - px(WORLD.beachAt));
  g.fillStyle = '#8a6a4a';
  g.fillRect(0, px(WORLD.beachAt - 2), S, px(4) - px(0));
  const tex = new THREE.CanvasTexture(cv);
  tex.anisotropy = 4;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createWorld(scene, rng) {
  scene.background = new THREE.Color(0xf7b96a);
  scene.fog = new THREE.Fog(0xf2b878, 140, 560);

  const hemi = new THREE.HemisphereLight(0xffe2b0, 0x8a7a5a, 0.55);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffd9a0, 1.05);
  sun.position.set(-160, 110, -90);
  scene.add(sun);

  // Ground: one textured plane.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD.size, WORLD.size),
    new THREE.MeshLambertMaterial({ map: groundTexture() }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0;
  scene.add(ground);

  // Ocean: animated plane south of the beach.
  const oceanGeo = new THREE.PlaneGeometry(WORLD.size, WORLD.size - WORLD.oceanAt, 48, 24);
  const oceanMat = new THREE.MeshLambertMaterial({ color: 0x2a7fa8, transparent: true, opacity: 0.94 });
  const ocean = new THREE.Mesh(oceanGeo, oceanMat);
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.set(0, 0.4, (WORLD.oceanAt + WORLD.size) / 2);
  scene.add(ocean);
  const oceanBase = oceanGeo.attributes.position.array.slice();

  // Marina docks and boats on the south-west shore.
  const boats = [];
  const dockMat = new THREE.MeshLambertMaterial({ color: 0x8a6a4a });
  for (let d = 0; d < 3; d += 1) {
    const dock = new THREE.Mesh(new THREE.BoxGeometry(4, 0.6, 26), dockMat);
    dock.position.set(-150 + d * 26, 0.6, WORLD.oceanAt + 12);
    scene.add(dock);
    const hull = new THREE.Mesh(
      new THREE.BoxGeometry(4, 1.6, 12),
      new THREE.MeshLambertMaterial({ color: [0xf2f2f2, 0xd96a6a, 0x7fb3a8][d] }),
    );
    hull.position.set(-150 + d * 26 + 5, 0.9, WORLD.oceanAt + 18);
    scene.add(hull);
    const mast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 9, 6),
      new THREE.MeshLambertMaterial({ color: 0x6a5a4a }),
    );
    mast.position.set(-150 + d * 26 + 5, 6, WORLD.oceanAt + 18);
    scene.add(mast);
    const sail = new THREE.Mesh(
      new THREE.ConeGeometry(2.4, 7, 4),
      new THREE.MeshLambertMaterial({ color: 0xf7f3e8 }),
    );
    sail.position.set(-150 + d * 26 + 5, 8.5, WORLD.oceanAt + 18);
    sail.rotation.y = Math.PI / 4;
    scene.add(sail);
    boats.push({ hull, mast, sail, phase: rng.range(0, Math.PI * 2) });
  }

  // Beach umbrellas and a lifeguard tower so the sand is not empty.
  const umbrellaColors = [0xff5a5a, 0x2fa8ff, 0xffc44d, 0x7dff5a, 0xff8ad8];
  for (let i = 0; i < 9; i += 1) {
    const ux = -180 + i * 42 + rng.range(-6, 6);
    const uz = WORLD.beachAt + 8 + rng.range(0, 18);
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.09, 3, 6),
      new THREE.MeshLambertMaterial({ color: 0xf2f2f2 }),
    );
    pole.position.set(ux, 1.5, uz);
    scene.add(pole);
    const top = new THREE.Mesh(
      new THREE.ConeGeometry(2.6, 1.1, 8),
      new THREE.MeshLambertMaterial({ color: umbrellaColors[i % umbrellaColors.length] }),
    );
    top.position.set(ux, 3.4, uz);
    scene.add(top);
  }
  const towerLegs = new THREE.MeshLambertMaterial({ color: 0xf2f2f2 });
  for (const [lx, lz] of [[-60, 190], [-56, 190], [-60, 194], [-56, 194]]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.3, 5, 0.3), towerLegs);
    leg.position.set(lx, 2.5, lz);
    scene.add(leg);
  }
  const towerTop = new THREE.Mesh(
    new THREE.BoxGeometry(6, 0.4, 6),
    new THREE.MeshLambertMaterial({ color: 0xff5a5a }),
  );
  towerTop.position.set(-58, 5.2, 192);
  scene.add(towerTop);

  let time = 0;
  return {
    ocean,
    boats,
    update(dt) {
      time += dt;
      const pos = oceanGeo.attributes.position;
      for (let i = 0; i < pos.count; i += 1) {
        const bx = oceanBase[i * 3];
        const by = oceanBase[i * 3 + 1];
        pos.setZ(i, Math.sin(bx * 0.08 + time * 1.4) * 0.35 + Math.cos(by * 0.11 + time * 0.9) * 0.3);
      }
      pos.needsUpdate = true;
      oceanGeo.computeVertexNormals();
      for (const b of boats) {
        b.hull.position.y = 0.9 + Math.sin(time * 0.8 + b.phase) * 0.25;
        b.hull.rotation.z = Math.sin(time * 0.6 + b.phase) * 0.03;
      }
    },
  };
}
