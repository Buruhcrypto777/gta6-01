// Solmar Bay — the city itself, as data. buildWorld turns the seed into roads,
// blocks, buildings, palms, lamps, parks and collectible spots. Pure data: no
// three.js here, so render.js, traffic, police and missions all read one truth.
import { CFG } from './config.js';
import { mulberry32, range, int, pick, chance } from './random.js';
import { districtAt, LANDMARKS, NEON_SIGNS } from './city.js';

export const ROAD_LINES = [];
for (let v = CFG.gridMin; v <= CFG.gridMax; v += CFG.block) ROAD_LINES.push(v);
// Roads a car or pedestrian may actually use: the west edge (-1120, -960) is
// under the sea plane and the south edge (1120) under the marina water.
export const TRAFFIC_LINES = ROAD_LINES.filter((l) => l >= CFG.beachEdge && l <= CFG.marinaEdge - 40);

export function isWater(x, z) { return x < CFG.oceanEdge || z > CFG.marinaEdge; }
export function isBeach(x, z) { return x >= CFG.oceanEdge && x < CFG.beachEdge && z >= -CFG.worldHalf && z <= CFG.worldHalf; }
export function onRoad(x, z) {
  if (x < CFG.gridMin - 20 || x > CFG.gridMax + 20 || z < CFG.gridMin - 20 || z > CFG.gridMax + 20) return false;
  for (const l of ROAD_LINES) {
    if (Math.abs(x - l) <= CFG.roadWidth / 2 && z >= CFG.gridMin - 20 && z <= CFG.gridMax + 20) return true;
    if (Math.abs(z - l) <= CFG.roadWidth / 2 && x >= CFG.gridMin - 20 && x <= CFG.gridMax + 20) return true;
  }
  return false;
}
export function nearestRoadPoint(x, z) {
  let bx = x, bz = z, best = Infinity;
  for (const l of ROAD_LINES) {
    const dx = Math.abs(x - l); if (dx < best) { best = dx; bx = l; bz = z; }
    const dz = Math.abs(z - l); if (dz < best) { best = dz; bx = x; bz = l; }
  }
  return { x: bx, z: bz };
}

export function buildWorld(seed) {
  const rng = mulberry32(seed);
  const buildings = [];
  const palms = [];
  const lamps = [];
  const parks = [];
  const signs = [];
  const houses = [];

  // Three park blocks: green lungs with trees and paths. Centres are real
  // block centres (road line + half a block), so the isPark check below
  // matches the blocks the loop actually visits.
  const parkCenters = [[-80, 400], [400, -400], [-400, -80]];
  for (const [px, pz] of parkCenters) {
    parks.push({ x: px, z: pz, w: CFG.block - CFG.roadWidth, d: CFG.block - CFG.roadWidth });
  }
  const isPark = (cx, cz) => parkCenters.some(([a, b]) => a === cx && b === cz);

  for (let i = 0; i < ROAD_LINES.length - 1; i++) {
    for (let j = 0; j < ROAD_LINES.length - 1; j++) {
      const cx = ROAD_LINES[i] + CFG.block / 2;
      const cz = ROAD_LINES[j] + CFG.block / 2;
      if (cx < CFG.beachEdge) continue; // sand and sea: no blocks
      if (cz > CFG.marinaEdge - 40) continue; // harbour: docks, not blocks
      if (isPark(cx, cz)) continue;
      const d = districtAt(cx, cz);
      const inset = 16;
      const bw = CFG.block - CFG.roadWidth - inset * 2;
      const put = (x, z, w, dd, h, color) => {
        buildings.push({ x, z, w, d: dd, h, color, roof: pick(rng, CFG.palette.roof), rot: 0 });
      };
      if (d.style === 'downtown') {
        if (chance(rng, 0.55)) {
          const h = range(rng, 70, 145);
          const bw = range(rng, 44, 62), bd = range(rng, 44, 62);
          put(cx, cz, bw, bd, h, pick(rng, CFG.palette.building));
          if (chance(rng, 0.75)) {
            // Neon on the south face, just proud of the facade so it is never
            // buried inside the tower. Signs repeat — chain hotels do too.
            const s = pick(rng, NEON_SIGNS);
            signs.push({ text: s.text, color: s.color, w: s.w, h: s.h, x: cx, z: cz + bd / 2 + 0.6, y: range(rng, 34, 60), rotY: 0 });
          }
        } else {
          put(cx - 22, cz - 22, 40, 40, range(rng, 45, 80), pick(rng, CFG.palette.building));
          put(cx + 24, cz + 24, 36, 36, range(rng, 50, 95), pick(rng, CFG.palette.building));
        }
      } else if (d.style === 'oldtown') {
        const n = int(rng, 3, 5);
        for (let k = 0; k < n; k++) {
          const a = (k / n) * Math.PI * 2 + range(rng, -0.3, 0.3);
          put(cx + Math.cos(a) * 30, cz + Math.sin(a) * 30, range(rng, 20, 30), range(rng, 20, 30), range(rng, 12, 30), pick(rng, CFG.palette.building));
        }
      } else if (d.style === 'hills') {
        const n = int(rng, 2, 4);
        for (let k = 0; k < n; k++) {
          const a = (k / n) * Math.PI * 2 + range(rng, -0.3, 0.3);
          const hx = cx + Math.cos(a) * 34, hz = cz + Math.sin(a) * 34;
          put(hx, hz, range(rng, 16, 24), range(rng, 16, 24), range(rng, 8, 15), pick(rng, CFG.palette.building));
          houses.push({ x: hx, z: hz });
        }
      } else if (d.style === 'marina') {
        put(cx, cz, range(rng, 30, 44), range(rng, 24, 34), range(rng, 10, 20), pick(rng, CFG.palette.building));
      } else {
        const n = int(rng, 2, 3);
        for (let k = 0; k < n; k++) {
          const a = (k / n) * Math.PI * 2 + range(rng, -0.4, 0.4);
          put(cx + Math.cos(a) * 28, cz + Math.sin(a) * 28, range(rng, 26, 38), range(rng, 26, 38), range(rng, 24, 58), pick(rng, CFG.palette.building));
        }
      }
      // Palms and lamps around the block edges.
      if (chance(rng, 0.6)) palms.push({ x: cx - bw / 2 - 4, z: cz + range(rng, -40, 40), s: range(rng, 0.8, 1.3) });
      if (chance(rng, 0.4)) palms.push({ x: cx + bw / 2 + 4, z: cz + range(rng, -40, 40), s: range(rng, 0.8, 1.3) });
    }
  }

  // Beach palms and umbrellas along the coast.
  for (let z = -1080; z <= 1080; z += 90) {
    palms.push({ x: -830 + range(rng, -8, 8), z: z + range(rng, -20, 20), s: range(rng, 1.0, 1.5) });
    if (chance(rng, 0.5)) palms.push({ x: -860 + range(rng, -6, 6), z: z + 45, s: range(rng, 0.9, 1.2) });
  }
  // Street lamps at every second intersection, on land only.
  for (let i = 0; i < ROAD_LINES.length; i += 2) {
    for (let j = 0; j < ROAD_LINES.length; j += 2) {
      const lx = ROAD_LINES[i] + 16, lz = ROAD_LINES[j] + 16;
      if (lx > CFG.oceanEdge + 20 && lz < CFG.marinaEdge - 20) lamps.push({ x: lx, z: lz });
    }
  }
  // Sun coins: 12, spread over districts, always on walkable ground.
  const coinSpots = [
    [-840, -960], [-720, -720], [-80, 80], [240, -80], [560, 400], [880, -880],
    [80, 1040], [-560, 240], [400, 720], [-240, -560], [720, -240], [80, -880],
  ];
  const coins = coinSpots.map(([x, z], k) => ({ id: k, x, z, taken: false }));

  const world = { buildings, palms, lamps, parks, signs, houses, coins, landmarks: LANDMARKS, rng };
  world.pointInBuilding = (x, z, r) => {
    for (const b of buildings) {
      if (Math.abs(x - b.x) < b.w / 2 + r && Math.abs(z - b.z) < b.d / 2 + r) return b;
    }
    return null;
  };
  world.resolveBuilding = (p, r) => {
    for (const b of buildings) {
      const dx = p.x - b.x, dz = p.z - b.z;
      const ox = b.w / 2 + r - Math.abs(dx), oz = b.d / 2 + r - Math.abs(dz);
      if (ox > 0 && oz > 0) {
        if (ox < oz) p.x = b.x + Math.sign(dx || 1) * (b.w / 2 + r);
        else p.z = b.z + Math.sign(dz || 1) * (b.d / 2 + r);
      }
    }
  };
  world.randomRoadPoint = () => {
    const vertical = chance(rng, 0.5);
    const line = pick(rng, TRAFFIC_LINES);
    // Along-road coordinate stays on land: no sea at either end.
    const t = vertical
      ? range(rng, CFG.gridMin + 40, CFG.marinaEdge - 40)
      : range(rng, CFG.beachEdge + 40, CFG.gridMax - 40);
    return vertical ? { x: line, z: t } : { x: t, z: line };
  };
  world.spawnPoints = {
    player: { x: 80, z: 160 },
    safehouse: { x: 880, z: -880 },
    cafe: { x: -720, z: -720 },
    marina: { x: 80, z: 1000 },
  };
  return world;
}
