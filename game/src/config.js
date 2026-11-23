// Solmar Bay — shared tuning constants.
// One place for every number the systems agree on: world size, speeds,
// wanted rules, money, keys and the save key.
export const STEP = 1 / 60;
export const DEFAULT_SEED = 7;
export const SAVE_KEY = 'solmar-bay-save-v3';

export const WORLD = {
  size: 440, // playable square in metres, centred on 0,0
  roadEvery: 44, // streets repeat every 44 m
  roadWidth: 12, // asphalt width
  block: 32, // building block width between roads
  beachAt: 176, // z beyond this is sand, then ocean
  oceanAt: 208, // z beyond this is water
};

export const BUILDING_COLORS = [
  0xe8b04b, 0xdf7f5a, 0x7fb3a8, 0xf2e3c6, 0x8fa3bf, 0xd96a6a,
  0xc9b458, 0x9db98a, 0xe6c9a8, 0x6f8f7b, 0xcf9a6a, 0xb5c4d6,
];

export const CAR_COLORS = [
  0xc0392b, 0x2e86c1, 0xf1c40f, 0x7d3c98, 0x1abc9c,
  0xe67e22, 0xecf0f1, 0x2c3e50, 0xd35400, 0x16a085,
];

export const VEHICLE_TYPES = ['sedan', 'taxi', 'coupe', 'van', 'truck', 'convertible'];

export const VEHICLE_STATS = {
  sedan: { accel: 14, top: 34, turn: 2.1, brake: 26 },
  taxi: { accel: 13, top: 32, turn: 2.1, brake: 26 },
  coupe: { accel: 19, top: 42, turn: 2.5, brake: 30 },
  van: { accel: 10, top: 26, turn: 1.7, brake: 22 },
  truck: { accel: 9, top: 24, turn: 1.5, brake: 20 },
  convertible: { accel: 17, top: 40, turn: 2.4, brake: 28 },
  police: { accel: 18, top: 40, turn: 2.4, brake: 30 },
};

export const WALK_SPEED = 5.2;
export const SPRINT_SPEED = 8.5;
export const PUNCH_RANGE = 2.4;
export const PUNCH_COOLDOWN = 0.45;
export const COIN_VALUE = 50;
export const START_CASH = 250;

export const RADIO_STATIONS = [
  'SOLMAR FM — Sunset Drive',
  'PALM 98 — Smooth Nights',
  'VICE TALK — City Beat',
];
