import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';

// Numéro de version affiché dans l'app (modal Info) : lu depuis package.json,
// donc une seule source de vérité à incrémenter (1.0.0 → 1.1.0 → 1.2.0…) au
// lieu de tags "V1/V2/V3" génériques. Convention : on bumpe la ligne
// "version" ci-contre à chaque changement livré.
const { version: APP_VERSION } = JSON.parse(readFileSync('./package.json', 'utf-8'));

export default defineConfig({
  plugins: [react()],
  // Horodatage figé au moment du build (vite build), affiché en footer
  // (App.jsx) pour vérifier en un coup d'œil, sans outil ni assistance,
  // que l'app chargée sur un appareil correspond bien au dernier déploiement
  // — plutôt que de rouvrir une PWA figée sur une ancienne version en mémoire.
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __APP_VERSION__: JSON.stringify(APP_VERSION),
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://backend:3001',
        changeOrigin: true,
      },
    },
  },
});
