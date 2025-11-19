#!/usr/bin/env node

/**
 * Fix Manifest Post-Build
 * Removes invalid CSS references that Vite's CRXJS plugin incorrectly adds
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const manifestPath = path.join(__dirname, '../dist/manifest.json');

try {
  console.log('Fixing manifest.json...');
  
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  
  // Fix content_scripts CSS references
  if (manifest.content_scripts) {
    manifest.content_scripts.forEach((script, index) => {
      if (script.css) {
        console.log(`   Content script ${index}: found ${script.css.length} CSS file(s)`);
        script.css.forEach(css => console.log(`      - ${css}`));
        
        // Remove any CSS references that don't start with "assets/"
        const originalLength = script.css.length;
        const originalCss = [...script.css];
        script.css = script.css.filter(css => css.startsWith('assets/'));
        
        if (script.css.length < originalLength) {
          const removed = originalCss.filter(css => !script.css.includes(css));
          console.log(`   ✓ Removed ${removed.length} invalid CSS reference(s):`);
          removed.forEach(css => console.log(`      × ${css}`));
        } else {
          console.log(`   ✓ No invalid CSS references found`);
        }
        
        // If no CSS left, remove the array entirely
        if (script.css.length === 0) {
          delete script.css;
          console.log('   ✓ Removed empty CSS array');
        }
      }
    });
  }
  
  // Write fixed manifest
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  
  console.log('✓ Manifest fixed successfully!');
} catch (error) {
  console.error('× Error fixing manifest:', error.message);
  process.exit(1);
}

