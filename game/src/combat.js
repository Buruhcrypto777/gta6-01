// Solmar Bay — punch combat (F).
// A short-range swing in front of Mara: it floors the nearest pedestrian or
// officer in the arc, and hitting anyone in public draws the law.
import { PUNCH_COOLDOWN, PUNCH_RANGE } from './config.js';

export function createCombat(player, peds, police, audio) {
  let cooldown = 0;

  function inFront(tx, tz) {
    const dx = tx - player.pos.x;
    const dz = tz - player.pos.z;
    const d = Math.hypot(dx, dz);
    if (d > PUNCH_RANGE || d === 0) return 0;
    const fx = Math.sin(player.heading);
    const fz = Math.cos(player.heading);
    const dot = (dx * fx + dz * fz) / d;
    return dot > 0.35 ? d : 0;
  }

  return {
    tryPunch() {
      if (cooldown > 0 || player.car !== null) return false;
      cooldown = PUNCH_COOLDOWN;
      let best = null;
      let bestD = PUNCH_RANGE + 1;
      let bestKind = null;
      for (const ped of peds.peds) {
        if (ped.down) continue;
        const d = inFront(ped.group.position.x, ped.group.position.z);
        if (d > 0 && d < bestD) {
          bestD = d;
          best = ped;
          bestKind = 'ped';
        }
      }
      for (const officer of police.officers) {
        if (officer.down) continue;
        const d = inFront(officer.group.position.x, officer.group.position.z);
        if (d > 0 && d < bestD) {
          bestD = d;
          best = officer;
          bestKind = 'officer';
        }
      }
      if (!best) {
        audio.swing();
        return false;
      }
      if (bestKind === 'ped') {
        peds.knockDown(best);
      } else {
        best.health -= 1;
        if (best.health <= 0) {
          best.down = true;
          best.downTimer = 14;
          best.group.rotation.z = Math.PI / 2;
          best.group.position.y = 0.25;
        }
      }
      audio.punch();
      police.addWanted(1);
      return true;
    },
    update(dt) {
      cooldown = Math.max(0, cooldown - dt);
    },
  };
}
