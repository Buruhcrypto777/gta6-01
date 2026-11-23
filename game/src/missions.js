// Solmar Bay — story missions, the Night Shift taxi job, and rival gunmen.
// Five story jobs pay the big money; the taxi pays a steady fare all night.
// A gold beacon marks the current objective in the world and on the minimap.
const STORY = [
  {
    id: 'm1', title: 'First Fare', reward: 150,
    objective: 'Pick up the client at the Marina, then drop them at Hotel Miramar',
    steps: [
      { type: 'goto', at: 'marina', label: 'Go to the Marina pickup' },
      { type: 'goto', at: 'hotel', label: 'Drop the client at Hotel Miramar' },
    ],
  },
  {
    id: 'm2', title: 'Heat Run', reward: 300,
    objective: 'Hold 3 stars of heat for 45 seconds without getting busted',
    steps: [{ type: 'survive', wanted: 3, seconds: 45, label: 'Stay hot: keep 3 stars for 45 seconds' }],
  },
  {
    id: 'm3', title: 'The Drop', reward: 250,
    objective: 'Deliver the package to the Tropicana in 90 seconds',
    steps: [{ type: 'goto', at: 'tropicana', label: 'Deliver the package to the Tropicana', timer: 90 }],
  },
  {
    id: 'm4', title: 'Tropicana Shootout', reward: 500,
    objective: 'Clear the lot of 5 rivals, then grab the case',
    steps: [
      { type: 'goto', at: 'tropicana', label: 'Reach the Tropicana lot' },
      { type: 'clear', count: 5, label: 'Eliminate the 5 rivals' },
      { type: 'goto', at: 'case', label: 'Grab the case' },
    ],
  },
  {
    id: 'm5', title: 'The Big Score', reward: 800,
    objective: 'Grab the casino case and stay ahead of a 4-star heat for 60 seconds',
    steps: [
      { type: 'goto', at: 'casino', label: 'Reach the Casino' },
      { type: 'grab', at: 'casino', label: 'Grab the case' },
      { type: 'escape', wanted: 4, seconds: 60, label: 'Escape the 4-star heat for 60 seconds' },
    ],
  },
];

export function createMissions() {
  let beacon = null;
  let caseMesh = null;
  let farePed = null;
  let pendingNext = 0;

  function ensureBeacon(G) {
    if (beacon) return beacon;
    const THREE = G.three;
    beacon = new THREE.Group();
    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(2.2, 2.2, 60, 16, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.22, side: THREE.DoubleSide }),
    );
    pillar.position.y = 30;
    beacon.add(pillar);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(3, 0.3, 8, 24),
      new THREE.MeshBasicMaterial({ color: 0xffd166 }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.4;
    beacon.add(ring);
    beacon.visible = false;
    G.scene.add(beacon);
    return beacon;
  }

  function setBeacon(G, x, z, color) {
    const b = ensureBeacon(G);
    b.position.set(x, 0, z);
    b.visible = true;
    b.children[0].material.color.setHex(color);
    b.children[1].material.color.setHex(color);
    G.missionWaypoint = { x, z, color };
  }

  function hideBeacon(G) {
    if (beacon) beacon.visible = false;
    G.missionWaypoint = null;
  }

  function spawnCase(G, x, z) {
    const THREE = G.three;
    if (caseMesh) G.scene.remove(caseMesh);
    caseMesh = new THREE.Group();
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 0.7, 0.35),
      new THREE.MeshLambertMaterial({ color: 0xd4af37 }),
    );
    box.position.y = 0.8;
    caseMesh.add(box);
    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(1.6, 10, 8),
      new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.18 }),
    );
    glow.position.y = 0.8;
    caseMesh.add(glow);
    caseMesh.position.set(x, 0, z);
    G.scene.add(caseMesh);
  }

  function clearCase(G) {
    if (caseMesh) {
      G.scene.remove(caseMesh);
      caseMesh = null;
    }
  }

  function spawnRivals(G, x, z) {
    const THREE = G.three;
    const rivals = [];
    for (let i = 0; i < 5; i += 1) {
      const group = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 0.95, 0.34),
        new THREE.MeshLambertMaterial({ color: '#1f2430' }),
      );
      body.position.y = 0.95;
      group.add(body);
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.23, 10, 8),
        new THREE.MeshLambertMaterial({ color: '#c68642' }),
      );
      head.position.y = 1.62;
      group.add(head);
      const gun = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.12, 0.9),
        new THREE.MeshLambertMaterial({ color: '#111111' }),
      );
      gun.position.set(0.3, 1.1, 0.4);
      group.add(gun);
      const ang = (i / 5) * Math.PI * 2;
      const rx = x + Math.cos(ang) * (8 + (i % 2) * 5);
      const rz = z + Math.sin(ang) * (8 + (i % 2) * 5);
      group.position.set(rx, 0, rz);
      G.scene.add(group);
      rivals.push({ mesh: group, pos: group.position, hp: 100, shootTimer: 1 + i * 0.4 });
    }
    return rivals;
  }

  function clearRivals(G, list) {
    for (const r of list) G.scene.remove(r.mesh);
    list.length = 0;
  }

  const self = {
    current: null,
    done: [],
    nextIndex: 0,
    taxiOn: false,
    fare: null,
    fareTimer: 0,
    rivals: [],

    startNext(G) {
      if (this.current) return;
      if (this.nextIndex >= STORY.length) {
        G.hud.toast('All story jobs done — Night Shift taxi still pays. Press T.');
        return;
      }
      const def = STORY[this.nextIndex];
      this.current = { def, title: def.title, stepIdx: 0, timer: 0, stepTimer: 0 };
      this.setupStep(G);
      G.hud.toast(`New job: ${def.title} — $${def.reward}`);
      G.audio.blip('pickup');
    },

    setupStep(G) {
      const cur = this.current;
      if (!cur) return;
      const step = cur.def.steps[cur.stepIdx];
      cur.timer = 0;
      cur.stepTimer = step.timer || 0;
      if (step.type === 'goto' || step.type === 'grab') {
        const spot = step.at === 'case'
          ? { x: G.data.missionSpots.tropicana.x + 6, z: G.data.missionSpots.tropicana.z + 6 }
          : G.data.missionSpots[step.at];
        cur.target = spot;
        setBeacon(G, spot.x, spot.z, 0xffd166);
        if (step.type === 'grab') spawnCase(G, spot.x, spot.z);
      } else if (step.type === 'clear') {
        const spot = G.data.missionSpots.tropicana;
        cur.target = spot;
        setBeacon(G, spot.x, spot.z, 0xff2d55);
        clearRivals(G, this.rivals);
        this.rivals.push(...spawnRivals(G, spot.x, spot.z));
      } else if (step.type === 'survive' || step.type === 'escape') {
        cur.target = null;
        hideBeacon(G);
        if (step.type === 'escape') G.police.setWanted(step.wanted);
      }
      G.hud.setObjective(step.label);
    },

    advance(G) {
      const cur = this.current;
      if (!cur) return;
      cur.stepIdx += 1;
      if (cur.stepIdx >= cur.def.steps.length) {
        this.complete(G);
        return;
      }
      this.setupStep(G);
    },

    complete(G) {
      const def = this.current.def;
      G.cash += def.reward;
      this.done.push(def.id);
      this.nextIndex += 1;
      clearCase(G);
      clearRivals(G, this.rivals);
      hideBeacon(G);
      this.current = null;
      G.hud.toast(`Job complete: ${def.title} — +$${def.reward}`);
      G.hud.setObjective('Job complete — next job coming up');
      G.audio.blip('pickup');
      G.saveGame();
      pendingNext = 3;
    },

    failStep(G, reason) {
      if (!this.current) return;
      G.hud.toast(reason);
      G.audio.blip('bad');
      this.current.stepIdx = 0;
      this.setupStep(G);
    },

    toggleTaxi(G) {
      this.taxiOn = !this.taxiOn;
      if (this.taxiOn) {
        G.hud.toast('Night Shift: on duty — drive to the pickup');
        this.fareTimer = 0.5;
      } else {
        G.hud.toast('Night Shift: off duty');
        if (this.fare) this.clearFare(G);
      }
    },

    spawnFare(G) {
      const THREE = G.three;
      // Nearest stand to the player is the pickup.
      let stand = G.data.taxiStands[0];
      let bestD = Infinity;
      for (const s of G.data.taxiStands) {
        const d = Math.hypot(s.x - G.player.pos.x, s.z - G.player.pos.z);
        if (d < bestD) {
          bestD = d;
          stand = s;
        }
      }
      const dests = [...G.data.taxiStands, G.data.missionSpots.hotel, G.data.missionSpots.casino, G.data.missionSpots.marina];
      const dest = dests[Math.floor(G.rng.next() * dests.length)];
      const dist = Math.hypot(dest.x - stand.x, dest.z - stand.z);
      const amount = Math.round((40 + dist * 0.45) / 5) * 5;
      const group = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.55, 0.95, 0.32),
        new THREE.MeshLambertMaterial({ color: '#22d3ee' }),
      );
      body.position.y = 0.95;
      group.add(body);
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.23, 10, 8),
        new THREE.MeshLambertMaterial({ color: '#f1c27d' }),
      );
      head.position.y = 1.62;
      group.add(head);
      group.position.set(stand.x + 3, 0, stand.z + 3);
      G.scene.add(group);
      farePed = group;
      this.fare = { pickup: stand, dest, amount, stage: 'pickup' };
      setBeacon(G, stand.x, stand.z, 0x22d3ee);
      G.hud.setObjective(`Night Shift: pick up the fare ($${amount})`);
    },

    clearFare(G) {
      if (farePed) {
        G.scene.remove(farePed);
        farePed = null;
      }
      this.fare = null;
      if (!this.current) hideBeacon(G);
    },

    update(dt, G) {
      if (pendingNext > 0) {
        pendingNext -= dt;
        if (pendingNext <= 0) this.startNext(G);
      }
      // Rival gunmen shoot back.
      for (const r of this.rivals) {
        if (r.hp <= 0) continue;
        r.shootTimer -= dt;
        const d = Math.hypot(r.pos.x - G.player.pos.x, r.pos.z - G.player.pos.z);
        if (r.shootTimer <= 0 && d < 45) {
          r.shootTimer = 2.2;
          const from = { x: r.pos.x, y: 1.2, z: r.pos.z };
          const dir = {
            x: G.player.pos.x - r.pos.x,
            y: 1.2 - 1.2,
            z: G.player.pos.z - r.pos.z,
          };
          const dl = Math.hypot(dir.x, dir.y, dir.z) || 1;
          dir.x /= dl;
          dir.y /= dl;
          dir.z /= dl;
          G.weapons.fire(from, dir, { peds: null, rivals: null, police: null, rng: G.rng }, null);
          G.damagePlayer(8);
        }
        // Face the player.
        r.mesh.rotation.y = Math.atan2(G.player.pos.x - r.pos.x, G.player.pos.z - r.pos.z);
      }
      // Remove dead rivals.
      for (let i = this.rivals.length - 1; i >= 0; i -= 1) {
        if (this.rivals[i].hp <= 0) {
          G.scene.remove(this.rivals[i].mesh);
          this.rivals.splice(i, 1);
        }
      }
      // Taxi fares.
      if (this.taxiOn && !this.fare) {
        this.fareTimer -= dt;
        if (this.fareTimer <= 0) this.spawnFare(G);
      }
      if (this.fare) {
        const f = this.fare;
        const target = f.stage === 'pickup' ? f.pickup : f.dest;
        const d = Math.hypot(target.x - G.player.pos.x, target.z - G.player.pos.z);
        if (f.stage === 'pickup' && d < 5) {
          f.stage = 'dropoff';
          if (farePed) {
            G.scene.remove(farePed);
            farePed = null;
          }
          setBeacon(G, f.dest.x, f.dest.z, 0x22d3ee);
          G.hud.setObjective(`Night Shift: drop the fare off ($${f.amount})`);
          G.hud.toast('Passenger aboard — drive them to the marker');
        } else if (f.stage === 'dropoff' && d < 6) {
          G.cash += f.amount;
          G.hud.toast(`Fare complete — +$${f.amount}`);
          G.audio.blip('coin');
          this.clearFare(G);
          this.fareTimer = 4;
          G.saveGame();
        }
      }
      // Story mission steps.
      const cur = this.current;
      if (!cur) return;
      const step = cur.def.steps[cur.stepIdx];
      if (step.type === 'goto' || step.type === 'grab') {
        const d = Math.hypot(cur.target.x - G.player.pos.x, cur.target.z - G.player.pos.z);
        if (step.timer) {
          cur.stepTimer -= dt;
          G.hud.setObjective(`${step.label} — ${Math.max(0, Math.ceil(cur.stepTimer))}s`);
          if (cur.stepTimer <= 0 && d > 6) {
            this.failStep(G, 'Too slow — the job moved on. Restarting the step.');
            return;
          }
        }
        if (d < 6) {
          if (step.type === 'grab') {
            clearCase(G);
            G.hud.toast('Case grabbed — run!');
            G.audio.blip('coin');
          }
          this.advance(G);
        }
      } else if (step.type === 'survive' || step.type === 'escape') {
        if (G.police.state.wanted < step.wanted && step.type === 'survive') {
          G.police.setWanted(step.wanted);
        }
        if (G.police.state.wanted >= step.wanted) {
          cur.timer += dt;
          const left = Math.max(0, Math.ceil(step.seconds - cur.timer));
          G.hud.setObjective(`${step.label} — ${left}s`);
          if (cur.timer >= step.seconds) this.advance(G);
        } else {
          G.hud.setObjective(`${step.label} — get the heat back up!`);
        }
      } else if (step.type === 'clear') {
        const left = this.rivals.length;
        G.hud.setObjective(`${step.label} — ${left} left`);
        if (left === 0) this.advance(G);
      }
    },
  };
  return self;
}
