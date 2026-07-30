// PWA ikonlarını heç bir asılılıq olmadan yaradır (sharp/ImageMagick lazım deyil).
// İşlətmək: npm run icons
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "icons");

const PINE = [0x14, 0x35, 0x1f];
const GOLD = [0xe9, 0xb5, 0x4a];

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "latin1"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

/** RGB (colorType 2) PNG — ikonlar şəffaf olmamalıdır, maskalanma fon tələb edir. */
function encodePng(size, pixels) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit dərinliyi
  ihdr[9] = 2; // rəng növü: truecolor
  // 10-12: sıxılma, filtr, interleave — hamısı 0

  const stride = size * 3;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y += 1) {
    raw[y * (stride + 1)] = 0; // filtr növü: none
    pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// Yarpaq iki dairənin kəsişməsidir (vesica) — SVG variantı ilə eyni forma.
const LEAF_OFFSET = 0.42;
const LEAF_RADIUS = 0.6;
const MIDRIB_HALF_WIDTH = 0.022;
// Yarpağın yarım hündürlüyü sqrt(r² − a²) ≈ 0.4285 vahiddir; onu ikonun
// yarım hündürlüyünün 0.62-sinə uyğunlaşdırırıq.
const LEAF_SCALE = 0.4285 / 0.62;

/** Nöqtə yarpağın içindədirsə rəng qaytarır, əks halda null. */
function leafColorAt(nx, ny) {
  const insideBoth =
    (nx + LEAF_OFFSET) ** 2 + ny ** 2 <= LEAF_RADIUS ** 2 &&
    (nx - LEAF_OFFSET) ** 2 + ny ** 2 <= LEAF_RADIUS ** 2;
  if (!insideBoth) return null;
  // Orta damar fonun rəngindədir ki, yarpaq kimi oxunsun
  const nearTip = Math.abs(ny) > 0.4;
  return Math.abs(nx) < MIDRIB_HALF_WIDTH && !nearTip ? PINE : GOLD;
}

const SUPERSAMPLE = 3;

function renderIcon(size) {
  const pixels = Buffer.alloc(size * size * 3);
  const samples = SUPERSAMPLE * SUPERSAMPLE;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let r = 0;
      let g = 0;
      let b = 0;

      // Kənarların hamar olması üçün hər piksel 3×3 nöqtədən orta alınır
      for (let sy = 0; sy < SUPERSAMPLE; sy += 1) {
        for (let sx = 0; sx < SUPERSAMPLE; sx += 1) {
          const px = x + (sx + 0.5) / SUPERSAMPLE;
          const py = y + (sy + 0.5) / SUPERSAMPLE;
          // Yarpaq hündürlüyü ikonun ~62%-ni tutur — maskalanma üçün
          // təhlükəsiz zona (daxili 80%) içində qalır.
          const nx = ((px / size) * 2 - 1) * LEAF_SCALE;
          const ny = ((py / size) * 2 - 1) * LEAF_SCALE;
          const color = leafColorAt(nx, ny) ?? PINE;
          r += color[0];
          g += color[1];
          b += color[2];
        }
      }

      const offset = (y * size + x) * 3;
      pixels[offset] = Math.round(r / samples);
      pixels[offset + 1] = Math.round(g / samples);
      pixels[offset + 2] = Math.round(b / samples);
    }
  }

  return encodePng(size, pixels);
}

mkdirSync(OUT_DIR, { recursive: true });

for (const [name, size] of [
  ["icon-192.png", 192],
  ["icon-512.png", 512],
  ["apple-touch-icon.png", 180],
]) {
  const png = renderIcon(size);
  writeFileSync(join(OUT_DIR, name), png);
  console.log(`${name.padEnd(22)} ${size}×${size}  ${(png.length / 1024).toFixed(1)} kB`);
}
