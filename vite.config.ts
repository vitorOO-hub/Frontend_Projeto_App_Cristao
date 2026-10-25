import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Porta fixa: o Flask só aceita a origem APP_ORIGIN=http://localhost:5173.
    port: 5173,
    strictPort: true,
    // Mesma origem também no desenvolvimento; o backend não tem CORS.
    proxy: { '/api': 'http://127.0.0.1:5000' },
  },
})
