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

/** 经纬度对（WGS-84，场地坐标统一按此坐标系存储） */
export interface LngLat {
  lng: number
  lat: number
}

/**
 * 解析「经度,纬度」字符串为经纬度对象；非法时回退到传入的兜底值。
 * 用于解析高德默认中心点等 env 配置。
 */
function asLngLat(value: string | undefined, fallback: LngLat): LngLat {
  if (!value) return fallback
  const [lngRaw, latRaw] = value.split(',')
  const lng = Number(lngRaw)
  const lat = Number(latRaw)
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return fallback
  return { lng, lat }
}

export const env = {
  /** 应用品牌名 */
  appName: import.meta.env.VITE_APP_NAME || '无人机 SkyShow',
  /** 管理后台标题 */
  appTitle: import.meta.env.VITE_APP_TITLE || '无人机 SkyShow 派单管理后台',
  /** 页脚品牌文案（登录页底部等品牌展示位） */
  appFooter: import.meta.env.VITE_APP_FOOTER || '无人机 SkyShow · 编队灯光表演预约派单平台',
  /** 后端接口基础地址 */
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || '/api',
  /** 请求超时（毫秒） */
  apiTimeout: asNumber(import.meta.env.VITE_API_TIMEOUT, 15000),
  /** 是否开启组件测试场 */
  enableDevPanel: asBool(import.meta.env.VITE_ENABLE_DEV_PANEL, false),
  /** 高德 Web 端 JS API Key（空串表示未配置，地图组件降级为手动录入） */
  amapKey: import.meta.env.VITE_AMAP_KEY || '',
  /** 高德安全密钥 jscode（2021-12 后新建 Key 需配合使用；可空） */
  amapSecurityCode: import.meta.env.VITE_AMAP_SECURITY_CODE || '',
  /** 高德选点默认中心（WGS-84，组件内部按需转 GCJ-02 再喂给地图） */
  amapDefaultCenter: asLngLat(import.meta.env.VITE_AMAP_DEFAULT_CENTER, {
    lng: 120.2,
    lat: 30.25,
  }),
} as const

/** 高德地图是否可用：仅当配置了 JS API Key 时才尝试加载，否则走手动降级 */
export function isAmapEnabled(): boolean {
  return env.amapKey.trim().length > 0
}
