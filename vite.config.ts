import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// 正式版管理后台：固定开发端口，避开原型工程（8080 / 8090 / 5173）与本机 8081/8082 服务
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 8091,
    strictPort: true,
  },
})
