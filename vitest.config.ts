// ─────────────────────────────────────────────────────────────
// Vitest 单元测试配置
//
// 被测的 crypto / cookies / token 依赖 window.location 与 document.cookie，
// 因此测试环境固定为 jsdom，并显式锁定 url（origin），
// 让「密钥派生绑定 origin、跨环境无法解密」这一安全承诺可被确定性验证。
// ─────────────────────────────────────────────────────────────
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    environmentOptions: {
      jsdom: {
        // 与开发端口约定保持一致；固定 origin 保证测试可复现
        url: 'http://localhost:8091/',
      },
    },
    include: ['src/**/__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/utils/**/*.ts'],
      exclude: ['src/**/__tests__/**', 'src/utils/http/index.ts'],
    },
  },
})
