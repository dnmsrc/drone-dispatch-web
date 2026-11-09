// ─────────────────────────────────────────────────────────────
// HTTP 请求层类型契约
//
// 与后端 drone-dispatch-server 的统一信封 Result{ code, message, data } 对齐，
// 前端所有接口成功后拿到的都是剥掉信封后的 data（见 ./index.ts 响应拦截）。
//
// 鉴权：token 经 AES-256-GCM 加密后存于 Cookie（本地只有密文），请求拦截器
// 解密后注入 Authorization 头，详见 ./token 与 ../crypto。
// ─────────────────────────────────────────────────────────────
import type { AxiosRequestConfig } from 'axios'

/** 后端统一返回信封 */
export interface ApiResult<T = unknown> {
  /** 业务状态码，成功固定 200 */
  code: number
  /** 提示信息，失败时可直接用于顶部弹窗 */
  message: string
  /** 业务数据 */
  data: T
}

/** 业务成功约定码（server Result.success 固定返回 200） */
export const SUCCESS_CODE = 200

/** 未授权 / 登录失效码：HTTP 状态与业务信封共用 401 */
export const UNAUTHORIZED_CODE = 401

/** 错误来源分类，业务 catch 到 HttpError 后可按 kind 分流处理 */
export type HttpErrorKind =
  | 'business' // 后端正常响应但业务码非成功（如档期已满、状态不允许）
  | 'http' // HTTP 状态码非 2xx（404/500 等）
  | 'network' // 没收到响应：断网 / 跨域 / 后端未启动
  | 'timeout' // 请求超时
  | 'cancel' // 主动取消

/**
 * 业务级请求开关（axios 原生 config 之外的扩展字段）。
 * 下方通过 declare module 把这些字段并入 AxiosRequestConfig，
 * 因此可以直接放在请求方法的第三个参数里，和 headers/timeout 等原生配置一起传。
 */
export interface RequestOptions {
  /** 静默模式：true 时关闭统一的顶部错误弹窗，交给调用方自行处理（默认 false 自动提示） */
  silent?: boolean
  /** 自定义成功码：默认只认 200；特殊接口可传数组放宽判定 */
  successCode?: number | number[]
  /** 鉴权头字段名，默认 Authorization */
  tokenHeader?: string
  /** 是否携带 token，默认 true；登录等公开接口设 false 即不带鉴权头 */
  withToken?: boolean
  /**
   * 跳过全局 401 处理器：true 时即使返回 401 也不触发注册的未授权回调（不自动跳登录页），
   * 仅清理本地 token 后把错误抛给调用方自行处理。登录接口必传——密码错误返回业务 401，
   * 此时本就停在登录页，全局跳转反而会打断页面自己的错误提示。
   */
  skipAuthHandler?: boolean
}

// 模块增强：让 axios 的 config 类型认识上面的业务字段
declare module 'axios' {
  export interface AxiosRequestConfig {
    silent?: boolean
    successCode?: number | number[]
    tokenHeader?: string
    withToken?: boolean
    skipAuthHandler?: boolean
  }
}

/**
 * 完整请求配置 = axios 原生配置（headers / timeout / responseType / onUploadProgress…）
 * 叠加业务开关。业务需要自定义 header 等时，把它作为请求方法的第三参传入即可。
 */
export type HttpRequestConfig = AxiosRequestConfig
