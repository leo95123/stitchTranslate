import { defineConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.json';

export default defineConfig({
  plugins: [crx({ manifest })],
  build: {
    sourcemap: true,
    // Chrome extensions warn about unused modulepreload; chunks load via imports instead
    modulePreload: false,
  },
});
