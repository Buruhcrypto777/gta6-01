// Solmar Bay — everything the eye sees: the three.js scene, golden-hour sun
// with shadows, gradient sky and drifting clouds, the animated ocean, the
// painted ground (roads, sand, parks, crosswalks), the buildings with lit
// windows and neon signs, palms, lamps and the particle pool.
const THREE = window.THREE;
import { CFG, SUN } from './config.js';
import { mulberry32, range, pick } from './random.js';

function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

function windowTexture(variant, rx, ry) {
  // Golden-hour facades: warm tan, sandstone and pale concrete — a city in
  // late sun, not a night skyline. Windows are mostly dark glass, a third
  // lit warm, with a floor band every storey.
  const bases = ['#a8937a', '#9a8a76', '#b3a58c'];
  const base = bases[variant % bases.length];
  const t = canvasTexture(128, 128, (g) => {
    g.fillStyle = base; g.fillRect(0, 0, 128, 128);
    g.fillStyle = 'rgba(0,0,0,0.10)';
    for (let y = 0; y < 128; y += 16) g.fillRect(0, y + 14, 128, 2);
    for (let y = 8; y < 120; y += 16) for (let x = 8; x < 120; x += 16) {
      const lit = ((x * 7 + y * 13 + variant * 29) % 10) < 3;
      g.fillStyle = lit ? '#ffd27a' : '#2e3d4e';
      g.fillRect(x, y, 9, 10);
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry);
  return t;
}

export function createScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  if ('outputColorSpace' in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(CFG.palette.fog, 420, 2300);
  const camera = new THREE.PerspectiveCamera(CFG.camera.fov, 1, 0.5, 6000);
  const sunDir = new THREE.Vector3(Math.cos(SUN.elevation) * Math.cos(SUN.azimuth), Math.sin(SUN.elevation), Math.cos(SUN.elevation) * Math.sin(SUN.azimuth)).normalize();
  const sun = new THREE.DirectionalLight(SUN.color, SUN.intensity);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -260; sun.shadow.camera.right = 260;
  sun.shadow.camera.top = 260; sun.shadow.camera.bottom = -260;
  sun.shadow.camera.near = 50; sun.shadow.camera.far = 1600;
  sun.shadow.bias = -0.0006;
  scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight(SUN.hemiSky, SUN.hemiGround, SUN.hemiIntensity);
  scene.add(hemi);
  return { renderer, scene, camera, sun, sunDir };
}

export function followSun(R, pos) {
  R.sun.position.copy(pos).addScaledVector(R.sunDir, 700);
  R.sun.target.position.copy(pos);
}

export function buildSky(R) {
  const geo = new THREE.SphereGeometry(3200, 24, 16);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {
      top: { value: new THREE.Color(CFG.palette.skyTop) },
      horizon: { value: new THREE.Color(CFG.palette.skyHorizon) },
      sunDir: { value: R.sunDir },
      sunColor: { value: new THREE.Color(CFG.palette.sun) },
    },
    vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `varying vec3 vDir; uniform vec3 top; uniform vec3 horizon; uniform vec3 sunDir; uniform vec3 sunColor;
      void main(){ float h = clamp(vDir.y, 0.0, 1.0); vec3 c = mix(horizon, top, pow(h, 0.55));
      float s = max(dot(normalize(vDir), normalize(sunDir)), 0.0);
      c += sunColor * (pow(s, 220.0) * 1.4 + pow(s, 8.0) * 0.28);
      gl_FragColor = vec4(c, 1.0); }`,
  });
  R.scene.add(new THREE.Mesh(geo, mat));
  // Drifting clouds: clusters of flattened white puffs.
  const clouds = [];
  const cm = new THREE.MeshLambertMaterial({ color: 0xfff4e0, transparent: true, opacity: 0.85 });
  const rng = mulberry32(77);
  for (let i = 0; i < 12; i++) {
    const g = new THREE.Group();
    const n = 3 + Math.floor(rng() * 3);
    for (let k = 0; k < n; k++) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(range(rng, 18, 42), 10, 8), cm);
      s.position.set(range(rng, -60, 60), range(rng, -6, 6), range(rng, -24, 24));
      s.scale.y = 0.42; g.add(s);
    }
    g.position.set(range(rng, -1800, 1800), range(rng, 320, 520), range(rng, -1800, 1800));
    R.scene.add(g); clouds.push(g);
  }
  return { clouds, update(dt) { for (const c of clouds) { c.position.x += dt * 3.5; if (c.position.x > 2000) c.position.x = -2000; } } };
}

export function buildOcean(R) {
  const waveTex = canvasTexture(256, 256, (g) => {
    g.fillStyle = '#1d7f9e'; g.fillRect(0, 0, 256, 256);
    g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 3;
    for (let i = 0; i < 14; i++) {
      g.beginPath();
      for (let x = 0; x <= 256; x += 16) g.lineTo(x, 20 + i * 18 + Math.sin(x * 0.06 + i) * 6);
      g.stroke();
    }
  });
  waveTex.wrapS = waveTex.wrapT = THREE.RepeatWrapping; waveTex.repeat.set(6, 18);
  const mat = new THREE.MeshPhongMaterial({ color: CFG.palette.sea, map: waveTex, shininess: 120, specular: 0xffd9a0, transparent: true, opacity: 0.96 });
  const west = new THREE.Mesh(new THREE.PlaneGeometry(340, 2400), mat);
  west.rotation.x = -Math.PI / 2; west.position.set(-1050, 0.15, 0); west.receiveShadow = true;
  const south = new THREE.Mesh(new THREE.PlaneGeometry(2400, 140), mat.clone());
  south.rotation.x = -Math.PI / 2; south.position.set(0, 0.15, 1150); south.receiveShadow = true;
  R.scene.add(west, south);
  // Foam line where the waves meet the sand.
  const foam = new THREE.Mesh(new THREE.PlaneGeometry(10, 2400), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 }));
  foam.rotation.x = -Math.PI / 2; foam.position.set(-882, 0.3, 0);
  R.scene.add(foam);
  return { update(dt, t) { waveTex.offset.x = t * 0.008; waveTex.offset.y = t * 0.004; foam.material.opacity = 0.4 + Math.sin(t * 1.4) * 0.18; } };
}

export function buildGround(R, world) {
  // 4096 px for a 2400 m city: 1 px ≈ 0.59 m, so lane dashes, edge lines and
  // crosswalks can be drawn near real-world size instead of giant slabs.
  const S = 4096, H = CFG.worldHalf * 2, px = S / H;
  const toPx = (v) => (v + CFG.worldHalf) * px;
  const tex = canvasTexture(S, S, (g) => {
    g.fillStyle = '#b9b3a4'; g.fillRect(0, 0, S, S); // sidewalk base
    // Sand and sea.
    g.fillStyle = '#e8cf9a'; g.fillRect(0, 0, toPx(CFG.beachEdge), S);
    g.fillStyle = '#1d7f9e'; g.fillRect(0, 0, toPx(CFG.oceanEdge), S);
    g.fillStyle = '#1d7f9e'; g.fillRect(0, toPx(CFG.marinaEdge), S, S - toPx(CFG.marinaEdge));
    // Speckle the sand.
    g.fillStyle = 'rgba(180,150,90,0.5)';
    const rng = mulberry32(5);
    for (let i = 0; i < 900; i++) g.fillRect(rng() * toPx(CFG.beachEdge), rng() * S, 3, 3);
    // Parks.
    for (const p of world.parks) {
      g.fillStyle = '#6fae5e'; g.fillRect(toPx(p.x - p.w / 2), toPx(p.z - p.d / 2), p.w * px, p.d * px);
      g.fillStyle = '#9dbb6a';
      for (let i = 0; i < 40; i++) g.fillRect(toPx(p.x - p.w / 2) + rng() * p.w * px, toPx(p.z - p.d / 2) + rng() * p.d * px, 8, 8);
    }
    // Roads.
    g.fillStyle = '#3a3f46';
    for (const l of [-1120, -960, -800, -640, -480, -320, -160, 0, 160, 320, 480, 640, 800, 960, 1120]) {
      g.fillRect(toPx(l - 13), 0, 26 * px, S);
      g.fillRect(0, toPx(l - 13), S, 26 * px);
    }
    // Lane dashes and edge lines, near real-world size (dash 3.5 m, gap 14 m).
    const dashW = Math.max(1, Math.round(px * 0.4)), dashL = Math.round(px * 3.5);
    const edgeW = Math.max(1, Math.round(px * 0.3));
    g.fillStyle = '#ffc93c';
    for (const l of [-1120, -960, -800, -640, -480, -320, -160, 0, 160, 320, 480, 640, 800, 960, 1120]) {
      for (let v = -1160; v < 1160; v += 14) {
        g.fillRect(toPx(l) - dashW / 2, toPx(v), dashW, dashL);
        g.fillRect(toPx(v), toPx(l) - dashW / 2, dashL, dashW);
      }
    }
    g.fillStyle = '#e8e6df';
    for (const l of [-1120, -960, -800, -640, -480, -320, -160, 0, 160, 320, 480, 640, 800, 960, 1120]) {
      g.fillRect(toPx(l - 11), 0, edgeW, S); g.fillRect(toPx(l + 11), 0, edgeW, S);
      g.fillRect(0, toPx(l - 11), S, edgeW); g.fillRect(0, toPx(l + 11), S, edgeW);
    }
    // Crosswalks at intersections.
    const cwW = Math.round(px * 2.2), cwH = Math.round(px * 3), cwStep = Math.round(px * 5);
    for (const a of [-1120, -960, -800, -640, -480, -320, -160, 0, 160, 320, 480, 640, 800, 960, 1120]) {
      for (const b of [-1120, -960, -800, -640, -480, -320, -160, 0, 160, 320, 480, 640, 800, 960, 1120]) {
        for (let k = -2; k <= 2; k++) {
          g.fillRect(toPx(a + k * cwStep) - cwW / 2, toPx(b - 13), cwW, cwH);
          g.fillRect(toPx(a + k * cwStep) - cwW / 2, toPx(b + 3), cwW, cwH);
        }
      }
    }
    // Plaza paving.
    g.fillStyle = '#d9c9a3'; g.fillRect(toPx(0), toPx(0), 160 * px, 160 * px);
  });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(H, H), new THREE.MeshLambertMaterial({ map: tex }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
  R.scene.add(ground);
  return ground;
}

export function buildCity(R, world) {
  const rng = mulberry32(99);
  const winMats = {};
  const winMat = (variant, w, h) => {
    const key = `${variant}|${Math.round(w / 10)}|${Math.round(h / 14)}`;
    if (!winMats[key]) {
      winMats[key] = new THREE.MeshLambertMaterial({ map: windowTexture(variant, Math.max(1, Math.round(w / 14)), Math.max(1, Math.round(h / 14))) });
    }
    return winMats[key];
  };
  const roofMat = new THREE.MeshLambertMaterial({ color: 0x5a5148 });
  const group = new THREE.Group();
  for (const b of world.buildings) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, b.d), winMat((b.h | 0) % 3, b.w, b.h));
    m.position.set(b.x, b.h / 2, b.z); m.castShadow = true; m.receiveShadow = true;
    group.add(m);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(b.w * 0.86, 1.6, b.d * 0.86), roofMat);
    roof.position.set(b.x, b.h + 0.8, b.z); roof.castShadow = true;
    group.add(roof);
    if (b.h > 40) {
      const ac = new THREE.Mesh(new THREE.BoxGeometry(4, 2.4, 4), new THREE.MeshLambertMaterial({ color: 0x8a8f96 }));
      ac.position.set(b.x + b.w * 0.2, b.h + 2.8, b.z - b.d * 0.2); ac.castShadow = true;
      group.add(ac);
    }
  }
  R.scene.add(group);
  // Neon signs: glowing text planes + additive glow sprites.
  const neons = [];
  for (const s of world.signs) {
    const tex = canvasTexture(256, 48, (g) => {
      g.clearRect(0, 0, 256, 48);
      // Dark backing plate so the neon pops on a sunlit facade.
      g.fillStyle = 'rgba(12,12,22,0.88)';
      g.fillRect(0, 0, 256, 48);
      const col = `#${s.color.toString(16).padStart(6, '0')}`;
      g.font = 'bold 34px Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.shadowColor = col; g.shadowBlur = 18;
      g.fillStyle = col; g.fillText(s.text, 128, 24);
      g.shadowBlur = 4; g.fillStyle = '#ffffff'; g.fillText(s.text, 128, 24);
    });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(s.w, s.h), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
    plane.position.set(s.x, s.y, s.z); plane.rotation.y = s.rotY;
    R.scene.add(plane);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ color: s.color, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false }));
    glow.scale.set(s.w * 1.8, s.h * 3.2, 1); glow.position.copy(plane.position);
    R.scene.add(glow);
    neons.push({ plane, glow, phase: rng() * 6 });
  }
  // Palms: trunk + crown.
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x7a5a3a });
  const frondMat = new THREE.MeshLambertMaterial({ color: 0x3f9e4d });
  for (const p of world.palms) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.28 * p.s, 0.5 * p.s, 7 * p.s, 7), trunkMat);
    trunk.position.set(p.x, 3.5 * p.s, p.z); trunk.castShadow = true;
    const crown = new THREE.Mesh(new THREE.ConeGeometry(3.4 * p.s, 3.2 * p.s, 8), frondMat);
    crown.position.set(p.x, 7.6 * p.s, p.z); crown.castShadow = true;
    R.scene.add(trunk, crown);
  }
  // Street lamps: pole + warm glowing head.
  const poleMat = new THREE.MeshLambertMaterial({ color: 0x2c2f36 });
  const headMat = new THREE.MeshBasicMaterial({ color: 0xffe6a0 });
  for (const l of world.lamps) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 7, 6), poleMat);
    pole.position.set(l.x, 3.5, l.z); pole.castShadow = true;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 6), headMat);
    head.position.set(l.x, 7.2, l.z);
    R.scene.add(pole, head);
  }
  // Marina: pier planks and moored boats.
  const plankMat = new THREE.MeshLambertMaterial({ color: 0x8a6a4a });
  for (let i = 0; i < 5; i++) {
    const pier = new THREE.Mesh(new THREE.BoxGeometry(10, 1, 46), plankMat);
    pier.position.set(-400 + i * 200, 0.6, 1100); pier.castShadow = true; pier.receiveShadow = true;
    R.scene.add(pier);
  }
  const boatMat = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.4, metalness: 0.2 });
  const boatTrim = new THREE.MeshStandardMaterial({ color: 0x1d7f9e, roughness: 0.5 });
  for (let i = 0; i < 5; i++) {
    const boat = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.BoxGeometry(4, 1.4, 12), boatMat);
    hull.position.y = 0.7; boat.add(hull);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.2, 4), boatTrim);
    cab.position.set(0, 1.9, 1); boat.add(cab);
    boat.position.set(-400 + i * 200 + 14, 0.2, 1108);
    boat.rotation.y = (i % 2 ? 0.08 : -0.06);
    R.scene.add(boat);
  }
  return { neons, update(dt, t) { for (const n of neons) n.glow.material.opacity = 0.18 + Math.sin(t * 2.2 + n.phase) * 0.07; } };
}

// One Points pool for dust, smoke, sparks and muzzle flashes.
export function createParticles(R) {
  const MAX = 420;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(MAX * 3), col = new Float32Array(MAX * 3), size = new Float32Array(MAX);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('size', new THREE.BufferAttribute(size, 1));
  const dotTex = canvasTexture(64, 64, (g) => {
    const grad = g.createRadialGradient(32, 32, 2, 32, 32, 30);
    grad.addColorStop(0, 'rgba(255,255,255,1)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
  });
  const mat = new THREE.PointsMaterial({ size: 1, vertexColors: true, map: dotTex, transparent: true, opacity: 0.9, depthWrite: false, sizeAttenuation: true });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  R.scene.add(points);
  const parts = [];
  for (let i = 0; i < MAX; i++) parts.push({ life: 0, max: 1, x: 0, y: -100, z: 0, vx: 0, vy: 0, vz: 0, s: 1, r: 1, g: 1, b: 1 });
  let cursor = 0;
  const spawn = (x, y, z, o) => {
    const p = parts[cursor]; cursor = (cursor + 1) % MAX;
    p.x = x; p.y = y; p.z = z;
    p.vx = o.vx || 0; p.vy = o.vy || 0; p.vz = o.vz || 0;
    p.life = p.max = o.life || 0.7; p.s = o.size || 1.6;
    const c = new THREE.Color(o.color || 0xcccccc); p.r = c.r; p.g = c.g; p.b = c.b;
  };
  const burst = (x, y, z, o, n) => { for (let i = 0; i < n; i++) spawn(x + (Math.random() - 0.5) * (o.spread || 1), y + (Math.random() - 0.5) * 0.5, z + (Math.random() - 0.5) * (o.spread || 1), { ...o, vx: (Math.random() - 0.5) * (o.kick || 6), vy: Math.random() * (o.up || 4), vz: (Math.random() - 0.5) * (o.kick || 6) }); };
  return {
    dust(x, y, z) { burst(x, y, z, { color: 0xcbb98a, life: 0.8, size: 2.2, kick: 3, up: 1.5, spread: 1.2 }, 3); },
    smoke(x, y, z) { burst(x, y, z, { color: 0x555555, life: 1.4, size: 3.0, kick: 1.5, up: 3.5, spread: 0.8 }, 2); },
    sparks(x, y, z) { burst(x, y, z, { color: 0xffc93c, life: 0.5, size: 1.1, kick: 12, up: 6, spread: 0.6 }, 8); },
    muzzle(x, y, z) { burst(x, y, z, { color: 0xffe9a0, life: 0.18, size: 2.6, kick: 2, up: 1, spread: 0.3 }, 4); },
    update(dt) {
      for (let i = 0; i < MAX; i++) {
        const p = parts[i];
        if (p.life > 0) {
          p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.vy -= dt * 1.5;
          const f = Math.max(0, p.life / p.max);
          pos[i * 3] = p.x; pos[i * 3 + 1] = Math.max(0.2, p.y); pos[i * 3 + 2] = p.z;
          col[i * 3] = p.r * f; col[i * 3 + 1] = p.g * f; col[i * 3 + 2] = p.b * f;
          size[i] = p.s * (0.5 + f);
        } else { pos[i * 3 + 1] = -100; size[i] = 0; }
      }
      geo.attributes.position.needsUpdate = true; geo.attributes.color.needsUpdate = true; geo.attributes.size.needsUpdate = true;
    },
  };
}
