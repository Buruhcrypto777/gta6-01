// Solmar Bay — staged screenshot scenes behind ?shot=cover|downtown|
// mission|beach (with &seed=, default 7). Each scene plays the real rules
// forward from the seeded world for a fixed number of steps, with traffic
// and pedestrians pulled into the frame, so the picture is what a short
// game really looks like and the same seed always gives the same frame.
// The camera is set after the steps; main.js paints twice and raises
// window.__shotReady.
import { STEP } from './config.js';

function findCar(parked, type) {
  return parked.cars.find((c) => !c.taken && c.type === type) || parked.cars.find((c) => !c.taken);
}

function placeTraffic(traffic, spots) {
  traffic.cars.forEach((car, i) => {
    if (i >= spots.length) return;
    Object.assign(car, spots[i]);
    car.speed = car.cruise;
  });
}

function placePeds(peds, spots) {
  peds.peds.forEach((ped, i) => {
    if (i >= spots.length) return;
    Object.assign(ped, spots[i]);
    ped.down = false;
    ped.group.visible = true;
    ped.group.rotation.set(0, 0, 0);
  });
}

function streetSpots(coord, alongX, count, from, to) {
  const out = [];
  for (let i = 0; i < count; i += 1) {
    out.push({
      alongX,
      coord,
      pos: from + ((to - from) * i) / Math.max(1, count - 1),
      dir: i % 2 === 0 ? 1 : -1,
    });
  }
  return out;
}

export function stageShot(name, game) {
  const { player, parked, traffic, peds, police, missions, weapons, collectibles } = game;
  const driveInput = { moveVector: () => ({ x: 0, z: -1 }), takeDrag: () => ({ x: 0, y: 0 }), sprinting: () => false, isDown: () => false };
  const stillInput = { moveVector: () => ({ x: 0, z: 0 }), takeDrag: () => ({ x: 0, y: 0 }), sprinting: () => false, isDown: () => false };

  if (name === 'downtown') {
    // Boulevard on foot: traffic both ways, pedestrians crossing, towers.
    player.setPosition(2, 44, Math.PI);
    police.setWanted(0);
    placeTraffic(traffic, [
      ...streetSpots(44, true, 7, -90, 110),
      ...streetSpots(0, false, 4, -20, 130),
      ...streetSpots(-44, true, 4, -60, 80),
    ]);
    placePeds(peds, [
      ...streetSpots(44 + 9, true, 6, -40, 80),
      ...streetSpots(44 - 9, true, 5, -30, 90),
      { alongX: true, coord: 44, pos: -6, dir: 1 },
      { alongX: true, coord: 44, pos: 12, dir: -1 },
      { alongX: false, coord: 9, pos: 44, dir: 1 },
    ]);
    return {
      steps: 90,
      input: stillInput,
      fireAtEnd: false,
      camera(cam) {
        cam.position.set(20, 4, 47);
        cam.lookAt(-40, 2, 44);
      },
      info: { shot: 'downtown', seed: 7, note: 'Boulevard on foot, traffic and pedestrians' },
    };
  }

  if (name === 'mission') {
    // Casino shootout: The Big Score, pistol out, cruisers and roadblock in.
    missions.startById('score');
    player.setPosition(10, -2, Math.atan2(22 - 10, -22 - -2));
    weapons.select('pistol');
    police.setWanted(3);
    placeTraffic(traffic, [
      ...streetSpots(-44, true, 5, -80, 60),
      ...streetSpots(0, false, 4, -60, 40),
    ]);
    placePeds(peds, streetSpots(-44 - 9, true, 6, -50, 50));
    return {
      steps: 360,
      input: stillInput,
      fireAtEnd: true,
      camera(cam) {
        cam.position.set(0, 4.5, 14);
        cam.lookAt(22, 2, -22);
      },
      info: { shot: 'mission', seed: 7, note: 'The Big Score at the Casino, pistol vs police' },
    };
  }

  if (name === 'beach') {
    // Marina sunset: convertible on the beach road, ocean and boats.
    const car = findCar(parked, 'convertible');
    car.angle = -Math.PI / 2;
    player.setPosition(car.x + 2, car.z + 2, car.angle);
    player.tryEnterCar();
    player.pos.set(0, 0, 190);
    police.setWanted(0);
    placeTraffic(traffic, streetSpots(176, true, 3, -60, 40));
    placePeds(peds, streetSpots(176 - 9, true, 6, -50, 60));
    return {
      steps: 120,
      input: driveInput,
      fireAtEnd: false,
      camera(cam) {
        const px = player.pos.x;
        cam.position.set(px + 10, 2.8, 196);
        cam.lookAt(px - 25, 2, 188);
      },
      info: { shot: 'beach', seed: 7, note: 'Marina sunset drive, ocean and boats' },
    };
  }

  // cover: downtown chase — convertible west along 88th street, 4 stars,
  // helicopter overhead, mission live.
  const car = findCar(parked, 'convertible');
  car.angle = -Math.PI / 2;
  player.setPosition(car.x + 2, car.z + 2, car.angle);
  player.tryEnterCar();
  player.pos.set(60, 0, 88);
  missions.startNext();
  police.setWanted(4);
  placeTraffic(traffic, [
    ...streetSpots(88, true, 8, -60, 40),
    ...streetSpots(0, false, 4, 30, 140),
    ...streetSpots(132, true, 4, -30, 60),
  ]);
  placePeds(peds, [
    ...streetSpots(88 + 9, true, 6, -30, 80),
    ...streetSpots(88 - 9, true, 5, -20, 90),
  ]);
  return {
    steps: 150,
    input: driveInput,
    fireAtEnd: false,
    camera(cam) {
      // Chase framing: close behind the convertible, street and traffic ahead.
      const px = player.pos.x;
      cam.position.set(px + 16, 7, 96);
      cam.lookAt(px - 35, 1, 86);
    },
    info: { shot: 'cover', seed: 7, note: 'Downtown chase, 4 stars, helicopter overhead' },
  };
}
