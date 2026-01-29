import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    rollupOptions: {
      input: {
        client: resolve(__dirname, 'index.html'),
      },
    },
  },
  ssr: {
    // Don't externalize @riktajs packages in SSR build
    noExternal: ['@riktajs/core', '@riktajs/ssr'],
  },
});
