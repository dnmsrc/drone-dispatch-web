/// <reference types="vite/client" />

/**
 * 自定义环境变量类型声明
 *
 * 只声明 VITE_ 前缀、会进客户端产物的变量；
 * 无 VITE_ 前缀的构建侧变量（APP_THEME / DEV_SERVER_PORT / DEV_PROXY_TARGET）
 * 只在 vite.config.ts 的 Node 侧读取，不在此声明。
 *
 * vite/client 已内置 MODE / BASE_URL / DEV / PROD / SSR 等，
 * 这里通过 interface 声明合并补充业务变量。
 */
interface ImportMetaEnv {
  /** 应用品牌名（登录页 / 页脚等品牌展示位） */
  readonly VITE_APP_NAME: string
  /** 管理后台标题（侧边栏 Logo、浏览器标签页、index.html 初始标题） */
  readonly VITE_APP_TITLE: string
  /** 后端接口基础地址（请求层统一前缀） */
  readonly VITE_API_BASE_URL: string
  /** 请求超时时间（毫秒） */
  readonly VITE_API_TIMEOUT: string
  /** 是否注册组件测试场 dev 路由 / 菜单 */
  readonly VITE_ENABLE_DEV_PANEL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
