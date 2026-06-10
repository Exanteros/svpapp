const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const OUTPUT_DIR = path.join(process.cwd(), 'public', 'icons');
const OLIVE = [94, 109, 53, 255];
const OLIVE_DARK = [53, 64, 31, 255];
const CREAM = [246, 247, 241, 255];
const WHITE = [255, 255, 255, 255];

const LETTERS = {
  S: [
    '11111',
    '10000',
    '10000',
    '11110',
    '00001',
    '00001',
    '11110',
  ],
  V: [
    '10001',
    '10001',
    '10001',
    '10001',
    '01010',
    '01010',
    '00100',
  ],
};

function makeCrcTable() {
  const table = new Uint32Array(256);

  for (let n = 0; n < 256; n += 1) {
    let c = n;

    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }

    table[n] = c >>> 0;
  }

  return table;
}

const CRC_TABLE = makeCrcTable();

function crc32(buffers) {
  let crc = 0xffffffff;

  for (const buffer of buffers) {
    for (let index = 0; index < buffer.length; index += 1) {
      crc = CRC_TABLE[(crc ^ buffer[index]) & 0xff] ^ (crc >>> 8);
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data = Buffer.alloc(0)) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  const crc = Buffer.alloc(4);

  length.writeUInt32BE(data.length, 0);
  crc.writeUInt32BE(crc32([typeBuffer, data]), 0);

  return Buffer.concat([length, typeBuffer, data, crc]);
}

function encodePng(width, height, rgba) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  const scanlines = Buffer.alloc((width * 4 + 1) * height);

  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;

  for (let y = 0; y < height; y += 1) {
    const targetOffset = y * (width * 4 + 1);
    const sourceOffset = y * width * 4;
    scanlines[targetOffset] = 0;
    rgba.copy(scanlines, targetOffset + 1, sourceOffset, sourceOffset + width * 4);
  }

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(scanlines, { level: 9 })),
    chunk('IEND'),
  ]);
}

function setPixel(buffer, width, x, y, color) {
  if (x < 0 || y < 0 || x >= width) return;

  const offset = (y * width + x) * 4;
  buffer[offset] = color[0];
  buffer[offset + 1] = color[1];
  buffer[offset + 2] = color[2];
  buffer[offset + 3] = color[3];
}

function fillRect(buffer, width, x, y, rectWidth, rectHeight, color) {
  for (let row = Math.max(0, y); row < y + rectHeight; row += 1) {
    for (let column = Math.max(0, x); column < x + rectWidth; column += 1) {
      setPixel(buffer, width, column, row, color);
    }
  }
}

function fillRoundedRect(buffer, width, height, x, y, rectWidth, rectHeight, radius, color) {
  for (let row = y; row < y + rectHeight; row += 1) {
    for (let column = x; column < x + rectWidth; column += 1) {
      const dx = column < x + radius ? x + radius - column : column > x + rectWidth - radius ? column - (x + rectWidth - radius) : 0;
      const dy = row < y + radius ? y + radius - row : row > y + rectHeight - radius ? row - (y + rectHeight - radius) : 0;

      if (dx * dx + dy * dy <= radius * radius) {
        setPixel(buffer, width, column, row, color);
      }
    }
  }
}

function drawLetter(buffer, width, letter, x, y, scale, color) {
  const pattern = LETTERS[letter];

  pattern.forEach((line, row) => {
    line.split('').forEach((value, column) => {
      if (value === '1') {
        fillRect(buffer, width, x + column * scale, y + row * scale, scale, scale, color);
      }
    });
  });
}

function createIcon(size, fileName, maskable = false) {
  const buffer = Buffer.alloc(size * size * 4);
  const safePadding = maskable ? Math.round(size * 0.12) : 0;

  fillRect(buffer, size, 0, 0, size, size, OLIVE);

  const inset = Math.round(size * 0.12) + safePadding;
  const badgeSize = size - inset * 2;
  fillRoundedRect(buffer, size, size, inset, inset, badgeSize, badgeSize, Math.round(size * 0.12), CREAM);

  const stroke = Math.max(2, Math.round(size * 0.018));
  fillRoundedRect(buffer, size, size, inset + stroke, inset + stroke, badgeSize - stroke * 2, badgeSize - stroke * 2, Math.round(size * 0.1), WHITE);

  const scale = Math.max(4, Math.floor(size / 34));
  const letterWidth = 5 * scale;
  const gap = Math.round(scale * 1.6);
  const totalWidth = letterWidth * 2 + gap;
  const startX = Math.round((size - totalWidth) / 2);
  const startY = Math.round((size - 7 * scale) / 2);

  drawLetter(buffer, size, 'S', startX, startY, scale, OLIVE_DARK);
  drawLetter(buffer, size, 'V', startX + letterWidth + gap, startY, scale, OLIVE_DARK);

  const underlineY = startY + 7 * scale + Math.round(scale * 1.5);
  fillRect(buffer, size, startX, underlineY, totalWidth, Math.max(2, Math.round(scale * 0.7)), OLIVE);

  fs.writeFileSync(path.join(OUTPUT_DIR, fileName), encodePng(size, size, buffer));
}

fs.mkdirSync(OUTPUT_DIR, { recursive: true });
createIcon(180, 'apple-touch-icon.png');
createIcon(192, 'icon-192x192.png');
createIcon(512, 'icon-512x512.png');
createIcon(512, 'maskable-512x512.png', true);

console.log('PWA icons generated in public/icons');
