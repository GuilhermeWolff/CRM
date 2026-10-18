import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// O frontend fala com a API em http://127.0.0.1:8000.
// Em desenvolvimento usamos proxy: assim não há problema de CORS.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
})
