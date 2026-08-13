import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '../public/icons');
mkdirSync(outDir, { recursive: true });

const force = process.argv.includes('--force');

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : c >>> 1;
    }
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcBuf), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function createPng(size) {
  const primary = { r: 0, g: 88, b: 190 };
  const white = { r: 255, g: 255, b: 255 };

  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 4);
    row[0] = 0;
    for (let x = 0; x < size; x++) {
      const cx = (x + 0.5) / size - 0.5;
      const cy = (y + 0.5) / size - 0.5;
      const inCircle = cx * cx + cy * cy <= 0.45 * 0.45;

      const nx = x / size;
      const ny = y / size;
      const inTBar = nx > 0.28 && nx < 0.72 && ny > 0.28 && ny < 0.4;
      const inTStem = nx > 0.42 && nx < 0.58 && ny > 0.28 && ny < 0.72;
      const inT = inTBar || inTStem;

      const color = inCircle ? (inT ? white : primary) : { r: 0, g: 0, b: 0 };
      const a = inCircle ? 255 : 0;
      const i = 1 + x * 4;
      row[i] = color.r;
      row[i + 1] = color.g;
      row[i + 2] = color.b;
      row[i + 3] = a;
    }
    rows.push(row);
  }

  const raw = Buffer.concat(rows);
  const compressed = deflateSync(raw);

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

for (const size of [16, 32, 48, 128]) {
  const file = join(outDir, `icon${size}.png`);
  if (!force && existsSync(file)) {
    console.log('keep', file);
    continue;
  }
  writeFileSync(file, createPng(size));
  console.log('wrote', file);
}
