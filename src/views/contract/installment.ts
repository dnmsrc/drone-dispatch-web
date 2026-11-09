// ─────────────────────────────────────────────────────────────
// 合同分期付款 · 纯逻辑（可单测，不依赖 mock store）
//
// 数据模型约定：一份合同默认两期 50%+50%，表结构支持任意期数。
// 金额按 DECIMAL(12,2) 口径用整数元处理，拆分后各期之和必须恒等于
// 合同总额——奇数金额时把尾差放进最后一期，避免四舍五入造成 1 分钱对不上。
// ─────────────────────────────────────────────────────────────

/** 单期拆分结果 */
export interface InstallmentSplit {
  /** 期次，从 1 开始 */
  no: number
  /** 本期占总额比例（0~1） */
  ratio: number
  /** 本期应付金额 */
  planAmount: number
}

/**
 * 按等比例把合同总额拆成 N 期（默认两期 50%+50%）。
 *
 * @param totalAmount 合同总额（整数元）
 * @param count 期数，默认 2；非法值（<1）兜底为 1
 * @returns 各期比例与金额；最后一期承接舍入尾差，保证 ΣplanAmount === totalAmount
 */
export function splitInstallments(totalAmount: number, count = 2): InstallmentSplit[] {
  const total = Math.max(0, Math.round(Number(totalAmount) || 0))
  const n = Number.isInteger(count) && count >= 1 ? count : 1
  const ratio = 1 / n
  const base = Math.floor((total / n) * 100) / 100

  const result: InstallmentSplit[] = []
  let allocated = 0
  for (let i = 0; i < n; i += 1) {
    const isLast = i === n - 1
    // 最后一期用「总额 - 已分配」承接尾差，确保各期之和分毫不差
    const planAmount = isLast ? Math.round((total - allocated) * 100) / 100 : base
    allocated = Math.round((allocated + planAmount) * 100) / 100
    result.push({ no: i + 1, ratio, planAmount })
  }
  return result
}

/** 汇总各期实付金额（paymentSummary 等场景复用） */
export function sumPaidAmount(installments: { paidAmount: number }[]): number {
  return installments.reduce((sum, x) => sum + (Number(x.paidAmount) || 0), 0)
}
