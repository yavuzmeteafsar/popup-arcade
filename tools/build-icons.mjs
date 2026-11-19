import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ICONS, wordmark, forEachRun } from '../core/pixels.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePNG(w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr.set([8, 6, 0, 0, 0], 8);
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function canvas(w, h) {
  const data = Buffer.alloc(w * h * 4);
  const set = (x, y, [r, g, b, a]) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    data.set([r, g, b, a], (y * w + x) * 4);
  };
  return { w, h, data, set };
}

function paintGrid(img, grid, ox, oy, scale, color) {
  forEachRun(grid, (gx, gy, len) => {
    for (let y = 0; y < scale; y++) {
      for (let x = 0; x < len * scale; x++) img.set(ox + gx * scale + x, oy + gy * scale + y, color);
    }
  });
}

const BLACK = [17, 17, 17, 255];
const WHITE = [255, 255, 255, 255];
const ICON_ART = {
  16: { grid: ICONS.joystick, scale: 1 },
  32: { grid: ICONS.joystick, scale: 2 },
  48: { grid: ICONS.joystick, scale: 3 },
  128: { grid: ICONS.cabinet, scale: 4 },
};

function icon(size) {
  const img = canvas(size, size);
  const r = size * 0.22;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const cx = Math.min(Math.max(x + 0.5, r), size - r);
      const cy = Math.min(Math.max(y + 0.5, r), size - r);
      if (Math.hypot(x + 0.5 - cx, y + 0.5 - cy) <= r) img.set(x, y, BLACK);
    }
  }
  const { grid, scale } = ICON_ART[size];
  const ox = Math.floor((size - grid[0].length * scale) / 2);
  const oy = Math.floor((size - grid.length * scale) / 2);
  paintGrid(img, grid, ox, oy, scale, WHITE);
  return encodePNG(size, size, img.data);
}

function wordmarkPNG(layout, scale, color, padding) {
  const grid = wordmark(layout);
  const w = grid[0].length * scale + padding * 2;
  const h = grid.length * scale + padding * 2;
  const img = canvas(w, h);
  paintGrid(img, grid, padding, padding, scale, color);
  return encodePNG(w, h, img.data);
}

mkdirSync(join(root, 'icons'), { recursive: true });
mkdirSync(join(root, 'assets'), { recursive: true });

for (const size of Object.keys(ICON_ART).map(Number)) {
  writeFileSync(join(root, 'icons', `icon${size}.png`), icon(size));
}

writeFileSync(join(root, 'assets', 'wordmark-stacked-black.png'), wordmarkPNG('stacked', 8, BLACK, 32));
writeFileSync(join(root, 'assets', 'wordmark-stacked-white.png'), wordmarkPNG('stacked', 8, WHITE, 32));
writeFileSync(join(root, 'assets', 'wordmark-row-black.png'), wordmarkPNG('row', 8, BLACK, 32));
writeFileSync(join(root, 'assets', 'wordmark-row-white.png'), wordmarkPNG('row', 8, WHITE, 32));

console.log('icons and wordmarks generated');
