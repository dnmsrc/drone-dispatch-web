// ─────────────────────────────────────────────────────────────
// 统一 HTTP 请求层（基于 axios，HttpOnly Cookie 鉴权）
//
// 能力：
//   1) 实例统一 baseURL / 超时，配置来源 src/config/env（VITE_API_BASE_URL / VITE_API_TIMEOUT）
//   2) withCredentials: true —— 浏览器自动携带后端下发的 HttpOnly 鉴权 Cookie；
//      该 Cookie 对 JS 不可见、不可复制，从根上杜绝「复制 token 绕过登录」，
//      前端因此不保存 token、也不手动注入 Authorization
//   3) 响应拦截：自动剥离后端 Result{ code, message, data } 信封，成功直接拿到 data
//   4) 统一异常：业务码失败 / HTTP 错误 / 超时 / 断网 / 取消，全部归一为 HttpError，
//      除主动取消与 silent 外，默认用 Element Plus 的 ElMessage 在顶部弹错误提示
//   5) 401 统一回调可注册的未授权处理器（供后续 auth store / 路由跳转接入）；
//      登录态清理由后端登出接口让 Cookie 过期，前端无法也无需手动删除 HttpOnly Cookie
//
// 常规调用只需要「接口地址 + 参数」两个入参；需要自定义 header / 超时 / 静默等时，
// 把 axios 原生配置与业务开关作为第三个参数传入。
//
//   import http from '@/utils/http'
//   const page = await http.get('/order/page', { page: 1, size: 10 })
//   await http.post('/order', form)
//   await http.put('/order/1', form)
//   await http.delete('/order', { ids: [1, 2] })
//   // 第三个参数：自定义 header、静默、单独超时等
//   await http.post('/upload', data, { headers: { 'X-Trace-Id': 't-1' }, timeout: 30000, silent: true })
// ─────────────────────────────────────────────────────────────
import axios, { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { ElMessage } from 'element-plus'
import { env } from '@/config/env'
import { HttpError } from './error'
import {
  SUCCESS_CODE,
  UNAUTHORIZED_CODE,
  type ApiResult,
  type HttpRequestConfig,
} from './types'

/* ───────────────────────── 实例 ───────────────────────── */

const instance = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: env.apiTimeout,
  // 跨域 XHR 也携带 Cookie；开发期走 vite proxy 同源、生产 Nginx 反代同源，均会自动带上
  withCredentials: true,
})

/* ───────────────────────── 工具 ───────────────────────── */

/** 顶部错误提示（grouping 自动合并短时间内的相同消息，避免并发报错刷屏） */
function notifyError(message: string): void {
  ElMessage({ type: 'error', message, grouping: true, duration: 3000 })
}

/** 判断一个值是否为后端统一信封结构 */
function isApiResult(value: unknown): value is ApiResult {
  return (
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    'message' in value
  )
}

/** 按配置的成功码判定业务是否成功（默认 200，可被 config.successCode 覆盖） */
function isBusinessSuccess(code: number, rule?: number | number[]): boolean {
  const expected = rule ?? SUCCESS_CODE
  return Array.isArray(expected) ? expected.includes(code) : code === expected
}

/** HTTP 状态码到中文文案的兜底映射（后端没给 message 时用） */
function httpStatusText(status: number): string {
  const map: Record<number, string> = {
    400: '请求参数错误',
    401: '登录已过期，请重新登录',
    403: '没有访问权限',
    404: '请求的接口不存在',
    405: '请求方法不被允许',
    500: '服务器繁忙，请稍后再试',
    502: '网关异常，请稍后再试',
    503: '服务暂不可用，请稍后再试',
    504: '网关超时，请稍后再试',
  }
  return map[status] ?? `请求失败（${status}）`
}

/* ─────────────────────── 401 未授权处理 ─────────────────────── */

/** 外部可注册的未授权回调（auth store / 路由守卫接入后负责跳登录页） */
let unauthorizedHandler: (() => void) | null = null

/** 注册 401 处理器；注册后默认的顶部提示让位给该处理器，避免重复打扰 */
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler
}

/** 并发请求同时 401 时只处理一次，2 秒后解锁 */
let unauthorizedPending = false

function handleUnauthorized(config: InternalAxiosRequestConfig, message?: string): void {
  // HttpOnly Cookie 前端无法删除：登录态失效以浏览器内 Cookie 自然过期或登出接口为准，
  // 这里只负责「跳登录 / 提示」，不再做前端清 token。
  if (unauthorizedPending) return
  unauthorizedPending = true
  window.setTimeout(() => {
    unauthorizedPending = false
  }, 2000)

  if (unauthorizedHandler) {
    unauthorizedHandler()
    return
  }
  if (!config.silent) {
    notifyError(message || '登录已过期，请重新登录')
  }
}

/* ───────────────────────── 响应拦截 ───────────────────────── */

// 成功分支：HTTP 2xx。在此剥离信封、把业务失败也转成 reject。
instance.interceptors.response.use(
  // 返回 any：本拦截器在运行时把 AxiosResponse 改写成「信封里的 data」，
  // 与 axios 拦截器的 AxiosResponse 签名不一致；业务侧真实类型由 request<T> 泛型保证
  (response: AxiosResponse): any => {
    const config = response.config
    const payload = response.data

    // 非信封结构（Blob / 纯文本 / 裸数组等）直接原样返回
    if (!isApiResult(payload)) {
      return payload
    }

    const { code, message, data } = payload

    if (isBusinessSuccess(code, config.successCode)) {
      return data
    }

    // 业务码 401：按未授权统一处理
    if (code === UNAUTHORIZED_CODE) {
      handleUnauthorized(config, message)
      throw new HttpError(message, { kind: 'business', code, raw: payload })
    }

    if (!config.silent) {
      notifyError(message)
    }
    throw new HttpError(message, { kind: 'business', code, raw: payload })
  },
  (error: unknown) => {
    // 主动取消：不弹提示，直接归一后抛出
    if (axios.isCancel(error)) {
      throw new HttpError('请求已取消', { kind: 'cancel', cause: error })
    }

    const err = error as AxiosError<ApiResult>
    const config = (err.config ?? {}) as InternalAxiosRequestConfig

    // 超时
    if (err.code === 'ECONNABORTED') {
      const message = '请求超时，请稍后重试'
      if (!config.silent) notifyError(message)
      throw new HttpError(message, { kind: 'timeout', cause: err })
    }

    // 没有响应：断网 / 跨域 / 后端未启动
    if (!err.response) {
      const message = '网络异常，请检查网络连接'
      if (!config.silent) notifyError(message)
      throw new HttpError(message, { kind: 'network', cause: err })
    }

    // HTTP 状态码非 2xx
    const status = err.response.status
    const body = err.response.data
    const message = (isApiResult(body) ? body.message : '') || httpStatusText(status)

    if (status === UNAUTHORIZED_CODE) {
      handleUnauthorized(config, message)
      throw new HttpError(message, { kind: 'http', code: status, raw: body, cause: err })
    }

    if (!config.silent) {
      notifyError(message)
    }
    throw new HttpError(message, { kind: 'http', code: status, raw: body, cause: err })
  },
)

/* ───────────────────────── 方法出口 ───────────────────────── */

/**
 * 统一 request：响应拦截器已在运行时把 AxiosResponse 解包成信封里的 data，
 * 但 axios 的静态类型仍按响应对象推断，故这里显式断言为业务类型 T。
 */
function request<T>(config: HttpRequestConfig): Promise<T> {
  return instance.request(config) as Promise<T>
}

/** GET：第二参为 query 参数 */
export function get<T = unknown>(
  url: string,
  params?: Record<string, unknown>,
  config: HttpRequestConfig = {},
): Promise<T> {
  return request<T>({ ...config, url, method: 'GET', params })
}

/** POST：第二参为请求体 */
export function post<T = unknown>(
  url: string,
  data?: unknown,
  config: HttpRequestConfig = {},
): Promise<T> {
  return request<T>({ ...config, url, method: 'POST', data })
}

/** PUT：第二参为请求体 */
export function put<T = unknown>(
  url: string,
  data?: unknown,
  config: HttpRequestConfig = {},
): Promise<T> {
  return request<T>({ ...config, url, method: 'PUT', data })
}

/**
 * DELETE：第二参默认为 query 参数（批量删除常用 ids）；
 * 若后端要求用请求体传参，在第三参 config 里写 { data: {...} }。
 * （delete 是 JS 保留字，命名导出用 del，默认导出对象上保留 http.delete 写法。）
 */
export function del<T = unknown>(
  url: string,
  params?: Record<string, unknown>,
  config: HttpRequestConfig = {},
): Promise<T> {
  return request<T>({ ...config, url, method: 'DELETE', params })
}

/** 默认导出：四种方法 + 原始 request，业务侧推荐 `import http from '@/utils/http'` */
const http = {
  get,
  post,
  put,
  delete: del,
  request,
}

export default http
export { HttpError } from './error'
export type { ApiResult, HttpErrorKind, HttpRequestConfig, RequestOptions } from './types'
