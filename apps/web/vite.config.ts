import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 51926,
    host: true,
    cors: true,
  },
  optimizeDeps: {
    include: ['@squad/core', '@squad/ui'],
  },
});