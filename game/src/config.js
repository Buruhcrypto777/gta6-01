// Solmar Bay — shared tuning, keys and palettes for the Round 4 build.
// Everything the modules agree on lives here so a tweak lands in one place.
export const STEP = 1 / 60;
export const SAVE_KEY = 'solmar-bay-save-v3';

export const WORLD = {
  blocks: 6, // city blocks per side
  block: 34, // block edge, metres
  road: 12, // road width, metres
  pitch: 46, // road centre to road centre
  half: 138, // city edge (half-width)
  beachZ: 158, // sand starts here
  oceanZ: 196, // water starts here
  bound: 290, // playable clamp
};

export const SPEEDS = {
  walk: 6.5,
  run: 9.5,
  trafficMin: 8,
  trafficMax: 14,
  pedMin: 1.1,
  pedMax: 1.9,
  flee: 4.2,
};

export const WANTED_MAX = 5;

export const STATIONS = [
  { name: 'SOLMAR FM', tag: 'synthwave nights' },
  { name: 'VICE HEAT', tag: 'driving bass' },
  { name: 'PALM 98', tag: 'mellow pads' },
];

export const BUILDING_COLORS = [
  '#e8b04b', '#d96a4f', '#7fb5a3', '#e6d7b8', '#c98bb0', '#8fa8c8',
  '#e07856', '#a8c686', '#f2e3c6', '#b6789e', '#6fa8a0', '#e5a83b',
  '#d98a7a', '#7fb0d9', '#cbb98a', '#e8c46a',
];

export const CAR_COLORS = [
  '#c0392b', '#2471a3', '#f1c40f', '#e67e22', '#7d3c98', '#16a085',
  '#ecf0f1', '#2c3e50', '#e74c3c', '#3498db',
];

export const SHIRT_COLORS = [
  '#e74c3c', '#3498db', '#f39c12', '#2ecc71', '#9b59b6',
  '#1abc9c', '#e67e22', '#ecf0f1', '#fd79a8', '#00cec9',
];

export const SKIN_COLORS = ['#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#ffdbac'];

export const ACTIONS = {
  CONFIRM: 1,
  PAUSE: 2,
  ENTER: 4,
  PUNCH: 8,
  WEAPON1: 16,
  WEAPON2: 32,
  RADIO: 64,
  TAXI: 128,
};

export const SHOT_NAMES = ['cover', 'downtown', 'mission', 'beach'];
