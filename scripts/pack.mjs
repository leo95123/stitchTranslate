import { mkdirSync, existsSync, rmSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import crx3 from 'crx3';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const dist = join(root, 'dist');
const releaseDir = join(root, 'release');
const keyPath = join(root, 'keys', 'extension.pem');

const target = (process.argv[2] || 'all').toLowerCase();
const validTargets = new Set(['zip', 'crx', 'all']);

if (!validTargets.has(target)) {
  console.error(`Unknown target "${target}". Use zip, crx, or all.`);
  process.exit(1);
}

if (!existsSync(join(dist, 'manifest.json'))) {
  console.error('dist/manifest.json not found. Run npm run build first.');
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(join(dist, 'manifest.json'), 'utf8'));
const version = manifest.version || '0.0.0';
const baseName = `stitch-translate-${version}`;
const outZip = join(releaseDir, `${baseName}.zip`);
const outCrx = join(releaseDir, `${baseName}.crx`);

mkdirSync(releaseDir, { recursive: true });
mkdirSync(join(root, 'keys'), { recursive: true });

function packZip() {
  if (existsSync(outZip)) rmSync(outZip);

  const isWin = process.platform === 'win32';
  if (isWin) {
    execSync(
      `powershell -NoProfile -Command "Compress-Archive -Path '${dist.replace(/'/g, "''")}\\*' -DestinationPath '${outZip.replace(/'/g, "''")}' -Force"`,
      { stdio: 'inherit' },
    );
  } else {
    execSync(`cd "${dist}" && zip -r "${outZip}" .`, { stdio: 'inherit' });
  }

  console.log('packed', outZip);
}

async function packCrx() {
  if (existsSync(outCrx)) rmSync(outCrx);

  await crx3([join(dist, 'manifest.json')], {
    keyPath,
    crxPath: outCrx,
  });

  console.log('packed', outCrx);
  if (!existsSync(keyPath)) {
    console.warn('warning: expected signing key at', keyPath);
  } else {
    console.log('signing key', keyPath);
  }
}

if (target === 'zip' || target === 'all') {
  packZip();
}

if (target === 'crx' || target === 'all') {
  await packCrx();
}
