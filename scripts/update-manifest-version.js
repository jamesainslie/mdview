#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const packagePath = path.join(__dirname, '../package.json');
const manifestPath = path.join(__dirname, '../public/manifest.json');

try {
  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

  console.log(`Updating manifest version from ${manifest.version} to ${pkg.version}...`);
  
  manifest.version = pkg.version;
  
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  console.log('✓ Manifest version updated successfully!');
} catch (error) {
  console.error('× Error updating manifest version:', error.message);
  process.exit(1);
}

