import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// ─────────────────────────────────────────────────────────────
// 主题切换（构建期换肤）
//
// 所有样式对主题包的引用都走 `@theme` 别名（见 resolve.alias），
// 别名实际指向 src/styles/themes/<APP_THEME>。
// 默认主题为 default；新增主题只需在 src/styles/themes/ 下建一个
// 与 default 结构完全平行的文件夹，然后构建时指定：
//
//   Windows PowerShell : $env:APP_THEME="dark"; pnpm build
//   Windows Git Bash   : APP_THEME=dark pnpm build
//
// 说明：Element Plus 的 SCSS 源码变量是编译期注入的，因此本架构的
// 换肤为「构建期切换」，改主题名后需重新 build，不支持不刷新的运行时切换。
// ─────────────────────────────────────────────────────────────
const APP_THEME = process.env.APP_THEME ?? 'default'

// 正式版管理后台：固定开发端口，避开原型工程（8080 / 8090 / 5173）与本机 8081/8082 服务
export default defineConfig({
  plugins: [vue()],
  resolve: {
    // @ → src，组件/样式/路由统一用 @ 前缀引用；
    // @theme → 当前生效的主题包（SCSS 与 TS 均可按此前缀引用）
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@theme': fileURLToPath(new URL(`./src/styles/themes/${APP_THEME}`, import.meta.url)),
    },
  },
  server: {
    port: 8091,
    strictPort: true,
  },
})
