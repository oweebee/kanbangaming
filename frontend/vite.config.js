import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Horodatage figé au moment du build (vite build), affiché en footer
  // (App.jsx) pour vérifier en un coup d'œil, sans outil ni assistance,
  // que l'app chargée sur un appareil correspond bien au dernier déploiement
  // — plutôt que de rouvrir une PWA figée sur une ancienne version en mémoire.
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
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
