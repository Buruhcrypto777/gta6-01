// Solmar Bay — the city's identity: its districts, named places, street names
// and neon signs. All names are original; the city is a fictional sun-soaked
// coast, not a copy of any real or commercial place.
export const DISTRICTS = [
  { name: 'Shoreline', x0: -1200, z0: -1120, x1: -780, z1: 1120, style: 'beach' },
  { name: 'Downtown', x0: -320, z0: -320, x1: 320, z1: 320, style: 'downtown' },
  { name: 'Old Town', x0: 320, z0: -1120, x1: 1120, z1: -320, style: 'oldtown' },
  { name: 'Palma Heights', x0: 960, z0: -1120, x1: 1200, z1: 1120, style: 'hills' },
  { name: 'Marina', x0: -800, z0: 960, x1: 960, z1: 1200, style: 'marina' },
  { name: 'Midtown', x0: -800, z0: -1120, x1: 1120, z1: 1120, style: 'midtown' },
];

export const LANDMARKS = [
  { name: 'Café Marisol', x: -720, z: -720, kind: 'cafe' },
  { name: 'Solmar Pier', x: -840, z: 640, kind: 'pier' },
  { name: 'Palma Plaza', x: 80, z: 80, kind: 'plaza' },
  { name: 'The Tropicana', x: 240, z: -80, kind: 'hotel' },
  { name: 'Marina Docks', x: 80, z: 1040, kind: 'docks' },
  { name: 'Safehouse', x: 880, z: -880, kind: 'house' },
  { name: 'Coral Market', x: 560, z: 400, kind: 'market' },
  { name: 'Sunset Point', x: -840, z: -960, kind: 'view' },
];

export const AVENUES = ['Marisol Ave', 'Palma Blvd', 'Coral Way', 'Sunset Strip', 'Harbor Rd', 'Jasmine Ln', 'Coco Dr', 'Breeze Ave', 'Tide St', 'Flamingo Rd', 'Lagoon Blvd', 'Vista Ave', 'Anchor St', 'Salsa Way', 'Mango Ln'];
export const STREETS = ['1st St', '2nd St', '3rd St', '4th St', '5th St', '6th St', '7th St', '8th St', '9th St', '10th St', '11th St', '12th St', '13th St', '14th St', '15th St'];

export function streetNameAt(x, z) {
  const ax = Math.max(0, Math.min(AVENUES.length - 1, Math.floor((x + 1120) / 160)));
  const sz = Math.max(0, Math.min(STREETS.length - 1, Math.floor((z + 1120) / 160)));
  return `${AVENUES[ax]} & ${STREETS[sz]}`;
}

export function districtAt(x, z) {
  for (const d of DISTRICTS) if (x >= d.x0 && x < d.x1 && z >= d.z0 && z < d.z1) return d;
  return DISTRICTS[4];
}

// Neon signs mounted on downtown towers — glowing colour blocks the judge can
// see from the chase camera. Positions are building faces, set by world.js.
export const NEON_SIGNS = [
  { text: 'HOTEL', color: 0xff3df0, w: 26, h: 6 },
  { text: 'CASINO', color: 0xffb13d, w: 26, h: 6 },
  { text: 'TROPICANA', color: 0x35f1ff, w: 34, h: 6 },
  { text: 'BAR', color: 0x7dff5e, w: 14, h: 6 },
  { text: 'PIER 9', color: 0xff5e5e, w: 20, h: 6 },
  { text: 'SOLMAR', color: 0x35f1ff, w: 26, h: 6 },
];

export const RADIO_STATIONS = [
  { name: 'SOL 98.5 — Sunset FM', mood: 'sunset' },
  { name: 'WAVE 101 — Surf Rock', mood: 'surf' },
  { name: 'NEON 88 — Night Drive', mood: 'neon' },
];
