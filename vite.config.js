import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath } from 'url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
VitePWA({
      registerType: 'manual', // Enregistrement manuel comme dans le tutoriel
      strategies: 'generateSW', // Utiliser generateSW au lieu d'injectManifest
      includeAssets: [
        'icons/icon-72x72.png',
        'icons/icon-96x96.png',
        'icons/icon-128x128.png',
        'icons/icon-144x144.png',
        'icons/icon-152x152.png',
        'icons/icon-192x192.png',
        'icons/icon-384x384.png',
        'icons/icon-512x512.png'
      ],
      manifest: false, // Utiliser notre manifeste existant
      devOptions: {
        enabled: false // Désactiver en dev pour éviter les conflits
      },
      workbox: {
        // Configuration minimale pour éviter les conflits
        skipWaiting: true,
        clientsClaim: true
      }
    })
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    host: '0.0.0.0', // Écouter sur toutes les interfaces
    https: false, // Sera géré par ngrok
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      'robin-saving-instantly.ngrok-free.app', // Votre domaine fixe
      'all' // Accepter tous les autres aussi
    ],
    headers: {
      'Cross-Origin-Embedder-Policy': 'credentialless',
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Service-Worker-Allowed': '/'
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false
      }
    }
  },
  preview: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: 'all',
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false
      }
    }
  },
})
