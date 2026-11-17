// ─────────────────────────────────────────────────────────────
// 支付配置接口适配层单测（src/api/payment-config.ts 的纯转换函数）
//
// 本期后端只有支付时限一个标量，适配逻辑很薄，重点锁定兜底口径，防止字段变更静默出错：
//   - 正常出参同名透传 payExpireMinutes
//   - null/undefined/非有限数/非正数 → 回退缺省 15（与后端 readExpire 默认值口径一致）
//   - 保存请求体 Number 归一，字段名保持 payExpireMinutes，不在前端静默夹值
// 网络类函数（getPaymentConfig / savePaymentConfig）依赖 axios，不在此覆盖
// （由后端 curl 联调与页面冒烟验证），同 pricing/dict 单测边界。
// ─────────────────────────────────────────────────────────────
import { describe, expect, it } from 'vitest'
import {
  PAY_EXPIRE_LIMITS,
  toPaymentConfig,
  toPaymentConfigUpdatePayload,
  type PaymentConfigDto,
} from '../payment-config'
import { DEFAULT_PAY_EXPIRE_MINUTES } from '@/views/payment-config/types'

describe('toPaymentConfig · 后端 VO → 视图类型', () => {
  it('正常出参同名透传支付时限', () => {
    const dto: PaymentConfigDto = { payExpireMinutes: 30 }
    expect(toPaymentConfig(dto)).toEqual({ payExpireMinutes: 30 })
  })

  it('边界值 1 与 120 原样保留（适配层不夹值，范围由页面/后端校验）', () => {
    expect(toPaymentConfig({ payExpireMinutes: PAY_EXPIRE_LIMITS.min })).toEqual({
      payExpireMinutes: 1,
    })
    expect(toPaymentConfig({ payExpireMinutes: PAY_EXPIRE_LIMITS.max })).toEqual({
      payExpireMinutes: 120,
    })
  })

  it('payExpireMinutes 为 null 时回退缺省 15', () => {
    expect(toPaymentConfig({ payExpireMinutes: null })).toEqual({
      payExpireMinutes: DEFAULT_PAY_EXPIRE_MINUTES,
    })
  })

  it('整个 DTO 为 null/undefined 时回退缺省 15，不向页面透出 null', () => {
    expect(toPaymentConfig(null)).toEqual({ payExpireMinutes: 15 })
    expect(toPaymentConfig(undefined)).toEqual({ payExpireMinutes: 15 })
  })

  it('非有限数/非正数（NaN、0、负数）防御性回退缺省 15', () => {
    expect(toPaymentConfig({ payExpireMinutes: Number.NaN })).toEqual({ payExpireMinutes: 15 })
    expect(toPaymentConfig({ payExpireMinutes: 0 })).toEqual({ payExpireMinutes: 15 })
    expect(toPaymentConfig({ payExpireMinutes: -5 })).toEqual({ payExpireMinutes: 15 })
  })

  it('数字字符串经 Number 归一后可解析（兼容后端偶发字符串标量）', () => {
    expect(toPaymentConfig({ payExpireMinutes: '45' as unknown as number })).toEqual({
      payExpireMinutes: 45,
    })
  })
})

describe('toPaymentConfigUpdatePayload · 视图表单 → 保存请求体', () => {
  it('字段名保持 payExpireMinutes 并做 Number 归一', () => {
    expect(toPaymentConfigUpdatePayload({ payExpireMinutes: 20 })).toEqual({
      payExpireMinutes: 20,
    })
  })

  it('数字字符串入参归一为 number 下发', () => {
    const payload = toPaymentConfigUpdatePayload({
      payExpireMinutes: '25' as unknown as number,
    })
    expect(payload).toEqual({ payExpireMinutes: 25 })
    expect(typeof payload.payExpireMinutes).toBe('number')
  })

  it('越界值不在适配层夹取，照常下发交由后端 400 拦截', () => {
    expect(toPaymentConfigUpdatePayload({ payExpireMinutes: 999 })).toEqual({
      payExpireMinutes: 999,
    })
  })
})
