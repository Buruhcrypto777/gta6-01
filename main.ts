// Solmar Bay, handed in: a Node 22 program, standard library only, that copies this
// repository's game/ and screenshots/ to /output and writes /output/dossier.json with the
// vendored make.fun library. The game itself is plain static files a desktop browser loads
// offline — game/index.html and its ES modules on top of the vendored three.js — so there
// is nothing to build and nothing to install.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The dossier's text is capped at 160 KiB and the whole of /output at 1,000 entries and
// 64 MiB: game/ may hold at most 993 files and directories and 48 MiB, screenshots/ at
// most 4 images of 256 KiB each, and no path under game/ may run over 1,000 bytes. The
// caps are passed through so this program refuses exactly where the scorer would.
const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function handIn() {
  mkdirSync(out, { recursive: true });
  cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
  mkdirSync(join(out, 'screenshots'), { recursive: true });
  if (existsSync(join(here, 'screenshots'))) {
    cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
  }
  const dossier = buildDossier(out, CAPS);
  writeFileSync(join(out, 'dossier.json'), dossier);
  const gameEntries = readdirSync(join(out, 'game'), { recursive: true }).length;
  const shots = readdirSync(join(out, 'screenshots')).length;
  console.log(`Solmar Bay handed in: ${gameEntries} game entries, ${shots} screenshots, dossier ${dossier.length} bytes.`);
}

handIn();
