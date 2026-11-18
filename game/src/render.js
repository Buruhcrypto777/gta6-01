// Drawing only, with three.js: the sun-soaked city as a 3D scene — a textured ground plane
// with the road grid, instanced buildings with lit windows, palms and lamps, the beach and
// the sea, cars and people built from boxes, and a third-person camera that follows Mara.
// The renderer owns no rules: it reads the world's state and paints it, so the same frame
// the simulation produces is the frame the screenshots capture.
import { BLOCK, CITY, PALETTE } from './config.js';

const THREE = window.THREE;

function makeGroundTexture(layout) {
  const size = 1024;
  const scale = size / 400; // The ground plane covers x and z from -200 to 200.
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const px = (v) => (v + 200) * scale;

  ctx.fillStyle = '#b9b3a4'; // Sidewalks and block interiors.
  ctx.fillRect(0, 0, size, size);

  // Roads: asphalt strips along every avenue and street.
  ctx.fillStyle = '#33373d';
  for (const line of CITY.avenues) ctx.fillRect(px(line - 7), 0, 14 * scale, size);
  for (const line of CITY.streets) ctx.fillRect(0, px(line - 7), size, 14 * scale);

  // The park and the plaza get their own ground.
  ctx.fillStyle = '#6fae62';
  ctx.fillRect(px(layout.park.x - BLOCK / 2), px(layout.park.z - BLOCK / 2), BLOCK * scale, BLOCK * scale);
  ctx.fillStyle = '#c9c2b2';
  ctx.fillRect(px(layout.plaza.x - BLOCK / 2), px(layout.plaza.z - BLOCK / 2), BLOCK * scale, BLOCK * scale);
  ctx.strokeStyle = '#a8a08e';
  ctx.lineWidth = 2;
  ctx.strokeRect(px(layout.plaza.x - 14), px(layout.plaza.z - 14), 28 * scale, 28 * scale);

  // Park paths and trees.
  ctx.strokeStyle = '#d8cfae';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(px(layout.park.x - BLOCK / 2), px(layout.park.z));
  ctx.lineTo(px(layout.park.x + BLOCK / 2), px(layout.park.z));
  ctx.moveTo(px(layout.park.x), px(layout.park.z - BLOCK / 2));
  ctx.lineTo(px(layout.park.x), px(layout.park.z + BLOCK / 2));
  ctx.stroke();
  ctx.fillStyle = '#4d7c4a';
  for (let i = 0; i < 24; i += 1) {
    const x = px(layout.park.x - 22 + (i % 6) * 8.5);
    const z = px(layout.park.z - 22 + Math.floor(i / 6) * 11);
    ctx.beginPath();
    ctx.arc(x, z, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Centre dashes down every road.
  ctx.fillStyle = '#e8c84a';
  for (const line of CITY.avenues) {
    for (let z = -195; z < 195; z += 12) ctx.fillRect(px(line) - 1, px(z), 2, 6 * scale);
  }
  for (const line of CITY.streets) {
    for (let x = -195; x < 195; x += 12) ctx.fillRect(px(x), px(line) - 1, 6 * scale, 2);
  }

  // Crosswalks at every intersection.
  ctx.fillStyle = '#e8e6df';
  for (const ax of CITY.avenues) {
    for (const sz of CITY.streets) {
      for (let i = -2; i <= 2; i += 1) {
        ctx.fillRect(px(ax - 6 + i * 2.4), px(sz - 9), 1.4 * scale, 2 * scale);
        ctx.fillRect(px(ax - 6 + i * 2.4), px(sz + 7), 1.4 * scale, 2 * scale);
        ctx.fillRect(px(ax - 9), px(sz - 6 + i * 2.4), 2 * scale, 1.4 * scale);
        ctx.fillRect(px(ax + 7), px(sz - 6 + i * 2.4), 2 * scale, 1.4 * scale);
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.encoding = THREE.sRGBEncoding;
  texture.anisotropy = 4;
  return texture;
}

function makeWindowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  // A sunlit facade: warm light-grey wall with glass windows, a few of them lit.
  ctx.fillStyle = '#9aa5ad';
  ctx.fillRect(0, 0, 128, 256);
  for (let row = 0; row < 12; row += 1) {
    for (let col = 0; col < 5; col += 1) {
      const roll = ((row * 5 + col) * 37) % 10;
      ctx.fillStyle = roll < 2 ? '#ffd98a' : roll < 7 ? '#7fa8bc' : '#4a6a7a';
      ctx.fillRect(10 + col * 23, 12 + row * 20, 14, 12);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.encoding = THREE.sRGBEncoding;
  return texture;
}

function makeSeaTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 256);
  gradient.addColorStop(0, '#3d9ab8');
  gradient.addColorStop(1, '#1f6d8a');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 256);
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 40; i += 1) {
    const y = 8 + i * 6.5;
    const x = (i * 53) % 480;
    ctx.beginPath();
    ctx.arc(x, y, 14, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.encoding = THREE.sRGBEncoding;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 2);
  return texture;
}

function buildCarMesh(kind, color) {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.4 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x18242e, roughness: 0.15, metalness: 0.6 });
  const tyreMat = new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 0.9 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.55, 4.4), bodyMat);
  body.position.y = 0.55;
  body.castShadow = true;
  group.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 2.1), glassMat);
  cabin.position.set(0, 1.05, -0.25);
  cabin.castShadow = true;
  group.add(cabin);
  const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.28, 12);
  wheelGeo.rotateZ(Math.PI / 2);
  const wheels = [];
  for (const [wx, wz] of [[-0.85, 1.45], [0.85, 1.45], [-0.85, -1.45], [0.85, -1.45]]) {
    const wheel = new THREE.Mesh(wheelGeo, tyreMat);
    wheel.position.set(wx, 0.36, wz);
    wheel.castShadow = true;
    group.add(wheel);
    wheels.push(wheel);
  }
  const lightMat = new THREE.MeshStandardMaterial({ color: 0xfff6c9, emissive: 0xfff2b0, emissiveIntensity: 0.9 });
  for (const hx of [-0.6, 0.6]) {
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.14, 0.08), lightMat);
    head.position.set(hx, 0.55, 2.22);
    group.add(head);
  }
  const tailMat = new THREE.MeshStandardMaterial({ color: 0xaa2020, emissive: 0x881111, emissiveIntensity: 0.7 });
  for (const hx of [-0.6, 0.6]) {
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.14, 0.08), tailMat);
    tail.position.set(hx, 0.55, -2.22);
    group.add(tail);
  }
  let siren = null;
  if (kind === 'police') {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.16, 0.3), new THREE.MeshStandardMaterial({ color: 0x222831 }));
    bar.position.set(0, 1.38, -0.25);
    group.add(bar);
    const redMat = new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0xff2222, emissiveIntensity: 1 });
    const blueMat = new THREE.MeshStandardMaterial({ color: 0x2255ff, emissive: 0x2255ff, emissiveIntensity: 1 });
    const red = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.3), redMat);
    red.position.set(-0.26, 1.5, -0.25);
    const blue = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.3), blueMat);
    blue.position.set(0.26, 1.5, -0.25);
    group.add(red, blue);
    siren = { redMat, blueMat };
  }
  if (kind === 'taxi') {
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.18, 0.3), new THREE.MeshStandardMaterial({ color: 0xf5f1e6, emissive: 0xaa9944, emissiveIntensity: 0.4 }));
    sign.position.set(0, 1.4, -0.25);
    group.add(sign);
  }
  if (kind === 'sport') {
    const spoiler = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.08, 0.4), bodyMat);
    spoiler.position.set(0, 1.0, -2.1);
    group.add(spoiler);
  }
  return { group, wheels, siren };
}

function buildPersonMesh(color, isPlayer) {
  const group = new THREE.Group();
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xd9a077, roughness: 0.7 });
  const clothMat = new THREE.MeshStandardMaterial({ color, roughness: 0.8 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x2a2f38, roughness: 0.9 });
  const legGeo = new THREE.BoxGeometry(0.17, 0.5, 0.17);
  legGeo.translate(0, -0.25, 0);
  const leftLeg = new THREE.Mesh(legGeo, darkMat);
  leftLeg.position.set(-0.13, 0.52, 0);
  const rightLeg = new THREE.Mesh(legGeo, darkMat);
  rightLeg.position.set(0.13, 0.52, 0);
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.62, 0.3), clothMat);
  torso.position.y = 0.83;
  torso.castShadow = true;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), skinMat);
  head.position.y = 1.36;
  head.castShadow = true;
  const armGeo = new THREE.BoxGeometry(0.13, 0.5, 0.13);
  armGeo.translate(0, -0.25, 0);
  const leftArm = new THREE.Mesh(armGeo, clothMat);
  leftArm.position.set(-0.33, 1.1, 0);
  const rightArm = new THREE.Mesh(armGeo, clothMat);
  rightArm.position.set(0.33, 1.1, 0);
  group.add(leftLeg, rightLeg, torso, head, leftArm, rightArm);
  if (isPlayer) {
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.1, 12), new THREE.MeshStandardMaterial({ color: 0xe85d3d, roughness: 0.7 }));
    cap.position.y = 1.55;
    group.add(cap);
  }
  return { group, leftLeg, rightLeg, leftArm, rightArm };
}

export function createRenderer(canvas, layout) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputEncoding = THREE.sRGBEncoding;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PALETTE.sky);
  scene.fog = new THREE.Fog(PALETTE.fog, 200, 560);

  const hemi = new THREE.HemisphereLight(0xbfd9ff, 0x8a7a5a, 0.55);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(PALETTE.sun, 1.25);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -140;
  sun.shadow.camera.right = 140;
  sun.shadow.camera.top = 140;
  sun.shadow.camera.bottom = -140;
  sun.shadow.camera.near = 10;
  sun.shadow.camera.far = 320;
  sun.shadow.bias = -0.0004;
  scene.add(sun);
  scene.add(sun.target);

  // Ground: the city texture, then sand, then the sea to the south.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(400, 400),
    new THREE.MeshStandardMaterial({ map: makeGroundTexture(layout), roughness: 0.95 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(400, CITY.sandTo - CITY.sandFrom),
    new THREE.MeshStandardMaterial({ color: PALETTE.sand, roughness: 1 }),
  );
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(0, 0.02, (CITY.sandFrom + CITY.sandTo) / 2);
  sand.receiveShadow = true;
  scene.add(sand);
  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(400, CITY.seaTo - CITY.seaFrom),
    new THREE.MeshStandardMaterial({ map: makeSeaTexture(), roughness: 0.4, metalness: 0.1 }),
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(0, 0.01, (CITY.seaFrom + CITY.seaTo) / 2);
  scene.add(sea);

  // Buildings: one instanced box per building, window texture on the sides, flat roof.
  const windowTexture = makeWindowTexture();
  const wallMat = new THREE.MeshStandardMaterial({ map: windowTexture, roughness: 0.85 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x4a4640, roughness: 0.95 });
  const buildingMesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1),
    [wallMat, wallMat, roofMat, roofMat, wallMat, wallMat],
    Math.max(1, layout.buildings.length),
  );
  {
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    const color = new THREE.Color();
    layout.buildings.forEach((b, i) => {
      position.set(b.x, b.h / 2, b.z);
      scale.set(b.w, b.h, b.d);
      matrix.compose(position, quaternion, scale);
      buildingMesh.setMatrixAt(i, matrix);
      buildingMesh.setColorAt(i, color.setHex(b.color));
    });
    buildingMesh.instanceMatrix.needsUpdate = true;
    if (buildingMesh.instanceColor) buildingMesh.instanceColor.needsUpdate = true;
    buildingMesh.castShadow = true;
    buildingMesh.receiveShadow = true;
    scene.add(buildingMesh);
  }

  // Palms: instanced trunks and fronds.
  const trunkGeo = new THREE.CylinderGeometry(0.12, 0.2, 4.6, 6);
  const trunkMesh = new THREE.InstancedMesh(trunkGeo, new THREE.MeshStandardMaterial({ color: PALETTE.trunk, roughness: 1 }), Math.max(1, layout.palms.length));
  const frondGeo = new THREE.ConeGeometry(1.7, 1.3, 6);
  const frondMesh = new THREE.InstancedMesh(frondGeo, new THREE.MeshStandardMaterial({ color: PALETTE.palm, roughness: 0.9 }), Math.max(1, layout.palms.length));
  {
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const euler = new THREE.Euler();
    const scale = new THREE.Vector3();
    layout.palms.forEach((p, i) => {
      position.set(p.x, 2.3 * p.scale, p.z);
      euler.set(0, p.x * 0.7, 0);
      quaternion.setFromEuler(euler);
      scale.set(p.scale, p.scale, p.scale);
      matrix.compose(position, quaternion, scale);
      trunkMesh.setMatrixAt(i, matrix);
      position.set(p.x, 5.0 * p.scale, p.z);
      euler.set(0.15, p.x, 0);
      quaternion.setFromEuler(euler);
      scale.set(p.scale, p.scale * 0.5, p.scale);
      matrix.compose(position, quaternion, scale);
      frondMesh.setMatrixAt(i, matrix);
    });
    trunkMesh.instanceMatrix.needsUpdate = true;
    frondMesh.instanceMatrix.needsUpdate = true;
    trunkMesh.castShadow = true;
    frondMesh.castShadow = true;
    scene.add(trunkMesh, frondMesh);
  }

  // Lamps: instanced poles and heads.
  const lampGeo = new THREE.CylinderGeometry(0.07, 0.09, 5, 6);
  const lampMesh = new THREE.InstancedMesh(lampGeo, new THREE.MeshStandardMaterial({ color: 0x2f3338, roughness: 0.6, metalness: 0.5 }), Math.max(1, layout.lamps.length));
  {
    const matrix = new THREE.Matrix4();
    layout.lamps.forEach((lamp, i) => {
      matrix.makeTranslation(lamp.x, 2.5, lamp.z);
      lampMesh.setMatrixAt(i, matrix);
    });
    lampMesh.instanceMatrix.needsUpdate = true;
    scene.add(lampMesh);
  }

  // Traffic lights at the four central intersections.
  for (const light of layout.trafficLights) {
    const group = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 4.6, 6), new THREE.MeshStandardMaterial({ color: 0x2f3338 }));
    pole.position.y = 2.3;
    group.add(pole);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.1, 0.35), new THREE.MeshStandardMaterial({ color: 0x1c1f24 }));
    head.position.y = 4.6;
    group.add(head);
    const red = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 8), new THREE.MeshStandardMaterial({ color: 0xff3333, emissive: 0xff2222, emissiveIntensity: 1.4 }));
    red.position.set(0, 4.95, 0.19);
    group.add(red);
    group.position.set(light.x, 0, light.z);
    scene.add(group);
  }

  // The pier reaching into the sea, with beach umbrellas on the sand.
  const pier = new THREE.Mesh(new THREE.BoxGeometry(10, 0.5, 46), new THREE.MeshStandardMaterial({ color: 0x9a7b52, roughness: 1 }));
  pier.position.set(0, 0.6, 218);
  pier.castShadow = true;
  scene.add(pier);
  for (const z of [206, 224, 238]) {
    for (const x of [-3.5, 3.5]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 3, 6), new THREE.MeshStandardMaterial({ color: 0x6b543a }));
      post.position.set(x, -0.6, z);
      scene.add(post);
    }
  }
  for (const [ux, uz, ucolor] of [[-40, 176, 0xe85d3d], [60, 172, 0x3d7ac9], [120, 178, 0xf2c230], [-110, 174, 0x4a9e6a]]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.2, 6), new THREE.MeshStandardMaterial({ color: 0xd8d2c2 }));
    pole.position.set(ux, 1.1, uz);
    const top = new THREE.Mesh(new THREE.ConeGeometry(1.8, 0.9, 8), new THREE.MeshStandardMaterial({ color: ucolor, roughness: 0.9 }));
    top.position.set(ux, 2.5, uz);
    top.castShadow = true;
    scene.add(pole, top);
  }

  // The mission waypoint: a column of light and a floating marker.
  const beaconMat = new THREE.MeshBasicMaterial({ color: PALETTE.waypoint, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false });
  const beacon = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 34, 16, 1, true), beaconMat);
  const marker = new THREE.Mesh(
    new THREE.OctahedronGeometry(1.4),
    new THREE.MeshBasicMaterial({ color: PALETTE.waypoint }),
  );
  scene.add(beacon, marker);

  const carMeshes = new Map();
  const personMeshes = new Map();
  const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 900);
  const cam = { yaw: 0, pitch: 0.32, distance: 11, target: new THREE.Vector3(), position: new THREE.Vector3(0, 8, -14) };
  let shotCamera = null;

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    renderer.setSize(width, height, false);
    camera.aspect = window.innerWidth / Math.max(1, window.innerHeight);
    camera.updateProjectionMatrix();
  }

  function syncCars(state, dt) {
    const seen = new Set();
    for (const car of state.cars) {
      seen.add(car.id);
      let mesh = carMeshes.get(car.id);
      if (!mesh) {
        mesh = buildCarMesh(car.kind, car.color);
        carMeshes.set(car.id, mesh);
        scene.add(mesh.group);
      }
      mesh.group.position.set(car.x, 0, car.z);
      mesh.group.rotation.y = car.heading;
      const spin = (car.speed * dt) / 0.36;
      for (const wheel of mesh.wheels) wheel.rotation.x += spin;
      if (mesh.siren) {
        const phase = Math.sin(car.sirenPhase) > 0;
        mesh.siren.redMat.emissiveIntensity = phase ? 2.2 : 0.15;
        mesh.siren.blueMat.emissiveIntensity = phase ? 0.15 : 2.2;
      }
    }
    for (const [id, mesh] of carMeshes) {
      if (!seen.has(id)) {
        scene.remove(mesh.group);
        carMeshes.delete(id);
      }
    }
  }

  function syncPerson(mesh, person, dt, isPlayer) {
    mesh.group.position.set(person.x, 0, person.z);
    if (person.state === 'down') {
      mesh.group.rotation.set(Math.PI / 2, person.heading, 0);
      return;
    }
    mesh.group.rotation.set(0, person.heading, 0);
    const moving = Math.abs(person.speed) > 0.3;
    const swing = moving ? Math.sin(person.walkPhase) * 0.55 : 0;
    mesh.leftLeg.rotation.x = swing;
    mesh.rightLeg.rotation.x = -swing;
    mesh.leftArm.rotation.x = -swing * 0.8;
    mesh.rightArm.rotation.x = swing * 0.8;
    if (isPlayer && person.punchTimer > 0.25) mesh.rightArm.rotation.x = -2.2;
  }

  function syncPeople(state, dt) {
    const seen = new Set();
    const player = state.player;
    let mesh = personMeshes.get('player');
    if (!mesh) {
      mesh = buildPersonMesh(PALETTE.player, true);
      personMeshes.set('player', mesh);
      scene.add(mesh.group);
    }
    mesh.group.visible = player.onFoot;
    if (player.onFoot) syncPerson(mesh, { ...player, walkPhase: state.time * 9 }, dt, true);
    for (const ped of state.peds) {
      const key = `ped-${ped.id}`;
      seen.add(key);
      let pm = personMeshes.get(key);
      if (!pm) {
        pm = buildPersonMesh(ped.color, false);
        personMeshes.set(key, pm);
        scene.add(pm.group);
      }
      syncPerson(pm, ped, dt, false);
    }
    for (const [key, pm] of personMeshes) {
      if (key !== 'player' && !seen.has(key)) {
        scene.remove(pm.group);
        personMeshes.delete(key);
      }
    }
  }

  function updateCamera(state, dt) {
    const player = state.player;
    if (shotCamera) {
      const target = new THREE.Vector3(shotCamera.target.x, shotCamera.target.y, shotCamera.target.z);
      const offset = new THREE.Vector3(
        Math.sin(shotCamera.yaw) * Math.cos(shotCamera.pitch),
        Math.sin(shotCamera.pitch),
        Math.cos(shotCamera.yaw) * Math.cos(shotCamera.pitch),
      ).multiplyScalar(shotCamera.distance);
      camera.position.copy(target).add(offset);
      camera.lookAt(target.x, target.y + 1.5, target.z);
      return;
    }
    const forward = new THREE.Vector3(Math.sin(player.heading), 0, Math.cos(player.heading));
    const baseDistance = player.onFoot ? 9 : 12;
    const distance = baseDistance + cam.distance - 11;
    const height = 4.2 + cam.pitch * 8;
    const behind = forward.clone().multiplyScalar(-distance);
    const side = new THREE.Vector3(Math.cos(player.heading), 0, -Math.sin(player.heading)).multiplyScalar(Math.sin(cam.yaw) * distance * 0.5);
    const desired = new THREE.Vector3(player.x, 0, player.z).add(behind).add(side);
    desired.y = height;
    const k = 1 - Math.exp(-6 * dt);
    cam.position.lerp(desired, k);
    cam.target.lerp(new THREE.Vector3(player.x, 1.8, player.z).add(forward.clone().multiplyScalar(5)), k);
    camera.position.copy(cam.position);
    camera.lookAt(cam.target);
  }

  /** Paint one frame of the world. `dt` is the frame time, for wheel spin and the beacon. */
  function draw(state, dt) {
    syncCars(state, dt);
    syncPeople(state, dt);
    const waypoint = state.waypoint;
    beacon.visible = !!waypoint;
    marker.visible = !!waypoint;
    if (waypoint) {
      beacon.position.set(waypoint.x, 17, waypoint.z);
      marker.position.set(waypoint.x, 6 + Math.sin(state.time * 2) * 0.6, waypoint.z);
      marker.rotation.y = state.time * 1.5;
    }
    sun.position.set(state.player.x + 80, 110, state.player.z + 40);
    sun.target.position.set(state.player.x, 0, state.player.z);
    updateCamera(state, dt);
    renderer.render(scene, camera);
  }

  resize();
  window.addEventListener('resize', resize);
  return {
    draw,
    resize,
    get cameraYaw() {
      return cam.yaw;
    },
    /** Orbit the camera: drag deltas from the input, applied to the follow camera. */
    applyOrbit(yawDelta, pitchDelta, zoomDelta) {
      cam.yaw += yawDelta;
      cam.pitch = Math.max(-0.1, Math.min(0.55, cam.pitch + pitchDelta));
      cam.distance = Math.max(7, Math.min(19, cam.distance + zoomDelta));
    },
    /** Fix the camera for a staged screenshot; null returns to the follow camera. */
    setShotCamera(spec) {
      shotCamera = spec;
    },
    get camera() {
      return camera;
    },
  };
}
