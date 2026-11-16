// ─────────────────────────────────────────────────────────────
// 支付管理 · 接口契约类型（字段名与原型 Mock v7 的 paymentConfig 完全一致）
//
// 对应原型接口（docs/配置模块重构-前后端交付说明.md §3.2）：
//   GET /api/admin/payment-config  返回 paymentConfig
//   PUT /api/admin/payment-config  校验支付时限 1-120；channels 合并更新
//
// 硬边界：支付域不含任何计价字段；只管「钱怎么付」。
// 本期最小版仅支付时限可用；渠道开关、收款账户为「即将上线」骨架，
// 等正式支付模块（微信/支付宝、company_bank_accounts）再启用。
// TODO(server): 后端实现 PaymentController 后仅替换 ./mock 调用。
// ─────────────────────────────────────────────────────────────

/** 在线支付渠道开关（原型本期不启用，仅预留字段位） */
export interface PayChannels {
  wechat: boolean
  alipay: boolean
}

/** GET/PUT /admin/payment-config 的数据体 */
export interface PaymentConfig {
  /** 下单后支付时限（分钟），订单 expireAt = 下单时间 + 该值；范围 1-120 */
  payExpireMinutes: number
  /** 在线渠道开关（本期恒 false，占位） */
  channels: PayChannels
}

/** 支付时限范围约束（与服务端校验一致） */
export const PAY_EXPIRE_LIMITS = { min: 1, max: 120 } as const
