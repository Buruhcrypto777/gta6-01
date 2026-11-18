// The story: five missions in order, each with its own way to be finished.
// Missions are checked inside the world's step, so a staged drive that reaches a
// waypoint finishes the mission exactly the way a player's drive does.
import { MISSIONS } from './config.js';
import { dist2d } from './random.js';
import { finishStory, setToast } from './world.js';

const WAYPOINT_RADIUS = 9;

/** The mission the player is on right now, or null when the story is done. */
export function currentMission(state) {
  if (state.missionIndex >= MISSIONS.length) return null;
  return MISSIONS[state.missionIndex];
}

/** Where the beacon and the HUD should point, or null for missions without a place. */
export function missionWaypoint(state) {
  const mission = currentMission(state);
  if (!mission) return null;
  if (mission.type === 'steal') {
    // Point at the nearest car the player could borrow.
    let best = null;
    let bestD = Infinity;
    for (const car of state.cars) {
      if (car.kind === 'player') continue;
      const d = dist2d(state.player.x, state.player.z, car.x, car.z);
      if (d < bestD) { bestD = d; best = car; }
    }
    return best ? { x: best.x, z: best.z } : null;
  }
  if (mission.type === 'goto') return mission.waypoint;
  if (mission.type === 'checkpoints') return mission.checkpoints[state.mission.checkpoint];
  return null;
}

/** Start a mission's scripted heat (a wanted level it opens with). */
function armMission(state, mission) {
  if (mission.startWanted && state.wanted < mission.startWanted) {
    state.wanted = mission.startWanted;
    state.lastCrimeAt = state.time;
  }
  state.mission.started = true;
  state.mission.checkpoint = 0;
  // The briefing waits behind the completion toast of the mission before it.
  state.pendingBriefing = { text: `${mission.name} — ${mission.briefing}`, at: state.time + 5.5 };
}

/** Pay out a finished mission and move to the next one. */
function completeMission(state, mission) {
  state.cash += mission.reward;
  state.stats.missionsDone += 1;
  state.events.push({ type: 'jingle' });
  setToast(state, `Mission complete — ${mission.name} +$${mission.reward}`, 5);
  state.missionIndex += 1;
  state.mission = { checkpoint: 0, started: false };
  const next = currentMission(state);
  if (next) {
    armMission(state, next);
  } else {
    finishStory(state);
  }
}

/** Check the current mission's finish condition. Called every world step. */
export function updateMissions(state) {
  const mission = currentMission(state);
  if (!mission) return;
  if (!state.mission.started) armMission(state, mission);
  if (mission.type === 'steal') {
    if (!state.player.onFoot) completeMission(state, mission);
    return;
  }
  if (mission.type === 'goto') {
    const w = mission.waypoint;
    if (dist2d(state.player.x, state.player.z, w.x, w.z) < WAYPOINT_RADIUS) {
      completeMission(state, mission);
    }
    return;
  }
  if (mission.type === 'lose-cops') {
    if (state.wanted === 0) completeMission(state, mission);
    return;
  }
  if (mission.type === 'checkpoints') {
    const cp = mission.checkpoints[state.mission.checkpoint];
    if (cp && dist2d(state.player.x, state.player.z, cp.x, cp.z) < WAYPOINT_RADIUS) {
      state.mission.checkpoint += 1;
      if (state.mission.checkpoint >= mission.checkpoints.length) {
        completeMission(state, mission);
      } else {
        setToast(state, `Checkpoint ${state.mission.checkpoint} of ${mission.checkpoints.length} — keep going!`, 3);
        state.events.push({ type: 'jingle' });
      }
    }
  }
}

/** Human-readable objective line for the HUD, with a live distance. */
export function objectiveText(state) {
  const mission = currentMission(state);
  if (!mission) return state.storyDone ? 'Free roam — Solmar Bay is yours' : '';
  const w = missionWaypoint(state);
  if (!w) return `${mission.name}: ${mission.objective}`;
  const d = Math.round(dist2d(state.player.x, state.player.z, w.x, w.z));
  const extra = mission.type === 'checkpoints'
    ? ` (${state.mission.checkpoint + 1}/${mission.checkpoints.length})` : '';
  return `${mission.name}: ${mission.objective}${extra} — ${d} m`;
}
