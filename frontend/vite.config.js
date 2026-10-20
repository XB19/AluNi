import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// En développement, les appels /api et /files sont transmis au backend Spring Boot.
const backend = process.env.VITE_BACKEND ?? 'http://localhost:8080'
const proxy = {
  '/api': { target: backend, changeOrigin: true },
  '/files': { target: backend, changeOrigin: true },
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { proxy },
  preview: { proxy },
})
