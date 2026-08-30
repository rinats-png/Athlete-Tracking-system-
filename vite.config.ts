import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'

/**
 * Die App-Version landet als Konstante im Bundle. Exportdateien tragen sie
 * mit, damit eine Datei später einer App-Version zugeordnet werden kann.
 */
const appVersion = process.env.npm_package_version ?? '0.0.0'

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(appVersion) },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  build: {
    rollupOptions: {
      output: {
        // ECharts ist der mit Abstand grösste Brocken und ändert sich selten —
        // eigener Chunk, damit App-Updates ihn nicht invalidieren.
        manualChunks: {
          echarts: ['echarts', 'echarts/core', 'echarts/charts', 'echarts/components'],
        },
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // Die mitgelieferte Registrierung ruft nur einmal `register()` auf und
      // fragt nie wieder nach einer neuen Fassung. Wir registrieren selbst,
      // siehe src/lib/pwaUpdate.ts.
      injectRegister: null,
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'Baseline — Sportdiagnostik',
        short_name: 'Baseline',
        description:
          'Periodische Sporttests, Leistungsdiagnostik und Benchmarking für Athleten und Trainer.',
        lang: 'de',
        start_url: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0B0D0C',
        theme_color: '#0B0D0C',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          // Eigene Datei mit 20 % Sicherheitsrand: Android beschneidet
          // maskable Icons, ein randloses Motiv würde dabei angeschnitten.
          { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Testdurchführung muss auch im Funkloch der Halle funktionieren.
        // webp gehörte anfangs nicht dazu — die Körperansicht fehlte offline.
        globPatterns: ['**/*.{js,css,html,svg,png,webp,woff2,webmanifest}'],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
})
