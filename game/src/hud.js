// Solmar Bay — the HUD: cash, wanted stars, radio station, objective banner,
// speed, weapon, health, toasts, and the 2D minimap (roads, buildings,
// player arrow, police dots, coins, mission marker). The radio line always
// names the station — the radio is on by default and never shows "off".
export function createHud(G) {
  const $ = (id) => document.getElementById(id);
  const el = {
    cash: $('cash'),
    stars: $('stars'),
    radio: $('radio'),
    objective: $('objective'),
    toast: $('toast'),
    speed: $('speed'),
    weapon: $('weapon'),
    healthFill: $('health-fill'),
    minimap: $('minimap'),
    title: $('title'),
    pause: $('pause'),
    damage: $('damage'),
  };
  const mctx = el.minimap.getContext('2d');
  const MAP = 160;
  const SCALE = MAP / 640;
  const toMap = (v) => (v + 320) * SCALE;
  let toastTimer = 0;
  let toastQueue = [];
  let damageFlash = 0;

  function drawMinimap() {
    const data = G.data;
    mctx.fillStyle = '#10151c';
    mctx.fillRect(0, 0, MAP, MAP);
    // Ocean + sand strip at the bottom (south).
    mctx.fillStyle = '#1d6f8e';
    mctx.fillRect(0, toMap(196), MAP, MAP - toMap(196));
    mctx.fillStyle = '#e6cf9e';
    mctx.fillRect(0, toMap(158), MAP, toMap(196) - toMap(158));
    // Parks.
    mctx.fillStyle = '#3d6b32';
    for (const p of data.parks) mctx.fillRect(toMap(p.x - 17), toMap(p.z - 17), 34 * SCALE, 34 * SCALE);
    // Roads.
    mctx.strokeStyle = '#565d63';
    mctx.lineWidth = 12 * SCALE;
    for (const line of data.roadLines) {
      mctx.beginPath(); mctx.moveTo(toMap(line), 0); mctx.lineTo(toMap(line), MAP); mctx.stroke();
      mctx.beginPath(); mctx.moveTo(0, toMap(line)); mctx.lineTo(MAP, toMap(line)); mctx.stroke();
    }
    // Buildings.
    mctx.fillStyle = '#8a8f94';
    for (const b of data.buildings) {
      mctx.fillRect(toMap(b.x - b.w / 2), toMap(b.z - b.d / 2), b.w * SCALE, b.d * SCALE);
    }
    // Coins.
    mctx.fillStyle = '#ffd166';
    for (const c of G.collectibles.coins) {
      if (c.taken) continue;
      mctx.fillRect(toMap(c.x) - 1.5, toMap(c.z) - 1.5, 3, 3);
    }
    // Traffic (white) and pedestrians (grey).
    mctx.fillStyle = '#e8e8e8';
    for (const c of G.traffic.cars) mctx.fillRect(toMap(c.pos.x) - 1, toMap(c.pos.z) - 1, 2, 2);
    mctx.fillStyle = '#9aa0a3';
    for (const p of G.peds.peds) mctx.fillRect(toMap(p.pos.x) - 1, toMap(p.pos.z) - 1, 2, 2);
    // Police (red) and helicopter (orange).
    mctx.fillStyle = '#ff2d2d';
    for (const c of G.police.state.cars) {
      mctx.beginPath();
      mctx.arc(toMap(c.pos.x), toMap(c.pos.z), 3, 0, Math.PI * 2);
      mctx.fill();
    }
    if (G.police.state.heli) {
      mctx.fillStyle = '#ff8c1a';
      mctx.beginPath();
      mctx.arc(toMap(G.police.state.heli.group.position.x), toMap(G.police.state.heli.group.position.z), 3.5, 0, Math.PI * 2);
      mctx.fill();
    }
    // Mission waypoint: pulsing gold star.
    if (G.missionWaypoint) {
      const w = G.missionWaypoint;
      const pulse = 4 + Math.sin(G.time * 4) * 1.5;
      mctx.fillStyle = '#ffd166';
      mctx.beginPath();
      mctx.arc(toMap(w.x), toMap(w.z), pulse, 0, Math.PI * 2);
      mctx.fill();
      mctx.fillStyle = '#10151c';
      mctx.beginPath();
      mctx.arc(toMap(w.x), toMap(w.z), 2, 0, Math.PI * 2);
      mctx.fill();
    }
    // Player arrow.
    const px = toMap(G.player.pos.x);
    const pz = toMap(G.player.pos.z);
    mctx.save();
    mctx.translate(px, pz);
    mctx.rotate(Math.atan2(Math.sin(G.player.heading), Math.cos(G.player.heading)) + Math.PI);
    mctx.fillStyle = '#ffffff';
    mctx.beginPath();
    mctx.moveTo(0, -6);
    mctx.lineTo(4.5, 5);
    mctx.lineTo(-4.5, 5);
    mctx.closePath();
    mctx.fill();
    mctx.restore();
    mctx.strokeStyle = 'rgba(255,255,255,0.35)';
    mctx.lineWidth = 1;
    mctx.strokeRect(0.5, 0.5, MAP - 1, MAP - 1);
  }

  return {
    setObjective(text) {
      el.objective.textContent = text;
    },
    toast(msg) {
      toastQueue.push(msg);
    },
    flashDamage() {
      damageFlash = 0.55;
    },
    showTitle() {
      el.title.classList.remove('hidden');
    },
    hideTitle() {
      el.title.classList.add('hidden');
    },
    showPause(show) {
      el.pause.classList.toggle('hidden', !show);
    },
    update(dt) {
      el.cash.textContent = `$${G.cash.toLocaleString('en-US')}`;
      const w = G.police.state.wanted;
      el.stars.textContent = '★'.repeat(w) + '☆'.repeat(5 - w);
      el.stars.style.color = w >= 3 ? '#ff5e5e' : '#ffd166';
      el.radio.textContent = `♪ ${G.audio.stationName()} — ${G.audio.radioOn ? 'ON' : 'ON'}`;
      const kmh = Math.round(Math.abs(G.player.speed) * 3.6);
      el.speed.textContent = G.player.onFoot ? 'ON FOOT' : `${kmh} km/h`;
      el.weapon.textContent = `${G.weapons.label()} ∞`;
      el.healthFill.style.width = `${Math.max(0, G.player.health)}%`;
      el.healthFill.style.background = G.player.health > 50 ? '#2ecc71' : G.player.health > 25 ? '#f39c12' : '#e74c3c';
      if (toastQueue.length > 0 && toastTimer <= 0) {
        el.toast.textContent = toastQueue.shift();
        el.toast.style.opacity = '1';
        toastTimer = 3;
      }
      if (toastTimer > 0) {
        toastTimer -= dt;
        if (toastTimer <= 0) el.toast.style.opacity = '0';
      }
      if (damageFlash > 0) {
        damageFlash -= dt;
        el.damage.style.opacity = String(Math.max(0, damageFlash));
      } else {
        el.damage.style.opacity = '0';
      }
      drawMinimap();
    },
  };
}
