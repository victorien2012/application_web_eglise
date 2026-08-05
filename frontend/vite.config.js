import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  envDir: '../',
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
    // Les feuilles de style ne sont pas traitees pendant les tests : elles
    // n'influencent pas les comportements verifies ici et ralentiraient
    // l'execution.
    css: false,
  },
});
