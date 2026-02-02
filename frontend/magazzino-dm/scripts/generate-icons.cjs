/**
 * Script per generare icone PWA dal logo esistente
 * Esegui: node scripts/generate-icons.cjs
 */

const fs = require('fs');
const path = require('path');

// Dimensioni icone necessarie per PWA
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Crea un'icona SVG semplice con le iniziali "DM"
function createIconSvg(size) {
  const fontSize = Math.floor(size * 0.4);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1e40af"/>
      <stop offset="100%" style="stop-color:#3b82f6"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size * 0.15}" fill="url(#bg)"/>
  <text x="50%" y="55%" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">DM</text>
</svg>`;
}

// Directory delle icone
const iconsDir = path.join(__dirname, '..', 'public', 'icons');

// Crea la directory se non esiste
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Genera le icone
sizes.forEach(size => {
  const svg = createIconSvg(size);

  // Salva come SVG (può essere convertito in PNG con strumenti esterni)
  const svgPath = path.join(iconsDir, `icon-${size}x${size}.svg`);
  fs.writeFileSync(svgPath, svg);
  console.log(`Created: ${svgPath}`);
});

// Genera icone maskable (con padding extra per Android)
[192, 512].forEach(size => {
  const innerSize = Math.floor(size * 0.8);
  const padding = Math.floor((size - innerSize) / 2);
  const fontSize = Math.floor(innerSize * 0.4);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg-mask" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1e40af"/>
      <stop offset="100%" style="stop-color:#3b82f6"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#bg-mask)"/>
  <text x="50%" y="55%" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">DM</text>
</svg>`;

  const svgPath = path.join(iconsDir, `icon-maskable-${size}x${size}.svg`);
  fs.writeFileSync(svgPath, svg);
  console.log(`Created maskable: ${svgPath}`);
});

console.log('\\nIcone SVG generate con successo!');
console.log('Per convertire in PNG, puoi usare:');
console.log('- ImageMagick: convert icon.svg icon.png');
console.log('- Inkscape: inkscape icon.svg -o icon.png');
console.log('- Online: https://svgtopng.com/');
