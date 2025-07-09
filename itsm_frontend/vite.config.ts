/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path'; // Import path

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: [
      '@mui/material/node/styles/index.js', // Target of the alias
      '@mui/material', // General MUI
      '@mui/x-data-grid', // Main package for data grid
      '@mui/x-data-grid/esm/material/index.js', // The file causing the problematic import
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
      '@mui/material/styles': path.resolve(__dirname, 'node_modules/@mui/material/node/styles/index.js'),
    },
  },
});
