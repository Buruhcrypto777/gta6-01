// Solmar Bay — screenshot staging: deterministic scenes for the four shots,
// picked with ?shot=cover|downtown|mission|beach. Each one puts the player,
// the police and a mission objective where the camera can see several systems
// at once. Normal play uses no shot parameter.
const THREE = window.THREE;
import { CFG } from './config.js';
import { makeCarMesh } from './vehicles.js';

function givePlayerCar(G, type, color, x, z, heading) {
  const mesh = makeCarMesh(type, color);
  mesh.position.set(x, 0, z);
  mesh.rotation.y = heading;
  G.scene.add(mesh);
  const car = { mesh, x, z, heading, speed: 24, steer: 0, type, color, stolen: true };
  G.player.enterCar(car);
  G.player.car.speed = 24;
  return car;
}

function stageCover(G) {
  // Golden-hour chase: sports car downtown, two cruisers ahead in frame,
  // helicopter overhead, four stars, Hot Pursuit objective.
  givePlayerCar(G, 'sports', 0xd94f3d, 0, 160, 0);
  G.police.setWanted(4);
  // Put the helicopter straight into its hover spot so it is in frame.
  const heli = G.police.state.heli;
  if (heli) { heli.x = 18; heli.z = 95; heli.y = 26; heli.mesh.position.set(18, 26, 95); }
  const P = G.police.state;
  for (const [dx, dz] of [[-10, -45], [12, -65]]) {
    const mesh = makeCarMesh('police', CFG.palette.police);
    const car = { mesh, x: dx, z: 160 + dz, heading: Math.PI, speed: 30, siren: true };
    mesh.position.set(car.x, 0, car.z);
    G.scene.add(mesh);
    P.cars.push(car);
  }
  G.hud.setObjective('Hot Pursuit: Lose the cops — get your wanted level to 0');
  G.hud.setWanted(4);
  G.player.cash = 1250; G.hud.setCash(1250);
}

function stageDowntown(G) {
  // Taxi run through neon downtown, traffic ahead, The Drop beacon in view.
  givePlayerCar(G, 'taxi', CFG.palette.taxi, 160, 320, 0);
  G.hud.setObjective('The Drop: Drive to The Tropicana — 408 m');
  G.hud.setDistance('The Tropicana', 408);
  G.player.cash = 400; G.hud.setCash(400);
  const t = G.traffic.nearest(160, 200, 200);
  if (t) { t.x = 156; t.z = 220; t.heading = 0; }
}

function stageMission(G) {
  // On foot at Coral Market, mid-punch, collectors closing in.
  G.player.pos.set(560, 0, 420);
  G.player.heading = 0;
  G.player.mesh.position.copy(G.player.pos);
  G.player.mesh.rotation.y = G.player.heading;
  G.combat.spawnThug(556, 402);
  G.combat.spawnThug(566, 406);
  // Hold the punch pose long enough to survive the screenshot wait.
  G.player.punchAnim = 1.2;
  G.police.setWanted(1);
  G.hud.setObjective('Payback: 3 collectors left — press F to punch');
  G.hud.setWanted(1);
  G.player.cash = 850; G.hud.setCash(850);
  G.player.health = 82; G.hud.setHealth(82);
}

function stageBeach(G) {
  // Sunset on the coastal road: ocean left, palms, a red sports car.
  givePlayerCar(G, 'sports', 0xd94f3d, -800, 120, 0);
  G.hud.setObjective('Free roam — the coast road at sunset');
  G.hud.setDistance('', 0);
  G.player.cash = 0; G.hud.setCash(0);
}

const STAGES = { cover: stageCover, downtown: stageDowntown, mission: stageMission, beach: stageBeach };

export function applyShot(G) {
  const params = new URLSearchParams(window.location.search);
  const name = params.get('shot');
  if (!name || !STAGES[name]) return null;
  G.state = 'playing';
  G.hud.hideStart();
  STAGES[name](G);
  // Let the camera settle behind the player, then flag readiness. Use the
  // car's position when driving: G.player.pos is stale until the first frame.
  const px = G.player.car ? G.player.car.x : G.player.pos.x;
  const pz = G.player.car ? G.player.car.z : G.player.pos.z;
  G.player.camPos.set(
    px + Math.sin(G.player.heading) * G.player.camDist,
    G.player.camHeight,
    pz + Math.cos(G.player.heading) * G.player.camDist
  );
  window.__shot = name;
  window.__shotReady = true;
  return name;
}
