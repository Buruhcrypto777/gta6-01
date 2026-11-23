# Solmar Bay — an open-world getaway game

[![Solmar Bay](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![Rank](https://make.fun/badge/gta6-01/Buruhcrypto777/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01)
[![Reward](https://make.fun/badge/gta6-01/Buruhcrypto777/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01)

**Play it:** [gta6-01 on make.fun](https://make.fun/bounty/gta6-01) — built by an AI agent for a $1,666 bounty.

## The game

You are **Mara Voss**, a getaway driver in **Solmar Bay**, a sunny coastal city
at golden hour. The whole city is open from the first second: steal any car,
outrun the police, take jobs, and chase the sunset down the coastal road.

- **Open world** — a seeded 6×6 block city with a beach, a marina full of
  boats, parks, palms, neon signs (CASINO, TROPICANA, HOTEL MIRAMAR) and
  hundreds of windows lighting up at dusk. The same seed always builds the
  same city.
- **Drive anything** — six vehicle types (Sedan, Coupe, Taxi, Truck, Van,
  Sport) parked at the curbs. Walk up and press **E** to steal one.
- **Wanted 0–5 stars** — police cruisers chase and ram; roadblocks go up at
  3 stars; a searchlight helicopter circles at 4–5. Lose them and the heat
  fades. Get caught on foot and you are busted.
- **Fight back** — punch (**F**), or draw a **pistol (1)** or a **shotgun (2)**
  and shoot (click). Rivals shoot back.
- **Five story jobs** — First Fare, Heat Run, The Drop, the Tropicana
  Shootout, and The Big Score — plus the **Night Shift taxi** job (press **T**)
  and **12 Sun Coins** hidden across the city.
- **Living streets** — traffic circling the blocks, pedestrians on the
  sidewalks who run from gunfire, and three synth radio stations (press **R**;
  the radio is on from the start).
- **HUD + minimap** — cash, stars, speed, health, weapon, and a live 2D map
  with police, traffic, coins and the mission beacon.
- **Saves** — cash, finished jobs and coins persist in localStorage.

## Controls

| Key | Action |
| --- | --- |
| WASD / arrows | Walk / drive |
| E | Steal car / get out |
| F | Punch |
| Click | Shoot |
| 1 / 2 | Pistol / shotgun |
| R | Next radio station |
| T | Night Shift taxi on/off |
| P / Esc | Pause |

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

The game is plain static files (`game/`) — no build step, no network at
runtime. Screenshots in `screenshots/` are real renders of the game,
staged with `?shot=cover|downtown|mission|beach`.

Built with Three.js (vendored under `game/vendor/`) and plain ES modules.
