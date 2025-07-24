import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  preview: {
    port: process.env.PORT || 4173,
    host: '0.0.0.0',
    allowedHosts: ['healthcheck.railway.app', 'medical-pos-production.up.railway.app'],
  },
  build: {
    outDir: "dist",
    sourcemap: false, // Disable sourcemaps in production for better performance
    chunkSizeWarningLimit: 600, // Increase chunk size warning limit
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          ui: ['@headlessui/react', '@heroicons/react'],
          utils: ['axios', 'date-fns'],
        },
      },
    },
  },
});
