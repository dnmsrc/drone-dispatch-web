// ─────────────────────────────────────────────────────────────
// 本地存储封装（localStorage）
//
// 为什么不直接用 localStorage：
//   1) 统一做 JSON 序列化，存取对象不用每次手动 JSON.parse/stringify；
//   2) 隐私模式、存储配额超限、SSR 等场景下原生 API 会抛异常，这里 try/catch 兜底，
//      存储不可用时降级为「读不到 / 写不进」，绝不阻断业务流程；
//   3) 集中一个入口，将来要换成 sessionStorage 或加过期时间只改这一处。
// ─────────────────────────────────────────────────────────────

export const storage = {
  /** 读取并反序列化；键不存在或解析失败返回 null */
  get<T>(key: string): T | null {
    try {
      const raw = window.localStorage.getItem(key)
      if (raw === null) return null
      return JSON.parse(raw) as T
    } catch {
      return null
    }
  },

  /** 序列化后写入 */
  set(key: string, value: unknown): void {
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // 隐私模式 / 配额超限时静默失败，避免影响主流程
    }
  },

  /** 移除指定键 */
  remove(key: string): void {
    try {
      window.localStorage.removeItem(key)
    } catch {
      // 同上，忽略不可用场景
    }
  },
}
