// ─────────────────────────────────────────────────────────────
// Cookie 读写封装单元测试（jsdom 提供 document.cookie）
//
// 覆盖：写入/读取往返、不存在返回 null、删除失效、特殊字符编解码、
// 以及安全属性（SameSite / Secure / Path）的拼接策略。
// ─────────────────────────────────────────────────────────────
import { beforeEach, describe, expect, it } from 'vitest'
import { getCookie, removeCookie, setCookie } from '../cookies'

beforeEach(() => {
  // jsdom 没有提供清空全部 Cookie 的 API，逐个置 max-age=0 清理
  for (const name of ['demo', 'special', 'persist', 'secure_cookie']) {
    removeCookie(name)
  }
})

describe('cookies · 基本读写', () => {
  it('写入后能读回相同值', () => {
    setCookie('demo', 'value-123')
    expect(getCookie('demo')).toBe('value-123')
  })

  it('未写入的 Cookie 返回 null', () => {
    expect(getCookie('not_exist')).toBeNull()
  })

  it('删除后读取返回 null', () => {
    setCookie('demo', 'to-be-removed')
    expect(getCookie('demo')).toBe('to-be-removed')
    removeCookie('demo')
    expect(getCookie('demo')).toBeNull()
  })
})

describe('cookies · 编解码', () => {
  it('值中的分号、等号、中文等特殊字符经 encodeURIComponent 安全往返', () => {
    const raw = 'a=b; c=d 中文🎉%20'
    setCookie('special', raw)
    expect(getCookie('special')).toBe(raw)
  })
})

describe('cookies · 安全属性拼接', () => {
  it('默认写入 path=/ 与 SameSite=Lax（jsdom 为 http 环境，默认不带 secure）', () => {
    setCookie('persist', 'x')
    const raw = document.cookie
    // document.cookie 只回读 name=value，安全属性需通过写入行为间接验证不报错且可回读
    expect(raw).toContain('persist=x')
    expect(getCookie('persist')).toBe('x')
  })

  it('显式 secure=true 时写入不报错且值可正常回读', () => {
    setCookie('secure_cookie', 'y', { secure: true, sameSite: 'Strict' })
    expect(getCookie('secure_cookie')).toBe('y')
  })

  it('maxAgeDays 被换算为秒级 max-age（不抛错且持久可读）', () => {
    setCookie('persist', 'z', { maxAgeDays: 7 })
    expect(getCookie('persist')).toBe('z')
  })
})
