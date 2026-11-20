// Solmar Bay — Mara Voss, getaway driver: on foot with WASD and a punch, in
// a car with arcade driving, steering, handbrake drifts and collisions. The
// chase camera follows behind and kicks its field of view with speed.
const THREE = window.THREE;
import { CFG } from './config.js';
import { makeCarMesh, updateCarVisual } from './vehicles.js';
import { pick } from './random.js';

function makePlayerMesh() {
  const g = new THREE.Group();
  const jacket = new THREE.MeshLambertMaterial({ color: 0xd94f3d });
  const jeans = new THREE.MeshLambertMaterial({ color: 0x2c3a4a });
  const skin = new THREE.MeshLambertMaterial({ color: 0xe8b88a });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.82, 0.36), jacket);
  torso.position.y = 1.18; torso.castShadow = true;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.27, 12, 10), skin);
  head.position.y = 1.84; head.castShadow = true;
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.29, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), new THREE.MeshLambertMaterial({ color: 0x2a1a12 }));
  hair.position.y = 1.88; hair.castShadow = true;
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.76, 0.24), jeans);
  legL.position.set(-0.17, 0.38, 0); legL.name = 'legL';
  const legR = legL.clone(); legR.position.x = 0.17; legR.name = 'legR';
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.62, 0.17), jacket);
  armL.position.set(-0.44, 1.22, 0); armL.name = 'armL';
  const armR = armL.clone(); armR.position.x = 0.44; armR.name = 'armR';
  g.add(torso, head, hair, legL, legR, armL, armR);
  g.userData = { legL, legR, armL, armR };
  return g;
}

export function createPlayer(G) {
  const mesh = makePlayerMesh();
  G.scene.add(mesh);
  const s = G.world.spawnPoints.player;
  const P = {
    mesh,
    pos: new THREE.Vector3(s.x, 0, s.z),
    heading: Math.PI * 0.75,
    speed: 0,
    onFoot: true,
    car: null, // {mesh, x, z, heading, speed, steer, type, color, traffic?}
    health: CFG.player.health,
    cash: 0,
    punchAnim: 0,
    camYaw: 0, camDist: CFG.camera.footDist, camHeight: CFG.camera.footHeight,
    camPos: new THREE.Vector3(s.x, 6, s.z + 10),
    enterCooldown: 0,
    damage(n) {
      P.health = Math.max(0, P.health - n);
      G.hud.setHealth(P.health);
      if (P.health <= 0) G.wasted();
    },
    heal(n) { P.health = Math.min(100, P.health + n); G.hud.setHealth(P.health); },
    enterCar(car) {
      if (!car || P.enterCooldown > 0) return false;
      if (car.isPolice) return false;
      P.car = car;
      P.onFoot = false;
      mesh.visible = false;
      P.camDist = CFG.camera.driveDist; P.camHeight = CFG.camera.driveHeight;
      G.audio.engineStart();
      return true;
    },
    exitCar() {
      if (!P.car || P.enterCooldown > 0) return;
      const c = P.car;
      P.car = null; P.onFoot = true;
      P.pos.set(c.x + Math.sin(c.heading + Math.PI / 2) * 2.4, 0, c.z + Math.cos(c.heading + Math.PI / 2) * 2.4);
      P.heading = c.heading;
      mesh.visible = true;
      P.enterCooldown = 0.6;
      P.camDist = CFG.camera.footDist; P.camHeight = CFG.camera.footHeight;
    },
    stealNearest() {
      if (!P.onFoot || P.enterCooldown > 0) return;
      const t = G.traffic.nearest(P.pos.x, P.pos.z, 5);
      if (t) {
        G.traffic.removeCar(t);
        const car = { mesh: t.mesh, x: t.x, z: t.z, heading: t.heading, speed: 0, steer: 0, type: t.type, color: 0xffffff, stolen: true };
        G.scene.add(car.mesh);
        P.enterCar(car);
        P.enterCooldown = 0.8;
        G.police.addWanted(CFG.wanted.steal, 'grand theft auto');
        G.hud.toast('Car stolen!');
        G.audio.jingle();
        return;
      }
      // Parked cars the world keeps near landmarks.
      const parked = G.parked.nearest(P.pos.x, P.pos.z, 5);
      if (parked) {
        G.parked.remove(parked);
        const car = { mesh: parked.mesh, x: parked.x, z: parked.z, heading: parked.heading, speed: 0, steer: 0, type: parked.type, color: 0xffffff, stolen: true };
        G.scene.add(car.mesh);
        P.enterCar(car);
        P.enterCooldown = 0.8;
        G.police.addWanted(CFG.wanted.steal, 'grand theft auto');
        G.hud.toast('Car stolen!');
      }
    },
    update(dt, time) {
      const input = G.input;
      P.enterCooldown = Math.max(0, P.enterCooldown - dt);
      if (P.punchAnim > 0) P.punchAnim -= dt;
      if (P.onFoot) {
        const sprint = input.key('ShiftLeft') || input.key('ShiftRight');
        const sp = sprint ? CFG.player.sprint : CFG.player.walk;
        let mx = 0, mz = 0;
        if (input.key('KeyW')) mz -= 1;
        if (input.key('KeyS')) mz += 1;
        if (input.key('KeyA')) mx -= 1;
        if (input.key('KeyD')) mx += 1;
        const moving = mx !== 0 || mz !== 0;
        if (moving) {
          // Movement is camera-relative: forward is away from the camera.
          const cy = P.heading + P.camYaw;
          const fx = -Math.sin(cy), fz = -Math.cos(cy);
          const rx = -fz, rz = fx;
          let dx = fx * -mz + rx * mx, dz = fz * -mz + rz * mx;
          const len = Math.hypot(dx, dz) || 1;
          dx /= len; dz /= len;
          P.pos.x += dx * sp * dt; P.pos.z += dz * sp * dt;
          P.heading = Math.atan2(-dx, -dz);
          G.world.resolveBuilding(P.pos, CFG.player.radius);
          // Stay on land: west is the sea, south is the marina water.
          P.pos.x = THREE.MathUtils.clamp(P.pos.x, CFG.oceanEdge + 1, CFG.gridMax + 30);
          P.pos.z = THREE.MathUtils.clamp(P.pos.z, CFG.gridMin - 30, CFG.marinaEdge - 2);
          if (Math.random() < dt * (sprint ? 6 : 2.5)) G.particles.dust(P.pos.x, 0.2, P.pos.z);
          P.speed = sp;
        } else P.speed = 0;
        // Walk cycle.
        const sw = Math.sin(time * (sprint ? 11 : 7)) * (moving ? 0.6 : 0);
        const u = mesh.userData;
        u.legL.rotation.x = sw; u.legR.rotation.x = -sw;
        u.armL.rotation.x = -sw * 0.7 + (P.punchAnim > 0 ? -1.6 : 0); u.armR.rotation.x = sw * 0.7 + (P.punchAnim > 0 ? -1.6 : 0);
        mesh.position.copy(P.pos);
        mesh.rotation.y = P.heading;
        if (input.pressed('KeyE')) P.stealNearest();
        if (input.pressed('KeyF')) G.combat.punch();
        G.hud.setSpeed(0);
      } else {
        const c = P.car;
        const fwd = input.key('KeyW') || input.key('ArrowUp');
        const back = input.key('KeyS') || input.key('ArrowDown');
        const left = input.key('KeyA') || input.key('ArrowLeft');
        const right = input.key('KeyD') || input.key('ArrowRight');
        const hand = input.key('Space');
        const type = c.type || 'sedan';
        const top = (type === 'sports' ? 54 : type === 'taxi' ? 44 : 46);
        if (fwd) c.speed += CFG.car.accel * dt;
        if (back) c.speed -= (c.speed > 0.5 ? CFG.car.brake : CFG.car.reverse) * dt;
        if (!fwd && !back) c.speed -= Math.sign(c.speed) * Math.min(Math.abs(c.speed), 9 * dt);
        c.speed = THREE.MathUtils.clamp(c.speed, -CFG.car.maxReverse, top);
        const steerTarget = (left ? 1 : 0) - (right ? 1 : 0);
        const steerMax = CFG.car.steer * Math.min(1, 10 / (Math.abs(c.speed) + 6));
        c.steer += THREE.MathUtils.clamp(steerTarget * steerMax - c.steer, -3.2 * dt, 3.2 * dt);
        const grip = hand ? CFG.car.handbrakeGrip : CFG.car.grip;
        c.heading += c.steer * (c.speed / 12) * grip * dt * 0.28;
        const fx = -Math.sin(c.heading), fz = -Math.cos(c.heading);
        c.x += fx * c.speed * dt; c.z += fz * c.speed * dt;
        // Collisions: buildings, traffic, pedestrians, roadblocks.
        const before = { x: c.x, z: c.z };
        G.world.resolveBuilding(c, CFG.car.radius);
        if (before.x !== c.x || before.z !== c.z) {
          c.speed *= 0.6;
          if (Math.abs(c.speed) > 8) { G.particles.sparks(c.x, 1, c.z); G.audio.thud(); }
        }
        for (const o of G.traffic.cars) {
          const d = Math.hypot(o.x - c.x, o.z - c.z);
          if (d < 4.6 && d > 0.01) {
            const push = (4.6 - d) / 2;
            const nx = (c.x - o.x) / d, nz = (c.z - o.z) / d;
            c.x += nx * push; c.z += nz * push;
            o.x -= nx * push; o.z -= nz * push;
            const hit = Math.abs(c.speed) > 6;
            c.speed *= 0.85; o.speed *= 0.7;
            if (hit) { G.particles.sparks(c.x, 1, c.z); G.audio.thud(); G.police.addWanted(CFG.wanted.hitCar, 'hit and run'); }
          }
        }
        const ped = G.peds.nearest(c.x, c.z, 3.4);
        if (ped && Math.abs(c.speed) > 4) {
          G.peds.fleeFrom(c.x, c.z, 40);
          G.police.addWanted(CFG.wanted.hitPed, 'hit a pedestrian');
          G.particles.sparks(c.x, 1, c.z);
          G.audio.thud();
          c.speed *= 0.7;
        }
        if (c.x < CFG.oceanEdge + 2) { c.x = CFG.oceanEdge + 2; c.speed *= 0.5; }
        c.x = THREE.MathUtils.clamp(c.x, CFG.gridMin - 30, CFG.gridMax + 30);
        c.z = THREE.MathUtils.clamp(c.z, CFG.gridMin - 30, CFG.marinaEdge - 2);
        c.mesh.position.set(c.x, 0, c.z);
        c.mesh.rotation.y = c.heading;
        updateCarVisual(c.mesh, c.steer, c.speed, dt, time);
        P.pos.set(c.x, 0, c.z);
        P.heading = c.heading;
        P.speed = c.speed;
        if (Math.abs(c.speed) > 20 && Math.random() < dt * 3) G.particles.dust(c.x, 0.3, c.z);
        if (hand && Math.abs(c.speed) > 12 && Math.random() < dt * 6) G.particles.smoke(c.x - fx * 2, 0.4, c.z - fz * 2);
        G.audio.engine(c.speed, top);
        G.hud.setSpeed(Math.abs(c.speed) * 3.1);
        if (input.pressed('KeyE')) P.exitCar();
      }
      // Camera: chase behind the heading, eased; mouse drag orbits.
      const yaw = P.heading + P.camYaw;
      const want = new THREE.Vector3(
        P.pos.x + Math.sin(yaw) * P.camDist,
        P.camHeight,
        P.pos.z + Math.cos(yaw) * P.camDist
      );
      P.camPos.lerp(want, Math.min(1, CFG.camera.lerp * dt));
      G.camera.position.copy(P.camPos);
      G.camera.lookAt(P.pos.x - Math.sin(yaw) * 6, 2.2, P.pos.z - Math.cos(yaw) * 6);
      const targetFov = CFG.camera.fov + Math.min(1, Math.abs(P.speed) / 46) * CFG.camera.fovKick;
      G.camera.fov += (targetFov - G.camera.fov) * Math.min(1, dt * 3);
      G.camera.updateProjectionMatrix();
    },
  };
  mesh.position.copy(P.pos);
  return P;
}
