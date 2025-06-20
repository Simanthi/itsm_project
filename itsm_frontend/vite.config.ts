/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: './src/setupTests.ts', // Path to setup file
    // You can add other Vitest options here as needed
    // e.g., coverage: { reporter: ['text', 'json', 'html'] }
  },
});
