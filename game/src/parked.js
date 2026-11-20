// Solmar Bay — parked cars: the ones sitting by cafés, hotels and the marina,
// waiting to be stolen. They never move on their own; the player takes them.
const THREE = window.THREE;
import { CFG } from './config.js';
import { mulberry32, pick } from './random.js';
import { makeCarMesh } from './vehicles.js';

const SPOTS = [
  { x: -700, z: -700, h: 0.4 }, { x: -740, z: -720, h: -0.3 },
  { x: 220, z: -60, h: 1.2 }, { x: 260, z: -100, h: 2.2 },
  { x: 100, z: 1020, h: 0.1 }, { x: 60, z: 1000, h: 3.1 },
  { x: 580, z: 420, h: -1.1 }, { x: 860, z: -860, h: 2.6 },
  { x: -820, z: 660, h: 0.9 }, { x: 60, z: 60, h: -2.0 },
];

export function createParked(G) {
  const rng = mulberry32(CFG.seed + 41);
  const group = new THREE.Group();
  G.scene.add(group);
  const cars = [];
  for (const s of SPOTS) {
    const type = pick(rng, ['sedan', 'sedan', 'sports', 'van', 'taxi']);
    const color = type === 'taxi' ? CFG.palette.taxi : pick(rng, CFG.palette.car);
    const mesh = makeCarMesh(type, color);
    mesh.position.set(s.x, 0, s.z);
    mesh.rotation.y = s.h;
    group.add(mesh);
    cars.push({ mesh, x: s.x, z: s.z, heading: s.h, type });
  }
  return {
    cars,
    nearest(x, z, r) {
      let best = null, bd = r;
      for (const c of cars) {
        const d = Math.hypot(c.x - x, c.z - z);
        if (d < bd) { bd = d; best = c; }
      }
      return best;
    },
    remove(car) {
      group.remove(car.mesh);
      const i = cars.indexOf(car); if (i >= 0) cars.splice(i, 1);
    },
  };
}
