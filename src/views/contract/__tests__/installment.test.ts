// ─────────────────────────────────────────────────────────────
// 合同分期金额拆分纯逻辑单测（src/views/contract/installment.ts）
//
// 重点守住金额口径：任意期数拆分后各期金额之和必须恒等于合同总额，
// 奇数金额的舍入尾差由最后一期承接，不允许出现 1 分钱对不上的情况。
// ─────────────────────────────────────────────────────────────
import { describe, expect, it } from 'vitest'
import { splitInstallments, sumPaidAmount } from '../installment'

describe('contract/installment · splitInstallments', () => {
  it('默认两期 50%+50%，偶数金额均分', () => {
    const r = splitInstallments(38800)
    expect(r).toHaveLength(2)
    expect(r.map((x) => x.no)).toEqual([1, 2])
    expect(r.every((x) => x.ratio === 0.5)).toBe(true)
    expect(r[0].planAmount).toBe(19400)
    expect(r[1].planAmount).toBe(19400)
  })

  it('奇数金额尾差进最后一期，两期之和恒等于总额', () => {
    const total = 38801
    const r = splitInstallments(total)
    expect(r[0].planAmount).toBe(19400.5)
    expect(r[1].planAmount).toBe(19400.5)
    const sum = r.reduce((s, x) => s + x.planAmount, 0)
    expect(Math.round(sum * 100) / 100).toBe(total)
  })

  it('三期等比拆分，比例为 1/3 且总额守恒', () => {
    const total = 100000
    const r = splitInstallments(total, 3)
    expect(r).toHaveLength(3)
    expect(r.every((x) => Math.abs(x.ratio - 1 / 3) < 1e-9)).toBe(true)
    const sum = r.reduce((s, x) => s + x.planAmount, 0)
    expect(Math.round(sum * 100) / 100).toBe(total)
  })

  it('各期金额不出现负尾差（最后一期兜底非负）', () => {
    const r = splitInstallments(1, 3)
    expect(r.every((x) => x.planAmount >= 0)).toBe(true)
    expect(r.reduce((s, x) => s + x.planAmount, 0)).toBe(1)
  })

  it('非法入参兜底：负数/NaN 按 0，期数 <1 兜底为 1 期', () => {
    expect(splitInstallments(-500, 2)[0].planAmount).toBe(0)
    expect(splitInstallments(NaN, 2)[0].planAmount).toBe(0)
    expect(splitInstallments(1000, 0)).toHaveLength(1)
    expect(splitInstallments(1000, 1.5)).toHaveLength(1)
  })
})

describe('contract/installment · sumPaidAmount', () => {
  it('汇总各期实付，非法值按 0', () => {
    expect(sumPaidAmount([{ paidAmount: 100 }, { paidAmount: 200.5 }])).toBe(300.5)
    expect(sumPaidAmount([])).toBe(0)
    expect(sumPaidAmount([{ paidAmount: NaN }, { paidAmount: 50 }])).toBe(50)
  })
})
