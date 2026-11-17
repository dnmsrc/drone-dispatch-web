// ─────────────────────────────────────────────────────────────
// 支付管理 · 视图类型与约束（对齐后端真实接口 PaymentConfigController）
//
// 对应后端接口（drone-dispatch-server，路径 /api/payment-config，http 层 baseURL 已含 /api）：
//   GET /payment-config  读支付配置（登录即可），返回 PaymentConfigVO
//   PUT /payment-config  保存支付时限（仅 ADMIN，Service 层角色闸门，越权 403）
//
// 硬边界：支付域不含任何计价字段，只管「钱怎么付」。
// 本期最小版仅「支付时限」一个标量可用；在线渠道开关、对公收款账户为「即将上线」
// 骨架，后端 PaymentConfigVO 刻意不下发这些字段（决策 P5：不暴露可操作的假功能），
// 故视图层也不建 channels 等占位字段，等正式支付模块（微信/支付宝、company_bank_accounts）再加。
// ─────────────────────────────────────────────────────────────

/** GET/PUT /payment-config 的视图数据体（本期仅支付时限一个标量） */
export interface PaymentConfig {
  /** 下单后支付时限（分钟），订单 expireAt = 下单时间 + 该值；范围 1-120 */
  payExpireMinutes: number
}

/** 支付时限范围约束（与后端 PaymentConfigService 的 MIN/MAX 完全一致） */
export const PAY_EXPIRE_LIMITS = { min: 1, max: 120 } as const

/** 支付时限缺省值（后端 sys_config 缺失/非法时回退 15，前端加载兜底同值，口径一致） */
export const DEFAULT_PAY_EXPIRE_MINUTES = 15
