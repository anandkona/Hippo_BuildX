/**
 * Crop the 3x3 platform admin mockup composite into 9 baseline panels.
 *
 * Layout (approximate equal grid with margins):
 *  [dashboard] [tenants] [tenant-details]
 *  [plans]     [users]   [subscriptions]
 *  [flags]     [settings][audit]
 */
import fs from 'fs';
import path from 'path';
import { PNG } from 'pngjs';

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'docs/design/platform-admin-mockup.png');
const OUT_DIR = path.join(ROOT, 'screenshots/baselines/platform');

const PANELS = [
  'dashboard',
  'tenants',
  'tenant-details',
  'plans',
  'users',
  'subscriptions',
  'feature-flags',
  'settings',
  'audit',
];

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

function cropPanel(src: PNG, col: number, row: number): PNG {
  // Outer padding / header chrome roughly 6% top, 4% sides, 5% bottom
  const padX = Math.floor(src.width * 0.035);
  const padTop = Math.floor(src.height * 0.12);
  const padBottom = Math.floor(src.height * 0.04);
  const gapX = Math.floor(src.width * 0.012);
  const gapY = Math.floor(src.height * 0.015);

  const gridW = src.width - padX * 2;
  const gridH = src.height - padTop - padBottom;
  const cellW = Math.floor((gridW - gapX * 2) / 3);
  const cellH = Math.floor((gridH - gapY * 2) / 3);

  const x0 = padX + col * (cellW + gapX);
  const y0 = padTop + row * (cellH + gapY);

  // Inset slightly to drop card outer chrome
  const inset = Math.floor(Math.min(cellW, cellH) * 0.015);
  const x = x0 + inset;
  const y = y0 + inset;
  const w = cellW - inset * 2;
  const h = cellH - inset * 2;

  const out = new PNG({ width: w, height: h });
  for (let rowY = 0; rowY < h; rowY++) {
    for (let colX = 0; colX < w; colX++) {
      const sx = x + colX;
      const sy = y + rowY;
      if (sx >= src.width || sy >= src.height) continue;
      const si = (src.width * sy + sx) << 2;
      const di = (w * rowY + colX) << 2;
      out.data[di] = src.data[si];
      out.data[di + 1] = src.data[si + 1];
      out.data[di + 2] = src.data[si + 2];
      out.data[di + 3] = src.data[si + 3];
    }
  }
  return out;
}

async function main() {
  if (!fs.existsSync(SRC)) {
    console.error('Mockup not found at', SRC);
    process.exit(1);
  }
  ensureDir(OUT_DIR);

  const buf = fs.readFileSync(SRC);
  const src = PNG.sync.read(buf);
  console.log(`Source: ${src.width}x${src.height}`);

  PANELS.forEach((name, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const panel = cropPanel(src, col, row);
    const outPath = path.join(OUT_DIR, `${name}.png`);
    fs.writeFileSync(outPath, PNG.sync.write(panel));
    console.log(`Wrote ${outPath} (${panel.width}x${panel.height})`);
  });

  console.log('Baselines cropped.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
