// ─────────────────────────────────────────────────────────────
// token 加密持久化 · 集成测试
//
// 串联 crypto（加密）与 cookies（持久化）两层，验证对外契约：
//   1. setToken 后 Cookie 中只存密文，不含明文 token；
//   2. getToken 解密回原值；
//   3. 空串入参等同清除；
//   4. clearToken 后无法再读取；
//   5. Cookie 被外部篡改为非法密文时，getToken 安全返回空串而不抛异常。
// ─────────────────────────────────────────────────────────────
import { beforeEach, describe, expect, it } from 'vitest'
import { getCookie } from '../cookies'
import { clearToken, getToken, setToken } from '../http/token'

const TOKEN_COOKIE = 'skyshow_admin_token'

beforeEach(() => {
  clearToken()
})

describe('token · 加密持久化集成', () => {
  it('setToken 后 getToken 能解密回原始 token', async () => {
    const raw = 'jwt-eyJhbGciOiJIUzI1NiJ9.payload.sig'
    await setToken(raw)
    expect(await getToken()).toBe(raw)
  })

  it('持久化到 Cookie 的是密文而非明文', async () => {
    const raw = 'PLAINTEXT_TOKEN_SHOULD_NOT_LEAK'
    await setToken(raw)
    const stored = getCookie(TOKEN_COOKIE)
    expect(stored).toBeTruthy()
    expect(stored).not.toContain(raw)
    // 密文是 crypto 模块定义的结构化 JSON
    expect(() => JSON.parse(stored as string)).not.toThrow()
  })

  it('无 token 时 getToken 返回空串', async () => {
    expect(await getToken()).toBe('')
  })

  it('setToken 传空串等价于清除 token', async () => {
    await setToken('some-token')
    expect(await getToken()).toBe('some-token')
    await setToken('')
    expect(await getToken()).toBe('')
    expect(getCookie(TOKEN_COOKIE)).toBeNull()
  })

  it('clearToken 后无法再读取', async () => {
    await setToken('to-clear')
    clearToken()
    expect(getCookie(TOKEN_COOKIE)).toBeNull()
    expect(await getToken()).toBe('')
  })

  it('Cookie 被篡改为非法密文时 getToken 安全降级为空串', async () => {
    await setToken('real-token')
    // 直接覆写 Cookie，模拟本地篡改
    document.cookie = `${TOKEN_COOKIE}=tampered-garbage; path=/`
    await expect(getToken()).resolves.toBe('')
  })
})
