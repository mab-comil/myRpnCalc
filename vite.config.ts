/// <reference types="vitest/config" />
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  // 相対パスで出力し、公開先のサブディレクトリ（GitHub Pages など）でも動くようにする
  base: './',
  plugins: [
    svelte(),
    // PWA（設計仕様書 7章）
    VitePWA({
      // 新しい版の Service Worker はすぐに有効になるが、表示中の画面は再読み込みしない。
      // 新しい版の画面は次に起動したときに反映される
      registerType: 'autoUpdate',
      injectRegister: 'script-defer',
      includeAssets: ['icons/icon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'RPN電卓',
        short_name: 'RPN電卓',
        description: '逆ポーランド記法（RPN）の電卓。外税・内税キー付き',
        lang: 'ja',
        start_url: './',
        scope: './',
        display: 'standalone',
        // ライトテーマの背景色。ダークテーマ時はアプリ側で theme-color を切り替える
        theme_color: '#eef0f3',
        background_color: '#eef0f3',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // generateSW: 全ファイルを事前キャッシュし、完全にオフラインで動かす
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        cleanupOutdatedCaches: true,
        // 新しい版の Service Worker を待たせずに有効にし（skipWaiting）、
        // 初回の訪問からすぐに画面を管理してオフラインでも開けるようにする（clientsClaim）
        skipWaiting: true,
        clientsClaim: true,
      },
    }),
  ],
  test: {
    include: ['src/**/*.test.ts'],
    passWithNoTests: true,
  },
})
