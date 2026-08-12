import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  envDir: '../',
  build: {
    // Sans cette cible, le minifieur reecrit « max-width: 768px » en syntaxe
    // d'intervalle « (width <= 768px) » (Media Queries niveau 4), comprise
    // seulement par Chrome 104+, Safari 16.4+ et Firefox 102+. Sur un
    // telephone plus ancien, tout le bloc responsive etait purement ignore :
    // les tableaux restaient en mise en page desktop, illisibles.
    cssTarget: ['chrome87', 'safari14', 'firefox78', 'edge88'],
  },
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
