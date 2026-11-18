// The look of Solmar Bay: a three.js scene built once from the city layout, then
// posed every frame from the world state. Static meshes are built at boot; cars,
// people and the waypoint beacon are moved, never rebuilt.
import { CAR, GRID, PALETTE, SCREENS } from './config.js';
import { createRandom } from './random.js';

const THREE = window.THREE;

/** A canvas texture: lit and dark windows on a tinted facade. */
function buildingTexture(tint, variant, rng) {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = `#${tint.toString(16).padStart(6, '0')}`;
  g.fillRect(0, 0, 128, 256);
  g.fillStyle = 'rgba(0,0,0,0.12)';
  g.fillRect(0, 0, 128, 8);
  const cols = 6;
  const rows = 12;
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      const lit = rng() < (variant === 0 ? 0.35 : variant === 1 ? 0.2 : 0.5);
      g.fillStyle = lit ? '#ffd98a' : '#2c3542';
      g.fillRect(10 + x * 19, 16 + y * 20, 12, 13);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Asphalt with a dashed centre line and edge lines, repeated along the road. */
function roadTexture() {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#3a3f46';
  g.fillRect(0, 0, 64, 128);
  g.fillStyle = '#f5d90a';
  g.fillRect(30, 8, 4, 40);
  g.fillRect(30, 72, 4, 40);
  g.fillStyle = '#e8e8e8';
  g.fillRect(3, 0, 2, 128);
  g.fillRect(59, 0, 2, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Sand with a speckle, and sea with soft wave stripes. */
function speckleTexture(base, speck, rng) {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = base;
  g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 300; i += 1) {
    g.fillStyle = speck;
    g.fillRect(rng() * 128, rng() * 128, 2, 2);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Build the scene and return the renderer plus a draw function. */
export function createRenderer(canvas, city, seed) {
  const texRng = createRandom((seed ?? 1) + 999);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PALETTE.sky);
  scene.fog = new THREE.Fog(PALETTE.fog, 180, 520);

  const hemi = new THREE.HemisphereLight(0xcfe8ff, 0x8a7a5a, 0.95);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff2d0, 1.15);
  sun.position.set(-120, 180, -60);
  scene.add(sun);

  const camera = new THREE.PerspectiveCamera(62, 1280 / 720, 0.1, 900);

  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const cylGeo = new THREE.CylinderGeometry(1, 1, 1, 10);
  const coneGeo = new THREE.ConeGeometry(1, 1, 8);
  const sphereGeo = new THREE.SphereGeometry(1, 12, 8);
  const planeGeo = new THREE.PlaneGeometry(1, 1);
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.32, 12);
  wheelGeo.rotateZ(Math.PI / 2);

  const materials = new Map();
  function mat(color, opts = {}) {
    const key = `${color}|${opts.emissive ?? ''}|${opts.transparent ?? ''}`;
    if (!materials.has(key)) {
      materials.set(key, new THREE.MeshLambertMaterial({ color, ...opts }));
    }
    return materials.get(key);
  }
  function mesh(geo, material, x, y, z, sx = 1, sy = 1, sz = 1) {
    const m = new THREE.Mesh(geo, material);
    m.position.set(x, y, z);
    m.scale.set(sx, sy, sz);
    scene.add(m);
    return m;
  }

  // Ground, beach, sea.
  const ground = mesh(planeGeo, mat(PALETTE.ground), 0, 0, 0, 720, 720, 1);
  ground.rotation.x = -Math.PI / 2;
  const sandTex = speckleTexture('#e8d49a', '#d9c184', texRng);
  sandTex.repeat.set(6, 24);
  const sand = new THREE.Mesh(planeGeo, new THREE.MeshLambertMaterial({ map: sandTex }));
  sand.rotation.x = -Math.PI / 2;
  sand.position.set((GRID.beachX + GRID.seaX) / 2, 0.01, 0);
  sand.scale.set(GRID.seaX - GRID.beachX, 420, 1);
  scene.add(sand);
  const seaTex = speckleTexture('#2f7fc2', '#57a8e0', texRng);
  seaTex.repeat.set(10, 30);
  const sea = new THREE.Mesh(planeGeo, new THREE.MeshLambertMaterial({ map: seaTex }));
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(GRID.seaX + 220, 0.01, 0);
  sea.scale.set(440, 720, 1);
  scene.add(sea);

  // Roads: one dark strip per grid line, dashed texture running along it.
  const rTex = roadTexture();
  for (const r of GRID.roads) {
    const v = new THREE.Mesh(planeGeo, new THREE.MeshLambertMaterial({ map: rTex }));
    v.rotation.x = -Math.PI / 2;
    v.position.set(r, 0.03, 0);
    v.scale.set(12, 408, 1);
    const tex = rTex.clone();
    tex.needsUpdate = true;
    tex.repeat.set(1, 12);
    v.material = new THREE.MeshLambertMaterial({ map: tex });
    scene.add(v);
    const h = new THREE.Mesh(planeGeo, new THREE.MeshLambertMaterial({ map: tex }));
    h.rotation.x = -Math.PI / 2;
    h.rotation.z = Math.PI / 2;
    h.position.set(0, 0.03, r);
    h.scale.set(12, 408, 1);
    scene.add(h);
  }

  // Buildings, one textured box each.
  const facade = [buildingTexture(PALETTE.buildingA, 0, texRng), buildingTexture(PALETTE.buildingB, 1, texRng), buildingTexture(PALETTE.buildingC, 2, texRng)];
  for (const b of city.buildings) {
    const m = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({ map: facade[b.variant] }));
    m.position.set(b.x, b.h / 2, b.z);
    m.scale.set(b.w, b.h, b.d);
    scene.add(m);
    const roof = mesh(boxGeo, mat(0x6a6f75), b.x, b.h + 0.3, b.z, b.w * 0.7, 0.6, b.d * 0.7);
    roof.visible = b.h > 30;
  }

  // Palms: trunk plus a cone crown. Umbrellas: a cone on a pole. Lamps: pole + glow.
  for (const p of city.palms) {
    mesh(cylGeo, mat(PALETTE.palmTrunk), p.x, 2.2 * p.s, p.z, 0.28 * p.s, 4.4 * p.s, 0.28 * p.s);
    mesh(coneGeo, mat(PALETTE.palmLeaf), p.x, 5.2 * p.s, p.z, 2.6 * p.s, 1.8 * p.s, 2.6 * p.s);
  }
  for (const u of city.umbrellas) {
    mesh(cylGeo, mat(0xe8e0cc), u.x, 1.1, u.z, 0.08, 2.2, 0.08);
    const top = mesh(coneGeo, mat(PALETTE.umbrella), u.x, 2.5, u.z, 2.4, 1.1, 2.4);
    top.rotation.z = u.tilt;
  }
  for (const l of city.lamps) {
    mesh(cylGeo, mat(0x3c4148), l.x, 2.5, l.z, 0.12, 5, 0.12);
    mesh(sphereGeo, mat(0xffe9a8, { emissive: 0xffd76a }), l.x, 5.1, l.z, 0.35, 0.35, 0.35);
  }

  // The lighthouse, on the sand at the south end of the beach.
  const lh = city.landmarks.lighthouse;
  mesh(cylGeo, mat(0xf2ede2), lh.x, 11, lh.z, 3, 22, 3);
  mesh(cylGeo, mat(0xc22e2e), lh.x, 16, lh.z, 3.1, 4, 3.1);
  mesh(cylGeo, mat(0xc22e2e), lh.x, 6, lh.z, 3.1, 4, 3.1);
  mesh(sphereGeo, mat(0xffe9a8, { emissive: 0xffd76a }), lh.x, 22.8, lh.z, 1.4, 1.4, 1.4);

  // The waypoint beacon: a light pillar and a floating diamond, moved per frame.
  const beaconMat = new THREE.MeshBasicMaterial({
    color: PALETTE.beacon, transparent: true, opacity: 0.16, side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const beacon = new THREE.Mesh(cylGeo, beaconMat, 1, 1, 1);
  beacon.position.set(0, 30, 0);
  beacon.scale.set(2.2, 60, 2.2);
  beacon.visible = false;
  scene.add(beacon);
  const diamond = new THREE.Mesh(new THREE.OctahedronGeometry(1.3), new THREE.MeshBasicMaterial({ color: PALETTE.beacon }));
  diamond.visible = false;
  scene.add(diamond);

  // Dynamic object pools.
  const carGroups = new Map();
  const pedGroups = new Map();
  const copGroups = new Map();
  let playerGroup = null;
  const blobMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3 });
  function blob(x, z, r) {
    const b = new THREE.Mesh(planeGeo, blobMat);
    b.rotation.x = -Math.PI / 2;
    b.position.set(x, 0.05, z);
    b.scale.set(r * 2, r * 2.4, 1);
    return b;
  }

  function buildCarMesh(car) {
    const g = new THREE.Group();
    const bodyMat = car.isPolice ? mat(PALETTE.policeWhite) : mat(car.color);
    const body = new THREE.Mesh(boxGeo, bodyMat);
    body.scale.set(2.1, 0.62, 4.3);
    body.position.y = 0.62;
    g.add(body);
    const cabin = new THREE.Mesh(boxGeo, mat(0x1e2a33));
    cabin.scale.set(1.8, 0.55, 2.1);
    cabin.position.set(0, 1.2, -0.2);
    g.add(cabin);
    if (car.isPolice) {
      const skirt = new THREE.Mesh(boxGeo, mat(PALETTE.policeBlack));
      skirt.scale.set(2.12, 0.3, 4.32);
      skirt.position.y = 0.32;
      g.add(skirt);
    }
    const wheelMat = mat(0x14161a);
    for (const [wx, wz] of [[-1.0, 1.35], [1.0, 1.35], [-1.0, -1.35], [1.0, -1.35]]) {
      const w = new THREE.Mesh(wheelGeo, wheelMat);
      w.position.set(wx, 0.42, wz);
      g.add(w);
    }
    const headMat = mat(0xfff6c0, { emissive: 0xfff2a0 });
    for (const hx of [-0.7, 0.7]) {
      const h = new THREE.Mesh(boxGeo, headMat);
      h.scale.set(0.4, 0.18, 0.1);
      h.position.set(hx, 0.62, 2.18);
      g.add(h);
    }
    const tailMat = mat(0xc22e2e, { emissive: 0x881111 });
    for (const hx of [-0.7, 0.7]) {
      const t = new THREE.Mesh(boxGeo, tailMat);
      t.scale.set(0.4, 0.18, 0.1);
      t.position.set(hx, 0.62, -2.18);
      g.add(t);
    }
    let barRed = null;
    let barBlue = null;
    if (car.isPolice) {
      barRed = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({ color: 0xff2222, emissive: 0xff2222 }));
      barRed.scale.set(0.55, 0.22, 0.4);
      barRed.position.set(-0.45, 1.6, -0.2);
      g.add(barRed);
      barBlue = new THREE.Mesh(boxGeo, new THREE.MeshLambertMaterial({ color: 0x2244ff, emissive: 0x2244ff }));
      barBlue.scale.set(0.55, 0.22, 0.4);
      barBlue.position.set(0.45, 1.6, -0.2);
      g.add(barBlue);
    }
    const shadow = blob(0, 0, 1.6);
    g.add(shadow);
    g.userData.barRed = barRed;
    g.userData.barBlue = barBlue;
    return g;
  }

  function buildPersonMesh(shirt, cap) {
    const g = new THREE.Group();
    const torso = new THREE.Mesh(boxGeo, mat(shirt));
    torso.scale.set(0.62, 0.85, 0.34);
    torso.position.y = 1.05;
    g.add(torso);
    const head = new THREE.Mesh(sphereGeo, mat(PALETTE.playerSkin));
    head.scale.set(0.26, 0.26, 0.26);
    head.position.y = 1.72;
    g.add(head);
    if (cap) {
      const hat = new THREE.Mesh(cylGeo, mat(PALETTE.playerCap));
      hat.scale.set(0.3, 0.14, 0.3);
      hat.position.y = 1.92;
      g.add(hat);
    }
    const legMat = mat(0x2c3542);
    const legL = new THREE.Mesh(boxGeo, legMat);
    legL.scale.set(0.22, 0.7, 0.24);
    legL.position.set(-0.16, 0.35, 0);
    g.add(legL);
    const legR = new THREE.Mesh(boxGeo, legMat);
    legR.scale.set(0.22, 0.7, 0.24);
    legR.position.set(0.16, 0.35, 0);
    g.add(legR);
    g.userData.legL = legL;
    g.userData.legR = legR;
    const shadow = blob(0, 0, 0.6);
    g.add(shadow);
    return g;
  }

  function resize() {
    const w = canvas.clientWidth || 1280;
    const h = canvas.clientHeight || 720;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  /** Paint one frame of the world. */
  function draw(state, screen) {
    const p = state.player;
    // Cars: create, move, flash, remove the gone.
    const seenCars = new Set();
    for (const car of state.cars) {
      if (car.kind === 'gone') continue;
      seenCars.add(car.id);
      let g = carGroups.get(car.id);
      if (!g) {
        g = buildCarMesh(car);
        carGroups.set(car.id, g);
        scene.add(g);
      }
      g.position.set(car.x, 0, car.z);
      g.rotation.y = car.heading;
      if (car.isPolice && g.userData.barRed) {
        const on = car.flash === 1;
        g.userData.barRed.material.emissiveIntensity = on ? 1.6 : 0.15;
        g.userData.barBlue.material.emissiveIntensity = on ? 0.15 : 1.6;
      }
    }
    for (const [id, g] of carGroups) {
      if (!seenCars.has(id)) {
        scene.remove(g);
        carGroups.delete(id);
      }
    }
    // The player on foot.
    if (p.onFoot) {
      if (!playerGroup) {
        playerGroup = buildPersonMesh(PALETTE.playerJacket, true);
        scene.add(playerGroup);
      }
      playerGroup.visible = true;
      playerGroup.position.set(p.x, 0, p.z);
      playerGroup.rotation.y = p.heading;
      const swing = Math.sin(p.walkPhase) * (p.speed > 0.5 ? 0.45 : 0);
      playerGroup.userData.legL.rotation.x = swing;
      playerGroup.userData.legR.rotation.x = -swing;
      playerGroup.position.y = p.speed > 0.5 ? Math.abs(Math.sin(p.walkPhase)) * 0.08 : 0;
    } else if (playerGroup) {
      playerGroup.visible = false;
    }
    // Pedestrians.
    const seenPeds = new Set();
    state.peds.forEach((ped, i) => {
      seenPeds.add(i);
      let g = pedGroups.get(i);
      if (!g) {
        g = buildPersonMesh(ped.shirt, false);
        pedGroups.set(i, g);
        scene.add(g);
      }
      g.position.set(ped.x, 0, ped.z);
      g.rotation.y = ped.heading;
      g.rotation.z = ped.mode === 'down' ? Math.PI / 2 : 0;
      g.position.y = ped.mode === 'down' ? 0.2 : 0;
    });
    // Foot cops.
    const seenCops = new Set();
    (state.footCops ?? []).forEach((cop, i) => {
      seenCops.add(i);
      let g = copGroups.get(i);
      if (!g) {
        g = buildPersonMesh(0x1c2f5e, true);
        copGroups.set(i, g);
        scene.add(g);
      }
      g.position.set(cop.x, 0, cop.z);
      g.rotation.y = cop.heading;
    });
    for (const [i, g] of copGroups) {
      if (!seenCops.has(i)) {
        scene.remove(g);
        copGroups.delete(i);
      }
    }
    // Waypoint beacon.
    const wp = state.waypoint;
    if (wp && screen === SCREENS.PLAY) {
      beacon.visible = true;
      diamond.visible = true;
      beacon.position.set(wp.x, 30, wp.z);
      beacon.material.opacity = 0.13 + Math.sin(state.time * 2.4) * 0.04;
      diamond.position.set(wp.x, 9 + Math.sin(state.time * 2) * 0.6, wp.z);
      diamond.rotation.y = state.time * 1.2;
    } else {
      beacon.visible = false;
      diamond.visible = false;
    }
    // Sea shimmer follows the clock, so a staged shot is deterministic.
    seaTex.offset.x = (state.time * 0.004) % 1;
    seaTex.offset.y = (state.time * 0.002) % 1;

    // Camera: orbit around the player, or the shot's fixed framing.
    const target = new THREE.Vector3(p.x, 2.1, p.z);
    const dist = state.camDist;
    const cy = state.camYaw;
    const cp = state.camPitch;
    const shake = state.shakeTime > 0 ? 0.35 : 0;
    const sx = shake ? Math.sin(state.time * 61) * shake : 0;
    const sy = shake ? Math.cos(state.time * 53) * shake * 0.6 : 0;
    camera.position.set(
      target.x - Math.sin(cy) * Math.cos(cp) * dist + sx,
      target.y + Math.sin(cp) * dist + sy,
      target.z - Math.cos(cy) * Math.cos(cp) * dist,
    );
    camera.lookAt(target);
    renderer.render(scene, camera);
  }

  return { draw, resize };
}
