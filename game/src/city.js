// Solmar Bay — the city itself: blocks of buildings in varied colours and
// heights, neon signs, palms, lamps and street props.
// Facades are a handful of shared canvas textures (window grids with some
// lit windows), so ~150 buildings cost few textures; colour and height vary
// per building so no two streets look alike.
import { BUILDING_COLORS, WORLD } from './config.js';

function makeFacade(base, litRatio, rng) {
  const cv = document.createElement('canvas');
  cv.width = 128;
  cv.height = 256;
  const g = cv.getContext('2d');
  g.fillStyle = base;
  g.fillRect(0, 0, 128, 256);
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, 'rgba(255,255,255,0.14)');
  grad.addColorStop(1, 'rgba(0,0,0,0.22)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 256);
  const cols = 5;
  const rows = 10;
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const lit = rng.next() < litRatio;
      g.fillStyle = lit ? '#ffd98a' : '#2c3542';
      g.fillRect(8 + c * 24, 10 + r * 24, 15, 16);
    }
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeSignTexture(text, color) {
  const cv = document.createElement('canvas');
  cv.width = 512;
  cv.height = 128;
  const g = cv.getContext('2d');
  g.fillStyle = '#14090f';
  g.fillRect(0, 0, 512, 128);
  g.font = 'bold 72px Arial, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.shadowColor = color;
  g.shadowBlur = 28;
  g.fillStyle = color;
  g.fillText(text, 256, 66);
  g.shadowBlur = 8;
  g.fillStyle = '#ffffff';
  g.fillText(text, 256, 66);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const SIGNS = [
  ['CASINO', '#ff2fb3'],
  ['TROPICANA', '#21e6e6'],
  ['HOTEL SOLMAR', '#ffc44d'],
  ['PIER 9', '#5aa2ff'],
  ['SUNSET DINER', '#ff7a2f'],
  ['NEON MOTEL', '#ff5a8a'],
  ['BAY CLUB', '#7dff5a'],
  ['LUNA BAR', '#c07dff'],
];

export function buildCity(scene, rng) {
  const buildings = [];
  const facadeBases = ['#e8b04b', '#df7f5a', '#7fb3a8', '#f2e3c6', '#8fa3bf', '#d96a6a', '#c9b458', '#9db98a'];
  const facades = facadeBases.map((base) => makeFacade(base, 0.32, rng));
  const signTexs = SIGNS.map(([text, color]) => makeSignTexture(text, color));
  const roofMat = new THREE.MeshLambertMaterial({ color: 0x4a4640 });
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x7a5a3a });
  const frondMat = new THREE.MeshLambertMaterial({ color: 0x3f8f4f });
  const lampMat = new THREE.MeshLambertMaterial({ color: 0x2c2c30 });
  const lampGlowMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });

  let signIndex = 0;
  const blockCentres = [];
  for (let i = -5; i <= 4; i += 1) {
    for (let j = -5; j <= 3; j += 1) {
      const cx = i * WORLD.roadEvery + WORLD.roadEvery / 2;
      const cz = j * WORLD.roadEvery + WORLD.roadEvery / 2;
      if (cz > 150) continue;
      blockCentres.push({ x: cx, z: cz });
    }
  }

  for (const block of blockCentres) {
    const downtown = Math.abs(block.x) < 88 && Math.abs(block.z) < 88;
    const lots = downtown ? 4 : rng.chance(0.25) ? 0 : 3;
    for (let lot = 0; lot < lots; lot += 1) {
      if (!downtown && rng.chance(0.2)) continue; // empty lot: plaza or parking
      const lx = block.x + (lot % 2 === 0 ? -8 : 8);
      const lz = block.z + (lot < 2 ? -8 : 8);
      const w = rng.range(10, 15);
      const d = rng.range(10, 15);
      const h = downtown ? rng.range(18, 55) : rng.range(8, 20);
      const tex = rng.pick(facades);
      const mat = new THREE.MeshLambertMaterial({ map: tex });
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      mesh.position.set(lx, h / 2, lz);
      scene.add(mesh);
      // Roof cap and a rooftop box on tall towers.
      const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 0.7, d + 0.6), roofMat);
      roof.position.set(lx, h + 0.35, lz);
      scene.add(roof);
      if (h > 30 && rng.chance(0.6)) {
        const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.9, 4, 8), roofMat);
        tower.position.set(lx + w / 4, h + 2.6, lz - d / 4);
        scene.add(tower);
      }
      buildings.push({ x: lx, z: lz, w, d, h, mesh });
      // Neon sign on some downtown faces, facing the street.
      if (downtown && signIndex < SIGNS.length && rng.chance(0.55)) {
        const sign = new THREE.Mesh(
          new THREE.PlaneGeometry(Math.min(16, w + 2), 4),
          new THREE.MeshBasicMaterial({ map: signTexs[signIndex % signTexs.length], transparent: true }),
        );
        sign.position.set(lx, Math.min(h - 3, 14), lz + d / 2 + 0.15);
        scene.add(sign);
        signIndex += 1;
      }
    }
  }

  // The big CASINO tower at the downtown corner, with the tallest sign.
  const casino = new THREE.Mesh(
    new THREE.BoxGeometry(26, 48, 20),
    new THREE.MeshLambertMaterial({ map: facades[1] }),
  );
  casino.position.set(22, 24, -22);
  scene.add(casino);
  const casinoRoof = new THREE.Mesh(new THREE.BoxGeometry(27, 1, 21), roofMat);
  casinoRoof.position.set(22, 48.5, -22);
  scene.add(casinoRoof);
  const casinoSign = new THREE.Mesh(
    new THREE.PlaneGeometry(24, 6),
    new THREE.MeshBasicMaterial({ map: signTexs[0], transparent: true }),
  );
  casinoSign.position.set(22, 40, -22 + 10.2);
  scene.add(casinoSign);
  buildings.push({ x: 22, z: -22, w: 26, d: 20, h: 48, mesh: casino });

  // Street lamps at central intersections.
  for (let i = -4; i <= 4; i += 1) {
    for (let j = -4; j <= 3; j += 1) {
      if ((i + j) % 2 !== 0) continue;
      const x = i * WORLD.roadEvery + WORLD.roadWidth / 2 + 1.5;
      const z = j * WORLD.roadEvery + WORLD.roadWidth / 2 + 1.5;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 6.5, 6), lampMat);
      pole.position.set(x, 3.25, z);
      scene.add(pole);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 6), lampGlowMat);
      bulb.position.set(x, 6.6, z);
      scene.add(bulb);
    }
  }

  // Palms along the beach boardwalk and a few downtown streets.
  for (let i = 0; i < 46; i += 1) {
    const x = -200 + i * 9 + rng.range(-2, 2);
    const z = WORLD.beachAt - 6 + rng.range(-2, 2);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.34, 7, 6), trunkMat);
    trunk.position.set(x, 3.5, z);
    trunk.rotation.z = rng.range(-0.08, 0.08);
    scene.add(trunk);
    for (let f = 0; f < 5; f += 1) {
      const frond = new THREE.Mesh(new THREE.ConeGeometry(0.9, 3.4, 4), frondMat);
      const a = (f / 5) * Math.PI * 2;
      frond.position.set(x + Math.cos(a) * 1.2, 7.4, z + Math.sin(a) * 1.2);
      frond.rotation.z = Math.cos(a) * 1.1;
      frond.rotation.x = -Math.sin(a) * 1.1;
      scene.add(frond);
    }
  }
  // A few palms downtown for colour.
  for (let i = 0; i < 14; i += 1) {
    const x = rng.range(-150, 150);
    const z = rng.range(-150, 120);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 6, 6), trunkMat);
    trunk.position.set(x, 3, z);
    scene.add(trunk);
    const top = new THREE.Mesh(new THREE.ConeGeometry(1.6, 2.6, 5), frondMat);
    top.position.set(x, 7, z);
    scene.add(top);
  }

  // Benches and hydrants on the sidewalks, never mid-road.
  const benchMat = new THREE.MeshLambertMaterial({ color: 0x6a4a2a });
  const hydrantMat = new THREE.MeshLambertMaterial({ color: 0xc0392b });
  const propStreets = [];
  for (let k = -4; k <= 4; k += 1) propStreets.push(k * WORLD.roadEvery);
  for (let i = 0; i < 26; i += 1) {
    const street = rng.pick(propStreets);
    const alongX = rng.chance(0.5);
    const side = rng.chance(0.5) ? 1 : -1;
    const along = rng.range(-190, 150);
    const x = alongX ? along : street + side * (WORLD.roadWidth / 2 + 2.5);
    const z = alongX ? street + side * (WORLD.roadWidth / 2 + 2.5) : along;
    if (z > WORLD.beachAt - 4) continue;
    const bench = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.5, 0.7), benchMat);
    bench.position.set(x, 0.55, z);
    scene.add(bench);
  }
  for (let i = 0; i < 18; i += 1) {
    const street = rng.pick(propStreets);
    const alongX = rng.chance(0.5);
    const side = rng.chance(0.5) ? 1 : -1;
    const along = rng.range(-190, 150);
    const x = alongX ? along : street + side * (WORLD.roadWidth / 2 + 2.5);
    const z = alongX ? street + side * (WORLD.roadWidth / 2 + 2.5) : along;
    if (z > WORLD.beachAt - 4) continue;
    const hydrant = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 0.9, 8), hydrantMat);
    hydrant.position.set(x, 0.45, z);
    scene.add(hydrant);
  }

  return { buildings };
}
