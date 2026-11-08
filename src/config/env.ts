/**
 * 环境变量统一读取入口
 *
 * 业务代码一律从这里读环境配置，不要散落 import.meta.env.VITE_xxx：
 *   1) 集中提供默认值，某个变量漏配时应用也能正常启动；
 *   2) 把 .env 里的字符串统一转换成布尔 / 数字等真实类型；
 *   3) 将来接入服务端配置（如启动时拉取 /api/config/profile）只需改这一处。
 *
 * 注意：只有 VITE_ 前缀的变量才会进入 import.meta.env（客户端可读）；
 * 无 VITE_ 前缀的 APP_THEME / DEV_SERVER_PORT / DEV_PROXY_TARGET 只在
 * vite.config.ts 的 Node 侧使用，不会打进前端产物。
 */

/** 宽松布尔解析：'true' / '1' 视为开，其余（undefined / 'false' / '0' 等）视为关 */
function asBool(value: string | undefined, fallback = false): boolean {
  if (value === undefined) return fallback
  return value === 'true' || value === '1'
}

/** 数字解析：转换结果不是有限数时回退到默认值 */
function asNumber(value: string | undefined, fallback: number): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

export const env = {
  /** 应用品牌名 */
  appName: import.meta.env.VITE_APP_NAME || '星穹 SkyShow',
  /** 管理后台标题 */
  appTitle: import.meta.env.VITE_APP_TITLE || '星穹派单管理后台',
  /** 后端接口基础地址 */
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || '/api',
  /** 请求超时（毫秒） */
  apiTimeout: asNumber(import.meta.env.VITE_API_TIMEOUT, 15000),
  /** 是否开启组件测试场 */
  enableDevPanel: asBool(import.meta.env.VITE_ENABLE_DEV_PANEL, false),
} as const
