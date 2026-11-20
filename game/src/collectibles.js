// Solmar Bay — Sun Coins: twelve golden coins hidden around the city, from
// the beach to the Safehouse. The always-on side activity: explore, collect,
// get paid. A coin spins, bobs and glints so the player can spot it.
const THREE = window.THREE;
import { CFG } from './config.js';

export function createCollectibles(G) {
  const group = new THREE.Group();
  G.scene.add(group);
  const coins = [];
  const mat = new THREE.MeshStandardMaterial({ color: 0xffc93c, emissive: 0xaa7700, emissiveIntensity: 0.9, roughness: 0.25, metalness: 0.8 });
  for (const c of G.world.coins) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.22, 20), mat);
    mesh.rotation.x = Math.PI / 2;
    mesh.position.set(c.x, 1.4, c.z);
    mesh.castShadow = true;
    group.add(mesh);
    coins.push({ ...c, mesh, phase: Math.random() * 6 });
  }
  return {
    coins,
    remaining() { return coins.filter((c) => !c.taken).length; },
    update(dt, time) {
      const P = G.player;
      for (const c of coins) {
        if (c.taken) continue;
        c.mesh.rotation.z += dt * 2.4;
        c.mesh.position.y = 1.4 + Math.sin(time * 2 + c.phase) * 0.35;
        const d = Math.hypot(P.pos.x - c.x, P.pos.z - c.z);
        if (d < 2.6) {
          c.taken = true;
          c.mesh.visible = false;
          G.player.cash += CFG.coins.value;
          G.hud.setCash(G.player.cash);
          G.hud.toast(`Sun Coin  +$${CFG.coins.value}  (${this.remaining()} left)`);
          G.audio.coin();
          G.particles.sparks(c.x, 1.6, c.z);
          G.saveGame();
        }
      }
    },
  };
}
