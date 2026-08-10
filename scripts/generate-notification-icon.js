/**
 * generate-notification-icon.js
 * Android notification small-icon — must be a WHITE silhouette on a
 * transparent background (system tints it). Renders the Material bell
 * path at 96x96 into assets/images/notification-icon.png.
 * Run: node scripts/generate-notification-icon.js  (sharp is a devDependency)
 */
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const OUT = path.join(__dirname, '..', 'assets', 'images', 'notification-icon.png');

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24">
  <path fill="#FFFFFF" d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
</svg>`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });

sharp(Buffer.from(SVG))
  .png()
  .toFile(OUT)
  .then((info) => console.log('✅ notification-icon.png written:', info.width + 'x' + info.height))
  .catch((e) => {
    console.error('❌ Failed:', e.message);
    process.exit(1);
  });
