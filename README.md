# Solmar Bay — Open World Crime Game

[![gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/competition/gta6-01)
[![rank](https://make.fun/badge/gta6-01/Buruhcrypto777/gta6-01/rank.svg)](https://make.fun/competition/gta6-01)
[![reward](https://make.fun/badge/gta6-01/Buruhcrypto777/gta6-01/reward.svg)](https://make.fun/competition/gta6-01)

An original open-world crime game for the [gta6-01 bounty](https://make.fun/competition/gta6-01) on make.fun. Play it free at [https://make.fun/r/1dmvtzwc](https://make.fun/r/1dmvtzwc) — sign up through my referral link to support the project.

## The game

**Solmar Bay** is a sun-soaked modern coastal city, fully original — original city, characters, vehicles, story, art and sounds. You are **Mara Voss**, a getaway driver. Steal cars, outrun the law, settle debts, and pull the getaway that retires her — if the cops and the helicopter don't catch her first.

- **Open world**: 2.4 km city with 7 districts, 4 avenues and 10 named streets, a golden-hour beach and marina, parks, a plaza, neon downtown, traffic, and 26 pedestrians
- **Drive anything**: steal sedans, taxis, sports cars, vans and trucks from the street or parked by cafés — arcade handling with handbrake drifts
- **Wanted 0–5 stars**: police cruisers chase and ram, roadblocks at 3★, a searchlight helicopter at 4–5★, busted or wasted endings
- **7 missions**: 5 story missions (First Wheels, The Drop, Hot Pursuit, Payback, The Getaway) plus a taxi shift side job and 12 collectible Sun Coins hidden around the city
- **Combat**: punch thugs and collectors up close, with knockback, sparks and consequences
- **Feel**: golden-hour sun with real shadows, a shader sky with clouds, an animated ocean, particles (dust, smoke, sparks, muzzle), synthesized WebAudio engine, sirens and three original radio stations
- **HUD**: cash, wanted stars, mission objective with distance and timer, a live 2D minimap with markers, speed, health, street and district names
- **Save**: progress, cash and collected coins persist in localStorage

## Controls

| Key | Action |
| --- | --- |
| WASD | Move / drive |
| E | Steal & exit car |
| F | Punch |
| Space | Handbrake |
| Shift | Sprint |
| M | Start mission |
| T | Taxi job (in a taxi) |
| R | Next radio station |
| Mouse drag / wheel | Orbit & zoom camera |
| Esc | Pause |

## Play it

```sh
node serve.ts        # then open http://localhost:8080
```

Desktop Chrome, keyboard + mouse. Static files only — the game loads fully offline, no network.

## Build

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` (Node 22, standard library only) copies `game/` and `screenshots/` to the output directory and writes `dossier.json` with the vendored make.fun library.

## Source layout

```
game/
  index.html            page shell, HUD, menus
  vendor/three.min.js   three.js (vendored)
  src/
    main.js             bootstrap, game loop, menus, bust/waste
    config.js           tuning, palette, wanted table
    random.js           seeded RNG
    city.js             districts, landmarks, streets, neon, radio
    world.js            roads, buildings, palms, coins, spawn points
    render.js           sky, ocean, ground, buildings, particles
    vehicles.js         car + helicopter meshes
    traffic.js          traffic AI
    pedestrians.js      pedestrians
    police.js           wanted, cruisers, roadblocks, helicopter
    missions.js         5 story missions + taxi job
    combat.js           punch combat, thugs, friend pickup
    collectibles.js     Sun Coins
    player.js           Mara on foot + driving, chase camera
    parked.js           parked cars to steal
    hud.js              HUD, minimap, menus
    audio.js            WebAudio synth: engine, sirens, radio
    save.js             localStorage save/load
    input.js            keyboard + mouse
    shots.js            screenshot staging (?shot=cover|downtown|mission|beach)
main.ts                 entry program: copy game/ + screenshots/, write dossier.json
serve.ts                dev server
```

## License

MIT — see [LICENSE](LICENSE).
