import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  root: '.',
  base: './',
  server: {
    port: parseInt(process.env.PORT || '5173'),
    strictPort: false,
    host: true,
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        // The mobile app (Capacitor + web demo) — unchanged.
        main: resolve(__dirname, 'index.html'),
        // The desktop employer website — shares src/services + Supabase.
        employer: resolve(__dirname, 'employer.html'),
      },
    },
  },
})
