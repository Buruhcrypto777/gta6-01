// Solmar Bay — meshes for the seeded city: textured ground, varied towers,
// neon signs, ocean, marina, palms and street props. The ground is one big
// canvas texture (sidewalks, lane markings, crosswalks, parks, sand), so no
// frame is ever a bare grey plane.
import { WORLD } from './config.js';

function makeCanvas(w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  return { canvas, ctx: canvas.getContext('2d') };
}

function textTexture(THREE, text, color) {
  const { canvas, ctx } = makeCanvas(512, 128);
  ctx.clearRect(0, 0, 512, 128);
  ctx.font = 'bold 84px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = color;
  ctx.shadowBlur = 26;
  ctx.fillStyle = color;
  ctx.fillText(text, 256, 66);
  ctx.shadowBlur = 6;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, 256, 66);
  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 4;
  return tex;
}

function windowTexture(THREE) {
  // Fixed seed so the same windows light up on every run.
  let s = 1234567;
  const srnd = () => {
    s = (Math.imul(s, 1103515245) + 12345) | 0;
    return (s >>> 0) / 4294967296;
  };
  const { canvas, ctx } = makeCanvas(128, 256);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 128, 256);
  for (let y = 8; y < 248; y += 18) {
    for (let x = 8; x < 120; x += 18) {
      const lit = srnd() < 0.28;
      ctx.fillStyle = lit ? '#ffd27d' : '#2a3542';
      ctx.fillRect(x, y, 11, 12);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 4;
  return tex;
}

export function buildCity(THREE, scene, data) {
  const S = 640; // ground plane size, metres
  const px = 2048 / S; // texture pixels per metre
  const toPx = (v) => (v + S / 2) * px;

  // --- Ground texture: sidewalks, roads with markings, crosswalks, parks, sand.
  const ground = makeCanvas(2048, 2048);
  const g = ground.ctx;
  g.fillStyle = '#93989c';
  g.fillRect(0, 0, 2048, 2048);
  // Block pavements: slightly varied warm tones with a tile grid.
  const tones = ['#a8a49a', '#9d998f', '#b0a894', '#a39a8c', '#a8a08e'];
  let ti = 0;
  for (const cx of data.blockCenters) {
    for (const cz of data.blockCenters) {
      g.fillStyle = tones[ti++ % tones.length];
      g.fillRect(toPx(cx - 17), toPx(cz - 17), 34 * px, 34 * px);
      g.strokeStyle = 'rgba(0,0,0,0.10)';
      g.lineWidth = 1;
      for (let k = -17; k <= 17; k += 5.6) {
        g.beginPath(); g.moveTo(toPx(cx + k), toPx(cz - 17)); g.lineTo(toPx(cx + k), toPx(cz + 17)); g.stroke();
        g.beginPath(); g.moveTo(toPx(cx - 17), toPx(cz + k)); g.lineTo(toPx(cx + 17), toPx(cz + k)); g.stroke();
      }
    }
  }
  // Parks.
  for (const p of data.parks) {
    g.fillStyle = '#5d8a4a';
    g.fillRect(toPx(p.x - 17), toPx(p.z - 17), 34 * px, 34 * px);
    g.fillStyle = '#6f9a55';
    g.fillRect(toPx(p.x - 17), toPx(p.z - 2), 34 * px, 4 * px);
    g.fillRect(toPx(p.x - 2), toPx(p.z - 17), 4 * px, 34 * px);
  }
  // Beach sand + wet band.
  g.fillStyle = '#e6cf9e';
  g.fillRect(0, toPx(WORLD.beachZ), 2048, toPx(WORLD.oceanZ) - toPx(WORLD.beachZ));
  g.fillStyle = '#cbb27e';
  g.fillRect(0, toPx(WORLD.oceanZ - 6), 2048, 6 * px);
  // Sea floor under the ocean plane.
  g.fillStyle = '#14506b';
  g.fillRect(0, toPx(WORLD.oceanZ), 2048, 2048 - toPx(WORLD.oceanZ));
  // Roads: asphalt with centre dashes and crosswalks at every crossing.
  g.fillStyle = '#2e3237';
  for (const line of data.roadLines) {
    g.fillRect(toPx(line - 6), 0, 12 * px, 2048);
    g.fillRect(0, toPx(line - 6), 2048, 12 * px);
  }
  for (const line of data.roadLines) {
    // Dashes along each road.
    g.fillStyle = '#e8c33c';
    for (let t = -WORLD.half; t < WORLD.half; t += 8) {
      g.fillRect(toPx(line) - 1, toPx(t), 2, 4 * px);
    }
    g.fillStyle = '#dfe3e6';
    for (let t = -WORLD.half; t < WORLD.half; t += 8) {
      g.fillRect(toPx(t), toPx(line) - 1, 4 * px, 2);
    }
    // Crosswalks where roads cross.
    g.fillStyle = 'rgba(255,255,255,0.85)';
    for (const other of data.roadLines) {
      for (let s = -5; s <= 5; s += 2.4) {
        g.fillRect(toPx(other + s) - 1, toPx(line - 6), 2, 3 * px);
        g.fillRect(toPx(other + s) - 1, toPx(line + 3), 2, 3 * px);
        g.fillRect(toPx(line - 6), toPx(other + s) - 1, 3 * px, 2);
        g.fillRect(toPx(line + 3), toPx(other + s) - 1, 3 * px, 2);
      }
    }
  }
  const groundTex = new THREE.CanvasTexture(ground.canvas);
  groundTex.anisotropy = 8;
  const groundMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(S, S),
    new THREE.MeshLambertMaterial({ map: groundTex }),
  );
  groundMesh.rotation.x = -Math.PI / 2;
  groundMesh.position.set(0, 0, 0);
  scene.add(groundMesh);

  // --- Buildings: varied heights, colours, window texture, neon signs.
  const winTex = windowTexture(THREE);
  const buildingMeshes = [];
  const colliders = [];
  const neonMats = [];
  const neonColors = ['#ff2d95', '#22d3ee', '#ffd166', '#ff5e3a', '#c084fc', '#34d399'];
  let ni = 0;
  for (const b of data.buildings) {
    const mat = new THREE.MeshLambertMaterial({ color: b.color, map: winTex });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, b.d), mat);
    mesh.position.set(b.x, b.h / 2, b.z);
    scene.add(mesh);
    buildingMeshes.push(mesh);
    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(b.w * 0.92, 1.2, b.d * 0.92),
      new THREE.MeshLambertMaterial({ color: b.roof }),
    );
    roof.position.set(b.x, b.h + 0.6, b.z);
    scene.add(roof);
    buildingMeshes.push(roof);
    colliders.push({ minX: b.x - b.w / 2, maxX: b.x + b.w / 2, minZ: b.z - b.d / 2, maxZ: b.z + b.d / 2 });
    if (b.neon) {
      const color = neonColors[ni++ % neonColors.length];
      const tex = textTexture(THREE, b.neon, color);
      const signMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
      neonMats.push(signMat);
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(26, b.w + 6), 6.5), signMat);
      // Face the nearest road: pick the side with the smaller |offset|.
      const faceX = Math.abs(b.x % 46) < 23;
      sign.position.set(b.x, Math.max(10, b.h * 0.72), b.z + (faceX ? 0 : b.d / 2 + 0.15));
      if (!faceX) sign.position.z = b.z + b.d / 2 + 0.15;
      else sign.position.set(b.x + b.w / 2 + 0.15, Math.max(10, b.h * 0.72), b.z);
      if (!faceX) sign.rotation.y = 0;
      else sign.rotation.y = Math.PI / 2;
      scene.add(sign);
    }
  }

  // --- Ocean: translucent plane + moving wave stripes.
  const ocean = new THREE.Mesh(
    new THREE.PlaneGeometry(S, 170),
    new THREE.MeshPhongMaterial({ color: '#1d6f8e', transparent: true, opacity: 0.88, shininess: 140 }),
  );
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.set(0, 0.12, WORLD.oceanZ + 85);
  scene.add(ocean);
  const wave = makeCanvas(256, 256);
  wave.ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  wave.ctx.lineWidth = 3;
  for (let y = 0; y < 256; y += 32) {
    wave.ctx.beginPath();
    for (let x = 0; x <= 256; x += 16) wave.ctx.lineTo(x, y + Math.sin(x / 40) * 6);
    wave.ctx.stroke();
  }
  const waveTex = new THREE.CanvasTexture(wave.canvas);
  waveTex.wrapS = THREE.RepeatWrapping;
  waveTex.wrapT = THREE.RepeatWrapping;
  waveTex.repeat.set(10, 3);
  const waveMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(S, 170),
    new THREE.MeshBasicMaterial({ map: waveTex, transparent: true, opacity: 0.35 }),
  );
  waveMesh.rotation.x = -Math.PI / 2;
  waveMesh.position.set(0, 0.18, WORLD.oceanZ + 85);
  scene.add(waveMesh);

  // --- Marina: wooden docks and bobbing boats.
  const boats = [];
  const dockMat = new THREE.MeshLambertMaterial({ color: '#7a5a34' });
  for (const dx of [-60, 0, 60]) {
    const dock = new THREE.Mesh(new THREE.BoxGeometry(4, 0.7, 26), dockMat);
    dock.position.set(dx, 0.35, 184);
    scene.add(dock);
    for (const bz of [178, 190]) {
      const boat = new THREE.Group();
      const hull = new THREE.Mesh(
        new THREE.BoxGeometry(2.4, 1, 7),
        new THREE.MeshLambertMaterial({ color: '#f2f2f2' }),
      );
      hull.position.y = 0.5;
      boat.add(hull);
      const cabin = new THREE.Mesh(
        new THREE.BoxGeometry(1.8, 0.9, 2.4),
        new THREE.MeshLambertMaterial({ color: '#2471a3' }),
      );
      cabin.position.set(0, 1.4, -0.6);
      boat.add(cabin);
      const mast = new THREE.Mesh(
        new THREE.CylinderGeometry(0.07, 0.07, 5, 6),
        new THREE.MeshLambertMaterial({ color: '#5a4632' }),
      );
      mast.position.set(0, 3.4, 0.8);
      boat.add(mast);
      const sail = new THREE.Mesh(
        new THREE.PlaneGeometry(2.6, 3.4),
        new THREE.MeshLambertMaterial({ color: '#fff7e0', side: THREE.DoubleSide }),
      );
      sail.position.set(0, 3.2, 0.8);
      boat.add(sail);
      boat.position.set(dx + (bz === 178 ? -3.4 : 3.4), 0.1, bz);
      boat.rotation.y = Math.PI / 2;
      scene.add(boat);
      boats.push({ group: boat, phase: boats.length * 1.7 });
    }
  }

  // --- Palms: beach row, parks and sidewalks.
  const palmTrunk = new THREE.MeshLambertMaterial({ color: '#6b4a2f' });
  const palmLeaf = new THREE.MeshLambertMaterial({ color: '#2e8b57', side: THREE.DoubleSide });
  function palm(x, z, s) {
    const g2 = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.3, 6, 6), palmTrunk);
    trunk.position.y = 3;
    g2.add(trunk);
    for (let i = 0; i < 6; i += 1) {
      const frond = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.7), palmLeaf);
      frond.position.y = 6.1;
      frond.rotation.y = (i / 6) * Math.PI * 2;
      frond.rotation.z = 0.5;
      frond.translateX(1);
      g2.add(frond);
    }
    g2.position.set(x, 0, z);
    g2.scale.setScalar(s);
    scene.add(g2);
  }
  for (let x = -130; x <= 130; x += 22) palm(x, 168, 1 + ((x * 7) % 3) * 0.1);
  for (const p of data.parks) {
    palm(p.x - 10, p.z - 8, 1);
    palm(p.x + 11, p.z + 9, 0.9);
    palm(p.x + 9, p.z - 10, 1.1);
  }

  // --- Lamps, hydrants, benches, crates.
  const lampPole = new THREE.MeshLambertMaterial({ color: '#2c3e50' });
  const lampGlow = new THREE.MeshBasicMaterial({ color: '#ffd27d' });
  let lampCount = 0;
  for (const line of data.roadLines) {
    for (let t = -120; t <= 120; t += 46) {
      if (lampCount >= 44) break;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 4.6, 6), lampPole);
      pole.position.set(line + 7.2, 2.3, t);
      scene.add(pole);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), lampGlow);
      bulb.position.set(line + 7.2, 4.7, t);
      scene.add(bulb);
      lampCount += 1;
    }
  }
  const hydMat = new THREE.MeshLambertMaterial({ color: '#c0392b' });
  for (let i = 0; i < 16; i += 1) {
    const hx = data.roadLines[i % data.roadLines.length] + 7;
    const hz = -115 + i * 15;
    const hyd = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.8, 8), hydMat);
    hyd.position.set(hx, 0.4, hz);
    scene.add(hyd);
  }
  const benchMat = new THREE.MeshLambertMaterial({ color: '#8a6d3b' });
  for (const p of data.parks) {
    const bench = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.5, 0.7), benchMat);
    bench.position.set(p.x, 0.55, p.z + 4);
    scene.add(bench);
  }

  let t = 0;
  return {
    buildings: buildingMeshes,
    colliders,
    update(dt) {
      t += dt;
      waveTex.offset.x = (t * 0.02) % 1;
      waveTex.offset.y = (t * 0.008) % 1;
      for (const b of boats) {
        b.group.position.y = 0.1 + Math.sin(t * 0.9 + b.phase) * 0.14;
        b.group.rotation.z = Math.sin(t * 0.7 + b.phase) * 0.03;
      }
      // One neon sign flickers, like a real tired tube.
      if (neonMats.length > 0) {
        const m = neonMats[Math.floor(t * 2) % neonMats.length];
        m.opacity = Math.sin(t * 9) > -0.86 ? 1 : 0.25;
      }
    },
  };
}
