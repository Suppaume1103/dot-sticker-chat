import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // src/config/fieldConfig.tsはbackend/src/config/fieldConfig.tsを正本として参照するため、
    // devサーバーのfs制限（プロジェクトルート外へのアクセス拒否）を緩めて../backendを許可する
    fs: {
      allow: ['..'],
    },
  },
})
