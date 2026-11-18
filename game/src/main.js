// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s
// steps (several in a slow frame, none in a fast one), traffic and police update beside it,
// and the renderer and the HUD paint what is there. The game moves between four screens:
// title, play, paused and busted.
//
// ?seed=N fixes the city and the traffic. ?shot=cover|downtown|mission|beach (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { buildCityLayout } from './city.js';
import { createWorld, EVENT_BUSTED, EVENT_CRASH, EVENT_ENTER_CAR, EVENT_PUNCH, EVENT_STOLEN } from './world.js';
import { updateTraffic } from './traffic.js';
import { updatePolice } from './police.js';
import { resolvePunch } from './combat.js';
import { createMissions } from './missions.js';
import { createAudio } from './audio.js';
import { ACTION_CONFIRM, ACTION_ENTER, ACTION_MUTE, ACTION_PAUSE, ACTION_PUNCH, createInput } from './input.js';
import { createRenderer } from './render.js';
import { createHud } from './hud.js';
import { stageShot } from './shots.js';
import { clearSave } from './save.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped. */
const MAX_FRAME = 0.25;
const THREE = window.THREE;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const random = createRandom(seed);
const layout = buildCityLayout(random);
const world = createWorld(random, layout);
const missions = createMissions(world);
world.missions = missions;
const audio = createAudio();
const canvas = document.getElementById('game');
const status = document.getElementById('status');
const renderer = createRenderer(canvas, layout);
const hud = createHud(world, missions);
const input = createInput(canvas);

const titleScreen = document.getElementById('title-screen');
const pauseScreen = document.getElementById('pause-screen');
const bustedScreen = document.getElementById('busted-screen');
const bustedText = document.getElementById('busted-text');
const bestLine = document.getElementById('best-line');

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off: the best then lasts this visit only.
  }
}

function showOnly(screen) {
  titleScreen.style.display = screen === 'title' ? 'flex' : 'none';
  pauseScreen.style.display = screen === 'paused' ? 'flex' : 'none';
  bustedScreen.style.display = screen === 'busted' ? 'flex' : 'none';
}

function runShot(name) {
  const camera = stageShot(name, world, seed);
  renderer.setShotCamera(camera);
  hud.update();
  let painted = 0;
  function paint() {
    renderer.draw(world.state, STEP);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  let screen = 'title';
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let muted = false;
  bestLine.textContent = best > 0 ? `Best cash: $${best}` : 'No run yet — make Solmar Bay yours.';

  // Screen readers (and anyone watching the page's text) hear the screen changes.
  function announce(message) {
    status.textContent = message;
  }

  function startGame(fresh) {
    if (fresh) {
      clearSave();
      world.state.cash = 0;
      world.state.missionIndex = 0;
      world.reset();
      missions.startMission(0);
    }
    screen = 'play';
    showOnly('play');
    announce('Playing. Steal a car to start the first job.');
  }

  function endBusted() {
    screen = 'busted';
    const lost = Math.floor(world.state.cash * 0.25);
    world.state.cash -= lost;
    if (world.state.cash > best) {
      best = world.state.cash;
      saveBest(best);
    }
    bustedText.textContent = `Busted. The cops took $${lost} off you — the job starts over.`;
    showOnly('busted');
    announce('Busted. Press Space to try the job again.');
  }

  function handleActions(actions) {
    if (actions & ACTION_MUTE) {
      muted = !muted;
      audio.setMuted(muted);
    }
    if (screen === 'title') {
      if (actions & ACTION_CONFIRM) startGame(false);
      return;
    }
    if (screen === 'busted') {
      if (actions & ACTION_CONFIRM) {
        world.state.busted = false;
        world.state.bustedHold = 0;
        world.state.copCatch = 0;
        world.reset();
        missions.startMission(world.state.missionIndex);
        screen = 'play';
        showOnly('play');
      }
      return;
    }
    if (actions & ACTION_PAUSE) {
      if (screen === 'play') {
        screen = 'paused';
        showOnly('paused');
        announce('Paused.');
      } else if (screen === 'paused') {
        screen = 'play';
        showOnly('play');
        announce('Playing.');
      }
    }
  }
  function buildWorldInput(actions) {
    const cameraDirection = new THREE.Vector3();
    renderer.camera.getWorldDirection(cameraDirection);
    const fx = cameraDirection.x;
    const fz = cameraDirection.z;
    const length = Math.hypot(fx, fz) || 1;
    const forwardX = fx / length;
    const forwardZ = fz / length;
    const rightX = -forwardZ;
    const rightZ = forwardX;
    const forward = input.throttle();
    const strafe = input.steer();
    const moveX = forwardX * forward + rightX * strafe;
    const moveZ = forwardZ * forward + rightZ * strafe;
    // Steering: heading grows clockwise, so turning right (D) is a negative steer.
    return {
      moveX, moveZ,
      throttle: input.throttle(),
      steer: -input.steer(),
      handbrake: input.handbrake,
      sprint: input.sprint,
      enter: Boolean(actions & ACTION_ENTER),
      punch: Boolean(actions & ACTION_PUNCH),
    };
  }

  function step(actions) {
    const frameInput = buildWorldInput(actions);
    const events = world.step(STEP, frameInput);
    if (events & EVENT_PUNCH) resolvePunch(world);
    updateTraffic(world, STEP, random);
    updatePolice(world, STEP);
    missions.update(STEP);
    if (events & EVENT_ENTER_CAR) audio.pickup();
    if (events & EVENT_STOLEN) world.setToast('Car stolen! The cops are coming.', 3);
    if (events & EVENT_CRASH) audio.crash();
    if (events & EVENT_BUSTED) endBusted();
    if (world.state.cash > best) best = world.state.cash;
    audio.setEngine(world.state.player.onFoot ? 0 : Math.abs(world.state.player.speed), 34);
    audio.setSiren(world.state.wanted > 0);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    // One take of the one-shot presses per frame: menus and the world share them.
    const actions = input.takeActions();
    handleActions(actions);
    if (screen === 'play') {
      const orbit = input.takeOrbit();
      if (orbit.yaw !== 0 || orbit.pitch !== 0 || orbit.zoom !== 0) {
        renderer.applyOrbit(orbit.yaw, orbit.pitch, orbit.zoom);
      }
      while (accumulator >= STEP) {
        step(actions);
        accumulator -= STEP;
        if (screen !== 'play') break;
      }
    } else {
      accumulator = 0;
    }
    if (screen === 'title') {
      // The title screen plays the city behind it: traffic rolls on, nobody commits crimes.
      world.step(STEP, { moveX: 0, moveZ: 0, throttle: 0, steer: 0, handbrake: false, sprint: false, enter: false, punch: false });
      updateTraffic(world, STEP, random);
    }
    renderer.draw(world.state, STEP);
    hud.update();
  }

  // Leaving the tab pauses a running game rather than letting the cops catch Mara unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === 'play') {
      screen = 'paused';
      showOnly('paused');
      announce('Paused.');
    }
  });

  document.getElementById('start-button').addEventListener('click', () => {
    audio.init();
    audio.click();
    startGame(false);
  });
  document.getElementById('new-button').addEventListener('click', () => {
    audio.init();
    audio.click();
    startGame(true);
  });
  document.getElementById('resume-button').addEventListener('click', () => {
    audio.click();
    screen = 'play';
    showOnly('play');
  });
  document.getElementById('retry-button').addEventListener('click', () => {
    audio.click();
    world.state.busted = false;
    world.state.bustedHold = 0;
    world.state.copCatch = 0;
    world.reset();
    missions.startMission(world.state.missionIndex);
    screen = 'play';
    showOnly('play');
  });
  canvas.addEventListener('pointerdown', () => audio.init(), { once: true });
  window.addEventListener('keydown', () => audio.init(), { once: true });

  showOnly('title');
  announce('Solmar Bay. Press Space or click Start to play.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
