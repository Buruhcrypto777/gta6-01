// The story: five jobs for Mara Voss, a getaway driver in Solmar Bay who owes the local
// syndicate one last debt. Each mission is a title, a brief, an objective the HUD shows and
// a condition the update loop checks against the world. Finishing one pays cash, saves the
// progress and opens the next; after the fifth, the city is free roam.
import { MISSION_REWARDS, NAMES } from './config.js';
import { PLACES } from './city.js';
import { loadSave, saveProgress } from './save.js';

const CHECKPOINTS = [PLACES.marina, PLACES.pier, { x: 99, z: 99, name: 'Sunset Plaza' }];

const MISSIONS = [
  {
    id: 'wheels', title: 'First Wheels', reward: MISSION_REWARDS[0],
    brief: `${NAMES.player} needs wheels. Any car will do — the city is full of them.`,
    objective: 'Steal a car — walk up to one and press E',
  },
  {
    id: 'drop', title: 'The Drop', reward: MISSION_REWARDS[1],
    brief: `A package for ${NAMES.cafe}. Drive it to the beachfront — no police, no trouble.`,
    objective: `Drive to ${NAMES.cafe}`,
    waypoint: PLACES.cafe,
  },
  {
    id: 'pursuit', title: 'Hot Pursuit', reward: MISSION_REWARDS[2],
    brief: 'The drop was watched. Three stars, two patrol cars — lose them, all of them.',
    objective: 'Lose the cops — get your wanted level to 0',
    startWanted: 3,
  },
  {
    id: 'getaway', title: 'The Getaway', reward: MISSION_REWARDS[3],
    brief: `${NAMES.contact} is waiting at ${NAMES.bank} with a bag that is not his. Pick him up, then run him to ${NAMES.safehouse} — the police will not wait.`,
    objective: `Pick up ${NAMES.contact} at ${NAMES.bank}`,
    waypoint: PLACES.bank,
    stageWaypoint: PLACES.safehouse,
    startWanted: 0,
  },
  {
    id: 'run', title: 'Solmar Run', reward: MISSION_REWARDS[4],
    brief: 'One last run to clear the debt: three checkpoints, ninety seconds, the whole city watching.',
    objective: 'Hit all 3 checkpoints before the timer runs out',
    timeLimit: 90,
  },
];

export function createMissions(world) {
  const state = world.state;
  const saved = loadSave();
  state.cash = saved.cash;
  state.missionIndex = Math.min(saved.mission, MISSIONS.length - 1);
  let stage = 0;
  let timer = 0;
  let checkpointIndex = 0;

  function current() {
    return MISSIONS[state.missionIndex] ?? null;
  }

  function setWaypoint(place) {
    state.waypoint = place ? { x: place.x, z: place.z, name: place.name } : null;
  }

  function startMission(index) {
    state.missionIndex = index;
    stage = 0;
    timer = 0;
    checkpointIndex = 0;
    const mission = MISSIONS[index];
    if (!mission) {
      setWaypoint(null);
      return;
    }
    if (mission.id === 'pursuit') {
      state.wanted = mission.startWanted;
      state.wantedTimer = 0;
      for (let i = 0; i < 3; i += 1) world.spawnPoliceCar();
    }
    if (mission.id === 'run') {
      timer = mission.timeLimit;
      setWaypoint(CHECKPOINTS[0]);
    } else {
      setWaypoint(mission.waypoint ?? null);
    }
    world.setToast(`${mission.title} — ${mission.objective}`, 5);
  }

  function completeMission() {
    const mission = current();
    if (!mission) return;
    state.cash += mission.reward;
    state.missionIndex += 1;
    saveProgress(state);
    world.setToast(`Mission complete — ${mission.title}  +$${mission.reward}`, 4);
    if (state.missionIndex >= MISSIONS.length) {
      setWaypoint(null);
      world.setToast('Debt cleared. Solmar Bay is yours — free roam.', 6);
      return;
    }
    startMission(state.missionIndex);
  }

  function near(x, z, radius) {
    return Math.hypot(state.player.x - x, state.player.z - z) < radius;
  }

  /** Check the current mission's condition; call once per step. */
  function update(dt) {
    const mission = current();
    if (!mission) return;
    if (mission.id === 'wheels') {
      if (!state.player.onFoot) completeMission();
      return;
    }
    if (mission.id === 'drop') {
      if (near(mission.waypoint.x, mission.waypoint.z, 9)) completeMission();
      return;
    }
    if (mission.id === 'pursuit') {
      if (state.wanted === 0) completeMission();
      return;
    }
    if (mission.id === 'getaway') {
      if (stage === 0) {
        if (near(mission.waypoint.x, mission.waypoint.z, 8)) {
          stage = 1;
          state.wanted = 2;
          state.wantedTimer = 0;
          world.spawnPoliceCar();
          world.spawnPoliceCar();
          setWaypoint(mission.stageWaypoint);
          world.setToast(`${NAMES.contact} is in. Drive to ${NAMES.safehouse} — lose the cops after.`, 5);
        }
        return;
      }
      if (near(mission.stageWaypoint.x, mission.stageWaypoint.z, 9)) completeMission();
      return;
    }
    if (mission.id === 'run') {
      timer -= dt;
      const point = CHECKPOINTS[checkpointIndex];
      if (point && near(point.x, point.z, 10)) {
        checkpointIndex += 1;
        const next = CHECKPOINTS[checkpointIndex];
        if (next) {
          setWaypoint(next);
          world.setToast(`Checkpoint ${checkpointIndex} of 3 — ${Math.ceil(timer)}s left`, 3);
        } else {
          completeMission();
        }
        return;
      }
      if (timer <= 0) {
        world.setToast('Out of time — the run restarts.', 4);
        startMission(state.missionIndex);
      }
    }
  }

  function objectiveText() {
    const mission = current();
    if (!mission) return 'Free roam — Solmar Bay is yours';
    let text = `${mission.title}: ${mission.objective}`;
    if (mission.id === 'getaway' && stage === 1) text = `${mission.title}: Drive ${NAMES.contact} to ${NAMES.safehouse}`;
    if (mission.id === 'run') text += ` — ${Math.max(0, Math.ceil(timer))}s`;
    return text;
  }

  function distanceToWaypoint() {
    if (!state.waypoint) return null;
    return Math.round(Math.hypot(state.player.x - state.waypoint.x, state.player.z - state.waypoint.z));
  }

  startMission(state.missionIndex);
  return { current, update, startMission, objectiveText, distanceToWaypoint, missions: MISSIONS };
}
