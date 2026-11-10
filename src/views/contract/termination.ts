// ─────────────────────────────────────────────────────────────
// 合同终止 / 改期 · 纯逻辑（可单测，不依赖 mock store 与 Vue）
//
// 业务依据（与 H5 下单页用户已逐条确认的合同条款同源，见原型
// drone-dispatch-prototype/h5/src/engine/contract.js）：
//   - 责任方在我方（审批失败 / 天气 / 不可抗力 / 场地等）：
//       审批失败「乙方全责退还已付费用」；天气「延期优先于退费」。
//       故我方原因终止恒为全额退款（ratio=1，零扣除），并优先提供改期。
//   - 责任方在客户：解除时退未履行部分，可扣除已产生的合理成本。
//       一期不建成本台账，用「距演出天数」的退款阶梯比例近似抵扣。
//   - 款项性质为预付款（非定金），不适用双倍返还罚则。
// 实际业务以后续真实规则为准，本文件集中收口比例与闸门，便于一处调整。
// ─────────────────────────────────────────────────────────────
import type {
  ContractAvailableActions,
  ContractResponsibility,
  ContractRow,
  TerminationQuote,
} from './types'
import { sumPaidAmount } from './installment'

/** 客户原因退款阶梯（按「距离演出日的整天数」匹配，天数越少、沉没成本越高、退得越少） */
export interface RefundRule {
  /** 阶梯文案（弹窗与留痕展示） */
  label: string
  /** 命中条件：距演出天数 >= minDays（规则按 minDays 从大到小匹配） */
  minDays: number
  /** 该阶梯退款比例 0~1 */
  ratio: number
}

/**
 * 客户原因阶梯规则（与退款管理页 100%/90%/50%/20% 口径对齐）：
 *   演出前 >7 天   退 90%（扣除 10% 前期筹备成本）
 *   演出前 3~7 天  退 50%（设备调度/排班已锁定）
 *   演出前 <3 天   退 20%（临近演出，大部分成本已发生）
 * 无法取得演出日期时，按最宽松的 >7 天档处理，避免误扣客户款项。
 */
export const CUSTOMER_REFUND_RULES: ReadonlyArray<RefundRule> = [
  { label: '演出前 7 天以上，退 90%', minDays: 7, ratio: 0.9 },
  { label: '演出前 3~7 天，退 50%', minDays: 3, ratio: 0.5 },
  { label: '演出前 3 天内，退 20%', minDays: Number.NEGATIVE_INFINITY, ratio: 0.2 },
]

/** 我方原因统一全额退款（零扣除），文案用于留痕与弹窗 */
export const VENDOR_FULL_REFUND_LABEL = '我方原因无法履行，全额退还已付费用'

/** 一天的毫秒数 */
const DAY_MS = 24 * 60 * 60 * 1000

/**
 * 计算「今天」距离演出日的整天数（演出日 − 今天，向下取整到日）。
 * 今天演出=0；明天=1；已过演出日为负数。无法解析日期返回 null。
 */
export function daysUntil(performDate: string | null | undefined): number | null {
  if (!performDate) return null
  const target = new Date(`${performDate}T00:00:00`)
  if (Number.isNaN(target.getTime())) return null
  const today = new Date()
  const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
  return Math.round((target.getTime() - todayMid) / DAY_MS)
}

/** 按距演出天数匹配客户原因阶梯规则 */
export function matchCustomerRule(days: number | null): RefundRule {
  if (days === null) return CUSTOMER_REFUND_RULES[0]
  for (const rule of CUSTOMER_REFUND_RULES) {
    if (days >= rule.minDays) return rule
  }
  // 理论上不会走到（末档 minDays=-∞ 必命中），兜底返回最严档
  return CUSTOMER_REFUND_RULES[CUSTOMER_REFUND_RULES.length - 1]
}

/** 两位金额取整（元，规避浮点误差），口径与 installment 拆分一致 */
function roundMoney(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100
}

/**
 * 终止结算试算（纯函数，不落库）。
 *
 * @param contract 合同（取付款计划实付额与演出日期）
 * @param responsibility 责任方
 * @returns 退款基数、比例、可退、扣除与命中规则文案
 */
export function quoteTermination(
  contract: ContractRow,
  responsibility: ContractResponsibility,
): TerminationQuote {
  const paidAmount = roundMoney(sumPaidAmount(contract.schedules))
  const days = daysUntil(contract.order?.performDate)

  if (responsibility === 'VENDOR') {
    return {
      responsibility,
      paidAmount,
      ratio: 1,
      refundAmount: paidAmount,
      deductAmount: 0,
      daysToPerform: days,
      ruleLabel: VENDOR_FULL_REFUND_LABEL,
    }
  }

  const rule = matchCustomerRule(days)
  const refundAmount = roundMoney(paidAmount * rule.ratio)
  return {
    responsibility,
    paidAmount,
    ratio: rule.ratio,
    refundAmount,
    deductAmount: roundMoney(paidAmount - refundAmount),
    daysToPerform: days,
    ruleLabel: rule.label,
  }
}

/** 终态：只能查看，不能再推进 */
const TERMINAL_STATUSES = new Set(['VOID', 'TERMINATED'])

/** 已履行完毕的订单状态：合同已实际履行，原则上不能终止/改期（纠纷另走售后） */
const FULFILLED_ORDER_STATUSES = new Set(['COMPLETED', 'REVIEWED'])

/** 已进入现场服务的订单状态：默认禁止，仅 ADMIN 兜底强制终止 */
const IN_SERVICE_ORDER_STATUSES = new Set(['IN_SERVICE'])

/**
 * 判定一份合同当前可执行的操作（操作列闸门）。
 *
 * @param contract 合同
 * @param isAdmin 当前登录人是否 ADMIN
 */
export function availableActions(
  contract: ContractRow,
  isAdmin: boolean,
): ContractAvailableActions {
  const blocked = (blockedReason: string): ContractAvailableActions => ({
    canVoid: false,
    canTerminate: false,
    canReschedule: false,
    terminateRequiresAdmin: true,
    readonly: TERMINAL_STATUSES.has(contract.signStatus),
    blockedReason,
  })

  // 终态合同：仅查看
  if (TERMINAL_STATUSES.has(contract.signStatus)) {
    return blocked(
      contract.signStatus === 'VOID' ? '合同已作废，仅可查看' : '合同已终止并完成结算，仅可查看',
    )
  }

  const orderStatus = contract.order?.status ?? ''
  // 已履行完毕：不能终止/改期
  if (FULFILLED_ORDER_STATUSES.has(orderStatus)) {
    return blocked('合同已履行完毕，不能终止或改期；如有纠纷请走售后/争议流程')
  }

  const paidAmount = roundMoney(sumPaidAmount(contract.schedules))
  const isInService = IN_SERVICE_ORDER_STATUSES.has(orderStatus)
  // 已签署生效（含改期标记）才允许终止/改期；草稿/待签未生效，只能作废
  const isEffective = contract.signStatus === 'SIGNED' || contract.signStatus === 'RESCHEDULED'

  if (!isEffective) {
    // DRAFT / PENDING_SIGN：未生效，无结算，直接作废
    return {
      canVoid: true,
      canTerminate: false,
      canReschedule: false,
      terminateRequiresAdmin: true,
      readonly: false,
      blockedReason: '',
    }
  }

  // 生效合同
  if (isInService) {
    // 执行中：默认禁止，仅 ADMIN 可兜底强制终止；改期已无意义（现场已开始）
    return {
      canVoid: false,
      canTerminate: isAdmin,
      canReschedule: false,
      terminateRequiresAdmin: true,
      readonly: false,
      blockedReason: isAdmin ? '' : '表演已进入执行阶段，强制终止需管理员操作',
    }
  }

  // 生效且未到现场服务：零付款可作废；已收款只能终止（带结算）；均可改期
  return {
    canVoid: paidAmount <= 0,
    canTerminate: true,
    canReschedule: true,
    // 终止涉及退款决策，统一要求 ADMIN（操作员不可见终止入口）
    terminateRequiresAdmin: true,
    readonly: false,
    blockedReason: '',
  }
}
