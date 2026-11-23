// Solmar Bay — boot and the one loop.
// Input is read every frame, the world advances in fixed 1/60 s steps, and
// the renderer paints what is there. The game moves between four screens:
// title, play, paused and wasted. ?seed=N fixes the world; ?shot=cover|
// downtown|mission|beach (with &seed=N) stages that scene instead of
// running the loop, paints it twice and sets window.__shotReady.
import { DEFAULT_SEED, START_CASH, STEP } from './config.js';
import { createRandom } from './random.js';
import {
  ACTION_CONFIRM, ACTION_ENTER, ACTION_FIRE, ACTION_MISSION, ACTION_PAUSE,
  ACTION_PUNCH, ACTION_RADIO, ACTION_WEAPON_1, ACTION_WEAPON_2, ACTION_WEAPON_3,
  createInput,
} from './input.js';
import { createWorld } from './world.js';
import { buildCity } from './city.js';
import { createParked } from './parked.js';
import { createTraffic } from './traffic.js';
import { createPeds } from './pedestrians.js';
import { createPlayer } from './player.js';
import { createPolice } from './police.js';
import { createCombat } from './combat.js';
import { createWeapons } from './weapons.js';
import { createMissions } from './missions.js';
import { createCollectibles } from './collectibles.js';
import { createHud } from './hud.js';
import { createAudio } from './audio.js';
import { loadGame, saveGame } from './save.js';
import { createRenderer } from './render.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : DEFAULT_SEED;

const canvas = document.getElementById('game');
const titleEl = document.getElementById('title');
const startBtn = document.getElementById('btn-start');
const statusEl = document.getElementById('status');

const renderer = createRenderer(canvas);
const scene = new THREE.Scene();
const rng = createRandom(seed);
const input = createInput(canvas);
const world = createWorld(scene, rng);
const city = buildCity(scene, rng);
const parked = createParked(scene, rng);
const traffic = createTraffic(scene, rng);
const peds = createPeds(scene, rng);
const collectibles = createCollectibles(scene, rng);
const hud = createHud();
const audio = createAudio();
const player = createPlayer(scene, input, city.buildings, parked, traffic);

let cash = START_CASH;
let health = 100;
let state = 'title';
let time = 0;

function announce(message) {
  statusEl.textContent = message;
}

function onCash(amount) {
  cash += amount;
}

function doSave() {
  saveGame({
    cash,
    health,
    coins: collectibles.coins.map((c, i) => (c.taken ? i : -1)).filter((i) => i >= 0),
    missionsDone: missions.done,
    x: player.pos.x,
    z: player.pos.z,
    wanted: police.state.wanted,
  });
}

function hurtPlayer(damage) {
  health = Math.max(0, health - damage);
  if (health <= 0) wasted();
}

function wasted() {
  state = 'wasted';
  cash = Math.max(0, cash - 100);
  health = 100;
  if (player.car) player.exitCar();
  police.setWanted(0);
  player.setPosition(0, 40, Math.PI);
  titleEl.querySelector('h1').textContent = 'WASTED';
  titleEl.querySelector('p').textContent = 'The cops booked you. $100 bail. Press Enter to get back out there.';
  titleEl.classList.remove('hidden');
  announce('Wasted. Press Enter to continue.');
}

const police = createPolice(scene, rng, city.buildings, player, () => {
  if (Math.random() < 0.3) hurtPlayer(10);
});
const combat = createCombat(player, peds, police, audio);
const weapons = createWeapons(scene, player, peds, police, audio, renderer.camera);
const missions = createMissions({ scene, player, police, collectibles, hud, audio, onCash, onSave: doSave });

const game = {
  scene,
  player,
  parked,
  traffic,
  peds,
  collectibles,
  police,
  missions,
  weapons,
  combat,
  hud,
  audio,
  world: { buildings: city.buildings, ocean: world.ocean },
  get state() {
    return state;
  },
  get cash() {
    return cash;
  },
  get health() {
    return health;
  },
  saveGame: doSave,
};
window.__game = game;

// Restore a save, if one is there.
const saved = loadGame();
if (saved) {
  if (typeof saved.cash === 'number') cash = saved.cash;
  if (Array.isArray(saved.coins)) {
    for (const i of saved.coins) {
      const coin = collectibles.coins[i];
      if (coin) {
        coin.taken = true;
        coin.mesh.visible = false;
      }
    }
  }
  if (Array.isArray(saved.missionsDone)) {
    for (const id of saved.missionsDone) missions.done.push(id);
  }
  if (typeof saved.x === 'number') player.setPosition(saved.x, saved.z ?? 40, Math.PI);
  if (typeof saved.wanted === 'number') police.setWanted(saved.wanted);
}

function startGame() {
  state = 'playing';
  titleEl.classList.add('hidden');
  audio.resume();
  hud.setRadio(audio.stationName);
  if (!missions.current) hud.setObjective('Free roam — press M for the next job');
  announce('Playing. Steal a car with E, drive with WASD.');
}

function pauseGame() {
  state = 'paused';
  hud.toast('Paused — press P to continue');
  announce('Paused.');
}

function handleActions() {
  const actions = input.takeActions();
  if (actions & ACTION_PAUSE) {
    pauseGame();
    return;
  }
  if (actions & ACTION_ENTER) {
    if (player.car) {
      player.exitCar();
    } else {
      const car = player.tryEnterCar();
      if (car) {
        police.addWanted(1);
        hud.toast(`Stole a ${car.type} — the law is coming`);
      }
    }
  }
  if (actions & ACTION_PUNCH) combat.tryPunch();
  if (actions & ACTION_FIRE) weapons.fire();
  if (actions & ACTION_RADIO) hud.setRadio(audio.nextStation());
  if (actions & ACTION_WEAPON_1) {
    weapons.select('fists');
    hud.toast('Fists');
  }
  if (actions & ACTION_WEAPON_2) {
    weapons.select('pistol');
    hud.toast('Pistol — click to fire');
  }
  if (actions & ACTION_WEAPON_3) {
    weapons.select('shotgun');
    hud.toast('Shotgun — click to fire');
  }
  if (actions & ACTION_MISSION) missions.startNext();
}

function tick(dt, inputObj) {
  time += dt;
  world.update(dt);
  traffic.update(dt);
  peds.update(dt);
  if (state !== 'playing') return;
  handleActions();
  player.update(dt, renderer.camera, inputObj);
  police.update(dt);
  combat.update(dt);
  weapons.update(dt);
  missions.update(dt, time);
  collectibles.update(dt, player.pos, time, () => {
    cash += collectibles.value;
    audio.pickup();
    hud.toast(`Sun Coin +$${collectibles.value}`);
    doSave();
  });
  // Running a pedestrian over in a car draws the law.
  if (player.car !== null && Math.abs(player.speed) > 5) {
    const near = peds.nearest(player.pos.x, player.pos.z, 2.4);
    if (near) {
      peds.knockDown(near);
      police.addWanted(1);
      audio.punch();
    }
  }
  audio.update(dt, { speed: player.speed, inCar: player.car !== null, wanted: police.state.wanted });
}

startBtn.addEventListener('click', () => {
  audio.resume();
  if (state === 'title' || state === 'wasted') startGame();
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && state === 'playing') pauseGame();
});

if (shot) {
  // Staged screenshot: play the real rules forward, paint twice, signal.
  state = 'playing';
  titleEl.classList.add('hidden');
  hud.setRadio(audio.stationName);
  const staged = stageShot(shot, game);
  for (let i = 0; i < staged.steps; i += 1) tick(STEP, staged.input);
  hud.update(STEP, game);
  staged.camera(renderer.camera);
  if (staged.fireAtEnd) weapons.fire();
  renderer.render(scene);
  renderer.render(scene);
  window.__shotReady = true;
  window.__shotInfo = staged.info;
} else {
  hud.setObjective('Press Enter to start — steal a car, lose the cops, run the jobs.');
  announce('Solmar Bay. Press Enter or click Start.');
  let last = performance.now();
  let accumulator = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    if (state === 'playing') {
      accumulator += dt;
      while (accumulator >= STEP) {
        tick(STEP, input);
        accumulator -= STEP;
      }
    } else {
      // The world stays alive behind the title and pause screens.
      if (state === 'title') {
        world.update(dt);
        traffic.update(dt);
        peds.update(dt);
      }
      const actions = input.takeActions();
      if (actions & ACTION_CONFIRM && (state === 'title' || state === 'wasted')) startGame();
      else if (actions & ACTION_PAUSE && state === 'paused') {
        state = 'playing';
        announce('Playing.');
      }
    }
    hud.update(dt, game);
    renderer.render(scene);
  }
  requestAnimationFrame(frame);
}
