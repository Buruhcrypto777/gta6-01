// Solmar Bay — Mara Voss, getaway driver. On foot she walks the streets;
// in a car she drives it. One object owns the position, the heading and the
// little low-poly person mesh, so the camera, the police and the HUD all
// read the same truth.
import { SPEEDS, WORLD } from './config.js';
import { driveStep } from './vehicles.js';

export function createPlayer(THREE, scene, spawn) {
  const group = new THREE.Group();
  const jacket = new THREE.MeshLambertMaterial({ color: '#2e86ab' });
  const dark = new THREE.MeshLambertMaterial({ color: '#22242a' });
  const skin = new THREE.MeshLambertMaterial({ color: '#e0ac69' });

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.85, 0.34), jacket);
  torso.position.y = 1.05;
  group.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), skin);
  head.position.y = 1.68;
  group.add(head);
  const hair = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.5), dark);
  hair.position.y = 1.86;
  group.add(hair);
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.7, 0.26), dark);
  legL.position.set(-0.15, 0.35, 0);
  group.add(legL);
  const legR = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.7, 0.26), dark);
  legR.position.set(0.15, 0.35, 0);
  group.add(legR);
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.7, 0.2), jacket);
  armL.position.set(-0.4, 1.05, 0);
  group.add(armL);
  const armR = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.7, 0.2), jacket);
  armR.position.set(0.4, 1.05, 0);
  group.add(armR);

  group.position.set(spawn.x, 0, spawn.z);
  scene.add(group);

  const player = {
    mesh: group,
    pos: group.position,
    heading: spawn.heading,
    speed: 0,
    car: null,
    onFoot: true,
    health: 100,
    lastDamageAt: -99,
    walkPhase: 0,

    walkStep(dt, f, s, camYaw, colliders) {
      const moving = f !== 0 || s !== 0;
      const speed = moving ? SPEEDS.walk : 0;
      this.speed = speed;
      if (moving) {
        const fx = Math.sin(camYaw);
        const fz = Math.cos(camYaw);
        const rx = Math.cos(camYaw);
        const rz = -Math.sin(camYaw);
        let mx = fx * f + rx * s;
        let mz = fz * f + rz * s;
        const len = Math.hypot(mx, mz) || 1;
        mx /= len;
        mz /= len;
        this.pos.x += mx * speed * dt;
        this.pos.z += mz * speed * dt;
        this.heading = Math.atan2(mx, mz);
        this.walkPhase += dt * 9;
        legL.rotation.x = Math.sin(this.walkPhase) * 0.55;
        legR.rotation.x = -Math.sin(this.walkPhase) * 0.55;
        armL.rotation.x = -Math.sin(this.walkPhase) * 0.4;
        armR.rotation.x = Math.sin(this.walkPhase) * 0.4;
      } else {
        legL.rotation.x = 0;
        legR.rotation.x = 0;
        armL.rotation.x = 0;
        armR.rotation.x = 0;
      }
      // Building collisions (circle vs AABB).
      const r = 0.5;
      for (const c of colliders) {
        if (this.pos.x > c.minX - r && this.pos.x < c.maxX + r && this.pos.z > c.minZ - r && this.pos.z < c.maxZ + r) {
          const pushL = this.pos.x - (c.minX - r);
          const pushR = (c.maxX + r) - this.pos.x;
          const pushB = this.pos.z - (c.minZ - r);
          const pushF = (c.maxZ + r) - this.pos.z;
          const m = Math.min(pushL, pushR, pushB, pushF);
          if (m === pushL) this.pos.x = c.minX - r;
          else if (m === pushR) this.pos.x = c.maxX + r;
          else if (m === pushB) this.pos.z = c.minZ - r;
          else this.pos.z = c.maxZ + r;
        }
      }
      const b = WORLD.bound;
      this.pos.x = Math.max(-b, Math.min(b, this.pos.x));
      this.pos.z = Math.max(-b, Math.min(b, this.pos.z));
      this.mesh.rotation.y = this.heading;
    },

    driveStep(dt, throttle, steer, colliders) {
      if (!this.car) return;
      driveStep(this.car, throttle, steer, dt, colliders);
      this.pos.copy(this.car.pos);
      this.heading = this.car.heading;
      this.speed = this.car.speed;
    },

    enterCar(car) {
      this.car = car;
      this.onFoot = false;
      this.mesh.visible = false;
      this.pos.copy(car.pos);
      this.heading = car.heading;
      this.speed = 0;
    },

    exitCar() {
      if (!this.car) return null;
      const car = this.car;
      this.car = null;
      this.onFoot = true;
      this.mesh.visible = true;
      // Step out on the driver's side.
      this.pos.set(car.pos.x - Math.cos(car.heading) * 2.2, 0, car.pos.z + Math.sin(car.heading) * 2.2);
      this.mesh.position.copy(this.pos);
      this.heading = car.heading;
      this.speed = 0;
      return car;
    },
  };
  return player;
}
