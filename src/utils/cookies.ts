// ─────────────────────────────────────────────────────────────
// Cookie 读写封装
//
// 用于持久化「加密后的 token 密文」（见 ./crypto 与 ./http/token）。
// 注意：本封装读写的是前端可见的普通 Cookie（非 HttpOnly），因此存放的内容
// 必须是密文，绝不允许写入明文 token。
// ─────────────────────────────────────────────────────────────

export interface CookieOptions {
  /** 有效期天数；不传则为会话级 Cookie（关闭浏览器即失效） */
  maxAgeDays?: number
  /** 可访问路径，默认 '/'（整个应用可读） */
  path?: string
  /** 同站策略，默认 Lax，兼顾可用性与基础 CSRF 防护 */
  sameSite?: 'Lax' | 'Strict' | 'None'
  /**
   * 是否仅 HTTPS 传输。默认按当前协议自动判断：
   * 本地 http 开发必须为 false，否则 Cookie 不会被保存；线上 https 自动为 true。
   */
  secure?: boolean
}

/** 写入 Cookie（值统一 encodeURIComponent，兼容 base64 密文中的特殊字符） */
export function setCookie(name: string, value: string, options: CookieOptions = {}): void {
  const {
    maxAgeDays,
    path = '/',
    sameSite = 'Lax',
    secure = window.location.protocol === 'https:',
  } = options

  const parts = [
    `${encodeURIComponent(name)}=${encodeURIComponent(value)}`,
    `path=${path}`,
    `samesite=${sameSite}`,
  ]
  if (typeof maxAgeDays === 'number') {
    parts.push(`max-age=${Math.round(maxAgeDays * 24 * 60 * 60)}`)
  }
  if (secure) {
    parts.push('secure')
  }
  document.cookie = parts.join('; ')
}

/** 读取 Cookie；不存在返回 null（自动 decodeURIComponent） */
export function getCookie(name: string): string | null {
  const target = `${encodeURIComponent(name)}=`
  for (const segment of document.cookie.split('; ')) {
    if (segment.startsWith(target)) {
      return decodeURIComponent(segment.slice(target.length))
    }
  }
  return null
}

/** 删除 Cookie（需与写入时相同的 path 才能正确清除） */
export function removeCookie(name: string, path = '/'): void {
  document.cookie = `${encodeURIComponent(name)}=; path=${path}; max-age=0; samesite=Lax`
}
