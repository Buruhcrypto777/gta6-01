// The simulation: no drawing and no browser in it, just the rules and the state — Mara on
// foot or in a car, traffic cars and pedestrians, police and the wanted level, crimes and
// being busted. step() advances one fixed 1/60 s step and returns what happened as bit flags,
// so the caller can react (sounds, toasts, missions) without the world knowing about them.
// Positions are metres, x east, z south, heading 0 facing +z (south) and growing clockwise.
import { BLOCK, CAR, CITY, PLAYER, STEP, WANTED } from './config.js';
import { nearestRoad, randomRoadSpawn, randomSidewalkSpawn } from './city.js';
import { pick, range } from './random.js';

export const EVENT_CRIME = 1;
export const EVENT_HIT_PED = 2;
export const EVENT_STOLEN = 4;
export const EVENT_BUSTED = 8;
export const EVENT_PUNCH = 16;
export const EVENT_CRASH = 32;
export const EVENT_ENTER_CAR = 64;
export const EVENT_EXIT_CAR = 128;

const CAR_COLORS = [0xc94f3d, 0x3d7ac9, 0x4a9e6a, 0xd8c9a3, 0x6a5a8a, 0xc9a13d, 0x8a8f96, 0x2f4a5e];
const PED_COLORS = [0xe8b48c, 0x7fb3d9, 0xd97f9e, 0x8fc97f, 0xd9c27f, 0x9f8fd9, 0x6fc9c9, 0xd98a5f];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function angleDifference(from, to) {
  let d = to - from;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** Push a circle out of a building's footprint; returns true when it overlapped. */
export function pushOutOfBuildings(layout, x, z, radius) {
  let hit = false;
  for (const b of layout.buildings) {
    const nx = clamp(x, b.x - b.w / 2, b.x + b.w / 2);
    const nz = clamp(z, b.z - b.d / 2, b.z + b.d / 2);
    const dx = x - nx;
    const dz = z - nz;
    const distSq = dx * dx + dz * dz;
    if (distSq < radius * radius) {
      hit = true;
      if (distSq > 0.0001) {
        const dist = Math.sqrt(distSq);
        x = nx + (dx / dist) * radius;
        z = nz + (dz / dist) * radius;
      } else {
        // Dead centre: push out along the shorter axis.
        const pushX = b.w / 2 + radius - Math.abs(x - b.x);
        const pushZ = b.d / 2 + radius - Math.abs(z - b.z);
        if (pushX < pushZ) x = b.x + (x < b.x ? -1 : 1) * (b.w / 2 + radius);
        else z = b.z + (z < b.z ? -1 : 1) * (b.d / 2 + radius);
      }
    }
  }
  return { x, z, hit };
}

export function createWorld(random, layout) {
  let nextCarId = 1;
  let nextPedId = 1;

  const player = {
    x: 0, z: 120, heading: Math.PI, speed: 0, onFoot: true, carId: -1,
    punchTimer: 0, punchHitDone: false, stunned: 0, sprint: false,
  };
  const cars = [];
  const peds = [];
  const state = {
    time: 0, cash: 0, wanted: 0, wantedTimer: 0, busted: false,
    bustedHold: 0, copCatch: 0, player, cars, peds,
    waypoint: null, missionIndex: 0, missionStage: 0,
    toast: '', toastTimer: 0,
  };

  function makeCar(kind, x, z, heading, carState) {
    const car = {
      id: nextCarId,
      kind,
      color: kind === 'police' ? 0xf2f2f2 : kind === 'taxi' ? 0xf2c230 : kind === 'sport' ? 0xd9382b : pick(random, CAR_COLORS),
      x, z, heading, speed: 0, steer: 0, state: carState, driver: carState === 'traffic',
      cruise: range(random, 8, 12), lane: null, road: null, dir: 1,
      turning: null, decideAt: 0, sirenPhase: random() * Math.PI * 2,
    };
    nextCarId += 1;
    return car;
  }

  function makePed(kind, x, z) {
    const ped = {
      id: nextPedId,
      kind, x, z,
      heading: random() * Math.PI * 2, speed: range(random, 1.0, 1.5),
      state: 'walk', downTimer: 0, fleeTimer: 0, color: kind === 'cop' ? 0x1e3a5f : pick(random, PED_COLORS),
      road: null, side: 1, dir: 1, walkPhase: random() * Math.PI * 2,
    };
    nextPedId += 1;
    return ped;
  }

  function spawnTrafficCar() {
    const spot = randomRoadSpawn(random);
    const kind = random() < 0.12 ? 'taxi' : random() < 0.14 ? 'sport' : 'sedan';
    const car = makeCar(kind, spot.x, spot.z, spot.heading, 'traffic');
    car.road = spot.vertical ? 'avenue' : 'street';
    car.line = spot.line;
    car.dir = spot.heading === 0 || spot.heading === Math.PI / 2 ? 1 : -1;
    cars.push(car);
    return car;
  }

  function spawnParkedCar() {
    const spot = randomRoadSpawn(random);
    const car = makeCar(random() < 0.2 ? 'sport' : 'sedan', spot.x, spot.z, spot.heading, 'parked');
    car.driver = false;
    cars.push(car);
    return car;
  }

  function spawnPed() {
    const spot = randomSidewalkSpawn(random);
    peds.push(makePed('ped', spot.x, spot.z));
  }

  function spawnPoliceCar() {
    const road = nearestRoad(player.x + range(random, -1, 1) * WANTED.spawnDistance, player.z + range(random, -1, 1) * WANTED.spawnDistance);
    const car = makeCar('police', road.x, road.z, Math.atan2(player.x - road.x, player.z - road.z), 'police');
    cars.push(car);
    return car;
  }

  function spawnFootCop() {
    const road = nearestRoad(player.x + range(random, -30, 30), player.z + range(random, -30, 30));
    const cop = makePed('cop', road.x + range(random, -4, 4), road.z + range(random, -4, 4));
    cop.state = 'chase';
    peds.push(cop);
  }

  function nearestCar(x, z, maxDist, states) {
    let best = null;
    let bestDist = maxDist;
    for (const car of cars) {
      if (states && !states.includes(car.state)) continue;
      const d = Math.hypot(car.x - x, car.z - z);
      if (d < bestDist) {
        bestDist = d;
        best = car;
      }
    }
    return best;
  }

  function addCrime(kind) {
    const add = WANTED[kind] ?? 1;
    state.wanted = Math.min(WANTED.max, state.wanted + add);
    state.wantedTimer = 0;
    const policeCars = cars.filter((c) => c.state === 'police').length;
    const wantedCars = Math.min(4, state.wanted);
    for (let i = policeCars; i < wantedCars; i += 1) spawnPoliceCar();
    if (state.wanted >= 2) {
      const cops = peds.filter((p) => p.kind === 'cop').length;
      for (let i = cops; i < Math.min(2, state.wanted - 1); i += 1) spawnFootCop();
    }
    return EVENT_CRIME;
  }

  function playerCar() {
    return cars.find((c) => c.id === player.carId) ?? null;
  }

  function reset() {
    cars.length = 0;
    peds.length = 0;
    player.x = 0;
    player.z = 120;
    player.heading = Math.PI;
    player.speed = 0;
    player.onFoot = true;
    player.carId = -1;
    player.punchTimer = 0;
    player.stunned = 0;
    state.time = 0;
    state.wanted = 0;
    state.wantedTimer = 0;
    state.busted = false;
    state.bustedHold = 0;
    state.copCatch = 0;
    state.waypoint = null;
    state.missionIndex = 0;
    state.missionStage = 0;
    state.toast = '';
    state.toastTimer = 0;
    for (let i = 0; i < 14; i += 1) spawnTrafficCar();
    for (let i = 0; i < 6; i += 1) spawnParkedCar();
    for (let i = 0; i < 18; i += 1) spawnPed();
  }

  function enterCar(car) {
    const wasTraffic = car.state === 'traffic';
    const copNear = peds.some((p) => p.kind === 'cop' && Math.hypot(p.x - car.x, p.z - car.z) < 45)
      || cars.some((c) => c.state === 'police' && Math.hypot(c.x - car.x, c.z - car.z) < 45);
    let events = EVENT_ENTER_CAR;
    if (wasTraffic) {
      car.driver = false;
      events |= addCrime('stealCar');
      events |= EVENT_STOLEN;
    } else if (copNear) {
      events |= addCrime('stealCar');
      events |= EVENT_STOLEN;
    }
    car.state = 'player';
    player.carId = car.id;
    player.onFoot = false;
    player.speed = 0;
    return events;
  }

  function exitCar() {
    const car = playerCar();
    if (!car) return 0;
    car.state = 'parked';
    car.speed = 0;
    car.driver = false;
    player.carId = -1;
    player.onFoot = true;
    player.x = car.x + Math.cos(car.heading) * 2.4;
    player.z = car.z - Math.sin(car.heading) * 2.4;
    player.heading = car.heading;
    player.speed = 0;
    return EVENT_EXIT_CAR;
  }

  function tryEnterOrExit() {
    if (!player.onFoot) return exitCar();
    const car = nearestCar(player.x, player.z, 3.6, ['traffic', 'parked']);
    if (!car) return 0;
    return enterCar(car);
  }

  function stepPlayerOnFoot(dt, input) {
    if (player.stunned > 0) {
      player.stunned -= dt;
      player.speed = 0;
      return 0;
    }
    const moving = input.moveX !== 0 || input.moveZ !== 0;
    const targetSpeed = moving ? (input.sprint ? PLAYER.sprintSpeed : PLAYER.walkSpeed) : 0;
    player.speed += (targetSpeed - player.speed) * Math.min(1, dt * 10);
    if (moving) {
      const targetHeading = Math.atan2(input.moveX, input.moveZ);
      player.heading += clamp(angleDifference(player.heading, targetHeading), -PLAYER.turnSpeed * dt, PLAYER.turnSpeed * dt);
    }
    let nx = player.x + Math.sin(player.heading) * player.speed * dt;
    let nz = player.z + Math.cos(player.heading) * player.speed * dt;
    const pushed = pushOutOfBuildings(layout, nx, nz, PLAYER.radius);
    nx = pushed.x;
    nz = pushed.z;
    nx = clamp(nx, -CITY.half - 20, CITY.half + 20);
    nz = clamp(nz, -CITY.half - 20, CITY.seaFrom - 2);
    player.x = nx;
    player.z = nz;
    // A car that hits Mara on foot knocks her down.
    for (const car of cars) {
      if (car.state === 'player' || Math.abs(car.speed) < 6) continue;
      if (Math.hypot(car.x - player.x, car.z - player.z) < CAR.radius) {
        player.stunned = 1.5;
        player.speed = 0;
        return EVENT_CRASH;
      }
    }
    return 0;
  }

  function stepPlayerCar(dt, input) {
    const car = playerCar();
    if (!car) {
      player.onFoot = true;
      return 0;
    }
    const maxSpeed = car.kind === 'sport' ? CAR.sportMaxSpeed : CAR.maxSpeed;
    if (input.throttle > 0) car.speed += CAR.accel * input.throttle * dt;
    else if (input.throttle < 0) {
      if (car.speed > 0.5) car.speed -= CAR.brake * dt;
      else car.speed += CAR.reverseAccel * input.throttle * dt;
    } else {
      car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 6 * dt);
    }
    car.speed = clamp(car.speed, -CAR.maxReverse, maxSpeed);
    const steerTarget = clamp(input.steer, -1, 1) * CAR.steerMax;
    car.steer += (steerTarget - car.steer) * Math.min(1, dt * 8);
    const grip = input.handbrake ? CAR.handbrakeGrip : 1;
    // Arcade turn: the wheel turns the car, more at speed, less when crawling.
    const turnAuthority = Math.min(1, Math.abs(car.speed) / 8 + 0.25);
    car.heading += car.steer * 2.1 * grip * turnAuthority * dt * Math.sign(car.speed || 1);
    if (input.handbrake) car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 14 * dt);
    car.x += Math.sin(car.heading) * car.speed * dt;
    car.z += Math.cos(car.heading) * car.speed * dt;
    const pushed = pushOutOfBuildings(layout, car.x, car.z, CAR.radius);
    if (pushed.hit) {
      if (Math.abs(car.speed) > 6) {
        car.speed *= 0.35;
        car.x = pushed.x;
        car.z = pushed.z;
        return EVENT_CRASH;
      }
      car.x = pushed.x;
      car.z = pushed.z;
      car.speed *= 0.5;
    }
    car.x = clamp(car.x, -CITY.half - 12, CITY.half + 12);
    car.z = clamp(car.z, -CITY.half - 12, CITY.seaFrom - 4);
    player.x = car.x;
    player.z = car.z;
    player.heading = car.heading;
    player.speed = car.speed;
    return 0;
  }

  function stepCarCollisions() {
    let events = 0;
    for (let i = 0; i < cars.length; i += 1) {
      for (let j = i + 1; j < cars.length; j += 1) {
        const a = cars[i];
        const b = cars[j];
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const dist = Math.hypot(dx, dz);
        const min = CAR.radius * 1.6;
        if (dist >= min || dist < 0.001) continue;
        const push = (min - dist) / 2;
        const nx = dx / dist;
        const nz = dz / dist;
        a.x -= nx * push;
        a.z -= nz * push;
        b.x += nx * push;
        b.z += nz * push;
        const rel = Math.abs(a.speed - b.speed);
        if (rel > 5) {
          const avg = (a.speed + b.speed) / 2;
          a.speed = avg;
          b.speed = avg;
          events |= EVENT_CRASH;
          // Ramming a police car is a crime only when Mara does the ramming: when the
          // police rear-end her, the crash is theirs, not a crime of hers.
          const playerCar = a.state === 'player' ? a : b.state === 'player' ? b : null;
          const policeCar = a.state === 'police' ? a : b.state === 'police' ? b : null;
          if (playerCar && policeCar && Math.abs(playerCar.speed) > Math.abs(policeCar.speed) + 5) {
            events |= addCrime('hitCop');
          }
        }
      }
    }
    return events;
  }

  function stepCarVsPeds() {
    let events = 0;
    for (const car of cars) {
      if (Math.abs(car.speed) < 3) continue;
      for (const ped of peds) {
        if (ped.state === 'down') continue;
        if (Math.hypot(car.x - ped.x, car.z - ped.z) < CAR.radius) {
          ped.state = 'down';
          ped.downTimer = 3;
          events |= EVENT_HIT_PED;
          if (car.state === 'player') events |= addCrime('hitPed');
        }
      }
    }
    return events;
  }

  function stepPeds(dt) {
    for (const ped of peds) {
      if (ped.state === 'down') {
        ped.downTimer -= dt;
        if (ped.downTimer <= 0) ped.state = ped.kind === 'cop' ? 'chase' : 'walk';
        continue;
      }
      if (ped.kind === 'cop') continue; // Police on foot are steered by police.js.
      const playerSpeed = Math.abs(player.speed);
      const distToPlayer = Math.hypot(player.x - ped.x, player.z - ped.z);
      if (ped.fleeTimer > 0) {
        ped.fleeTimer -= dt;
        ped.heading = Math.atan2(ped.x - player.x, ped.z - player.z);
        ped.x += Math.sin(ped.heading) * 3.6 * dt;
        ped.z += Math.cos(ped.heading) * 3.6 * dt;
      } else if (distToPlayer < 9 && playerSpeed > 8) {
        ped.fleeTimer = 3;
        ped.state = 'flee';
      } else {
        ped.state = 'walk';
        const road = nearestRoad(ped.x, ped.z);
        ped.heading = road.axis === 'z' ? (ped.dir > 0 ? 0 : Math.PI) : (ped.dir > 0 ? Math.PI / 2 : -Math.PI / 2);
        ped.x += Math.sin(ped.heading) * ped.speed * dt;
        ped.z += Math.cos(ped.heading) * ped.speed * dt;
        if (Math.abs(ped.x) > CITY.half + 14 || Math.abs(ped.z) > CITY.half + 14) ped.dir *= -1;
        const pushed = pushOutOfBuildings(layout, ped.x, ped.z, 0.5);
        ped.x = pushed.x;
        ped.z = pushed.z;
      }
      ped.walkPhase += dt * (ped.state === 'flee' ? 9 : 5);
    }
  }

  function stepWanted(dt) {
    if (state.wanted === 0) return;
    state.wantedTimer += dt;
    if (state.wantedTimer >= WANTED.decaySeconds) {
      state.wanted -= 1;
      state.wantedTimer = 0;
      if (state.wanted === 0) {
        for (const car of cars) if (car.state === 'police') car.state = 'leaving';
        for (const ped of peds) if (ped.kind === 'cop') ped.state = 'leaving';
      }
    }
  }

  function stepBusted(dt) {
    if (state.busted) return EVENT_BUSTED;
    const playerSpeed = Math.abs(player.speed);
    let nearPoliceCar = false;
    for (const car of cars) {
      if (car.state !== 'police') continue;
      if (Math.hypot(car.x - player.x, car.z - player.z) < 6 && playerSpeed < 2.5) nearPoliceCar = true;
    }
    if (nearPoliceCar) {
      state.bustedHold += dt;
      if (state.bustedHold >= WANTED.bustedHoldSeconds) {
        state.busted = true;
        return EVENT_BUSTED;
      }
    } else {
      state.bustedHold = Math.max(0, state.bustedHold - dt * 2);
    }
    let caught = false;
    for (const ped of peds) {
      if (ped.kind !== 'cop' || ped.state !== 'chase') continue;
      if (Math.hypot(ped.x - player.x, ped.z - player.z) < 1.4) caught = true;
    }
    if (caught && player.onFoot) {
      state.copCatch += dt;
      if (state.copCatch >= WANTED.copCatchSeconds) {
        state.busted = true;
        return EVENT_BUSTED;
      }
    } else {
      state.copCatch = Math.max(0, state.copCatch - dt * 2);
    }
    return 0;
  }

  /** One fixed step. `input` carries the frame's controls (see main.js). */
  function step(dt, input) {
    let events = 0;
    state.time += dt;
    if (state.toastTimer > 0) {
      state.toastTimer -= dt;
      if (state.toastTimer <= 0) state.toast = '';
    }
    if (input.enter) events |= tryEnterOrExit();
    if (input.punch && player.onFoot && player.punchTimer <= 0 && player.stunned <= 0) {
      player.punchTimer = PLAYER.punchCooldown;
      player.punchHitDone = false;
      events |= EVENT_PUNCH;
    }
    if (player.punchTimer > 0) player.punchTimer -= dt;

    if (player.onFoot) events |= stepPlayerOnFoot(dt, input);
    else events |= stepPlayerCar(dt, input);
    events |= stepCarCollisions();
    events |= stepCarVsPeds();
    stepPeds(dt);
    stepWanted(dt);
    events |= stepBusted(dt);
    return events;
  }

  reset();
  return {
    state, layout, reset, step, addCrime, nearestCar, spawnPoliceCar, spawnFootCop,
    playerCar,
    setToast(text, seconds) {
      state.toast = text;
      state.toastTimer = seconds;
    },
  };
}
