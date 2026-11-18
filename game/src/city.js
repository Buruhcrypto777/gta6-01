// The city itself, as pure data: the road grid, the blocks and the buildings in them, the
// palms and lamps, the beach and the pier, and the named places the missions send the player
// to. Nothing here draws or touches the browser; render.js turns this layout into three.js
// objects, and world.js reads the same buildings as collision boxes.
import { BLOCK, CITY, PALETTE } from './config.js';
import { pick, range } from './random.js';

export const ROAD_LINES = [...CITY.avenues, ...CITY.streets];

/** The named places the story sends Mara to, in world metres. */
export const PLACES = {
  cafe: { x: 44, z: 146, name: 'Café Marisol' },
  bank: { x: -40, z: -33, name: 'Solmar Mutual Bank' },
  safehouse: { x: 99, z: -92, name: 'The Gull House' },
  pier: { x: 0, z: 210, name: 'Old Pier' },
  marina: { x: -99, z: 146, name: 'Old Marina' },
};

/** True when the point is on a road surface (within the asphalt). */
export function isOnRoad(x, z) {
  const half = CITY.roadWidth / 2;
  for (const line of CITY.avenues) if (Math.abs(x - line) <= half && Math.abs(z) <= CITY.half + half) return true;
  for (const line of CITY.streets) if (Math.abs(z - line) <= half && Math.abs(x) <= CITY.half + half) return true;
  return false;
}

/** The nearest point on a road centre line, and which way that road runs ('x' or 'z'). */
export function nearestRoad(x, z) {
  let best = null;
  for (const line of CITY.avenues) {
    const d = Math.abs(x - line);
    if (best === null || d < best.d) best = { d, x: line, z: Math.max(-CITY.half, Math.min(CITY.half, z)), axis: 'z' };
  }
  for (const line of CITY.streets) {
    const d = Math.abs(z - line);
    if (best === null || d < best.d) best = { d, x: Math.max(-CITY.half, Math.min(CITY.half, x)), z: line, axis: 'x' };
  }
  return best;
}

/** A random point on a random road, with a cardinal heading, for spawning traffic. */
export function randomRoadSpawn(random) {
  const vertical = random() < 0.5;
  const line = pick(random, vertical ? CITY.avenues : CITY.streets);
  const along = range(random, -CITY.half + 10, CITY.half - 10);
  const lane = random() < 0.5 ? -CITY.laneOffset : CITY.laneOffset;
  if (vertical) return { x: line + lane, z: along, heading: lane < 0 ? Math.PI : 0, vertical, line, lane };
  return { x: along, z: line + lane, heading: lane < 0 ? Math.PI / 2 : -Math.PI / 2, vertical, line, lane };
}

/** A random point on a sidewalk beside a road, for spawning pedestrians. */
export function randomSidewalkSpawn(random) {
  const vertical = random() < 0.5;
  const line = pick(random, vertical ? CITY.avenues : CITY.streets);
  const along = range(random, -CITY.half + 8, CITY.half - 8);
  const side = random() < 0.5 ? -1 : 1;
  const off = CITY.roadWidth / 2 + 2 + random() * 2;
  if (vertical) return { x: line + side * off, z: along };
  return { x: along, z: line + side * off };
}

function blockCentres() {
  const centres = [];
  for (let i = 0; i < CITY.avenues.length - 1; i += 1) {
    for (let j = 0; j < CITY.streets.length - 1; j += 1) {
      centres.push({ x: (CITY.avenues[i] + CITY.avenues[i + 1]) / 2, z: (CITY.streets[j] + CITY.streets[j + 1]) / 2, i, j });
    }
  }
  return centres;
}

/**
 * Lay the city out from the seeded generator: buildings inside the blocks (taller toward the
 * centre, none in the park or the plaza), palms along the beach road and the park, lamps at
 * the intersections, traffic lights at the four central ones, and the pier reaching into the
 * sea. Every position is fixed by the seed, so the city never changes between runs.
 */
export function buildCityLayout(random) {
  const buildings = [];
  const palms = [];
  const lamps = [];
  const trafficLights = [];
  // The park (south-west block) and the plaza (south-east block) stay open.
  const park = { x: -99, z: 99, w: BLOCK, d: BLOCK };
  const plaza = { x: 99, z: 99, w: BLOCK, d: BLOCK };

  for (const block of blockCentres()) {
    const isPark = block.x === park.x && block.z === park.z;
    const isPlaza = block.x === plaza.x && block.z === plaza.z;
    if (isPark) {
      for (let k = 0; k < 6; k += 1) {
        palms.push({ x: block.x + range(random, -20, 20), z: block.z + range(random, -20, 20), scale: range(random, 0.8, 1.2) });
      }
      continue;
    }
    if (isPlaza) {
      for (let k = 0; k < 4; k += 1) {
        palms.push({ x: block.x + range(random, -18, 18), z: block.z + range(random, -18, 18), scale: range(random, 0.9, 1.1) });
      }
      continue;
    }
    const centreDistance = Math.hypot(block.x, block.z) / 190;
    const count = random() < 0.45 ? 1 : 2;
    for (let k = 0; k < count; k += 1) {
      const w = range(random, 13, 22);
      const d = range(random, 13, 22);
      const h = range(random, 10, 22) + (1 - centreDistance) * range(random, 8, 34);
      const x = block.x + (count === 1 ? 0 : (k === 0 ? -11 : 11)) + range(random, -3, 3);
      const z = block.z + (count === 1 ? 0 : (k === 0 ? -11 : 11)) + range(random, -3, 3);
      buildings.push({ x, z, w, d, h, color: pick(random, PALETTE.building) });
    }
  }

  // Palms along the beach road's south sidewalk and the coastal strip.
  for (let x = -150; x <= 150; x += 18) {
    palms.push({ x: x + range(random, -3, 3), z: 143 + range(random, -2, 2), scale: range(random, 0.9, 1.3) });
  }
  for (let x = -140; x <= 140; x += 30) {
    palms.push({ x: x + range(random, -4, 4), z: 172 + range(random, -6, 6), scale: range(random, 0.8, 1.2) });
  }
  // Lamps at every intersection corner, traffic lights at the four central ones.
  for (const ax of CITY.avenues) {
    for (const sz of CITY.streets) {
      lamps.push({ x: ax + CITY.roadWidth / 2 + 1.5, z: sz - CITY.roadWidth / 2 - 1.5 });
      if (Math.abs(ax) <= 66 && Math.abs(sz) <= 66 && ax >= 0 && sz >= 0) {
        trafficLights.push({ x: ax + CITY.roadWidth / 2 + 1, z: sz + CITY.roadWidth / 2 + 1 });
      }
    }
  }

  return { buildings, palms, lamps, trafficLights, park, plaza };
}
