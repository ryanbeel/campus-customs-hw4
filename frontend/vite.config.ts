import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// During development, forward API and image requests to the FastAPI backend.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
      '/images': 'http://localhost:8000',
    },
  },
})
