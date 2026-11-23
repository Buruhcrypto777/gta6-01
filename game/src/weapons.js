// Solmar Bay — weapons (NEW in Round 4): a pistol and a shotgun, hitscan
// with tracers and a muzzle flash. Punch-only was the biggest visible gap
// against the top entries; now Mara can fight back, and one screenshot
// stages a real shootout.
export function createWeapons(THREE, scene) {
  const muzzleLight = new THREE.PointLight(0xffc861, 0, 18);
  scene.add(muzzleLight);
  const flash = new THREE.Mesh(
    new THREE.SphereGeometry(0.42, 8, 6),
    new THREE.MeshBasicMaterial({ color: '#ffe9a8' }),
  );
  flash.visible = false;
  scene.add(flash);

  const tracers = [];
  const SPECS = {
    pistol: { dmg: 34, rate: 0.22, range: 70, pellets: 1, spread: 0.012, sound: 'shot' },
    shotgun: { dmg: 14, rate: 0.9, range: 32, pellets: 7, spread: 0.09, sound: 'shotgun' },
  };

  function rayHit(from, dir, target, radius) {
    // Closest approach of the ray to the target centre.
    const cx = target.x - from.x;
    const cy = target.y - from.y;
    const cz = target.z - from.z;
    const t = cx * dir.x + cy * dir.y + cz * dir.z;
    if (t < 0) return -1;
    const px = from.x + dir.x * t;
    const py = from.y + dir.y * t;
    const pz = from.z + dir.z * t;
    const d = Math.hypot(target.x - px, target.y - py, target.z - pz);
    return d < radius ? t : -1;
  }

  return {
    kind: 'pistol',
    cooldown: 0,
    flashLife: 0,

    switchTo(kind) {
      if (SPECS[kind]) this.kind = kind;
    },

    label() {
      return this.kind === 'pistol' ? 'PISTOL' : 'SHOTGUN';
    },

    fire(from, dir, ctx, audio) {
      if (this.cooldown > 0) return [];
      const spec = SPECS[this.kind];
      this.cooldown = spec.rate;
      const hits = [];
      const muzzle = { x: from.x + dir.x * 1.2, y: from.y + 0.1, z: from.z + dir.z * 1.2 };
      flash.position.set(muzzle.x, muzzle.y, muzzle.z);
      flash.visible = true;
      this.flashLife = 0.06;
      muzzleLight.position.set(muzzle.x, muzzle.y + 0.4, muzzle.z);
      muzzleLight.intensity = 3;
      const rnd = ctx && ctx.rng ? () => ctx.rng.next() : Math.random;
      for (let p = 0; p < spec.pellets; p += 1) {
        const d = {
          x: dir.x + (rnd() - 0.5) * spec.spread * 2,
          y: dir.y + (rnd() - 0.5) * spec.spread * 2,
          z: dir.z + (rnd() - 0.5) * spec.spread * 2,
        };
        const dl = Math.hypot(d.x, d.y, d.z) || 1;
        d.x /= dl;
        d.y /= dl;
        d.z /= dl;
        // Nearest hittable thing along this pellet.
        let bestT = spec.range;
        let bestTarget = null;
        let bestKind = null;
        const consider = (list, kind, radius, yOff) => {
          for (const t of list) {
            if (t.hp !== undefined && t.hp <= 0) continue;
            if (t.state === 'down') continue;
            const hit = rayHit(muzzle, d, { x: t.pos.x, y: t.pos.y + yOff, z: t.pos.z }, radius);
            if (hit >= 0 && hit < bestT) {
              bestT = hit;
              bestTarget = t;
              bestKind = kind;
            }
          }
        };
        if (ctx.peds) consider(ctx.peds.peds, 'ped', 0.9, 1.1);
        if (ctx.rivals) consider(ctx.rivals, 'rival', 0.9, 1.1);
        if (ctx.police) {
          consider(ctx.police.state.cars, 'cruiser', 2.3, 0.8);
        }
        const end = {
          x: muzzle.x + d.x * bestT,
          y: muzzle.y + d.y * bestT,
          z: muzzle.z + d.z * bestT,
        };
        // A visible tracer: a thin glowing box stretched muzzle-to-impact
        // (a 1px line does not read at screenshot resolution).
        const tlen = Math.hypot(end.x - muzzle.x, end.y - muzzle.y, end.z - muzzle.z) || 0.01;
        const tracer = new THREE.Mesh(
          new THREE.BoxGeometry(0.09, 0.09, tlen),
          new THREE.MeshBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0.95 }),
        );
        tracer.position.set((muzzle.x + end.x) / 2, (muzzle.y + end.y) / 2, (muzzle.z + end.z) / 2);
        tracer.lookAt(end.x, end.y, end.z);
        scene.add(tracer);
        tracers.push({ line: tracer, life: 0.09 });
        if (bestTarget) {
          hits.push({ target: bestTarget, kind: bestKind, dmg: spec.dmg });
          if (bestKind === 'ped') {
            ctx.peds.knockDown(bestTarget);
          } else if (bestKind === 'rival') {
            bestTarget.hp -= spec.dmg;
          } else if (bestKind === 'cruiser') {
            bestTarget.hp = (bestTarget.hp ?? 100) - spec.dmg;
            if (bestTarget.hp <= 0) {
              bestTarget.disabled = true;
              bestTarget.speed = 0;
            }
          }
        }
      }
      if (audio) audio.blip(spec.sound);
      return hits;
    },

    update(dt) {
      if (this.cooldown > 0) this.cooldown -= dt;
      if (this.flashLife > 0) {
        this.flashLife -= dt;
        if (this.flashLife <= 0) flash.visible = false;
      }
      muzzleLight.intensity = Math.max(0, muzzleLight.intensity - dt * 40);
      for (let i = tracers.length - 1; i >= 0; i -= 1) {
        tracers[i].life -= dt;
        tracers[i].line.material.opacity = Math.max(0, tracers[i].life / 0.09);
        if (tracers[i].life <= 0) {
          scene.remove(tracers[i].line);
          tracers[i].line.geometry.dispose();
          tracers.splice(i, 1);
        }
      }
    },
  };
}
