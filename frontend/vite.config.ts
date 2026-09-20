import { fileURLToPath, URL } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { visualizer } from 'rollup-plugin-visualizer';

import { parseEnv } from './src/app/config/env-schema.ts';

// Libraries every page boots with — one long-lived chunk. Everything else (zod,
// react-hook-form, …) stays in the route chunk that imports it.
const CORE_VENDOR = ['react', 'react-dom', 'react-router', 'scheduler', '@tanstack'];

const ASSET_DIRS: Record<string, string> = {
  css: 'css',
  woff2: 'fonts',
  woff: 'fonts',
  ttf: 'fonts',
  svg: 'img',
  png: 'img',
  jpg: 'img',
  jpeg: 'img',
  webp: 'img',
  avif: 'img',
};

// Rolldown passes `names`; `name` is deprecated there.
const assetDir = ({ names }: { names: string[] }) =>
  ASSET_DIRS[names[0]?.split('.').pop()?.toLowerCase() ?? ''];

const alias = (dir: string) => fileURLToPath(new URL(`./src/${dir}`, import.meta.url));

export default defineConfig(({ mode }) => {
  // Fail the dev server / build on a bad env instead of shipping it.
  if (mode !== 'test') parseEnv(loadEnv(mode, process.cwd(), 'VITE_'));

  return {
    plugins: [
      // ANALYZE=1 yarn build → build/stats.html, with real gzip and brotli sizes
      ...(process.env.ANALYZE
        ? [
            visualizer({
              filename: 'build/stats.html',
              gzipSize: true,
              brotliSize: true,
              template: 'treemap',
            }),
          ]
        : []),
      react(),
      tailwindcss(),
      VitePWA({
        // A shop-floor phone keeps the app open for days: update the shell on the next load
        // instead of waiting for a prompt nothing renders.
        registerType: 'autoUpdate',
        injectRegister: 'inline',
        includeAssets: ['favicon.svg', 'robots.txt', 'apple-touch-icon.png'],
        // Default globPatterns skip woff2, which would leave the self-hosted fonts
        // uncached offline and re-fetched on every cold start.
        workbox: { globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'] },
        manifest: {
          name: 'ProcessNow',
          short_name: 'ProcessNow',
          description: 'Orders, jobs and payments for job-work companies.',
          theme_color: '#111417',
          background_color: '#ffffff',
          display: 'standalone',
          start_url: '/',
          icons: [
            { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
            { src: 'pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            // Android crops to a circle: this one keeps the mark inside the safe zone.
            { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
      }),
    ],
    server: { port: 9090, strictPort: true, open: '/login' },
    preview: { port: 9090, strictPort: true },
    build: {
      outDir: 'build',
      // Never inline fonts as data: URIs — they'd need `font-src data:` in the CSP and
      // would re-download with every bundle change instead of caching on their own.
      assetsInlineLimit: (filePath: string) => (/\.(woff2?|ttf|otf|eot)$/i.test(filePath) ? false : undefined),
      rollupOptions: {
        // Pages are already split per route (lazy routes). This keeps the libraries every
        // page needs in one long-lived chunk, so app changes don't re-download them.
        output: {
          manualChunks: (id) =>
            CORE_VENDOR.some((pkg) => id.includes(`node_modules/${pkg}/`)) ? 'vendor' : undefined,
          entryFileNames: 'assets/js/[name]-[hash].js',
          chunkFileNames: 'assets/js/[name]-[hash].js',
          assetFileNames: (asset) => {
            const dir = assetDir(asset);
            return dir ? `assets/${dir}/[name]-[hash][extname]` : 'assets/[name]-[hash][extname]';
          },
        },
      },
    },
    resolve: {
      alias: {
        '@app': alias('app'),
        '@api': alias('api'),
        '@pages': alias('pages'),
        '@components': alias('components'),
        '@lib': alias('lib'),
        '@hooks': alias('hooks'),
        '@utils': alias('utils'),
        '@assets': alias('assets'),
        '@constants': alias('constants'),
        '@shared': alias('types'),
        '@test': alias('test'),
      },
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['src/test/setup.ts'],
      css: false,
      env: { VITE_API_BASE_URL: 'http://api.test', VITE_APP_ENV: 'local' },
    },
  };
});
