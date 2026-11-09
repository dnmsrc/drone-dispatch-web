// ─────────────────────────────────────────────────────────────
// 登录态 store · 单元测试
//
// 通过 vi.mock 隔离网络与加密 Cookie：
//   - @/api/auth：mock login / fetchCurrentUser 的返回与抛错；
//   - @/utils/http：mock setToken / clearToken，只验证调用契约，不碰真实加密。
// 聚焦 store 自身状态机：登录写态、/me 恢复、401 清态、登出清理与 isAdmin/displayName 派生。
// ─────────────────────────────────────────────────────────────
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const loginMock = vi.fn()
const fetchCurrentUserMock = vi.fn()
const setTokenMock = vi.fn().mockResolvedValue(undefined)
const clearTokenMock = vi.fn()

vi.mock('@/api/auth', () => ({
  login: (...args: unknown[]) => loginMock(...args),
  fetchCurrentUser: (...args: unknown[]) => fetchCurrentUserMock(...args),
}))

vi.mock('@/utils/http', () => ({
  setToken: (...args: unknown[]) => setTokenMock(...args),
  clearToken: () => clearTokenMock(),
}))

import { ADMIN_INFO_KEY, useAuthStore } from '../auth'

/** 构造一个后端 AdminUserInfo 同构对象 */
function adminInfo(
  overrides: Partial<{ id: number; username: string; realName: string; role: string }> = {},
) {
  return {
    id: 1,
    username: 'admin',
    realName: '系统管理员',
    role: 'ADMIN',
    ...overrides,
  }
}

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
  vi.clearAllMocks()
})

describe('auth store · 登录 login', () => {
  it('登录成功：持久化 token、写入登录人并落 localStorage', async () => {
    const user = adminInfo()
    loginMock.mockResolvedValue({
      token: 'jwt-abc',
      tokenType: 'Bearer',
      expiresInMinutes: 720,
      user,
    })
    const auth = useAuthStore()

    await auth.login({ username: 'admin', password: 'admin123' })

    expect(loginMock).toHaveBeenCalledWith({ username: 'admin', password: 'admin123' })
    expect(setTokenMock).toHaveBeenCalledWith('jwt-abc')
    expect(auth.admin).toEqual(user)
    expect(JSON.parse(localStorage.getItem(ADMIN_INFO_KEY) || 'null')).toEqual(user)
    expect(auth.isAdmin).toBe(true)
  })

  it('操作员角色 isAdmin 为 false', async () => {
    loginMock.mockResolvedValue({
      token: 'jwt-op',
      tokenType: 'Bearer',
      expiresInMinutes: 720,
      user: adminInfo({ id: 2, username: 'operator', realName: '调度操作员', role: 'OPERATOR' }),
    })
    const auth = useAuthStore()
    await auth.login({ username: 'operator', password: 'x' })
    expect(auth.isAdmin).toBe(false)
  })

  it('登录失败：错误向上抛且不写登录态、不持久化 token', async () => {
    loginMock.mockRejectedValue(new Error('用户名或密码错误'))
    const auth = useAuthStore()

    await expect(auth.login({ username: 'admin', password: 'bad' })).rejects.toThrow(
      '用户名或密码错误',
    )
    expect(setTokenMock).not.toHaveBeenCalled()
    expect(auth.admin).toBeNull()
    expect(localStorage.getItem(ADMIN_INFO_KEY)).toBeNull()
  })
})

describe('auth store · 恢复登录态 restore', () => {
  it('无本地登录痕迹时直接返回 false 且不请求 /me', async () => {
    const auth = useAuthStore()
    const ok = await auth.restore()
    expect(ok).toBe(false)
    expect(fetchCurrentUserMock).not.toHaveBeenCalled()
  })

  it('有本地痕迹且 /me 成功：校正为后端返回的用户并返回 true', async () => {
    // 模拟刷新前残留的本地信息
    localStorage.setItem(ADMIN_INFO_KEY, JSON.stringify(adminInfo({ realName: '旧名字' })))
    const fresh = adminInfo({ realName: '系统管理员' })
    fetchCurrentUserMock.mockResolvedValue(fresh)
    const auth = useAuthStore()

    const ok = await auth.restore()

    expect(ok).toBe(true)
    expect(fetchCurrentUserMock).toHaveBeenCalledTimes(1)
    expect(auth.admin).toEqual(fresh)
  })

  it('/me 抛 401：清空残留登录态并返回 false', async () => {
    localStorage.setItem(ADMIN_INFO_KEY, JSON.stringify(adminInfo()))
    fetchCurrentUserMock.mockRejectedValue(new Error('登录凭证无效或已过期'))
    const auth = useAuthStore()

    const ok = await auth.restore()

    expect(ok).toBe(false)
    expect(auth.admin).toBeNull()
    expect(localStorage.getItem(ADMIN_INFO_KEY)).toBeNull()
  })
})

describe('auth store · 登出 logout 与派生 displayName', () => {
  it('logout 同时清除 token 与本地登录人', async () => {
    loginMock.mockResolvedValue({
      token: 'jwt',
      tokenType: 'Bearer',
      expiresInMinutes: 720,
      user: adminInfo(),
    })
    const auth = useAuthStore()
    await auth.login({ username: 'admin', password: 'admin123' })
    expect(auth.admin).not.toBeNull()

    auth.logout()

    expect(clearTokenMock).toHaveBeenCalledTimes(1)
    expect(auth.admin).toBeNull()
    expect(localStorage.getItem(ADMIN_INFO_KEY)).toBeNull()
  })

  it('displayName 优先 realName，缺失时回退 username，再兜底「管理员」', () => {
    const auth = useAuthStore()
    expect(auth.displayName).toBe('管理员')

    auth.setAdmin(adminInfo({ realName: '', username: 'operator' }))
    expect(auth.displayName).toBe('operator')

    auth.setAdmin(adminInfo({ realName: '张三', username: 'zhangsan' }))
    expect(auth.displayName).toBe('张三')
  })
})
