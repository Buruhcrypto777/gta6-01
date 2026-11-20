// Solmar Bay — every vehicle mesh, built from boxes: body, cabin, wheels,
// lights, spoilers and light bars. One factory per type so traffic, police and
// the player all drive the same detailed cars.
const THREE = window.THREE;
import { CFG } from './config.js';

export const VEHICLE_TYPES = {
  sedan: { w: 2.1, bodyH: 0.72, cabinH: 0.62, len: 4.6, top: 46, accel: 26 },
  taxi: { w: 2.1, bodyH: 0.72, cabinH: 0.62, len: 4.6, top: 44, accel: 25 },
  sports: { w: 2.2, bodyH: 0.58, cabinH: 0.5, len: 4.4, top: 54, accel: 32 },
  van: { w: 2.3, bodyH: 1.5, cabinH: 0.0, len: 5.2, top: 38, accel: 20 },
  truck: { w: 2.4, bodyH: 0.8, cabinH: 0.9, len: 6.4, top: 36, accel: 18 },
  police: { w: 2.15, bodyH: 0.72, cabinH: 0.62, len: 4.8, top: 50, accel: 30 },
};

const paintMat = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.55 });
const glassMat = new THREE.MeshStandardMaterial({ color: 0x18242e, roughness: 0.12, metalness: 0.8 });
const tyreMat = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.95, metalness: 0 });
const chromeMat = new THREE.MeshStandardMaterial({ color: 0xd8dde2, roughness: 0.25, metalness: 0.9 });
const lightFrontMat = new THREE.MeshStandardMaterial({ color: 0xfff2c0, emissive: 0xffedb0, emissiveIntensity: 1.6 });
const lightRearMat = new THREE.MeshStandardMaterial({ color: 0xaa0f0f, emissive: 0xff1a1a, emissiveIntensity: 1.2 });

function box(w, h, d, mat, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
  return m;
}

function makeWheel(x, z) {
  const g = new THREE.Group();
  const tyre = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 14), tyreMat);
  tyre.rotation.z = Math.PI / 2; tyre.castShadow = true;
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.32, 10), chromeMat);
  hub.rotation.z = Math.PI / 2;
  g.add(tyre, hub); g.position.set(x, 0.42, z);
  return g;
}

export function makeCarMesh(typeName, color) {
  const t = VEHICLE_TYPES[typeName] || VEHICLE_TYPES.sedan;
  const g = new THREE.Group();
  const paint = paintMat(color);
  const body = box(t.w, t.bodyH, t.len, paint, 0, 0.42 + t.bodyH / 2, 0);
  g.add(body);
  if (t.cabinH > 0) {
    const cabin = box(t.w - 0.25, t.cabinH, t.len * 0.48, glassMat, 0, 0.42 + t.bodyH + t.cabinH / 2 - 0.05, 0.15);
    g.add(cabin);
  } else {
    const strip = box(t.w - 0.1, 0.5, t.len * 0.4, glassMat, 0, 0.42 + t.bodyH + 0.2, 0.4);
    g.add(strip);
  }
  // Bumpers, grille and spoiler.
  g.add(box(t.w + 0.06, 0.22, 0.3, chromeMat, 0, 0.5, -t.len / 2 + 0.05));
  g.add(box(t.w + 0.06, 0.22, 0.3, chromeMat, 0, 0.5, t.len / 2 - 0.05));
  if (typeName === 'sports') g.add(box(t.w - 0.2, 0.08, 0.5, paint, 0, 1.05, t.len / 2 - 0.25));
  if (typeName === 'truck') g.add(box(t.w - 0.2, 1.4, 3.4, paintMat(0xe8e2d4), 0, 1.5, 1.1));
  // Headlights and taillights.
  for (const sx of [-1, 1]) {
    g.add(box(0.34, 0.16, 0.08, lightFrontMat, sx * (t.w / 2 - 0.35), 0.72, -t.len / 2 - 0.02));
    g.add(box(0.34, 0.16, 0.08, lightRearMat, sx * (t.w / 2 - 0.35), 0.72, t.len / 2 + 0.02));
  }
  // Wheels.
  const wheels = {};
  wheels.fl = makeWheel(-(t.w / 2 - 0.05), -t.len / 2 + 1.05);
  wheels.fr = makeWheel(t.w / 2 - 0.05, -t.len / 2 + 1.05);
  wheels.rl = makeWheel(-(t.w / 2 - 0.05), t.len / 2 - 1.05);
  wheels.rr = makeWheel(t.w / 2 - 0.05, t.len / 2 - 1.05);
  for (const w of Object.values(wheels)) g.add(w);
  if (typeName === 'taxi') {
    g.add(box(0.9, 0.28, 0.5, new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0xffc93c, emissiveIntensity: 0.9 }), 0, 0.42 + t.bodyH + t.cabinH + 0.1, 0.1));
  }
  if (typeName === 'police') {
    const bar = box(1.1, 0.16, 0.34, new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4 }), 0, 0.42 + t.bodyH + t.cabinH + 0.02, 0.1);
    g.add(bar);
    const red = box(0.45, 0.2, 0.36, new THREE.MeshStandardMaterial({ color: 0xcc0000, emissive: 0xff0000, emissiveIntensity: 2.5 }), -0.28, 0.42 + t.bodyH + t.cabinH + 0.04, 0.1);
    const blue = box(0.45, 0.2, 0.36, new THREE.MeshStandardMaterial({ color: 0x0044cc, emissive: 0x2266ff, emissiveIntensity: 2.5 }), 0.28, 0.42 + t.bodyH + t.cabinH + 0.04, 0.1);
    red.name = 'sirenRed'; blue.name = 'sirenBlue';
    g.add(red, blue);
    // Black-and-white doors: dark lower body band.
    g.add(box(t.w + 0.02, 0.34, t.len * 0.55, new THREE.MeshStandardMaterial({ color: 0x1a1a22, roughness: 0.5 }), 0, 0.62, 0.1));
  }
  g.userData = { type: typeName, wheels, top: t.top, accel: t.accel, radius: CFG.car.radius, sirenRed: g.getObjectByName('sirenRed'), sirenBlue: g.getObjectByName('sirenBlue') };
  return g;
}

export function makeHelicopterMesh() {
  const g = new THREE.Group();
  const paint = paintMat(0xdfe6ee); // light police livery: visible against the sky
  const body = box(2.2, 1.5, 4.6, paint, 0, 0, 0);
  g.add(body);
  const nose = box(1.8, 1.1, 1.4, glassMat, 0, 0.1, -2.6);
  g.add(nose);
  const tail = box(0.7, 0.7, 5.2, paint, 0, 0.35, 4.4);
  g.add(tail);
  const fin = box(0.18, 1.6, 1.1, paint, 0, 1.0, 6.8);
  g.add(fin);
  const rotor = new THREE.Group();
  for (const a of [0, Math.PI / 2]) {
    const blade = box(11, 0.08, 0.5, new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.5 }), 0, 0, 0);
    blade.rotation.y = a; rotor.add(blade);
  }
  rotor.position.y = 1.15; rotor.name = 'rotor';
  g.add(rotor);
  const tailRotor = new THREE.Group();
  for (const a of [0, Math.PI / 2]) {
    const blade = box(0.08, 2.0, 0.3, new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.5 }), 0, 0, 0);
    blade.rotation.x = a; tailRotor.add(blade);
  }
  tailRotor.position.set(0.5, 1.0, 6.8); tailRotor.name = 'tailRotor';
  g.add(tailRotor);
  // Skids.
  for (const sx of [-1, 1]) g.add(box(0.14, 0.14, 3.6, chromeMat, sx * 1.0, -0.95, 0));
  // Searchlight cone under the nose.
  const cone = new THREE.Mesh(new THREE.ConeGeometry(3.2, 16, 20, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff6c0, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false }));
  cone.rotation.x = Math.PI; cone.position.set(0, -8, -2); cone.name = 'beam';
  g.add(cone);
  const spot = new THREE.SpotLight(0xfff2b0, 60, 60, 0.32, 0.5, 1.2);
  spot.position.set(0, -1, -2); spot.target.position.set(0, -16, -2);
  g.add(spot, spot.target);
  g.userData = { rotor, tailRotor };
  return g;
}

// Spin wheels with speed, steer the front pair, flash the siren bar.
export function updateCarVisual(mesh, steer, speed, dt, time) {
  const w = mesh.userData.wheels; if (!w) return;
  const spin = (speed * dt) / 0.42;
  for (const k of ['fl', 'fr', 'rl', 'rr']) {
    const wheel = w[k];
    wheel.children[0].rotation.x += spin; wheel.children[1].rotation.x += spin;
  }
  w.fl.rotation.y = steer * 0.42; w.fr.rotation.y = steer * 0.42;
  const u = mesh.userData;
  if (u.sirenRed && u.sirenBlue) {
    const on = Math.sin(time * 14) > 0;
    u.sirenRed.material.emissiveIntensity = on ? 3.2 : 0.25;
    u.sirenBlue.material.emissiveIntensity = on ? 0.25 : 3.2;
  }
}
