// ─────────────────────────────────────────────────────────────
// AES-256-GCM 加密引擎单元测试
//
// 测试重点围绕该模块的安全契约，而非实现细节：
//   1. 加解密回环一致；
//   2. 持久化产物是密文（不泄露明文、结构完整）；
//   3. 每次加密使用随机 IV（相同明文密文不同但均可解）；
//   4. GCM 认证：密文/IV/salt 被篡改一律解密失败；
//   5. 非法输入（非 JSON、缺字段、空串）安全降级为 null，不抛异常；
//   6. origin 绑定：密文脱离当前站点后无法解密（核心防复制承诺）。
// ─────────────────────────────────────────────────────────────
import { describe, expect, it, vi } from 'vitest'
import { cryptoProvider } from '../crypto'

/** 从序列化密文中解析结构，供篡改 / 结构断言使用 */
function parseBlob(payload: string): {
  v: unknown
  alg: unknown
  kid: unknown
  salt: string
  iv: string
  data: string
} {
  return JSON.parse(payload)
}

/** 翻转 base64 字符串中的若干字节（经序列化往返），用于模拟密文被篡改 */
function tamperBase64(value: string): string {
  const chars = value.split('')
  const last = chars[chars.length - 1]
  // 替换最后一个字符为确定的不同值，保证改动稳定可复现
  chars[chars.length - 1] = last === 'A' ? 'B' : 'A'
  return chars.join('')
}

describe('cryptoProvider · AES-256-GCM 基本契约', () => {
  it('加解密回环一致，解密结果与原始明文完全相同', async () => {
    const plain = 'eyJhbGciOiJIUzI1NiJ9.payload.signature-token-123456'
    const encrypted = await cryptoProvider.encrypt(plain)
    expect(encrypted).not.toBe(plain)
    const decrypted = await cryptoProvider.decrypt(encrypted)
    expect(decrypted).toBe(plain)
  })

  it('支持空字符串与中文、特殊字符等边界明文', async () => {
    for (const plain of ['', '中文令牌🎉', 'a'.repeat(1024), 'line\nbreak\tand "quote"']) {
      const decrypted = await cryptoProvider.decrypt(await cryptoProvider.encrypt(plain))
      expect(decrypted).toBe(plain)
    }
  })

  it('密文是结构化 JSON，且包含版本/算法/salt/iv/data 等约定字段', async () => {
    const blob = parseBlob(await cryptoProvider.encrypt('token'))
    expect(blob.alg).toBe('AES-GCM')
    expect(blob.kid).toBe('aes-256-gcm')
    expect(typeof blob.salt).toBe('string')
    expect(typeof blob.iv).toBe('string')
    expect(typeof blob.data).toBe('string')
    expect(blob.salt.length).toBeGreaterThan(0)
    expect(blob.iv.length).toBeGreaterThan(0)
  })

  it('密文中不包含明文片段（机密性）', async () => {
    const secret = 'SUPER_SECRET_PLAIN_TEXT_9f8e7d'
    const encrypted = await cryptoProvider.encrypt(secret)
    expect(encrypted).not.toContain(secret)
    expect(encrypted.toLowerCase()).not.toContain('super_secret')
  })
})

describe('cryptoProvider · 随机化与抗重放', () => {
  it('相同明文两次加密得到不同密文（随机 IV），且两者都能正确解密', async () => {
    const plain = 'same-token-value'
    const first = await cryptoProvider.encrypt(plain)
    const second = await cryptoProvider.encrypt(plain)
    expect(first).not.toBe(second)
    // IV 必须不同；salt 在同一单例内复用，允许相同
    expect(parseBlob(first).iv).not.toBe(parseBlob(second).iv)
    expect(await cryptoProvider.decrypt(first)).toBe(plain)
    expect(await cryptoProvider.decrypt(second)).toBe(plain)
  })
})

describe('cryptoProvider · GCM 完整性（篡改即拒绝）', () => {
  it('密文 data 被篡改时解密返回 null 而非抛异常', async () => {
    const blob = parseBlob(await cryptoProvider.encrypt('integrity-token'))
    blob.data = tamperBase64(blob.data)
    expect(await cryptoProvider.decrypt(JSON.stringify(blob))).toBeNull()
  })

  it('IV 被篡改时解密返回 null', async () => {
    const blob = parseBlob(await cryptoProvider.encrypt('integrity-token'))
    blob.iv = tamperBase64(blob.iv)
    expect(await cryptoProvider.decrypt(JSON.stringify(blob))).toBeNull()
  })

  it('salt 被篡改导致派生密钥变化，解密返回 null', async () => {
    const blob = parseBlob(await cryptoProvider.encrypt('integrity-token'))
    blob.salt = tamperBase64(blob.salt)
    expect(await cryptoProvider.decrypt(JSON.stringify(blob))).toBeNull()
  })
})

describe('cryptoProvider · 非法输入安全降级', () => {
  it('空字符串、非 JSON、缺字段、错误算法标识均返回 null', async () => {
    const valid = parseBlob(await cryptoProvider.encrypt('token'))

    const invalidPayloads = [
      '',
      'not-a-json',
      '{}',
      JSON.stringify({ ...valid, alg: 'AES-CBC' }),
      JSON.stringify({ alg: 'AES-GCM' }), // 缺 salt/iv/data
      JSON.stringify(null),
    ]

    for (const payload of invalidPayloads) {
      await expect(cryptoProvider.decrypt(payload)).resolves.toBeNull()
    }
  })
})

describe('cryptoProvider · origin 绑定（防跨环境复制）', () => {
  // 与 vitest.config.ts 中 jsdom 的 url 保持一致
  const HOME_ORIGIN = 'http://localhost:8091'
  const EVIL_ORIGIN = 'https://evil.example.com'
  const originalDescriptor = Object.getOwnPropertyDescriptor(window, 'location')

  /** 切换当前会话的 origin（jsdom 下 location 为访问器，需用 defineProperty 覆盖） */
  function setOrigin(origin: string): void {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, origin },
    })
  }

  it('密文脱离原站点 origin 后无法解密，且反向同样成立（双向隔离）', async () => {
    try {
      // 1) 原站点环境：加密得到密文
      setOrigin(HOME_ORIGIN)
      vi.resetModules()
      const homeMod = await import('../crypto')
      const homeCipher = await homeMod.cryptoProvider.encrypt('cross-origin-token')

      // 2) 密文被复制到恶意站点：origin 不同 → 派生密钥不同 → GCM 认证失败
      setOrigin(EVIL_ORIGIN)
      vi.resetModules()
      const evilMod = await import('../crypto')
      expect(await evilMod.cryptoProvider.decrypt(homeCipher)).toBeNull()

      // 3) 反向：恶意站点产生的密文，回到原站点同样解不开
      const evilCipher = await evilMod.cryptoProvider.encrypt('stolen-token')
      setOrigin(HOME_ORIGIN)
      vi.resetModules()
      const backHomeMod = await import('../crypto')
      expect(await backHomeMod.cryptoProvider.decrypt(evilCipher)).toBeNull()
    } finally {
      // 恢复真实 location 与模块缓存，避免污染后续测试
      if (originalDescriptor) {
        Object.defineProperty(window, 'location', originalDescriptor)
      }
      vi.resetModules()
    }
  })
})
