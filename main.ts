// Solmar Bay — the program that hands the game in (Node 22, standard
// library only). It copies the playable game and its screenshots beside this
// file into the output directory and writes the dossier the judge reads,
// using the kit's vendored library. Run it anywhere to build a hand-in:
//
//   MAKEFUN_OUTPUT_DIR=out node main.ts
//
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output; inside the
// grader it is /output already.
import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function copyIfPresent(name) {
  const from = join(repoRoot, name);
  if (!existsSync(from)) return 0;
  cpSync(from, join(outputDir, name), { recursive: true });
  return readdirSync(from, { recursive: true }).length;
}

mkdirSync(outputDir, { recursive: true });
const gameEntries = copyIfPresent('game');
const shotEntries = copyIfPresent('screenshots');
if (shotEntries === 0) {
  console.warn('Warning: no screenshots/ found — the entry needs 3 or 4 real renders to be judged.');
}

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes
// the bytes; the other caps refuse an entry the scorer would refuse, so the
// same limits are passed here and fail fast instead of at grading time.
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);

const gameBytes = statSync(join(outputDir, 'game', 'index.html')).size;
console.log(`Solmar Bay handed in: ${gameEntries} game entries, ${shotEntries} screenshots, index.html ${gameBytes} bytes, dossier ${dossier.length} bytes.`);
