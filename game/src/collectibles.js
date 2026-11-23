// Solmar Bay — the 12 Sun Coins. Golden discs spinning over the city: parks,
// the beach, the marina, plazas and alleys. Each one is worth $50.
export function createCollectibles(THREE, scene, data) {
  const coins = [];
  let t = 0; // own clock: the bob must not read the wall clock (determinism)
  const gold = new THREE.MeshLambertMaterial({ color: 0xd4af37, emissive: 0x8a6d1a });
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.16 });
  data.coinSpots.forEach((spot, i) => {
    const group = new THREE.Group();
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.1, 18), gold);
    group.add(disc);
    const glow = new THREE.Mesh(new THREE.SphereGeometry(1.1, 10, 8), glowMat);
    group.add(glow);
    group.position.set(spot.x, 1.1, spot.z);
    scene.add(group);
    coins.push({ mesh: group, x: spot.x, z: spot.z, taken: false, phase: i * 0.7 });
  });

  return {
    coins,
    count() {
      return coins.filter((c) => c.taken).length;
    },
    update(dt, playerPos, onCollect) {
      t += dt;
      for (const c of coins) {
        if (c.taken) continue;
        c.mesh.rotation.y += dt * 2;
        c.mesh.position.y = 1.1 + Math.sin(t * 2 + c.phase) * 0.15;
        const d = Math.hypot(c.x - playerPos.x, c.z - playerPos.z);
        if (d < 2.6) {
          c.taken = true;
          c.mesh.visible = false;
          if (onCollect) onCollect(c);
        }
      }
    },
    markTaken(indices) {
      for (const i of indices) {
        if (coins[i]) {
          coins[i].taken = true;
          coins[i].mesh.visible = false;
        }
      }
    },
    takenIndices() {
      return coins.map((c, i) => (c.taken ? i : -1)).filter((i) => i >= 0);
    },
  };
}
