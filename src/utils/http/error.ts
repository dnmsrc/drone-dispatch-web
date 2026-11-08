// ─────────────────────────────────────────────────────────────
// 统一 HTTP 错误对象
//
// 请求层所有 reject 出来的错误都包装成 HttpError，业务侧 catch 后能稳定拿到
// kind（错误分类）/ code（业务码或 HTTP 状态码）/ raw（原始响应），
// 不用再去判断 axios 原始错误的各种形态。
// ─────────────────────────────────────────────────────────────
import type { HttpErrorKind } from './types'

export interface HttpErrorOptions {
  /** 错误分类 */
  kind: HttpErrorKind
  /** 业务码或 HTTP 状态码；取消 / 网络错误可能没有 */
  code?: number
  /** 原始响应体或错误数据，供调试或精细化处理 */
  raw?: unknown
  /** 被包装的原始错误，保留错误链 */
  cause?: unknown
}

export class HttpError extends Error {
  readonly kind: HttpErrorKind
  readonly code?: number
  readonly raw?: unknown

  constructor(message: string, options: HttpErrorOptions) {
    super(message)
    this.name = 'HttpError'
    this.kind = options.kind
    this.code = options.code
    this.raw = options.raw
    if (options.cause !== undefined) {
      ;(this as { cause?: unknown }).cause = options.cause
    }
  }
}
