// Fists: the player's punch, on foot, and what it does to the people nearby.
import { PLAYER, WANTED } from './config.js';
import { dist2d } from './random.js';
import { addWanted } from './world.js';

/** Swing at the nearest person in front of the player. */
export function tryPunch(state) {
  const p = state.player;
  if (!p.onFoot) return false;
  const fx = Math.sin(p.heading);
  const fz = Math.cos(p.heading);
  // Pedestrians first: one good punch sends them running.
  for (const ped of state.peds) {
    if (ped.mode === 'down') continue;
    const dx = ped.x - p.x;
    const dz = ped.z - p.z;
    const d = Math.hypot(dx, dz);
    if (d < PLAYER.punchRange && (dx * fx + dz * fz) > 0) {
      ped.mode = 'flee';
      ped.timer = 3;
      ped.x += dx * 0.6;
      ped.z += dz * 0.6;
      state.events.push({ type: 'punch' });
      return true;
    }
  }
  // A foot cop does not run. Hitting one is a crime.
  if (state.footCops) {
    for (const cop of state.footCops) {
      const d = dist2d(p.x, p.z, cop.x, cop.z);
      if (d < PLAYER.punchRange + 0.4) {
        cop.x += fx * 2;
        cop.z += fz * 2;
        state.events.push({ type: 'punch' });
        addWanted(state, WANTED.punchCop, 'You punched a cop!');
        return true;
      }
    }
  }
  state.events.push({ type: 'punch' });
  return false;
}
