import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// 正式版管理后台：固定开发端口，避开原型工程（8080 / 8090 / 5173）与本机 8081/8082 服务
export default defineConfig({
  plugins: [vue()],
  resolve: {
    // @ → src，组件/样式/路由统一用 @ 前缀引用
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 8091,
    strictPort: true,
  },
})
