// Solmar Bay — the six vehicle types, their low-poly meshes, and the arcade
// driving model (accelerate, steer by speed, collide with building boxes).
import { WORLD } from './config.js';

export const VEHICLE_TYPES = [
  { name: 'Sedan', top: 26, accel: 14, len: 4.4, wid: 1.9 },
  { name: 'Coupe', top: 30, accel: 17, len: 4.1, wid: 1.8 },
  { name: 'Taxi', top: 24, accel: 13, len: 4.4, wid: 1.9 },
  { name: 'Truck', top: 20, accel: 10, len: 5.6, wid: 2.2 },
  { name: 'Van', top: 22, accel: 11, len: 4.8, wid: 2.0 },
  { name: 'Sport', top: 38, accel: 22, len: 4.2, wid: 1.9 },
];

function box(THREE, w, h, d, color, x, y, z) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshLambertMaterial({ color }),
  );
  m.position.set(x, y, z);
  return m;
}

export function createCarMesh(THREE, typeIndex, color) {
  const type = VEHICLE_TYPES[typeIndex % VEHICLE_TYPES.length];
  const group = new THREE.Group();
  const L = type.len;
  const W = type.wid;
  const paint = color || '#c0392b';
  const low = typeIndex === 5; // sport sits lower
  const bodyH = low ? 0.5 : 0.62;
  const bodyY = low ? 0.5 : 0.58;
  group.add(box(THREE, L, bodyH, W, paint, 0, bodyY, 0));
  // Cabin: glasshouse for cars, cab + bed for the truck.
  if (typeIndex === 3) {
    group.add(box(THREE, 1.3, 0.85, W * 0.92, paint, L / 2 - 1.1, bodyY + 0.6, 0));
    group.add(box(THREE, 1.2, 0.7, W * 0.9, '#1a2530', L / 2 - 1.05, bodyY + 0.62, 0));
    group.add(box(THREE, L * 0.42, 0.5, W * 0.9, '#3a3f46', -L * 0.22, bodyY + 0.5, 0));
  } else {
    group.add(box(THREE, L * 0.48, 0.5, W * 0.86, '#1a2530', -L * 0.05, bodyY + bodyH / 2 + 0.22, 0));
    group.add(box(THREE, L * 0.5, 0.1, W * 0.88, paint, -L * 0.05, bodyY + bodyH / 2 + 0.5, 0));
  }
  if (typeIndex === 5) {
    group.add(box(THREE, 0.18, 0.08, W * 0.9, '#111111', -L / 2 + 0.1, bodyY + 0.42, 0));
  }
  if (typeIndex === 2) {
    // Taxi roof sign.
    group.add(box(THREE, 0.7, 0.22, 0.4, '#f1c40f', -L * 0.05, bodyY + bodyH / 2 + 0.68, 0));
  }
  // Wheels.
  const wheelGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.26, 10);
  const wheelMat = new THREE.MeshLambertMaterial({ color: '#141414' });
  const wheels = [];
  for (const [wx, wz] of [[L * 0.32, W / 2], [L * 0.32, -W / 2], [-L * 0.32, W / 2], [-L * 0.32, -W / 2]]) {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(wx, 0.34, wz);
    group.add(wheel);
    wheels.push(wheel);
  }
  // Headlights and taillights.
  const headMat = new THREE.MeshBasicMaterial({ color: '#fff6c9' });
  const tailMat = new THREE.MeshBasicMaterial({ color: '#ff2d2d' });
  for (const wz of [-W / 2 + 0.25, W / 2 - 0.25]) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 0.3), headMat);
    h.position.set(L / 2 + 0.01, bodyY + 0.05, wz);
    group.add(h);
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 0.3), tailMat);
    t.position.set(-L / 2 - 0.01, bodyY + 0.05, wz);
    group.add(t);
  }
  group.userData.wheels = wheels;
  group.userData.type = type;
  return group;
}

// One arcade driving step. `car` carries mesh, pos (Vector3), heading,
// speed and type. Throttle -1..1, steer -1..1. Colliders are building AABBs.
export function driveStep(car, throttle, steer, dt, colliders) {
  const type = car.type;
  car.speed += throttle * type.accel * dt;
  if (throttle === 0) car.speed *= Math.max(0, 1 - 0.9 * dt);
  else car.speed *= Math.max(0, 1 - 0.12 * dt);
  if (car.speed > type.top) car.speed = type.top;
  if (car.speed < -9) car.speed = -9;
  const turn = steer * 1.9 * (car.speed / type.top) * (car.speed < 0 ? -1 : 1);
  car.heading += turn * dt;
  const fx = Math.sin(car.heading);
  const fz = Math.cos(car.heading);
  car.pos.x += fx * car.speed * dt;
  car.pos.z += fz * car.speed * dt;
  // Building collisions: circle vs AABB, push out along the shallow axis.
  const r = type.len / 2 - 0.3;
  for (const c of colliders) {
    if (car.pos.x > c.minX - r && car.pos.x < c.maxX + r && car.pos.z > c.minZ - r && car.pos.z < c.maxZ + r) {
      const pushL = car.pos.x - (c.minX - r);
      const pushR = (c.maxX + r) - car.pos.x;
      const pushB = car.pos.z - (c.minZ - r);
      const pushF = (c.maxZ + r) - car.pos.z;
      const m = Math.min(pushL, pushR, pushB, pushF);
      if (m === pushL) car.pos.x = c.minX - r;
      else if (m === pushR) car.pos.x = c.maxX + r;
      else if (m === pushB) car.pos.z = c.minZ - r;
      else car.pos.z = c.maxZ + r;
      car.speed *= 0.45;
    }
  }
  // World bounds.
  const b = WORLD.bound;
  car.pos.x = Math.max(-b, Math.min(b, car.pos.x));
  car.pos.z = Math.max(-b, Math.min(b, car.pos.z));
  car.mesh.position.copy(car.pos);
  car.mesh.rotation.y = car.heading;
  const spin = (car.speed * dt) / 0.34;
  for (const w of car.mesh.userData.wheels) w.rotation.y += spin;
}
