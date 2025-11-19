#!/usr/bin/env node

/**
 * Convert SVG icons to PNG using sharp
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const sizes = [16, 32, 48, 128];
const iconsDir = path.join(__dirname, '../public/icons');

async function convertSVGtoPNG(size) {
  const svgPath = path.join(iconsDir, `icon${size}.svg`);
  const pngPath = path.join(iconsDir, `icon${size}.png`);
  
  try {
    const svgBuffer = fs.readFileSync(svgPath);
    
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(pngPath);
    
    console.log(` Converted icon${size}.svg → icon${size}.png`);
  } catch (error) {
    console.error(` Failed to convert icon${size}.svg:`, error.message);
  }
}

async function main() {
  console.log(' Converting SVG icons to PNG...\n');
  
  for (const size of sizes) {
    await convertSVGtoPNG(size);
  }
  
  console.log('\n All icons converted successfully!');
}

main().catch(console.error);


