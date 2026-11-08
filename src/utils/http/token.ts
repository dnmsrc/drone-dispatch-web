// ─────────────────────────────────────────────────────────────
// 访问令牌（token）加密持久化
//
// 持久化的是【密文】而非明文：写入前经 AES-256-GCM 加密（引擎见 ../crypto），
// 存放在普通 Cookie（见 ../cookies），读取时解密。
// 因此即便有人复制本机 Cookie，拿到的也只是密文，且密钥派生绑定当前 origin，
// 脱离本站环境无法解密，普通手段无法还原出可用 token。
//
// 安全边界：纯前端方案防的是「随手复制密文到别处使用」，不抵御能调试本站 JS 的
// 专业攻击者；后端 HttpOnly Cookie 仍是最终防线（见 ../crypto 顶部说明）。
// ─────────────────────────────────────────────────────────────
import { getCookie, removeCookie, setCookie } from '../cookies'
import { cryptoProvider } from '../crypto'

/** token Cookie 名 */
const TOKEN_COOKIE = 'skyshow_admin_token'

/** token 有效期（天），写入时作为 Cookie max-age */
const TOKEN_MAX_AGE_DAYS = 7

/** 加密后持久化 token；空串视为清除 */
export async function setToken(token: string): Promise<void> {
  if (!token) {
    clearToken()
    return
  }
  const encrypted = await cryptoProvider.encrypt(token)
  setCookie(TOKEN_COOKIE, encrypted, { maxAgeDays: TOKEN_MAX_AGE_DAYS })
}

/** 读取并解密 token；不存在或解密失败（密文损坏/跨环境）返回空串 */
export async function getToken(): Promise<string> {
  const encrypted = getCookie(TOKEN_COOKIE)
  if (!encrypted) return ''
  const plain = await cryptoProvider.decrypt(encrypted)
  return plain ?? ''
}

/** 清除 token（登出 / 401 登录失效时调用） */
export function clearToken(): void {
  removeCookie(TOKEN_COOKIE)
}
