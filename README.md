# Solmar Bay — an open-world getaway

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/Buruhcrypto777/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/Buruhcrypto777/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

Built for the [make.fun gta6-01 bounty](https://make.fun/bounty/gta6-01). Referral code: 1dmvtzwc.

Mara Voss, getaway driver, owes the Solmar syndicate one last job. Five missions
stand between her and a clean slate — in a coastal city that never stops watching.

## The game

- **A city to explore on foot and by car**: a seeded grid city with downtown towers,
  a beach road, sand, sea and a lighthouse — all of it deterministic from `?seed=N`.
- **Traffic and pedestrians**: cars follow the road grid, slow for the car ahead and
  overtake when stuck; people walk the sidewalks and run when the city gets loud.
- **Cars to steal and drive**: press E near any car to borrow it (the law notices),
  E again to step out. W/S accelerate and brake, A/D steer, Space is the handbrake.
- **A wanted level and police who respond**: 0–5 stars. Cruisers chase from behind
  and ram; foot cops close in when you're on foot. Get caught and you're busted.
- **Missions and a story**: First Wheels, The Drop, Hot Pursuit, The Getaway and the
  Solmar Run — each with a waypoint beacon, a live objective and a payout. Finish
  the story for a bonus and free roam.
- **Combat**: F throws a punch. Pedestrians run; cops remember.
- **HUD with a minimap**: cash, wanted stars, objective and distance, speed, context
  prompts, toasts — and a live 2D minimap with roads, sea, police dots and the waypoint.
- **Start screen and a save**: title, pause and busted screens; cash and mission
  progress persist in localStorage.
- **Sound, synthesized**: an engine hum, a two-tone siren, crashes, a mission jingle
  and a punch — all Web Audio, no audio files.

## Controls

| Key | Action |
| --- | --- |
| WASD / arrows | Move on foot, drive in a car |
| E | Steal / exit a car |
| F | Punch |
| Space | Handbrake |
| Shift | Run |
| Mouse drag / wheel | Look around / zoom |
| Esc | Pause |
| Enter | Start / continue |

## Run it

Serve `game/` with any static server (for example `node serve.ts`, then open
http://localhost:8080) and play in desktop Chrome. No network requests: every
script and the vendored three.js build are files under `game/`.

Hand it in with `mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts`, which
copies `game/` and `screenshots/` to the output directory and writes `dossier.json`.

## Screenshots

Four real renders of the game itself, staged by `?shot=` with an autopilot that
plays the real rules forward: the cover chase, downtown, a mission completing,
and the beach road. See `shots.json` for the scene each one stages.

## License

MIT — see LICENSE.
