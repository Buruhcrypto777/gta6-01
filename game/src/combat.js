// Solmar Bay — fists: punch combat on foot. Thugs to settle scores with, a
// friend to pick up, knockback, sparks and a thud. No guns — Mara settles
// things up close.
const THREE = window.THREE;
import { CFG } from './config.js';
import { mulberry32, pick } from './random.js';

const SHIRTS = [0x8a2f2f, 0x2f4a8a, 0x3a3a3a, 0x6b4a8a];

function makeThugMesh(shirt) {
  const g = new THREE.Group();
  const sm = new THREE.MeshLambertMaterial({ color: shirt });
  const km = new THREE.MeshLambertMaterial({ color: 0xc98a5e });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.9, 0.42), sm);
  torso.position.y = 1.2; torso.castShadow = true;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), km);
  head.position.y = 1.88; head.castShadow = true;
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.8, 0.26), new THREE.MeshLambertMaterial({ color: 0x222222 }));
  legL.position.set(-0.2, 0.4, 0); legL.name = 'legL';
  const legR = legL.clone(); legR.position.x = 0.2; legR.name = 'legR';
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.66, 0.2), sm);
  armL.position.set(-0.52, 1.25, 0); armL.name = 'armL';
  const armR = armL.clone(); armR.position.x = 0.52; armR.name = 'armR';
  g.add(torso, head, legL, legR, armL, armR);
  g.userData = { legL, legR, armL, armR };
  return g;
}

export function createCombat(G) {
  const rng = mulberry32(CFG.seed + 91);
  const group = new THREE.Group();
  G.scene.add(group);
  const C = {
    enemies: [], friend: null, friendPickedUp: false, lastPunch: -9,
    spawnThug(x, z) {
      const mesh = makeThugMesh(pick(rng, SHIRTS));
      const e = { mesh, x, z, heading: rng() * Math.PI * 2, hp: 100, attackCd: 0, phase: rng() * 6 };
      mesh.position.set(x, 0, z);
      group.add(mesh); C.enemies.push(e);
      return e;
    },
    spawnFriend(x, z) {
      const mesh = makeThugMesh(0x3dd9a0);
      C.friend = { mesh, x, z, heading: 0 };
      mesh.position.set(x, 0, z);
      group.add(mesh);
      C.friendPickedUp = false;
    },
    punch() {
      const now = G.time;
      if (now - C.lastPunch < CFG.player.punchCooldown) return;
      if (G.player.car) return;
      C.lastPunch = now;
      const P = G.player;
      const fx = -Math.sin(P.heading), fz = -Math.cos(P.heading);
      const hx = P.pos.x + fx * 1.2, hz = P.pos.z + fz * 1.2;
      G.particles.muzzle(hx, 1.4, hz);
      G.audio.punch();
      P.punchAnim = 0.25;
      let hit = false;
      for (const e of [...C.enemies]) {
        const d = Math.hypot(e.x - P.pos.x, e.z - P.pos.z);
        if (d < CFG.player.punchRange + 0.6) {
          e.hp -= CFG.player.punchDamage;
          e.x += fx * 1.6; e.z += fz * 1.6;
          G.particles.sparks(e.x, 1.4, e.z);
          hit = true;
          if (e.hp <= 0) {
            group.remove(e.mesh);
            C.enemies.splice(C.enemies.indexOf(e), 1);
            G.player.cash += 50;
            G.hud.setCash(G.player.cash);
            G.hud.toast('Collector down  +$50');
          }
        }
      }
      if (hit) G.police.addWanted(CFG.wanted.punch, 'assault');
      // Punch a pedestrian and the law notices too.
      const ped = G.peds.nearest(P.pos.x, P.pos.z, CFG.player.punchRange + 0.4);
      if (ped && !hit) {
        G.peds.fleeFrom(P.pos.x, P.pos.z, 30);
        G.police.addWanted(CFG.wanted.punch, 'assault');
      }
    },
    update(dt, time) {
      const P = G.player;
      for (const e of C.enemies) {
        const dx = P.pos.x - e.x, dz = P.pos.z - e.z;
        const d = Math.hypot(dx, dz);
        if (d < 26) {
          // Walk up and swing.
          const want = Math.atan2(-dx, -dz);
          let dh = want - e.heading;
          while (dh > Math.PI) dh -= Math.PI * 2;
          while (dh < -Math.PI) dh += Math.PI * 2;
          e.heading += THREE.MathUtils.clamp(dh, -3 * dt, 3 * dt);
          if (d > 1.8) { e.x += -Math.sin(e.heading) * 3.2 * dt; e.z += -Math.cos(e.heading) * 3.2 * dt; }
          else {
            e.attackCd -= dt;
            if (e.attackCd <= 0) {
              e.attackCd = 1.1;
              P.damage(12);
              G.particles.sparks(P.pos.x, 1.4, P.pos.z);
              G.audio.thud();
              G.hud.toast('You got hit!');
            }
          }
        }
        e.mesh.position.set(e.x, 0, e.z);
        e.mesh.rotation.y = e.heading;
        const sw = Math.sin(time * 7 + e.phase) * 0.5;
        const u = e.mesh.userData;
        u.legL.rotation.x = sw; u.legR.rotation.x = -sw;
        u.armL.rotation.x = -sw * 0.7; u.armR.rotation.x = sw * 0.7;
      }
      if (C.friend && !C.friendPickedUp) {
        const d = Math.hypot(C.friend.x - P.pos.x, C.friend.z - P.pos.z);
        if (d < 3.5) {
          C.friendPickedUp = true;
          group.remove(C.friend.mesh);
          G.hud.toast('Rook picked up!');
        }
      }
    },
  };
  return C;
}
