// ─────────────────────────────────────────────────────────────
// 登录态 store（静态版）—— 对应原型 admin/src/store/auth.js
//
// 原型走 POST /admin/login 拿 { token, admin }，把 admin 存 localStorage
// `admin_info`；本页工程暂由 login 视图的演示账号逻辑完成登录，
// 登录成功后调用 setAdmin() 落同一键名，供角色控制读取（如退款审批
// 仅 ADMIN 可见）。localStorage 只在 action 内读写（SSR/测试友好），
// state 初始化时读一次。
// TODO(接入服务端): mockLogin 换成 POST /admin/login，token 走 setToken()
// （utils/http AES-GCM 加密 Cookie），admin 信息改由接口返回。
// ─────────────────────────────────────────────────────────────
import { ref } from 'vue'
import { defineStore } from 'pinia'

/** 后台账号（mock-server seed ADMINS 同构） */
export interface AdminInfo {
  username: string
  /** ADMIN 管理员 / OPERATOR 操作员 */
  role: string
  name: string
}

/** 与原型一致的本地存储键（退出登录时一并清除） */
export const ADMIN_INFO_KEY = 'admin_info'

function readStoredAdmin(): AdminInfo | null {
  try {
    return JSON.parse(localStorage.getItem(ADMIN_INFO_KEY) || 'null') as AdminInfo | null
  } catch {
    return null
  }
}

export const useAuthStore = defineStore('auth', () => {
  const admin = ref<AdminInfo | null>(readStoredAdmin())

  /** 演示账号 → 角色映射（mock-server seed ADMINS 原值） */
  const DEMO_ADMINS: Record<string, AdminInfo> = {
    admin: { username: 'admin', role: 'ADMIN', name: '系统管理员' },
    operator: { username: 'operator', role: 'OPERATOR', name: '调度操作员' },
  }

  /** 仅管理员可执行的动作按钮显隐依据（原型 auth.isAdmin 同款） */
  function isAdmin(): boolean {
    return admin.value?.role === 'ADMIN'
  }

  /** 登录成功写入登录态（真接口即 POST /admin/login 响应里的 admin 字段） */
  function setAdmin(info: AdminInfo): void {
    admin.value = info
    localStorage.setItem(ADMIN_INFO_KEY, JSON.stringify(info))
  }

  /** 按演示账号写登录态；未知账号返回 false（接入服务端后移除） */
  function loginAs(username: string): boolean {
    const info = DEMO_ADMINS[username]
    if (!info) return false
    setAdmin(info)
    return true
  }

  /** 退出登录清空登录态（token 清理由调用方 clearToken() 负责） */
  function logout(): void {
    admin.value = null
    localStorage.removeItem(ADMIN_INFO_KEY)
  }

  return { admin, isAdmin, setAdmin, loginAs, logout }
})
