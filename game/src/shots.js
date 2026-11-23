// Solmar Bay — staged screenshot scenes behind ?shot=cover|downtown|mission|
// beach. Each one plays the real rules forward from a fresh seeded world for
// a fixed number of steps with a simple autopilot, so the frame is what a
// short burst of real play looks like — dense streets, traffic, pedestrians,
// police and action — and the same seed always stages the same frame.
import { STEP } from './config.js';

export function stageShot(name, G) {
  G.state = 'playing';
  G.hud.hideTitle();
  G.player.health = 100;
  G.cash = 1250;
  const rng = G.rng;

  function driveFor(seconds, throttle) {
    G.auto = { throttle, steer: 0 };
    const steps = Math.round(seconds / STEP);
    for (let i = 0; i < steps; i += 1) G.stepWorld(STEP);
    G.auto = null;
  }
  function walkFor(seconds) {
    G.auto = { f: 1, s: 0 };
    const steps = Math.round(seconds / STEP);
    for (let i = 0; i < steps; i += 1) G.stepWorld(STEP);
    G.auto = null;
  }
  function idleFor(seconds) {
    const steps = Math.round(seconds / STEP);
    for (let i = 0; i < steps; i += 1) G.stepWorld(STEP);
  }

  if (name === 'cover') {
    // Hero frame: Mara in the Sport car at a downtown crossroads at golden
    // hour, 4-star heat — helicopter overhead, cruisers closing in, traffic
    // and pedestrians everywhere, neon behind her.
    const car = G.parked.nearest(0, -20, 999);
    G.player.pos.set(0, 0, -20);
    G.player.heading = Math.PI;
    G.player.mesh.position.copy(G.player.pos);
    G.player.mesh.rotation.y = Math.PI;
    if (car) {
      G.parked.remove(car);
      car.type = { name: 'Sport', top: 38, accel: 22, len: 4.2, wid: 1.9 };
      car.mesh.position.copy(G.player.pos);
      // Aim the car north first: enterCar copies the car's heading.
      car.heading = Math.PI;
      car.mesh.rotation.y = Math.PI;
      G.player.enterCar(car);
      G.scene.add(car.mesh);
    }
    G.police.setWanted(4);
    // Cruisers right behind her.
    G.police.state.cars.forEach((c, i) => {
      c.pos.set((i - 1.5) * 7, 0, 8 + i * 9);
      c.heading = Math.PI;
      c.mesh.position.copy(c.pos);
    });
    G.traffic.gather(0, -20, 12, rng);
    G.peds.gather(0, -20, 14, rng);
    G.hud.setObjective('4 stars — lose the heat!');
    driveFor(1.6, 1);
    idleFor(0.4);
  } else if (name === 'downtown') {
    // A living street: Mara on foot walking up a downtown avenue, traffic
    // streaming past, pedestrians on every sidewalk, towers on both sides.
    G.player.pos.set(0, 0, 23);
    G.player.heading = Math.PI;
    G.player.mesh.position.copy(G.player.pos);
    G.player.mesh.rotation.y = G.player.heading;
    G.traffic.gather(0, 10, 10, rng);
    G.peds.gather(0, 10, 16, rng);
    G.hud.setObjective('Downtown Solmar Bay — golden hour');
    walkFor(2.2);
    idleFor(0.6);
  } else if (name === 'mission') {
    // The Tropicana shootout: Mara on foot in the lot, pistol out, five
    // rivals ahead, one tracer already in the air, cruisers rolling in.
    G.missions.nextIndex = 3;
    G.missions.startNext(G);
    G.missions.current.stepIdx = 1;
    G.missions.setupStep(G);
    const spot = G.data.missionSpots.tropicana;
    G.player.pos.set(spot.x + 11, 0, spot.z + 11);
    G.player.heading = Math.atan2(spot.x - G.player.pos.x, spot.z - G.player.pos.z);
    G.player.mesh.position.copy(G.player.pos);
    G.player.mesh.rotation.y = G.player.heading;
    G.police.setWanted(2);
    G.weapons.switchTo('pistol');
    idleFor(1.4);
    // Fire last, so the muzzle flash and tracer are still in the frame
    // when the shot is painted (they only fade on the next world step).
    const rival = G.missions.rivals[0];
    if (rival) {
      const dir = {
        x: rival.pos.x - G.player.pos.x,
        y: 0,
        z: rival.pos.z - G.player.pos.z,
      };
      const dl = Math.hypot(dir.x, dir.y, dir.z) || 1;
      dir.x /= dl;
      dir.y /= dl;
      dir.z /= dl;
      G.weapons.fire(
        { x: G.player.pos.x, y: 1.4, z: G.player.pos.z },
        dir,
        { peds: G.peds, rivals: G.missions.rivals, police: G.police, rng: G.rng },
        G.audio,
      );
    }
  } else {
    // Beach: Mara driving the coastal road at sunset, ocean and marina on
    // her right, palms and beachgoers, boats bobbing in the bay.
    const car = G.parked.nearest(-40, 138, 999);
    G.player.pos.set(-40, 0, 138);
    G.player.heading = Math.PI / 2;
    G.player.mesh.position.copy(G.player.pos);
    G.player.mesh.rotation.y = Math.PI / 2;
    if (car) {
      G.parked.remove(car);
      car.type = { name: 'Coupe', top: 30, accel: 17, len: 4.1, wid: 1.8 };
      car.mesh.position.copy(G.player.pos);
      // Aim the car east first: enterCar copies the car's heading.
      car.heading = Math.PI / 2;
      car.mesh.rotation.y = Math.PI / 2;
      G.player.enterCar(car);
      G.scene.add(car.mesh);
    }
    G.traffic.gather(-10, 138, 6, rng);
    G.peds.gather(-10, 168, 8, rng);
    G.hud.setObjective('Coastal drive — sunset run');
    driveFor(2.2, 1);
    idleFor(0.6);
  }

  G.shotInfo = { shot: name, seed: G.seed };
  return { screen: 'play', best: G.cash };
}
