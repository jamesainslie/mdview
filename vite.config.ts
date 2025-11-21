import { defineConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import { resolve } from 'path';
import manifest from './public/manifest.json';
import packageJson from './package.json';

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
  },
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
    },
    target: 'es2022',
    minify: 'esbuild',
    sourcemap: false,
  },
  // Worker configuration for blob URLs
  worker: {
    format: 'es',
    plugins: [],
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

