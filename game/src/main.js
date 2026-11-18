// Boot and the one loop: input is read every frame, the world advances in fixed
// 1/60 s steps (several in a slow frame, none in a fast one), and the renderer
// paints what is there. The game moves between four screens: title, play, paused
// and busted.
//
// ?seed=N fixes the city. ?shot=cover|downtown|mission|beach (with &seed=N) stages
// that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { CAR, SCREENS, STEP } from './config.js';
import { createWorld, resetWorld, stepWorld } from './world.js';
import { missionWaypoint } from './missions.js';
import { ACTION_CONFIRM, ACTION_ENTER_CAR, ACTION_PAUSE, ACTION_PUNCH, createInput } from './input.js';
import { createRenderer } from './render.js';
import { createHud } from './hud.js';
import { loadSave, saveGame } from './save.js';
import { crashSound, engineSound, ensureAudio, jingleSound, punchSound, sirenSound } from './audio.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const save = loadSave();
const world = createWorld(seed, save);
const renderer = createRenderer(canvas, world.city, seed);
const hud = createHud();
const input = createInput(canvas);

function announce(message) {
  status.textContent = message;
}

/** Drain the world's events into sound and screen shake. */
function drainEvents(dt) {
  for (const event of world.events) {
    if (event.type === 'crash') {
      crashSound();
      world.shakeTime = 0.3;
    } else if (event.type === 'jingle') {
      jingleSound();
    } else if (event.type === 'punch') {
      punchSound();
    }
  }
  world.events.length = 0;
  world.shakeTime = Math.max(0, (world.shakeTime ?? 0) - dt);
  const car = world.player.car;
  engineSound(car ? Math.abs(car.speed) / CAR.maxSpeed : 0);
  sirenSound(world.wanted > 0, dt);
}

/** Keep the HUD's waypoint and the renderer's beacon on the current objective. */
function syncWaypoint() {
  world.waypoint = missionWaypoint(world);
}

function statePolice(world) {
  return world.cars.filter((c) => c.kind === 'police').map((c) => ({ x: Math.round(c.x), z: Math.round(c.z) }));
}

function runShot(name) {
  const framing = stageShot(name, world);
  world.screen = framing.screen;
  world.camYaw = framing.camYaw;
  world.camPitch = framing.camPitch;
  world.camDist = framing.camDist;
  syncWaypoint();
  hud.update(world, 'play');
  window.__shotInfo = {
    player: { x: Math.round(world.player.x), z: Math.round(world.player.z), heading: +world.player.heading.toFixed(2), speed: +(world.player.car ? world.player.car.speed : 0).toFixed(1) },
    cam: { yaw: +world.camYaw.toFixed(2), pitch: world.camPitch, dist: world.camDist },
    wanted: world.wanted,
    cash: world.cash,
    mission: world.missionIndex,
    police: statePolice(world),
    toast: world.toast.text,
  };
  let painted = 0;
  function paint() {
    renderer.draw(world, world.screen);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  let screen = SCREENS.TITLE;
  let accumulator = 0;
  let last = performance.now();
  let savedAt = world.cash;

  function startGame() {
    ensureAudio();
    resetWorld(world);
    world.screen = SCREENS.PLAY;
    screen = SCREENS.PLAY;
    announce('Playing. Steal a car to start the story.');
  }

  function endBusted() {
    world.screen = SCREENS.PLAY;
    screen = SCREENS.PLAY;
    saveGame(world);
    announce('Back on the street.');
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_CONFIRM) {
      if (screen === SCREENS.TITLE) startGame();
      else if (screen === SCREENS.BUSTED && !world.busted.active) endBusted();
      else if (screen === SCREENS.PAUSED) screen = SCREENS.PLAY;
    }
    if (actions & ACTION_PAUSE) {
      if (screen === SCREENS.PLAY) {
        screen = SCREENS.PAUSED;
        announce('Paused.');
      } else if (screen === SCREENS.PAUSED) {
        screen = SCREENS.PLAY;
        announce('Playing.');
      }
    }
    return actions;
  }

  function step(actions) {
    const move = input.move();
    const look = input.takeLook();
    // Orbit: drag turns the camera; driving pulls it gently behind the car.
    world.camYaw -= look.dx * 0.005;
    world.camPitch = Math.min(1.1, Math.max(0.08, world.camPitch + look.dy * 0.003));
    world.camDist = Math.min(18, Math.max(7, world.camDist + look.wheel * 0.01));
    if (!world.player.onFoot && world.player.car) {
      // The camera sits behind the car: its forward is the car's heading.
      const want = world.player.car.heading;
      let diff = want - world.camYaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff <= -Math.PI) diff += Math.PI * 2;
      world.camYaw += diff * Math.min(1, 0.9 * STEP);
    }
    const inputState = {
      fwd: move.fwd,
      strafe: move.strafe,
      steer: move.steer,
      run: move.run,
      handbrake: move.handbrake,
      enterCar: Boolean(actions & ACTION_ENTER_CAR),
      punch: Boolean(actions & ACTION_PUNCH),
    };
    stepWorld(world, inputState, STEP);
    syncWaypoint();
    drainEvents(STEP);
    if (world.cash !== savedAt) {
      savedAt = world.cash;
      saveGame(world);
    }
    if (world.screen === SCREENS.BUSTED) screen = SCREENS.BUSTED;
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    const actions = handleActions();
    if (screen === SCREENS.PLAY) {
      // Edge actions (enter a car, punch) fire once per frame: the same bitmask
      // must not reach every catch-up step, or one tap would steal a car, leave
      // it, steal it again, and so on.
      let firstStep = true;
      while (accumulator >= STEP) {
        step(firstStep ? actions : 0);
        firstStep = false;
        accumulator -= STEP;
        if (screen !== SCREENS.PLAY) break;
      }
    } else {
      accumulator = 0;
      if (screen === SCREENS.BUSTED) drainEvents(STEP);
    }
    hud.update(world, screen);
    renderer.draw(world, screen);
  }

  // Leaving the tab pauses a running game rather than letting the city run unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREENS.PLAY) {
      screen = SCREENS.PAUSED;
      announce('Paused.');
    }
  });
  // Click to start from the title screen.
  canvas.addEventListener('click', () => {
    if (screen === SCREENS.TITLE) startGame();
  });

  announce('Solmar Bay. Press Enter or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();

// Test hook only: ?debug=1 exposes the world for automated playtests.
if (params.get('debug')) window.__world = world;
