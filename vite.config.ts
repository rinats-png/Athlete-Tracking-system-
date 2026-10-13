import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'
import { copyFileSync, existsSync, mkdirSync } from 'node:fs'

/**
 * Die Laufzeit der Kameraerkennung (MediaPipe, WebAssembly) liegt im Paket
 * und wird beim Start von Entwicklung und Bau nach public/mediapipe kopiert
 * (nicht im Repo, siehe .gitignore). So kommt sie von der eigenen Herkunft —
 * kein Laden von fremden Servern, auch nicht beim ersten Mal. Nur die
 * SIMD-Fassung: jeder Browser mit Wake Lock und Kamera im Web kann SIMD.
 */
function copyMediapipe() {
  return {
    name: 'kydon-copy-mediapipe',
    buildStart() {
      const from = path.resolve(__dirname, 'node_modules/@mediapipe/tasks-vision/wasm')
      const to = path.resolve(__dirname, 'public/mediapipe')
      if (!existsSync(from)) return
      mkdirSync(to, { recursive: true })
      for (const f of ['vision_wasm_internal.js', 'vision_wasm_internal.wasm']) copyFileSync(path.join(from, f), path.join(to, f))
    },
  }
}

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
        },
      },
    },
  },
  plugins: [
    copyMediapipe(),
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
        name: 'Kydon — Performance Diagnostics',
        short_name: 'Kydon',
        description:
          'Leistungsdiagnostik für Athleten und Trainer. Measure. Benchmark. Develop.',
        lang: 'de',
        start_url: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#EAF1F0',
        theme_color: '#EAF1F0',
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
        // Die Testbilder (rund 9 MB) gehören nicht in den Vorab-Zwischenspeicher:
        // sie sind Beiwerk, die Vorschrift steht auch ohne sie. Sie werden beim
        // ersten Ansehen gespeichert und danach offline gezeigt.
        // Kameraerkennung (rund 19 MB) ebenso: erst beim ersten Öffnen laden,
        // danach offline. Wer die Kamera nie nutzt, lädt sie nie.
        globIgnores: ['testbilder/**', 'mediapipe/**', 'models/**'],
        runtimeCaching: [
          {
            urlPattern: ({ url }: { url: URL }) => url.pathname.startsWith('/mediapipe/') || url.pathname.startsWith('/models/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'pose',
              expiration: { maxEntries: 8, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: ({ url }: { url: URL }) => url.pathname.startsWith('/testbilder/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'testbilder',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
        // Empfang und Anzeige von Push-Nachrichten (public/push-sw.js).
        importScripts: ['push-sw.js'],
      },
    }),
  ],
})
