import react from '@vitejs/plugin-react'

export default {
  base: process.env.REPO_NAME,
  plugins: [
    react(),
  ],
}