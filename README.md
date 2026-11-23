# Solmar Bay — an open-world getaway

![Solmar Bay](https://make.fun/badge/gta6-01.svg)
[![Rank](https://make.fun/badge/gta6-01/Buruhcrypto777/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01)
[![Reward](https://make.fun/badge/gta6-01/Buruhcrypto777/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01)

An entry for the **gta6-01** bounty on [make.fun](https://make.fun/bounty/gta6-01):
build the most complete open-world crime game you can, in the spirit of GTA 6,
that plays offline in a desktop browser from static files.

## The game

You are **Mara Voss**, getaway driver in **Solmar Bay**, a sun-soaked coastal
city of towers, neon, palms and a marina. The whole city is open from the
first second: walk the boulevards, steal any parked car, outrun the Solmar Bay
Police Department, and work through five story jobs plus the Night Shift taxi
run — or just chase the 12 Sun Coins hidden around town.

- **A living city** — a seeded grid of varied towers, neon signs (CASINO,
  TROPICANA, HOTEL SOLMAR), palms, lamps, a beach, an animated ocean and a
  marina with boats; 26 traffic cars and 40 pedestrians share the streets.
- **On foot and by car** — six vehicle types (sedan, taxi, coupe, van, truck,
  convertible) with arcade handling; steal any parked car with **E**.
- **Wanted 0–5 stars** — cruisers chase from 1 star, roadblocks at 3, the
  searchlight helicopter at 4–5; officers get out on foot when you do.
- **Combat** — punch with **F**, or pick up the pistol (**2**) and shotgun
  (**3**) and fire with the mouse.
- **Missions and a story** — The Pickup, Lose the Heat, The Handoff, Sun Coin
  Run and The Big Score at the Casino, plus the repeatable Night Shift taxi job.
- **HUD and minimap** — wanted stars, cash, speed, health, objective line,
  mission banner and a live top-down minimap with traffic, police, coins and
  the mission beacon.
- **Sound** — WebAudio synth engine hum, sirens, gunfire and three generative
  radio stations (the radio is on from the start; **R** changes station).
- **Save** — progress is kept in localStorage and restored on the next visit.

## Controls

| Key | Action |
| --- | --- |
| WASD / arrows | Walk / drive |
| Shift | Sprint |
| E | Steal / leave a car |
| F | Punch |
| 1 / 2 / 3 | Fists / pistol / shotgun |
| Mouse click | Fire · drag to look around |
| R | Next radio station |
| M | Next job |
| P / Esc | Pause |
| Enter | Start |

## Play it

Serve `game/` with any static server and open `index.html`:

```sh
node serve.ts
# then open http://localhost:8080
```

No network requests: three.js is vendored under `game/vendor/`, everything
else is the game's own code. `?seed=N` fixes the world; `?shot=cover|downtown|
mission|beach&seed=7` stages a screenshot scene (see `shots.json`).

## Layout

- `game/index.html` — page shell and HUD
- `game/src/` — the game, one file per system: `world` (sky, ground, ocean),
  `city` (buildings, neon, props), `vehicles`, `parked`, `traffic`,
  `pedestrians`, `player`, `police`, `combat`, `weapons`, `missions`,
  `collectibles`, `hud`, `audio`, `save`, `render`, `shots`, `main`
- `game/vendor/three.min.js` — three.js r149 (MIT), vendored
- `screenshots/` — four real renders of the game (1280×800)

## License

MIT. The city, characters, story, art and sound are all original — nothing
from Rockstar Games or any other commercial game.
