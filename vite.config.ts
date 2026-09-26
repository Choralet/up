import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/up/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png', 'icon.svg'],
      manifest: {
        name: 'Up',
        short_name: 'Up',
        description: 'Calisthenics progression, like a game',
        start_url: '/up/',
        scope: '/up/',
        display: 'standalone',
        background_color: '#000000',
        theme_color: '#000000',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,json}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/gh\/hasaneyldrm\//,
            handler: 'CacheFirst',
            options: { cacheName: 'demos', expiration: { maxEntries: 60, maxAgeSeconds: 31536000 }, cacheableResponse: { statuses: [200] } },
          },
        ],
      },
    }),
  ],
  test: { environment: 'jsdom', setupFiles: './src/test-setup.ts', globals: true },
})
