
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Vercel deploys to root /, GitHub Pages deploys to /Student.Bus/
  base: process.env.GITHUB_ACTIONS ? '/Student.Bus/' : '/',
})
