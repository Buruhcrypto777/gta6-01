// Solmar Bay — boot and the one loop. Input is read every frame, the world
// advances in fixed 1/60 s steps, and the renderer paints what is there.
// ?shot=cover|downtown|mission|beach (with &seed=N) stages that scene
// instead of running the loop, paints it twice and sets window.__shotReady
// for a screenshot. Everything the game needs is exposed on window.__game.
import { ACTIONS, STEP } from './config.js';
import { createRandom } from './random.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { createWorldData } from './world.js';
import { buildCity } from './city.js';
import { createRenderer } from './render.js';
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
import { saveGame, loadGame } from './save.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);
const THREE = window.THREE;

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const renderer = createRenderer(canvas, THREE);
const rng = createRandom(seed);
const data = createWorldData(rng);
const city = buildCity(THREE, renderer.scene, data);
const audio = createAudio();
const input = createInput();
const parked = createParked(THREE, renderer.scene, data, rng);
const traffic = createTraffic(THREE, renderer.scene, data, rng);
const peds = createPeds(THREE, renderer.scene, data, rng);
const player = createPlayer(THREE, renderer.scene, data.spawn);
const police = createPolice(THREE, renderer.scene, rng);
const combat = createCombat();
const weapons = createWeapons(THREE, renderer.scene);
const missions = createMissions();
const collectibles = createCollectibles(THREE, renderer.scene, data);

const G = {
  three: THREE,
  scene: renderer.scene,
  camera: renderer.camera,
  renderer: renderer.renderer,
  seed,
  rng,
  data,
  city,
  world: { buildings: city.buildings },
  audio,
  input,
  parked,
  traffic,
  peds,
  player,
  police,
  combat,
  weapons,
  missions,
  collectibles,
  hud: null,
  state: 'title',
  cash: 0,
  time: 0,
  auto: null,
  shotInfo: null,
  missionWaypoint: null,
  saveGame() {
    saveGame(G);
  },
  damagePlayer(amount) {
    if (G.time - player.lastDamageAt < 0.25) return;
    player.lastDamageAt = G.time;
    player.health = Math.max(0, player.health - amount);
    G.hud.flashDamage();
    audio.blip('bad');
    if (player.health <= 0) {
      player.health = 100;
      G.cash = Math.max(0, G.cash - 150);
      police.setWanted(0);
      player.pos.set(data.spawn.x, 0, data.spawn.z);
      player.heading = data.spawn.heading;
      if (player.car) {
        player.exitCar();
        player.pos.set(data.spawn.x, 0, data.spawn.z);
      }
      player.mesh.position.copy(player.pos);
      G.hud.toast('WASTED — the medics patched you up (-$150)');
      G.saveGame();
    }
  },
};
G.hud = createHud(G);
window.__game = G;

let lastShotDanger = null;
let autosaveTimer = 0;

function onBusted() {
  G.cash = Math.max(0, G.cash - 200);
  police.setWanted(0);
  if (player.car) player.exitCar();
  player.pos.set(data.spawn.x, 0, data.spawn.z);
  player.heading = data.spawn.heading;
  player.mesh.position.copy(player.pos);
  player.health = 100;
  G.hud.toast('BUSTED — the cops took $200');
  audio.blip('bad');
  G.saveGame();
}

function startPlaying() {
  if (G.state !== 'title') return;
  G.state = 'playing';
  G.hud.hideTitle();
  audio.ensure();
  status.textContent = 'Playing Solmar Bay.';
  if (!missions.current && missions.nextIndex < 5) missions.startNext(G);
}

function stepWorld(dt) {
  G.time += dt;
  let f = 0;
  let s = 0;
  let actions = 0;
  let clicked = false;
  if (G.auto) {
    f = G.auto.f || 0;
    s = G.auto.s || 0;
    if (G.auto.throttle !== undefined) f = G.auto.throttle;
    if (G.auto.steer !== undefined) s = G.auto.steer;
  } else {
    const ax = input.axis();
    f = ax.f;
    s = ax.s;
    actions = input.takeActions();
    clicked = input.takeClick();
  }

  if (G.state === 'title') {
    // Attract mode: the city lives behind the title screen. Space / Enter
    // starts the game from the keyboard, not just the button. (`actions`
    // was already read at the top of this step — the queue is empty now.)
    if (actions & ACTIONS.CONFIRM) startPlaying();
    traffic.update(dt);
    peds.update(dt, null);
    city.update(dt);
    audio.update(dt);
    return;
  }
  if (G.state === 'paused') {
    // Resume from the keyboard: consume the pause press here, so the same
    // keypress cannot re-pause the game on the very next step.
    if (actions & (ACTIONS.PAUSE | ACTIONS.CONFIRM)) {
      G.state = 'playing';
      G.hud.showPause(false);
      announce('Playing.');
    }
    audio.update(dt);
    return;
  }

  if (actions & ACTIONS.PAUSE) {
    G.state = 'paused';
    G.hud.showPause(true);
    status.textContent = 'Paused.';
    return;
  }
  if (actions & ACTIONS.ENTER) {
    if (player.onFoot) {
      const car = parked.nearest(player.pos.x, player.pos.z, 4.5);
      if (car) {
        parked.remove(car);
        player.enterCar(car);
        police.setWanted(Math.max(police.state.wanted, 1));
        G.hud.toast(`Stole the ${car.type.name} — the law noticed`);
        audio.blip('pickup');
      }
    } else {
      const car = player.exitCar();
      if (car) {
        const spot = data.parkedSpots[Math.floor(rng.next() * data.parkedSpots.length)];
        car.x = spot.x;
        car.z = spot.z;
        car.mesh.position.set(spot.x, 0, spot.z);
        parked.cars.push(car);
      }
    }
  }
  if (actions & ACTIONS.PUNCH) {
    combat.punch(player, peds, missions.rivals, audio, () => {
      if (police.state.cars.length > 0) police.setWanted(Math.min(5, police.state.wanted + 1));
    });
  }
  if (actions & ACTIONS.WEAPON1) {
    weapons.switchTo('pistol');
    G.hud.toast('PISTOL — click to fire');
  }
  if (actions & ACTIONS.WEAPON2) {
    weapons.switchTo('shotgun');
    G.hud.toast('SHOTGUN — click to fire');
  }
  if (actions & ACTIONS.RADIO) {
    const name = audio.nextStation();
    G.hud.toast(`Radio: ${name}`);
  }
  if (actions & ACTIONS.TAXI) missions.toggleTaxi(G);

  if (clicked && player.onFoot) {
    const dir = { x: Math.sin(player.heading), y: 0, z: Math.cos(player.heading) };
    const from = { x: player.pos.x, y: 1.4, z: player.pos.z };
    const hits = weapons.fire(from, dir, { peds, rivals: missions.rivals, police, rng }, audio);
    if (hits.length > 0) {
      lastShotDanger = { x: player.pos.x, z: player.pos.z };
      if (police.state.wanted < 1) police.setWanted(1);
    }
  }

  // Move.
  if (player.onFoot) player.walkStep(dt, f, s, player.heading, city.colliders);
  else player.driveStep(dt, f, s, city.colliders);

  // The living city.
  traffic.update(dt);
  const danger = lastShotDanger || (player.car && Math.abs(player.speed) > 12 ? { x: player.pos.x, z: player.pos.z } : null);
  peds.update(dt, danger);
  parked.update(dt);
  police.update(dt, player, audio, onBusted);
  combat.update(dt);
  weapons.update(dt);
  missions.update(dt, G);
  collectibles.update(dt, player.pos, () => {
    G.cash += 50;
    audio.blip('coin');
    G.hud.toast(`Sun Coin! +$50 (${collectibles.count()}/12)`);
    G.saveGame();
  });
  city.update(dt);
  audio.update(dt);
  audio.engine(player.onFoot ? 0 : Math.abs(player.speed) / (player.car ? player.car.type.top : 30));

  // Health regen after a calm stretch.
  if (player.health < 100 && G.time - player.lastDamageAt > 4) {
    player.health = Math.min(100, player.health + 6 * dt);
  }
  autosaveTimer += dt;
  if (autosaveTimer > 15) {
    autosaveTimer = 0;
    G.saveGame();
  }
}
G.stepWorld = stepWorld;

function announce(message) {
  status.textContent = message;
}

function runShot(name) {
  const scene = stageShot(name, G);
  let painted = 0;
  function paint() {
    const focus = { pos: player.pos, heading: player.heading, inCar: !player.onFoot };
    // Snap the chase camera on the first paint: the lerp would otherwise
    // need seconds to travel from its spawn point, and the shot is taken
    // after only two paints.
    if (painted === 0) renderer.update(1.0, focus);
    renderer.update(0.016, focus);
    renderer.renderer.render(renderer.scene, renderer.camera);
    G.hud.update(0.016);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  void scene;
  requestAnimationFrame(paint);
}

function runGame() {
  let screen = 'title';
  void screen;
  let accumulator = 0;
  let last = performance.now();
  let titleAngle = 0;

  document.getElementById('btn-start').addEventListener('click', () => {
    audio.ensure();
    startPlaying();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && G.state === 'playing') {
      G.state = 'paused';
      G.hud.showPause(true);
      announce('Paused.');
    }
  });

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    while (accumulator >= STEP) {
      stepWorld(STEP);
      accumulator -= STEP;
    }
    if (G.state === 'title') {
      titleAngle += 0.0004;
      renderer.update(0.016, {
        pos: { x: Math.sin(titleAngle) * 60, y: 0, z: Math.cos(titleAngle) * 60 },
        heading: titleAngle + Math.PI / 2,
        inCar: false,
      });
    } else {
      renderer.update(0.016, { pos: player.pos, heading: player.heading, inCar: !player.onFoot });
    }
    renderer.renderer.render(renderer.scene, renderer.camera);
    G.hud.update(0.016);
  }

  announce('Solmar Bay. Press Start or Space to play.');
  requestAnimationFrame(frame);
}

// Load a previous save in real play only — staged shots start fresh.
if (!shot) {
  const saved = loadGame();
  if (saved) {
    G.cash = saved.cash || 0;
    missions.done = saved.missionsDone || [];
    missions.nextIndex = saved.nextIndex || 0;
    collectibles.markTaken(saved.coins || []);
    audio.setStation(saved.station || 0);
  }
}

if (shot) runShot(shot);
else runGame();
