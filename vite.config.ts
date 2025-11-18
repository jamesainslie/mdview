import { defineConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import { resolve } from 'path';
import manifest from './public/manifest.json';

export default defineConfig({
  plugins: [crx({ manifest })],
  base: './',
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/popup.html'),
        options: resolve(__dirname, 'src/options/options.html'),
      },
      output: {
        // Use relative paths for asset imports in content scripts
        inlineDynamicImports: false,
      },
    },
    target: 'es2022',
    minify: 'esbuild',
    sourcemap: false,
  },
  optimizeDeps: {
    include: [
      'markdown-it',
      'markdown-it-attrs',
      'markdown-it-anchor',
      'markdown-it-task-lists',
      'markdown-it-emoji',
      'markdown-it-footnote',
      'highlight.js',
      'mermaid',
      'panzoom',
      'dompurify',
    ],
  },
});

