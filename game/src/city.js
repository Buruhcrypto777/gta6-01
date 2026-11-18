// The city itself: a road grid, the blocks between the roads, the buildings on them,
// the beach and the sea, and the named places the missions point at. Everything is
// placed from the seeded generator, so the same seed builds the same Solmar Bay.
import { GRID, PALETTE } from './config.js';
import { clamp } from './random.js';

const BUILDING_TINTS = [PALETTE.buildingA, PALETTE.buildingB, PALETTE.buildingC, PALETTE.buildingD];

/** Build the whole static layout from a seeded generator. */
export function buildCity(rng) {
  const buildings = [];
  const palms = [];
  const umbrellas = [];
  const lamps = [];

  for (const bx of GRID.blocks) {
    for (const bz of GRID.blocks) {
      // Downtown is the middle: buildings grow taller toward the centre.
      const downtown = 1 - Math.max(Math.abs(bx), Math.abs(bz)) / 210;
      const roll = rng();
      const spots = roll < 0.3 ? [{ dx: 0, dz: 0, w: 30, d: 30 }] : roll < 0.7
        ? [{ dx: -9, dz: -9, w: 17, d: 17 }, { dx: 9, dz: 9, w: 17, d: 17 }]
        : [{ dx: -10, dz: -10, w: 15, d: 15 }, { dx: 10, dz: -10, w: 15, d: 15 }, { dx: 0, dz: 11, w: 20, d: 13 }];
      for (const s of spots) {
        const h = Math.round(9 + downtown * 46 + rng() * 12);
        buildings.push({
          x: bx + s.dx, z: bz + s.dz, w: s.w, d: s.d, h,
          tint: rng.pick(BUILDING_TINTS),
          variant: rng.int(0, 2),
        });
      }
      // A palm or two on the quieter blocks.
      if (rng.chance(0.4)) palms.push({ x: bx + rng.range(-16, 16), z: bz + rng.range(-16, 16), s: rng.range(0.8, 1.25) });
    }
  }

  // Beach road palms: a row of them along Ocean Drive (x = 196).
  for (let z = -182; z <= 182; z += 28) {
    palms.push({ x: 203 + rng.range(-1, 1), z: z + rng.range(-4, 4), s: rng.range(0.9, 1.3) });
  }
  // Beach umbrellas and more palms on the sand.
  for (let i = 0; i < 10; i += 1) {
    umbrellas.push({ x: rng.range(210, 234), z: rng.range(-180, 180), tilt: rng.range(-0.15, 0.15) });
  }
  for (let i = 0; i < 8; i += 1) {
    palms.push({ x: rng.range(208, 236), z: rng.range(-180, 180), s: rng.range(0.8, 1.2) });
  }
  // Street lamps at every other intersection corner.
  for (const rx of GRID.roads) {
    for (const rz of GRID.roads) {
      if ((rx + rz) % 112 === 0) lamps.push({ x: rx + 7.5, z: rz + 7.5 });
    }
  }

  // Parked cars at the kerb, waiting to be borrowed.
  const parkedSpots = [
    { x: 34, z: -22, heading: 0 },
    { x: -22, z: 34, heading: Math.PI / 2 },
    { x: 146, z: 128, heading: Math.PI },
    { x: -190, z: -128, heading: -Math.PI / 2 },
    { x: 90, z: -34, heading: 0 },
    { x: -34, z: 146, heading: Math.PI / 2 },
  ];

  return {
    buildings, palms, umbrellas, lamps, parkedSpots,
    landmarks: {
      cafe: { x: 140, z: 140, name: 'Café Marisol' },
      docks: { x: -196, z: -140, name: 'Solmar Docks' },
      lighthouse: { x: 222, z: -170, name: 'Lighthouse' },
      plaza: { x: 0, z: 0, name: 'Marina Plaza' },
    },
  };
}

/** Is a ground point on a road (within the asphalt)? */
export function onRoad(x, z) {
  for (const r of GRID.roads) {
    if (Math.abs(x - r) <= GRID.roadHalf) return true;
    if (Math.abs(z - r) <= GRID.roadHalf) return true;
  }
  return false;
}

/** Nearest road centreline coordinate on one axis. */
export function nearestRoad(v) {
  let best = GRID.roads[0];
  for (const r of GRID.roads) if (Math.abs(v - r) < Math.abs(v - best)) best = r;
  return best;
}

/**
 * Push a circle (x, z, radius) out of every building it overlaps, and clamp it to the
 * playable ground. Returns the corrected position. The sea is a wall past the sand.
 */
export function collideBuildings(city, x, z, radius) {
  for (const b of city.buildings) {
    const hw = b.w / 2 + radius;
    const hd = b.d / 2 + radius;
    const dx = x - b.x;
    const dz = z - b.z;
    if (Math.abs(dx) < hw && Math.abs(dz) < hd) {
      const px = hw - Math.abs(dx);
      const pz = hd - Math.abs(dz);
      if (px < pz) x = b.x + (dx >= 0 ? hw : -hw);
      else z = b.z + (dz >= 0 ? hd : -hd);
    }
  }
  x = clamp(x, GRID.min - 4, GRID.seaX - 2);
  z = clamp(z, GRID.min - 4, GRID.max + 4);
  return { x, z };
}

/** The closest point on the road grid to a ground point (for spawning and routing). */
export function snapToRoad(x, z) {
  const rx = nearestRoad(x);
  const rz = nearestRoad(z);
  if (Math.abs(x - rx) <= Math.abs(z - rz)) return { x: rx, z };
  return { x, z: rz };
}
