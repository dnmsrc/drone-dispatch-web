// ─────────────────────────────────────────────────────────────
// 访问令牌（token）持久化
//
// 底层复用 ../storage 的安全 localStorage 封装；
// 登录成功后调 setToken，请求拦截器自动读取并注入鉴权头（见 ./index.ts），
// 登出或 401 失效时调 clearToken。
// 将来若改成 cookie 存储或刷新令牌机制，只改这一个文件。
// ─────────────────────────────────────────────────────────────
import { storage } from '../storage'

/** token 在 localStorage 的键名，带项目前缀避免与同域其它应用冲突 */
const TOKEN_KEY = 'skyshow_admin_token'

/** 读取访问令牌；不存在时返回空串 */
export function getToken(): string {
  return storage.get<string>(TOKEN_KEY) ?? ''
}

/** 持久化访问令牌 */
export function setToken(token: string): void {
  storage.set(TOKEN_KEY, token)
}

/** 清除访问令牌（登出 / 401 登录失效时调用） */
export function clearToken(): void {
  storage.remove(TOKEN_KEY)
}
