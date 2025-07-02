/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: [
      '@mui/material/node/styles/index.js',
      '@mui/x-data-grid',
      '@mui/material',
      '@emotion/react',
      '@emotion/styled'
    ],
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: './src/setupTests.ts',
  },
  resolve: {
    alias: {
      '@mui/material/styles': '@mui/material/node/styles/index.js',
    },
  },
});
