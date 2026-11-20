// Solmar Bay — the story: five chained missions plus repeatable taxi work and
// the Sun Coins hunt. Each mission sets a beacon, an objective line and a
// distance; finishing one pays cash, saves, and unlocks the next.
const THREE = window.THREE;
import { CFG } from './config.js';

function makeBeacon() {
  const g = new THREE.Group();
  const pillar = new THREE.Mesh(
    new THREE.CylinderGeometry(2.2, 2.2, 60, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffc93c, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false })
  );
  pillar.position.y = 30;
  const diamond = new THREE.Mesh(
    new THREE.OctahedronGeometry(1.6),
    new THREE.MeshBasicMaterial({ color: 0xffc93c })
  );
  diamond.position.y = 9; diamond.name = 'diamond';
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(3, 4.2, 24),
    new THREE.MeshBasicMaterial({ color: 0xffc93c, transparent: true, opacity: 0.8, side: THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.25;
  g.add(pillar, diamond, ring);
  g.visible = false;
  return g;
}

export function createMissions(G) {
  const beacon = makeBeacon();
  G.scene.add(beacon);
  const S = G.world.spawnPoints;

  const defs = [
    {
      id: 'first-wheels', title: 'First Wheels', reward: CFG.rewards.mission[0],
      blurb: 'Mara needs wheels. Steal any car and bring it to Café Marisol.',
      start() { return { target: { x: S.cafe.x, z: S.cafe.z, label: 'Café Marisol' }, needCar: true }; },
      update(st, dt) {
        if (st.needCar && !G.player.car) return { hint: 'Steal a car — walk up to one and press E' };
        if (G.player.car && Math.hypot(G.player.car.x - st.target.x, G.player.car.z - st.target.z) < 10) return { done: true };
        return null;
      },
    },
    {
      id: 'the-drop', title: 'The Drop', reward: CFG.rewards.mission[1],
      blurb: 'A package for the Marina Docks. Ninety seconds. No questions.',
      start() { return { target: { x: S.marina.x, z: S.marina.z, label: 'Marina Docks' }, timer: 90 }; },
      update(st, dt) {
        st.timer -= dt;
        G.hud.setTimer(Math.max(0, Math.ceil(st.timer)));
        if (st.timer <= 0) return { fail: 'Too slow — the buyer walked away.' };
        if (Math.hypot(G.player.pos.x - st.target.x, G.player.pos.z - st.target.z) < 10) return { done: true };
        return null;
      },
    },
    {
      id: 'hot-pursuit', title: 'Hot Pursuit', reward: CFG.rewards.mission[2],
      blurb: 'The cops are onto you. Survive sixty seconds and lose them.',
      start() { G.police.setWanted(3); return { target: null, timer: 60 }; },
      update(st, dt) {
        st.timer -= dt;
        G.hud.setTimer(Math.max(0, Math.ceil(st.timer)));
        if (st.timer <= 0) return { done: true };
        return { hint: 'Keep moving — lose the cops!' };
      },
    },
    {
      id: 'payback', title: 'Payback', reward: CFG.rewards.mission[3],
      blurb: 'Three collectors are shaking down Coral Market. Settle it on foot.',
      start() {
        const spots = [[560, 400], [576, 416], [544, 384]];
        for (const [x, z] of spots) G.combat.spawnThug(x, z);
        return { target: { x: 560, z: 400, label: 'Coral Market' }, left: 3 };
      },
      update(st, dt) {
        st.left = G.combat.enemies.length;
        if (st.left <= 0) return { done: true };
        return { hint: `${st.left} collector${st.left > 1 ? 's' : ''} left — press F to punch` };
      },
    },
    {
      id: 'the-getaway', title: 'The Getaway', reward: CFG.rewards.mission[4],
      blurb: 'Pick up Rook at The Tropicana, then run a four-star chase to the Safehouse.',
      start() {
        G.combat.spawnFriend(240, -80);
        return { target: { x: 240, z: -80, label: 'The Tropicana' }, phase: 'pickup' };
      },
      update(st, dt) {
        if (st.phase === 'pickup') {
          if (G.combat.friendPickedUp) {
            st.phase = 'escape';
            st.target = { x: S.safehouse.x, z: S.safehouse.z, label: 'Safehouse' };
            G.police.setWanted(4);
            G.hud.toast('Rook is in — run for the Safehouse!');
          }
          return { hint: 'Pick up Rook at The Tropicana' };
        }
        if (Math.hypot(G.player.pos.x - st.target.x, G.player.pos.z - st.target.z) < 12) return { done: true };
        return { hint: 'Lose the cops and reach the Safehouse' };
      },
    },
  ];

  const M = {
    defs, index: 0, current: null, st: null, taxi: null, taxiFares: 0,
    startMission(i) {
      const def = defs[i];
      if (!def) return false;
      M.current = def; M.index = i;
      M.st = def.start();
      G.hud.setObjective(`${def.title}: ${def.blurb}`);
      G.hud.toast(`Mission — ${def.title}`);
      G.audio.jingle();
      return true;
    },
    startNext() { return M.startMission(M.index); },
    completeCurrent() {
      const def = M.current;
      G.player.cash += def.reward;
      G.hud.setCash(G.player.cash);
      G.hud.toast(`Mission complete — ${def.title}  +$${def.reward}`);
      G.audio.jingle();
      G.saveGame();
      M.current = null; M.st = null; M.index++;
      G.hud.setTimer(null); G.hud.setObjective(M.index < defs.length ? 'Press M to start the next mission' : 'All story missions done — free roam!');
      beacon.visible = false;
    },
    failCurrent(reason) {
      G.hud.toast(reason);
      M.current = null; M.st = null;
      G.hud.setTimer(null);
      G.hud.setObjective('Press M to retry the mission');
      beacon.visible = false;
    },
    startTaxi() {
      if (M.taxi) return;
      M.taxi = { phase: 'pickup', target: null, fares: 0 };
      M.pickFare();
      G.hud.toast('Night Shift — pick up the fare!');
    },
    pickFare() {
      const p = G.world.randomRoadPoint();
      M.taxi.target = { x: p.x, z: p.z, label: 'Fare' };
      M.taxi.phase = 'pickup';
    },
    dropFare() {
      const p = G.world.randomRoadPoint();
      M.taxi.target = { x: p.x, z: p.z, label: 'Drop-off' };
      M.taxi.phase = 'dropoff';
    },
    update(dt) {
      if (M.current && M.st) {
        const res = M.current.update(M.st, dt);
        if (res) {
          if (res.done) M.completeCurrent();
          else if (res.fail) M.failCurrent(res.fail);
          else if (res.hint) G.hud.setHint(res.hint);
        }
        if (M.current && M.st && M.st.target) {
          beacon.visible = true;
          beacon.position.set(M.st.target.x, 0, M.st.target.z);
          const d = Math.hypot(G.player.pos.x - M.st.target.x, G.player.pos.z - M.st.target.z);
          G.hud.setDistance(M.st.target.label, Math.round(d));
        } else if (!M.taxi) beacon.visible = false;
      }
      // Taxi side job.
      if (M.taxi) {
        const t = M.taxi.target;
        beacon.visible = true;
        beacon.position.set(t.x, 0, t.z);
        const d = Math.hypot(G.player.pos.x - t.x, G.player.pos.z - t.z);
        G.hud.setDistance(t.label, Math.round(d));
        if (d < 9 && G.player.car) {
          if (M.taxi.phase === 'pickup') { M.dropFare(); G.hud.toast('Fare aboard — drive to the drop-off'); }
          else {
            M.taxi.fares++;
            G.player.cash += CFG.rewards.taxi;
            G.hud.setCash(G.player.cash);
            G.hud.toast(`Fare done  +$${CFG.rewards.taxi}`);
            if (M.taxi.fares >= 3) { M.taxi = null; beacon.visible = false; G.hud.toast('Night Shift complete — nice driving'); G.saveGame(); }
            else M.pickFare();
          }
        }
      }
      const dia = beacon.getObjectByName('diamond');
      if (dia) { dia.rotation.y += dt * 2; dia.position.y = 9 + Math.sin(G.time * 2) * 0.8; }
    },
    objectiveText() {
      if (M.current) return `${M.current.title}: ${M.current.blurb}`;
      if (M.index < defs.length) return 'Press M to start the next mission';
      return 'Free roam — collect Sun Coins, drive a taxi (T), or cause chaos';
    },
  };
  return M;
}
