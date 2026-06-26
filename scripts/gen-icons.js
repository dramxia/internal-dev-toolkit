#!/usr/bin/env node
/* 内部开发工具箱 — 生成占位 PNG 图标（零依赖，使用 zlib 编码）。
 * 生成 16/48/128 三种尺寸的纯色圆角图标，便于脚手架开箱即用。
 * 真正上线前请替换为设计稿。 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const SIZES = [16, 48, 128];
const BG = [15, 52, 96];   // #0f3460
const FG = [122, 162, 247]; // #7aa2f7

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function makePng(size) {
  const r = Math.floor(size * 0.18); // 圆角半径
  const inner = Math.floor(size * 0.5);
  const innerStart = Math.floor((size - inner) / 2);

  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = [0]; // 滤镜字节
    for (let x = 0; x < size; x++) {
      const inCorner =
        (x < r && y < r && (r - x) ** 2 + (r - y) ** 2 > r * r) ||
        (x >= size - r && y < r && (x - (size - r - 1)) ** 2 + (r - y) ** 2 > r * r) ||
        (x < r && y >= size - r && (r - x) ** 2 + (y - (size - r - 1)) ** 2 > r * r) ||
        (x >= size - r && y >= size - r && (x - (size - r - 1)) ** 2 + (y - (size - r - 1)) ** 2 > r * r);
      let [cr, cg, cb] = BG;
      const inInner =
        x >= innerStart && x < innerStart + inner && y >= innerStart && y < innerStart + inner;
      if (inInner) [cr, cg, cb] = FG;
      if (inCorner) [cr, cg, cb] = [0, 0, 0]; // 透明（alpha=0 由 IHDR bit depth=8 color type=6 处理）
      row.push(cr, cg, cb, inCorner ? 0 : 255);
    }
    rows.push(Buffer.from(row));
  }
  const raw = Buffer.concat(rows);

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const idat = zlib.deflateSync(raw);

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const outDir = path.resolve(__dirname, '..', 'icons');
fs.mkdirSync(outDir, { recursive: true });
for (const s of SIZES) {
  fs.writeFileSync(path.join(outDir, `icon${s}.png`), makePng(s));
  console.log(`✅ icons/icon${s}.png`);
}
