import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig, loadEnv } from 'vite'

// ─────────────────────────────────────────────────────────────
// 环境变量与主题切换
//
// 配置来源（同名 key 的优先级）：shell 环境变量 > .env.[mode].local > .env.[mode] > .env
//   - 通用配置（标题、接口地址、端口、代理等）写在根目录 .env / .env.development / .env.production
//   - 本机私有覆盖放 *.local（已被 .gitignore 忽略，不进 Git）
//
// 主题（构建期换肤）：
//   所有样式对主题包的引用都走 `@theme` 别名（见 resolve.alias），
//   别名实际指向 src/styles/themes/<APP_THEME>。默认主题为 default；
//   新增主题只需在 src/styles/themes/ 下建一个与 default 结构完全平行的文件夹。
//   主题名推荐在 .env 里用 APP_THEME 指定，也可用 shell 临时覆盖：
//     Windows PowerShell : $env:APP_THEME="dark"; pnpm build
//     Windows Git Bash   : APP_THEME=dark pnpm build
//
// 说明：Element Plus 的 SCSS 源码变量是编译期注入的，因此本架构的
// 换肤为「构建期切换」，改主题名后需重新 build，不支持不刷新的运行时切换。
// ─────────────────────────────────────────────────────────────
export default defineConfig(({ mode }) => {
  const root = fileURLToPath(new URL('.', import.meta.url))

  // 第三参传 ''：加载全部变量，包含无 VITE_ 前缀的构建侧变量
  // （APP_THEME / DEV_SERVER_PORT / DEV_PROXY_TARGET），它们不会进客户端产物。
  const env = loadEnv(mode, root, '')

  // 主题：shell 环境变量优先（兼容原有临时换肤写法），其次 .env，最后 default
  const appTheme = process.env.APP_THEME ?? env.APP_THEME ?? 'default'
  // dev 端口：shell 覆盖优先，其次 .env，最后回退 8091
  const devPort = Number(process.env.DEV_SERVER_PORT ?? env.DEV_SERVER_PORT) || 8091
  // dev 代理目标：本地后端 drone-dispatch-server（默认 8080）
  const proxyTarget = env.DEV_PROXY_TARGET || 'http://localhost:8080'

  return {
    plugins: [vue()],
    resolve: {
      // @ → src，组件/样式/路由统一用 @ 前缀引用；
      // @theme → 当前生效的主题包（SCSS 与 TS 均可按此前缀引用）
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        '@theme': fileURLToPath(new URL(`./src/styles/themes/${appTheme}`, import.meta.url)),
      },
    },
    server: {
      // 固定开发端口，避开原型工程（8080 / 8090 / 5173）与本机 8081/8082 服务
      port: devPort,
      strictPort: true,
      proxy: {
        // 开发环境把 /api 前缀请求转发到本地后端，规避浏览器跨域；
        // 后端接口本身即 /api 前缀，这里不再 rewrite 去掉前缀。
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },
  }
})
