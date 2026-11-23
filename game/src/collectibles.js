// Solmar Bay — Sun Coins: twelve golden coins hidden around the city.
// They spin and bob over sidewalks, the marina and the beach; each one is
// worth $50 and counts toward the Sun Coin Run mission.
import { COIN_VALUE, WORLD } from './config.js';

export function createCollectibles(scene, rng) {
  const coins = [];
  const mat = new THREE.MeshLambertMaterial({ color: 0xffc44d, emissive: 0x8a6a10 });
  const geo = new THREE.TorusGeometry(0.7, 0.22, 8, 20);
  const streets = [];
  for (let k = -4; k <= 4; k += 1) streets.push(k * WORLD.roadEvery);
  const spots = [
    { x: -140, z: 196 }, // marina
    { x: 22, z: -34 }, // casino front
    { x: 0, z: 196 }, // beach hideout
    { x: -110, z: 66 }, // Bay Club
    { x: 110, z: -154 }, // north hotel
    { x: -66, z: -110 },
    { x: 66, z: 110 },
    { x: -154, z: -22 },
    { x: 154, z: 22 },
    { x: 0, z: -110 },
    { x: -44, z: 154 },
    { x: 88, z: -66 },
  ];
  for (const spot of spots) {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(spot.x + rng.range(-2, 2), 1.2, spot.z + rng.range(-2, 2));
    scene.add(mesh);
    coins.push({ x: mesh.position.x, z: mesh.position.z, mesh, taken: false, phase: rng.range(0, Math.PI * 2) });
  }

  return {
    coins,
    get collected() {
      return coins.filter((c) => c.taken).length;
    },
    get value() {
      return COIN_VALUE;
    },
    update(dt, playerPos, time, onPickup) {
      for (const coin of coins) {
        if (coin.taken) continue;
        coin.mesh.rotation.y = time * 2 + coin.phase;
        coin.mesh.position.y = 1.2 + Math.sin(time * 2.4 + coin.phase) * 0.25;
        if (Math.hypot(coin.x - playerPos.x, coin.z - playerPos.z) < 2.2) {
          coin.taken = true;
          coin.mesh.visible = false;
          if (onPickup) onPickup(coin);
        }
      }
    },
  };
}
