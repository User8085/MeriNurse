import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,   // force port 5173 and fail if busy
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  build: {
    // Split chunks so large vendor libs are cached separately
    rollupOptions: {
      output: {
        manualChunks(id) {
          // ── Heavy 3D / animation libs — largest, rarely change ────────
          if (id.includes('three') || id.includes('@react-three')) {
            return 'vendor-three';
          }
          if (id.includes('framer-motion')) {
            return 'vendor-framer';
          }
          // ── Icon packs ─────────────────────────────────────────────────
          if (id.includes('react-icons') || id.includes('lucide-react')) {
            return 'vendor-icons';
          }
          // ── Core React runtime ─────────────────────────────────────────
          if (id.includes('react-dom') || id.includes('react-router')) {
            return 'vendor-react';
          }
          // ── Everything else in node_modules → shared vendor chunk ──────
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
      },
    },
    // Warn if any single chunk exceeds 600 kB
    chunkSizeWarningLimit: 600,
  },
})


