// Solmar Bay — every number the game reads lives here: world size, the
// golden-hour palette, driving and wanted tuning, mission rewards. Change the
// feel of the game by editing this file alone.
export const CFG = {
  seed: 20261120,
  worldHalf: 1200,
  block: 160,
  roadWidth: 26,
  gridMin: -1120,
  gridMax: 1120,
  oceanEdge: -880, // west of this x is water
  beachEdge: -800, // sand strip between ocean and the coastal road
  marinaEdge: 1080, // south of this z is the harbour water

  palette: {
    skyTop: 0x2e6fc4,
    skyHorizon: 0xffb36b,
    sun: 0xffd27a,
    fog: 0xf7b98a,
    sea: 0x1d7f9e,
    seaDeep: 0x0f5a78,
    sand: 0xe8cf9a,
    asphalt: 0x3a3f46,
    asphaltEdge: 0x565d68,
    sidewalk: 0xb9b3a4,
    grass: 0x6fae5e,
    grassDry: 0x9dbb6a,
    crosswalk: 0xe8e6df,
    laneYellow: 0xffc93c,
    laneWhite: 0xe8e6df,
    building: [0xd8c9a8, 0xc9b18c, 0xb7a6c9, 0x9fb4c7, 0xe0a37e, 0xa8c6a0, 0xd97b6c, 0x8fb0c9],
    roof: [0x6b5a4e, 0x4e5a6b, 0x7a6a5a, 0x5a6b5a],
    windowLit: 0xffd27a,
    windowDark: 0x2c3a4a,
    neon: [0x35f1ff, 0xff3df0, 0xffb13d, 0x7dff5e, 0xff5e5e],
    car: [0xd94f3d, 0x3d7bd9, 0xe8c33d, 0x3dd9a0, 0xd9d9d9, 0x2c2c34, 0xd97bb0, 0x7a5fd9],
    police: 0xf2f2f2,
    taxi: 0xffc93c,
  },

  player: { walk: 7.5, sprint: 11.5, radius: 0.9, health: 100, punchRange: 2.4, punchDamage: 34, punchCooldown: 0.45 },
  car: { accel: 26, brake: 42, reverse: 14, maxSpeed: 46, maxReverse: 12, steer: 0.55, grip: 8.5, handbrakeGrip: 2.2, radius: 2.3 },
  traffic: { count: 16, minSpeed: 9, maxSpeed: 16, radius: 2.3 },
  peds: { count: 26, walk: 1.6, run: 4.2, radius: 0.7 },
  police: { baseSpeed: 30, ramSpeed: 38, spawnDist: 130, maxActive: 6, roadblockAt: 3, heliAt: 4, bustTime: 2.5 },
  wanted: { decayDelay: 20, decayEvery: 9, steal: 1, hitPed: 2, hitCar: 1, punch: 1, missionCrime: 2 },
  camera: { driveDist: 9.5, driveHeight: 4.2, footDist: 7, footHeight: 4.0, lerp: 5.5, fov: 62, fovKick: 8 },
  coins: { count: 12, value: 50 },
  rewards: { mission: [400, 600, 500, 700, 1500], taxi: 120, delivery: 180 },
  audio: { master: 0.5, music: 0.32, engine: 0.22, siren: 0.16 },
};

// Golden-hour sun: low in the west, over the ocean, so the beach shots glow
// and the camera-facing (south) sides of buildings and cars catch warm light.
// Azimuth ~2.75 rad points the sun west, slightly south of due west.
export const SUN = { azimuth: 2.75, elevation: 0.32, color: 0xffc27a, intensity: 2.6, hemiSky: 0x9ec8ee, hemiGround: 0xc98a5e, hemiIntensity: 1.05 };
