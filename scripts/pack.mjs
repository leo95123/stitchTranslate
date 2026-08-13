import { mkdirSync, existsSync, rmSync, readFileSync, createWriteStream } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const dist = join(root, 'dist');
const releaseDir = join(root, 'release');

if (!existsSync(join(dist, 'manifest.json'))) {
  console.error('dist/manifest.json not found. Run npm run build first.');
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(join(dist, 'manifest.json'), 'utf8'));
const version = manifest.version || '0.0.0';
const outZip = join(releaseDir, `stitch-translate-${version}.zip`);

mkdirSync(releaseDir, { recursive: true });
if (existsSync(outZip)) rmSync(outZip);

const isWin = process.platform === 'win32';
if (isWin) {
  // Compress dist\* so manifest.json is at zip root
  execSync(
    `powershell -NoProfile -Command "Compress-Archive -Path '${dist.replace(/'/g, "''")}\\*' -DestinationPath '${outZip.replace(/'/g, "''")}' -Force"`,
    { stdio: 'inherit' },
  );
} else {
  execSync(`cd "${dist}" && zip -r "${outZip}" .`, { stdio: 'inherit' });
}

console.log('packed', outZip);
