// Solmar Bay — every tuning number, colour and story beat in one place.
// The world is a grid city on a coast: roads run north-south and east-west on a
// 56-unit pitch, the beach and sea sit on the east edge, downtown rises in the middle.
export const STEP = 1 / 60;

export const GRID = {
  pitch: 56,
  roads: [-196, -140, -84, -28, 28, 84, 140, 196],
  blocks: [-168, -112, -56, 0, 56, 112, 168],
  roadHalf: 6,
  min: -202,
  max: 202,
  beachX: 202,
  seaX: 244,
};

export const SCREENS = { TITLE: 'title', PLAY: 'play', PAUSED: 'paused', BUSTED: 'busted' };

export const PLAYER = {
  walkSpeed: 6.5,
  runSpeed: 10,
  radius: 0.9,
  punchRange: 2.4,
  punchCooldown: 0.45,
};

export const CAR = {
  accel: 15,
  brake: 34,
  reverseAccel: 10,
  maxSpeed: 38,
  maxReverse: 11,
  steer: 1.9,
  grip: 6,
  radius: 2.1,
  handbrakeDecel: 26,
};

export const TRAFFIC = {
  count: 12,
  cruiseMin: 9,
  cruiseMax: 14,
  followGap: 9,
  blockedSeconds: 3,
};

export const PEDS = { count: 18, walkMin: 1.2, walkMax: 2.2, fleeSpeed: 7.5 };

export const WANTED = {
  max: 5,
  steal: 1,
  hitPed: 1,
  hitCop: 1,
  punchCop: 2,
  decayQuietSeconds: 18,
  decayStepSeconds: 9,
};

// Mara Voss owes the Solmar syndicate one last job. Five missions, then free roam.
export const MISSIONS = [
  {
    id: 'first-wheels',
    name: 'First Wheels',
    briefing: 'Mara needs wheels. Borrow a car — any car — and the night begins.',
    objective: 'Steal a car (press E near one)',
    reward: 100,
    type: 'steal',
  },
  {
    id: 'the-drop',
    name: 'The Drop',
    briefing: 'A package for Café Marisol, on the east side. Drive it over, no questions.',
    objective: 'Drive to Café Marisol',
    reward: 400,
    type: 'goto',
    waypoint: { x: 140, z: 140 },
  },
  {
    id: 'hot-pursuit',
    name: 'Hot Pursuit',
    briefing: 'The drop went loud. Three stars and every cruiser in Solmar Bay is on you.',
    objective: 'Lose the cops — get your wanted level to 0',
    reward: 500,
    type: 'lose-cops',
    startWanted: 3,
  },
  {
    id: 'the-getaway',
    name: 'The Getaway',
    briefing: 'The syndicate wants you at the docks, and the law is already moving. Go.',
    objective: 'Reach the docks with the law on your tail',
    reward: 600,
    type: 'goto',
    waypoint: { x: -196, z: -140 },
    startWanted: 2,
  },
  {
    id: 'solmar-run',
    name: 'Solmar Run',
    briefing: 'One last run: three checkpoints, end to end, finish at the lighthouse.',
    objective: 'Race the checkpoints to the lighthouse',
    reward: 800,
    type: 'checkpoints',
    checkpoints: [
      { x: -140, z: 140 },
      { x: 140, z: -140 },
      { x: 222, z: -170 },
    ],
  },
];

export const STORY_BONUS = 1000;
export const BUSTED_FINE = 200;

export const PALETTE = {
  sky: 0x8ec9ee,
  fog: 0xa8d0e8,
  ground: 0xb9b3a4,
  road: 0x3a3f46,
  roadLine: 0xf5d90a,
  sidewalk: 0xcfc9bb,
  sand: 0xe8d49a,
  sea: 0x2f7fc2,
  seaDeep: 0x1d5f9e,
  buildingA: 0xd8cdb8,
  buildingB: 0xb9c4cc,
  buildingC: 0xc9a689,
  buildingD: 0x9fb4a8,
  palmTrunk: 0x8a6b48,
  palmLeaf: 0x3f8f4f,
  umbrella: 0xe85d3d,
  carRed: 0xc22e2e,
  carTeal: 0x2e8f8a,
  carYellow: 0xe8b93d,
  carWhite: 0xe8e8e8,
  carBlack: 0x22242a,
  policeWhite: 0xf0f0f0,
  policeBlack: 0x1c1e24,
  playerJacket: 0x2e6f8a,
  playerSkin: 0xd9a077,
  playerCap: 0xc22e2e,
  beacon: 0xf5d90a,
  text: '#f2f4f6',
  gold: '#f5c542',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
export const SAVE_KEY = 'solmar-bay.save.v1';

export const KEYS = {
  up: ['KeyW', 'ArrowUp'],
  down: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  enterCar: 'KeyE',
  punch: 'KeyF',
  handbrake: 'Space',
  pause: 'Escape',
  confirm: 'Enter',
  run: 'ShiftLeft',
};
