// Solmar Bay — seeded city layout data (no meshes here, just numbers).
// A 6x6 block grid with roads between the blocks, a beach and marina on the
// south edge, landmark buildings with neon signs, and spots for coins,
// parked cars, taxi stands and mission waypoints.
import { BUILDING_COLORS, WORLD } from './config.js';

const NEON_SIGNS = [
  'CASINO', 'TROPICANA', 'HOTEL MIRAMAR', 'PALM COURT',
  'NEON BAR', 'OCEAN VIEW', 'EL DORADO', 'SUNSET MOTEL',
];

export function createWorldData(rng) {
  const { blocks, block, pitch, half } = WORLD;
  const buildings = [];
  const parks = [];
  const roadLines = [];
  for (let i = 0; i <= blocks; i += 1) roadLines.push(-half + i * pitch);

  const blockCenters = [];
  for (let i = 0; i < blocks; i += 1) blockCenters.push(-half + pitch / 2 + i * pitch);

  // Buildings: split each block into 2x2 lots; most lots get a tower with a
  // varied height and colour, a few blocks stay open as parks.
  for (let bx = 0; bx < blocks; bx += 1) {
    for (let bz = 0; bz < blocks; bz += 1) {
      const cx = blockCenters[bx];
      const cz = blockCenters[bz];
      const central = Math.abs(cx) < 50 && Math.abs(cz) < 50;
      if (rng.chance(0.14)) {
        parks.push({ x: cx, z: cz, size: block });
        continue;
      }
      const lots = [
        { dx: -8.5, dz: -8.5 }, { dx: 8.5, dz: -8.5 },
        { dx: -8.5, dz: 8.5 }, { dx: 8.5, dz: 8.5 },
      ];
      for (const lot of lots) {
        if (!rng.chance(0.82)) continue;
        const tall = central && rng.chance(0.45);
        const h = tall ? rng.range(34, 62) : rng.range(8, 30);
        buildings.push({
          x: cx + lot.dx,
          z: cz + lot.dz,
          w: rng.range(10, 15),
          d: rng.range(10, 15),
          h,
          color: rng.pick(BUILDING_COLORS),
          neon: null,
          roof: rng.pick(['#5a4a3a', '#3a3f46', '#6a5a4a', '#2f3338']),
        });
      }
    }
  }

  // Neon landmarks: pin the named signs on tall buildings near the spots
  // missions use, so the signs are real places in the world.
  const landmarkSpots = [
    { text: 'CASINO', x: 92, z: -92 },
    { text: 'TROPICANA', x: -92, z: 92 },
    { text: 'HOTEL MIRAMAR', x: -92, z: -46 },
    { text: 'PALM COURT', x: 46, z: 92 },
    { text: 'NEON BAR', x: 0, z: -92 },
    { text: 'OCEAN VIEW', x: 92, z: 46 },
    { text: 'EL DORADO', x: -46, z: 0 },
    { text: 'SUNSET MOTEL', x: 46, z: -46 },
  ];
  const landmarks = {};
  for (const spot of landmarkSpots) {
    let best = null;
    let bestD = Infinity;
    for (const b of buildings) {
      if (b.neon) continue;
      const d = Math.hypot(b.x - spot.x, b.z - spot.z);
      if (d < bestD) {
        bestD = d;
        best = b;
      }
    }
    if (best) {
      best.neon = spot.text;
      landmarks[spot.text] = { x: best.x, z: best.z, h: best.h };
    }
  }

  // Curb spots for parked cars, along both sides of every road.
  const parkedSpots = [];
  for (const line of roadLines) {
    for (let t = -half + 18; t < half - 10; t += 26) {
      if (rng.chance(0.5)) {
        parkedSpots.push({ x: line + WORLD.road / 2 + 1.6, z: t + rng.range(-4, 4), angle: Math.PI / 2 });
      }
      if (rng.chance(0.5)) {
        parkedSpots.push({ x: line - WORLD.road / 2 - 1.6, z: t + rng.range(-4, 4), angle: -Math.PI / 2 });
      }
      if (rng.chance(0.5)) {
        parkedSpots.push({ x: t + rng.range(-4, 4), z: line + WORLD.road / 2 + 1.6, angle: 0 });
      }
      if (rng.chance(0.5)) {
        parkedSpots.push({ x: t + rng.range(-4, 4), z: line - WORLD.road / 2 - 1.6, angle: Math.PI });
      }
    }
  }

  // Sun Coin spots: parks, the beach, the marina, plazas and alleys.
  const coinSpots = [];
  for (const p of parks.slice(0, 4)) coinSpots.push({ x: p.x, z: p.z });
  coinSpots.push({ x: -60, z: 172 }, { x: 20, z: 178 }, { x: 90, z: 170 });
  coinSpots.push({ x: -115, z: -23 }, { x: 69, z: -69 }, { x: 23, z: 115 });
  coinSpots.push({ x: -23, z: -115 }, { x: 115, z: 23 }, { x: -69, z: 69 });
  while (coinSpots.length < 12) {
    coinSpots.push({ x: rng.range(-120, 120), z: rng.range(-120, 120) });
  }

  // Taxi stands near busy intersections.
  const taxiStands = [
    { x: 0, z: 0 }, { x: 46, z: -46 }, { x: -46, z: 46 }, { x: 92, z: 0 },
  ];

  // Mission waypoints, resolved against the real landmark buildings.
  const missionSpots = {
    marina: { x: 40, z: 176 },
    casino: landmarks.CASINO || { x: 92, z: -92 },
    tropicana: landmarks.TROPICANA || { x: -92, z: 92 },
    hotel: landmarks['HOTEL MIRAMAR'] || { x: -92, z: -46 },
    drop: { x: -46, z: 115 },
    plaza: { x: 0, z: 0 },
  };

  return {
    buildings,
    parks,
    roadLines,
    blockCenters,
    landmarks,
    parkedSpots,
    coinSpots: coinSpots.slice(0, 12),
    taxiStands,
    missionSpots,
    spawn: { x: 0, z: 46, heading: Math.PI },
    loops: blockCenters.flatMap((cx) => blockCenters.map((cz) => ({
      corners: [
        { x: cx - 23, z: cz - 23 }, { x: cx + 23, z: cz - 23 },
        { x: cx + 23, z: cz + 23 }, { x: cx - 23, z: cz + 23 },
      ],
    }))),
  };
}
