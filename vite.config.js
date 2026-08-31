import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Target modern browsers for smaller bundles
    target: 'es2020',
    // Inline assets smaller than 8KB to reduce HTTP requests
    assetsInlineLimit: 8192,
    // Enable CSS code splitting
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        // Split vendor libraries into separate cacheable chunks
        // Vite 8+ / Rolldown requires manualChunks as a function
        manualChunks(id) {
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/three') || id.includes('node_modules/@react-three')) {
            return 'vendor-three';
          }
          if (id.includes('node_modules/gsap')) {
            return 'vendor-gsap';
          }
          if (id.includes('node_modules/lenis')) {
            return 'vendor-lenis';
          }
        },
      },
    },
  },
  // Use Vite 8's native oxc transform — drop console/debugger in production
  oxc: {
    transform: {
      define: process.env.NODE_ENV === 'production'
        ? { 'console.log': '(() => {})' }
        : {},
    },
  },
})
