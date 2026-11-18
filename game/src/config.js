// Every tuning number and colour of Solmar Bay in one place. The world is measured in
// metres: x runs east, z runs south, y runs up. The city is a road grid with a beach and an
// ocean on its south edge; the ground texture and the minimap both read the same layout.

export const CITY = {
  // Roads: five avenues (x = const) and five streets (z = const), 14 m wide.
  avenues: [-132, -66, 0, 66, 132],
  streets: [-132, -66, 0, 66, 132],
  roadWidth: 14,
  laneOffset: 3.5,
  // City square, then sand, then open water to the south.
  half: 160,
  sandFrom: 160,
  sandTo: 196,
  seaFrom: 196,
  seaTo: 420,
};

export const BLOCK = 52;

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const PLAYER = {
  radius: 0.6,
  walkSpeed: 4.2,
  sprintSpeed: 7.2,
  turnSpeed: 10,
  punchRange: 2.1,
  punchArc: 1.9,
  punchCooldown: 0.45,
};

export const CAR = {
  length: 4.4,
  width: 1.9,
  radius: 2.1,
  accel: 13,
  brake: 26,
  reverseAccel: 8,
  maxSpeed: 27,
  sportMaxSpeed: 34,
  maxReverse: 9,
  steerMax: 0.55,
  handbrakeGrip: 0.35,
};

export const TRAFFIC_COUNT = 14;
export const PED_COUNT = 18;

export const WANTED = {
  max: 5,
  decaySeconds: 20,
  stealCar: 1,
  hitPed: 1,
  hitCop: 1,
  punchCop: 1,
  policeChaseSpeed: 33,
  bustedHoldSeconds: 2.5,
  copCatchSeconds: 1.5,
  copChaseSpeed: 6.6,
  spawnDistance: 90,
  despawnDistance: 140,
};

export const MISSION_REWARDS = [150, 400, 600, 900, 1500];

export const PALETTE = {
  sky: 0x8ec9ee,
  fog: 0xa8d0e8,
  sun: 0xfff2d8,
  ground: 0x3a3f46,
  road: 0x33373d,
  sidewalk: 0xb9b3a4,
  sand: 0xe8d29a,
  sea: 0x2e7f9e,
  building: [0xe8b48c, 0xd9a06f, 0xc98f6a, 0x9fb8c8, 0xe0cfa8, 0xb8c4a8],
  glass: 0x2b4a5e,
  palm: 0x4d7c4a,
  trunk: 0x8a6b4a,
  player: 0xe85d3d,
  police: 0xf2f2f2,
  taxi: 0xf2c230,
  text: '#f5f1e6',
  muted: '#b8b0a0',
  accent: '#ffb347',
  wanted: '#ff5252',
  waypoint: '#ffd23d',
};

/** Where the save is kept between visits (this browser only). */
export const SAVE_KEY = 'solmar-bay.save.v1';
export const BEST_KEY = 'solmar-bay.best.v1';

/** The city's own names: no real place, no existing game, no borrowed brand. */
export const NAMES = {
  city: 'Solmar Bay',
  player: 'Mara Voss',
  contact: 'Rook',
  cafe: 'Café Marisol',
  bank: 'Solmar Mutual Bank',
  safehouse: 'The Gull House',
  districts: ['Old Marina', 'Palm Row', 'Cactus Court', 'The Docks', 'Sunset Strip'],
};
