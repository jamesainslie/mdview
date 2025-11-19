#!/usr/bin/env node

/**
 * Generate PNG icons from SVG
 * Creates simple markdown-themed icons for the extension
 */

const fs = require('fs');
const path = require('path');

// SVG template for markdown icon
function createSVG(size) {
  const padding = size * 0.15;
  const strokeWidth = size * 0.08;
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="#0969da"/>
  
  <!-- Markdown 'M' symbol -->
  <path d="
    M ${padding + strokeWidth/2} ${size - padding}
    L ${padding + strokeWidth/2} ${padding}
    L ${size/2 - strokeWidth} ${size/2}
    L ${size - padding - strokeWidth/2} ${padding}
    L ${size - padding - strokeWidth/2} ${size - padding}
  " 
  fill="none" 
  stroke="white" 
  stroke-width="${strokeWidth}" 
  stroke-linecap="round" 
  stroke-linejoin="round"/>
  
  <!-- Down arrow accent -->
  <path d="
    M ${size/2 - strokeWidth} ${size/2}
    L ${size/2 - strokeWidth} ${size - padding}
  " 
  fill="none" 
  stroke="white" 
  stroke-width="${strokeWidth}" 
  stroke-linecap="round"/>
</svg>`;
}

// Sizes needed for Chrome extension
const sizes = [16, 32, 48, 128];
const outputDir = path.join(__dirname, '../public/icons');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Generate SVG files
sizes.forEach(size => {
  const svg = createSVG(size);
  const svgPath = path.join(outputDir, `icon${size}.svg`);
  fs.writeFileSync(svgPath, svg);
  console.log(`✓ Generated ${svgPath}`);
});

console.log('\n📝 SVG icons generated successfully!');
console.log('💡 To convert to PNG, you can use:');
console.log('   - Online: https://svgtopng.com/');
console.log('   - CLI: brew install librsvg && rsvg-convert');
console.log('   - Or use the SVGs directly (some contexts support it)\n');


