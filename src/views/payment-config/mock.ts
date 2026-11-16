// ─────────────────────────────────────────────────────────────
// 支付管理 · 静态数据源与动作（UI 联调用）
//
// 数据对齐原型 Mock v7 的 db.paymentConfig（mock-server/seed.js buildPaymentConfig）。
// 行为对齐原型 mock-server/server.js 的两个领域路由：
//   GET /admin/payment-config  返回配置
//   PUT /admin/payment-config  支付时限校验 1-120；channels 合并更新
// 写操作只改内存，刷新页面回滚。渠道/收款账户本期为占位，不在此开放写操作。
// TODO(server): 后端实现 PaymentController 后只替换本文件为 http 调用，页面不改。
// ─────────────────────────────────────────────────────────────
import { PAY_EXPIRE_LIMITS, type PayChannels, type PaymentConfig } from './types'

/** 种子（payExpireMinutes 与业务档案 pricing.payExpireMinutes 一致 = 15） */
function buildSeed(): Required<PaymentConfig> {
  return {
    payExpireMinutes: 15,
    // 预留：在线支付渠道开关（原型本期不启用，正式版接微信/支付宝时打开）
    channels: { wechat: false, alipay: false },
  }
}

const store: { value: Required<PaymentConfig> } = { value: buildSeed() }

/** GET /admin/payment-config：返回副本 */
export function getPaymentConfig(): PaymentConfig {
  return JSON.parse(JSON.stringify(store.value)) as PaymentConfig
}

/**
 * PUT /admin/payment-config。
 * - payExpireMinutes 非空时校验 1-120 后写入；
 * - channels 为对象时合并更新（本期 UI 不触发，仅预留同构能力）。
 */
export function savePaymentConfig(input: {
  payExpireMinutes?: number
  channels?: Partial<PayChannels>
}): PaymentConfig {
  if (input.payExpireMinutes != null) {
    const n = Number(input.payExpireMinutes)
    if (!Number.isFinite(n) || n < PAY_EXPIRE_LIMITS.min || n > PAY_EXPIRE_LIMITS.max) {
      throw new Error('支付时限需在 1-120 分钟之间')
    }
    store.value.payExpireMinutes = n
  }
  if (input.channels && typeof input.channels === 'object') {
    store.value.channels = { ...store.value.channels, ...input.channels }
  }
  return getPaymentConfig()
}

/** 供测试/演示重置内存态 */
export function resetPaymentConfigStore(): void {
  store.value = buildSeed()
}
