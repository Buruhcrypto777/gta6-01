// Solmar Bay — the HUD: cash and wanted stars, the mission objective with
// distance and timer, a live 2D minimap with markers, speed, health, radio
// and street name, toasts, and the start / pause / busted / wasted menus.
// All DOM, so it stays crisp in screenshots.
import { CFG } from './config.js';
import { streetNameAt, districtAt } from './city.js';

export function createHud(G) {
  const $ = (id) => document.getElementById(id);
  const els = {
    cash: $('cash'), stars: $('stars'), objective: $('objective'), distance: $('distance'),
    timer: $('timer'), speed: $('speed'), speedUnit: $('speed-unit'), hint: $('hint'),
    toast: $('toast'), health: $('health'), healthFill: $('health-fill'), radio: $('radio'),
    street: $('street'), minimap: $('minimap'),
    start: $('menu-start'), pause: $('menu-pause'), busted: $('menu-busted'), wasted: $('menu-wasted'),
  };
  const mm = els.minimap.getContext('2d');
  const MM = 220, SCALE = MM / (CFG.worldHalf * 2);
  const toMm = (v) => (v + CFG.worldHalf) * SCALE;
  let toastTimer = null;
  let lastMini = 0;

  function drawMinimap() {
    const w = G.world;
    mm.fillStyle = '#20242a'; mm.fillRect(0, 0, MM, MM);
    // Water and sand.
    mm.fillStyle = '#1d7f9e'; mm.fillRect(0, 0, toMm(CFG.oceanEdge), MM);
    mm.fillRect(0, toMm(CFG.marinaEdge), MM, MM - toMm(CFG.marinaEdge));
    mm.fillStyle = '#e8cf9a'; mm.fillRect(toMm(CFG.oceanEdge), 0, toMm(CFG.beachEdge) - toMm(CFG.oceanEdge), MM);
    // Parks.
    mm.fillStyle = '#6fae5e';
    for (const p of w.parks) mm.fillRect(toMm(p.x - p.w / 2), toMm(p.z - p.d / 2), p.w * SCALE, p.d * SCALE);
    // Roads.
    mm.strokeStyle = '#4a5058'; mm.lineWidth = 2.4;
    for (const l of [-1120, -960, -800, -640, -480, -320, -160, 0, 160, 320, 480, 640, 800, 960, 1120]) {
      mm.beginPath(); mm.moveTo(toMm(l), 0); mm.lineTo(toMm(l), MM); mm.stroke();
      mm.beginPath(); mm.moveTo(0, toMm(l)); mm.lineTo(MM, toMm(l)); mm.stroke();
    }
    // Coins.
    mm.fillStyle = '#ffc93c';
    for (const c of G.collectibles.coins) if (!c.taken) { mm.beginPath(); mm.arc(toMm(c.x), toMm(c.z), 2, 0, 7); mm.fill(); }
    // Mission target.
    const target = (G.missions.current && G.missions.st && G.missions.st.target) || (G.missions.taxi && G.missions.taxi.target);
    if (target) {
      mm.save(); mm.translate(toMm(target.x), toMm(target.z)); mm.rotate(Math.PI / 4);
      mm.fillStyle = '#ffc93c'; mm.fillRect(-4, -4, 8, 8); mm.restore();
    }
    // Police.
    mm.fillStyle = '#ff3b30';
    for (const c of G.police.state.cars) { mm.beginPath(); mm.arc(toMm(c.x), toMm(c.z), 3, 0, 7); mm.fill(); }
    if (G.police.state.heli) { mm.beginPath(); mm.arc(toMm(G.police.state.heli.x), toMm(G.police.state.heli.z), 4, 0, 7); mm.fill(); }
    // Player arrow.
    mm.save();
    mm.translate(toMm(G.player.pos.x), toMm(G.player.pos.z));
    mm.rotate(-G.player.heading);
    mm.fillStyle = '#ffffff'; mm.strokeStyle = '#111111'; mm.lineWidth = 1;
    mm.beginPath(); mm.moveTo(0, -7); mm.lineTo(5, 6); mm.lineTo(-5, 6); mm.closePath(); mm.fill(); mm.stroke();
    mm.restore();
  }

  return {
    setCash(n) { els.cash.textContent = `$${Math.floor(n).toLocaleString('en-US')}`; },
    setWanted(n) {
      let s = '';
      for (let i = 0; i < 5; i++) s += `<span class="${i < n ? 'on' : ''}">★</span>`;
      els.stars.innerHTML = s;
    },
    setObjective(t) { els.objective.textContent = t; },
    setDistance(label, m) { els.distance.textContent = label ? `${label} — ${m} m` : ''; },
    setTimer(sec) {
      if (sec === null || sec === undefined) { els.timer.textContent = ''; return; }
      els.timer.textContent = `⏱ ${sec}s`;
    },
    setSpeed(kmh) {
      els.speed.textContent = Math.round(kmh);
      els.speedUnit.style.display = G.player.car ? 'inline' : 'none';
      els.speed.style.display = G.player.car ? 'inline' : 'none';
    },
    setHealth(h) {
      els.health.style.display = G.player.car ? 'none' : 'block';
      els.healthFill.style.width = `${Math.max(0, h)}%`;
    },
    setHint(t) { els.hint.textContent = t; },
    setRadio(name) { els.radio.textContent = `♪ ${name}`; },
    toast(text) {
      els.toast.textContent = text;
      els.toast.classList.add('show');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => els.toast.classList.remove('show'), 3200);
    },
    showStart() { els.start.style.display = 'flex'; },
    hideStart() { els.start.style.display = 'none'; },
    showPause() { els.pause.style.display = 'flex'; },
    hidePause() { els.pause.style.display = 'none'; },
    showBusted() { els.busted.style.display = 'flex'; },
    hideBusted() { els.busted.style.display = 'none'; },
    showWasted() { els.wasted.style.display = 'flex'; },
    hideWasted() { els.wasted.style.display = 'none'; },
    update(dt, time) {
      els.street.textContent = `${districtAt(G.player.pos.x, G.player.pos.z).name} · ${streetNameAt(G.player.pos.x, G.player.pos.z)}`;
      // Health bar only on foot; it must not linger over the speedo in a car.
      this.setHealth(G.player.health);
      if (time - lastMini > 0.12) { lastMini = time; drawMinimap(); }
      // Context hint for stealing a car.
      if (G.player.onFoot) {
        const near = G.traffic.nearest(G.player.pos.x, G.player.pos.z, 5) || G.parked.nearest(G.player.pos.x, G.player.pos.z, 5);
        if (near) this.setHint('E — Steal car');
        else if (G.missions.current) this.setHint('F — Punch · M — Mission · Esc — Pause');
        else this.setHint('WASD — Move · E — Steal car · F — Punch · M — Mission');
      } else {
        this.setHint('E — Exit car · Space — Handbrake · M — Radio · Esc — Pause');
      }
    },
  };
}
