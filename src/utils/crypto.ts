// ─────────────────────────────────────────────────────────────
// 前端对称加密引擎（AES-256-GCM，浏览器原生 Web Crypto）
//
// 用途：把登录 token 加密后再写入 Cookie，使本地持久化的只是密文，
// 普通人复制 Cookie 无法直接得到可用 token。
//
// 安全边界（务必知悉，勿在后续迭代中误判为「绝对安全」）：
//   - 纯前端没有真正保密的密钥存放处，下方 APP_KEY_MATERIAL 是「混淆素材」而非秘密，
//     能阅读/调试本站 JS 的专业攻击者仍可在同源环境复现解密；本方案防的是「随手复制
//     密文到别处使用」，不是抵御具备前端调试能力的定向攻击。绝对防线仍是后端 HttpOnly Cookie。
//   - 密钥派生绑定 location.origin：密文离开当前站点（换域/换环境）后派生出的密钥不同，
//     GCM 认证会直接失败，从而无法解密。
//   - GCM 是认证加密：同时保证机密性与完整性，密文被篡改时 decrypt 抛错并返回 null。
//
// 可插拔：对外只暴露 CryptoProvider 接口与 cryptoProvider 单例。
// 将来等保/密评要求国密时，新增一个 SM4 实现并在此替换单例即可，业务与 token.ts 零改动。
// ─────────────────────────────────────────────────────────────

/** 加密提供方统一接口（AES-GCM 与未来的 SM4 实现都遵循它） */
export interface CryptoProvider {
  /** 提供方标识，写入密文头，便于将来多算法共存时识别 */
  readonly id: string
  /** 明文 → 可持久化的序列化密文字符串 */
  encrypt(plainText: string): Promise<string>
  /** 序列化密文 → 明文；密文损坏 / 跨环境 / 认证失败时返回 null（不抛异常） */
  decrypt(payload: string): Promise<string | null>
}

/* ─────────────────────── 编码 / 类型工具 ─────────────────────── */

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  bytes.forEach((b) => {
    binary += String.fromCharCode(b)
  })
  return btoa(binary)
}

function base64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

/**
 * 收窄为 ArrayBuffer 支撑的字节视图。
 * TS 6 的严格 DOM 类型下，Web Crypto 的 BufferSource 不接受 SharedArrayBuffer 支撑的
 * ArrayBufferLike；这里在非 ArrayBuffer 时复制到新的 ArrayBuffer，统一满足类型与运行时要求。
 */
function cryptoBytes(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  if (bytes.buffer instanceof ArrayBuffer) {
    return new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  }
  const copy = new Uint8Array(bytes.length)
  copy.set(bytes)
  return copy
}

/* ─────────────────────── AES-256-GCM 实现 ─────────────────────── */

const ALGORITHM = 'AES-GCM'
const VERSION = 1
/** PBKDF2 迭代次数：越高越抗暴力破解，首次派生有一次性开销，之后命中缓存 */
const PBKDF2_ITERATIONS = 150000
/**
 * 应用级混淆素材（非秘密）。配合随机 salt 与 origin 经 PBKDF2 派生密钥。
 * 更换它会使历史密文全部无法解密（等同全员重新登录）。
 */
const APP_KEY_MATERIAL = 'skyshow-dispatch-web/v1/aes-gcm-key-material'

/** 密文结构（序列化后存入 Cookie） */
interface CipherBlob {
  v: number
  alg: string
  kid: string
  /** PBKDF2 salt（base64），可公开，作用是抗彩虹表/批量破解 */
  salt: string
  /** GCM 初始向量（base64，每条密文随机） */
  iv: string
  /** 密文 + GCM 认证标签（base64） */
  data: string
}

class AesGcmCryptoProvider implements CryptoProvider {
  readonly id = 'aes-256-gcm'

  /** 按 salt 缓存派生后的 CryptoKey，避免每次请求都重跑 15 万次 PBKDF2 */
  private readonly keyCache = new Map<string, CryptoKey>()

  /** 加密用的实例 salt：首次加密时随机生成并复用 */
  private instanceSalt: string | null = null

  /** PBKDF2 派生 AES-256 密钥；密钥输入绑定应用素材与当前 origin */
  private async deriveKey(saltBase64: string): Promise<CryptoKey> {
    const cached = this.keyCache.get(saltBase64)
    if (cached) return cached

    // 绑定 origin：密文脱离当前站点后，该素材不同 → 派生密钥不同 → 解密失败
    const keyMaterialBytes = cryptoBytes(
      new TextEncoder().encode(`${APP_KEY_MATERIAL}:${window.location.origin}`),
    )
    const baseKey = await crypto.subtle.importKey(
      'raw',
      keyMaterialBytes,
      'PBKDF2',
      false,
      ['deriveKey'],
    )
    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: cryptoBytes(base64ToBytes(saltBase64)),
        iterations: PBKDF2_ITERATIONS,
        hash: 'SHA-256',
      },
      baseKey,
      { name: ALGORITHM, length: 256 },
      false,
      ['encrypt', 'decrypt'],
    )
    this.keyCache.set(saltBase64, key)
    return key
  }

  /** 当前实例 salt（懒生成，16 字节随机） */
  private currentSalt(): string {
    if (this.instanceSalt) return this.instanceSalt
    const salt = new Uint8Array(16)
    crypto.getRandomValues(salt)
    this.instanceSalt = bytesToBase64(salt)
    return this.instanceSalt
  }

  async encrypt(plainText: string): Promise<string> {
    const salt = this.currentSalt()
    const key = await this.deriveKey(salt)

    const iv = new Uint8Array(12)
    crypto.getRandomValues(iv)

    const cipherBytes = new Uint8Array(
      await crypto.subtle.encrypt(
        { name: ALGORITHM, iv: cryptoBytes(iv) },
        key,
        cryptoBytes(new TextEncoder().encode(plainText)),
      ),
    )

    const blob: CipherBlob = {
      v: VERSION,
      alg: ALGORITHM,
      kid: this.id,
      salt,
      iv: bytesToBase64(iv),
      data: bytesToBase64(cipherBytes),
    }
    return JSON.stringify(blob)
  }

  async decrypt(payload: string): Promise<string | null> {
    try {
      const blob = JSON.parse(payload) as CipherBlob
      if (!blob || blob.alg !== ALGORITHM || !blob.salt || !blob.iv || !blob.data) {
        return null
      }
      const key = await this.deriveKey(blob.salt)
      const plainBytes = await crypto.subtle.decrypt(
        { name: ALGORITHM, iv: cryptoBytes(base64ToBytes(blob.iv)) },
        key,
        cryptoBytes(base64ToBytes(blob.data)),
      )
      return new TextDecoder().decode(plainBytes)
    } catch {
      // JSON 解析失败 / GCM 认证失败（密文被篡改或跨环境）一律按无效密文处理
      return null
    }
  }
}

/** 默认加密提供方单例；将来接入国密时替换此实例即可 */
export const cryptoProvider: CryptoProvider = new AesGcmCryptoProvider()
