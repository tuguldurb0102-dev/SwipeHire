import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

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
  },
})
