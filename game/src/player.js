// Solmar Bay — Mara Voss on foot and behind the wheel.
// Third-person movement with a drag-orbit camera, arcade driving with
// building and traffic collision, and stealing any parked car with E.
// The mesh is a low-poly driver in a teal jacket; the walk swings her arms.
import { SPRINT_SPEED, VEHICLE_STATS, WALK_SPEED, WORLD } from './config.js';

function makeMara() {
  const group = new THREE.Group();
  const jacket = new THREE.MeshLambertMaterial({ color: 0x1f8a70 });
  const skin = new THREE.MeshLambertMaterial({ color: 0xe8b88a });
  const dark = new THREE.MeshLambertMaterial({ color: 0x2c3e50 });
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.8, 0.2), dark);
  legL.position.set(-0.11, 0.4, 0);
  const legR = legL.clone();
  legR.position.x = 0.11;
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.66, 0.32), jacket);
  torso.position.y = 1.13;
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.6, 0.18), jacket);
  armL.position.set(-0.36, 1.15, 0);
  const armR = armL.clone();
  armR.position.x = 0.36;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), skin);
  head.position.y = 1.66;
  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.23, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2.2),
    new THREE.MeshLambertMaterial({ color: 0x2a1a12 }),
  );
  hair.position.y = 1.68;
  group.add(legL, legR, torso, armL, armR, head, hair);
  group.userData = { legL, legR, armL, armR };
  return group;
}

export function createPlayer(scene, input, buildings, parked, traffic) {
  const mesh = makeMara();
  scene.add(mesh);
  const pos = new THREE.Vector3(0, 0, 40);
  let heading = Math.PI; // facing north, into downtown
  let camYaw = Math.PI;
  let camPitch = 0.32;
  let camDist = 8;
  let speed = 0; // signed m/s in a car, scalar on foot
  let vy = 0;
  let grounded = true;
  let walkTime = 0;
  let car = null; // { group, type, stats, parkedRef }
  let onHitPed = null;

  function blocked(nx, nz, radius) {
    for (const b of buildings) {
      if (Math.abs(nx - b.x) < b.w / 2 + radius && Math.abs(nz - b.z) < b.d / 2 + radius) return true;
    }
    return false;
  }

  function moveWithCollision(dx, dz, radius) {
    const nx = pos.x + dx;
    const nz = pos.z + dz;
    if (!blocked(nx, pos.z, radius)) pos.x = nx;
    if (!blocked(pos.x, nz, radius)) pos.z = nz;
    pos.x = Math.max(-212, Math.min(212, pos.x));
    pos.z = Math.max(-212, Math.min(212, pos.z));
  }

  return {
    pos,
    mesh,
    get car() {
      return car;
    },
    get speed() {
      return speed;
    },
    get heading() {
      return heading;
    },
    get onFoot() {
      return car === null;
    },
    onHitPed(callback) {
      onHitPed = callback;
    },
    setPosition(x, z, face = heading) {
      pos.set(x, 0, z);
      heading = face;
      camYaw = face;
      mesh.position.copy(pos);
      mesh.rotation.y = heading;
    },
    tryEnterCar() {
      if (car !== null) return null;
      const near = parked.nearest(pos.x, pos.z, 4.5);
      if (!near) return null;
      near.taken = true;
      car = { group: near.group, type: near.type, stats: VEHICLE_STATS[near.type], parkedRef: near };
      mesh.visible = false;
      pos.set(near.x, 0, near.z);
      heading = near.angle;
      speed = 0;
      return car;
    },
    exitCar() {
      if (car === null) return;
      const ref = car.parkedRef;
      if (ref) {
        ref.taken = false;
        ref.x = car.group.position.x;
        ref.z = car.group.position.z;
      }
      const side = { x: Math.cos(heading), z: -Math.sin(heading) };
      pos.set(car.group.position.x + side.x * 2.2, 0, car.group.position.z + side.z * 2.2);
      car = null;
      speed = 0;
      mesh.visible = true;
      mesh.position.copy(pos);
    },
    update(dt, camera, inputObj) {
      const inp = inputObj || input;
      const drag = inp.takeDrag();
      camYaw -= drag.x * 0.005;
      camPitch = Math.max(0.08, Math.min(0.9, camPitch + drag.y * 0.003));
      const mv = inp.moveVector();

      if (car !== null) {
        // --- driving ---
        const stats = car.stats;
        const fwd = mv.z < 0;
        const rev = mv.z > 0;
        if (fwd) speed += stats.accel * dt;
        else if (rev) speed -= (speed > 0 ? stats.brake : stats.accel * 0.6) * dt;
        else speed -= Math.sign(speed) * Math.min(Math.abs(speed), 8 * dt);
        speed = Math.max(-9, Math.min(stats.top, speed));
        const steer = (mv.x !== 0 ? mv.x : 0) * stats.turn * Math.min(1, Math.abs(speed) / 8);
        heading -= steer * Math.sign(speed) * dt;
        const dx = Math.sin(heading) * speed * dt;
        const dz = Math.cos(heading) * speed * dt;
        moveWithCollision(dx, dz, 1.4);
        // Nudge traffic cars we touch; knock peds over (the main loop scores it).
        for (const t of traffic.cars) {
          const d = Math.hypot(t.group.position.x - pos.x, t.group.position.z - pos.z);
          if (d < 3.4) {
            if (!t.touching && Math.abs(speed) > 2) speed *= 0.55;
            t.touching = true;
            t.pos += Math.sign(t.pos - (t.alongX ? pos.x : pos.z)) * 0.3;
          } else if (d > 4.5) {
            t.touching = false;
          }
        }
        car.group.position.set(pos.x, 0, pos.z);
        car.group.rotation.y = heading;
        camDist += (11 - camDist) * Math.min(1, dt * 3);
      } else {
        // --- on foot ---
        const target = inp.sprinting() ? SPRINT_SPEED : WALK_SPEED;
        const moving = mv.x !== 0 || mv.z !== 0;
        const wish = moving ? target : 0;
        speed += (wish - speed) * Math.min(1, dt * 10);
        if (moving) {
          const forward = { x: Math.sin(camYaw), z: Math.cos(camYaw) };
          const right = { x: -Math.cos(camYaw), z: Math.sin(camYaw) };
          const dx = (forward.x * -mv.z + right.x * mv.x) * speed * dt;
          const dz = (forward.z * -mv.z + right.z * mv.x) * speed * dt;
          moveWithCollision(dx, dz, 0.55);
          heading = Math.atan2(dx, dz);
          walkTime += dt * speed;
        }
        // Jump.
        if (inp.isDown('Space') && grounded) {
          vy = 5.2;
          grounded = false;
        }
        if (!grounded) {
          vy -= 18 * dt;
          pos.y += vy * dt;
          if (pos.y <= 0) {
            pos.y = 0;
            vy = 0;
            grounded = true;
          }
        }
        mesh.position.copy(pos);
        mesh.rotation.y = heading;
        const swing = moving ? Math.sin(walkTime * 2.4) * 0.55 : 0;
        mesh.userData.legL.rotation.x = swing;
        mesh.userData.legR.rotation.x = -swing;
        mesh.userData.armL.rotation.x = -swing * 0.8;
        mesh.userData.armR.rotation.x = swing * 0.8;
        camDist += (8 - camDist) * Math.min(1, dt * 3);
      }

      // --- chase camera ---
      const cx = pos.x - Math.sin(camYaw) * camDist * Math.cos(camPitch);
      const cz = pos.z - Math.cos(camYaw) * camDist * Math.cos(camPitch);
      const cy = pos.y + 2.2 + camDist * Math.sin(camPitch);
      camera.position.set(
        camera.position.x + (cx - camera.position.x) * Math.min(1, dt * 8),
        camera.position.y + (cy - camera.position.y) * Math.min(1, dt * 8),
        camera.position.z + (cz - camera.position.z) * Math.min(1, dt * 8),
      );
      camera.lookAt(pos.x, pos.y + 1.4, pos.z);
    },
  };
}
