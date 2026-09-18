import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Enregistrement fait explicitement via `virtual:pwa-register` dans
      // index.jsx : on desactive l'injection automatique du plugin pour ne
      // pas enregistrer le service worker deux fois.
      injectRegister: false,
      includeAssets: ['pwa-192x192.png', 'pwa-512x512.png'],
      manifest: {
        name: 'Plateforme de Prédications – Église',
        short_name: 'Prédications',
        description: "Écoute, visionnage et téléchargement de prédications, espaces dédiés aux pasteurs.",
        lang: 'fr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        theme_color: '#004a94',
        background_color: '#ffffff',
        icons: [
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        // Ne precache jamais les reponses de l'API (auth, contenu dynamique) :
        // seul l'app shell (JS/CSS/HTML/assets) doit etre mis en cache par le
        // service worker, pour ne jamais servir de donnees perimees ou
        // conserver un token expire hors ligne.
        navigateFallbackDenylist: [/^\/api\//],
      },
      devOptions: {
        // Permet de tester l'installabilite et le service worker directement
        // sur le serveur de dev (docker), sans devoir faire un build.
        enabled: true,
      },
    }),
  ],
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
