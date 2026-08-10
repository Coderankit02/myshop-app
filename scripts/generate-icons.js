/**
 * generate-icons.js — Rinku Kirana brand icons from the website's PWA icons.
 * Source: ../myshop/public/icons/icon-512.png (+ maskable variant)
 * Output: assets/images/{icon,adaptive-icon,splash-icon,favicon}.png
 *
 * Run:  node scripts/generate-icons.js   (needs `npm i -D sharp` once)
 */
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..');
const SRC_ICON = path.join(ROOT, '..', 'myshop', 'public', 'icons', 'icon-512.png');
const SRC_MASKABLE = path.join(ROOT, '..', 'myshop', 'public', 'icons', 'icon-512-maskable.png');
const OUT_DIR = path.join(ROOT, 'assets', 'images');

async function main() {
  if (!fs.existsSync(SRC_ICON)) {
    console.error(`Source icon nahi mila: ${SRC_ICON}`);
    process.exit(1);
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });

  // 1) Store icon — 1024x1024
  await sharp(SRC_ICON).resize(1024, 1024, { fit: 'cover' }).png().toFile(path.join(OUT_DIR, 'icon.png'));
  console.log('✓ icon.png (1024)');

  // 2) Adaptive icon foreground — 1024 canvas, logo ~66% centered (safe zone)
  const maskable = fs.existsSync(SRC_MASKABLE) ? SRC_MASKABLE : SRC_ICON;
  await sharp(maskable)
    .resize(700, 700, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .resize(1024, 1024, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(OUT_DIR, 'adaptive-icon.png'));
  console.log('✓ adaptive-icon.png (1024)');

  // 3) Splash icon — 512 logo on transparent
  await sharp(SRC_ICON)
    .resize(512, 512, { fit: 'cover' })
    .png()
    .toFile(path.join(OUT_DIR, 'splash-icon.png'));
  console.log('✓ splash-icon.png (512)');

  // 4) Web favicon — 48
  await sharp(SRC_ICON).resize(48, 48).png().toFile(path.join(OUT_DIR, 'favicon.png'));
  console.log('✓ favicon.png (48)');

  console.log('Done! Icons ready in assets/images/');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
