// Combat on foot: one punch. It lands in a short arc in front of Mara — a pedestrian goes
// down for a few seconds, a cop goes down too but the punch is a crime, so the wanted level
// rises and the cop's colleagues come running. The world raises the punch event; this file
// decides what the punch hits.
import { PLAYER } from './config.js';

function angleDifference(from, to) {
  let d = to - from;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** Resolve a punch that just started: knock down whatever is in front of Mara. */
export function resolvePunch(world) {
  const state = world.state;
  const player = state.player;
  let events = 0;
  for (const ped of state.peds) {
    if (ped.state === 'down') continue;
    const dx = ped.x - player.x;
    const dz = ped.z - player.z;
    const dist = Math.hypot(dx, dz);
    if (dist > PLAYER.punchRange) continue;
    const angle = Math.atan2(dx, dz);
    if (Math.abs(angleDifference(player.heading, angle)) > PLAYER.punchArc / 2) continue;
    ped.state = 'down';
    ped.downTimer = 3;
    if (ped.kind === 'cop') {
      // A cop goes down too — and the punch is a crime, so more police come.
      ped.downTimer = 1.5;
      events |= world.addCrime('punchCop');
    } else {
      ped.fleeTimer = 4;
    }
  }
  return events;
}
