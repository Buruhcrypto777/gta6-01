// Solmar Bay — the HUD: stars, cash, speed, health, objective line,
// mission banner, toasts, radio readout and the 2D minimap.
// The minimap is a live top-down canvas: roads, buildings, the ocean, the
// player arrow, traffic, police, coins and the mission beacon.
export function createHud() {
  const el = (id) => document.getElementById(id);
  const objectiveEl = el('objective');
  const starsEl = el('stars');
  const cashEl = el('cash');
  const speedEl = el('speed');
  const toastEl = el('toast');
  const missionEl = el('mission');
  const radioEl = el('radio');
  const healthEl = el('health-fill');
  const map = el('minimap');
  const mapCtx = map.getContext('2d');
  let toastTimer = 0;
  let missionTimer = 0;

  function drawMinimap(game) {
    const S = map.width;
    const scale = S / 460;
    const toMap = (x, z) => [S / 2 + x * scale, S / 2 + z * scale];
    mapCtx.fillStyle = '#101418';
    mapCtx.fillRect(0, 0, S, S);
    // Ocean south.
    mapCtx.fillStyle = '#1d5f7a';
    const [, beachY] = toMap(0, 176);
    mapCtx.fillRect(0, beachY, S, S - beachY);
    // Roads.
    mapCtx.strokeStyle = '#4a4a52';
    mapCtx.lineWidth = 4;
    for (let k = -5; k <= 5; k += 1) {
      const c = k * 44;
      const [x] = toMap(c, 0);
      const [, z] = toMap(0, c);
      mapCtx.beginPath();
      mapCtx.moveTo(x, 0);
      mapCtx.lineTo(x, S);
      mapCtx.stroke();
      mapCtx.beginPath();
      mapCtx.moveTo(0, z);
      mapCtx.lineTo(S, z);
      mapCtx.stroke();
    }
    // Buildings.
    mapCtx.fillStyle = '#8a7a5a';
    for (const b of game.world.buildings) {
      const [x, z] = toMap(b.x - b.w / 2, b.z - b.d / 2);
      mapCtx.fillRect(x, z, Math.max(2, b.w * scale), Math.max(2, b.d * scale));
    }
    // Coins.
    mapCtx.fillStyle = '#ffc44d';
    for (const coin of game.collectibles.coins) {
      if (coin.taken) continue;
      const [x, z] = toMap(coin.x, coin.z);
      mapCtx.fillRect(x - 1.5, z - 1.5, 3, 3);
    }
    // Mission beacon.
    const marker = game.missions.markerPos();
    if (marker) {
      const [x, z] = toMap(marker.x, marker.z);
      mapCtx.fillStyle = '#ff5a5a';
      mapCtx.beginPath();
      mapCtx.arc(x, z, 5, 0, Math.PI * 2);
      mapCtx.fill();
      mapCtx.strokeStyle = '#ffffff';
      mapCtx.lineWidth = 1.5;
      mapCtx.stroke();
    }
    // Traffic (white) and police (blue).
    mapCtx.fillStyle = '#e8e8e8';
    for (const t of game.traffic.cars) {
      const [x, z] = toMap(t.group.position.x, t.group.position.z);
      mapCtx.fillRect(x - 1, z - 1, 2, 2);
    }
    mapCtx.fillStyle = '#3a7bff';
    for (const c of game.police.state.cars) {
      const [x, z] = toMap(c.group.position.x, c.group.position.z);
      mapCtx.beginPath();
      mapCtx.arc(x, z, 3, 0, Math.PI * 2);
      mapCtx.fill();
    }
    // Player arrow.
    const [px, pz] = toMap(game.player.pos.x, game.player.pos.z);
    mapCtx.save();
    mapCtx.translate(px, pz);
    mapCtx.rotate(Math.atan2(Math.sin(game.player.heading), Math.cos(game.player.heading)) + Math.PI);
    mapCtx.fillStyle = '#ffffff';
    mapCtx.beginPath();
    mapCtx.moveTo(0, -6);
    mapCtx.lineTo(4.5, 5);
    mapCtx.lineTo(-4.5, 5);
    mapCtx.closePath();
    mapCtx.fill();
    mapCtx.restore();
  }

  return {
    setObjective(text) {
      objectiveEl.textContent = text;
    },
    toast(text) {
      toastEl.textContent = text;
      toastEl.classList.remove('hidden');
      toastTimer = 3;
    },
    showMission(title, briefing) {
      missionEl.innerHTML = `<b>${title}</b><span>${briefing}</span>`;
      missionEl.classList.remove('hidden');
      missionTimer = 4.5;
    },
    setRadio(text) {
      radioEl.textContent = `♪ ${text}`;
    },
    update(dt, game) {
      const wanted = game.police.state.wanted;
      starsEl.textContent = '★'.repeat(wanted) + '☆'.repeat(5 - wanted);
      starsEl.classList.toggle('hot', wanted > 0);
      cashEl.textContent = `$${game.cash.toLocaleString('en-US')}`;
      const kmh = Math.round(Math.abs(game.player.speed) * 3.6);
      speedEl.textContent = game.player.car ? `${kmh} km/h` : '';
      if (healthEl) healthEl.style.width = `${Math.max(0, game.health)}%`;
      if (toastTimer > 0) {
        toastTimer -= dt;
        if (toastTimer <= 0) toastEl.classList.add('hidden');
      }
      if (missionTimer > 0) {
        missionTimer -= dt;
        if (missionTimer <= 0) missionEl.classList.add('hidden');
      }
      drawMinimap(game);
    },
  };
}
