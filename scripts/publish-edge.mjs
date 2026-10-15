/**
 * Publish / update an existing Edge Add-on via Partner Center Publish API (v1.1).
 *
 * Credentials must come from the environment (or a local gitignored .env):
 *   EDGE_CLIENT_ID
 *   EDGE_API_KEY
 *   EDGE_PRODUCT_ID
 *
 * Optional:
 *   EDGE_ZIP          path to zip (default: newest release/stitch-translate-*.zip)
 *   EDGE_NOTES        certification notes
 *   EDGE_SKIP_SUBMIT  if "1", upload package only (do not submit for review)
 *
 * Docs: https://learn.microsoft.com/en-us/microsoft-edge/extensions/update/api/using-addons-api
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const API_ROOT = 'https://api.addons.microsoftedge.microsoft.com';

function loadDotEnv() {
  const envPath = join(root, '.env');
  if (!existsSync(envPath)) return;
  const text = readFileSync(envPath, 'utf8');
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(
      `Missing ${name}. Set it in the environment or a local .env (gitignored). See .env.example.`,
    );
    process.exit(1);
  }
  return value;
}

function findDefaultZip() {
  const releaseDir = join(root, 'release');
  if (!existsSync(releaseDir)) return null;
  const zips = readdirSync(releaseDir)
    .filter((f) => /^stitch-translate-.*\.zip$/i.test(f))
    .map((f) => join(releaseDir, f))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
  return zips[0] ?? null;
}

function authHeaders(clientId, apiKey, extra = {}) {
  return {
    Authorization: `ApiKey ${apiKey}`,
    'X-ClientID': clientId,
    ...extra,
  };
}

function operationIdFromLocation(location) {
  if (!location) return null;
  const trimmed = location.trim();
  const parts = trimmed.split('/').filter(Boolean);
  return parts[parts.length - 1] || trimmed;
}

async function sleep(ms) {
  await new Promise((r) => setTimeout(r, ms));
}

async function pollOperation({
  url,
  clientId,
  apiKey,
  label,
  retries = 36,
  intervalMs = 5000,
}) {
  let last = null;
  for (let i = 1; i <= retries; i++) {
    const res = await fetch(url, {
      method: 'GET',
      headers: authHeaders(clientId, apiKey),
    });
    const text = await res.text();
    let body = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = { raw: text };
    }
    last = { status: res.status, body };
    const opStatus = body?.status ?? body?.Status ?? null;
    console.log(`[${label}] attempt ${i}/${retries} http=${res.status} status=${opStatus ?? '(none)'}`);

    if (res.status === 200 && opStatus && /^(Succeeded|Success|Completed)$/i.test(opStatus)) {
      return body;
    }
    if (opStatus && /^(Failed|Error)$/i.test(opStatus)) {
      console.error(`[${label}] failed:`, JSON.stringify(body, null, 2));
      process.exit(1);
    }
    // 202 / InProgress — keep waiting
    await sleep(intervalMs);
  }
  console.error(`[${label}] timed out. Last response:`, JSON.stringify(last, null, 2));
  process.exit(1);
}

loadDotEnv();

const clientId = requireEnv('EDGE_CLIENT_ID');
const apiKey = requireEnv('EDGE_API_KEY');
const productId = requireEnv('EDGE_PRODUCT_ID');
const zipPath = process.env.EDGE_ZIP?.trim() || findDefaultZip();
const notes =
  process.env.EDGE_NOTES?.trim() ||
  'Automated package update via Edge Publish API.';
const skipSubmit = process.env.EDGE_SKIP_SUBMIT === '1';

if (!zipPath || !existsSync(zipPath)) {
  console.error('Zip not found. Run npm run release first, or set EDGE_ZIP.');
  process.exit(1);
}

const zipBytes = readFileSync(zipPath);
console.log(`Uploading ${basename(zipPath)} (${zipBytes.length} bytes) to product ${productId}...`);

const uploadRes = await fetch(
  `${API_ROOT}/v1/products/${productId}/submissions/draft/package`,
  {
    method: 'POST',
    headers: authHeaders(clientId, apiKey, {
      'Content-Type': 'application/zip',
      'Content-Length': String(zipBytes.length),
    }),
    body: zipBytes,
  },
);

if (uploadRes.status !== 202) {
  const errText = await uploadRes.text();
  console.error(`Upload failed: HTTP ${uploadRes.status}`, errText);
  process.exit(1);
}

const uploadOpId = operationIdFromLocation(uploadRes.headers.get('location'));
if (!uploadOpId) {
  console.error('Upload accepted but Location / operation ID missing.');
  process.exit(1);
}
console.log('Upload operation:', uploadOpId);

await pollOperation({
  url: `${API_ROOT}/v1/products/${productId}/submissions/draft/package/operations/${uploadOpId}`,
  clientId,
  apiKey,
  label: 'upload',
});

if (skipSubmit) {
  console.log('EDGE_SKIP_SUBMIT=1 — package uploaded to draft only.');
  process.exit(0);
}

console.log('Submitting draft for review...');
const publishRes = await fetch(`${API_ROOT}/v1/products/${productId}/submissions`, {
  method: 'POST',
  headers: authHeaders(clientId, apiKey, {
    'Content-Type': 'application/json',
  }),
  body: JSON.stringify({ notes }),
});

if (publishRes.status !== 202) {
  const errText = await publishRes.text();
  console.error(`Submit failed: HTTP ${publishRes.status}`, errText);
  process.exit(1);
}

const publishOpId = operationIdFromLocation(publishRes.headers.get('location'));
if (!publishOpId) {
  console.error('Submit accepted but Location / operation ID missing.');
  process.exit(1);
}
console.log('Publish operation:', publishOpId);

await pollOperation({
  url: `${API_ROOT}/v1/products/${productId}/submissions/operations/${publishOpId}`,
  clientId,
  apiKey,
  label: 'publish',
});

console.log('Done. Submission sent to Edge Add-ons certification.');
