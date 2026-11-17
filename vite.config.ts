/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  // Relative asset paths so the build also loads from file:// inside Electron.
  base: './',
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // Let the design-token contrast test read src/index.css as text (Vitest blanks CSS imports by default).
    css: { include: [/src[\/]index\.css/] },
  },
});
