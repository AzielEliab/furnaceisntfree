import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { crc32, deflateSync } from "node:zlib";

/** 5×7 glyphs. Factual wordmark only: no prices, quotes, or testimonials. */
const FONT = {
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  "'": ["00100", "00100", "01000", "00000", "00000", "00000", "00000"],
  ",": ["00000", "00000", "00000", "00000", "00110", "00100", "01000"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  "-": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01111", "10000", "10000", "10000", "10000", "10000", "01111"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01111", "10000", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "10101", "01010"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"]
};

const WIDTH = 1200;
const HEIGHT = 630;

function chunk(type, data) {
  const typeBuf = Buffer.from(type);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])) >>> 0);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePng(rgb) {
  const stride = WIDTH * 3;
  const raw = Buffer.alloc((stride + 1) * HEIGHT);
  for (let y = 0; y < HEIGHT; y += 1) {
    const start = y * (stride + 1);
    raw[start] = 0;
    rgb.copy(raw, start + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(WIDTH, 0);
  ihdr.writeUInt32BE(HEIGHT, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

function fill(rgb, r, g, b) {
  for (let i = 0; i < WIDTH * HEIGHT; i += 1) {
    const o = i * 3;
    rgb[o] = r;
    rgb[o + 1] = g;
    rgb[o + 2] = b;
  }
}

function rect(rgb, x0, y0, w, h, color) {
  const x1 = Math.min(WIDTH, x0 + w);
  const y1 = Math.min(HEIGHT, y0 + h);
  for (let y = Math.max(0, y0); y < y1; y += 1) {
    for (let x = Math.max(0, x0); x < x1; x += 1) {
      const o = (y * WIDTH + x) * 3;
      rgb[o] = color[0];
      rgb[o + 1] = color[1];
      rgb[o + 2] = color[2];
    }
  }
}

function drawText(rgb, text, x, y, scale, gap, color) {
  let cursor = x;
  for (const ch of text) {
    const glyph = FONT[ch];
    if (!glyph) throw new Error(`Missing glyph for ${ch}`);
    for (let row = 0; row < glyph.length; row += 1) {
      for (let col = 0; col < glyph[row].length; col += 1) {
        if (glyph[row][col] !== "1") continue;
        rect(rgb, cursor + col * scale, y + row * scale, scale, scale, color);
      }
    }
    cursor += 5 * scale + gap;
  }
}

export function renderSocialCardPng() {
  const rgb = Buffer.alloc(WIDTH * HEIGHT * 3);
  const navy = [0x12, 0x3b, 0x57];
  const red = [0xf3, 0x26, 0x36];
  const cream = [0xf4, 0xf1, 0xea];
  const blue = [0x8e, 0xd8, 0xf5];
  const muted = [0xc6, 0xdc, 0xe8];
  fill(rgb, navy[0], navy[1], navy[2]);
  rect(rgb, 0, 0, 18, HEIGHT, red);
  rect(rgb, 72, 168, 84, 8, blue);
  drawText(rgb, "FURNACEISNTFREE.COM", 72, 196, 4, 3, muted);
  drawText(rgb, "THE FURNACE", 72, 260, 9, 8, cream);
  drawText(rgb, "ISN'T FREE", 72, 360, 9, 8, cream);
  drawText(rgb, "HVAC QUOTE TRANSPARENCY", 72, 470, 4, 3, blue);
  drawText(rgb, "EQUIPMENT, ALLOWANCE, LABOR, INSTALLED PRICE", 72, 520, 3, 2, cream);
  return encodePng(rgb);
}

export async function writeSocialCard(file) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, renderSocialCardPng());
}
