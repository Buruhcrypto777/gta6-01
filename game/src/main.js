// Solmar Bay — bootstrap and game loop: builds the world and every system,
// wires the menus, runs the frame loop, and handles bust / waste / save.
// The entry point the page loads.
import { CFG } from './config.js';
import { buildWorld } from './world.js';
import { createScene, followSun, buildSky, buildOcean, buildGround, buildCity, createParticles } from './render.js';
import { createTraffic } from './traffic.js';
import { createPedestrians } from './pedestrians.js';
import { createPolice } from './police.js';
import { createMissions } from './missions.js';
import { createCombat } from './combat.js';
import { createCollectibles } from './collectibles.js';
import { createPlayer } from './player.js';
import { createParked } from './parked.js';
import { createHud } from './hud.js';
import { createAudio } from './audio.js';
import { loadSave, saveGame as persistSave } from './save.js';
import { createInput } from './input.js';
import { applyShot } from './shots.js';

const canvas = document.getElementById('game');
const R = createScene(canvas);
const G = {
  time: 0,
  state: 'menu', // menu | playing | paused | busted | wasted
  renderer: R.renderer,
  scene: R.scene,
  camera: R.camera,
  sun: R.sun,
  sunDir: R.sunDir,
};

// Error overlay: any boot failure shows its message instead of a black screen.
window.addEventListener('error', (e) => {
  const el = document.getElementById('error');
  if (el) { el.style.display = 'block'; el.textContent = `Error: ${e.message}`; }
});

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  R.renderer.setSize(w, h, false);
  R.camera.aspect = w / h;
  R.camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

G.world = buildWorld(CFG.seed);
const sky = buildSky(R);
const ocean = buildOcean(R);
buildGround(R, G.world);
const city = buildCity(R, G.world);
G.particles = createParticles(R);

G.traffic = createTraffic(G);
G.peds = createPedestrians(G);
G.police = createPolice(G);
G.missions = createMissions(G);
G.combat = createCombat(G);
G.collectibles = createCollectibles(G);
G.player = createPlayer(G);
G.parked = createParked(G);
G.hud = createHud(G);
G.audio = createAudio();
G.input = createInput(canvas);

G.saveGame = () => persistSave(G);
G.startGame = () => {
  G.audio.start();
  G.state = 'playing';
  G.hud.hideStart();
  G.hud.toast('Welcome to Solmar Bay — press M for your first mission');
};
G.respawn = () => {
  const s = G.world.spawnPoints.safehouse;
  if (G.player.car) { G.scene.remove(G.player.car.mesh); G.player.car = null; }
  G.player.onFoot = true;
  G.player.mesh.visible = true;
  G.player.pos.set(s.x, 0, s.z);
  G.player.health = CFG.player.health;
  G.hud.setHealth(100);
  G.police.clear();
  G.hud.hideBusted(); G.hud.hideWasted();
  G.state = 'playing';
};
G.busted = () => {
  if (G.state !== 'playing') return;
  G.state = 'busted';
  const lost = Math.floor(G.player.cash * 0.2);
  G.player.cash -= lost;
  G.hud.setCash(G.player.cash);
  G.hud.toast(`BUSTED — the cops took $${lost}`);
  G.audio.siren(false);
  G.hud.showBusted();
  G.saveGame();
};
G.wasted = () => {
  if (G.state !== 'playing') return;
  G.state = 'wasted';
  const lost = Math.floor(G.player.cash * 0.1);
  G.player.cash -= lost;
  G.hud.setCash(G.player.cash);
  G.hud.showWasted();
  G.saveGame();
};

// Restore a previous session, if any.
const saved = loadSave();
if (saved) {
  G.player.cash = saved.cash || 0;
  G.missions.index = Math.min(saved.missionsDone || 0, G.missions.defs.length);
  for (const id of saved.coinsTaken || []) {
    const c = G.collectibles.coins[id];
    if (c) { c.taken = true; c.mesh.visible = false; }
  }
  if (saved.muted) G.audio.setMuted(true);
}
G.hud.setCash(G.player.cash);
G.hud.setWanted(0);
G.hud.setHealth(100);
G.hud.setObjective('Press M to start your first mission');
G.hud.setRadio('♪ Radio off — press R');

// Menu buttons.
document.getElementById('btn-start').addEventListener('click', G.startGame);
document.getElementById('btn-resume').addEventListener('click', () => { G.state = 'playing'; G.hud.hidePause(); });
document.getElementById('btn-restart').addEventListener('click', () => window.location.reload());
document.getElementById('btn-save').addEventListener('click', () => { G.saveGame(); G.hud.toast('Game saved'); });
document.getElementById('btn-radio').addEventListener('click', () => {
  const on = G.audio.toggleRadio();
  G.hud.setRadio(on ? G.audio.stationName() : 'Radio off');
  G.hud.toast(on ? `Radio on — ${G.audio.stationName()}` : 'Radio off');
});
document.getElementById('btn-mute').addEventListener('click', () => {
  const m = !G.audio.isMuted();
  G.audio.setMuted(m);
  G.hud.toast(m ? 'Muted' : 'Sound on');
});
document.getElementById('btn-respawn').addEventListener('click', G.respawn);
document.getElementById('btn-respawn2').addEventListener('click', G.respawn);

// Screenshot staging (?shot=cover|downtown|mission|beach).
const shotName = applyShot(G);
if (!shotName) G.hud.showStart();

let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  G.time += dt;
  const playing = G.state === 'playing';
  if (playing) {
    // Camera orbit and zoom from the mouse.
    const orb = G.input.consumeOrbit();
    G.player.camYaw += orb.dx * 0.004;
    G.player.camDist = Math.max(7, Math.min(24, G.player.camDist + G.input.consumeWheel() * 0.01));
    G.player.update(dt, G.time);
    G.traffic.update(dt, G.time);
    G.peds.update(dt, G.time);
    G.police.update(dt, G.time);
    G.missions.update(dt);
    G.combat.update(dt, G.time);
    G.collectibles.update(dt, G.time);
    G.hud.update(dt, G.time);
    G.audio.update(dt);
    // Siren follows the wanted level.
    G.audio.siren(G.police.state.wanted > 0 && G.police.state.cars.length > 0);
    // Mission / radio / pause keys.
    if (G.input.pressed('KeyM')) {
      if (!G.missions.current) G.missions.startNext();
      else G.hud.toast('Mission in progress — finish it first');
    }
    if (G.input.pressed('KeyT') && G.player.car && G.player.car.type === 'taxi' && !G.missions.taxi) G.missions.startTaxi();
    if (G.input.pressed('KeyR')) G.hud.setRadio(G.audio.nextStation());
    if (G.input.pressed('KeyN')) G.hud.setRadio(G.audio.nextStation());
    if (G.input.pressed('Escape')) { G.state = 'paused'; G.hud.showPause(); }
    followSun(R, G.player.pos);
  }
  sky.update(dt);
  ocean.update(dt, G.time);
  city.update(dt, G.time);
  G.particles.update(dt);
  R.renderer.render(R.scene, R.camera);
  G.input.endFrame();
}
requestAnimationFrame(frame);
window.__game = G;
