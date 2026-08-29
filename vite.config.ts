import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'

export default defineConfig({
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
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
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
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Testdurchführung muss auch im Funkloch der Halle funktionieren.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: '/index.html',
      },
    }),
  ],
})
