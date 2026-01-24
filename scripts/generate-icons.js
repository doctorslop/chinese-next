#!/usr/bin/env node
/**
 * Generate PWA icons (192x192 and 512x512) using pure Node.js.
 * Creates a dark background with the app's SVG icon path rendered in white.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// CRC32 lookup table
const crcTable = (function () {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crcData = Buffer.concat([typeBytes, data]);
  const crcVal = Buffer.alloc(4);
  crcVal.writeUInt32BE(crc32(crcData), 0);
  return Buffer.concat([length, typeBytes, data, crcVal]);
}

function createPNG(width, height, pixels) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  const ihdrChunk = createChunk('IHDR', ihdr);

  // IDAT - add filter byte (0 = None) to each row
  const rawData = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    const rowOffset = y * (1 + width * 4);
    rawData[rowOffset] = 0; // filter: None
    for (let x = 0; x < width; x++) {
      const srcIdx = (y * width + x) * 4;
      const dstIdx = rowOffset + 1 + x * 4;
      rawData[dstIdx] = pixels[srcIdx];     // R
      rawData[dstIdx + 1] = pixels[srcIdx + 1]; // G
      rawData[dstIdx + 2] = pixels[srcIdx + 2]; // B
      rawData[dstIdx + 3] = pixels[srcIdx + 3]; // A
    }
  }

  const compressed = zlib.deflateSync(rawData, { level: 9 });
  const idatChunk = createChunk('IDAT', compressed);

  // IEND
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Parse SVG path numbers correctly (handles -sign as separator)
function tokenizeNumbers(str) {
  const nums = [];
  const regex = /[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/g;
  let match;
  while ((match = regex.exec(str)) !== null) {
    nums.push(parseFloat(match[0]));
  }
  return nums;
}

// Parse SVG path into segments
function parsePath(d) {
  const commands = [];
  const regex = /([MmCcZzLlHhVvSsQqTtAa])([^MmCcZzLlHhVvSsQqTtAa]*)/g;
  let match;
  while ((match = regex.exec(d)) !== null) {
    const cmd = match[1];
    const args = tokenizeNumbers(match[2]);
    commands.push({ cmd, args });
  }
  return commands;
}

// Rasterize the SVG path onto a pixel buffer
function rasterizePath(width, height, pathData, viewBox, fillColor) {
  const [vx, vy, vw, vh] = viewBox;
  const scaleX = width / vw;
  const scaleY = height / vh;

  // Convert path to points using a simple scanline approach
  // First, convert the path to a polygon by sampling the bezier curves
  const points = [];
  let cx = 0, cy = 0;
  let startX = 0, startY = 0;

  const commands = parsePath(pathData);

  for (const { cmd, args } of commands) {
    switch (cmd) {
      case 'M':
        cx = args[0]; cy = args[1];
        startX = cx; startY = cy;
        points.push({ x: cx, y: cy, type: 'move' });
        break;
      case 'C': {
        // Cubic bezier - sample points along curve
        for (let i = 0; i < args.length; i += 6) {
          const x1 = args[i], y1 = args[i + 1];
          const x2 = args[i + 2], y2 = args[i + 3];
          const x3 = args[i + 4], y3 = args[i + 5];
          const steps = 30;
          for (let t = 1; t <= steps; t++) {
            const tt = t / steps;
            const u = 1 - tt;
            const px = u * u * u * cx + 3 * u * u * tt * x1 + 3 * u * tt * tt * x2 + tt * tt * tt * x3;
            const py = u * u * u * cy + 3 * u * u * tt * y1 + 3 * u * tt * tt * y2 + tt * tt * tt * y3;
            points.push({ x: px, y: py, type: 'line' });
          }
          cx = x3; cy = y3;
        }
        break;
      }
      case 'c': {
        for (let i = 0; i < args.length; i += 6) {
          const x1 = cx + args[i], y1 = cy + args[i + 1];
          const x2 = cx + args[i + 2], y2 = cy + args[i + 3];
          const x3 = cx + args[i + 4], y3 = cy + args[i + 5];
          const steps = 30;
          for (let t = 1; t <= steps; t++) {
            const tt = t / steps;
            const u = 1 - tt;
            const px = u * u * u * cx + 3 * u * u * tt * x1 + 3 * u * tt * tt * x2 + tt * tt * tt * x3;
            const py = u * u * u * cy + 3 * u * u * tt * y1 + 3 * u * tt * tt * y2 + tt * tt * tt * y3;
            points.push({ x: px, y: py, type: 'line' });
          }
          cx = x3; cy = y3;
        }
        break;
      }
      case 'L':
        cx = args[0]; cy = args[1];
        points.push({ x: cx, y: cy, type: 'line' });
        break;
      case 'l':
        cx += args[0]; cy += args[1];
        points.push({ x: cx, y: cy, type: 'line' });
        break;
      case 'Z':
      case 'z':
        cx = startX; cy = startY;
        points.push({ x: cx, y: cy, type: 'line' });
        break;
    }
  }

  // Use scanline fill algorithm
  const pixels = new Uint8Array(width * height * 4);

  // Find all edge intersections per scanline
  const edges = [];
  for (let i = 0; i < points.length - 1; i++) {
    if (points[i + 1].type === 'move') continue;
    const p1 = { x: (points[i].x - vx) * scaleX, y: (points[i].y - vy) * scaleY };
    const p2 = { x: (points[i + 1].x - vx) * scaleX, y: (points[i + 1].y - vy) * scaleY };
    edges.push([p1, p2]);
  }

  for (let y = 0; y < height; y++) {
    const scanY = y + 0.5;
    const intersections = [];

    for (const [p1, p2] of edges) {
      if ((p1.y <= scanY && p2.y > scanY) || (p2.y <= scanY && p1.y > scanY)) {
        const t = (scanY - p1.y) / (p2.y - p1.y);
        intersections.push(p1.x + t * (p2.x - p1.x));
      }
    }

    intersections.sort((a, b) => a - b);

    for (let i = 0; i < intersections.length - 1; i += 2) {
      const xStart = Math.max(0, Math.ceil(intersections[i]));
      const xEnd = Math.min(width - 1, Math.floor(intersections[i + 1]));
      for (let x = xStart; x <= xEnd; x++) {
        const idx = (y * width + x) * 4;
        pixels[idx] = fillColor[0];
        pixels[idx + 1] = fillColor[1];
        pixels[idx + 2] = fillColor[2];
        pixels[idx + 3] = fillColor[3];
      }
    }
  }

  return pixels;
}

function generateIcon(size) {
  const pixels = new Uint8Array(size * size * 4);

  // Fill with background color (#111111)
  for (let i = 0; i < size * size; i++) {
    pixels[i * 4] = 0x11;     // R
    pixels[i * 4 + 1] = 0x11; // G
    pixels[i * 4 + 2] = 0x11; // B
    pixels[i * 4 + 3] = 0xff; // A
  }

  // Draw rounded corners by making corner pixels transparent
  const radius = Math.round(size * 0.12); // 12% corner radius
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let cornerX = -1, cornerY = -1;
      if (x < radius && y < radius) { cornerX = radius; cornerY = radius; }
      else if (x >= size - radius && y < radius) { cornerX = size - radius - 1; cornerY = radius; }
      else if (x < radius && y >= size - radius) { cornerX = radius; cornerY = size - radius - 1; }
      else if (x >= size - radius && y >= size - radius) { cornerX = size - radius - 1; cornerY = size - radius - 1; }

      if (cornerX >= 0) {
        const dx = x - cornerX;
        const dy = y - cornerY;
        if (dx * dx + dy * dy > radius * radius) {
          const idx = (y * size + x) * 4;
          pixels[idx + 3] = 0; // transparent
        }
      }
    }
  }

  // SVG path data from the app icon
  const pathData = "M496.898,219.081C455.176,128.09,338.844,109.334,311.415,84.319c-11.584-10.58-23.31-19.091-36.122-23.544 c-0.254,1.511-0.436,3.023-0.436,4.585c0,3.561,0.669,7.314,2.069,11.301c1.4,3.976,3.52,8.166,6.33,12.456 c5.62,8.572,13.978,17.488,24.041,25.928c20.126,16.941,46.956,32.086,71.272,41.793c5.386,2.151,8.013,8.258,5.863,13.644 c-2.171,5.387-8.278,8.004-13.654,5.853c-17.266-6.908-35.372-16.128-52.13-26.962c-16.748-10.844-32.126-23.23-43.872-36.792 c-7.812-9.048-14.03-18.655-17.652-28.961c-2.078-5.894-3.276-12.01-3.266-18.259c-0.01-2.637,0.234-5.285,0.669-7.933 c-3.681,0.081-7.282,0.487-10.782,1.207c-0.721,5.144-1.126,10.489-1.126,16.038c0,17.944,3.783,37.614,10.479,56.563 c6.684,18.959,16.25,37.198,27.5,52.353c3.459,4.676,2.475,11.24-2.171,14.699c-4.666,3.448-11.239,2.475-14.688-2.192 c-12.639-17.031-23.067-36.984-30.442-57.87c-7.01-19.882-11.188-40.587-11.594-60.53c-6.36,7.872-12.112,15.916-17.052,24.062 c-14.577,23.94-22.55,48.58-22.53,71.282c0,1.228,0.021,2.445,0.072,3.652c0.213,5.792-4.301,10.671-10.094,10.884 c-5.792,0.224-10.671-4.3-10.894-10.092c-0.051-1.471-0.081-2.952-0.081-4.444c0.02-26.456,8.764-53.378,23.615-78.859 c-42.29,22.114-137.065,48.894-170.277,124.902c-35.99,82.431-6.045,174.183,103.874,214.789 c36.641,13.522,82.227,20.703,137.35,20.703c55.112,0,100.709-7.182,137.349-20.703 C502.944,393.264,534.38,300.842,496.898,219.081z";

  // Render the path with padding
  const padding = Math.round(size * 0.15);
  const iconSize = size - padding * 2;

  // Rasterize the icon path
  const iconPixels = rasterizePath(iconSize, iconSize, pathData, [0, 0, 512, 512], [0xe8, 0xe8, 0xe8, 0xff]);

  // Composite icon onto background
  for (let y = 0; y < iconSize; y++) {
    for (let x = 0; x < iconSize; x++) {
      const srcIdx = (y * iconSize + x) * 4;
      const dstX = x + padding;
      const dstY = y + padding;
      if (dstX >= size || dstY >= size) continue;
      const dstIdx = (dstY * size + dstX) * 4;

      if (iconPixels[srcIdx + 3] > 0 && pixels[dstIdx + 3] > 0) {
        pixels[dstIdx] = iconPixels[srcIdx];
        pixels[dstIdx + 1] = iconPixels[srcIdx + 1];
        pixels[dstIdx + 2] = iconPixels[srcIdx + 2];
      }
    }
  }

  return pixels;
}

// Generate icons
const sizes = [192, 512];
const publicDir = path.join(__dirname, '..', 'public');

for (const size of sizes) {
  console.log(`Generating ${size}x${size} icon...`);
  const pixels = generateIcon(size);
  const png = createPNG(size, size, pixels);
  const filename = `icon-${size}x${size}.png`;
  fs.writeFileSync(path.join(publicDir, filename), png);
  console.log(`  Saved ${filename} (${png.length} bytes)`);
}

// Also generate apple-touch-icon (180x180)
console.log('Generating 180x180 apple-touch-icon...');
const applePixels = generateIcon(180);
const applePng = createPNG(180, 180, applePixels);
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), applePng);
console.log(`  Saved apple-touch-icon.png (${applePng.length} bytes)`);

console.log('Done!');
