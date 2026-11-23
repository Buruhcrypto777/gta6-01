// Solmar Bay — the entrypoint program (Node 22, standard library only).
// It hands the static game and its screenshots to the grader: game/ and
// screenshots/ are copied beside this file into /output, and dossier.json
// (the summary the judge reads) is written with the vendored make.fun
// library. Serve it locally with `node serve.ts`, then open
// http://localhost:8080. Outside the grader's container,
// MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
import { cpSync, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const rootDir = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function copyTree(from, to) {
  if (existsSync(from)) cpSync(from, to, { recursive: true });
}

mkdirSync(outputDir, { recursive: true });
copyTree(join(rootDir, 'game'), join(outputDir, 'game'));
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
copyTree(join(rootDir, 'screenshots'), join(outputDir, 'screenshots'));

// Sanity log for the builder: the game the grader will open.
const indexSize = (() => {
  try {
    return statSync(join(outputDir, 'game', 'index.html')).size;
  } catch {
    return -1;
  }
})();
console.log(`Solmar Bay handed in: game/index.html is ${indexSize} bytes (cap 1 MiB).`);

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes
// the bytes; the others refuse an entry the scorer would refuse (more than
// 4 screenshots or one over 256 KiB; more than 993 files in game/ or 48 MiB
// of game files, in all, or a path under game/ over 1000 bytes).
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);
