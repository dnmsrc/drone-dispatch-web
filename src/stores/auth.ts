// ─────────────────────────────────────────────────────────────
// 登录态 store —— 对接后端 JWT 鉴权（AuthController /api/auth）
//
// 职责划分：
//   - src/api/auth 负责发请求（login / fetchCurrentUser）；
//   - 本 store 只维护「当前登录人」状态、token 的加密持久化与登录态恢复。
//
// 持久化分两处：
//   - token：经 AES-256-GCM 加密后存 Cookie（utils/http/token，本地只有密文），
//     请求拦截器自动解密注入 Authorization: Bearer；
//   - 用户信息：存 localStorage 的 admin_info（键名沿用原型，供刷新时同步渲染，
//     真正的鉴权以后端 token 为准；restore 时再用 /auth/me 校正）。
// ─────────────────────────────────────────────────────────────
import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  fetchCurrentUser,
  login as loginRequest,
  type AdminUserInfo,
  type LoginPayload,
} from '@/api/auth'
import { clearToken, setToken } from '@/utils/http'

/** 后台账号信息，结构与后端 AdminUserInfo 对齐 */
export type AdminInfo = AdminUserInfo

/** 与原型一致的本地存储键（退出登录 / 401 失效时一并清除） */
export const ADMIN_INFO_KEY = 'admin_info'

function readStoredAdmin(): AdminInfo | null {
  try {
    return JSON.parse(localStorage.getItem(ADMIN_INFO_KEY) || 'null') as AdminInfo | null
  } catch {
    return null
  }
}

export const useAuthStore = defineStore('auth', () => {
  /** 当前登录人；初始读 localStorage，使刷新后首屏即可渲染（再由 restore 校正） */
  const admin = ref<AdminInfo | null>(readStoredAdmin())

  /** 仅管理员可执行的动作按钮显隐依据（退款审批、档期写操作等均读它） */
  const isAdmin = computed(() => admin.value?.role === 'ADMIN')

  /** 展示名：优先后端真实姓名，回退登录账号，最后兜底「管理员」 */
  const displayName = computed(() => admin.value?.realName || admin.value?.username || '管理员')

  /** 写入登录人并同步 localStorage */
  function setAdmin(info: AdminInfo): void {
    admin.value = info
    localStorage.setItem(ADMIN_INFO_KEY, JSON.stringify(info))
  }

  /** 清除登录人（localStorage）；token 的清理由调用方按需处理 */
  function clearAdmin(): void {
    admin.value = null
    localStorage.removeItem(ADMIN_INFO_KEY)
  }

  /**
   * 账号密码登录：调 /auth/login，成功后加密持久化 token、写入登录人。
   * 错误（账号密码错误、账号停用等）继续向上抛，由登录页自行提示。
   */
  async function login(payload: LoginPayload): Promise<void> {
    const result = await loginRequest(payload)
    await setToken(result.token)
    setAdmin(result.user)
  }

  /**
   * 刷新页面后恢复登录态：凭持久化 token 调 /auth/me 校正当前用户。
   * 无本地用户信息时直接判定未登录，不发请求；
   * token 失效会抛 401（请求层已清 token），这里再清空残留用户信息。
   * @returns 是否成功恢复登录态
   */
  async function restore(): Promise<boolean> {
    if (!readStoredAdmin()) return false
    try {
      const info = await fetchCurrentUser()
      setAdmin(info)
      return true
    } catch {
      clearAdmin()
      return false
    }
  }

  /** 退出登录：后端暂无登出接口（JWT 无状态），前端清除本地 token 与登录人即可 */
  function logout(): void {
    clearToken()
    clearAdmin()
  }

  return { admin, isAdmin, displayName, setAdmin, clearAdmin, login, restore, logout }
})
