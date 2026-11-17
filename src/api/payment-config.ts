// ─────────────────────────────────────────────────────────────
// 支付配置接口层 —— 对接后端 drone-dispatch-server PaymentConfigController（/api/payment-config）
//
// 已对接接口（本期仅支付时限一个标量；读登录即可、写仅 ADMIN，角色由 Service 层闸门控制）：
//   GET /payment-config  读支付配置，返回 PaymentConfigVO（sys_config 缺失/非法时后端回退默认 15）
//   PUT /payment-config  保存支付时限（仅 ADMIN），请求体 PaymentConfigUpdateRequest，范围 1-120
//
// 边界：支付域不含任何计价字段；在线支付渠道开关、对公收款账户待正式支付模块再开放，
// 后端 VO 不下发这些字段，本层也不提前透出（决策 P5：不做可操作的假功能）。
//
// 适配口径：
//   1) 后端 VO/请求体字段名就是 payExpireMinutes，与前端视图类型同名，无需改名；
//   2) 出参理论可空（Integer），toPaymentConfig 用 Number()||默认值兜底，保证 el-input-number 不炸；
//   3) 入参在页面侧已做 1-120 校验，这里再 Number 归一一次后整体下发（后端另有 400 兜底）；
//   4) http 拦截器已剥离 Result{code,message,data} 信封，成功直接拿到 data，失败统一弹错并 reject。
// ─────────────────────────────────────────────────────────────
import http from '@/utils/http'
import {
  DEFAULT_PAY_EXPIRE_MINUTES,
  PAY_EXPIRE_LIMITS,
  type PaymentConfig,
} from '@/views/payment-config/types'

/* ═══ 后端 VO 的 JSON 形态（字段名与后端 record 一一对应，勿改名）═══ */

/** 后端支付配置出参（PaymentConfigVO，本期仅支付时限） */
export interface PaymentConfigDto {
  /** 下单后支付时限（分钟），Integer 理论可空，适配层兜底 */
  payExpireMinutes: number | null
}

/** 后端保存请求体（PaymentConfigUpdateRequest） */
export interface PaymentConfigUpdatePayload {
  payExpireMinutes: number
}

/* ═══ DTO → 视图类型（纯函数，单测覆盖空值/非法值兜底）═══ */

/**
 * 后端支付配置 VO → 前端 PaymentConfig。
 * null/undefined/非有限数（后端理论不会下发，但前端防御性收口）一律回退缺省 15，
 * 与后端 PaymentConfigService.readExpire 的默认值口径保持一致。
 */
export function toPaymentConfig(dto: PaymentConfigDto | null | undefined): PaymentConfig {
  const n = Number(dto?.payExpireMinutes)
  return {
    payExpireMinutes: Number.isFinite(n) && n > 0 ? n : DEFAULT_PAY_EXPIRE_MINUTES,
  }
}

/* ═══ 视图编辑模型 → 后端请求体（纯函数，单测覆盖 Number 归一）═══ */

/**
 * 页面表单 → PUT /payment-config 请求体。
 * 统一 Number 归一；范围 1-120 的硬校验在页面与后端各有一道，这里只负责类型收口，不静默夹值，
 * 让越界值照常打到后端并由其返回 400，避免前端擅自改写用户输入。
 */
export function toPaymentConfigUpdatePayload(form: PaymentConfig): PaymentConfigUpdatePayload {
  return { payExpireMinutes: Number(form.payExpireMinutes) }
}

/** 重新导出约束，页面/测试可单从接口层或视图层引用，口径只有一处定义 */
export { PAY_EXPIRE_LIMITS }

/* ═══ 支付配置 API ═══ */

/**
 * 读支付配置（GET /payment-config，登录即可）。
 * http 层已剥离 Result 信封；后端缺省/非法时自身回退 15，前端适配层再兜底一次。
 */
export async function getPaymentConfig(): Promise<PaymentConfig> {
  const dto = await http.get<PaymentConfigDto>('/payment-config')
  return toPaymentConfig(dto)
}

/**
 * 保存支付时限（PUT /payment-config，仅 ADMIN）。
 * 成功返回 Void；400（空值/越界）、401（未登录）、403（非管理员）由 http 拦截器统一弹错并 reject，
 * 调用方 catch 后保持原表单值，不做本地乐观更新。
 */
export async function savePaymentConfig(form: PaymentConfig): Promise<void> {
  await http.put<void>('/payment-config', toPaymentConfigUpdatePayload(form))
}
