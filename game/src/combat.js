// Solmar Bay — punch combat (F). A short swing in front of Mara knocks
// pedestrians down and hurts rivals; hitting a pedestrian in front of
// witnesses raises the heat by one star.
export function createCombat() {
  let cooldown = 0;
  return {
    update(dt) {
      if (cooldown > 0) cooldown -= dt;
    },
    punch(player, peds, rivals, audio, onHitPed) {
      if (cooldown > 0) return 0;
      cooldown = 0.45;
      const fx = Math.sin(player.heading);
      const fz = Math.cos(player.heading);
      let hits = 0;
      const inArc = (x, z, range) => {
        const dx = x - player.pos.x;
        const dz = z - player.pos.z;
        const d = Math.hypot(dx, dz);
        if (d > range || d < 0.01) return false;
        const dot = (dx * fx + dz * fz) / d;
        return dot > 0.45;
      };
      for (const p of peds.peds) {
        if (p.state === 'down') continue;
        if (inArc(p.pos.x, p.pos.z, 2.4)) {
          peds.knockDown(p);
          p.pos.x += fx * 1.4;
          p.pos.z += fz * 1.4;
          hits += 1;
          if (onHitPed) onHitPed();
        }
      }
      for (const r of rivals) {
        if (r.hp <= 0) continue;
        if (inArc(r.pos.x, r.pos.z, 2.4)) {
          r.hp -= 34;
          r.pos.x += fx * 1.2;
          r.pos.z += fz * 1.2;
          hits += 1;
        }
      }
      if (audio) audio.blip('punch');
      return hits;
    },
  };
}
