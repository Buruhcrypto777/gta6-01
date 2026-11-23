// Solmar Bay — missions and the story.
// Five story jobs for Mara Voss, the getaway driver, plus the repeatable
// Night Shift taxi job. Each job is stages with a glowing beacon marker;
// the HUD reads `current` for its objective line and the minimap blip.
const STORY = [
  {
    id: 'pickup',
    title: 'The Pickup',
    briefing: 'Grab the package at the marina and deliver it to the Tropicana.',
    reward: 300,
    stages: [
      { text: 'Go to the marina package', target: { x: -140, z: 196 }, radius: 6 },
      { text: 'Deliver the package to the Tropicana', target: { x: 44, z: -44 }, radius: 6 },
    ],
  },
  {
    id: 'heat',
    title: 'Lose the Heat',
    briefing: 'The cops are on you. Stay out of their hands for 30 seconds.',
    reward: 350,
    stages: [{ text: 'Evade the police for 30 seconds', evade: 30 }],
  },
  {
    id: 'handoff',
    title: 'The Handoff',
    briefing: 'Drive the client across town. Do not let the cops stop you.',
    reward: 400,
    stages: [
      { text: 'Pick up the client at the Bay Club', target: { x: -110, z: 66 }, radius: 6 },
      { text: 'Drop the client at the north hotel', target: { x: 110, z: -154 }, radius: 6 },
    ],
  },
  {
    id: 'coins',
    title: 'Sun Coin Run',
    briefing: 'The collector pays for Sun Coins. Bring back four.',
    reward: 450,
    stages: [{ text: 'Collect 4 Sun Coins', coins: 4 }],
  },
  {
    id: 'score',
    title: 'The Big Score',
    briefing: 'Hit the Casino vault, then run for the beach hideout.',
    reward: 900,
    stages: [
      { text: 'Reach the Casino vault', target: { x: 22, z: -22 }, radius: 9 },
      { text: 'Grab the cash — hold on for 5 seconds', hold: 5, target: { x: 22, z: -22 }, radius: 9 },
      { text: 'Escape to the beach hideout', target: { x: 0, z: 196 }, radius: 9 },
    ],
  },
];

export function createMissions(ctx) {
  const { scene, player, police, collectibles, hud, audio } = ctx;
  const done = [];
  let current = null;
  let stageTimer = 0;
  let coinsStart = 0;

  // The beacon: a pulsing light pillar over the current objective.
  const beacon = new THREE.Mesh(
    new THREE.CylinderGeometry(1.1, 1.1, 60, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffc44d, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false }),
  );
  beacon.visible = false;
  scene.add(beacon);
  const diamond = new THREE.Mesh(
    new THREE.OctahedronGeometry(1.1),
    new THREE.MeshBasicMaterial({ color: 0xffc44d }),
  );
  diamond.visible = false;
  scene.add(diamond);

  function stageTarget() {
    if (!current) return null;
    const stage = current.stages[current.stageIndex];
    return stage && stage.target ? stage.target : null;
  }

  function refreshMarker() {
    const target = stageTarget();
    if (!target) {
      beacon.visible = false;
      diamond.visible = false;
      return;
    }
    beacon.visible = true;
    diamond.visible = true;
    beacon.position.set(target.x, 30, target.z);
    diamond.position.set(target.x, 6, target.z);
  }

  function setObjective() {
    if (!current) {
      hud.setObjective('Free roam — press M for the next job');
      return;
    }
    const stage = current.stages[current.stageIndex];
    hud.setObjective(`${current.title}: ${stage.text}`);
    hud.showMission(current.title, current.briefing);
  }

  function start(def, taxi) {
    current = {
      id: def ? def.id : 'taxi',
      title: def ? def.title : 'Night Shift',
      briefing: def ? def.briefing : 'Pick up the fare and drop them off. Tips for fast rides.',
      reward: def ? def.reward : 140,
      stages: def ? def.stages : taxi.stages,
      stageIndex: 0,
      taxi: !!taxi,
    };
    stageTimer = 0;
    coinsStart = collectibles.collected;
    if (current.id === 'heat') police.setWanted(2);
    if (current.id === 'score') police.setWanted(2);
    refreshMarker();
    setObjective();
    audio.missionStart();
    return current;
  }

  function finish() {
    const reward = current.reward;
    hud.toast(`${current.title} complete — $${reward}`);
    audio.missionComplete();
    if (!current.taxi) done.push(current.id);
    ctx.onCash(reward);
    current = null;
    beacon.visible = false;
    diamond.visible = false;
    setObjective();
    ctx.onSave();
  }

  return {
    get current() {
      return current;
    },
    get done() {
      return done;
    },
    markerPos() {
      return stageTarget();
    },
    startNext() {
      if (current) return current;
      const next = STORY.find((s) => !done.includes(s.id));
      if (next) return start(next, null);
      return this.startTaxi();
    },
    startById(id) {
      if (current) return current;
      const def = STORY.find((s) => s.id === id);
      if (!def) return null;
      return start(def, null);
    },
    startTaxi() {
      if (current) return current;
      const px = player.pos.x + (Math.random() < 0.5 ? -1 : 1) * 60;
      const pz = player.pos.z + (Math.random() < 0.5 ? -1 : 1) * 60;
      const dx = -px * 0.8 + (Math.random() < 0.5 ? -40 : 40);
      const dz = -pz * 0.8;
      const stages = [
        { text: 'Pick up the fare', target: { x: Math.max(-190, Math.min(190, px)), z: Math.max(-190, Math.min(150, pz)) }, radius: 6 },
        { text: 'Drop the fare off', target: { x: Math.max(-190, Math.min(190, dx)), z: Math.max(-190, Math.min(150, dz)) }, radius: 6 },
      ];
      return start(null, { stages });
    },
    update(dt, time) {
      if (!current) return;
      const stage = current.stages[current.stageIndex];
      if (!stage) return;
      const dx = player.pos.x - (stage.target ? stage.target.x : 0);
      const dz = player.pos.z - (stage.target ? stage.target.z : 0);
      const dist = Math.hypot(dx, dz);
      if (stage.target) {
        diamond.rotation.y = time * 2;
        diamond.position.y = 6 + Math.sin(time * 3) * 0.7;
      }
      if (stage.evade !== undefined) {
        stageTimer += dt;
        hud.setObjective(`${current.title}: evade for ${Math.max(0, Math.ceil(stage.evade - stageTimer))}s`);
        if (stageTimer >= stage.evade) {
          current.stageIndex += 1;
          if (current.stageIndex >= current.stages.length) finish();
          else setObjective();
        }
        return;
      }
      if (stage.coins !== undefined) {
        const got = collectibles.collected - coinsStart;
        hud.setObjective(`${current.title}: ${got}/${stage.coins} Sun Coins`);
        if (got >= stage.coins) {
          current.stageIndex += 1;
          if (current.stageIndex >= current.stages.length) finish();
          else setObjective();
        }
        return;
      }
      if (stage.hold !== undefined) {
        if (dist < stage.radius) {
          stageTimer += dt;
          hud.setObjective(`${current.title}: grabbing cash ${Math.ceil(stage.hold - stageTimer)}s`);
          if (stageTimer >= stage.hold) {
            current.stageIndex += 1;
            police.setWanted(4);
            stageTimer = 0;
            if (current.stageIndex >= current.stages.length) finish();
            else {
              refreshMarker();
              setObjective();
            }
          }
        } else {
          stageTimer = 0;
        }
        return;
      }
      if (stage.target && dist < stage.radius) {
        current.stageIndex += 1;
        stageTimer = 0;
        if (current.stageIndex >= current.stages.length) finish();
        else {
          refreshMarker();
          setObjective();
        }
      }
    },
  };
}
