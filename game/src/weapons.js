// Solmar Bay — weapons: pistol and shotgun (new in Round 4).
// Hitscan fire from the camera's centre: a tracer line, a muzzle flash and
// a crack of synth gunfire. Pedestrians go down, officers take three hits,
// and every shot in public draws the law. Fists stay on key 3 / F.
import { createRandom } from './random.js';

const WEAPONS = ['fists', 'pistol', 'shotgun'];
const RANGE = { pistol: 70, shotgun: 28 };

export function createWeapons(scene, player, peds, police, audio, camera) {
  const rng = createRandom(99);
  let current = 'fists';
  let cooldown = 0;
  const tracers = [];
  const flash = new THREE.PointLight(0xffc860, 0, 14, 1.6);
  scene.add(flash);
  const rayOrigin = new THREE.Vector3();
  const rayDir = new THREE.Vector3();

  function shootRay(origin, dir, range) {
    let best = null;
    let bestT = range;
    let bestKind = null;
    const consider = (x, y, z, ref, kind) => {
      const dx = x - origin.x;
      const dy = y - origin.y;
      const dz = z - origin.z;
      const t = dx * dir.x + dy * dir.y + dz * dir.z;
      if (t < 1 || t > bestT) return;
      const px = origin.x + dir.x * t - x;
      const py = origin.y + dir.y * t - y;
      const pz = origin.z + dir.z * t - z;
      const perp = Math.sqrt(px * px + py * py + pz * pz);
      if (perp < 1.3) {
        bestT = t;
        best = ref;
        bestKind = kind;
      }
    };
    for (const ped of peds.peds) {
      if (ped.down) continue;
      const p = ped.group.position;
      consider(p.x, p.y + 1.1, p.z, ped, 'ped');
    }
    for (const officer of police.officers) {
      if (officer.down) continue;
      const p = officer.group.position;
      consider(p.x, p.y + 1.1, p.z, officer, 'officer');
    }
    return { hit: best, kind: bestKind, t: bestT };
  }

  function addTracer(from, to) {
    // A thin glowing box reads far better in a JPEG than a 1px line.
    const len = from.distanceTo(to);
    const line = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.16, len),
      new THREE.MeshBasicMaterial({ color: 0xfff2a8, transparent: true, opacity: 0.95 }),
    );
    line.position.copy(from).lerp(to, 0.5);
    line.lookAt(to);
    scene.add(line);
    tracers.push({ line, life: 0.09 });
  }

  function hitTarget(hit, kind) {
    if (kind === 'ped') {
      peds.knockDown(hit);
    } else if (kind === 'officer') {
      hit.health -= 1;
      if (hit.health <= 0) {
        hit.down = true;
        hit.downTimer = 14;
        hit.group.rotation.z = Math.PI / 2;
        hit.group.position.y = 0.25;
      }
    }
    police.addWanted(1);
  }

  return {
    get current() {
      return current;
    },
    select(name) {
      if (!WEAPONS.includes(name)) return false;
      current = name;
      audio.weaponSwitch(name);
      return true;
    },
    fire() {
      if (current === 'fists' || cooldown > 0) return false;
      const rate = current === 'pistol' ? 0.22 : 0.85;
      cooldown = rate;
      camera.getWorldDirection(rayDir);
      rayOrigin.copy(camera.position);
      const muzzle = new THREE.Vector3(
        player.pos.x + Math.sin(player.heading) * 0.9,
        player.pos.y + 1.4,
        player.pos.z + Math.cos(player.heading) * 0.9,
      );
      flash.position.copy(muzzle);
      flash.intensity = 9;
      const pellets = current === 'pistol' ? 1 : 8;
      for (let i = 0; i < pellets; i += 1) {
        const dir = rayDir.clone();
        if (current === 'shotgun') {
          dir.x += rng.range(-0.045, 0.045);
          dir.y += rng.range(-0.03, 0.03);
          dir.z += rng.range(-0.045, 0.045);
          dir.normalize();
        }
        const result = shootRay(rayOrigin, dir, RANGE[current]);
        const end = rayOrigin.clone().addScaledVector(dir, result.t);
        addTracer(muzzle, end);
        if (result.hit) hitTarget(result.hit, result.kind);
      }
      audio.gunshot(current);
      return true;
    },
    update(dt) {
      cooldown = Math.max(0, cooldown - dt);
      flash.intensity = Math.max(0, flash.intensity - dt * 90);
      for (let i = tracers.length - 1; i >= 0; i -= 1) {
        const t = tracers[i];
        t.life -= dt;
        t.line.material.opacity = Math.max(0, t.life / 0.09) * 0.95;
        if (t.life <= 0) {
          scene.remove(t.line);
          t.line.geometry.dispose();
          t.line.material.dispose();
          tracers.splice(i, 1);
        }
      }
    },
  };
}
