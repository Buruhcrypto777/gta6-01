// Solmar Bay — the car factory: six drivable vehicle types plus the
// police cruiser, all built from boxes, cylinders and emissive lights so
// they read clearly at a glance and cost few draw calls.
import { VEHICLE_STATS } from './config.js';

function box(w, h, d, color, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshLambertMaterial({ color }),
  );
  m.position.set(x, y, z);
  return m;
}

function wheel(x, z) {
  const w = new THREE.Mesh(
    new THREE.CylinderGeometry(0.36, 0.36, 0.28, 10),
    new THREE.MeshLambertMaterial({ color: 0x181818 }),
  );
  w.rotation.x = Math.PI / 2;
  w.position.set(x, 0.36, z);
  return w;
}

const LIGHT_FRONT = new THREE.MeshBasicMaterial({ color: 0xfff6c8 });
const LIGHT_REAR = new THREE.MeshBasicMaterial({ color: 0xff2a22 });
const GLASS = new THREE.MeshLambertMaterial({ color: 0x1d2f3d });

export function makeCarMesh(type, color) {
  const group = new THREE.Group();
  const stats = VEHICLE_STATS[type] || VEHICLE_STATS.sedan;
  const dark = new THREE.MeshLambertMaterial({ color });

  if (type === 'van') {
    group.add(box(2.0, 1.5, 4.6, color, 0, 1.05, 0));
    const cab = box(1.8, 0.7, 1.0, 0x1d2f3d, 0, 1.5, 1.7);
    cab.material = GLASS;
    group.add(cab);
  } else if (type === 'truck') {
    group.add(box(2.0, 0.9, 2.0, color, 0, 0.85, 1.3));
    const cab = box(1.9, 1.1, 1.4, color, 0, 1.7, 1.6);
    group.add(cab);
    const shield = box(1.7, 0.6, 0.1, 0x1d2f3d, 0, 1.75, 2.32);
    shield.material = GLASS;
    group.add(shield);
    group.add(box(1.9, 0.5, 2.6, 0x5a5a5a, 0, 0.9, -1.2));
  } else if (type === 'convertible') {
    group.add(box(2.0, 0.75, 4.4, color, 0, 0.75, 0));
    group.add(box(1.7, 0.5, 1.6, 0x2c1a12, 0, 1.05, -0.4));
    const shield = box(1.7, 0.55, 0.12, 0x1d2f3d, 0, 1.35, 1.3);
    shield.material = GLASS;
    shield.rotation.x = -0.25;
    group.add(shield);
  } else if (type === 'coupe') {
    group.add(box(1.95, 0.7, 4.6, color, 0, 0.7, 0));
    const cabin = box(1.7, 0.55, 2.0, 0x1d2f3d, 0, 1.2, -0.3);
    cabin.material = GLASS;
    group.add(cabin);
    const spoiler = box(1.8, 0.08, 0.4, 0x181818, 0, 1.05, -2.2);
    group.add(spoiler);
  } else {
    // sedan and taxi share the classic three-box shape.
    group.add(box(2.0, 0.85, 4.4, color, 0, 0.8, 0));
    const cabin = box(1.75, 0.7, 2.2, 0x1d2f3d, 0, 1.5, -0.2);
    cabin.material = GLASS;
    group.add(cabin);
    if (type === 'taxi') {
      const sign = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 0.28, 0.4),
        new THREE.MeshBasicMaterial({ color: 0xffe14d }),
      );
      sign.position.set(0, 2.0, -0.2);
      group.add(sign);
    }
  }

  if (type === 'police') {
    // Black-and-white cruiser with a red/blue light bar. Callers pass a
    // near-black body colour; the white door band makes it read as police.
    const door = box(2.02, 0.5, 2.0, 0xf2f2f2, 0, 0.85, 0);
    group.add(door);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.22, 0.4), new THREE.MeshLambertMaterial({ color: 0x222222 }));
    bar.position.set(0, 1.95, -0.2);
    group.add(bar);
    const red = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.2, 0.42), new THREE.MeshBasicMaterial({ color: 0xff2020 }));
    red.position.set(-0.33, 2.1, -0.2);
    group.add(red);
    const blue = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.2, 0.42), new THREE.MeshBasicMaterial({ color: 0x2040ff }));
    blue.position.set(0.33, 2.1, -0.2);
    group.add(blue);
  }

  // Wheels and lights, same for every type.
  group.add(wheel(-0.95, 1.45));
  group.add(wheel(0.95, 1.45));
  group.add(wheel(-0.95, -1.45));
  group.add(wheel(0.95, -1.45));
  const hl = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.08), LIGHT_FRONT);
  hl.position.set(-0.65, 0.75, 2.21);
  group.add(hl);
  const hr = hl.clone();
  hr.position.x = 0.65;
  group.add(hr);
  const tl = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.08), LIGHT_REAR);
  tl.position.set(-0.65, 0.75, -2.21);
  group.add(tl);
  const tr = tl.clone();
  tr.position.x = 0.65;
  group.add(tr);

  group.userData.stats = stats;
  return group;
}
